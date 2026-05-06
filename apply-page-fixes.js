#!/usr/bin/env node
/**
 * apply-page-fixes.js
 *
 * Applies consistent fixes to every theme page (`on-*.html`), every reading-list
 * detail page (`list-*.html`), and `cv.html` and `projects.html`:
 *
 *   - Ensure <html lang="en">
 *   - Ensure <meta charset> and <meta name="viewport">
 *   - Move stray <body> tags that appear before </head> (real bug in on-existence.html)
 *   - Drop italic wrapping around header <h1> (real bug on at least on-purpose.html, on-age.html)
 *   - Normalize header subtitle: <h3 class="subtitle"> -> <p class="subtitle">
 *   - Add `current-page` class to the nav link matching the filename
 *   - Add a skip-link before <header> if missing
 *   - Insert <hr class="divider"> before .navigation-links if missing
 *   - Insert "|" separator between two adjacent navigation-links anchors if missing
 *   - Add aria-hidden="true" to <i> Font Awesome icons (decorative)
 *   - Add per-page Open Graph + canonical + favicon tags if missing
 *
 * Usage:
 *   node apply-page-fixes.js                 # apply in-place
 *   node apply-page-fixes.js --dry-run       # preview changes only
 *   node apply-page-fixes.js --backup        # write .bak files before saving
 *
 * The script is idempotent — running twice is safe.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SITE_BASE = 'https://davidkendallcasey.github.io/personalwebsite';
const OG_IMAGE  = `${SITE_BASE}/images/DKC.png`;

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const BACKUP  = args.has('--backup');

/* -------------------------------------------------------------------------- */
/* File discovery                                                             */
/* -------------------------------------------------------------------------- */

function targetFiles() {
  const all = fs.readdirSync(ROOT);
  const out = [];
  for (const f of all) {
    if (!f.endsWith('.html')) continue;
    if (
      f === 'index.html' ||
      f === 'commonplace.html' ||
      f === 'reading-lists.html'
    ) continue; // These have hand-written replacements.
    if (
      /^on-.+\.html$/.test(f) ||
      /^list-.+\.html$/.test(f) ||
      f === 'cv.html' ||
      f === 'projects.html'
    ) out.push(f);
  }
  return out.sort();
}

/* -------------------------------------------------------------------------- */
/* Title / metadata helpers                                                   */
/* -------------------------------------------------------------------------- */

