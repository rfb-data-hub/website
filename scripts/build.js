#!/usr/bin/env node
/* ============================================================
 * Zero-dependency static site builder: renders every src/pages/*.html
 * through src/layout.html into public/, concatenates src/assets/css
 * and src/assets/js (each in FILENAME order) into the two bundles the
 * layout links, and copies src/static verbatim. public/ is generated
 * output — the build wipes and rewrites it; never hand-edit it.
 * Pipeline: bundles → images → pages (front matter, loadData,
 * prepareData, render, layout) → static → leftover-tag check.
 * Couplings: scripts/check.sh asserts on this output — the bundle
 * names, its required files, and that no template tag survives; the
 * author-facing build model is docs/authoring.md §1.
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "public");

const PAGES = path.join(SRC, "pages");
const COMPONENTS = path.join(SRC, "components");
const DATA = path.join(SRC, "data");
const ASSETS = path.join(SRC, "assets");
const STATIC = path.join(SRC, "static");
const LAYOUT = path.join(SRC, "layout.html");

/* ---------- helpers ---------- */

/* read/copyFile/walk wrap the fs calls the build repeats. walk() returns
   file paths recursively, so src/static and src/assets/img may nest
   (minutes/, avatars/) and reach public/ with the same layout. */

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/* ---------- minutes discovery ---------- */

/* A minutes document is published by its NAME: <YYYY-MM-DD>-minutes-<code>.pdf
   in src/static/minutes/ carries the meeting date and the committee, so
   publishing needs no edit to src/data/site-committees.js (docs/authoring.md
   §2d). An authored entry for the same committee and date wins — the escape
   hatch for a document kept off-site and for a corrected revision, which the
   pattern below deliberately does not match. */
const MINUTES_DIR = path.join(STATIC, "minutes");
const MINUTES_NAME = /^(\d{4})-(\d{2})-(\d{2})-minutes-([a-z0-9]+)\.pdf$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* What the build discovered, for the report at the end of the run. */
let discovered = [];

/* A regex match is not a date: 2026-13-01 and 2026-02-30 both have the right
   shape. Round-trip through Date so an impossible day fails the build. */
function isCalendarDate(y, m, d) {
  const t = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return t.getUTCFullYear() === Number(y) &&
         t.getUTCMonth() === Number(m) - 1 &&
         t.getUTCDate() === Number(d);
}

/* Returns {y, m, d} for a YYYY-MM-DD string, or throws naming `where`. */
function minutesDate(date, where) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!d || !isCalendarDate(d[1], d[2], d[3])) {
    throw new Error(`${where}: "${date}" is not a real YYYY-MM-DD date`);
  }
  return { y: d[1], m: d[2], d: d[3] };
}

/* The entries the filenames describe, minus the ones an authored entry already
   covers. Codes are matched against committees[].code, never against num: a
   code is part of a published URL and outlives a display label. */
