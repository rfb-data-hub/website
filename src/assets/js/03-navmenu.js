/* ============================================================
   03 · Nav menu behaviour — what CSS cannot do for the menu: keep
   `aria-expanded` honest, make a touch first tap open instead of
   navigate, fold the bar into a hamburger panel, close on Escape.
   Runs on every page: src/layout.html renders components/nav.html from
   the `nav` array in src/data/sites-general.js and defers app.js, so
   the DOM is parsed here. That markup must keep the `#nav`, `#navMenu`,
   `.nav-toggle` and `.nav-top[aria-expanded]` hooks this queries.
   03a-navmenu.css styles the states it toggles: `.nav-item.open` is
   revealed only at min-width:961px, `nav.menu-open` only at
   max-width:960px — below it the panel is static, so a tap navigates.
   ============================================================ */
(function(){
  "use strict";
  /* ---------- refs and mode tests ----------
     The whole module is inert on a page whose layout carries no #nav. */
  var nav = document.getElementById('nav');
  if (!nav) return;
  var menu   = document.getElementById('navMenu');
  var toggle = nav.querySelector('.nav-toggle');
  var parents = Array.prototype.slice.call(nav.querySelectorAll('.nav-top[aria-expanded]'));
  var mqHover  = window.matchMedia ? matchMedia('(hover:hover) and (pointer:fine)') : null;
  var mqNarrow = window.matchMedia ? matchMedia('(max-width:960px)') : null;
  var isNarrow = function(){ return !!(mqNarrow && mqNarrow.matches); };

  /* ---------- dropdown open/close ----------
     At most one dropdown is open, and `.open` (revealed by
     03a-navmenu.css) and `aria-expanded` (read by assistive tech) always
     move together. */
  function closeItem(a){
    a.parentNode.classList.remove('open');
    a.setAttribute('aria-expanded', 'false');
  }
  function openItem(a){
    parents.forEach(function(o){ if (o !== a) closeItem(o); });
    a.parentNode.classList.add('open');
    a.setAttribute('aria-expanded', 'true');
  }
  function closeAll(){ parents.forEach(closeItem); }

  /* ---------- dropdown wiring: click, focus, focus-out ----------
     Three regimes, one state: panel mode navigates, hover devices leave
     the revealing to 03a-navmenu.css, touch above the breakpoint spends
     the first tap on opening. focusout closes only once focus has left
     the whole item, so tabbing into the submenu does not snap it shut. */
  parents.forEach(function(a){
    a.addEventListener('click', function(e){
      if (isNarrow()){ closePanel(); return; }          // panel mode: navigate
      if (mqHover && mqHover.matches){ closeAll(); return; }  // 03a-navmenu.css owns hover
      if (!a.parentNode.classList.contains('open')){     // touch, >960px: tap 1 opens
        e.preventDefault();
        openItem(a);
      }
    });
    /* 03a-navmenu.css :focus-within shows the menu — mirror it in aria-expanded */
    a.addEventListener('focus', function(){
      if (mqHover && mqHover.matches && !isNarrow()) openItem(a);
    });
    a.parentNode.addEventListener('focusout', function(e){
      if (!a.parentNode.contains(e.relatedTarget)) closeItem(a);
    });
  });

  /* ---------- hamburger panel ----------
     `nav.menu-open`, styled by 03a-navmenu.css, is the only state; the
     button's `aria-expanded` and `aria-label` are derived from it here,
     never set independently. */
  function setPanel(open){
    nav.classList.toggle('menu-open', open);
    if (toggle){
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }
  function closePanel(){ setPanel(false); }
  function panelOpen(){ return nav.classList.contains('menu-open'); }

  if (toggle){
    toggle.addEventListener('click', function(){ setPanel(!panelOpen()); });
  }
  /* An in-page link does not reload the page, so the panel has to be
     folded by hand after the tap; a real navigation folds itself. */
  if (menu){
    menu.addEventListener('click', function(e){
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a && isNarrow()) closePanel();   // the tap navigated; fold the panel
    });
  }

  /* ---------- global dismissal ----------
     A click outside #nav closes both layers; Escape closes the deepest
     open thing and returns focus to its trigger, so the keyboard
     position survives the close. */
  document.addEventListener('click', function(e){
    if (!nav.contains(e.target)){ closeAll(); closePanel(); }
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    var open = parents.filter(function(a){ return a.parentNode.classList.contains('open'); })[0];
    if (open){ closeItem(open); open.focus(); return; }
    if (panelOpen()){ closePanel(); if (toggle) toggle.focus(); }
  });

  /* ---------- breakpoint crossings ----------
     Open/closed means nothing in the other layout, so crossing the
     boundary drops both states rather than carrying them over. */
  function onBreak(){ if (!isNarrow()){ closePanel(); closeAll(); } }
  if (mqNarrow){
    if (mqNarrow.addEventListener) mqNarrow.addEventListener('change', onBreak);
    else if (mqNarrow.addListener) mqNarrow.addListener(onBreak);   // legacy matchMedia
  }
})();
