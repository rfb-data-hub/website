# Committee minutes

This document describes how to upload a minutes PDF via Github. Please, first read the whole README and then use the link below to upload the minutes PDF.

**Upload:** <https://github.com/rfb-data-hub/website/upload/main/src/static/minutes>

## Filename

Before uploading the minutes PDF, it needs to be renamed to a format that can be automatically detected: 

`<YYYY-MM-DD>-minutes-<code>.pdf` — lowercase letters, digits and hyphens, no spaces.

| Committee | `code` | Example |
| --- | --- | --- |
| Community Committee | `cc` | `2026-11-02-minutes-cc.pdf` |
| Data Infrastructure Committee | `dic` | `2026-11-02-minutes-dic.pdf` |
| Research Committee | `rc` | `2026-11-02-minutes-rc.pdf` |

The date is the meeting date. It is the sort key, the printed date, the year filter and part of the permanent URL. The build stops on an unknown code or an impossible date, and `check.sh` stops on a PDF that no page links.

## Publishing

1. Open the upload link above and drag the PDF into the page.
2. Choose **Create a new branch for this commit and start a pull request** below the text field (if you are asked for it; otherwise ignore this).
3. In the pull request description, open the template menu above the text field and choose **minutes**. If no template menu appears, leave the description unchanged.
4. A GitHub workflow will automatically build the site and run `scripts/check.sh` to check everything is okay.
5. A repository maintainer reviews the PDF and the pull request checklist.
6. If everything is good, the maintainer merges to `main`, which auto-deploys the PDF to the site. The document appears under Committees → Minutes.

Without write access, GitHub forks the repository and opens the pull request from the fork. No local git or Node.js installation is needed.

## Rules

- **≤ 1 MB is the target, 5 MB the limit.** Compress with `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dCompatibilityLevel=1.7 -sOutputFile=out.pdf in.pdf` and keep the text layer.
- **A commit publishes.** The repository is public and its history is permanent; deleting the file later does not remove it from history or from clones. Check personal data before uploading.
- **Do not overwrite or rename a published file.** The name is the URL. A correction is a new file (`2026-08-27-minutes-cc-rev2.pdf`) plus one entry in `src/data/site-committees.js`; a suffixed name is not discovered.
