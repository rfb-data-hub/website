#!/usr/bin/env bash
# ============================================================
# check.sh — health checks over the built site in public/
# Run after `node scripts/build.js`: it reads build output, so a failure
# here is a failure of the source that produced it. The two src/ checks
# (components, data keys) are the exception — an unused file there emits
# no output for the others to complain about.
# The CI job (.github/workflows/ci.yml) runs it on every pull request and
# on pushes outside main; any `err` sets the exit code, so a failing check
# fails the build.
# Kept POSIX/bash-3.2 friendly (macOS default shell).
# ============================================================
set -u
cd "$(dirname "$0")/.."
OUT=public
fail=0

err() { echo "FAIL: $*" >&2; fail=1; }
ok()  { echo "  ok: $*"; }

# ---------- required files ----------
# The output contract: pages rendered from src/pages, the rest copied
# verbatim from src/static by build.js step 4.
for f in index.html 404.html assets/css/app.css assets/js/app.js \
         assets/img/favicon.svg robots.txt site.webmanifest .nojekyll; do
  [ -f "$OUT/$f" ] || err "missing $OUT/$f"
done

# ---------- no root-absolute URLs (Pages serves from /<repo>/) ----------
if grep -rnE '(href|src)="/' "$OUT" --include='*.html' >/dev/null 2>&1; then
  err "root-absolute URLs found — use relative paths (ADR 0002):"
  grep -rnE '(href|src)="/' "$OUT" --include='*.html' | head -5 >&2
else
  ok "all URLs relative"
fi

# ---------- no unrendered template tags ----------
# The build never renders src/static, so a tag copied from there reaches
# public/ unchecked — this is the check that catches it.
if grep -rn '{{' "$OUT" --include='*.html' >/dev/null 2>&1; then
  err "unrendered template tags in output:"
  grep -rn '{{' "$OUT" --include='*.html' | head -5 >&2
else
  ok "no template tags left"
fi