function deriveTitle(filename, html) {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (m) return m[1].trim();
  return path.basename(filename, '.html')
    .replace(/^on-/, 'On ')
    .replace(/^list-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function deriveDescription(filename, title) {
  if (filename === 'cv.html')        return 'Curriculum vitae of David Kendall Casey.';
  if (filename === 'projects.html')  return 'Projects by David Kendall Casey.';
  if (filename.startsWith('list-'))  return `Reading list: ${title}.`;
  return `Quotes and passages: ${title}.`;
}

/* -------------------------------------------------------------------------- */
/* Individual transforms                                                      */
/* -------------------------------------------------------------------------- */

const transforms = [
  /* 1. <html> lang attribute --------------------------------------------- */
  {
    name: 'html-lang',
    apply(src) {
      if (/<html\b[^>]*\blang\s*=/i.test(src)) return src;
      return src.replace(/<html\b([^>]*)>/i, '<html lang="en"$1>');
    },
  },

  /* 2. Stray <body> before </head> (on-existence.html) ------------------- */
  {
    name: 'fix-stray-body-in-head',
    apply(src) {
      // Pattern: ...<body>...</head>...  -> ...</head>...<body>...
      const re = /(<link[^>]*>\s*)<body>\s*<\/head>/i;
      if (!re.test(src)) return src;
      return src.replace(re, '$1</head>\n<body>');
    },
  },

  /* 3. Header h1 wrapped in italics -------------------------------------- */
  {
    name: 'unitalicize-h1',
    apply(src) {
      return src.replace(
        /(<h1[^>]*>)\s*<i>([^<]*)<\/i>\s*(<\/h1>)/gi,
        '$1$2$3'
      );
    },
  },

  /* 4. Subtitle <h3> -> <p> ---------------------------------------------- */
  {
    name: 'normalize-subtitle',
    apply(src) {
      return src.replace(
        /<h3(\s+class\s*=\s*["']subtitle["'])\s*>([\s\S]*?)<\/h3>/gi,
        '<p$1>$2</p>'
      );
    },
  },

  /* 5. Viewport meta tag ------------------------------------------------- */
  {
    name: 'viewport-meta',
    apply(src) {
      if (/<meta[^>]*\bname\s*=\s*["']viewport["']/i.test(src)) return src;
      return src.replace(
        /(<meta[^>]*\bcharset\b[^>]*>)/i,
        '$1\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    },
  },

  /* 6. Favicon ----------------------------------------------------------- */
  {
    name: 'favicon',
    apply(src) {
      if (/<link[^>]*\brel\s*=\s*["']icon["']/i.test(src)) return src;
      return src.replace(
        /(<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']stylesheet\.css["'][^>]*>)/i,
        '<link rel="icon" type="image/png" href="images/favicon.png">\n    $1'
      );
    },
  },

  /* 7. Canonical link ---------------------------------------------------- */
  {
    name: 'canonical',
    apply(src, ctx) {
      if (/<link[^>]*\brel\s*=\s*["']canonical["']/i.test(src)) return src;
      const url = `${SITE_BASE}/${ctx.filename}`;
      return src.replace(
        /(<\/title>)/i,
        `$1\n    <link rel="canonical" href="${url}">`
      );
    },
  },

  /* 8. Open Graph + description ----------------------------------------- */
  {
    name: 'og-meta',
    apply(src, ctx) {
      if (/<meta[^>]*\bproperty\s*=\s*["']og:title["']/i.test(src)) return src;
      const title = deriveTitle(ctx.filename, src);
      const desc = deriveDescription(ctx.filename, title.replace(/\s*[—-]\s*David Kendall Casey$/i, ''));
      const url = `${SITE_BASE}/${ctx.filename}`;
      const og = `
    <meta name="description" content="${escapeAttr(desc)}">
    <meta property="og:title" content="${escapeAttr(title)}">
    <meta property="og:description" content="${escapeAttr(desc)}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">`;
      // Insert before </head>
      return src.replace(/<\/head>/i, `${og}\n</head>`);
    },
  },

  /* 9. Skip link --------------------------------------------------------- */
  {
    name: 'skip-link',
    apply(src) {
      if (/class\s*=\s*["']skip-link["']/i.test(src)) return src;
      return src.replace(
        /<body([^>]*)>\s*/i,
        '<body$1>\n    <a href="#main" class="skip-link">Skip to content</a>\n    '
      );
    },
  },

  /* 10. Add id="main" to <main> ----------------------------------------- */
  {
    name: 'main-id',
    apply(src) {
      if (/<main\b[^>]*\bid\s*=/i.test(src)) return src;
      return src.replace(/<main\b/i, '<main id="main"');
    },
  },

  /* 11. current-page class on matching nav link ------------------------- */
  {
    name: 'nav-current-page',
    apply(src, ctx) {
      const filename = ctx.filename;
      let target;
      if (filename === 'cv.html')                       target = 'cv.html';
      else if (filename === 'projects.html')            target = 'projects.html';
      else if (filename.startsWith('on-'))              target = 'commonplace.html';
      else if (filename.startsWith('list-'))            target = 'reading-lists.html';
      if (!target) return src;

      // Only operate inside the first <nav>...</nav> block.
      const navRe = /(<nav\b[^>]*>)([\s\S]*?)(<\/nav>)/i;
      const navMatch = src.match(navRe);
      if (!navMatch) return src;

      const navOpen  = navMatch[1];
      const navInner = navMatch[2];
      const navClose = navMatch[3];

      // Already marked? leave alone.
      const linkRe = new RegExp(
        `<a\\s+href\\s*=\\s*["']${target}["']([^>]*)>`,
        'i'
      );
      const linkMatch = navInner.match(linkRe);
      if (!linkMatch) return src;
      if (/\bcurrent-page\b/.test(linkMatch[0])) return src;

      let updatedAttrs = linkMatch[1];
      if (/\bclass\s*=\s*["']/.test(updatedAttrs)) {
        updatedAttrs = updatedAttrs.replace(
          /class\s*=\s*["']([^"']*)["']/i,
          (_, c) => `class="${c} current-page"`
        );
      } else {
        updatedAttrs = ` class="current-page"${updatedAttrs}`;
      }
      const updatedLink = `<a href="${target}"${updatedAttrs}>`;
      const updatedInner = navInner.replace(linkRe, updatedLink);
      return src.replace(navRe, navOpen + updatedInner + navClose);
    },
  },

  /* 12. aria-hidden on Font Awesome <i> icons --------------------------- */
  {
    name: 'aria-hidden-fa',
    apply(src) {
      // Match <i ... class="...fa-..."...> without aria-hidden, add it.
      return src.replace(
        /<i\b([^>]*\bclass\s*=\s*["'][^"']*\bfa[a-z-]*\b[^"']*["'][^>]*)>/gi,
        (m, attrs) => /\baria-hidden\s*=/i.test(attrs) ? m : `<i${attrs} aria-hidden="true">`
      );
    },
  },

  /* 13. Insert <hr class="divider"> before .navigation-links if missing - */
  {
    name: 'divider-before-nav-links',
    apply(src) {
      // Find each <div class="navigation-links">
      const re = /([\s\S]{0,60})(<div\s+class\s*=\s*["']navigation-links["'])/gi;
      return src.replace(re, (whole, lead, tag) => {
        if (/<hr[^>]*\bclass\s*=\s*["']divider["'][^>]*>\s*$/i.test(lead)) return whole;
        return `${lead}<hr class="divider">\n        ${tag}`;
      });
    },
  },

  /* 14. Insert "|" separator inside .navigation-links if missing -------- */
  {
    name: 'separator-in-nav-links',
    apply(src) {
      return src.replace(
        /(<div\s+class\s*=\s*["']navigation-links["'][^>]*>)([\s\S]*?)(<\/div>)/gi,
        (_, open, body, close) => {
          // Collapse runs of two anchors with only whitespace between them.
          const fixed = body.replace(
            /(<\/a>)(\s*)(<a\b)/gi,
            (m, end, ws, start) =>
              /\|/.test(ws) ? m : `${end}\n            |\n            ${start}`
          );
          return `${open}${fixed}${close}`;
        }
      );
    },
  },

  /* 15. Remove orphan inline TODO comment in nav ------------------------ */
  {
    name: 'cleanup-nav-comment',
    apply(src) {
      return src.replace(/<!--\s*ADD THIS LINE\s*-->/g, '');
    },
  },
];

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/* -------------------------------------------------------------------------- */
/* Driver                                                                     */
/* -------------------------------------------------------------------------- */

function applyAll(filename, src) {
  const ctx = { filename };
  const changed = [];
  let out = src;
  for (const t of transforms) {
    const before = out;
    out = t.apply(out, ctx);
    if (out !== before) changed.push(t.name);
  }
  return { out, changed };
}

function main() {
  const files = targetFiles();
  if (!files.length) {
    console.error('No target HTML files found.');
    process.exit(1);
  }

  let totalChanged = 0;
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const src = fs.readFileSync(fullPath, 'utf8');
    const { out, changed } = applyAll(file, src);

    if (out === src) {
      console.log(`  ${file}: no change`);
      continue;
    }

    totalChanged++;
    console.log(`${DRY_RUN ? '[dry-run] ' : ''}${file}: ${changed.join(', ')}`);

    if (!DRY_RUN) {
      if (BACKUP) fs.writeFileSync(`${fullPath}.bak`, src);
      fs.writeFileSync(fullPath, out);
    }
  }

  console.log(`\n${DRY_RUN ? 'Would update' : 'Updated'} ${totalChanged}/${files.length} file(s).`);
}

main();
