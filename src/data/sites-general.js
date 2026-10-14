/* ============================================================
   sites-general.js — the content EVERY page loads: the menu (build.js
   → prepareData folds it into the footer's link columns too), the two
   external homes, the six resource categories, the platform rows, the
   join card, the footer's prose; values may carry inline HTML.
   Scope rule: build.js → loadData() loads `site-<page>.js` for that
   page only, every other data file — this one and icons.js — on every
   page; loadData's collision and split-load guards stop the build.
   Rules: hrefs are RELATIVE (served from /<repo>/), a leading "#" is a
   home-page anchor rewritten to "index.html#…" on sub-pages, delay =
   reveal stagger in ms (02-reveal.js), iconKey → icons.js.
      ============================================================ */
"use strict";

/* The two external homes of the commons, named once: the org, the invite code
   and the excluded repository are the ONLY literals here, the two URLs are
   built from them. build.js passes all three keys to the layout, where they
   land on <body> as data-github-org / data-discord-invite /
   data-github-exclude for 05-community.js and 07-repos.js to read
   (docs/authoring.md §5). */
const GITHUB_ORG = "rfb-data-hub";
const DISCORD_INVITE = "SgTcQcfSgn";
/* Repositories the live counters must not count. The org's profile repo
   (.github) carries GitHub topics but is not something a member browses, so
   it is left out of the resources list AND out of the home readout's
   repository figure — one literal, so the two pages can never disagree.
   Consumers: data-repos-exclude (07-repos.js) and data-github-exclude
   (05-community.js), both rendered by layout.html from the key below. */
const GITHUB_EXCLUDE = ".github";
const DISCORD_URL = "https://discord.gg/" + DISCORD_INVITE;
const GITHUB_URL = "https://github.com/" + GITHUB_ORG;

