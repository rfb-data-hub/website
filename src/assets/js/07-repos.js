/* ============================================================
   Repositories — files the org's live GitHub repos into the category rails
   on resources.html; no-ops where the [data-repos] section is absent
   (docs/authoring.md §3). One unauthenticated GET per page, kept in
   sessionStorage for TTL; GitHub's max-age=60 covers shorter repeats — the
   visitor's budget is 60 requests/hour. Reads the topic vocabulary back
   from data-repo-list (components/repo-group.html ← categories in
   sites-general.js) and the org from <body data-github-org> (layout.html ←
   githubOrg there); fills the repo-*-tpl markup (pages/resources.html) into
   the rails, counts (repo-cat.html) and summary. A forked repository costs
   one further GET — the list says only fork:true, its origin lives in the
   repository's own payload — asked for once the cards are on screen and
   capped at MAX_FORKS. 17a-repos.css styles the result, 07-rail.js pages it;
   network strings enter via textContent only.
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
  var MAX_FORKS = 8;            /* how many shown forks may ask for their origin: every answer
                                   is one of the visitor's 60 requests/hour, so a fork-heavy
                                   organisation caps what it costs instead of spending all. */
  var FORK_WORDS = 'mirrored from';   /* the phrase on the hover label and in the link's
                                   aria-label; one const so the two cannot drift apart */
  var TTL = 5 * 60 * 1000;      /* five minutes: a new topic shows up the same day, and a
                                   refetch costs one of the visitor's 60 requests/hour. */
  var TIMEOUT = 12000;          /* the whole sequence, not one page */
  /* bump the .vN suffix whenever slim()'s shape changes: a cached payload
     written by an older shape must not be read back into a newer card.
     v3 added fork, api, and the upstream a resolved fork caches under upstream. */
  var CACHE_KEY = 'fbc.repos.' + ORG + '.v3';

  function clean(s) { return (s || '').replace(/^\s+|\s+$/g, ''); }

  /* not resources: the org's profile repo (.github) carries topics but is not
     something a member browses. data-repos-exclude is rendered on the section
     in pages/resources.html from sites-general.js → githubExclude — the same
     list 05-community.js subtracts from the home readout's repository figure,
     so the two pages always count the same set. */
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
     GitHub repo object (it is ~6 kB of fields this page does not use).
     fork is kept because the card marks a fork; api because it is the address
     the origin has to be read from (see resolveForks). */
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
        archived: !!r.archived,
        fork: !!r.fork,
        api: r.url || ''
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

  /* ---------- the fork's origin ----------
     The list answers fork:true and stops there: parent and source appear only in
     the repository's own payload — not in /orgs/<org>/repos, not in
     /search/repositories, not in /repos/<o>/<r>/forks (probed 2026-10-14) — so the
     origin of a fork that is actually on screen costs one further GET. parent is
     the repository this one was forked from, source the head of the chain; parent
     first, source as the fallback, because a fork whose upstream was deleted or
     detached can carry one and not the other — and then it carries neither, which
     is why the mark must be able to stand without a name. */

  function upstreamName(r) { return (r.upstream && r.upstream.name) || ''; }

  /* one home for the label: the origin can arrive after the card was built, and
     the name must not be read out twice by a screen reader, so it lives in the
     link's name and nowhere else (the mark and its label are aria-hidden).
     Same phrase as the visible label, by way of FORK_WORDS. */
  function ariaFor(said, r) {
    var up = upstreamName(r);
    return said + (up ? ' — ' + FORK_WORDS + ' ' + up : '') + ', opens in a new tab';
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
    link.setAttribute('aria-label', ariaFor(said, r));

    /* the pills are every site category this repo is filed under, INCLUDING the
       one it stands in; a repo with no site topic gets none, and that is the truth. */
    var cats = catTopics(r).slice(0, MAX_PILLS);
    if (isNew(r.created_at)) tags.appendChild(pill('new', 'repo-tag is-new'));
    cats.forEach(function (topic) { tags.appendChild(pill('#' + topic, 'repo-tag')); });

    /* the fork mark moves out of the template's spare corner into the pill row, and
       a plain repository loses it; the row is dropped only once it holds nothing.
       The guard is for a hand-edited template: a null here would throw inside
       render() and leave every rail on "Querying GitHub…". */
    var forkEl = f.querySelector('.repo-fork');
    if (forkEl) {
      if (r.fork) tags.appendChild(forkEl); else drop(forkEl);
    }
    if (tags.children.length === 0) drop(tags);
    if (r.fork) setFork(li, r);           /* from the cache, if it was resolved before */

    cardFor(r.name).push({ li: li, said: said });
    return li;
  }

  /* ---------- the cards, by name ----------
     An origin is painted into cards that are already on screen, and a repository
     filed under two topics has one card in each of the two rails, so the map holds
     a list per name. render() rebuilds it; nothing else writes it. */
  var CARDS = Object.create(null);

  function cardFor(name) { return CARDS[name] || (CARDS[name] = []); }

  /* "mirrored from <org>/<repo>" — only the name arrived from a network, so the
     whole line goes in as textContent. No name, no label: the empty span is what
     17a-repos.css hides, which is why an upstream-less fork shows the mark alone. */
  function setFork(li, r) {
    var up = upstreamName(r);
    if (!up) return;
    var tip = li.querySelector('.repo-fork-name');
    if (tip) tip.textContent = FORK_WORDS + ' ' + up;
  }

  function paintFork(r) {
    cardFor(r.name).forEach(function (card) {
      setFork(card.li, r);
      var link = card.li.querySelector('.repo-link');
      if (link) link.setAttribute('aria-label', ariaFor(card.said, r));
    });
  }

  function getRepo(url, done) {
    fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (res) {
        /* the same two codes load() reads as a spent budget */
        if (res.status === 403 || res.status === 429) throw new Error('rate-limited');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (d) {
        /* an error page or a proxy can answer with an array: no parent in it */
        done(null, Array.isArray(d) ? null : d);
      })
      .catch(function (e) { done(e || new Error('failed')); });
  }

  /* one request per shown fork, in sequence and no more than MAX_FORKS deep: the
     first failure ends the walk, because a 403 means the visitor's hourly budget is
     spent and the remaining marks are better nameless than rate-limit noise.
     shown is what may be asked about (an archived or excluded fork is not on the
     page, so it is not worth a request); all is what goes back into the cache, so
     the five-minute payload keeps the repositories this page did not file. */
  function resolveForks(shown, all) {
    var todo = shown.filter(function (r) { return r.fork && r.api && !r.checked; })
                    .slice(0, MAX_FORKS);
    (function step() {
      var r = todo.shift();
      if (!r) return;
      getRepo(r.api, function (err, d) {
        if (err) return;                  /* the mark stays, the name stays out */
        var up = d && (d.parent || d.source);
        r.checked = true;                 /* asked and answered: not asked again this TTL */
        if (up && up.full_name) r.upstream = { name: up.full_name, url: up.html_url || '' };
        paintFork(r);
        writeCache(all);                  /* keep what was paid for, even if the next one fails */
        step();
      });
    })();
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
    CARDS = Object.create(null);          /* the cards below are the ones paintFork may touch */

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
    resolveForks(kept, repos);            /* the marks are up; their names come after */
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
