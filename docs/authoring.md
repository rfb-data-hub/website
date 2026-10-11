# Authoring guide

How to edit and extend the site. For the directory map and commands see the [README](../README.md); for the design rationale see Architecture Decision Record 0000 (ADR 0000), the parent of the other records in [docs/adr/](adr/).

## Contents

- [1. Build model](#1-build-model)
- [2. Adding a page](#2-adding-a-page)
  - [2a. Adding a news item](#2a-adding-a-news-item)
  - [2b. Navigation and the footer](#2b-navigation-and-the-footer)
  - [2c. The GitHub resource list (resources.html)](#2c-the-github-resource-list-resourceshtml)
  - [2d. Adding committee minutes](#2d-adding-committee-minutes) — incl. [Publishing the PDF](#publishing-the-pdf)
  - [2e. The dashboard band (resources.html `#dashboard`)](#2e-the-dashboard-band-resourceshtml-dashboard)
- [3. Adding a component](#3-adding-a-component)
- [4. The electrolyte stream](#4-the-electrolyte-stream)
- [5. Implementation notes](#5-implementation-notes)
- [6. Before you push](#6-before-you-push)
- [7. Content conventions](#7-content-conventions)

## 1. Build model

`scripts/build.js` renders every file in `src/pages/` through `src/layout.html` and writes complete HTML to `public/`. The builder has no dependencies (~470 lines).

Template syntax (complete):

| Tag | Meaning |
| --- | --- |
| `{{title}}` | variable from page front matter or `src/data/*.js` |
| `{{join.title}}` | dotted path into data |
| `{{> category-card}}` | include `src/components/category-card.html` |
| `{{#each categories}} … {{/each}}` | loop; inside, item fields are plain `{{fields}}`, plus `{{@index}}` and `{{@delay}}` (with `delay=80` on the each tag) |
| `{{#each list}} … {{.}} … {{/each}}` | loop over scalar items — `{{.}}` is the item |
| `{{#if flag}} … {{else}} … {{/if}}` | conditional block; the `{{else}}` branch is optional and renders when the flag is falsy, an empty array, or missing |

Values are inserted raw and may contain HTML (`<b>`, `<svg>`, `<br>`); never interpolate untrusted input. The build fails on unknown variables and on leftover `{{…}}` tags in the output.

Data files are scoped by filename: `site-<page>.js` loads for page `<page>.html` only; every other file in `src/data/` loads for every page (`sites-general.js`, `icons.js`). The build fails, rather than rendering a wrong page, when:

- the same top-level key is defined by two files in one page's namespace (the error names both files);
- `minutes` loads without `committees` — `prepareData` cross-fills the two arrays (§2d).

Front matter is the `---` block at the top of a page file:

```
---
title: Page title — Flow Battery Commons
description: page summary for search engines, ~150 chars
theme: green (default — omit) | yellow | red
chip: badge text for the page-hero
h1: Visible <span class="grad">headline</span>
sub: Intro paragraph.
---
```

`title` and `description` are used in `<head>`; `chip`, `h1` and `sub` are read by the `{{> page-hero}}` component; `theme` selects the page's colour theme (§4) and becomes `<body data-theme="…">`.

## 2. Adding a page

In the steps below, `<page>` is the new page's filename without extension (lowercase, hyphenated), as everywhere in this guide.

1. Create `src/pages/<page>.html` — copy the front matter and section structure from `src/pages/committees.html`.
2. Compose it from existing components: `{{> page-hero}}`, sections with `{{#each …}}{{> category-card}}{{/each}}`, `{{> join-card}}`, etc.
3. Put its content arrays in `src/data/site-<page>.js`; this naming scopes the file to the new page (§1). Content the other pages already read stays in `sites-general.js`.
4. Add a nav entry in `sites-general.js → nav` (href `<page>.html`).
5. Run `node scripts/build.js && bash scripts/check.sh`.

The layout provides every page with: nav, electrolyte stream, charge bar (the page-progress indicator at the top of the viewport), footer tank, reveal-on-scroll, reduced-motion behaviour.

A band is a full-width coloured section that breaks out of the page's paper background. A band with wave caps uses `class="band"` with `{{> wave-top}}` and `{{> wave-bottom}}` as first and last children; example: `#dashboard` in `src/pages/resources.html`. Bands follow the page theme (§4).

## 2a. Adding a news item

News items live in `src/data/site-index.js`. Copy an existing entry and edit its fields; the file header documents each field. Entries are ordered newest first. The deck (the slide carousel), its dots and the counter derive all counts from the array length.

The band's only heading is `newsEyebrow`, an `h2` rendered in the eyebrow style (a small-caps label, not a headline). The `newsTitle` and `newsLede` fields were removed; re-adding a headline to the band is a design change, not a per-item edit.

An entry may carry an `image`. It renders as a band backdrop: it bleeds in from the right edge and fades into the dark with a gradient, and it never determines the band's height.

- `w` and `h` must match the file's pixel dimensions. `credit` renders in the picture's bottom-right corner; keep it where the licence requires attribution.
- The picture is cropped to cover and centred slightly above the middle; relevant content must sit in the middle band of the frame.
- It occupies at most the right ~46 % of the viewport and is hidden below 1100/960 px. Content that must be readable does not belong in the band.
- No space is reserved for it and it has `pointer-events: none`; a missing file has no layout effect.

All slides share one grid cell, so the longest lede (a slide's intro paragraph) sets the height of every slide; keep ledes to two or three sentences. Without JavaScript the slides render as a plain list; this is the intended fallback (`11a-news.css`).

## 2b. Navigation and the footer

`src/data/sites-general.js → nav` is a list of menu groups `{ label, href, children? }` with children `{ label, href }`. The bar renders one link per group; hover, focus, or a single tap on touch reveals the children. Styles: `03a-navmenu.css` (it owns all responsive nav rules; `18-responsive.css` does not touch `.nav-links`), behaviour: `03-navmenu.js`. The dropdown exists only at ≥ 961 px; below that the hamburger panel (the button and full menu overlay used on small screens) shows the whole tree with the groups as headings, and every rule that reveals or moves a panel is width-scoped (§5).

The footer has no link list of its own: `build.js → prepareData` derives `footerCols` from the same `nav` array — one column per group, landing page first, then children in menu order — plus a closing **Connect** column built from `sites-general.js → platforms[]`. A nav entry therefore appears in menu and footer with one edit. Two rules follow:

- `footLabel` (optional) is the label the footer uses for a group's landing link; it defaults to `label`. All three groups use "Overview" so the first row does not repeat the column heading.
- A child must not point at its own parent's page: that duplicates the link in both renderings. The footer prints the landing page once as the column's first row; the menu reaches it through the parent link.

A child flagged `soon: true` renders as plain text with a "soon" pill in the menu and in the footer (the flag is copied through).

Href conventions, applied to parents and children by `build.js → prepareData` and to the derived footer links:

- `#mission` is a home-page anchor; on sub-pages it is rewritten to `index.html#mission`.
- A link to the page being built collapses to an in-page anchor: `committees.html#minutes` → `#minutes`; bare `committees.html` → `#top`.
- A parent's `href` must be a real landing target (the group's page), never a bare `#`.
- `aria-current="page"` is set on top-level items only, when the parent targets the page being built.
- The brand link in nav and footer is `{{homeHref}}`: `#top` on the home page, `index.html` elsewhere.

## 2c. The GitHub resource list (resources.html)

`resources.html` renders two objects from `sites-general.js → categories`, the same array the home-page cards use, so a category rename cannot be applied in one place only:

- The **category band** under the hero (the top section of the page; `components/repo-cat.html`) uses the layout of the readout and chairs sections (`12a-proof.css`, `11b-chairs.css`): mark, number, small-caps label, hashtag pill. The number is the live count of repositories in the category.
- The **list** (`components/repo-group.html`) is one row per category; the category's repositories move through the row as cards — the same horizontal rail (a row of cards scrolled sideways) used by the minutes section (§2d). Cards are cloned at runtime from `<template id="repo-row-tpl">`.

Page height is fixed regardless of repository count: a new repository adds a card to a rail, not height to the document.

No repository data is stored in this repository. `07-repos.js` fetches `GET /orgs/<org>/repos?per_page=100&sort=full_name&page=N` from the visitor's browser via GitHub's public API (application programming interface): unauthenticated (no token), and requests from any website are permitted (CORS, cross-origin resource sharing, is `*`). The organisation name comes from `<body data-github-org>`, which `build.js` renders from `sites-general.js` (§5). The script pages forward only while a page returns the full 100 entries (so a 101st repository is not dropped), caches the result in `sessionStorage` (the browser's per-tab storage) for five minutes, and files a repository under a category when the repository's GitHub topics contain the category's `topic` string.

Rules and invariants:

- Filing happens on GitHub, not here: a repository appears under "Open Hardware" when it carries the topic `hardware` (repo → About → Topics). No edit in this repository can file it.
- `topic` values must match the organisation's topics exactly: lowercase, hyphenated. Renaming one side empties the category. A repository may match several categories and then appears in several rails. `.github` and archived repositories are excluded (`data-repos-exclude` on the section, `archived` in the script).
- The list requires JavaScript. Every rail ships a placeholder line and the section a `<noscript>` line; keep both. Without JS the arrows are hidden (`html:not(.js) .repo-btn`) and the rail is a plain scrollable list.
- Arrows are disabled, never removed (`07-rail.js` sets `[disabled]`), because adding or removing buttons shifts the layout. The row also keeps its height in every state: `--repo-h` in `17a-repos.css` is an authored height (two name lines + three description lines + meta line + gaps + inset) that the loading/empty/error note reserves as well. Change card size there, never on the card.
- The paging step is measured from the first card plus the rail gap, not authored, so `--repo-per` and `--rail-gap` cannot desynchronise the arrows from the layout. `07-rail.js` defines `window.fbcRail(listEl, {prev, next, itemSel})` and returns `{sync}`; `07-repos.js` and `07a-minutes.js` each call it once per row.
- Card width is derived from the rail: `--repo-w` = `(100% − (per − 1) × gap) / per`, with `--repo-per` 4 on desktop, 3 under 960 px, 2 under 640 px, 1 under 480 px. Whole cards per view plus a one-card step keep every snap position flush; the arrows are the only overflow indicator.
- Card descriptions are clamped to three lines; the link's `aria-label` carries the full text and the meta line so the truncation is not visual-only.
- Cards use the standard glass surface (translucent with a blurred background), identical to `.cat` (`10-cards.css`): `rgba(255,255,255,.55)` + `backdrop-filter: blur(10px) saturate(1.15)`, a hairline (1 px) border `rgba(255,255,255,.7)`, `--radius`, `.cat` hover lift (translateY(-5px) + `--accent-bright` border; shadow is `--shadow-soft` because the rail clips the deeper one at its padding box). Any new element using this surface needs a fallback rule in `15-fallbacks.css` (`--paper` background, `--line` border) for browsers without `backdrop-filter`. There is no hairline between two cards or two categories, and the rail has its own vertical padding because an overflow scroller clips content that lifts out of it.
- A card's pill row lists all categories the repository matches, including the one the rail shows, capped at `MAX_PILLS` (3). A repository whose topics match none of the six categories gets no pills.
- Unauthenticated GitHub requests are limited to 60 per hour per visitor IP address; this is why results are cached and why a failure degrades to a link instead of an error.
- Descriptions arrive from the network and are written with `textContent`. Never change this to `innerHTML`.
- Each category's `href` is a GitHub organisation topic search: `github.com/orgs/<org>/search?q=…` redirects to `github.com/search?q=org%3A<org>+topic%3A<t>&type=repositories`, which renders the results on the server (verified 2026-10-10). `type=repositories` is required; without it the result count is filled in by JavaScript in the browser and shows "0 results" until that completes.

## 2d. Adding committee minutes

Minutes entries live in `src/data/site-committees.js`; one entry is one published document:

- `committee` — the committee's `id` in `committees[]` in the same file. The builder files the entry under that committee, newest first, and fails the build on an unknown id. Committee names are single-sourced; the two arrays must load together (§1).
- `date` — an ISO 8601 date (`YYYY-MM-DD`); the sort key and the source of the printed date ("27 Aug 2026"). A date that is not `YYYY-MM-DD` fails the build.
- `href` — the document: a relative path into this site (`minutes/2026-08-27-minutes-cc.pdf`, the normal case) or, for a document too large to store here, an absolute URL. Until a relative target exists it must stay external: `check.sh` resolves relative hrefs against the built output and fails on a missing file.

The section (`committees.html #minutes`) renders one hairline row per committee — empty committees included, marked as such — and each row is a horizontal rail with scroll-snap (the row stops on card boundaries while scrolling). Styles: `17b-minutes.css`; behaviour: `07a-minutes.js` (year filter) on the shared rail wiring in `07-rail.js`. Both controls are progressive enhancements (features that only activate when JavaScript is available): without JavaScript they are hidden and the rail is a plain scrollable list.

- **Arrows**, one pair per row head, page that rail by one entry (the step is measured, not authored). They are rendered for every row and never hidden, only `[disabled]`, so the section does not shift when content changes.
- **Rows keep their height when empty.** The `--minute-h` chain at the top of `17b-minutes.css` reserves the rail box for the empty note, so filtering changes text, not layout.
- **The year menu** is one native `<select>` for the whole section, authored in `pages/committees.html` (not in the component), right-aligned above the rows. It lists only years that hold a document: the builder derives `minutesYears` from the dates and sets `minutesYearFilter`; a single year on record renders no menu. Choosing a year hides the other entries in every row; a committee with nothing in that year keeps its head and shows "No minutes from this year." Keep the menu out of `.minutes-ctrl`: that group is hidden whenever a row has nothing left to page, which would hide the filter while it is in use.

### Publishing the PDF

Place the file in **`src/static/minutes/`**. The builder copies that directory verbatim into `public/` (`build.js` step 4, `fs.copyFileSync` — binary-safe, unlike the CSS/JS bundler, which reads UTF-8). `public/` is wiped on every build and git-ignored, and `src/assets/img/` maps to `assets/img/`, so `src/static/minutes/` is the only location from which a document reaches the deployed site.

```
src/static/minutes/2026-08-27-minutes-cc.pdf   ← the document
src/data/site-committees.js   { committee: "research", date: "2026-08-27",
                        href: "minutes/2026-08-27-minutes-cc.pdf" }
→ public/committees.html   <a href="minutes/2026-08-27-minutes-cc.pdf" …>
```

Four rules, each enforced by a check:

- **Filename: ISO 8601 date first, then the content** — `2026-08-27-minutes-cc.pdf`, `2026-09-17-minutes-dic.pdf` — lowercase letters, digits and hyphens only, no spaces. The date is the filename and the URL; a published name is never reused or edited afterwards. `check.sh` extracts links with `grep` and iterates them word by word, so a space in a filename reports a false `BROKEN`; Pages URLs are case-sensitive.
- **The href is relative**, never `/minutes/…`: Pages serves the site under `/<repo>/` (ADR 0002) and `check.sh` fails on root-absolute URLs.
- **Compress the file and keep a text layer.** Text-only minutes are 30–150 KB from a Markdown or LaTeX export; word-processor or scan exports are often ten times that. `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dCompatibilityLevel=1.7 -sOutputFile=out.pdf in.pdf` or `qpdf --optimize-images` is sufficient; `/ebook` is fine for a document that is not printed. A scan without a text layer cannot be zoomed cleanly, searched, or read by screen readers.
- **≤ 1 MB is the target, ~2 MB the limit.** A larger document (scan, slide deck, figure set) does not belong in this site: publish it in an organisation annex repository or as a GitHub Release asset (2 GB per file) and put the absolute URL in `href`. The rail entry renders identically either way.

The continuous integration (CI) pipeline verifies: the link resolves in the built output; the file starts with `%PDF-` (a Git LFS — Large File Storage — pointer is a file that exists, and `actions/checkout` does not fetch LFS objects by default — PDFs are kept out of LFS in `.gitattributes`); no published file exceeds 5 MB; the whole site stays under ~250 MB. Rationale and platform limits: [ADR 0004](adr/0004-minutes-pdfs-in-the-site.md).

Two consequences of publishing in the repository:

- A commit publishes. The repository is public and its history permanent, so minutes that name people need review before the commit; deleting the file later does not remove it from history or from clones.
- Do not overwrite a published document. Corrections get a new file with a suffixed name (`2026-08-27-minutes-cc-rev2.pdf`) and the entry's `href` changes; readers may have cached the old bytes. The rails and the year menu read `date`, not the filename.

An entry's appearance does not depend on the file. The row height is the authored `--minute-h` chain, so a visible "PDF · 240 kB" line would move every row in the section; a format hint belongs in the link's `type`/`aria-label`.

Notes:

- `data-*` attribute names are shared by all scripts. `06-year.js` used to write the footer's copyright year into every `[data-year]` element, and the minutes rail keyed its entries by `data-year`, so each document collapsed to the text "2026". The rail uses `data-minute-year`, the footer `data-footer-year`. Grep the selectors in `src/assets/js/` before introducing a new attribute name.
- Inside an `{{#each}}`, unknown names fall back to the page front matter: `{{title}}` in the minutes loop prints the page title, not the committee's. `components/minute-item.html` does not use it.
- `[hidden]` needs an explicit rule wherever the element also declares `display` (`.minutes-ctrl`, `.minutes-rail`): `display:flex` outranks `[hidden]{display:none}` from the browser's default stylesheet.
- Never write a template tag inside an HTML comment: the builder fails on any `{{…}}` that survives into the output, comments included.

## 2e. The dashboard band (resources.html `#dashboard`)

A static dark band linking to the data dashboard of the international Flow Battery Reproducibility Study, <https://www.flowbatterydata.org/>. It sits under the resource list; the list covers the commons' GitHub repositories, the band points to the study's own platform. Copy: `src/data/site-resources.js` (the `dashboard` key, the file's only key); markup: `components/dash-spot.html`; styles: `17c-dashboard.css`. There is no behaviour module; the link out is the only interactive element.

Three design decisions:

- **Link, do not embed.** The platform sends no `X-Frame-Options` and no `frame-ancestors` (both are HTTP headers that would block embedding), so an iframe would render. The dashboard is a live interactive app (marimo, a Python notebook framework) with its own persistent server connection, fonts and uptime; a static band does not break when the app restarts, renders without JavaScript, and sends no page-view data to the third party. If this is revisited, the band's shape (text column + right backdrop) is what changes, not the copy.
- **Figures are authored, not fetched.** `facts[]` holds three hard-coded numbers confirmed by the study team ("> 38 institutions · > 55 datasets · > 12 mio. data rows"; a leading `>` means *at least*). The platform exposes no API, so counts go stale silently; `site-resources.js` is the file to update, and its header lists what may be claimed.
- **The backdrop image needs the generated mask.** `.dash-photo` bleeds into the two wave caps like the news deck's `.news-photo`, so its cut is the mask `scripts/gen-wave-mask.js` writes between the `WAVE-MASK` markers. The script loops over a `TARGETS` list of CSS files: a new bleeding band picture means adding its file to `TARGETS` and re-running the script. `check.sh` fails when the block is stale.

## 3. Adding a component

1. Create `src/components/<name>.html` — plain markup plus template tags. Document the fields it expects in a leading HTML comment.
2. Use it: `{{#each <key>}}{{> <name>}}{{/each}}`.
3. Styles: add a new numbered CSS file rather than growing an existing one; the builder concatenates in filename order. Pick the number by position in the page so later utility files can still override: a section between the hero and the mission is `12a-proof.css`, not `20-proof.css` (which would sort after `18-responsive.css` and win its media queries).
4. Behaviour: same rule for JavaScript — one module per concern, numbered, each a self-contained IIFE (immediately-invoked function expression) that does nothing when its elements are absent, because pages may omit any component.
5. Name components and data after their content, not after a metaphor. The two rows linking to Discord and GitHub are platforms (`sites-general.js → platforms[]`, `.platform`, `10a-platforms.css`); the six resource groups are categories (`sites-general.js → categories[]`, `.cat`, `#cat-<topic>`, `10-cards.css` / `10b-categories.css`). GitHub's term *topic* is kept for the field that holds the GitHub value (§2c); "category" is the site-side object.

## 4. The electrolyte stream

The stream (`{{> stream}}` + `assets/js/01-stream.js`) appears on every page; its role in the design is described in [ADR 0000](adr/0000-website-design-language.md). Implementation:

- The path is generated at runtime from the real page height (a parametric sine curve, approximated with one cubic curve segment per eighth of the wavelength, rebuilt by a `ResizeObserver` — a browser API that watches element size changes), so growing content never stretches it. The static `d="…"` in the component is the initial path only: `rebuild()` overwrites it, and it never needs editing. Without JavaScript the stream is hidden (`html:not(.js) #stream{display:none}` in `04-stream.css`) — it can never fill, so the empty tube is not shown.
- The fill uses the SVG stroke-dash technique with `pathLength="100"`: the front of the electrolyte is one fraction of the tube and its rounded cap is the marker. There is no leading droplet. The arc-length table remains because the fill's start level is derived from the headline's position through it.
- Progress is measured along the tube, not along the document: `scrollY / (tubeLength − innerHeight)`, clamped. Document-based progress fails when `footerHeight > innerHeight`: the tube ends at the footer, so the front runs slower than the scroll and drifts off-screen. Tube-based progress keeps the front visible from beside the headline to the bottom edge of the viewport, and the tube is exactly full when its end reaches that edge. The charge bar at the top uses document progress; it is a page-progress indicator. It wears the fill's ramp — the same `--stream-a/b/c` stops at the same offsets, run left to right (`03-nav.css`) — so bar and tube read as one electrolyte.
- The fill gradient uses `gradientUnits="userSpaceOnUse"` and `01-stream.js` sets its `y2` to the tube length. A straight tube (narrow-screen mode) has a zero-width bounding box, and a gradient referenced from a zero-area bbox renders nothing.
- The tube ends inside the footer wave (`H − footerHeight + 12`). If you change the footer, keep it the last element inside `.page`.
- Below 960 px the tube is straight: `01-stream.js` sets the amplitude to 0 and puts the centerline at half the track's stroke width, so the outer edge sits on the left page border. It is the same curve with `AMP = 0`, so fill, inner line and footer ending keep working. Do not re-add the wave below the breakpoint; the single-column text spans the full width there.
- At the same breakpoint all strokes halve (track 30→15, fill 11→5.5, inner line 11→5.5); colour and opacity are identical at every width. The media query in `04-stream.css` and `NARROW` in `01-stream.js` must use the same value (`960px` today; change both together if the straight tube should start at a different width). Stroke widths are read from CSS by `trackStroke()`; keep `.stream-track` the widest of the three strokes.
- If a page must not have the stream, it must also drop the `.page` wrapper; never hide one without the other.

**Page themes.** A page declares its theme in the front matter: `theme: yellow` (committee pages) or `theme: red` (resource pages); no key means green, the default. The layout turns the key into `<body data-theme="…">`, and `01a-theme.css` repaints: the stream (`--stream-a/b/c`, `--stream-track-inner`; the empty tubing `--stream-track` stays neutral light grey on every theme), the footer tank (`--tank-*`), the dark bands (`.band` and its wave caps wear the `--tank` colours and `--tank-ink*` text roles), the accent colours (`--accent`, `--accent-strong`, `--accent-deep`, `--accent-bright`, plus `--hero-glow`, the accent at 14 %), the join card (`--card-wash`/`--card-edge`/`--card-crest`), and the join buttons (`.btn-dc`/`.btn-gh`: the platform the page is about gets the solid highlight — yellow → Discord, red → GitHub, green → both neutral; the platform glyphs never change) and the charge bar (the `--stream-a/b/c` ramp, so it repaints with the stream). The ramp's bottom stop always equals `--tank`. Not themed: mint backgrounds, the brand ramps (gold→red headline, yellow·green·red hairlines), the platform marks (Discord yellow, GitHub red) and the nav's own glass; the header comment of `01a-theme.css` keeps the list.

## 5. Implementation notes

- An absolutely-positioned decorative `<svg>` inside a sized wrapper needs explicit `width:100%;height:100%`. A viewBox alone sizes by aspect ratio and detaches the wave from its band at other viewport widths.
- Nav href conventions (§2b) are resolved per page by `build.js → prepareData`; author them site-relative in `sites-general.js`.
- Media queries add no specificity. Every rule that positions or reveals a dropdown panel in `03a-navmenu.css` is wrapped in `@media (min-width:961px)`: `.nav-item:hover .nav-menu` is (0,3,0) while the mobile `.nav-links .nav-menu{transform:none}` is (0,2,0), so an unscoped hover rule wins over the mobile block regardless of file order. Below the breakpoint the panel is static and always visible; the hover rule must not exist there, not merely lose.
- The Join button (`#join`) is not rewritten by the builder, so every page ends with a section `id="join"`. Keep that when adding pages.
- The join card links out to Discord and GitHub; there is no form. Live numbers (`05-community.js`) update every `[data-live="discord:members|discord:online|github:members|github:repos"]` element from the public Discord and GitHub APIs; the numbers in `site-index.js → communityStats` are the no-JS/offline fallback. If the invite link or organisation changes, edit `sites-general.js` once: the consts at the top hold `GITHUB_ORG`/`DISCORD_INVITE` and build the two URLs from them, and `build.js` puts both values on `<body>` as `data-github-org`/`data-discord-invite`, which `05-community.js` and `07-repos.js` read. GitHub only counts memberships whose owners made them public.
- The hero avatar orbit in `pages/index.html` is generated: everything between the `ORBIT:BEGIN` / `ORBIT:END` markers is rewritten by `python3 scripts/gen-orbit.py`, which lays six concentric elliptical rings of evenly spaced avatars, smallest and most opaque nearest the cell stack. Tune the `RINGS` table in the script, not the markup; `check.sh` runs the script with `--check` and fails when the committed block is stale. Opacity ramps exponentially (`opacity_for()`, 0.10 · 0.16 · 0.25 · 0.40 · 0.63 · 1.00; tune with `OP_MIN`/`OP_MAX`/`OP_EXP`). The avatars do not animate: each carries a fixed tilt from `TILTS`, rotated over the sequence so neighbours differ, and its inline `transform` repeats the `translate(-50%,-50%)` of `.hero-floats img`, because an inline transform replaces that declaration instead of adding to it. `build()` also keeps two `rnd.span()` calls whose values nothing reads: `Rand` advances the LCG once per call, so removing them would shift the seeded jitter of every later avatar and move the whole swarm. The layer sits under `.hero-copy` (z-index), so the text paints over the avatars behind it.
- Cards use a `delay` field (ms) for the reveal stagger; keep row patterns (0/80/160) so grids animate in reading order. Do not put `data-reveal` on a news slide: the deck controls its opacity (`11a-news.css`) and the two transitions conflict.
- `404.html` is self-contained (inline CSS, no shared assets): Pages serves it under the missing URL, where relative paths resolve against the wrong directory.

## 6. Before you push

```bash
npm run check        # build + check.sh
```

`check.sh` enforces: required files exist; no root-absolute URLs; one `<h1>` per page; all internal links resolve; every `#fragment` has a real `id` on the page it targets; `<img>` alt attributes; a 300 KiB budget per artifact (1 KiB = 1024 bytes); no leftover template tags; and that the generated blocks (orbit, wave masks) match their scripts. For documents in `src/static/` (the committee minutes PDFs): each file is a real PDF, stays under 5 MB, and leaves the whole site under ~250 MB. The CI pipeline runs the same checks on every pull request and also reads the source: an unused component or an unread data key fails the build — delete it or wire it up.

## 7. Content conventions

- Language / tone: warm, precise, a little dry. Sentences may be long; claims may not be vague.
- Licence wording in the footer must match `LICENSE.md`.
