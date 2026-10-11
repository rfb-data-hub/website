/* ============================================================
   07a · Committee minutes — the one year menu above the rows filters
   which documents every committee rail holds (committees.html #minutes).
   Data: site-committees.js minutes[] via components/minutes-group.html;
   the scroller itself is pure CSS (17b-minutes.css, scroll-snap), the
   arrows are window.fbcRail from 07-rail.js.
   Filtering is section-wide, paging per row: one module holds both,
   never one container — the menu lives in the section head (authored
   in pages/committees.html), never inside a row's .minutes-ctrl.
   Entries are hidden, never removed; only [hidden] is toggled and no
   text is written (same rule as 07-repos.js). No-ops without a group.
   ============================================================ */
(function(){
  "use strict";
  var groups = document.querySelectorAll('.minutes-group');
  if (!groups.length) return;
  var year = document.querySelector('[data-minutes-year]');
  var rows = [];

  /* ---------- markup contract ----------
     [data-minutes-year] the optional section-wide menu (above the rows);
     .minutes-group one committee, holding [data-minutes-prev/-next],
     its [data-minutes] rail of .minute[data-minute-year] children and
     the [data-minutes-note] fallback. */

  Array.prototype.forEach.call(groups, function(group){
    var rail = group.querySelector('[data-minutes]');
    var prev = group.querySelector('[data-minutes-prev]');
    var next = group.querySelector('[data-minutes-next]');
    var note = group.querySelector('[data-minutes-note]');
    if (!prev || !next) return;

    /* 07-rail.js owns the arrows: the measured step, the [disabled] states and
       the listeners. A committee with no published minutes has no <ul> at all,
       and the helper leaves its two buttons present and dark. */
    var api = window.fbcRail(rail, { prev: prev, next: next, itemSel: 'li' });
    rows.push({ rail: rail, note: note, sync: api.sync });
  });

  if (!rows.length) return;

  /* ---------- the year menu ----------
     One choice for the whole section: every row applies it to its own rail and
     then re-checks its own arrows. An empty value means "All years". */
  function applyYear(){
    var want = year ? year.value : "";
    rows.forEach(function(row){
      if (!row.rail) { row.sync(); return; }   /* nothing published yet: the
                                                  static note already says so */
      var shown = 0;
      Array.prototype.forEach.call(row.rail.children, function(li){
        var off = !!want && li.getAttribute('data-minute-year') !== want;
        li.hidden = off;
        if (!off) shown++;
      });
      /* nothing in range: the note takes the rail's place, and because the note
         reserves the rail's height (17b-minutes.css) the row does not move */
      row.rail.hidden = shown === 0;
      if (row.note) row.note.hidden = shown !== 0;
      if (shown) row.rail.scrollLeft = 0;   /* the first match belongs at the left edge */
      row.sync();
    });
  }
  if (year) year.addEventListener('change', applyYear);

  applyYear();      /* honour a value the browser restored on reload/back-nav */
})();
