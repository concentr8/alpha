// Purpose: the translation layer of Concentr8 (way B of docs/plans/languages.md, ADR 0047). English text is the key:
//          t('Not now') returns the text in the current language, or the English text when no translation exists.
//          Values such as a to-do title are filled in AFTER translating, so the student's own words are never translated.
// Called by: page scripts through window.I18n.t(); frontend/i18n/de.js, fr.js, es.js register their dictionaries with
//            window.I18n.add(); frontend/test/i18n.test.js loads it in Node.
// Calls: nothing. Reads ?lang= from the address once.
// Convention: pass a single-quoted literal (t('Not now')), never a variable or template, so frontend/test/i18n.test.js
//             can find every text and prove it is translated.
// TODO: the language switch in Profile, Settings (CON-43). Until then everyone gets English, and ?lang=de|fr|es forces a
//       language for testing, so testers never see a half-translated app.
(function (root) {
  const SUPPORTED = ['en', 'de', 'fr', 'es'];
  const dictionaries = {};

  // Why only ?lang= for now: most of the app's 542 texts are not translated yet (CON-43); following the browser
  // language would mix German and English on one screen.
  function languageFrom(search) {
    const asked = new URLSearchParams(search || '').get('lang');
    return SUPPORTED.includes(asked) ? asked : 'en';
  }

  let current = languageFrom(root.location && root.location.search);

  // Fills {name} patterns from values. The replacement text is not scanned again, so a title like "{n}" stays as typed.
  function fill(text, values) {
    if (!values) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match));
  }

  function t(text, values) {
    const dictionary = dictionaries[current];
    const translated = dictionary && Object.prototype.hasOwnProperty.call(dictionary, text) ? dictionary[text] : text;
    return fill(translated, values);
  }

  function add(language, entries) { dictionaries[language] = Object.assign(dictionaries[language] || {}, entries); }
  function setLanguage(language) { current = SUPPORTED.includes(language) ? language : 'en'; applyToPage(); }
  function language() { return current; }

  // <html lang> follows the language, so screen readers pronounce the text correctly.
  function applyToPage() {
    if (root.document && root.document.documentElement) root.document.documentElement.lang = current;
  }

  applyToPage();
  const api = { t, add, setLanguage, language, SUPPORTED };
  root.I18n = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
