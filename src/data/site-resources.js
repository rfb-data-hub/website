/* ============================================================
   site-resources.js — the content of the one band the RESOURCES page owns:
   the dark "Reproducibility Dashboard" spot at resources.html #dashboard,
   describing the data dashboard of the international Flow Battery
   Reproducibility Study at https://www.flowbatterydata.org/.

   Page-scoped: build.js → loadData() loads a `site-<page>.js` file for that
   one page only. The page's six category groups are NOT here — they come
   from `categories` in sites-general.js, which the home page shares. This is
   the file you edit when the study or its platform changes; the picture's
   backdrop rules are shared with the news deck of site-index.js.
   ============================================================ */
"use strict";

module.exports = {

  /* ---------- dashboard — the #dashboard band of resources.html ----------
     Markup: components/dash-spot.html · styles: 17c-dashboard.css · no
     behaviour module: the band is static, its only interactive element is
     the link out (02-reveal.js only fades the text blocks in).

     eyebrow      the small label above the headline
     heading      the band's <h2> — NOT `title`: inside an {{#each}} the
                  template engine falls back to the page front matter, so a
                  looped field named `title` would print the PAGE title
     lede         two or three sentences of body copy; inline <b> is allowed
     url          the dashboard itself (always an absolute external URL)
     host         the same address without the scheme — the quiet line under
                  the call to action that tells you where you are going
     linkLabel    the text of the single call to action
     facts[]      the figure row: `v` the value, `k` the small-caps label.
                  THREE rules, because a number on this site is a claim:
                    • only values the study team has confirmed, and a ">"
                      prefix means "at least", not "approximately";
                    • nothing here is fetched: the platform exposes no API
                      this site reads, so a growing count goes STALE quietly
                      and this file is the one to edit when it does;
                    • three figures, one per column (the chairs band's
                      rhythm). A fourth is redundant with the lede, which
                      already names the platform's three views.
                  A unit inside a value may be set smaller with
                  <span class="small">mio.</span> — styled in 17c-dashboard.css.
     note         the footnote inside the band: provenance of the numbers
                  and the fact that the link leaves this site
     image        the screenshot, a BACKDROP on the right edge of the band
                  exactly like the news deck's picture (see 11a-news.css for
                  why a backdrop and not a box):
       src          relative path — the file lives in src/assets/img/
       alt          what the picture shows (a real <img>, so it needs one)
       credit       the small line in the picture's bottom-right corner
       w / h        the file's real pixel size, written into the <img>

     The study's publication and the workshop that introduced the platform
     are cited in the news slides of site-index.js ("replicability-challenges-
     paper" and "qub-reproducibility-workshop"), and `note` repeats the
     paper's DOI; who hosts the platform, or under what licence, is claimed
     nowhere here.

     The band links to the dashboard and never embeds it: no iframe, no
     third-party script — the platform is a live marimo app with its own
     fonts, websocket session and uptime (docs/authoring.md §2e).

     ⚠ PLACEHOLDER IMAGE: src/assets/img/flowbatterydata_dashboard.jpg is a
     drawn mock of the platform's home view. Overwrite that file with a real
     screenshot of https://www.flowbatterydata.org/ (keep the name, or change
     `image.src` and the real w/h here), and keep the credit line honest. */
  dashboard: {
    eyebrow: "Flow Battery Reproducibility Study",
    heading: "Pre-liminary data analysis",
    lede:
      "A first, pre-liminary insight into the results of phase 2a and phase 2b of the international reproducibility study is available as a <a href=\"https://www.marimo.io/\">Marimo notebook</a>, while the data itself lives in a Google BigQuery database. The code of the dashboard lives in the GitHub organisation as '<a href=\"https://github.com/rfb-data-hub/multi-institution-study-dashboard\">multi-institution-study-dashboard</a>' repository and every community member is invited to explore, analyze, and interact with it to get insights. If you want to take a look at the evaluated data, follow the link below and visit the dashboard.",
    url: "https://www.flowbatterydata.org/",
    host: "flowbatterydata.org",
    linkLabel: "Open the data dashboard",
    facts: [
      { v: "> 38", k: "Institutions" },
      { v: "> 55", k: "Datasets" },
      { v: "> 12 <span class=\"small\">mio.</span>", k: "Data rows" },
    ],
    note:
      "<b>Note:</b> Phase 1 of the study was published as O'Connor et al., Energy &amp; Environmental Science, 19, 3323–3344 (2026), DOI 10.1039/D5EE07103H.",
    image: {
      src: "assets/img/flowbatterydata_dashboard.jpg",
      alt: "The dashboard's home view: the study overview text on the left and a chart of the measured cell curves on the right",
      credit: "Screenshot: flowbatterydata.org",
      w: 1600,
      h: 1200,
    },
  },
};
