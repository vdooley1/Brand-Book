# Success Center — descriptors & subheaders

Adds supporting copy to the Jasper Success Center (Zendesk Guide, Artera theme):

- **Subheaders** — a line under a heading ("Everything you need to get set up,
  get comfortable, and get the most out of Jasper").
- **Descriptors** — a line under a card title ("Hands-on how-to sessions with
  our Customer Success team").

`templates/home_page.hbs` is a **complete, ready-to-paste replacement** for the
theme's `home_page.hbs`, generated from the live file you supplied.
`home_page.original.hbs` is that live file, unmodified, so you can diff the two.

## Install

1. Replace the theme's `templates/home_page.hbs` with `templates/home_page.hbs`.
2. Append `styles/descriptors.css` to the end of the theme's `style.css`.
3. Merge the object in `manifest-settings.json` into the `settings` array in the
   theme's `manifest.json`.
4. Zip and import as a new theme. Preview before publishing.

Nothing renders until you fill in the settings, and every new element is
conditional — so step 1 alone changes the page in exactly one way (see "Bug
fixed" below). It's safe to ship the template first and write the copy after.

## What changed in home_page.hbs

27 edits. Diff against `home_page.original.hbs` to see them all.

**Two new subheaders**

| Where | Setting | Class |
|---|---|---|
| Under the hero H1, above the search box | `homepage_welcome_subtitle` | `.hero-subtitle` |
| Under the Things to Know section title | `things_to_know_subtitle` | `.section-subtitle` |

**Descriptor overrides** — 14 new settings (`category_1..4_description`,
`card_1..10_description`). Each card now resolves its descriptor in this order:

1. the theme setting, if set — lets you write home-page-specific copy
2. otherwise the category/section description from Guide
3. otherwise nothing is rendered at all

That third step matters: the original template printed
`<p class="card-description">{{excerpt description}}</p>` unconditionally, so
every card whose category has no description in Guide emitted an empty
paragraph and paid for its margin. Same for `contact_subtitle`, which rendered
an empty `<p>` whenever it was unset. Those are now wrapped in `{{#if}}`.

**Bug fixed** — category card 1 in the featured-categories block was missing its
`<span class="blocks-item-description">` entirely; cards 2, 3 and 4 had it. So
"Get Started" could never show a descriptor no matter what you typed in Guide.
Card 1 now matches the other three. This is the one change that alters the page
without you configuring anything — and only if that category has a description
in Guide.

## Where the copy lives

Guide descriptions are the better home for this: **Guide → Arrange content →
edit category/section**, no theme deploy per copy change, and the same text
then shows on the category and section pages too. Use the `*_description`
settings only when the home page needs to say something different.

## Testing

```
npm install
npm test
```

`test/home_page.test.js` compiles the template with real Handlebars (with
stand-ins for the `is` and `excerpt` Curlybars helpers) and renders it against
mock Guide data — 16 assertions covering both subheaders, setting-overrides-win,
Guide-description fallback, empty descriptions producing no element, and a
render with zero settings configured.

The assertions worth knowing about are the `../../` ones. Each Things to Know
card has two branches: a category branch nested one `{{#each}}` deep, and a
section branch nested two deep (`{{#each categories}}{{#each sections}}`). A
settings lookup needs `../` in the first and `../../` in the second — get it
wrong and the descriptor silently renders blank rather than erroring. The test
exercises both branches for exactly this reason.

`test/descriptors.test.js` covers the optional script (below).

## Regenerating after an Artera update

```
# replace templates/home_page.original.hbs with the new upstream file
node tools/transform.js && npm test
```

`tools/transform.js` applies all 27 edits by pattern, so you re-run it rather
than re-merging by hand. It derives each card's `../` depth from the
neighbouring `settings.card_N_image` reference, so it stays correct even if
Artera reorders or adds cards.

## The other files

`templates/category_page.hbs` and `templates/section_page.hbs` are **snippets,
not full files** — I don't have those two files from your theme. They show
where to print `category.description` and `section.description` so descriptors
carry through to the inner pages. Send me those files and I'll convert them the
same way as the home page.

`scripts/descriptors.js` is an optional no-template path: it reads descriptions
from the Help Center API and injects them client-side. With the template
installed you don't need it for the home page — it's there for the category and
section pages until those are converted. It skips any card or heading that
already shows copy, so it won't double up on what the template renders.

## Not included

The mockup shows a second card grid ("More Resources": Live Training, Courses,
Customer Stories, Blog) that doesn't exist in the current template — those four
aren't Zendesk categories, so they'd need their own settings-driven block
rather than descriptors on existing cards. That's a separate change from
descriptors and subheaders; say the word and I'll add it.

One thing I'd flag: the Things to Know section is ~600 of the template's 624
lines, because 10 cards × 2 branches are spelled out longhand. It works, and I
left the structure alone deliberately, but it could collapse to a single loop
over a card list. Worth doing if you ever need an 11th card.
