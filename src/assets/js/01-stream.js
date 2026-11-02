/* ============================================================
   01 · Charge bar + nav elevation + the electrolyte stream.

   Scroll-driven fill of the electrolyte stream: a parametric sine
   centreline x(y) = x₀ + A·sin(2πy/λ), rebuilt in real CSS px, its front
   paced ALONG THE TUBE (see onFrame) via the pathLength=100 dash trick.
   Also drives the #chargeBar scaleX and the nav's .scrolled elevation.
   Rebuilt by ResizeObserver; runs everywhere, no-ops on missing elements.
   Horizontally the tube belongs to the READING COLUMN, not to the viewport:
   see contentEdge() and GAP below.
   Couplings: markup in components/stream.html (paths, #streamGrad);
   NARROW ↔ the 960px media query in 04-stream.css, which also owns the
   stroke widths trackStroke() reads; 03-nav.css styles both nav states.
   ============================================================ */
(function(){
  "use strict";
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nav = document.getElementById('nav');

  /* ---------- elements ---------- */
  var bar   = document.getElementById('chargeBar');
  var fill  = document.getElementById('streamFill');
  var page  = document.querySelector('.page');
  var track = document.querySelector('.stream-track');
  var inner = document.querySelector('.stream-track-inner');
  /* the fill's vertical ramp; userSpaceOnUse — see components/stream.html */
  var grad  = document.getElementById('streamGrad');
  var hasStream = !!(fill && track && inner && page && page.getBoundingClientRect);

  /* ---------- constants ---------- */
  var LAMBDA = 1400;          // px per wave — constant regardless of page height
  var X0 = 100, AMP = 41;     // recomputed from page width in rebuild()
  /* Below this width the tube runs straight and the stream drops to half its
     stroke width. The media query in 04-stream.css must keep the same value:
     CSS cannot read this constant, so they are a pair by convention. */
  var NARROW = '(max-width:960px)';
  var mqNarrow = window.matchMedia ? matchMedia(NARROW) : null;
  /* px between the tube's outer edge and the reading column's text edge.
     35 px is not a taste value: it is the gap the viewport-relative formula
     below happens to produce at ~1500 px, i.e. on a 14" laptop. Anchoring the
     tube to the column at that same distance therefore moves nothing until
     past ~1510 px, where the margin starts emptying out. */
  var GAP = 35;
  /* How much of the tube is already full at scroll 0, in pathLength=100
     units; set in rebuild(). */
  var headFrac = 0;
  /* The tube's own length in CSS px (set in rebuild). The fill is measured
     against THIS, not against the document — see onFrame. */
  var tubeLen = 0;

  /* ---------- path building ---------- */
  var K = 2*Math.PI/LAMBDA;
  function X(y){ return X0 + AMP*Math.sin(K*y); }     // centerline
  function dX(y){ return AMP*K*Math.cos(K*y); }       // dx/dy

  /* One cubic per eighth of a period: Hermite→Bézier, exact position and slope
     at every joint, so the rendered path IS the mathematical curve (<0.04px). */
  function buildD(H){
    var d = 'M' + X(0).toFixed(2) + ' 0', q = LAMBDA/8;
    for (var ya = 0; ya < H; ya += q){
      var yb = Math.min(ya + q, H), dy = (yb - ya)/3;
      d += ' C' + (X(ya) + dX(ya)*dy).toFixed(2) + ' ' + (ya + dy).toFixed(2)
         + ' ' + (X(yb) - dX(yb)*dy).toFixed(2) + ' ' + (yb - dy).toFixed(2)
         + ' ' + X(yb).toFixed(2) + ' ' + yb.toFixed(2);
    }
    return d;
  }

  /* ---------- arc length ---------- */
  /* Arc-length table s(y), sampled every 2px: dashes run by arc length while
     the math runs by y, so any page-space y must invert this table (a sine's
     arc length has no elementary closed form). */
  var arcS = null, arcY = null, arcTotal = 0;
  function buildArc(H){
    var N = Math.max(2, Math.ceil(H/2));
    arcS = new Float64Array(N+1); arcY = new Float64Array(N+1);
    var px = X(0), py = 0, s = 0;
    for (var i = 1; i <= N; i++){
      var y = H*i/N, x = X(y);
      s += Math.hypot(x - px, y - py);
      arcS[i] = s; arcY[i] = y; px = x; py = y;
    }
    arcTotal = s;
  }
  /* The way back: how much of the tube (0..1) lies above a page-space y.
     arcY is strictly increasing, so the same bisection works inverted. */
  function fAtY(y){
    if (!arcS) return 0;
    var lo = 0, hi = arcY.length-1;
    if (y <= 0) return 0;
    if (y >= arcY[hi]) return 1;
    while (hi - lo > 1){ var mid = (lo+hi)>>1; if (arcY[mid] <= y) lo = mid; else hi = mid; }
    var dy = arcY[hi]-arcY[lo];
    var s = arcS[lo] + (dy > 0 ? (y-arcY[lo])/dy*(arcS[hi]-arcS[lo]) : 0);
    return s/arcTotal;
  }

  /* ---------- rebuild ---------- */
  /* The track is the widest of the three strokes, so it alone decides how far
     from the border a flush-left tube sits. Read from 04-stream.css so the
     stylesheet stays the single source of truth. */
  function trackStroke(){
    var w = track && window.getComputedStyle
          ? parseFloat(getComputedStyle(track).strokeWidth) : NaN;
    return (!isNaN(w) && w > 0) ? w : 30;
  }

  /* The reading column's text edge, in the path's own space (page-relative
     CSS px). .wrap is capped at 1160px by 02-base.css, so it is the element
     that CENTRES when the viewport grows — the viewport is not the reference
     the reader uses. The first .wrap inside main is the measure for every
     section on every page; its padding-inline sits inside its box, so the
     text edge is one padding further right than its border-box left. */
  function contentEdge(){
    var w = page.querySelector('main .wrap');
    if (!w || !window.getComputedStyle) return NaN;
    var pad = parseFloat(getComputedStyle(w).paddingLeft);
    return w.getBoundingClientRect().left - page.getBoundingClientRect().left
           + (isNaN(pad) ? 0 : pad);
  }

  function rebuild(){
    if (!hasStream) return;
    var W = page.offsetWidth || 1, H = page.offsetHeight || 1;
    var edge = contentEdge();
    /* the tube ends inside the footer's wave: the +12 buries its cap under
       components/wave-top.html, which components/footer.html renders first. */
    var foot = document.querySelector('footer');
    var Hs = Math.max(300, H - (foot ? foot.offsetHeight : 0) + 12);
    /* the gradient spans the tube's real length, in the path's own CSS px */
    if (grad) grad.setAttribute('y2', Hs.toFixed(2));
    if (mqNarrow && mqNarrow.matches){
      /* straight, flush left: AMP=0 makes the sine a vertical line, and starting at
         half the widest stroke puts its outer edge on x=0 — zero gap, nothing clipped. */
      AMP = 0;
      X0  = trackStroke() / 2;
    } else {
      AMP = Math.max(12, Math.min(41, W*0.0375));      // the 41 cap keeps the swing narrow
      /* Two references, the better (larger) one wins:
         · legacy — viewport-relative, capped at 130: the tube rides the left
           margin while the column still fills most of the window;
         · anchored — column-relative, uncapped: the centreline that puts the
           swing's OUTER edge GAP from the text. Above ~1510 px the centred
           column leaves a dead margin and the legacy cap strands the tube
           there, so from there on the tube follows the text it belongs to.
           The legacy term is what keeps every laptop width pixel-identical. */
      var legacy = Math.max(26, Math.min(130, W*0.085 - 20));
      X0  = isNaN(edge) ? legacy
                        : Math.max(legacy, edge - GAP - AMP - trackStroke()/2);
    }
    var d = buildD(Hs);
    track.setAttribute('d', d);
    fill.setAttribute('d', d);
    inner.setAttribute('d', d);
    /* Publish the tube's centreline for the one layer that aligns to it
       instead of measuring it: the hero's corner glow (05-hero.css). It has
       to come from here — CSS re-deriving the column's edge from 100vw would
       count the scrollbar, which the tube (and therefore this) does not. */
    document.documentElement.style.setProperty('--stream-x', X0.toFixed(1) + 'px');
    tubeLen = Hs;
    buildArc(Hs);
    /* Fill at scroll 0 = mid-height of the h1's first line: the tube starts
       off-screen at y=0, so all of it above that point is already full. */
    var h1 = page.querySelector('h1');
    var yFront;
    if (h1){
      var cs = window.getComputedStyle ? getComputedStyle(h1) : null;
      var lh = cs ? parseFloat(cs.lineHeight) : NaN;      // used value, in px
      if (!lh || isNaN(lh)) lh = cs ? parseFloat(cs.fontSize)*1.2 : 24;
      yFront = h1.getBoundingClientRect().top + window.scrollY + lh/2;
    } else {
      yFront = nav ? nav.offsetHeight + 6 : 70;
    }
    headFrac = Math.max(0, Math.min(25, fAtY(yFront)*100));
    onFrame();
  }

  /* ---------- scroll measurement + pacing ---------- */
  var ticking = false;
  function onFrame(){
    ticking = false;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var pDoc = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;

    /* the two nav affordances styled by 03-nav.css: #chargeBar's scaleX
       fill and the nav.scrolled elevation */
    if (bar) bar.style.transform = 'scaleX(' + pDoc + ')';
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);

    if (!hasStream) return;
    if (reduced){
      fill.style.strokeDashoffset = 0;
      return;
    }
    /* The front travels the TUBE, not the document (docs/authoring.md §4): the tube
       ends footerHeight−12 px above the document bottom; document pacing drifts off. */
    /* innerHeight read live: a collapsing mobile URL bar changes it without
       changing the page height, so no rebuild fires. */
    var range = Math.max(1, tubeLen - window.innerHeight);
    var pTube = Math.min(1, Math.max(0, window.scrollY / range));
    /* pathLength=100 → the front is one fraction of the tube */
    var f = headFrac + pTube*(100 - headFrac);
    fill.style.strokeDashoffset = 100 - f;
  }
  function requestFrame(){ if(!ticking){ ticking = true; requestAnimationFrame(onFrame); } }

  /* ---------- boot + resize handling ---------- */
  if (reduced && fill) fill.style.strokeDashoffset = 0;
  window.addEventListener('scroll', requestFrame, {passive:true});
  if (hasStream){
    if ('ResizeObserver' in window){
      new ResizeObserver(rebuild).observe(page);  // content growth AND font swaps
    } else {
      window.addEventListener('resize', rebuild, {passive:true});
    }
    /* Crossing NARROW changes the shape, not the page width: the
       ResizeObserver would normally fire anyway, this is the cheap guarantee. */
    if (mqNarrow){
      if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', rebuild);
      else if (mqNarrow.addListener) mqNarrow.addListener(rebuild);   // Safari <14
    }
    rebuild();
  } else {
    onFrame();
  }
})();