function discoverMinutes(committees, authored) {
  const codes = new Map();
  for (const c of committees) {
    if (!c.code) {
      throw new Error(`Committee "${c.id}" has no \`code\` in src/data/site-committees.js — minutes filenames are matched against it (docs/authoring.md §2d)`);
    }
    if (codes.has(c.code)) {
      throw new Error(`Committee code "${c.code}" is used twice in src/data/site-committees.js — a code is a permanent URL token and must be unique`);
    }
    codes.set(c.code, c.id);
  }
  if (!fs.existsSync(MINUTES_DIR)) return [];

  const covered = new Set(authored.map((m) => `${m.committee} ${m.date}`));
  const seen = new Map();   // "committee date" → file name, to catch a conflict
  const entries = [];
  const files = fs.readdirSync(MINUTES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
  for (const name of files) {
    const m = MINUTES_NAME.exec(name);
    if (!m) continue;       // a revision or a stray file: check.sh reports it if nothing links it
    const [, y, mo, d, code] = m;
    const committee = codes.get(code);
    if (!committee) {
      throw new Error(`Minutes file "${name}" names committee code "${code}", which no committee carries — valid codes: ${[...codes.keys()].join(", ")} (src/data/site-committees.js)`);
    }
    const date = `${y}-${mo}-${d}`;
    minutesDate(date, `Minutes file "${name}"`);
    const key = `${committee} ${date}`;
    if (covered.has(key)) continue;   // an authored entry owns this document
    if (seen.has(key)) {
      throw new Error(`Two minutes files for ${committee} on ${date}: "${seen.get(key)}" and "${name}" — keep one, or reference the other from an authored entry in src/data/site-committees.js`);
    }
    seen.set(key, name);
    entries.push({ committee, date, href: `minutes/${name}` });
    discovered.push(`minutes: discovered ${date} ${code} (${name})`);
  }
  return entries;
}

/* ---------- load content data ---------- */

/* src/data/*.js merges into ONE namespace per page, in sorted-filename
   order so the result never depends on the filesystem. The FILENAME
   decides the scope: `site-<page>.js` loads for page <page> only, every
   other file (sites-general.js, icons.js) for every page. Each file's
   own header documents its fields and the components that render them. */
function loadData(pageName) {
  const data = {};
  const owner = {};
  if (!fs.existsSync(DATA)) return data;
  for (const f of fs.readdirSync(DATA).sort()) {
    if (!f.endsWith(".js")) continue;
    const scoped = /^site-(.+)\.js$/.exec(f);
    if (scoped && scoped[1] !== pageName) continue;
    const mod = require(path.join(DATA, f));
    for (const k of Object.keys(mod)) {
      if (k in owner) {
        /* Two files defining one key is a COLLISION, not an override: an
           override would render the page with silently wrong content. */
        throw new Error(
          `Data key "${k}" is defined by two files in the ${pageName} namespace: ` +
          `src/data/${owner[k]} and src/data/${f} — keep every top-level key in exactly one file`
        );
      }
      owner[k] = f;
      data[k] = mod[k];
    }
  }
  /* The two arrays are filed into each other by prepareData and must load
     together: one alone renders the minutes heading above an empty shelf. */
  if (("minutes" in data) !== ("committees" in data)) {
    const missing = "minutes" in data ? "committees" : "minutes";
    throw new Error(
      `The ${pageName} namespace loads ${"minutes" in data ? "minutes" : "committees"} without ` +
      `${missing} — the two are filed into each other by prepareData and must load together ` +
      `(both live in src/data/site-committees.js); "${missing}" is missing`
    );
  }
  return data;
}

/* ---------- template syntax ---------- */

/* The grammar lives here and nowhere else; docs/authoring.md §1 is the
   author-facing table. {{#if}} takes its optional {{else}} branch for a
   falsy flag, an empty array or a missing key. Values insert RAW: the
   input is authored in this repository, never typed by a visitor, so a
   data field may carry inline HTML such as <b> or <svg>. */

const RE_IF = /\{\{#if\s+([\w.@]+)\s*\}\}/;   // {{#if flag}}…{{else}}…{{/if}}
const RE_PARTIAL = /\{\{>\s*([\w-]+)\s*\}\}/g;  // {{> name}} → src/components/name.html
const RE_VAR = /\{\{\s*([\w.@]+)\s*\}\}/g;      // {{name}}, dotted {{a.b}}, scalar item {{.}}
const RE_TOKEN = /\{\{\s*token:(--[a-z0-9-]+)\s*\}\}/g;  // {{token:--tank}} → a CSS value

/* ---------- block matching ---------- */

/* Find the block that opens at `start` (an "{{#tag ...}}" opener) and return
   {inner, end} with correctly matched nesting. */
function matchBlock(tpl, tag, start) {
  const openRe = new RegExp("\\{\\{#" + tag + "\\b", "g");
  const closeRe = new RegExp("\\{\\{/" + tag + "\\}\\}", "g");
  const innerStart = tpl.indexOf("}}", start) + 2;
  let depth = 0, end = -1, i = innerStart;
  for (;;) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(tpl);
    const c = closeRe.exec(tpl);
    if (!c) throw new Error(`Unclosed {{#${tag}}} block in template`);
    if (o && o.index < c.index) { depth++; i = o.index + 2; }
    else { if (depth === 0) { end = c.index; break; } depth--; i = c.index + 2; }
  }
  return { inner: tpl.slice(innerStart, end), end: end + ("{{/" + tag + "}}").length };
}

/* Split an {{#if}} body at its FIRST top-level {{else}} — nested
   {{#if}}…{{/if}} blocks are counted, so an {{else}} inside one of them
   belongs to the inner block, not to this one. Returns [then, else|null]. */
function splitElse(inner) {
  const re = /\{\{#if\b|\{\{\/if\}\}|\{\{\s*else\s*\}\}/g;
  let depth = 0, m;
  while ((m = re.exec(inner))) {
    if (m[0].startsWith("{{#")) depth++;
    else if (m[0].startsWith("{{/")) depth--;
    else if (depth === 0) return [inner.slice(0, m.index), inner.slice(m.index + m[0].length)];
  }
  return [inner, null];
}

/* ---------- variable lookup ---------- */

/* Resolve a dotted path: inside an {{#each}} the item's own fields shadow
   the page namespace, so ctx is tried before root. An unresolved name
   throws rather than interpolating an empty string: a data field whose
   name changed would otherwise vanish from the page without a trace.
   `where` is the render trail every message names: page, component, loop. */
function lookup(name, ctx, root, where) {
  if (name === ".") {
    if (ctx && "." in ctx) return ctx["."];
    throw new Error(`Unresolved template variable "{{.}}" in ${where} (not inside an {{#each}} of scalars)`);
  }
  const sources = ctx ? [ctx, root] : [root];
  for (const src of sources) {
    let v = src;
    for (const part of name.split(".")) {
      if (v == null || typeof v !== "object" || !(part in v)) { v = undefined; break; }
      v = v[part];
    }
    if (v !== undefined) return v;
  }
  throw new Error(`Unresolved template variable "{{${name}}}" while rendering ${where}`);
}

/* ---------- design tokens ---------- */

/* {{token:--name}} inserts a token's value, so the two places that cannot
   read var() stop being hand copies: src/static/404.html (self-contained,
   no bundle) and the no-CSS fallback attributes in src/components. Values
   are read from the CSS itself — 01-tokens.css's :root, then the neutral
   block the site is set to — so a green site's 404 is green too. A
   `var(--x)` value is followed to its source; an unknown name throws. */

function cssDeclarations(css, selector) {
  const out = new Map();
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    if (!selector(m[1].trim())) continue;
    for (const d of m[2].match(/--[a-z0-9-]+\s*:[^;]+/g) || []) {
      const i = d.indexOf(":");
      out.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
  }
  return out;
}

/* The neutral is site-wide and lives in the data layer, so the token map is
   resolved once, from the same value layout.html puts on <body>. */
function siteNeutral() {
  const mod = require(path.join(DATA, "sites-general.js"));
  if (mod.neutral !== "blue" && mod.neutral !== "green") {
    throw new Error('src/data/sites-general.js must set `neutral: "blue"` or `neutral: "green"`');
  }
  return mod.neutral;
}

let TOKENS = null;
function tokenMap() {
  if (TOKENS) return TOKENS;
  const map = new Map();
  const add = (m) => { for (const [k, v] of m) map.set(k, v); };
  add(cssDeclarations(read(path.join(ASSETS, "css", "01-tokens.css")), (s) => s === ":root"));
  const theme = read(path.join(ASSETS, "css", "01a-theme.css"));
  add(cssDeclarations(theme, (s) => s.includes(":root")));
  const neutral = siteNeutral();
  if (neutral !== "blue") {
    add(cssDeclarations(theme, (s) => s.includes(`[data-neutral="${neutral}"]`)));
  }
  TOKENS = map;
  return map;
}

function tokenValue(name, where) {
  const v = tokenMap().get(name);
  if (v === undefined) {
    throw new Error(`Unknown design token ${name} in ${where} — is it declared in 01-tokens.css or 01a-theme.css?`);
  }
  const ref = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  return ref ? tokenValue(ref[1], where) : v;
}

/* ---------- render ---------- */

/* One template, in passes: loops, then conditionals, then partials, then
   variables. Every pass re-scans the whole string, so any block may nest
   inside any other. A partial is rendered in the CALLER's context, so
   src/components/*.html read the same names as the page that includes
   them — and the loop item, when included from inside an {{#each}}. */
function render(tpl, ctx, root, where) {
  let out = tpl;

  // loops — one at a time so nested {{#each}} blocks work; `delay=MS` on
  // the tag numbers each item {{@delay}}, for a data-delay stagger
  let guard = 0;
  for (;;) {
    const m = /\{\{#each\s+([\w.]+)(?:\s+delay=(\d+))?\s*\}\}/.exec(out);
    if (!m) break;
    if (++guard > 200) throw new Error("Too many {{#each}} blocks in " + where);
    const block = matchBlock(out, "each", m.index);
    const list = lookup(m[1], ctx, root, where);
    if (!Array.isArray(list)) {
      throw new Error(`{{#each ${m[1]}}} expects an array (got ${typeof list}) in ${where}`);
    }
    const step = m[2] ? parseInt(m[2], 10) : 0;
    const body = list
      .map((item, i) => {
        const itemCtx =
          item !== null && typeof item === "object" ? Object.assign({}, item) : { ".": item };
        itemCtx["@index"] = i;
        itemCtx["@delay"] = step ? i * step : 0;
        return render(block.inner, itemCtx, root, `${where} [each ${m[1]} #${i}]`);
      })
      .join("");
    out = out.slice(0, m.index) + body + out.slice(block.end);
  }

  // conditionals (same nesting-safe scan)
  guard = 0;
  for (;;) {
    const m = new RegExp(RE_IF.source).exec(out);
    if (!m) break;
    if (++guard > 200) throw new Error("Too many {{#if}} blocks in " + where);
    const block = matchBlock(out, "if", m.index);
    let v;
    // a missing flag is not an error here: it means "take the {{else}}
    // branch" — unlike {{variable}}, where an unresolved name throws
    try { v = lookup(m[1], ctx, root, where); } catch (e) { v = undefined; }
    const [thenBody, elseBody] = splitElse(block.inner);
    const chosen = !v || (Array.isArray(v) && v.length === 0) ? elseBody : thenBody;
    const body = chosen == null ? "" : render(chosen, ctx, root, where);
    out = out.slice(0, m.index) + body + out.slice(block.end);
  }

  // partials — a name with no src/components/<name>.html is a typo or a
  // deleted component; check.sh catches the reverse, an orphaned component
  out = out.replace(RE_PARTIAL, (_m, name) => {
    const file = path.join(COMPONENTS, name + ".html");
    if (!fs.existsSync(file)) throw new Error(`Missing component: src/components/${name}.html (included from ${where})`);
    return render(read(file), ctx, root, `component:${name}.html`);
  });

  // variables — a null value renders as the empty string; an object means
  // a missing {{#each}}; an absent name has already thrown inside lookup
  out = out.replace(RE_VAR, (_m, name) => {
    const v = lookup(name, ctx, root, where);
    if (v === null || v === undefined) return "";
    if (typeof v === "object") throw new Error(`{{${name}}} in ${where} resolves to an object — did you mean to loop it with {{#each ${name}}}?`);
    return String(v);
  });

  // tokens — {{token:--name}} from the CSS layer (see design tokens above)
  out = out.replace(RE_TOKEN, (_m, name) => tokenValue(name, where));

  // a surviving {{…}} is a tag this grammar does not define: a wrong name
  // throws above, an unknown shape must not ship as literal braces
  const leftover = out.match(/\{\{[^}]*\}\}/);
  if (leftover) throw new Error(`Unprocessed template tag ${leftover[0]} in ${where}`);
  return out;
}

/* ---------- front matter ---------- */

/* The `---` block at the top of a page file: flat `key: value` lines, no
   nesting, no quoting, and optional — a page without one is body only.
   The pages use title, description and theme (read by src/layout.html)
   plus h1 and sub (read by src/components/page-hero.html, which also
   takes an optional chip). Keys and consumers: docs/authoring.md §1. */

function splitFrontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: text.slice(m[0].length) };
}

/* ---------- per-page data preparation ---------- */

/* Rewrites the loaded namespace into what the templates expect, for THIS
   page: icon keys to inline SVG, the flat minutes list filed under its
   committee, the nav hrefs resolved, the footer derived from the nav.
   The clone is required, not an optimisation: require() caches each data
   module, so writing to it would leak into the next page's render. */

function prepareData(base, pageFile) {
  const data = JSON.parse(JSON.stringify(base));

  // resolve icon keys ("vault") to inline SVG markup from icons.js
  const iconSets = ["categories", "platforms", "communityStats"];
  for (const key of iconSets) {
    if (Array.isArray(data[key])) {
      data[key] = data[key].map((item) => {
        if (item && item.iconKey) {
          const svg = data.icons && data.icons[item.iconKey];
          if (!svg) throw new Error(`Unknown iconKey "${item.iconKey}" in data.${key}`);
          return Object.assign({}, item, { icon: svg });
        }
        return item;
      });
    }
  }

  // Committee minutes come from two places and are filed under their
  // committee here, so the section renders from the same committees[] the
  // rows use and a name is never spelled in two files. The normal case is a
  // PDF in src/static/minutes/ whose NAME carries committee and date; the
  // authored FLAT list in src/data/site-committees.js is the exception list
  // (off-site documents, revisions) and wins over a file of the same
  // committee and date. Order and the printed date are derived here, never
  // authored.
  if (Array.isArray(data.minutes) && Array.isArray(data.committees)) {
    data.minutes = data.minutes.concat(discoverMinutes(data.committees, data.minutes));
    const byId = new Map(data.committees.map((c) => [c.id, []]));
    const years = new Set();
    for (const m of data.minutes) {
      const group = byId.get(m.committee);
      if (!group) {
        throw new Error(`Unknown committee "${m.committee}" in src/data/site-committees.js — ids are authored in its own committees[] (${[...byId.keys()].join(", ")})`);
      }
      const d = minutesDate(m.date, `Minutes entry for "${m.committee}"`);
      group.push(Object.assign({}, m, {
        dateLabel: `${Number(d.d)} ${MONTHS[Number(d.m) - 1]} ${d.y}`,
        year: d.y,            // what the year menu filters each entry on
      }));
      years.add(d.y);
    }
    data.committees = data.committees.map((c) => {
      const items = byId.get(c.id).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      return Object.assign({}, c, { minutes: items });
    });
    /* The year menu is SECTION-wide, not per committee: only years that hold
       a document, newest first, and no menu when there is nothing to choose. */
    data.minutesYears = [...years].sort().reverse();
    data.minutesYearFilter = data.minutesYears.length > 1;
  }

  /* Nav hrefs are authored site-relative in src/data/sites-general.js,
     parents and children alike (rules: docs/authoring.md §2b). A leading
     "#" is a home-page anchor, prefixed with index.html on sub-pages; a
     link to the page being built collapses to an in-page anchor so it
     scrolls instead of reloading; `current` is top-level items only. */
  const HOME = "index.html";
  const isExternal = (href) => /^(https?:|mailto:|tel:)/i.test(href);
  function resolveHref(href) {
    if (isExternal(href)) return href;
    if (href.startsWith("#")) return pageFile === HOME ? href : HOME + href;
    const hash = href.indexOf("#");
    const page = hash === -1 ? href : href.slice(0, hash);
    if (page === pageFile) return hash === -1 ? "#top" : href.slice(hash);
    return href;
  }
  function isCurrent(href) {
    if (isExternal(href)) return false;
    if (href.startsWith("#")) return pageFile === HOME;
    return href === pageFile;
  }
  data.nav = data.nav.map((item) =>
    Object.assign({}, item, {
      href: resolveHref(item.href),
      current: isCurrent(item.href),
      children: Array.isArray(item.children)
        ? item.children.map((c) => Object.assign({}, c, {
            href: resolveHref(c.href),
            /* soon: src/components/nav.html and footer.html render a muted
               span + pill in place of the link ({{#if soon}} branch). */
          }))
        : undefined,
    })
  );

  /* The FOOTER (src/components/footer.html) has no link list of its own:
     footerCols derives from the nav above, so a page reachable in the bar
     is reachable at the bottom of every page; a changed section id cannot
     leave a stale link behind. One column per menu group: landing row
     first (footLabel, else label), then children. Rules: docs/authoring.md §2b. */
  data.footerCols = data.nav.map((group) => ({
    title: group.label,
    landing: { label: group.footLabel || group.label, href: group.href },
    links: group.children || [],
  }));
  // the closing column is the pair of external homes from platforms[], so
  // those URLs stay single-sourced too; it has no landing row ({{#if landing}})
  if (Array.isArray(data.platforms)) {
    data.footerCols.push({
      title: data.footerConnectTitle || "Connect",
      links: data.platforms.map((d) => ({ label: d.name, href: d.href })),
    });
  }

  // The brand link in nav and footer: "#top" on the home page scrolls to its
  // own hero; elsewhere it must LEAVE the page or it is not a home link.
  data.homeHref = pageFile === HOME ? "#top" : HOME;

  // the build-time year for the footer; 06-year.js rewrites the
  // [data-footer-year] span at page load, so it never shows a stale year
  data.year = String(new Date().getFullYear());
  return data;
}

/* ---------- build ---------- */

/* The whole pipeline in one pass. public/ is deleted first, so a page
   removed from src/pages cannot survive as a stale artifact. The order
   below is load-bearing: the bundles are hashed before any page renders,
   because cssHref and jsHref are part of every page's context. */

function build() {
  const t0 = Date.now();
  const layout = read(LAYOUT);
  discovered = [];

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 0. cache-busting stamp. The bundles keep one stable filename — that is
  //    the point of a dependency-free build — so the content hash travels as
  //    a query string instead: browsers and GitHub Pages cache app.css hard,
  //    and new html over old css renders as a broken layout.
  const stamp = (code) =>
    crypto.createHash("sha256").update(code).digest("hex").slice(0, 10);

  // 1. assets: css + js concatenated in FILENAME order (01 < 01a < 02 …),
  //    each file preceded by a `── name ──` marker so the bundle stays
  //    greppable, dotfiles skipped, written under the fixed names that
  //    scripts/check.sh requires. Generated blocks (WAVE-MASK) pass through
  //    untouched: they must match scripts/gen-wave-mask.js byte for byte.
  const bundle = (dir, banner) => {
    const files = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).sort();
    const parts = files.map((f) => `${banner(f)}\n${read(path.join(dir, f))}`);
    return { code: parts.join("\n\n"), files };
  };

  const css = bundle(path.join(ASSETS, "css"), (f) => `/* ── ${f} ── */`);
  const js = bundle(path.join(ASSETS, "js"), (f) => `/* ── ${f} ── */`);
  fs.mkdirSync(path.join(OUT, "assets", "css"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "assets", "css", "app.css"), css.code);
  fs.mkdirSync(path.join(OUT, "assets", "js"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "assets", "js", "app.js"), js.code);
  // the hrefs the layout links, stamped with the hash of the bundle they
  // point at — a content change is what breaks the cache, not a new name
  const assets = {
    cssHref: `assets/css/app.css?v=${stamp(css.code)}`,
    jsHref: `assets/js/app.js?v=${stamp(js.code)}`,
  };

  // 2. images: src/assets/img may nest (avatars/), and the tree is copied
  //    with its layout; assets/img/favicon.svg is a check.sh required file
  const imgDir = path.join(ASSETS, "img");
  if (fs.existsSync(imgDir)) {
    for (const p of walk(imgDir)) {
      copyFile(p, path.join(OUT, "assets", "img", path.relative(imgDir, p)));
    }
  }

  // 3. pages: front matter, then the page's data namespace, then the
  //    per-page rewrites, then the body rendered into the {{content}} slot
  //    of src/layout.html. A front-matter key shadows a data key of the
  //    same name (two data files: a collision). Tag-free generated markup
  //    (ORBIT: scripts/gen-orbit.py) passes through the renderer untouched.
  const report = [];
  for (const f of fs.readdirSync(PAGES).sort()) {
    if (!f.endsWith(".html")) continue;
    const raw = read(path.join(PAGES, f));
    const { fm, body } = splitFrontMatter(raw);
    const data = prepareData(loadData(f.replace(/\.html$/, "")), f);
    const content = render(body, null, Object.assign(data, fm, assets), `page:${f}`);
    const html = render(
      layout.replace("{{content}}", "\n" + content + "\n"),
      null,
      Object.assign(data, fm, assets),
      `layout(for ${f})`
    );
    fs.writeFileSync(path.join(OUT, f), html);
    report.push([f, html.length]);
  }

  // 4. static: copied verbatim except for {{token:--name}}, which the two
  //    self-contained files need (404.html has no bundle to read var()
  //    from, site.webmanifest is JSON) — so a token edit reaches them
  //    without a hand copy. Everything else is byte-identical; check.sh
  //    greps `{{` over the *.html and *.webmanifest in public/.
  if (fs.existsSync(STATIC)) {
    for (const p of walk(STATIC)) {
      const rel = path.relative(STATIC, p);
      /* src/static/minutes/README.md is the uploader's instructions, not a
         document: GitHub renders it in the folder, the site must not serve
         it at /minutes/README.md (docs/authoring.md §2d). */
      if (rel === path.join("minutes", "README.md")) continue;
      if (rel.endsWith(".html") || rel.endsWith(".webmanifest")) {
        const text = read(p).replace(RE_TOKEN, (_m, name) => tokenValue(name, `static:${rel}`));
        fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
        fs.writeFileSync(path.join(OUT, rel), text);
      } else {
        copyFile(p, path.join(OUT, rel));
      }
    }
  }

  // 5. sanity: re-read the written pages — not the static copies, whose
  //    *.html check.sh greps — and fail on any surviving tag. Throwing is
  //    right: a visitor sees literal braces, and Pages would deploy the
  //    half-rendered page without complaint.
  for (const [f] of report) {
    const html = read(path.join(OUT, f));
    const bad = html.match(/\{\{[^}]*\}\}/);
    if (bad) throw new Error(`Template tag ${bad[0]} survived into public/${f}`);
  }

  const kb = (n) => (n / 1024).toFixed(1) + " KiB";
  console.log(`built in ${Date.now() - t0} ms`);
  for (const [f, n] of report) console.log(`  public/${f.padEnd(14)} ${kb(n)}`);
  for (const line of discovered) console.log(`  ${line}`);
  console.log(`  public/assets/css/app.css ${kb(css.code.length)} (${css.files.length} files)`);
  console.log(`  public/assets/js/app.js   ${kb(js.code.length)} (${js.files.length} files)`);
}

/* The wipe happens before any page is written, so a failed build leaves
   public/ empty or half-built — never a stale site deploying as if new. */
try {
  build();
} catch (err) {
  console.error("BUILD FAILED:", err.message);
  process.exit(1);
}
