/* Purpose: proves the translation layer (frontend/i18n.js, ADR 0047) translates, falls back to English, fills
   {patterns}, never translates the student's own words, and that every text the app passes to t() has a German,
   French and Spanish entry. Run with node --test frontend/test/i18n.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FRONTEND = path.join(__dirname, '..');
const I18n = require('../i18n.js');
const dictionaries = { de: require('../i18n/de.js'), fr: require('../i18n/fr.js'), es: require('../i18n/es.js') };
for (const [language, entries] of Object.entries(dictionaries)) I18n.add(language, entries);

function inLanguage(language, fn) {
  I18n.setLanguage(language);
  try { return fn(); } finally { I18n.setLanguage('en'); }
}

test('English is the default and returns the key itself', () => {
  assert.equal(I18n.language(), 'en');
  assert.equal(I18n.t('Not now'), 'Not now');
});

test('returns the translation in the chosen language', () => {
  assert.equal(inLanguage('de', () => I18n.t('Not now')), 'Nicht jetzt');
  assert.equal(inLanguage('fr', () => I18n.t('Not now')), 'Pas maintenant');
  assert.equal(inLanguage('es', () => I18n.t('Not now')), 'Ahora no');
});

test('falls back to English when a text has no translation', () => {
  assert.equal(inLanguage('de', () => I18n.t('A text nobody translated')), 'A text nobody translated');
});

test('an unknown language falls back to English', () => {
  I18n.setLanguage('xx');
  assert.equal(I18n.language(), 'en');
});

test('fills {patterns} in English and in a translation', () => {
  assert.equal(I18n.t('Step {n} of {total}', { n: 2, total: 3 }), 'Step 2 of 3');
  assert.equal(inLanguage('de', () => I18n.t('Step {n} of {total}', { n: 2, total: 3 })), 'Schritt 2 von 3');
});

test("never translates the student's own words, even when they match a dictionary key", () => {
  const title = 'Undo';
  assert.equal(inLanguage('de', () => I18n.t('Added "{title}".', { title })), '„Undo“ hinzugefügt.');
});

test('a value that looks like a pattern is inserted as typed', () => {
  assert.equal(I18n.t('Added "{title}".', { title: 'read {n} pages' }), 'Added "read {n} pages".');
});

// Every literal passed to t('…') or I18n.t('…') in the frontend, so a new text cannot ship in English only.
function textsUsedInCode() {
  const files = fs.readdirSync(FRONTEND).filter((name) => /\.(js|html)$/.test(name) && name !== 'i18n.js');
  const found = new Set();
  const call = /(?:^|[^\w$.])(?:I18n\.)?t\(\s*'((?:[^'\\]|\\.)*)'/g;
  for (const name of files) {
    const source = fs.readFileSync(path.join(FRONTEND, name), 'utf8');
    for (const match of source.matchAll(call)) found.add(match[1].replace(/\\'/g, "'"));
  }
  return [...found];
}

test('every text passed to t() has a German, French and Spanish entry', () => {
  const missing = [];
  for (const text of textsUsedInCode()) {
    for (const [language, entries] of Object.entries(dictionaries)) {
      if (!Object.prototype.hasOwnProperty.call(entries, text)) missing.push(`${language}: ${text}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('the three dictionaries hold the same texts', () => {
  const keys = (entries) => Object.keys(entries).sort();
  assert.deepEqual(keys(dictionaries.fr), keys(dictionaries.de));
  assert.deepEqual(keys(dictionaries.es), keys(dictionaries.de));
});

test('each translation keeps the {patterns} of its English text', () => {
  const patterns = (text) => (text.match(/\{\w+\}/g) || []).sort().join(' ');
  const broken = [];
  for (const [language, entries] of Object.entries(dictionaries)) {
    for (const [english, translated] of Object.entries(entries)) {
      if (patterns(english) !== patterns(translated)) broken.push(`${language}: ${english}`);
    }
  }
  assert.deepEqual(broken, []);
});
