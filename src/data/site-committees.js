/* ============================================================
   site-committees.js — the COMMITTEES page (src/pages/committees.html):
   the three committees, their chairs, and every minutes document published.

   Page-scoped: build.js → loadData() loads a `site-<page>.js` file for
   that one page only. The two arrays are one contract: build.js files
   the FLAT minutes[] under the matching committees[] `id` and derives
   the section's year menu from the dates — an unknown id or a missing
   array stops the build. Couplings: the row anchors `id` are linked by
   the nav children in sites-general.js; scripts/check.sh verifies a
   relative minutes `href`.
   ============================================================ */
"use strict";

module.exports = {
  /* ---------- committees[] — one entry per committee ----------
     Rows: components/committee-row.html, styled by 17-page.css; chairs:
     components/chair-item.html · 11b-chairs.css; no behaviour module of
     its own — the partials only carry 02-reveal.js's [data-reveal].
     id = the row's anchor, linked from the nav → Committees children in
     sites-general.js; num = the abbreviation shown in the row; title/desc =
     the row's heading and text; lastMeeting and cadence = the two badges —
     cadence is plain wording on purpose ("bimonthly" is ambiguous);
     chair/coChair are kept INSIDE the committee so the chairs band can
     never drift out of the list; `avatar` is a bare file name —
     chair-item.html prefixes assets/img/avatars/ — and a "t.b.a." chair
     renders as-is with avatar-tba.svg. */
  committees: [
    {
      id: "community",
      num: "CC",
      title: "Community Committee",
      desc: "Looks after the community itself: the Discord server and its guidelines, welcoming new members, the meetings and events, office hours for practical questions, and outreach to specialists and curious newcomers alike.",
      lastMeeting: "27 Aug 2026",
      cadence: "Every two months",
      chair: { name: "Tom Goodwin", avatar: "avatar-06.svg" },
      coChair: { name: "t.b.a.", avatar: "avatar-tba.svg" },
    },
    {
      id: "data-infrastructure",
      num: "DIC",
      title: "Data Infrastructure Committee",
      desc: "Maintains the data infrastructure of the commons: the GitHub organisation (data hub), the website, and the documentation. It also coordinates the reproducibility study data collection, dissemination, management, and tools for their analysis.",
      lastMeeting: "17 Sep 2026",
      cadence: "Every two months",
      chair: { name: "Dr. Hugh O'Connor", avatar: "avatar-02.svg" },
      coChair: { name: "Dr. Christian Stolze", avatar: "avatar-21.svg" },
    },
    {
      id: "research",
      num: "FBR",
      title: "Flow Battery Research Committee",
      desc: "Coordinates the joint research activities of the community, in particular the international round-robin studies. Prepares shared measurement protocols and recommendations for reporting experimental results.",
      lastMeeting: "27 Aug 2026",
      cadence: "Every two months",
      chair: { name: "Dr. Josh Bailey", avatar: "avatar-22.svg" },

      coChair: { name: "t.b.a.", avatar: "avatar-tba.svg" },
    },
  ],

  /* ---------- minutesEyebrow · minutesTitle · minutesLede ----------
     The section head of committees.html #minutes, printed straight into
     the page (no partial) above the rows; styles: 17b-minutes.css. The
     rows themselves come from `minutes` below. */
  minutesEyebrow: "Committee Minutes",


  minutesTitle: "Minutes of the committee meetings.",


  minutesLede:
    "Each committee records its meetings in written minutes. The published documents are listed below, one row per committee and newest first; selecting an entry opens the file.",


  /* ---------- minutes[] — one entry per published document ----------
     Markup: components/minutes-group.html (one row per committee) and
     components/minute-item.html (one entry) · styles: 17b-minutes.css ·
     behaviour: 07a-minutes.js, which adds the row arrows and wires the ONE
     section-wide year menu that pages/committees.html puts above the rows
     (its years are derived from the dates below — never authored). Without
     JS a row is a plain horizontal list you can still scroll by hand. A
     committee with no entry here still gets its row, saying so.

     committee  the `id` of a committee in `committees[]` above; the builder
                files the entry under that committee and STOPS THE BUILD if
                the id does not exist.
     date       ISO "YYYY-MM-DD": the sort key (newest first), the printed
                date ("27 Aug 2026") and the year the section's menu filters
                on. Anything else fails the build.
     href       the minutes file. A published document lives WITH the site:
                src/static/minutes/<date>-<committee>.pdf, referenced by a
                RELATIVE path ("minutes/2026-08-27-minutes-cc.pdf") so
                check.sh can verify it exists and really is a PDF — so a
                document and its entry belong in the SAME commit, or CI
                deploys nothing. An absolute URL is the exception: a
                document deliberately kept off-site (too large to ship) —
                docs/authoring.md §2d, ADR 0004. */
  minutes: [
    /* ---- Community Committee ---- */
    { committee: "community", date: "2026-08-27", href: "minutes/2026-08-27-minutes-cc.pdf" },

    /* ---- Data Infrastructure Committee ---- */
    // { committee: "data-infrastructure", date: "<YYYY-MM-DD>", href: "<PATH_TO_MINUTES_PDF>" },

    /* ---- Flow Battery Research Committee ---- */
    // { committee: "research", date: "<YYYY-MM-DD>", href: "<PATH_TO_MINUTES_PDF>" },
  ],
};
