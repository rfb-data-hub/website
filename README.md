# Flow Battery Commons — website

Source of the public website of the [Flow Battery Commons](https://github.com/), an open community for flow battery research. The site describes the community, its committees and its digital resources, and is deployed to GitHub Pages (GitHub's static hosting) from this repository. Design and build decisions are documented as Architecture Decision Records (ADRs): short, structured notes that capture a decision with its context, rationale and consequences, so that later contributors can understand why the site is the way it is. See [docs/adr/](docs/adr/).

It is a static site without frameworks: plain HTML, CSS and JavaScript, assembled by `scripts/build.js`, a dependency-free script for Node.js (the JavaScript runtime). Node ≥ 16 is the only requirement; there is nothing to install.

## Commands

| Command | What it does |
| --- | --- |
| `node scripts/build.js` | renders `src/pages/` through `src/layout.html` into `public/` |
| `bash scripts/serve.sh` | builds, then serves `public/` at http://localhost:8080 |
| `bash scripts/check.sh` | health checks on the built output (links, anchors, one `<h1>` per page, leftover template tags, …) |

The same three are available as `npm run build`, `serve` and `check` (npm is Node's bundled command runner).

## Layout

```
src/
  layout.html        document shell: head, nav, stream, main, footer
  pages/             one file per page (index, committees, resources);
                     front matter + <main> content
  components/        reusable partials, included as {{> name}}
  data/              content as data — a site-<page>.js file loads for that
                     page only, the others load everywhere (ADR 0003)
  assets/css/        numbered files, concatenated into app.css?v=<hash>
  assets/js/         numbered modules, concatenated into app.js
  static/            copied verbatim: 404.html, robots.txt, site.webmanifest,
                     .nojekyll, and minutes/ (the published PDFs)
public/              build output (git-ignored, deployed by continuous
                     integration, CI)
scripts/             build.js · check.sh · serve.sh · gen-orbit.py ·
                     gen-wave-mask.js (regenerate derived markup/CSS;
                     check.sh fails when those are stale)
docs/                authoring guide + ADRs
.github/workflows/   ci.yml (build + checks) · deploy.yml (Pages)
```

## Where to edit content

Most content changes are made in `src/data/` without editing HTML:

| To change … | edit |
| --- | --- |
| nav menu (the footer columns follow it), site-wide text, platform rows, category cards | `src/data/sites-general.js` |
| home page: hero (top section), news & events, FAQ (frequently asked questions) | `src/data/site-index.js` |
| committees: descriptions, chairs | `src/data/site-committees.js` |
| publish meeting minutes | PDF into `src/static/minutes/` + entry in `src/data/site-committees.js` |
| resources page: dashboard band (dark full-width section), intro text | `src/data/site-resources.js` |
| page structure (sections, headings) | `src/pages/<page>.html` |
| a reusable block | `src/components/<name>.html` |
| colours, spacing, typography | `src/assets/css/01-tokens.css` |

The list of resources itself is not in this repository: `resources.html` reads the GitHub organisation live in the browser and files each repository by its topics. To add or re-file a resource, set the repository's topics on GitHub.

Full walkthrough (template syntax, front matter, adding a page): **[docs/authoring.md](docs/authoring.md)**.

## Design language

The site follows a single design language, recorded in [ADR 0000](docs/adr/0000-website-design-language.md): the page is modelled on a flow battery — two tanks (the community's two platforms) feeding a central cell, with the reader's scroll as the fluid. Its practical rules:

- The palette derives from the community logo and is defined once in `src/assets/css/01-tokens.css`. Each page selects an accent via front matter (`theme: yellow` / `theme: red`; no key = the default green).
- Brand marks use the site's own tank colours — Discord yellow (`--pos`), GitHub red (`--neg`) — not the platforms' corporate colours.
- The electrolyte stream appears on every page and pairs with the footer tank; new sections follow the existing layout patterns (bands, rails, hairline rows; defined in [docs/authoring.md](docs/authoring.md)) rather than introducing one-off styles.
- Changes to the visual language are recorded as ADRs.

## Documentation

| Document | Topic |
| --- | --- |
| [docs/authoring.md](docs/authoring.md) | how to edit and extend the site |
| [ADR 0000](docs/adr/0000-website-design-language.md) | design language: the site is a flow battery (parent ADR) |
| [ADR 0001](docs/adr/0001-zero-dependency-builder.md) | zero-dependency builder |
| [ADR 0002](docs/adr/0002-relative-urls.md) | relative URLs (Pages serves from `/<repo>/`) |
| [ADR 0003](docs/adr/0003-content-as-data.md) | content as data in `src/data/` |
| [ADR 0004](docs/adr/0004-minutes-pdfs-in-the-site.md) | committee minutes PDFs in the site |

## Publishing

A push to `main` runs `deploy.yml`: it builds, runs `check.sh`, and publishes `public/` to GitHub Pages. Branches and pull requests run `ci.yml` (build and checks only). The repository's Pages source must be set to **GitHub Actions** — deploying from a branch would serve the raw `src/` tree.

## Licence

Code MIT · text and images CC BY-SA 4.0 — see [LICENSE.md](LICENSE.md).
