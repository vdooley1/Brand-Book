# Success Center — descriptors & subheaders

Drop-in code that adds two things to the Jasper Success Center (Zendesk Guide,
Artera theme):

- **Descriptors** — a short line of supporting copy under a card or page title
  ("Hands-on how-to sessions with our Customer Success team").
- **Subheaders** — a supporting line under a section heading
  ("Live sessions, product stories, and the latest from our team").

Everything is namespaced `jsc-` and additive. Nothing here overrides an
existing Artera rule, so it survives a theme update — you re-apply the patches
rather than re-merging a fork.

## Two ways to install

Pick one. They're independent, and they can also run together (the JS skips any
card that already has a descriptor, so it won't double up on cards the
templates already handle).

| | Path A — templates | Path B — script |
|---|---|---|
| Edit `.hbs` files | Yes | No |
| Renders | Server-side, no flash | After page load |
| Copy lives in | Guide descriptions + theme settings | The `CONFIG` block in the JS |
| Best for | The permanent version | Cards with no Zendesk record behind them; a fast pilot |

**Recommendation:** Path A for the category and section cards, Path B for the
"More Resources" style cards if you don't want to add theme settings yet.

## Path A — templates

1. Download the live theme (Guide admin → **Customize design** → your theme →
   ⋯ → **Download theme**) and unzip it.
2. Append `styles/descriptors.css` to the end of `style.css`.
3. Open `templates/home_page.hbs`, `category_page.hbs` and `section_page.hbs`
   in this repo. Each is a set of commented **snippets**, not a replacement
   file — every snippet says exactly where in Artera's file it goes.
4. Merge the group in `manifest-settings.json` into the `settings` array in the
   theme's `manifest.json`. Only needed for the snippets that reference
   `settings.*`; skip it if you're only using the Guide description fields.
5. Zip the theme folder (zip the *contents*, not the enclosing folder) and
   import it as a new theme. Preview before publishing.

The category and section descriptors read Zendesk's built-in `description`
field, so the content team edits them in **Guide → Arrange content → edit
category/section** — no theme deploy per copy change.

## Path B — script

1. Append `styles/descriptors.css` to the end of `style.css`.
2. Append `scripts/descriptors.js` to the end of `script.js`.
3. Edit the `CONFIG` block at the top of the script: `subheaders` is keyed on
   the exact heading text, `manualDescriptors` on the exact card title text.
   Both are matched case-insensitively with whitespace collapsed.
4. Import and preview.

`useApiDescriptions: true` makes the script read real category and section
descriptions from `/api/v2/help_center/{locale}/{categories,sections}.json` and
match them to cards by the record ID in each card's href. That means Path B
also picks up copy the content team writes in Guide. An entry in
`manualDescriptors` wins over the API value for the same card, so you can
override a description on the home page without changing it in Guide.

If the API call fails the script logs a warning and the page renders exactly as
it does today.

## Testing

```
npm install
npm test
```

Runs `scripts/descriptors.js` against a mock Artera-shaped DOM with a stubbed
Help Center API and asserts 14 behaviours: subheader placement, manual copy
winning over API copy, cards that already have a description being left alone,
empty descriptions being dropped, and nav links being skipped.

## Classes

| Class | Use |
|---|---|
| `.jsc-descriptor` | Base descriptor styling |
| `.jsc-descriptor--card` | On a card; clamps to 3 lines (2 on mobile) |
| `.jsc-descriptor--page` | Under an H1; full text, larger |
| `.jsc-descriptor--list` | Compact, for list rows |
| `.jsc-subheader` | Supporting line under a section heading |
| `.jsc-subheader--centered` / `--left` | Alignment |
| `.jsc-has-subheader` | Added to the heading above a subheader; removes its bottom margin |

Sizes, colours and the line clamp are CSS custom properties on `:root` at the
top of `descriptors.css` — change them there rather than editing rules.

## Notes

- Zendesk stores category/section descriptions as **plain text**. The templates
  use `{{description}}` (escaped) and the script uses `textContent`, both of
  which are correct and safe. Don't switch to `{{{description}}}`.
- Descriptors inside a card link become part of that link's accessible name.
  That reads fine for one short line; if a description runs long, use the
  Path A markup and place the descriptor *outside* the `<a>`.
- If adding descriptors makes cards in a row uneven, uncomment section 3 of
  `descriptors.css` and swap `.blocks-item` for Artera's actual card class.
- **Artera's real class names.** Artera's card and heading classes vary by
  version, so the snippets show Artera-*shaped* markup (`blocks-item`,
  `blocks-item-title`, `page-header-title`) as a guide — check the theme's
  actual files and match what's there. The CSS and the script don't depend on
  those names: the CSS only styles `jsc-` classes, and the script finds cards
  structurally (a link to `/categories/` or `/sections/`, then the nearest
  card-like ancestor containing a heading).
