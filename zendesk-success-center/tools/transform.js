/*
 * Regenerates templates/home_page.hbs from templates/home_page.original.hbs.
 *
 *   node tools/transform.js
 *
 * Kept in the repo so the 27 edits are reproducible: when Artera ships a theme
 * update, replace home_page.original.hbs with the new upstream file, re-run
 * this, and `npm test`. Beats re-merging 27 hand edits.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = path.join(__dirname, '..', 'templates');
const SRC = path.join(TEMPLATES, 'home_page.original.hbs');
const OUT = path.join(TEMPLATES, 'home_page.hbs');

let lines = fs.readFileSync(SRC, 'utf8').split('\n');
const out = [];
const log = [];

// Tracks the `../` prefix + index of the most recent settings reference, so a
// description block gets the same scope depth as the card it belongs to.
let catPrefix = null, catNum = null;
let cardPrefix = null, cardNum = null;

function pad(indent, s) { return indent + s; }

// setting override -> Guide description -> nothing at all.
function gated(indent, prefix, setting, open, close) {
  return [
    pad(indent, `{{#if ${prefix}settings.${setting}}}`),
    pad(indent, `  ${open}{{${prefix}settings.${setting}}}${close}`),
    pad(indent, `{{else}}`),
    pad(indent, `  {{#if description}}`),
    pad(indent, `    ${open}{{excerpt description}}${close}`),
    pad(indent, `  {{/if}}`),
    pad(indent, `{{/if}}`)
  ];
}

const SPAN_OPEN = '<span class="blocks-item-description">';
const SPAN_CLOSE = '</span>';
const P_OPEN = '<p class="card-description">';
const P_CLOSE = '</p>';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const indent = (line.match(/^(\s*)/) || ['', ''])[1];

  let m;
  if ((m = /\{\{#if (\.\.\/(?:\.\.\/)?)settings\.category_image_(\d+)\}\}/.exec(line))) {
    catPrefix = m[1]; catNum = m[2];
  }
  if ((m = /\{\{#if (\.\.\/(?:\.\.\/)?)settings\.card_(\d+)_image\}\}/.exec(line))) {
    cardPrefix = m[1]; cardNum = m[2];
  }

  // 1. Hero subtitle, under the welcome message.
  if (/class="welcome-message"/.test(line)) {
    out.push(line);
    out.push(pad(indent, '{{#if settings.homepage_welcome_subtitle}}'));
    out.push(pad(indent, '  <p class="hero-subtitle">{{settings.homepage_welcome_subtitle}}</p>'));
    out.push(pad(indent, '{{/if}}'));
    log.push('hero subtitle added');
    continue;
  }

  // 2. Category card 1 has no descriptor at all — give it one.
  if (/<span class="blocks-item-title">\{\{name\}\}<\/span>/.test(line) &&
      !/blocks-item-description/.test(lines[i + 1] || '')) {
    out.push(line);
    out.push(...gated(indent, catPrefix, `category_${catNum}_description`, SPAN_OPEN, SPAN_CLOSE));
    log.push(`category card ${catNum}: missing descriptor added + gated (${catPrefix})`);
    continue;
  }

  // 3. Category descriptors: setting override, else Guide description, else nothing.
  if (/<span class="blocks-item-description">/.test(line)) {
    out.push(...gated(indent, catPrefix, `category_${catNum}_description`, SPAN_OPEN, SPAN_CLOSE));
    log.push(`category card ${catNum}: descriptor gated (${catPrefix})`);
    continue;
  }

  // 4. Things to Know subheader, under the section title.
  if (/<h2 class="section-title">/.test(line)) {
    out.push(line);
    out.push(pad(indent, '{{#if settings.things_to_know_subtitle}}'));
    out.push(pad(indent, '  <p class="section-subtitle">{{settings.things_to_know_subtitle}}</p>'));
    out.push(pad(indent, '{{/if}}'));
    log.push('things-to-know subtitle added');
    continue;
  }

  // 5. Card descriptors: setting override, else Guide description, else nothing.
  if (/<p class="card-description">/.test(line)) {
    out.push(...gated(indent, cardPrefix, `card_${cardNum}_description`, P_OPEN, P_CLOSE));
    log.push(`card ${cardNum}: descriptor gated (${cardPrefix})`);
    continue;
  }

  // 6. Contact subtitle currently renders an empty <p> when unset.
  if (/<p class="contact-subtitle">/.test(line)) {
    out.push(pad(indent, '{{#if settings.contact_subtitle}}'));
    out.push(pad(indent, '  <p class="contact-subtitle">{{settings.contact_subtitle}}</p>'));
    out.push(pad(indent, '{{/if}}'));
    log.push('contact subtitle gated');
    continue;
  }

  out.push(line);
}

fs.writeFileSync(OUT, out.join('\n'));
log.forEach((l) => console.log('  ' + l));
console.log(`\n${log.length} edits, ${lines.length} -> ${out.length} lines`);
