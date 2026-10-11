# ADR 0001 — Hand-built static site with a zero-dependency component builder

**Date:** 2026-10-09 · **Status:** accepted

## Context

The approved design exists as one perfect `concept-draft/index.html`. The site must now grow: new pages, new content, many contributors, hosted on GitHub Pages from a project path (`/<repo>/`). Earlier decisions already ruled out
Jekyll and heavyweight SSGs; the repo should stay auditable by a researcher with a terminal.

Pure multi-file HTML (copy-paste the nav/footer per page) duplicates the stream markup, SVG defs and every card — guaranteed drift. Runtime JS injection of components costs SEO, causes flash-of-no-layout, and breaks without JS.

## Decision

Keep authoring in `src/` as **components + data**, and assemble complete static pages at build time with `scripts/build.js`:

- ~250 lines of Node, **zero dependencies**, no toolchain to rot.
- Template surface is 4 constructs (`{{var}}`, `{{> partial}}`, `{{#each}}`, `{{#if}}`) — smaller than any library's README.
- Output is plain HTML/CSS/JS in `public/` (git-ignored), uploaded verbatim by the Pages workflow. `check.sh` fails the build on unresolved variables, so the engine can be trusted by non-experts.
- CSS/JS are split into numbered source files, concatenated in order — readable in the repo, one request in production.

## Consequences

+ One source of truth for nav/footer/stream/cards; new pages are data + composition, not copy-paste.
+ No framework upgrades, no lockfiles, no build surprises offline.
− A build step is mandatory (`node scripts/build.js`); `src/*.html` files are not directly openable — documented in the authoring guide.
− If the site ever outgrows this (per-item pages, i18n, CMS), revisit — the builder's interface (src → public) is deliberately the same as an SSG's, so migrating later is mechanical.
