/* ============================================================
   02 · Reveal-on-scroll — any element with [data-reveal]
   fades/slides in once, with optional data-delay (ms).
   ============================================================ */
/* The hidden state lives in 16-reveal.css and applies only under the
   html.js class (added by an inline script in src/layout.html), so a
   visitor without JS never sees invisible content; 19-motion.css
   cancels the effect under reduced motion. data-delay is the item's
   `delay` field (or an @index stagger) from src/data/*.js, rendered
   as data-delay by the component that marks the element. */
(function(){
  "use strict";
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          var d = e.target.getAttribute('data-delay');
          if (d) e.target.style.transitionDelay = d + 'ms';
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, {threshold: 0.15, rootMargin: '0px 0px -40px 0px'});   /* tuned values, not sacred */
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('revealed'); });
  }
})();