module.exports = {
  /* ---------- navigation — and with it the footer ----------
     Three grouped menus (markup: components/nav.html, styles:
     03a-navmenu.css, behaviour: 03-navmenu.js). A parent's href is where
     clicking the parent goes — it must be the group's landing target, not
     "#"; children are plain { label, href }. The parent link doubles as the
     disclosure trigger on touch devices. An href naming the page being built
     collapses to an in-page anchor (build.js → prepareData: a bare
     "committees.html" → "#top" there, "…html#minutes" → "#minutes").
     • Home       = the index page: parent → top, children = its sections
     • Committees = the committees page, one child per committee row
       (ids authored in committees[] in site-committees.js) plus the minutes band
     • Digital Resources = the resources page (resources.html): the parent link
       stays the GitHub organisation (where the resources actually live),
       the children are the dashboard band first (#dashboard, markup
       components/dash-spot.html), then the six category anchors
       (#cat-<topic>, markup components/repo-group.html — one group per
       category is always rendered, so the anchor exists whatever GitHub
       has filed there) — the same six categories the home #categories
       cards show, from `categories` in this file

     THIS IS ALSO THE FOOTER'S LINK LIST. build.js → prepareData folds the
     same groups into footerCols (markup: components/footer.html), so the
     menu and the footer cannot disagree and a new page is added in exactly
     one place. Consequences worth remembering:
     • a group with no children would give the footer a one-line column,
       and a child appears in BOTH renderings — so no group lists its own
       landing page among its children. The footer prints that page once, as
       the column's first row (worded with footLabel); the menu reaches it
       through the parent link;
     • footLabel = the words build.js → prepareData prints for the group's
       landing link in components/footer.html.
       The column heading is already the group name, so repeating it as the
       first row reads like a bug ("Committees" / "Committees"). It defaults
       to label, so it is only written where the default reads badly. */
  nav: [
    {
      label: "Home",
      href: "#top",
      footLabel: "Overview",
      children: [
        { label: "Why a digital commons", href: "#mission" },
        { label: "Where to find us", href: "#platforms" },
        { label: "Community resources", href: "#categories" },
        { label: "News & events", href: "#news" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      label: "Committees",
      href: "committees.html",
      footLabel: "Overview",
      children: [
        { label: "Community Committee (CC)", href: "committees.html#committee-community" },
        { label: "Data Infrastructure Committee (DIC)", href: "committees.html#committee-data-infrastructure" },
        { label: "Flow Battery Research Committee (FBR)", href: "committees.html#committee-research" },
        { label: "Committee minutes", href: "committees.html#minutes" },
      ],
    },
    {
      label: "Digital Resources",
      href: "resources.html",
      footLabel: "Overview",
      /* children marked soon:true are NOT rendered as links: nav.html and
         footer.html swap the anchor for a plain span + "soon" pill (styles
         in 03a-navmenu.css). Their hrefs stay authored so re-launching a
         resource is just deleting its soon flag. */
      children: [
        { label: "Datasets", href: "resources.html#cat-dataset" },
        { label: "Open Hardware", href: "resources.html#cat-hardware" },
        { label: "Living Documents", href: "resources.html#cat-living-document" },
        { label: "Learning", href: "resources.html#cat-education" },
        { label: "Event Materials", href: "resources.html#cat-events" },
        { label: "Software Tools", href: "resources.html#cat-tools" },
        { label: "Reproducibility Dashboard", href: "resources.html#dashboard" },
      ],
    },
  ],

  /* ---------- external homes of the commons ----------
     The canonical pair, for anything that needs one of the two URLs without
     being one of the rows below (the values come from the consts at the top
     of this file). */
  discordUrl: DISCORD_URL,


  githubUrl: GITHUB_URL,

  /* the bare pair, for the <body> dataset the live-counter scripts read */
  githubOrg: GITHUB_ORG,


  discordInvite: DISCORD_INVITE,

  /* comma list, riding the same <body> route as the pair above: which
     repositories the live figures must not count, so the rule is authored in
     data and never typed into a script */
  githubExclude: GITHUB_EXCLUDE,

  /* ---------- home · Community resources (#categories) ----------
     ONE array, three renderings. The home page draws it as cards
     (components/category-card.html, 10b-categories.css); resources.html draws the same
     items as the category band (components/repo-cat.html) and as one group
     of the live repository list (components/repo-group.html, whose id
     `cat-<topic>` is the nav/footer href target) — styles 17a-repos.css,
     behaviour 07-repos.js. A category therefore cannot be renamed in one
     place only.

     `topic` is the contract with GitHub, not a label: 07-repos.js files a
     repository under a category when the repository's GitHub topics contain
     that exact string (lowercase, hyphenated — GitHub's own syntax). A repo
     may sit in several categories. Nothing here is pushed to GitHub, so a category
     fills up only when someone adds the topic in the organisation
     (repo → About → Topics); renaming one side without the other empties
     the category.

     `href` is the tile's link target (resources.html, which renders these
     same items). `ghSearch` is the org topic search behind the group's
     "Explore on GitHub" escape hatch, derived after the array from topic +
     GITHUB_ORG; `type=repositories` and `fork:true` are load-bearing — without
     the first the page reports "0 results" over real rows, and GitHub hides
     forks from search by default while 07-repos.js lists them.

     iconKey must stay distinguishable from the others at 24px. */
  categories: [
    {
      href: "resources.html",
      topic: "dataset",
      iconKey: "vault",
      title: "Datasets",
      desc: "Public datasets from publications are becoming more and more common as FAIR (Findable, Accessible, Interoperable, Reusable) principles are adopted. They enable meta studies and a better understanding of broader trends in flow battery research. We encourage members to (re)share their datasets here at this central place to make them more findable.",
      cta: "Explore the digital resources",
      delay: 0,
    },
    {
      href: "resources.html",
      topic: "hardware",
      iconKey: "chip",
      title: "Open Hardware",
      desc: "With the cost-efficient access to microcontrollers and 3D printing, more researchers can build custom hardware for their experiments. We encourage your to share your open hardware designs with the community. From 3D-printed flow cells over sensors to custom-built test racks – every contribution might help another researcher or lab advance their work.",
      cta: "Explore the digital resources",
      delay: 80,
    },
    {
      href: "resources.html",
      topic: "living-document",
      iconKey: "branch",
      title: "Living Documents",
      desc: "Documents that continuously evolve with our collective understanding of this interdisciplinary field. Such documents are updated in a version-controlled, open peer-review and aim at capturing best practices in experimentation and data reporting.",
      cta: "Explore the digital resources",
      delay: 160,
    },
    {
      href: "resources.html",
      topic: "education",
      iconKey: "cap",
      title: "Learning",
      desc: "Important teaching document, tutorials, and educational resources for members to learn and advance their skills in flow battery research. Feel free to share any material that helped you to expand your knowledge and expertise.",
      cta: "Explore the digital resources",
      delay: 0,
    },
    {
      href: "resources.html",
      topic: "events",
      iconKey: "calendar",
      title: "Event Materials",
      desc: "Tangible outcomes, protocols, documents, presentation slides, and other digital resources from past events, workshops, and community gatherings related to flow battery research. It may contain everything event organizers and participants are willing to share with the community.",
      cta: "Explore the digital resources",
      delay: 80,
    },
    {
      href: "resources.html",
      topic: "tools",
      iconKey: "code",
      title: "Software Tools",
      desc: "From open-source simulation software to data analysis scripts: Digital tools that foster theoretical understanding and accelerate data exploration can significantly enhance the research capabilities of the community.",
      cta: "Explore the digital resources",
      delay: 160,
    },
  ].map((c) => Object.assign({}, c, {
    ghSearch: "https://github.com/search?q=org%3A" + GITHUB_ORG + "+topic%3A" + c.topic + "+fork%3Atrue&type=repositories",
  })),

  /* ---------- home · "Where to find us": the two platforms ----------
     Two open rows, no cards (components/platform-row.html, 10a-platforms.css).
     Order matters: Discord first. Which side the mark sits on and which
     way the row reveals come from CSS via the `cls` brand key — never
     author them here.
     meta may contain HTML — 05-community.js replaces the numbers inside
     the [data-live] spans; the written values are the no-JS fallback.
     name + href double as the footer's last column ("Connect"), so the two
     external homes are spelled once: change a URL here and the platform rows
     and the footer move together. */
  platforms: [
    {
      cls: "dc",
      iconKey: "discordBrand",
      name: "Discord Server",
      href: DISCORD_URL,
      desc: "This is where the community talks: ask questions about practical issues, discuss best practices, share experiences and recent insights, and stay updated on the latest news. It's also where the committees coordinate their work.",
      meta: '<span data-live="discord:members">92</span> members · <span data-live="discord:online">9</span> online now',
      cta: "Join the Discord Server",
      delay: 0,
    },
    {
      cls: "gh",
      iconKey: "githubBrand",
      name: "GitHub Organisation",
      href: GITHUB_URL,
      desc: "This is where the community keeps and shares its digital resources: repositories for datasets, living documents, cell designs, software tools – and this website. Issues and pull requests from any community member are welcome!",
      meta: '<span data-live="github:repos">7</span> repositories · <span data-live="github:followers">8</span> followers',
      cta: "Join the GitHub Organisation",
      delay: 120,
    },
  ],

  /* ---------- join card (every page) ----------
     Markup: components/join-card.html, buttons: components/join-btns.html. */
  join: {
    eyebrow: "How to join this online community",
    title: "Join the commons",
    text: "The community uses two online platforms: A Discord server is where the commons talks (e.g. questions, building cooperations, event planning, regular meetings). A GitHub organisation is where our data and resources live.",
    discordLabel: "Commons Discord",
    discordUrl: DISCORD_URL,
    githubLabel: "Commons Data Hub",
    githubUrl: GITHUB_URL,
    note: "Feel free to join either or both.",
  },

  /* ---------- footer ----------
     Markup: components/footer.html. The link COLUMNS are not authored here:
     build.js → prepareData derives them from nav (one column per menu group)
     plus the two external homes in platforms[] above, so the footer always
     offers exactly the pages the menu offers. What is authored here is the
     footer's own prose and the heading over that last, non-menu column
     (footerConnectTitle, read by prepareData). */
  footerBlurb:
    "An open online community for flow battery researchers to facilitate communication, knowledge exchange, and resource sharing.",


  footerLicence:
    "Content <b>CC BY-SA 4.0</b>",


  footerConnectTitle: "Connect",
};
