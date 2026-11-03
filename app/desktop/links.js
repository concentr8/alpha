// Purpose: decides which addresses the page may hand to the default browser (ADR 0035).
// Called by: app/main.js (setWindowOpenHandler) and app/test/desktop.test.js.
// Calls: nothing.

// Why only http and https: "about:blank" made macOS ask "There is no application set to open the URL about:blank", and
// other schemes (file:, custom app links) could start programs on the computer from inside the page.
function opensInBrowser(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch (_) {
    return false;
  }
}

module.exports = { opensInBrowser };
