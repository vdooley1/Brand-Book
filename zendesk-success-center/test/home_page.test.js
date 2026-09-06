/*
 * Compiles templates/home_page.hbs and renders it with mock Guide data.
 *
 *   npm install && npm test
 *
 * Uses real Handlebars with stand-ins for the two Curlybars helpers Zendesk
 * provides (`is`, `excerpt`). The important assertions are the ../../ ones:
 * the section branch of each Things to Know card sits two `each` frames deep,
 * so a settings lookup there needs two levels of `../` to resolve.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const tpl = fs.readFileSync(
  path.join(__dirname, '..', 'templates', 'home_page.hbs'),
  'utf8'
);

// Stand-ins for the Curlybars helpers Zendesk provides.
Handlebars.registerHelper('is', function (a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('excerpt', function (text) {
  return text ? String(text).slice(0, 100) : '';
});

const render = Handlebars.compile(tpl);

const data = {
  help_center: { name: 'Jasper Success Center' },
  categories: [
    {
      name: 'Get Started',
      url: '/hc/en-us/categories/111',
      description: 'Guide copy for Get Started',
      sections: []
    },
    {
      name: 'Upskill Workflows',
      url: '/hc/en-us/categories/222',
      description: 'Guide copy for Upskill',
      sections: []
    },
    {
      name: 'Deepen Expertise',
      url: '/hc/en-us/categories/333',
      description: '', // no description in Guide, no override
      sections: []
    },
    {
      name: 'Browse by Topic',
      url: '/hc/en-us/categories/444',
      description: 'Guide copy for Browse',
      sections: [
        {
          name: 'Live Training Sessions',
          url: '/hc/en-us/sections/555',
          description: 'Guide copy for Live Training'
        },
        {
          name: 'Customer Stories',
          url: '/hc/en-us/sections/666',
          description: ''
        }
      ]
    }
  ],
  settings: {
    homepage_welcome_message: 'Jasper Success Center',
    homepage_welcome_subtitle:
      'Everything you need to get set up, get comfortable, and get the most out of Jasper',

    category_1_title: 'Get Started',
    category_2_title: 'Upskill Workflows',
    category_3_title: 'Deepen Expertise',
    category_4_title: 'Browse by Topic',
    category_2_description: 'OVERRIDE for Upskill',

    show_things_to_know_section: true,
    things_to_know_title: 'Your Learning Path with Jasper',
    things_to_know_subtitle:
      "Follow this path from your first login to mastering Jasper's full toolkit",
    view_more_text: 'View More',

    // Category-backed card, uses the Guide description.
    card_1_title: 'Get Started',
    card_1_type: 'category',

    // Category-backed card with a home-page override.
    card_2_title: 'Upskill Workflows',
    card_2_type: 'category',
    card_2_description: 'OVERRIDE for card 2',

    // Section-backed card (the ../../ branch), uses the Guide description.
    card_3_title: 'Live Training Sessions',
    card_3_type: 'section',

    // Section-backed card with an override — this is the ../../ depth test.
    card_4_title: 'Customer Stories',
    card_4_type: 'section',
    card_4_description: 'OVERRIDE for card 4 via section branch',

    contact_title: 'Need more help?'
    // contact_subtitle deliberately unset
  }
};

let html;
try {
  html = render(data);
} catch (e) {
  console.error('TEMPLATE FAILED TO RENDER:\n' + e.message);
  process.exit(1);
}

const results = [];
function check(name, pass, detail) {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass || !detail ? '' : '\n        ' + detail}`);
}
const has = (s) => html.indexOf(s) !== -1;
const count = (s) => html.split(s).length - 1;

console.log('--- subheaders ---');
check(
  'hero subtitle renders',
  has('<p class="hero-subtitle">Everything you need to get set up, get comfortable, and get the most out of Jasper</p>')
);
check(
  'things-to-know subtitle renders',
  has("<p class=\"section-subtitle\">Follow this path from your first login to mastering Jasper&#x27;s full toolkit</p>")
);
check('contact subtitle omitted when unset', !has('class="contact-subtitle"'));

console.log('\n--- category card descriptors ---');
check('card 1 (was missing entirely) now shows Guide copy', has('>Guide copy for Get Started<'));
check('card 2 override wins over Guide copy', has('>OVERRIDE for Upskill<') && !has('>Guide copy for Upskill<'));
check('card 4 falls back to Guide copy', has('>Guide copy for Browse<'));
check(
  'card 3 with empty description renders NO descriptor element',
  count('class="blocks-item-description"') === 3,
  `expected 3 descriptor spans, found ${count('class="blocks-item-description"')}`
);

console.log('\n--- things-to-know card descriptors ---');
check('card 1 (category branch) shows Guide copy', has('>Guide copy for Get Started</p>'));
check('card 2 (category branch) override wins', has('>OVERRIDE for card 2</p>'));
check('card 3 (SECTION branch, ../../) shows Guide copy', has('>Guide copy for Live Training</p>'));
check(
  'card 4 (SECTION branch, ../../) override resolves at correct depth',
  has('>OVERRIDE for card 4 via section branch</p>'),
  'the ../../settings lookup did not resolve — depth is wrong'
);
check(
  'no empty <p class="card-description"></p> anywhere',
  !/<p class="card-description">\s*<\/p>/.test(html)
);
check(
  'no empty <span class="blocks-item-description"></span> anywhere',
  !/<span class="blocks-item-description">\s*<\/span>/.test(html)
);

console.log('\n--- unset-settings safety ---');
const bare = render({
  help_center: { name: 'Jasper Success Center' },
  categories: [],
  settings: {}
});
check('renders with zero settings configured', typeof bare === 'string');
check('no hero subtitle when unset', bare.indexOf('hero-subtitle') === -1);
check('no section subtitle when unset', bare.indexOf('section-subtitle') === -1);

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
