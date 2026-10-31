#!/usr/bin/env node
/*
 * Purpose: counts the English texts a student can see in the app, so we know how much there is to translate
 *          (docs/plans/languages.md, step 0). It changes nothing; it only reads and prints.
 * Called by: a person, from the repo root: `node scripts/count-strings.js` (add `--list` to print every text,
 *            `--json` for machine output).
 * Calls: reads frontend/index.html, frontend/concentr8-server.js and frontend/concentr8-blocker.js.
 *
 * Why it only estimates: the texts sit in HTML and inside JavaScript strings. Without a JavaScript parser we cannot
 * be sure about every string, so we use plain rules (below) and sort the result into "sure" and "unsure".
 * The real check comes in step 1: a test that renders each page and fails on any untranslated text.
 */
const fs = require('fs');
const path = require('path');

const FRONTEND = path.join(__dirname, '..', 'frontend');
const FILES = ['index.html', 'concentr8-server.js', 'concentr8-blocker.js'];
const TEXT_ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt', 'aria-description'];

function readFile(name) {
  return fs.readFileSync(path.join(FRONTEND, name), 'utf8');
}

// Collapse whitespace so the same text written over two lines counts once.
function clean(text) {
  return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// Splits index.html into its parts: CSS is skipped, scripts are read as JavaScript, the rest is markup.
function splitHtml(html) {
  const scripts = [];
  const markup = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, code) => {
      const source = /data-source="([^"]+)"/.exec(attrs);
      if (code.trim()) scripts.push({ name: source ? source[1] : 'inline script', code });
      return '';
    });
  return { markup, scripts };
}

// Texts in a piece of markup: the words between tags, plus a few attributes people hear or read.
function textsFromMarkup(markup) {
  const found = [];
  const withoutComments = markup.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of withoutComments.matchAll(/>([^<>]+)</g)) found.push(clean(match[1]));
  for (const attribute of TEXT_ATTRIBUTES) {
    const pattern = new RegExp(`\\s${attribute}="([^"]*)"`, 'g');
    for (const match of withoutComments.matchAll(pattern)) found.push(clean(match[1]));
  }
  return found;
}

// Every quoted string in JavaScript code ('..', "..", `..`), without the ones that are clearly not for people.
function stringLiterals(code) {
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const found = [];
  for (const match of withoutComments.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    found.push(match[1] ?? match[2] ?? match[3]);
  }
  return found;
}

// Placeholders like ${name} stay in the text as {n}: they are exactly what a translation pattern needs.
function normalise(raw) {
  return clean(raw.replace(/\$\{[^}]*\}/g, '{n}').replace(/\\n/g, ' ').replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

// "sure": reads like a sentence or label. "unsure": a single capitalised word (could be a name or a code).
function classify(text) {
  if (!/[A-Za-z]{2}/.test(text)) return null;
  if (/^(https?:|\/|\.|#|\[|@|--|data:)/.test(text)) return null;
  if (/[{};=]|=>|\bfunction\b|\bconst\b|\breturn\b/.test(text.replace(/\{n\}/g, ''))) return null;
  if (/^[a-z][a-zA-Z0-9]*(:[a-z0-9-]+)*$/.test(text)) return null; // camelCase names, event names, ids
  if (/^[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i.test(text)) return null; // file names, keys
  if (/^[A-Z0-9_]+$/.test(text)) return null; // CONSTANTS
  if (/\s/.test(text.replace(/\{n\}/g, 'x'))) return 'sure';
  return /^[A-Z][a-z]{2,}$/.test(text) ? 'unsure' : null;
}

// HTML written inside a JavaScript string is split into its texts first.
function textsFromLiteral(raw) {
  if (/<[a-z][^>]*>/i.test(raw)) return textsFromMarkup(raw).map(normalise);
  return [normalise(raw)];
}

function collect() {
  const bySource = {};
  const add = (source, text) => {
    const kind = classify(text);
    if (!kind) return;
    bySource[source] = bySource[source] || new Map();
    bySource[source].set(text, kind);
  };
  const html = readFile('index.html');
  const { markup, scripts } = splitHtml(html);
  textsFromMarkup(markup).forEach((text) => add('index.html markup', normalise(text)));
  for (const script of scripts) {
    stringLiterals(script.code).forEach((raw) => textsFromLiteral(raw).forEach((t) => add(`index.html ${script.name}`, t)));
  }
  for (const file of FILES.slice(1)) {
    stringLiterals(readFile(file)).forEach((raw) => textsFromLiteral(raw).forEach((t) => add(file, t)));
  }
  return bySource;
}

function summarise(bySource) {
  const unique = new Map();
  const rows = [];
  for (const [source, texts] of Object.entries(bySource)) {
    let sure = 0;
    let unsure = 0;
    for (const [text, kind] of texts) {
      if (kind === 'sure') sure += 1;
      else unsure += 1;
      unique.set(text, kind);
    }
    rows.push({ source, sure, unsure });
  }
  let words = 0;
  let sureTotal = 0;
  for (const [text, kind] of unique) {
    if (kind === 'sure') sureTotal += 1;
    words += text.split(' ').length;
  }
  return { rows, uniqueTotal: unique.size, sureTotal, unsureTotal: unique.size - sureTotal, words, unique };
}

function main() {
  const args = process.argv.slice(2);
  const summary = summarise(collect());
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...summary, unique: [...summary.unique] }, null, 2));
    return;
  }
  console.log('Source'.padEnd(34) + 'sure'.padStart(7) + 'unsure'.padStart(8));
  for (const row of summary.rows) console.log(row.source.padEnd(34) + String(row.sure).padStart(7) + String(row.unsure).padStart(8));
  console.log(`\nDifferent texts: ${summary.uniqueTotal} (${summary.sureTotal} sure, ${summary.unsureTotal} single words)`);
  console.log(`Words to translate (once per language): about ${summary.words}`);
  if (args.includes('--list')) {
    console.log('');
    for (const [text, kind] of summary.unique) console.log(`${kind === 'sure' ? ' ' : '?'} ${text}`);
  }
}

main();
