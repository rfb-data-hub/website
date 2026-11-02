# Committee minutes

Upload a minutes PDF here and open a pull request. The filename is the entry: the build reads the meeting date and the committee from it, so no other file changes.

**Upload:** <https://github.com/rfb-data-hub/website/upload/main/src/static/minutes>

## Filename

`<YYYY-MM-DD>-minutes-<code>.pdf` — lowercase letters, digits and hyphens, no spaces.

| Committee | `code` | Example |
| --- | --- | --- |
| Community Committee | `cc` | `2026-11-02-minutes-cc.pdf` |
| Data Infrastructure Committee | `dic` | `2026-11-02-minutes-dic.pdf` |
| Flow Battery Research Committee | `fbr` | `2026-11-02-minutes-fbr.pdf` |

The date is the meeting date. It is the sort key, the printed date, the year filter and part of the permanent URL. The build stops on an unknown code or an impossible date, and `check.sh` stops on a PDF that no page links.

## Publishing

1. Open the upload link above and drag the PDF into the page.
2. Choose **Create a new branch for this commit and start a pull request**.
3. Wait for CI: it builds the site and runs `scripts/check.sh`.
4. A maintainer reviews the PDF and the pull request checklist.
5. Merging to `main` deploys the site. The document appears under Committees → Minutes.

Without write access, GitHub forks the repository and opens the pull request from the fork. No local git or Node.js installation is needed.

## Rules

- **≤ 1 MB is the target, 5 MB the CI limit.** Compress with `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dCompatibilityLevel=1.7 -sOutputFile=out.pdf in.pdf` and keep the text layer.
- **A commit publishes.** The repository is public and its history is permanent; deleting the file later does not remove it from history or from clones. Check personal data before uploading.
- **Do not overwrite or rename a published file.** The name is the URL. A correction is a new file (`2026-08-27-minutes-cc-rev2.pdf`) plus one entry in `src/data/site-committees.js`; a suffixed name is not discovered.
- **Large documents belong outside the site.** A scan, a deck or a figure set goes to an organisation annex repository or a GitHub Release asset, linked with an absolute URL from `src/data/site-committees.js`.

Full rules: [docs/authoring.md §2d](../../../docs/authoring.md#2d-adding-committee-minutes) · decision: [ADR 0004](../../../docs/adr/0004-minutes-pdfs-in-the-site.md).
