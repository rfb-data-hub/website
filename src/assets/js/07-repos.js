/* ============================================================
   Repositories — files the org's live GitHub repos into the category rails
   on resources.html; no-ops where the [data-repos] section is absent
   (docs/authoring.md §3). One unauthenticated GET per page, kept in
   sessionStorage for TTL; GitHub's max-age=60 covers shorter repeats — the
   visitor's budget is 60 requests/hour. Reads the topic vocabulary back
   from data-repo-list (components/repo-group.html ← categories in
   sites-general.js) and the org from <body data-github-org> (layout.html ←
   githubOrg there); fills the repo-*-tpl markup (pages/resources.html) into
   the rails, counts (repo-cat.html) and summary. 17a-repos.css styles the
   result, 07-rail.js pages it; network strings enter via textContent only.
   ============================================================ */
(function(){
  "use strict";

  /* ---------- config: the section, the endpoint, the budgets ---------- */

  var ROOT = document.querySelector('[data-repos]');
  if (!ROOT) return;

  var ORG = document.body.dataset.githubOrg;   /* sites-general.js → githubOrg, rendered into <body> by layout.html */
  var API = 'https://api.github.com/orgs/' + ORG + '/repos?per_page=100&sort=full_name&page=';
  var PER_PAGE = 100;           /* GitHub's own maximum; the per_page in API must equal this */
  var MAX_PAGES = 10;           /* 1 000 repositories: a reading list, not a mirror of the
                                   org; the summary reports what was read, so no silent cut. */
  var NEW_DAYS = 30;            /* a repository younger than this says "new" */
  var MAX_PILLS = 3;            /* the pill row is a hint, not the topic list: three is what
                                   fits one line in a --repo-w card (17a-repos.css). */
  var TTL = 5 * 60 * 1000;      /* five minutes: a new topic shows up the same day, and a
                                   refetch costs one of the visitor's 60 requests/hour. */
  var TIMEOUT = 12000;          /* the whole sequence, not one page */
  /* bump the .vN suffix whenever slim()'s shape changes: a cached payload
     written by an older shape must not be read back into a newer card. */
  var CACHE_KEY = 'fbc.repos.' + ORG + '.v2';

  function clean(s) { return (s || '').replace(/^\s+|\s+$/g, ''); }

  /* not resources: the org's profile repo (.github) carries topics but is not
     something a member browses; data-repos-exclude is authored in pages/resources.html */
  var SKIP = clean(ROOT.getAttribute('data-repos-exclude')).split(',').map(clean).filter(Boolean);

  var LISTS   = [].slice.call(ROOT.querySelectorAll('[data-repo-list]'));
  var TOPICS  = LISTS.map(function (ul) { return ul.getAttribute('data-repo-list'); });
  var COUNTS  = [].slice.call(document.querySelectorAll('[data-repo-count]'));   /* one per band tile (repo-cat.html) and one per rail head (repo-group.html) */
  var SUMMARY = ROOT.querySelector('[data-repo-summary]');

  if (!LISTS.length) return;

  /* ---------- tiny DOM helpers ---------- */

  function frag(id) {
    var t = document.getElementById(id);
    return t ? t.content.cloneNode(true) : document.createDocumentFragment();
  }

  function note(kind) { return frag('repo-' + kind + '-tpl'); }

  function setNote(ul, kind) {
    ul.textContent = '';
    ul.appendChild(note(kind));
  }

  function drop(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  function pill(text, cls) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  /* ---------- the five-minute cache ----------
     Live beats build time: the list is correct the moment a maintainer adds
     a topic, and costs the bundle zero bytes — what it costs is the
     visitor's hourly budget, so a tab session refetches at most once. */

  function readCache() {
    try {
      var raw = window.sessionStorage && sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || !o.t || !o.repos || Date.now() - o.t > TTL) return null;
      return o.repos;
    } catch (e) { return null; }         /* private mode throws on read too */
  }

  function writeCache(repos) {
    try {
      if (window.sessionStorage) sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), repos: repos }));
    } catch (e) { /* quota or private mode: the list still renders, it just refetches */ }
  }

  /* keep the cache small and the shape stable — never store a whole
     GitHub repo object (it is ~6 kB of fields this page does not use) */
  function slim(repos) {
    return repos.map(function (r) {
      return {
        name: r.name,
        html_url: r.html_url,
        description: r.description || '',
        topics: r.topics || [],
        pushed_at: r.pushed_at || '',
        created_at: r.created_at || '',
        stars: r.stargazers_count || 0,
        archived: !!r.archived
      };
    });
  }

  /* ---------- the rules ---------- */

  function keep(r) {
    return !r.archived && SKIP.indexOf(r.name) === -1;
  }

  /* only the site's own topics, so a repo that also carries 'electrochemistry'
     or 'aorfb' does not spray eight pills across the card */
  function catTopics(r) {
    var have = r.topics || [];
    return TOPICS.filter(function (t) { return have.indexOf(t) !== -1; });
  }

  /* newest activity first: a rail is a shelf you page through, and the first
     card should be the one the commons has touched most recently */
  function byRecent(a, b) {
    var x = Date.parse(a.pushed_at) || 0, y = Date.parse(b.pushed_at) || 0;
    if (y !== x) return y - x;
    var m = a.name.toLowerCase(), n = b.name.toLowerCase();
    return m < n ? -1 : m > n ? 1 : 0;
  }

  /* pushed_at → "updated …" prose; 86400000 is ms per day, 30.44 and 365.25
     the leap-inclusive average month and year, 31 days caps the "days ago" rung */
  function ago(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var days = Math.floor((Date.now() - t) / 86400000);
    if (days <= 0) return 'updated today';
    if (days === 1) return 'updated yesterday';
    if (days < 31) return 'updated ' + days + ' days ago';
    var months = Math.round(days / 30.44);
    if (months < 12) return 'updated ' + months + ' months ago';
    var years = Math.round(days / 365.25);
    return 'updated ' + (years === 1 ? 'a year ago' : years + ' years ago');
  }

  function isNew(iso) {
    var t = Date.parse(iso);
    return !isNaN(t) && (Date.now() - t) / 86400000 < NEW_DAYS;
  }

  /* ---------- one card, cloned from the template ---------- */

  function rowFor(r) {
    var f = frag('repo-row-tpl');
    var li = f.querySelector('.repo');
    var link = f.querySelector('.repo-link');
    var name = f.querySelector('.repo-name');
    var desc = f.querySelector('.repo-desc');
    var meta = f.querySelector('.repo-meta');
    var tags = f.querySelector('.repo-tags');

    link.href = r.html_url;
    name.textContent = r.name;

    if (r.description) desc.textContent = r.description; else drop(desc);

    var bits = [];
    var up = ago(r.pushed_at);
    if (up) bits.push(up);
    if (r.stars) bits.push(r.stars + (r.stars === 1 ? ' star' : ' stars'));
    if (bits.length) meta.textContent = bits.join(' · '); else drop(meta);

    /* 17a-repos.css clamps the description to three lines and the meta line to
       one, so the aria-label carries what the clamp cut. */
    var said = r.name;
    if (r.description) said += ' — ' + r.description;
    if (bits.length) said += ' (' + bits.join(', ') + ')';
    link.setAttribute('aria-label', said + ', opens in a new tab');

    /* the pills are every site category this repo is filed under, INCLUDING the
       one it stands in; a repo with no site topic gets none, and that is the truth. */
    var cats = catTopics(r).slice(0, MAX_PILLS);
    var fresh = isNew(r.created_at);
    if (cats.length || fresh) {
      if (fresh) tags.appendChild(pill('new', 'repo-tag is-new'));
      cats.forEach(function (topic) { tags.appendChild(pill('#' + topic, 'repo-tag')); });
    } else drop(tags);

    return li;
  }

  /* ---------- the rails ----------
     One fbcRail per <ul>, wired to the arrows authored in
     components/repo-group.html; the shared rail contract lives in 07-rail.js. */

  var RAILS = LISTS.map(function (ul) {
    var group = ul.parentNode;
    var prev = group.querySelector ? group.querySelector('[data-repo-prev]') : null;
    var next = group.querySelector ? group.querySelector('[data-repo-next]') : null;
    var api = window.fbcRail(ul, { prev: prev, next: next, itemSel: 'li' });
    return { ul: ul, sync: api.sync };
  });

  function syncAll() { RAILS.forEach(function (rail) { rail.sync(); }); }

  /* ---------- paint everything ---------- */

  function render(repos) {
    var kept = repos.filter(keep);

    RAILS.forEach(function (rail) {
      var ul = rail.ul;
      var topic = ul.getAttribute('data-repo-list');
      var items = kept.filter(function (r) { return (r.topics || []).indexOf(topic) !== -1; }).sort(byRecent);
      ul.textContent = '';
      if (!items.length) { ul.appendChild(note('empty')); return; }
      items.forEach(function (r) { ul.appendChild(rowFor(r)); });
      ul.scrollLeft = 0;                  /* every rail starts at its newest card */
    });

    COUNTS.forEach(function (el) {
      var topic = el.getAttribute('data-repo-count');
      var n = kept.filter(function (r) { return (r.topics || []).indexOf(topic) !== -1; }).length;
      el.textContent = n ? String(n) : '';
      /* data-repo-cat is the band tile (repo-cat.html); .repo-cat.is-empty is styled by 17a-repos.css */
      var cat = document.querySelector('[data-repo-cat="' + topic + '"]');
      if (cat && cat.classList) cat.classList.toggle('is-empty', n === 0);
    });

    if (SUMMARY) {
      var filed = kept.filter(function (r) { return catTopics(r).length > 0; }).length;
      /* "so far" is the honest word for a category the org has not tagged yet */
      SUMMARY.textContent = kept.length + ' public repositor' + (kept.length === 1 ? 'y' : 'ies') +
        ', ' + filed + ' filed under a topic' + (filed === kept.length ? '.' : ' so far.');
    }

    syncAll();
  }

  /* ---------- error and offline states ----------
     Failure is a designed state, not an absence: every rail ships in the HTML
     with a placeholder line (what a no-JS visitor reads); this module swaps
     that for the loading, cards, empty or error note — the strings are the
     repo-*-tpl templates in pages/resources.html, never written here. */

  function fail() {
    LISTS.forEach(function (ul) { setNote(ul, 'error'); });
    COUNTS.forEach(function (el) { el.textContent = ''; });
    syncAll();                            /* nothing to page: both arrows dark */
  }

  /* ---------- the request (or the cache) ---------- */

  function load(done) {
    var cached = readCache();
    if (cached) { done(cached, false); return; }

    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var signal = ctrl ? ctrl.signal : undefined;
    var read = [];
    var settled = false;

    function stop() { if (ctrl) { try { ctrl.abort(); } catch (e) {} } }

    function finish(err, data) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) stop();                    /* a page nobody is waiting for */
      done(err ? null : data, !!err);
    }

    var timer = setTimeout(function () { finish(new Error('timeout')); }, TIMEOUT);

    function page(n) {
      if (n > MAX_PAGES) { writeCache(read); finish(null, read); return; }
      fetch(API + n, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: signal
      })
        .then(function (r) {
          /* GitHub signals an exhausted hourly budget with 403 or 429 */
          if (r.status === 403 || r.status === 429) throw new Error('rate-limited');
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (d) {
          if (!Array.isArray(d)) throw new Error('unexpected body');
          read = read.concat(slim(d));
          if (d.length < PER_PAGE) { writeCache(read); finish(null, read); }
          else page(n + 1);               /* a full page means there may be another */
        })
        .catch(function (e) { finish(e || new Error('failed')); });
    }

    page(1);
  }

  /* ---------- boot ---------- */

  if (!ORG) { fail(); return; }   /* the page carries no org: the error note is the designed failure state, so use it */

  LISTS.forEach(function (ul) { setNote(ul, 'loading'); });
  load(function (repos, failed) {
    if (failed || !repos) { fail(); return; }
    render(repos);
  });
})();
