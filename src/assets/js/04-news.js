/* ============================================================
   04 · News deck — steps the home page's News & events band one slide
   at a time: arrows, dots, arrow keys, optional autoplay; deferred in
   app.js, so it runs on every page and no-ops where no deck renders.
   Slides: components/news-slide.html, one per item of the `news` array
   in src/data/site-index.js; controls: components/deck-ctrl.html, whose
   `[data-news-prev]`/`[data-news-next]`/`[data-news-go="<n>"]` are its
   hooks; `data-autoplay="ms"` is on the deck in src/pages/index.html.
   11a-news.css styles `.is-ready`, `.is-active` and the dot's
   `[aria-current]` and hides `.news-ctrl` unless src/layout.html sets
   `html.js`; `.is-ready` is added last, so no-JS keeps the plain list.
   ============================================================ */
(function(){
  "use strict";
  /* ---------- state and boot guard ----------
     The motion preference is read once for all decks; a page without a
     deck exits before any listener is installed. */
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var decks = document.querySelectorAll('[data-news]');
  if (!decks.length) return;

  /* ---------- per deck: refs, then the one-slide guard ---------- */
  Array.prototype.forEach.call(decks, function(deck){
    var stage  = deck.querySelector('.news-stage');
    var slides = deck.querySelectorAll('.news-slide');
    var ctrl   = deck.querySelector('.news-ctrl');

    if (!stage || slides.length < 2) {
      /* one item is not a deck: no paging, so no control row */
      if (ctrl && ctrl.parentNode) ctrl.parentNode.removeChild(ctrl);
      return;
    }

    var dots     = deck.querySelectorAll('[data-news-go]');
    var delay    = parseInt(deck.getAttribute('data-autoplay'), 10) || 0;

    var i = 0, paused = false, inView = true, touched = false;

    /* ---------- the shown slide ----------
       One index drives both halves of the state 11a-news.css reads —
       `.is-active` on the slide, `[aria-current]` on its dot — so they
       cannot disagree. It wraps, so prev from the first lands on the
       last. */
    function go(n, byUser){
      i = (n + slides.length) % slides.length;
      Array.prototype.forEach.call(slides, function(s, k){
        if (k === i) s.classList.add('is-active'); else s.classList.remove('is-active');
      });
      Array.prototype.forEach.call(dots, function(d, k){
        if (k === i) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      if (byUser) touched = true;      /* manual paging stops autoplay */
    }

    /* ---------- controls ----------
       Arrows and dots call the same go(); the key handler sits on the deck
       so arrow keys work wherever focus is inside it, and it takes the
       event only for the two keys it acts on. */
    var prev = deck.querySelector('[data-news-prev]');
    var next = deck.querySelector('[data-news-next]');
    if (prev) prev.addEventListener('click', function(){ go(i - 1, true); });
    if (next) next.addEventListener('click', function(){ go(i + 1, true); });
    Array.prototype.forEach.call(dots, function(d){
      d.addEventListener('click', function(){
        go(parseInt(d.getAttribute('data-news-go'), 10) || 0, true);
      });
    });
    deck.addEventListener('keydown', function(e){
      if (e.key === 'ArrowLeft')  { go(i - 1, true); e.preventDefault(); }
      if (e.key === 'ArrowRight') { go(i + 1, true); e.preventDefault(); }
    });

    /* ---------- autoplay gates ----------
       The tick is skipped unless every gate is open: not hovered or
       focused, on screen, tab visible, delay set, motion allowed. A timer
       is never cleared — each tick re-reads the conditions instead. */
    ['mouseenter', 'focusin'].forEach(function(ev){
      deck.addEventListener(ev, function(){ paused = true; });
    });
    ['mouseleave', 'focusout'].forEach(function(ev){
      deck.addEventListener(ev, function(){ paused = false; });
    });
    if ('IntersectionObserver' in window) {
      inView = false;
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ inView = e.isIntersecting; });
      }, { threshold: 0.35 }).observe(deck);
    }
    if (delay && !reduced) {
      setInterval(function(){
        if (!paused && !touched && inView && !document.hidden) go(i + 1);
      }, delay);
    }

    /* ---------- switch the stack on, last ----------
       Every listener is in place, so 11a-news.css may now collapse the
       list into one overlapping cell. */
    stage.classList.add('is-ready');
    go(0);
  });
})();
