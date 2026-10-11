# ADR 0003 — Content lives in `src/data/`, markup lives in components

**Date:** 2026-10-09 · **Status:** accepted

## Context

A community site's bottleneck is content, not code: new datasets, corrected member counts, reworded cards, added committees. If those edits mean hunting through duplicated HTML on five pages, contributions stall or drift.

## Decision

All repeated content is data in `src/data/`, filed by scope — the filename is the whole rule:

- `sites-general.js` — what every page shows: nav, the six category cards, the two platform rows (Discord and GitHub), join-card text, footer texts, the organisation and invite constants.
- one `site-<page>.js` per page — what only that page renders: `site-index.js` (incl. the news band), `site-committees.js` (incl. the minutes entries), `site-resources.js` (incl. the dashboard band).
- `icons.js` — the global SVG marks.

`build.js` loads a page's own `site-<page>.js` for that page only and every other data file for every page, so no page ships content it cannot render. Misplaced content fails the build: a top-level key defined by two files in one
page's namespace is an error, not an override, and `minutes` does not load without its `committees` (authoring.md §1).

Pages and components contain structure only. The builder injects data by name and resolves `iconKey` references to inline SVG at build time.

Rules:

- Data values may contain inline HTML (authored content, not user input).
- `categories[]` and `platforms[]` share one field contract: `href`, `desc`, `cta`, `delay`, `iconKey`, plus a label (`title` in `category-card`, `name` in `platform-row`).
- Numbers in copy are placeholders until the community confirms them; they are single-line edits in one file by design.

## Consequences

+ Non-developers can safely edit `src/data/`; diffs read like content.
+ The same component renders index, committees and resources pages — visual consistency is structural, not aspirational.
− Front matter + data split means two places to look for a string; the authoring guide maps which keys feed which components.
− No schema validation yet. If content editors grow, add a small `scripts/validate-data.js` to CI before considering a CMS.
