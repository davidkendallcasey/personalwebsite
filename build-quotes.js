#!/usr/bin/env node
/**
 * build-quotes.js
 *
 * Scans every `on-*.html` file in the project root and emits `quotes.json`,
 * a flat manifest of every quote on the site. The home page fetches this
 * single file once instead of fetching individual theme pages one at a time
 * until it finds an unseen quote.
 *
 * Usage:
 *   node build-quotes.js                 # writes quotes.json to cwd
 *   node build-quotes.js --check         # exits 1 if quotes.json is stale
 *
 * Run automatically on push via .github/workflows/build-quotes.yml (optional).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT_FILE = path.join(ROOT, 'quotes.json');
const CHECK_MODE = process.argv.includes('--check');

/**
 * Extract every <div class="quote-entry">...</div> block, ignoring nesting
 * (these are flat in this codebase). We use a simple state machine over the
 * source text rather than a full DOM library so the build has zero deps.
 *
 * Returns: [{ openTag, inner }, ...]
 */
function extractQuoteEntries(html) {
  const entries = [];
  const openTag = /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bquote-entry\b[^"']*["'][^>]*>/gi;
  let match;
  while ((match = openTag.exec(html)) !== null) {
    const fullOpenTag = match[0];
    const start = match.index + fullOpenTag.length;
    let depth = 1;
    let i = start;
    const len = html.length;
    while (i < len && depth > 0) {
      const nextOpen = html.indexOf('<div', i);
      const nextClose = html.indexOf('</div>', i);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        i = nextOpen + 4;
      } else {
        depth--;
        i = nextClose + 6;
      }
    }
    entries.push({ openTag: fullOpenTag, inner: html.slice(start, i - 6) });
  }
  return entries;
}

/** Pull the inner HTML of the first <blockquote>...</blockquote>. */
function extractBlockquote(entryHtml) {
  const m = entryHtml.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i);
  return m ? m[1].trim() : null;
}

/** Pull the inner text of the <p class="source">...</p>, strip tags. */
function extractSource(entryHtml) {
  const m = entryHtml.match(/<p\b[^>]*\bclass\s*=\s*["'][^"']*\bsource\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return 'Unknown Source';
  return m[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .trim();
}

/** Read the page title from data-page-title or derive it from the filename. */
function derivePageTitle(openTag, filename) {
  const m = openTag.match(/data-page-title\s*=\s*["']([^"']+)["']/i);
  if (m) {
    return m[1]
      .replace(/&amp;/g, '&')
      .replace(/&ldquo;/g, '\u201C')
      .replace(/&rdquo;/g, '\u201D');
  }
  const slug = filename.replace(/\.html$/, '').replace(/^on-/, '').replace(/-/g, ' ');
  return 'On ' + slug.replace(/\b\w/g, c => c.toUpperCase());
}

function buildManifest() {
  const files = fs.readdirSync(ROOT)
    .filter(f => /^on-.+\.html$/.test(f))
    .sort();

  if (!files.length) {
    console.error('No on-*.html files found in', ROOT);
    process.exit(1);
  }

  const all = [];
  let skipped = 0;

  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const entries = extractQuoteEntries(html);

    entries.forEach((entry, index) => {
      const quoteHTML = extractBlockquote(entry.inner);
      if (!quoteHTML) { skipped++; return; }
      const sourceText = extractSource(entry.inner);
      const pageTitle = derivePageTitle(entry.openTag, file);
      all.push({
        id: `${file}#${index}`,
        page: file,
        pageTitle,
        quoteHTML,
        sourceText,
      });
    });
  }

  return { all, files: files.length, skipped };
}

/* ---------- main ---------- */

const { all, files, skipped } = buildManifest();
const json = JSON.stringify(all, null, 2) + '\n';

if (CHECK_MODE) {
  let existing = '';
  try { existing = fs.readFileSync(OUT_FILE, 'utf8'); } catch { /* missing is fine */ }
  if (existing !== json) {
    console.error(`quotes.json is stale (${all.length} quotes from ${files} pages). Run: node build-quotes.js`);
    process.exit(1);
  }
  console.log(`quotes.json is up to date (${all.length} quotes).`);
  process.exit(0);
}

fs.writeFileSync(OUT_FILE, json);
console.log(`Wrote ${OUT_FILE}: ${all.length} quotes from ${files} pages${skipped ? ` (${skipped} entries skipped — no <blockquote>)` : ''}.`);
