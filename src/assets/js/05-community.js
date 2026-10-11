/* ============================================================
   05 · Community counters — live Discord + GitHub numbers written into
   the [data-live] spans of the platform rows' meta (sites-general.js
   platforms[], styled by 10a-platforms.css) and the home readout
   (site-index.js communityStats[], 12a-proof.css); the four keys —
   discord:members / discord:online / github:repos / github:followers —
   must match in both data files. One fetch per service (CORS allows
   client-side); a failure stays quiet, leaving the fallback numbers.
   The org and the invite code are not typed here: they arrive on
   <body> as data-github-org / data-discord-invite from sites-general.js,
   so one edit there moves links and counters together.
   ============================================================ */
(function(){
  "use strict";
  var DATA = (document.body && document.body.dataset) || {};
  var INVITE_CODE = DATA.discordInvite;
  var GH_ORG = DATA.githubOrg;

  if (!document.querySelector('[data-live]')) return;

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

  if (INVITE_CODE) {
    getJSON('https://discord.com/api/v10/invites/' + INVITE_CODE + '?with_counts=true', function(d){
      apply('discord:members', d.approximate_member_count);
      apply('discord:online',  d.approximate_presence_count);
    });
  }

  if (GH_ORG) {
    getJSON('https://api.github.com/orgs/' + GH_ORG, function(d){
      apply('github:followers', d.followers);
      apply('github:repos', d.public_repos);
    });
  }
})();