# ---------- exactly one <h1> per page ----------
for f in "$OUT"/*.html; do
  n=$(grep -o '<h1' "$f" | wc -l | tr -d ' ')
  [ "$n" -eq 1 ] || err "$(basename "$f"): expected 1 <h1>, found $n"
done
# The ok line reports the whole run: it stays silent if a check above failed.
[ "$fail" -eq 0 ] && ok "one <h1> per page"

# ---------- internal links resolve ----------
# Existence only: every href/src in the built pages must name a file in
# public/; fragments are checked below. Links are read word by word, so a
# filename with a space reports a false BROKEN (docs/authoring.md §2d).
missing=0
links=$(grep -rhoE '(href|src)="[^"]+"' "$OUT" --include='*.html' \
        | sed -E 's/^(href|src)="//; s/"$//' \
        | grep -vE '^(https?:|mailto:|data:|#|tel:)' | sort -u)
for l in $links; do
  path=${l%%#*}                       # strip #fragment
  path=${path%%\?*}                   # strip ?cache-buster
  [ -z "$path" ] && continue
  dir=$(dirname "$path"); base=$(basename "$path")
  [ -e "$OUT/$dir/$base" ] || { echo "BROKEN: $l" >&2; missing=1; }
done
if [ "$missing" -eq 0 ]; then ok "internal links resolve"; else err "broken internal links (see above)"; fi

# ---------- #fragment targets exist ----------
# A file that exists is not a link that works: a fragment is valid only if
# the target page carries that id. The footer and the nav derive from one
# nav array (src/data/sites-general.js), so a section id that changes
# breaks both renderings at once — check fragments site-wide.
frag_bad=0
for f in "$OUT"/*.html; do
  page=$(basename "$f")
  for l in $(grep -ohE 'href="[^"]*#[^"]+"' "$f" | sed -E 's/^href="//; s/"$//'); do
    case "$l" in http*|mailto*|tel*|data*) continue ;; esac
    target=${l%%#*}; frag=${l#*#}
    [ -z "$target" ] && target="$page"
    [ -f "$OUT/$target" ] || continue          # reported by the file check above
    grep -q "id=\"$frag\"" "$OUT/$target" || { echo "DEAD ANCHOR: $page → $l" >&2; frag_bad=1; }
  done
done
if [ "$frag_bad" -eq 0 ]; then ok "every #fragment has a target id"; else err "dead anchors (see above)"; fi

# ---------- <img> needs alt ----------
if grep -rn '<img' "$OUT" --include='*.html' | grep -v 'alt=' >/dev/null 2>&1; then
  err "<img> without alt attribute"
else
  ok "images have alt (or there are none)"
fi

# ---------- size budget ----------
budget=307200   # 300 KiB per artifact
for f in "$OUT"/*.html "$OUT"/assets/css/app.css "$OUT"/assets/js/app.js; do
  s=$(wc -c < "$f" | tr -d ' ')
  [ "$s" -le "$budget" ] || err "$(basename "$f") is ${s} bytes (budget ${budget})"
done
# The ok line prints even when a file is over budget; the err above fails the run.
ok "all files within ${budget}-byte budget"

# ---------- published documents (committee minutes PDFs) ----------
# Anything in public/ that is not html/css/js is a document served next to
# the site — the minutes PDFs in src/static/minutes/. Existence alone is
# not enough: a Git LFS pointer (a 130-byte text file where the PDF should
# be) or a truncated upload would slip past the link check above and
# deploy quietly. Limits: docs/authoring.md §2d.
file_max=5242880      # 5 MB per document — bigger ones live outside the site
# Pages has a soft limit of about 1 GB per site and git history is forever,
# so an oversized document costs twice: in the artifact and in the repo.
site_max_kb=256000    # ~250 MB for the whole site, an order of magnitude of slack
big=0
while IFS= read -r f; do
  s=$(wc -c < "$f" | tr -d ' ')
  [ "$s" -le "$file_max" ] || { err "$(basename "$f") is ${s} bytes (per-document budget ${file_max}) — compress it, or publish it outside the site (docs/authoring.md §2d)"; big=1; }
  # PDFs stay out of LFS by design (.gitattributes), so a missing header
  # means a pointer committed by mistake or a truncated copy.
  case "$f" in
    *.pdf) [ "$(head -c 5 "$f")" = "%PDF-" ] || err "$(basename "$f") has no %PDF- header — a Git LFS pointer or a truncated upload? (.gitattributes)" ;;
  esac
done < <(find "$OUT" -type f | sort)
[ "$big" -eq 0 ] && ok "every published file within ${file_max} bytes"
site_kb=$(du -sk "$OUT" | awk '{print $1}')
if [ "$site_kb" -le "$site_max_kb" ]; then
  ok "site total ${site_kb} KiB (budget ${site_max_kb} KiB)"
else
  err "public/ is ${site_kb} KiB (site budget ${site_max_kb} KiB) — move large documents out of src/static/"
fi

# ---------- generated blocks are in sync ----------
# The generators own their marked blocks: scripts/gen-orbit.py rewrites
# ORBIT:BEGIN/END in src/pages/index.html, scripts/gen-wave-mask.js the
# WAVE-MASK markers in its TARGETS list. Both run in --check mode, so a
# hand-edited or stale block fails the build until the generator is run.
# Without python3 the orbit check is skipped: no verdict, not a pass.
if command -v python3 >/dev/null 2>&1 && [ -f scripts/gen-orbit.py ]; then
  if python3 scripts/gen-orbit.py --check >/dev/null 2>&1; then
    ok "generated orbit block is in sync"
  else
    err "orbit markup is stale — run: python3 scripts/gen-orbit.py"
  fi
fi

if node scripts/gen-wave-mask.js --check >/dev/null 2>&1; then
  ok "generated wave mask is in sync"
else
  err "wave mask is stale — run: node scripts/gen-wave-mask.js"
fi

# ---------- every component is used ----------
# A partial that nothing includes is invisible: the build does not render
# it, the checks above have no output to complain about, and the file sits
# in src/components looking like content. So this compares the SOURCE tree
# with itself, not public/: every src/components/*.html needs its
# `{{> name}}` in a page, another component or src/layout.html.
orphans=""
for f in src/components/*.html; do
  [ -e "$f" ] || continue
  name=$(basename "$f" .html)
  grep -rqF "{{> $name" src || orphans="$orphans $f"
done
if [ -z "$orphans" ]; then
  ok "every component is included by some template"
else
  for f in $orphans; do
    err "$(basename "$f" .html): src/components not referenced as {{> $(basename "$f" .html)}} anywhere under src/ — delete it or include it"
  done
fi

# ---------- every data key is read ----------
# The same failure one layer up: a top-level key in src/data/*.js that no
# template, no other data file and no line of scripts/build.js mentions is
# content nobody can ever see. The test errs towards PASSING — prose that
# happens to use the word counts as a hit — because a false alarm in CI
# costs more than a key that slips by.
# A key consumed only dynamically belongs here with a WHY; keys used by
# name in {{#each nav}} grep fine and must NOT be whitelisted.
whitelist=""
unused_keys=""
for f in src/data/*.js; do
  case "$f" in
    src/data/icons.js)
      # icons.js exports the single object `icons`, which templates reach
      # into as {{icons.arrowGo}}, so that prefix is the whole test here.
      keys=""
      grep -rqF "{{icons." src || unused_keys="$unused_keys $f:icons"
      ;;
    *)
      # Shape-sensitive: keys are the entries at 2-space indent inside
      # `module.exports = {`, the packing all four page-data files use.
      keys=$(sed -n '/^module.exports = {/,/^};/p' "$f" \
             | grep -E '^  [A-Za-z][A-Za-z0-9]*:' \
             | sed -E 's/^  ([A-Za-z][A-Za-z0-9]*):.*/\1/')
      ;;
  esac
  for k in $keys; do
    case " $whitelist " in *" $k "*) continue ;; esac
    # Word-bounded: a bare substring would "find" nav inside navigate
    # and faq inside faq-item.
    grep -rlE "\b$k\b" src/pages src/components src/layout.html src/data scripts/build.js 2>/dev/null \
      | grep -v "^$f\$" >/dev/null || unused_keys="$unused_keys $f:$k"
  done
