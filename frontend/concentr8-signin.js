// Purpose: gets a signed-out student to Google before the app opens (ADR 0038, 0040), except in demo mode (ADR 0042). On the web the whole tab goes to Google;
//          the desktop app opens Google in the browser. While that happens the student sees step 1 of the first start: the brand and
//          "Opening Google sign-in…" instead of a blank page (ADR 0048). The "Continue with Google" screen is the way back when that failed.
// Called by: frontend/index.html (script tag, loaded after concentr8-server.js and i18n.js). Runs by itself on start and after signing out.
// Calls: window.Concentr8 (goToGoogle, finishGoogleTrip, signIn, isSignedIn, Google windows), window.I18n. When a window is blocked, Google
//        opens in the browser (ADR 0035). The calendar step after sign-in lives in frontend/onboarding.js (ADR 0048), never here.
// AI-GENERATED: built from the c8- building blocks of docs/plans/simplicity-redesign.md; Jonas's go replaces Jack's review (ADR 0045).
(() => {
  const t = (text, values) => (window.I18n ? window.I18n.t(text, values) : text);
  const dialog = document.createElement('dialog');
  dialog.className = 'c8-screen signin-dialog';
  dialog.setAttribute('aria-labelledby', 'signin-title');
  dialog.innerHTML = '<div class="c8-onboarding">'
    + '<div class="c8-brand" id="signin-title">Concentr8</div>'
    + `<p class="c8-status" data-signin-wait role="status" aria-live="polite" hidden><span class="c8-spinner" aria-hidden="true"></span><span>${t('Opening Google sign-in…')}</span></p>`
    + `<p class="c8-body" data-signin-text>${t('Sign in with Google to start. It takes a few seconds.')}</p>`
    + '<p class="c8-alert" data-signin-error role="alert" hidden><strong data-signin-headline></strong> <span data-signin-status></span></p>'
    + `<div class="c8-stack" data-signin-buttons><button class="c8-btn c8-btn--main" type="button" data-signin-action>${t('Continue with Google')}</button>`
    + `<button class="c8-btn" type="button" data-signin-browser hidden>${t('Open in browser')}</button></div>`
    + '</div>';
  document.body.append(dialog);

  const $ = (name) => dialog.querySelector(`[data-signin-${name}]`);
  let busy = false;
  let browserUrl = ''; // the Google address behind "Open in browser"; it works only once, so it is cleared after the click
  let closing = false; // true only while this file closes the page itself; any other close is undone (see the close listener)

  // Why: a demo link (?demo) is the one way in without Google (ADR 0042).
  const isDemo = () => Boolean(window.Concentr8Demo && window.Concentr8Demo.isDemo());

  const SIGNIN_WAIT = t('Finish signing in in your browser. Concentr8 continues by itself.');

  // Two looks of one screen: "waiting" (brand and a status line, nothing to click) and "page" (text and a button).
  function mode(name) {
    $('wait').hidden = name !== 'waiting';
    $('text').hidden = name === 'waiting';
    $('buttons').hidden = name === 'waiting';
  }

  // A problem in plain words: a short headline, then what to do (audit A9: never a raw error).
  function problem(headline, detail) {
    $('headline').textContent = headline;
    $('status').textContent = detail;
    $('error').hidden = !headline;
  }
  const clearProblem = () => problem('', '');
  // Why the mapping: the server's own sentences are English and sometimes technical; these cases have translated words.
  function explain(error) {
    if (!error || /not reachable/i.test(error)) problem(t('We could not reach Concentr8.'), t('Check your internet, then try again.'));
    else problem(t('Sign-in did not work.'), error);
  }
  // Status text while Google is open in the browser (desktop app or a blocked window).
  const status = (value) => { $('text').textContent = value || t('Sign in with Google to start. It takes a few seconds.'); };
  const hideBrowserButton = () => { browserUrl = ''; $('browser').hidden = true; };

  // Google continues in the browser: by itself in the desktop app, after a click when the browser blocked the window.
  function continueInBrowser({ blocked, url }) {
    browserUrl = blocked ? url : '';
    $('browser').hidden = !blocked;
    // Why the new label: clicking the main button again starts a fresh trip to Google.
    if (!blocked) $('action').textContent = t('Open Google again');
    status(blocked ? window.Concentr8.blockedWindowText : SIGNIN_WAIT);
  }

  function openBrowser() {
    if (!browserUrl) return;
    window.Concentr8.openInBrowser(browserUrl);
    hideBrowserButton();
    status(SIGNIN_WAIT);
  }

  // Why the guard: closing a dialog that is not open fires no close event, so the flag would stay set.
  function hide() { if (!dialog.open) return; closing = true; dialog.close(); }

  // The page is open exactly while nobody is signed in.
  function check() {
    if (isDemo()) return;
    const signedIn = window.Concentr8.isSignedIn();
    if (signedIn && dialog.open) hide();
    if (!signedIn && !dialog.open) { hideBrowserButton(); clearProblem(); status(''); mode('page'); dialog.showModal(); }
  }

  // Why hidden: the student should see Google first, not a flash of the app. The server may need a few seconds to wake up.
  // This screen stays visible through the hidden body (CSS: .c8-screen sets visibility: visible).
  const showApp = (visible) => { document.body.style.visibility = visible ? '' : 'hidden'; };

  // Step 1 while the server wakes up: the brand and one status line, never a blank page (audit A2).
  function showWaiting() { if (!dialog.open) dialog.showModal(); clearProblem(); mode('waiting'); }

  // The way back when going to Google directly did not work: the page below with its button, never a loop back to Google.
  function showPage(headline, detail) {
    showApp(true); check(); mode('page');
    if (headline) problem(headline, detail);
    $('action').focus?.(); // keyboard students land on the one thing to do
  }

  async function start() {
    if (window.Concentr8.isSignedIn() || isDemo()) return;
    if (window.Concentr8.isDesktop()) { check(); act(); return; }
    showApp(false);
    showWaiting();
    const trip = await window.Concentr8.finishGoogleTrip();
    if (trip.returned) {
      if (trip.ok) { showApp(true); hide(); } else showPage(t('Sign-in was not finished.'), t('Try again.'));
      return;
    }
    const r = await window.Concentr8.goToGoogle();
    if (!r.ok) { showPage(); explain(r.error); }
  }

  async function act() {
    if (busy) return;
    busy = true; $('action').disabled = true;
    const ready = () => { busy = false; $('action').disabled = false; };
    try {
      clearProblem();
      status(t('Opening Google sign-in…'));
      // Why ready() as soon as Google is in the browser: the student may close that tab, and a new click must start over.
      const r = await window.Concentr8.signIn({ onBrowser: (info) => { continueInBrowser(info); ready(); } });
      if (r.cancelled) return; // a newer click took over
      hideBrowserButton();
      if (r.ok) { status(''); check(); }
      else { status(''); explain(r.error); }
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
    // The "Continue with Google" buttons in Profile (shown only when signed out, e.g. in demo mode) start the same sign-in.
    else if (e.target.closest('[data-signin-open]')) act();
  });

  start();
})();
