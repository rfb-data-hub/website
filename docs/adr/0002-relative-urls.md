# ADR 0002 — Relative URLs everywhere

**Date:** 2026-10-08 · **Status:** accepted

## Context

GitHub Pages serves this repo at `https://<user>.github.io/flow battery-commons-website/`. Root-absolute URLs (`/assets/…`, `/committees.html`) would 404 under that path prefix unless the base path were hardcoded into the build — which breaks a custom domain, local `file://` previews and forks under other names.

## Decision

Every internal link and asset reference is **relative to the page**. All pages are emitted flat into `public/` (no subdirectories), so relative paths are trivially correct. `scripts/check.sh` fails the build if any `href="/` or `src="/` appears in the output.

Two deliberate exceptions:

- `404.html` is fully self-contained (inline CSS) because Pages serves it under the *requested missing* path, where even relative URLs resolve against the wrong directory.
- External resources (Google Fonts) are absolute by nature.

## Consequences

+ Works from project path, custom domain, fork, or `file://` without config.
− Deep page hierarchies (`/docs/x/y.html`) would need `../` discipline — if that ever arrives, extend the builder to compute per-page prefixes rather than abandoning this rule.