done
if [ -z "$unused_keys" ]; then
  ok "every data key is read by a template, another data file or build.js"
else
  for x in $unused_keys; do
    err "$x — no template, data file or build.js reads this key: delete it, or whitelist it in check.sh with a WHY"
  done
fi

# ---------- report-only: CSS classes nobody uses ----------
# Selector classes in the built app.css that appear in no src/**/*.html
# and no src/**/*.js. Report-only: a class can be reached in a way this
# grep cannot see, and that is not worth holding a deploy for — it is
# worth a look the next time the stylesheet is open.
# Classes whose only use this grep cannot follow — each entry is a real use,
# not an excuse; keep the list honest and small.
css_allowlist=""
if [ -f "$OUT/assets/css/app.css" ]; then
  css_unused=""; css_seen=0
  # Only the text before "{" on a rule line is scanned, so decimals and
  # file names in declarations (.5rem, .svg) never reach the list.
  css_classes=$(awk -F'{' '/\{/{print $1}' "$OUT/assets/css/app.css" \
                | grep -hoE '\.[a-zA-Z][a-zA-Z0-9_-]+' | sed 's/^\.//' | sort -u)
  for c in $css_classes; do
    case " $css_allowlist " in *" $c "*) continue ;; esac
    css_seen=$((css_seen + 1))
    # JS counts as a use: the scripts add state classes (is-active,
    # scrolled) at runtime, so a class only a script toggles is not dead.
    grep -rqw --include='*.html' --include='*.js' -e "$c" src \
      || css_unused="$css_unused $c"
  done
  n_unused=0
  for c in $css_unused; do n_unused=$((n_unused + 1)); done
  if [ "$n_unused" -eq 0 ]; then
    ok "CSS classes all used in src/ (${css_seen} checked)"
  else
    for c in $css_unused; do echo "  note: unused CSS class .$c"; done
    echo "  note: $n_unused of $css_seen classes in app.css not found in src/ (report-only)"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then echo "check.sh: all good ✓"; else echo "check.sh: FAILED" >&2; exit 1; fi
