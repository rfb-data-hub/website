/* ============================================================
   05 · Community counters — live Discord + GitHub numbers written into
   the [data-live] spans of the platform rows' meta (sites-general.js
   platforms[], styled by 10a-platforms.css) and the home readout
   (site-index.js communityStats[], 12a-proof.css); the four keys —
   discord:members / discord:online / github:repos / github:followers —
   must match in both data files. One fetch per service, two for GitHub
   (CORS allows client-side); a failure stays quiet, leaving the fallback
   numbers. The org, the invite code and the excluded repositories are not
   typed here: they arrive on <body> as data-github-org /
   data-discord-invite / data-github-exclude from sites-general.js, so one
   edit there moves links and counters together.
   ============================================================ */
(function(){
  "use strict";
  var DATA = (document.body && document.body.dataset) || {};
  var INVITE_CODE = DATA.discordInvite;
  var GH_ORG = DATA.githubOrg;

  if (!document.querySelector('[data-live]')) return;

  function trim(s) { return (s || '').replace(/^\s+|\s+$/g, ''); }

  function apply(key, val){
    if (val === null || val === undefined) return;
    var text = Number(val).toLocaleString('en-US');
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-live="' + key + '"]'),
      function(el){ el.textContent = text; }
    );
  }

  function getJSON(url, then){
    fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
      .then(then)
      .catch(function(){ /* keep the fallback numbers, stay quiet */ });
  }

  /* ---------- github:repos — counted, not read off the org record ----------
     The figure is the number of LISTED resources: the same set 07-repos.js
     files into the rails on resources.html — public, not archived, and not one
     of the names in data-github-exclude (the org's profile repo). The org
     record's public_repos counts archived repositories and .github alike, so
     reading it here left the home readout and the resources summary one apart
     while both were true. That costs this page the repository list instead of
     the cheap org record, so it keeps 07-repos.js' discipline: the same
     endpoint and page size, the same five-minute sessionStorage cache, and a
     failure that leaves the fallback standing. */

  var PER_PAGE  = 100;          /* GitHub's maximum; must equal 07-repos.js */
  var MAX_PAGES = 10;           /* the same reading-list cap, so both pages stop
                                   counting at the same repository */
  var TTL       = 5 * 60 * 1000;
  /* bump the .vN suffix whenever the cached shape below changes */
  var CACHE_KEY = 'fbc.repoCount.' + GH_ORG + '.v1';
  var REPOS_API = 'https://api.github.com/orgs/' + GH_ORG +
                  '/repos?per_page=' + PER_PAGE + '&sort=full_name&page=';

  function countRepos(){
    var skip = (DATA.githubExclude || '').split(',').map(trim).filter(Boolean);

    try {
      var raw = window.sessionStorage && sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        /* typeof, not truthiness: a cached 0 is a real answer */
        if (o && o.t && typeof o.n === 'number' && Date.now() - o.t <= TTL) {
          apply('github:repos', o.n);
          return;
        }
      }
    } catch (e) { /* private mode throws on read: count it live instead */ }

    var kept = 0, pages = 0;
    function page(n){
      getJSON(REPOS_API + n, function(rows){
        if (!Array.isArray(rows)) return;      /* nothing usable: keep the fallback */
        pages++;
        for (var i = 0; i < rows.length; i++) {
          if (!rows[i].archived && skip.indexOf(rows[i].name) === -1) kept++;
        }
        /* a full page means there may be another; a short one ends the count */
        if (rows.length === PER_PAGE && pages < MAX_PAGES) { page(n + 1); return; }
        try {
          if (window.sessionStorage) sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), n: kept }));
        } catch (e) { /* the figure still lands, it just refetches next time */ }
        apply('github:repos', kept);
      });
    }
    page(1);
  }

  /* ---------- the three figures ---------- */

  if (INVITE_CODE) {
    getJSON('https://discord.com/api/v10/invites/' + INVITE_CODE + '?with_counts=true', function(d){
      apply('discord:members', d.approximate_member_count);
      apply('discord:online',  d.approximate_presence_count);
    });
  }

  if (GH_ORG) {
    getJSON('https://api.github.com/orgs/' + GH_ORG, function(d){
      apply('github:followers', d.followers);
    });
    countRepos();
  }
})();
