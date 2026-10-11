/* ============================================================
   site-index.js — the content of the HOME page (src/pages/index.html):
   the four aims, the live readout strip, the FAQ and the News & Events
   deck; the news items live here too — this is the file you edit when
   something happens in the commons.

   Page-scoped: build.js → loadData() loads a `site-<page>.js` file for
   that one page only; what committees.html or resources.html read
   belongs in sites-general.js. The scope cannot drift quietly: a key
   two pages need either collides (two files define it — the build
   stops) or is missing where it is used ({{var}} and {{#each}} fail it).
   ============================================================ */
"use strict";

module.exports = {

  /* ---------- communityStats — live readout strip under the hero ----------
     Plain display figures, deliberately not links: markup
     components/readout-item.html · styles 12a-proof.css. live = the data-live
     key 05-community.js fills, value its no-JS fallback; iconKey names an
     icon in icons.js; delay = the reveal stagger 02-reveal.js reads; cls =
     dc/gh, the mark-colour mapping lives in 12a-proof.css / 10a-platforms.css. */
  communityStats: [
    { cls: "dc", iconKey: "discordBrand", live: "discord:members", value: "92", label: "Members", delay: 0 },
    { cls: "dc", iconKey: "discordBrand", live: "discord:online", value: "9", label: "Online now", delay: 80 },
    { cls: "gh", iconKey: "githubBrand", live: "github:repos", value: "7", label: "Repositories", delay: 160 },
    { cls: "gh", iconKey: "githubBrand", live: "github:followers", value: "8", label: "Followers", delay: 240 },
  ],



  /* ---------- aimItems — "Why a digital commons?": the four aims ----------
     num = ordinal, title = the aim, gloss = the one-line promise, desc =
     two sentences of substance, delay = the reveal stagger in ms, read by
     02-reveal.js. Markup: components/aim-item.html · styles: 09a-aims.css. */
  aimItems: [
    {
      num: "01",
      title: "Connection",
      gloss: "Getting in contact.",
      desc: "Lower the hurdles to connect to research peers across countries, institutions, and experience levels. It's the first step toward building professional relationships that can lead to fruitful collaborations or even joint projects. It may also help to stay in contact after conferences and meetings.",
      delay: 0,
    },
    {
      num: "02",
      title: "Exchange",
      gloss: "Sharing resources.",
      desc: "Academic research communities consist of swiftly changing groups of individuals. Not all knowledge can be captured in publications or protocols. Providing a place to ask questions and share resources ensures that valuable experiences and tools are not lost as people move along their career paths.",
      delay: 80,
    },
    {
      num: "03",
      title: "Cooperation",
      gloss: "Finding collaborators.",
      desc: "Sometimes you need one specific expertise or piece of equipment that your own lab lacks. An online channel helps you find collaborators for your research projects and experiments, enabling joint efforts that single labs could not accomplish alone.",
      delay: 160,
    },
    {
      num: "04",
      title: "Harmonization",
      gloss: "Improving reproducibility.",
      desc: "Repeatability, reproducibility, and replicability in flow battery research needs to be improved. By a community-driven approach, we can develop best practices in experimentation and data reporting to ensure that results are comparable across different labs.",
      delay: 240,
    },
  ],



  /* ---------- faq — the FAQ accordion ----------
     One entry per row: q = the question on the summary line, a = the answer
     (inline <b>/<a> allowed), delay = the reveal stagger in ms (02-reveal.js).
     Markup: components/faq-item.html (native <details>, no toggle script) ·
     styles: 20-faq.css · the affordance is the `plus` icon from icons.js. */
  faq: [
    {
      q: "Who can join the commons?",
      a: "Anyone working on flow batteries: academics, engineers, students, professors, and industry people willing to share knowledge. Everyone is welcome as long as they are respectful and interested in flow batteries.",
      delay: 0,
    },
    {
      q: "Who is in charge of this online community?",
      a: "The community was kicked off as part of the international reproducibility study led by researchers from Queen's University Belfast (QUB) and Massachusetts Institute of Technology (MIT). The study and the online community is now coordinated via several voluntary committees: the Community Committee, the Data Infrastructure Committee, and the Research Committee. The Flow Battery Commons is not a legal entity and operates based on the collective efforts of its members.",
      delay: 60,
    },
    {
      q: "I'm an undergraduate just starting out — is this a place for me or am I too inexperienced?",
      a: "This place is exactly for you! The community welcomes members at all stages of their careers, from undergraduates who are just learning what a flow battery is to seasoned researchers and industry professionals. Don't hesitate to ask questions – everyone in the community started at the stage you are now.",
      delay: 120,
    },
    {
      q: "I have a question regarding experimental practices. Where should I ask it?",
      a: "That's simple: Just join the community Discord and ask your question in the appropriate channel. The <b>#forums</b> channel is a good place to start. But don't worry – you can basically ask in any channel and someone will guide you to the right place.",
      delay: 180,
    },
    {
      q: "Who can join a committee and how does one do it?",
      a: "Committee membership is completely voluntary and open to all community members who are interested in contributing. To join a committee, send a message to the <b>#general</b> channel or <a href='committees.html'>directly contact the committee chairs</a>. You will then be added to the committee channel and the mailing list so that you can participate in discussions and stay updated on committee activities.",
      delay: 240,
    },
    {
      q: "What's the benefit of a GitHub organization? I can store my data in my own GitHub account.",
      a: "A GitHub organization provides a central home for the community's shared resources such as datasets, code, tools, and documentation. While you can absolutely store all this in your own GitHub account, using an organization repository ensures that the resources are easily findable. Community members simply can come here and explore a single place to find all relevant materials.",
      delay: 300,
    },
  ],



  /* ---------- newsEyebrow — the News & Events band head ----------
     The band's heading is this small label only — the slides carry their
     own titles. Printed straight into index.html #news (h2.eyebrow, styled
     by 11a-news.css); no component partial, no JS reads it. */
  newsEyebrow: "News & Events",

  /* ---------- news[] — one entry per slide, newest first ----------
     To add an item, copy a block and change the fields:

       id          unique, lowercase — becomes the slide's anchor id
       tag         one short word for the corner label (Workshop, Event…)
       dateLabel   the date as you want it printed
       place       where it happened / where it happens
       title       headline, plain text (no HTML)
       lede        1–3 sentences of body copy; inline <b> is allowed
       href        link for the "read more" button; relative for internal
                   pages, full URL for external ones (Discord/GitHub)
       linkLabel   text of that button
       blank       true for external links (opens in a new tab)

     An entry may carry an `image`, and it is a BACKDROP, not a box: it
     bleeds in from the right edge of the band and fades into the dark, so
     it never decides the band's height and is switched off below 960px. It
     is cropped to cover, centred slightly above the middle, and only the
     right ~46% of the viewport is ever visible — read the .news-photo notes
     in 11a-news.css before choosing a picture.

       image.src    relative (the site is served from /<repo>/); put the file
                    in src/assets/img/ and the builder copies it
       image.alt    what the picture shows (a real <img>, so it needs one)
       image.credit the small line in the picture's bottom-right corner — keep
                    it if the licence asks for an attribution
       image.w/.h   the file's real pixel size (written into width/height)

     Order = slide order, newest first; the deck and its dots size themselves
     from this array. All slides share one grid cell, so the longest lede sets
     the height of every slide — keep them concise.

     Markup: components/news-slide.html · styles: 11a-news.css · behaviour:
     04-news.js, whose controls are components/deck-ctrl.html. Without JS the
     slides read as a plain list. */
  news: [
    {
      id: "replicability-challenges-paper",
      tag: "Publication",
      dateLabel: "April 2026",
      place: "Energy & Environmental Science, 19, 3323–3344; DOI: 10.1039/D5EE07103H",
      title: "Replicability challenges in redox flow cell testing",
      lede:
        "O'Connor et al. report the results of phase 1 of an international replicability study: a round-robin test in which eight participant groups from seven academic institutions measured the same model flow cell — identical hardware, a well-studied electrolyte, a symmetric cell configuration and the same experimental prompts. Charge–discharge profiles, polarisation curves and Nyquist plots nevertheless differed appreciably between the participating groups. The authors conclude that differences in protocol and data acquisition alone have a clear and non-negligible effect on reported performance metrics, while noting that the number of experiments performed does not yet support attribution to specific causes, and argue for shared protocols, documented standard operating procedures and greater methodological transparency. The paper is published open access under CC BY 4.0.",
      href: "https://doi.org/10.1039/D5EE07103H",
      linkLabel: "Read the paper",
      blank: true,
      image: {
        src: "assets/img/replicability_paper.png",
        alt: "The first page of the paper, with its title, abstract and a figure",
        credit: "Screenshot of Paper © RSC, CC BY 4.0",
        w: 1240,
        h: 1754,
      },
    },
    {
      id: "qub-reproducibility-workshop",
      tag: "Workshop",
      dateLabel: "March 2026",
      place: "Queen's University Belfast",
      title: "First Flow Battery Reproducibility Workshop",
      lede:
        "Invited by Josh Bailey and Hugh O'Connor, flow battery researchers from across the globe met at Queen's University Belfast for two days on data reproducibility. The opening day introduced the community's new data infrastructure and its dashboard, alongside sessions from the Physical Sciences Data Infrastructure (PSDI) and the Digital Curation Centre on tools and data curation, and keynotes by Johan Hjelm (DTU) and Jiří Vrána (Pinflow Energy Storage). The second day's four sessions reflected on the interlaboratory studies: shared cell kits, experimental asks, metadata collection and possible follow-on studies. A third phase was sketched around new opportunities for students, refined round-robin experiments and an annual summer school for flow battery assembly and testing. The workshop was funded by PSDI and sponsored by SciMed Ltd and the Royal Society of Chemistry Surface Reactivity and Catalysis Group.",
      href: "https://www.flowbatterydata.org/",
      linkLabel: "Open the dashboard",
      blank: true,
      image: {
        src: "assets/img/qub_workshop_group_photo.jpg",
        alt: "The workshop participants gathered on the staircase of the meeting venue",
        credit: "Photo © Queen's University Belfast",
        w: 1066,
        h: 1599,
      },
    },
  ],
};
