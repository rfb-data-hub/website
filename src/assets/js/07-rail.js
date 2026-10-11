/* ============================================================
   07 · Rail — the arrow wiring shared by the site's horizontal
   scrollers: window.fbcRail(listEl, { prev, next, itemSel }) → { sync }.
   Called by 07-repos.js and 07a-minutes.js, which filename order
   concatenates after this definition. Layout and arrow chrome live in
   17-rail.css; the markup is components/repo-group.html (resources)
   and components/minutes-group.html (committees). Scrolling itself is
   native (overflow + scroll-snap); this module only pages by exactly
   one item and keeps the arrows' [disabled] state honest.
   ============================================================ */
(function(){
  "use strict";

  window.fbcRail = function(listEl, opts){
    var prev = opts && opts.prev;
    var next = opts && opts.next;
    var itemSel = (opts && opts.itemSel) || 'li';
    /* read here so callers with their own reasons need not pass it in */
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- arrow states ----------
       The arrows are always rendered — buttons that come and go make the
       head line jump — so only their [disabled] state moves: both dark
       when there is nothing to page, one dark at each end. A null listEl
       (a committee with no published minutes) still gets two dark ones. */
    function dark(){
      if (prev) prev.disabled = true;
      if (next) next.disabled = true;
    }

    /* The paging step is MEASURED from the first visible item plus the
       rail's own column gap: the item width alone would drift a gap
       short every page and leave the next item hanging over the edge.
       Measured, so retuning --repo-w, --minute-w or the gap in CSS
       cannot desync the arrows from the layout. */
    function step(){
      if (!listEl) return 1;
      var first = listEl.querySelector(itemSel + ':not([hidden])');
      var w = first ? first.getBoundingClientRect().width : 0;
      if (!w) return listEl.clientWidth || 1;
      var cs = getComputedStyle(listEl);
      return w + (parseFloat(cs.columnGap || cs.gap) || 0);
    }

    function sync(){
      if (!listEl) { dark(); return; }
      var max = listEl.scrollWidth - listEl.clientWidth;
      if (max <= 1) { dark(); return; }   /* every item already visible, or none */
      var x = listEl.scrollLeft;
      if (prev) prev.disabled = x <= 1;   /* 1px: sub-pixel scroll offsets */
      if (next) next.disabled = x >= max - 1;
    }

    function go(dir){
      if (!listEl) return;
      listEl.scrollBy({ left: dir * step(), behavior: reduced ? 'auto' : 'smooth' });
    }

    if (prev) prev.addEventListener('click', function(){ go(-1); });
    if (next) next.addEventListener('click', function(){ go(1); });

    if (listEl) {
      var raf = 0;
      listEl.addEventListener('scroll', function(){
        if (raf) return;                  /* one sync per frame, not per pixel */
        raf = requestAnimationFrame(function(){ raf = 0; sync(); });
      }, { passive: true });

      if ('ResizeObserver' in window) new ResizeObserver(sync).observe(listEl);
      else window.addEventListener('resize', sync);

      window.addEventListener('load', sync);   /* web fonts change the widths */
    }

    sync();
    return { sync: sync };
  };
})();
