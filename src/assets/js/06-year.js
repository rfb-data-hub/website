/* ============================================================
   06 · Footer year — writes the current year into the
   [data-footer-year] span of components/footer.html.
   A script that globs an attribute name owns it site-wide: [data-year]
   is claimed by this meaning, which is why the minutes filter uses
   [data-minute-year] (07a-minutes.js) and this hook keeps its long name.
   ============================================================ */
(function(){
  "use strict";
  var els = document.querySelectorAll('[data-footer-year]');
  var y = String(new Date().getFullYear());
  Array.prototype.forEach.call(els, function(el){ el.textContent = y; });
})();
