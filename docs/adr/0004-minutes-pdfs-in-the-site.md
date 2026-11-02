# ADR 0004 — Committee minutes PDFs live in the site

**Date:** 2026-10-10 · **Status:** accepted

## Context

The committees publish their meeting minutes as PDFs, and `committees.html#minutes` links to them. The people who publish them are committee chairs, not developers: they work in the browser and should not have to edit JavaScript to make a document appear.

Storage had four plausible answers:

| Option | What it means |
| --- | --- |
| **In the site** | `src/static/minutes/*.pdf`, copied verbatim into `public/` by the builder, linked with a relative href |
| **Git LFS** | PDFs tracked by LFS in this repository |
| **GitHub Releases** | assets on a release tag, absolute `releases/download/…` URLs |
| **The organisation's own repo** | minutes kept next to the discussion, linked to `github.com/<org>/…` |

Two properties of this repository decide the storage question. `public/` is **build output** — wiped on every run and git-ignored — so a file that is not copied by `build.js` simply does not exist on the deployed site. And `check.sh` resolves every relative href against the built output, so a link stored in the repository is *verified* by CI, while an external URL is skipped.

## Decision

**A published minutes PDF is part of the site.** It lives in `src/static/minutes/`, named `<YYYY-MM-DD>-minutes-<code>.pdf` — lowercase ASCII, hyphens, no spaces, the meeting date first and the committee's `code` (`cc`, `dic`, `rc`) last. The file is compressed to ≤ 1 MB with a text layer and linked with a **relative** href (`minutes/2026-08-27-minutes-cc.pdf`).

**The filename is the entry.** `build.js` scans `src/static/minutes/` for names matching the pattern, resolves the code against `committees[].code`, validates the date as a real calendar day, and files the document under that committee with the date as sort key, printed date and year-filter value. Publishing a document therefore needs no edit to `src/data/site-committees.js`. The build log names every discovered document, and the build stops on an unknown code, an impossible date, or two files for the same committee and date.

`minutes[]` in `src/data/site-committees.js` remains as the exception list, and an entry there wins over a file of the same committee and date. It carries the two cases a filename cannot describe: a document kept off-site (absolute href) and a corrected revision (`…-rev2.pdf`), which the pattern does not match. A superseded base document stays published for old links; `check.sh` accepts it because an authored entry carries its committee and date.

**Publication is a pull request.** The upload page (`github.com/<org>/website/upload/main/src/static/minutes`) creates a branch and a pull request in the browser; `ci.yml` builds and checks it, a maintainer reviews the PDF, and the merge to `main` deploys. `main` is protected: one approval and a green `build` check. A contributor without write access gets the same flow through a fork.

The size is the switch, not a preference: a text-only minutes PDF is 30–150 KB, so the site absorbs hundreds of them without touching any platform limit. A document that cannot be brought under roughly 2 MB — a scan, a deck, a figure set — is **not** a minutes PDF and goes outside the site, linked with an absolute href (an organisation annex repository, or a GitHub Release asset, which allows 2 GB per file and costs the site nothing). The rail entry looks identical either way; only the href differs.

**Git LFS is explicitly rejected** (the rule is recorded in [`.gitattributes`](../../.gitattributes)). `actions/checkout` does not fetch LFS objects unless told to, so an LFS-tracked PDF would be copied into the Pages artifact as a 130-byte pointer file — and `check.sh`'s link check, which only asks whether the file exists, would pass. `check.sh` now sniffs the `%PDF-` header precisely so that this failure cannot ship.

## Consequences

+ A document is published by uploading it: no code edit, no local checkout, no build step on the publisher's machine.
+ The filename, the URL and the rail entry cannot disagree: one name produces all three, and CI fails when a PDF is misnamed, missing, not a PDF, or published without being linked.
+ The document and the pull request that publishes it are reviewed together, and the review happens before anything is public.
+ No second service, no token, no quota: the same deploy that publishes the page publishes the document, and the URL is stable because the filename carries its date.
+ Readers get the file from the same origin as the page — no redirect through a third party, correct `application/pdf` content type, inline in the browser.
− **A commit is a publication.** The repository is public and git history is permanent: minutes with personal names need a review step *before* the commit, and deleting the file later does not un-publish it or shrink the clone.
− Every byte in `public/` is uploaded and deployed on every push, and it all counts against the site's size. Hence the budgets in `check.sh` rather than trust.
− The link is only as durable as this repository: if the site ever moves, the dated filenames must move with it (they are the URL).
− A revision needs an authored entry: the discovery pattern does not match a suffixed name, and an unreferenced revision file fails CI. Revisions are rare and reviewed explicitly.

### The limits this decision lives inside

GitHub documents these as *soft* limits for Pages — exceeding them gets a request to change or, in the worst case, a disabled site — and they are worth re-reading when they change: `docs.github.com/pages/getting-started-with-github-pages/github-pages-limits` and `docs.github.com/repositories/creating-and-managing-repositories/repository-limits`.

| Limit | Order of magnitude | What it means for minutes |
| --- | --- | --- |
| Pages site size | ~1 GB per site | The real ceiling; PDFs count toward it |
| Pages bandwidth | ~100 GB / month | a 150 KB PDF ≈ hundreds of thousands of downloads |
| Pages requests | ~10 M / month | never a concern here |
| Pages is public | no authentication | no drafts may live in this repository |
| Push: single file | hard block above 100 MB, warning above 50 MB | unreachable for minutes |
| Repository size | ~1 GB recommended | history is forever; compress before committing |
| Git LFS free tier | ~1 GiB storage *and* bandwidth / month | another reason it is the wrong tool |
| GitHub Release asset | ~2 GB per file | the escape hatch for the odd large scan |

Bandwidth is the least of these: the binding constraints are the site's total size and git history, which is why the rule is "small and text-based here, anything else elsewhere".
