// Purpose: gets a signed-out student to Google before the app opens (ADR 0038, 0040). On the web the whole tab goes to Google;
//          the desktop app opens Google in the browser. The "Continue with Google" page here is only the way back when that failed.
// Called by: frontend/index.html (script tag, loaded after concentr8-server.js). Runs by itself on start and after signing out.
// Calls: window.Concentr8 (goToGoogle, finishGoogleTrip, signIn, isSignedIn, Google windows). When a window is blocked, Google
//        opens in the browser (ADR 0035). Google Calendar is not part of sign-in: students connect it in Settings (ADR 0039).
// AI-GENERATED: Jack has no wireframe for this page; it is built from .cal-dialog, .wire-button and .preview-note (docs/design.md).
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'cal-dialog signin-dialog';
  dialog.setAttribute('aria-labelledby', 'signin-title');
  dialog.innerHTML = '<header><h2 id="signin-title">Concentr8</h2></header>'
    + '<!-- AI-GENERATED: no wireframe from Jack for this page; built from .cal-dialog, .wire-button and .preview-note. -->'
    + '<p class="preview-note">AI generated: Jack has not drawn this page yet. It will be redrawn.</p>'
    + '<p data-signin-text>Sign in with your Google account. No invite and no phone number needed.</p>'
    // Why the inline gap: the status reads as part of the text above (same size), only 8px apart. No existing class does
    // that, and frontend/index.html is frozen (Jonas, 2026-11-03).
    + '<p data-signin-status role="status" aria-live="polite" style="margin-top:8px" hidden></p>'
    + '<div class="dialog-actions"><button class="wire-button" type="button" data-signin-browser hidden>Open in browser</button>'
    + '<button class="wire-button solid" type="button" data-signin-action>Continue with Google</button></div>';
  document.body.append(dialog);

  const $ = (name) => dialog.querySelector(`[data-signin-${name}]`);
  let busy = false;
  let browserUrl = ''; // the Google address behind "Open in browser"; it works only once, so it is cleared after the click
  let closing = false; // true only while this file closes the page itself; any other close is undone (see the close listener)

  const SIGNIN_WAIT = 'Finish signing in in your browser. Concentr8 continues by itself.';

  const status = (value) => { $('status').textContent = value; $('status').hidden = !value; };
  const hideBrowserButton = () => { browserUrl = ''; $('browser').hidden = true; };

  // Google continues in the browser: by itself in the desktop app, after a click when the browser blocked the window.
  function continueInBrowser({ blocked, url }) {
    browserUrl = blocked ? url : '';
    $('browser').hidden = !blocked;
    status(blocked ? window.Concentr8.blockedWindowText : SIGNIN_WAIT);
  }

  function openBrowser() {
    if (!browserUrl) return;
    window.Concentr8.openInBrowser(browserUrl);
    hideBrowserButton();
    status(SIGNIN_WAIT);
  }

  function hide() { closing = true; dialog.close(); }

  // The page is open exactly while nobody is signed in.
  function check() {
    const signedIn = window.Concentr8.isSignedIn();
    if (signedIn && dialog.open) hide();
    if (!signedIn && !dialog.open) { hideBrowserButton(); status(''); dialog.showModal(); }
  }

  // Why hidden: the student should see Google first, not a flash of the app. The server may need a few seconds to wake up.
  const showApp = (visible) => { document.body.style.visibility = visible ? '' : 'hidden'; };

  // The way back when going to Google directly did not work: the page below with its button, never a loop back to Google.
  function showPage(message) { showApp(true); check(); status(message); }

  async function start() {
    if (window.Concentr8.isSignedIn()) return;
    if (window.Concentr8.isDesktop()) { check(); act(); return; }
    showApp(false);
    const trip = await window.Concentr8.finishGoogleTrip();
    if (trip.returned) { if (trip.ok) showApp(true); else showPage('Sign-in was not finished. Try again.'); return; }
    const r = await window.Concentr8.goToGoogle();
    if (!r.ok) showPage(r.error);
  }

  async function act() {
    if (busy) return;
    busy = true; $('action').disabled = true;
    const ready = () => { busy = false; $('action').disabled = false; };
    try {
      status('Opening Google…');
      // Why ready() as soon as Google is in the browser: the student may close that tab, and a new click must start over.
      const r = await window.Concentr8.signIn({ onBrowser: (info) => { continueInBrowser(info); ready(); } });
      if (r.cancelled) return; // a newer click took over
      hideBrowserButton();
      if (r.ok) { status(''); check(); }
      else status(r.error);
    } finally { ready(); }
  }

  dialog.addEventListener('cancel', (e) => e.preventDefault()); // Escape must not skip signing in
  // Why also on close: Chrome lets Escape close a dialog anyway when the student has not clicked yet, so preventDefault
  // above is not enough. Only hide() may close the page; any other close opens it again straight away.
  dialog.addEventListener('close', () => { if (closing) closing = false; else dialog.showModal(); });
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-signin-action]')) act();
    else if (e.target.closest('[data-signin-browser]')) openBrowser();
  });
  window.addEventListener('concentr8:auth', () => { if (window.Concentr8.isSignedIn()) check(); else start(); });
  // Why: Back from Google can restore this page exactly as it was, hidden. A reload runs start() again.
  window.addEventListener('pageshow', (e) => { if (e.persisted) window.location.reload(); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-signout]')) window.Concentr8.signOut();
  });

  start();
})();
