/* ==========================================================================
   Success Center — descriptors & subheaders (no-template path)

   Use this when you don't want to (or can't) edit Artera's .hbs files.
   It does two things after the page renders:

     1. Reads the real category/section descriptions from the Help Center API
        and injects them under the matching card titles.
     2. Injects hand-written subheaders under section headings, and
        descriptors on cards that aren't backed by a Zendesk record
        (Live Training Sessions, Courses, Blog, ...).

   Append to the bottom of the theme's script.js, or add as a separate file
   and reference it from document_head.hbs.

   It is additive and defensive: if a selector doesn't match or the API call
   fails, the page renders exactly as it does today.
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — this is the part you edit.
     ------------------------------------------------------------------ */

  var CONFIG = {
    // Pull descriptions from the Help Center API for category/section cards.
    // Turn off if you'd rather drive everything from `manualDescriptors`.
    useApiDescriptions: true,

    // Subheaders keyed by the exact (trimmed) text of the heading they follow.
    // Matching is case-insensitive.
    subheaders: {
      'Your Learning Path with Jasper':
        "Follow this path from your first login to mastering Jasper's full toolkit",
      'More Resources':
        'Live sessions, product stories, and the latest from our team',
      'Need more help?':
        'Our in-house support team is always available to assist with any questions you may have.'
    },

    // Descriptors for cards with no Zendesk category/section behind them.
    // Key on the exact (trimmed) card title, case-insensitive.
    // These also win over the API when both exist, so you can override a
    // category description on the home page without changing it in Guide.
    manualDescriptors: {
      'Get Started': 'Set up your workspace and run your first Jasper workflow',
      'Upskill Workflows': 'Tips and best practices beyond the basics',
      'Deepen Expertise': "Master Jasper's advanced capabilities",
      'Browse by Topic': 'Jump straight to the feature or use case you need',
      'Live Training Sessions':
        'Hands-on how-to sessions with our Customer Success team',
      'Jasper Courses': 'Self-paced Foundations and Jasper Grid courses',
      'Customer Stories': 'See how other teams use Jasper',
      'Jasper Blog': 'Tips and product news from our team'
    },

    // Where descriptors are allowed to appear. Anything inside these is
    // skipped so we never touch nav, breadcrumbs or the footer.
    excludeWithin: 'nav, header, footer, .breadcrumbs, .nav, .site-header, .site-footer',

    // Walk up at most this many ancestors from a link to find its card.
    maxCardDepth: 4
  };

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */

  var DESCRIPTOR_CLASS = 'jsc-descriptor';
  var SUBHEADER_CLASS = 'jsc-subheader';

  function norm(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function key(text) {
    return norm(text).toLowerCase();
  }

  // Build a case-insensitive lookup from a config object.
  function toLookup(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var value = norm(obj[k]);
      if (value) out[key(k)] = value;
    });
    return out;
  }

  var SUBHEADERS = toLookup(CONFIG.subheaders);
  var MANUAL = toLookup(CONFIG.manualDescriptors);

  function locale() {
    var fromPath = /\/hc\/([a-z]{2}(?:-[a-z0-9]+)?)\//i.exec(window.location.pathname);
    if (fromPath) return fromPath[1].toLowerCase();
    return (document.documentElement.getAttribute('lang') || 'en-us').toLowerCase();
  }

  // /hc/en-us/categories/360001234567-Get-Started -> "category:360001234567"
  function recordKeyFromHref(href) {
    if (!href) return null;
    var match = /\/(categories|sections)\/(\d+)/.exec(href);
    if (!match) return null;
    return (match[1] === 'categories' ? 'category' : 'section') + ':' + match[2];
  }

  /* ------------------------------------------------------------------
     Finding the card that owns a link, and the title inside it
     ------------------------------------------------------------------ */

  var TITLE_SELECTOR =
    'h1, h2, h3, h4, h5, h6, [class*="title"], [class*="Title"], [class*="heading"]';

  function isCardish(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'LI' || el.tagName === 'ARTICLE' || el.tagName === 'SECTION') return true;
    var cls = el.className;
    if (typeof cls !== 'string') return false;
    return /card|block|tile|item|category|section/i.test(cls);
  }

  // Prefer the smallest ancestor that both looks like a card and contains a
  // title element. Falls back to the link itself.
  function cardFor(link) {
    var node = link;
    for (var depth = 0; depth < CONFIG.maxCardDepth && node.parentElement; depth++) {
      var parent = node.parentElement;
      if (isCardish(parent) && parent.querySelector(TITLE_SELECTOR)) return parent;
      node = parent;
    }
    return link;
  }

  function titleIn(card, link) {
    var title = card.querySelector(TITLE_SELECTOR);
    if (title) return title;
    // Some themes render the title as the bare text of the link.
    return norm(link.textContent) ? link : null;
  }

  /* ------------------------------------------------------------------
     Injection
     ------------------------------------------------------------------ */

  // Don't add a descriptor to a card that already shows one — either ours
  // from a previous run, or the theme's own description element.
  function alreadyDescribed(card) {
    if (card.querySelector('.' + DESCRIPTOR_CLASS)) return true;
    var existing = card.querySelectorAll(
      '[class*="description"], [class*="Description"], [class*="excerpt"], [class*="subtitle"]'
    );
    for (var i = 0; i < existing.length; i++) {
      if (norm(existing[i].textContent)) return true;
    }
    return false;
  }

  function insertAfter(newNode, reference) {
    if (reference.nextSibling) {
      reference.parentNode.insertBefore(newNode, reference.nextSibling);
    } else {
      reference.parentNode.appendChild(newNode);
    }
  }

  function addDescriptor(card, title, text) {
    if (!text || alreadyDescribed(card)) return false;

    // Inside an <a>, only phrasing content is valid — use a <span>.
    var insideLink = !!(title.closest && title.closest('a'));
    var el = document.createElement(insideLink ? 'span' : 'p');
    el.className = DESCRIPTOR_CLASS + ' ' + DESCRIPTOR_CLASS + '--card';
    el.textContent = text;

    // If the title IS the link, append inside it rather than after it, so the
    // descriptor stays within the clickable area.
    if (title === card && title.tagName === 'A') {
      title.appendChild(el);
    } else {
      insertAfter(el, title);
    }
    return true;
  }

  function addSubheader(heading, text) {
    if (!text) return false;
    var next = heading.nextElementSibling;
    if (next && next.classList && next.classList.contains(SUBHEADER_CLASS)) return false;

    var centered =
      window.getComputedStyle(heading).textAlign === 'center' ? ' ' + SUBHEADER_CLASS + '--centered' : '';

    var el = document.createElement('p');
    el.className = SUBHEADER_CLASS + centered;
    el.textContent = text;

    heading.classList.add('jsc-has-subheader');
    insertAfter(el, heading);
    return true;
  }

  /* ------------------------------------------------------------------
     Passes
     ------------------------------------------------------------------ */

  function eligibleLinks() {
    var links = document.querySelectorAll('a[href*="/categories/"], a[href*="/sections/"]');
    return Array.prototype.filter.call(links, function (link) {
      return !link.closest(CONFIG.excludeWithin);
    });
  }

  // Descriptors that don't need the API: keyed on the card's own title text.
  function applyManualDescriptors() {
    var titles = document.querySelectorAll(TITLE_SELECTOR);
    Array.prototype.forEach.call(titles, function (title) {
      if (title.closest(CONFIG.excludeWithin)) return;

      var text = MANUAL[key(title.textContent)];
      if (!text) return;

      var link = title.closest('a');
      var card = link ? cardFor(link) : title.parentElement;
      if (card) addDescriptor(card, title, text);
    });
  }

  // Descriptors from Guide: match each card link to its category/section.
  function applyApiDescriptors(descriptions) {
    eligibleLinks().forEach(function (link) {
      var recordKey = recordKeyFromHref(link.getAttribute('href'));
      if (!recordKey) return;

      var card = cardFor(link);
      var title = titleIn(card, link);
      if (!title) return;

      // A manual entry for this title already ran and wins.
      if (MANUAL[key(title.textContent)]) return;

      addDescriptor(card, title, descriptions[recordKey]);
    });
  }

  function applySubheaders() {
    var headings = document.querySelectorAll('h1, h2, h3');
    Array.prototype.forEach.call(headings, function (heading) {
      if (heading.closest(CONFIG.excludeWithin)) return;
      addSubheader(heading, SUBHEADERS[key(heading.textContent)]);
    });
  }

  /* ------------------------------------------------------------------
     Help Center API
     ------------------------------------------------------------------ */

  // Follows pagination and returns every record for one resource.
  function fetchAll(resource) {
    var base = '/api/v2/help_center/' + locale() + '/' + resource + '.json?per_page=100';
    var collected = [];

    function page(url) {
      return fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
        .then(function (response) {
          if (!response.ok) throw new Error(resource + ': HTTP ' + response.status);
          return response.json();
        })
        .then(function (data) {
          collected = collected.concat(data[resource] || []);
          // Cap at 5 pages (500 records) so a large Help Center can't spin here.
          if (data.next_page && collected.length < 500) return page(data.next_page);
          return collected;
        });
    }

    return page(base);
  }

  // -> { "category:123": "description", "section:456": "description" }
  function loadDescriptions() {
    if (!CONFIG.useApiDescriptions || typeof window.fetch !== 'function') {
      return Promise.resolve({});
    }

    return Promise.all([fetchAll('categories'), fetchAll('sections')])
      .then(function (results) {
        var map = {};
        ['category', 'section'].forEach(function (type, index) {
          results[index].forEach(function (record) {
            var text = norm(record.description);
            if (text) map[type + ':' + record.id] = text;
          });
        });
        return map;
      })
      .catch(function (error) {
        // Never let a failed lookup break the page.
        if (window.console && console.warn) {
          console.warn('[jsc] Could not load Help Center descriptions:', error.message);
        }
        return {};
      });
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */

  function init() {
    // These are synchronous — they land before first paint settles.
    applySubheaders();
    applyManualDescriptors();

    // These depend on a network round trip.
    loadDescriptions().then(applyApiDescriptors);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
