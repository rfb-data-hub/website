/* ============================================================
   icons.js — inline SVG markup, one canonical copy per mark; like
   sites-general.js a general data file, loaded on every page.
   · card icons (stroke `paths` + the two fill brand marks) — chosen
     by the `iconKey` field of categories[]/platforms[] (sites-general.js)
     and communityStats[] (site-index.js); the builder resolves the key
     to markup and inserts it raw into the card.
   · small marks (arrowGo, chevronL/R, externalGo, caret, bars, doc,
     plus) — one 24-grid svg each, used straight from a template as
     {{icons.arrowGo}} (pattern: components/join-btns.html); they carry
     no width/height — per-instance size and stroke-weight live in CSS.
   ============================================================ */
"use strict";

const OPEN =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const paths = {
  vault:
    '<ellipse cx="12" cy="5" rx="8" ry="2.6"/><path d="M4 5v14c0 1.4 3.6 2.6 8 2.6s8-1.2 8-2.6V5"/><path d="M4 12c2.7 1.4 5.3 1.4 8 0s5.3-1.4 8 0"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 11h18"/><path d="M13 14l-2 3h3l-2 3"/>',

  /* ---------- category-card glyphs (categories[].iconKey) ----------
     chip vs. code vs. branch must stay distinguishable at 24px. */
  chip: /* microcontroller — open hardware */
    '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  branch: /* git branch — living, version-controlled documents */
    '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  cap: /* mortarboard — learning */
    '<path d="M12 7L2 10.5l10 3.5 10-3.5L12 7z"/><path d="M6.5 12.6v3.4c0 1.5 2.5 2.7 5.5 2.7s5.5-1.2 5.5-2.7v-3.4"/><path d="M21.5 10.5v5"/>',
  code: /* </> — software tools and scripts */
    '<path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 6l-3 12"/>',
};

const icons = {};
for (const key of Object.keys(paths)) icons[key] = OPEN + paths[key] + "</svg>";

/* Small stroke marks. The 2.4 weight is the family's default; an instance
   that wants a different one says so in its own CSS file (stroke-width is a
   presentation attribute, so any CSS rule outranks it). */
const OPEN_MARKS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const marks = {
  arrowGo: /* the CTA nudge — cards, platforms, news, dashboards */
    '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronL: '<path d="M15 5l-7 7 7 7"/>',
  chevronR: '<path d="M9 5l7 7-7 7"/>',
  externalGo: /* leaves this site / opens the file */
    '<path d="M7 17L17 7M9 7h8v8"/>',
  caret: /* disclosure + select affordance */
    '<path d="M6 9l6 6 6-6"/>',
  bars: /* the hamburger */
    '<path d="M4 7h16M4 12h16M4 17h16"/>',
  doc: /* a minutes document — the shelf glyph */
    '<path d="M6.6 2.7h6.6l4.5 4.5v12.3a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 19.5V4.3a1.6 1.6 0 0 1 1.6-1.6z"/>' +
    '<path d="M13.2 2.7v3.1a1.5 1.5 0 0 0 1.5 1.5h3.1"/>' +
    '<path d="M8.4 11.9h7.2M8.4 14.8h7.2M8.4 17.7h4.3"/>',
  plus: /* FAQ affordance: the circle is the static target, only the plus turns */
    '<circle cx="12" cy="12" r="11"/><path d="M12 7.5v9M7.5 12h9"/>',
};

for (const key of Object.keys(marks)) icons[key] = OPEN_MARKS + marks[key] + "</svg>";

/* Brand marks (fill style, from simple-icons, CC0). */
icons.githubBrand = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
icons.discordBrand = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>';

module.exports = { icons };
