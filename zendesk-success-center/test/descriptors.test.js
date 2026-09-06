/*
 * Runs scripts/descriptors.js against a mock Artera-shaped DOM.
 *
 *   npm install && npm test
 *
 * The mock markup mirrors Artera's structure (`blocks-item` /
 * `blocks-item-title` inside a card link). If your theme's markup differs,
 * edit HTML below and re-run — the script finds cards structurally, so it
 * should still pass.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SCRIPT = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'descriptors.js'),
  'utf8'
);

const HTML = `<!DOCTYPE html><html lang="en-us"><body>
  <nav class="nav">
    <a href="/hc/en-us/categories/111-get-started">Get Started</a>
  </nav>

  <h2 class="blocks-title">Your Learning Path with Jasper</h2>
  <ul class="blocks-list">
    <li class="blocks-item">
      <a href="/hc/en-us/categories/111-get-started" class="blocks-item-link">
        <span class="blocks-item-title">Get Started</span>
      </a>
    </li>
    <li class="blocks-item">
      <a href="/hc/en-us/categories/222-prompt-library" class="blocks-item-link">
        <span class="blocks-item-title">Prompt Library</span>
      </a>
    </li>
    <li class="blocks-item">
      <a href="/hc/en-us/sections/333-billing" class="blocks-item-link">
        <span class="blocks-item-title">Billing</span>
        <span class="blocks-item-description">Existing theme copy</span>
      </a>
    </li>
    <li class="blocks-item">
      <a href="/hc/en-us/categories/444-no-desc" class="blocks-item-link">
        <span class="blocks-item-title">Undocumented</span>
      </a>
    </li>
  </ul>

  <h2 class="blocks-title">Need more help?</h2>
  <p class="contact-subtitle">Already rendered by the template</p>

  <h2 class="blocks-title">More Resources</h2>
  <ul class="blocks-list">
    <li class="blocks-item">
      <a href="https://jasper.ai/webinars" class="blocks-item-link">
        <span class="blocks-item-title">Live Training Sessions</span>
      </a>
    </li>
  </ul>
</body></html>`;

const API = {
  categories: [
    { id: 111, description: 'Guide copy for Get Started' },
    { id: 222, description: 'Ready-made prompts for every team' },
    { id: 444, description: '' }
  ],
  sections: [{ id: 333, description: 'Guide copy for Billing' }]
};

const dom = new JSDOM(HTML, {
  url: 'https://support.jasper.ai/hc/en-us/',
  runScripts: 'outside-only'
});
const { window } = dom;

let fetched = [];
window.fetch = (url) => {
  fetched.push(url);
  const resource = /\/(categories|sections)\.json/.exec(url)[1];
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ [resource]: API[resource], next_page: null })
  });
};

window.eval(SCRIPT);

const results = [];
function check(name, actual, expected) {
  const pass = actual === expected;
  results.push(pass);
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${name}` +
      (pass ? '' : `\n        expected: ${JSON.stringify(expected)}\n        actual:   ${JSON.stringify(actual)}`)
  );
}

const doc = window.document;
const text = (sel) => {
  const el = doc.querySelector(sel);
  return el ? el.textContent.trim() : null;
};
// Card index -> injected descriptor text (null if none)
const cardDescriptor = (i) => {
  const el = doc.querySelectorAll('.blocks-item')[i].querySelector('.jsc-descriptor');
  return el ? el.textContent.trim() : null;
};

setTimeout(() => {
  console.log('--- synchronous passes ---');
  check(
    'subheader under "Your Learning Path"',
    text('h2 + .jsc-subheader'),
    "Follow this path from your first login to mastering Jasper's full toolkit"
  );
  check(
    'subheader under "More Resources"',
    doc.querySelectorAll('.jsc-subheader')[1].textContent.trim(),
    'Live sessions, product stories, and the latest from our team'
  );
  check('heading got .jsc-has-subheader', doc.querySelector('h2').classList.contains('jsc-has-subheader'), true);
  check(
    'no duplicate subheader where the template already rendered one',
    doc.querySelectorAll('.jsc-subheader').length,
    2
  );

  console.log('--- API passes ---');
  check('fetched 2 endpoints', fetched.length, 2);
  check('locale in URL', /help_center\/en-us\/categories\.json/.test(fetched[0]), true);

  check('manual descriptor wins over API (Get Started)', cardDescriptor(0), 'Set up your workspace and run your first Jasper workflow');
  check('API descriptor injected (Prompt Library)', cardDescriptor(1), 'Ready-made prompts for every team');
  check('skipped card that already had a description (Billing)', cardDescriptor(2), null);
  check('empty API description is not injected (Undocumented)', cardDescriptor(3), null);
  check('manual descriptor on non-Zendesk card', cardDescriptor(4), 'Hands-on how-to sessions with our Customer Success team');

  console.log('--- guards ---');
  check('nav link untouched', doc.querySelector('nav .jsc-descriptor'), null);
  check(
    'descriptor is a <span> inside the link',
    doc.querySelectorAll('.blocks-item')[1].querySelector('.jsc-descriptor').tagName,
    'SPAN'
  );
  check(
    'descriptor sits after the title',
    doc.querySelectorAll('.blocks-item')[1].querySelector('.blocks-item-title').nextElementSibling.className,
    'jsc-descriptor jsc-descriptor--card'
  );

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}, 100);
