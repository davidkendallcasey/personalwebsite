# Website patch — David Kendall Casey

This patch addresses every item from the review. Apply in the order below.

## What's in the box

| File                          | Action                                                                      |
|-------------------------------|-----------------------------------------------------------------------------|
| `stylesheet.css`              | Drop-in replacement. Consolidated, dedup'd, fixed conflicts. Adds skip link, drop caps, mobile nav, print stylesheet. |
| `index.html`                  | Drop-in replacement. Loads `quotes.json` (one fetch), accessible, race-condition guarded. |
| `commonplace.html`            | Drop-in replacement. Fixed metadata, `current-page`, subtitle. |
| `reading-lists.html`          | Drop-in replacement. Empty placeholder columns removed; metadata added. |
| `build-quotes.js`             | Node script — generates `quotes.json` from your `on-*.html` files. Zero deps. |
| `apply-page-fixes.js`         | Node script — patches every `on-*.html`, `list-*.html`, `cv.html`, `projects.html` in place. Idempotent. |
| `.github/workflows/build.yml` | Optional. Auto-rebuilds `quotes.json` and runs page-fix in CI on push. |

I deliberately did **not** rewrite `cv.html`, `projects.html`, or any `on-*.html` / `list-*.html` files — your content stays untouched. The script handles the structural fixes consistently.

## Apply order

1. Drop `stylesheet.css`, `index.html`, `commonplace.html`, `reading-lists.html` into your repo root, replacing the existing versions.

2. Run the page-fix script (preview first):

   ```bash
   node apply-page-fixes.js --dry-run
   node apply-page-fixes.js --backup    # makes .bak files
   ```

   This applies, in place, to every `on-*.html`, `list-*.html`, `cv.html`, and `projects.html`:

   - `<html lang="en">` if missing
   - `<meta name="viewport">` if missing
   - Stray `<body>` before `</head>` (this is a real bug in `on-existence.html`)
   - `<h1><i>...</i></h1>` → `<h1>...</h1>` (real bug on `on-purpose.html`, `on-age.html`)
   - `<h3 class="subtitle">` → `<p class="subtitle">`
   - `class="current-page"` on the matching nav link
   - `<a href="#main" class="skip-link">` at top of `<body>`
   - `id="main"` on `<main>`
   - Per-page Open Graph + canonical + favicon + description
   - `aria-hidden="true"` on Font Awesome `<i>` icons
   - `<hr class="divider">` before `.navigation-links` if missing
   - `|` separator between `.navigation-links` anchors if missing
   - Removes orphan `<!-- ADD THIS LINE -->` comments

3. Generate `quotes.json` (the new home page reads this):

   ```bash
   node build-quotes.js
   ```

   Run again any time you edit a quote on a theme page. Or wire it into the GitHub Action below to make it automatic.

4. Commit. Confirm the home page still works — it falls back to live-scraping `commonplace.html` if `quotes.json` is missing or returns an error.

5. Add a favicon at `images/favicon.png` (any small PNG works). All pages reference it now.

## Optional: GitHub Action

Drop `.github/workflows/build.yml` into your repo. On every push to `main`, it runs `build-quotes.js` and `apply-page-fixes.js --check` (the script does not have a `--check` mode — see footnote) and commits any updated `quotes.json` back to the branch. Quotes manifest stays fresh without you remembering.

> _Footnote_: the workflow runs `build-quotes.js`, then `git diff --exit-code quotes.json` to detect drift; commits if changed. If you'd rather fail the build on stale, replace the commit step with `node build-quotes.js --check`.

## Verification checklist

After applying:

- [ ] Home page loads a daily quote within ~200 ms (one fetch, not 1–20)
- [ ] Refreshing the quote button rapidly doesn't show flicker between picks (race-condition guard works)
- [ ] Tabbing into the page reveals the skip-link in the top-left
- [ ] Active nav item is highlighted on every page (Home / Index / Lists / CV / Projects)
- [ ] CV prints cleanly (Cmd-P → Print) with no nav, no dark background, no decorative dividers
- [ ] Sharing any theme page on Twitter/Slack/Discord shows a proper preview card
- [ ] DevTools Lighthouse: Accessibility ≥ 95, Best Practices ≥ 95
- [ ] No console errors on any page

## What I did NOT change

- The dynamic search code (`dynamic-search.js`, `add-quote-ids.js`, `share-quote.js`, `quote-audio.js`) — they're not visible in the project files I have access to. Worth a separate pass when you have time.
- Your color palette, fonts, dividers, ornament, or any of the literary aesthetic choices. Those are intentional and good.
- Quote content itself.

## Drop-cap option

I added an opt-in drop-cap class. To use it on a quote:

```html
<div class="quote-entry has-dropcap">...
```

Apply selectively — looks awkward on quotes that begin with `"`, ellipses, or one-word sentences.
