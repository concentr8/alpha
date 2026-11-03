// Purpose: the central sign-in page ("Continue with Google") and the calendar step that must follow it (ADR 0032, ADR 0033).
// Called by: frontend/index.html (script tag, loaded after concentr8-server.js). Opens by itself when a signed-in student has no
//            calendar connected; the sign-in page opens from Profile, Account (button data-signin-open) or Concentr8Signin.open().
// Calls: window.Concentr8 (signIn, signOut, connection, Google windows) and the server routes GET /google/calendars,
//        POST /google/login. In the desktop app, or when a window is blocked, Google opens in the browser (ADR 0035).
// AI-GENERATED: Jack has no wireframe for this page; it is built from .cal-dialog, .wire-button and .preview-note (docs/design.md).
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'cal-dialog signin-dialog';
  dialog.setAttribute('aria-labelledby', 'signin-title');
  dialog.innerHTML = '<header><h2 id="signin-title">Concentr8</h2><button class="icon-button" type="button" data-signin-close aria-label="Close">×</button></header>'
    + '<!-- AI-GENERATED: no wireframe from Jack for this page; built from .cal-dialog, .wire-button and .preview-note. -->'
    + '<p class="preview-note">AI generated: Jack has not drawn this page yet. It will be redrawn.</p>'
    + '<p data-signin-text></p>'
    // Why the inline gap: the status reads as part of the text above (same size), only 8px apart. No existing class does
    // that, and frontend/index.html is frozen (Jonas, 2026-11-03).
    + '<p data-signin-status role="status" aria-live="polite" style="margin-top:8px" hidden></p>'
    + '<div class="dialog-actions"><button class="wire-button" type="button" data-signin-out hidden>Sign out</button>'
    + '<button class="wire-button" type="button" data-signin-browser hidden>Open in browser</button>'
    + '<button class="wire-button solid" type="button" data-signin-action></button></div>';
  document.body.append(dialog);

  const $ = (name) => dialog.querySelector(`[data-signin-${name}]`);
  let step = 'signin'; // 'signin' or 'calendar'
  let busy = false;
  let calendarKnown = false; // true once the server said the calendar is connected, for this token
  let browserUrl = ''; // the Google address behind "Open in browser"; it works only once, so it is cleared after the click

  const SIGNIN_WAIT = 'Finish signing in in your browser. Concentr8 continues by itself.';
  const CALENDAR_WAIT = 'Finish in your browser and tick the calendar permission. Then come back to Concentr8.';

  const text = (value) => { $('text').textContent = value; };
  const status = (value) => { $('status').textContent = value; $('status').hidden = !value; };
  const hideBrowserButton = () => { browserUrl = ''; $('browser').hidden = true; };

  // Google continues in the browser: by itself in the desktop app, after a click when the browser blocked the window.
  function continueInBrowser({ blocked, url }, waitText) {
    browserUrl = blocked ? url : '';
    $('browser').hidden = !blocked;
    status(blocked ? window.Concentr8.blockedWindowText : waitText);
  }

  function openBrowser() {
    if (!browserUrl) return;
    window.Concentr8.openInBrowser(browserUrl);
    hideBrowserButton();
    status(step === 'calendar' ? CALENDAR_WAIT : SIGNIN_WAIT);
  }

  async function serverGet(path) {
    const c = window.Concentr8.connection();
    if (!c) return { ok: false, status: 401, data: {} };
    try {
      const res = await fetch(c.url + path, { headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(30_000) });
      return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
    } catch (_) { return { ok: false, status: 0, data: {} }; }
  }

  function show(nextStep) {
    step = nextStep;
    const calendar = step === 'calendar';
    // The calendar step cannot be closed (ADR 0033); the sign-in page can, so the free chat stays usable.
    $('close').hidden = calendar;
    $('out').hidden = !calendar;
    $('action').textContent = calendar ? 'Connect Google Calendar' : 'Continue with Google';
    $('action').disabled = false;
    hideBrowserButton();
    text(calendar
      ? 'One more step: Concentr8 needs read-only access to your Google Calendar to plan your tasks around your day. Without it the app does not open. You can pick up to three calendars afterwards.'
      : 'Sign in with your Google account. No invite and no phone number needed. Without signing in you can still use the AI chat with 10 free messages a day.');
    status('');
    if (!dialog.open) dialog.showModal();
  }

  // Decides what the student must see now: sign-in, the calendar step, or nothing.
  async function check() {
    if (!window.Concentr8.isSignedIn()) { calendarKnown = false; if (dialog.open && step === 'calendar') dialog.close(); return; }
    if (calendarKnown) return;
    const r = await serverGet('/google/calendars');
    if (r.status === 401) { window.Concentr8.signOut(); return; }
    if (r.ok && r.data.connected === false) { if (!(dialog.open && step === 'calendar')) show('calendar'); }
    else if (r.data && (r.data.connected === true)) { calendarKnown = true; if (dialog.open) dialog.close(); }
    else if (r.status === 0 || r.status >= 500) { /* server not reachable: do not lock the student out because of that */ if (dialog.open && step === 'calendar') dialog.close(); }
  }

  async function connectCalendar() {
    const c = window.Concentr8.connection();
    if (!c) return;
    const popup = window.Concentr8.openGoogleWindow('concentr8-google-calendar');
    hideBrowserButton();
    status('Preparing a secure Google window…');
    let result;
    try {
      const res = await fetch(c.url + '/google/login', { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000) });
      result = { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch (_) { result = { ok: false, data: {} }; }
    let target = null;
    try { target = new URL(result.data.authorizationUrl); } catch (_) { /* handled below */ }
    if (!result.ok || !target || target.origin !== new URL(c.url).origin || target.pathname !== '/google/login') {
      if (popup) popup.close();
      status(result.data.error || 'Google Calendar could not be started. Try again in a moment.');
      return;
    }
    if (!popup) {
      // No window of our own: the focus listener below checks the calendar when the student comes back to Concentr8.
      const desktop = window.Concentr8.isDesktop();
      if (desktop) window.Concentr8.openInBrowser(target.href);
      continueInBrowser({ blocked: !desktop, url: target.href }, CALENDAR_WAIT);
      return;
    }
    popup.location.href = target.href;
    status('Finish in the Google window. Tick the calendar permission when Google asks.');
    await new Promise((resolve) => { const t = setInterval(() => { if (popup.closed) { clearInterval(t); resolve(); } }, 500); });
    status('Checking your calendar connection…');
    calendarKnown = false;
    await check();
    if (dialog.open && step === 'calendar') status('Calendar access was not granted. Without it the app cannot open. Try again and tick the calendar permission.');
    else window.dispatchEvent(new CustomEvent('articul8:rerender'));
  }

  async function act() {
    if (busy) return;
    busy = true; $('action').disabled = true;
    const ready = () => { busy = false; $('action').disabled = false; };
    try {
      if (step === 'calendar') await connectCalendar();
      else {
        status('Opening Google…');
        // Why ready() as soon as Google is in the browser: the student may close that tab, and a new click must start over.
        const r = await window.Concentr8.signIn({ onBrowser: (info) => { continueInBrowser(info, SIGNIN_WAIT); ready(); } });
        if (r.cancelled) return; // a newer click took over
        hideBrowserButton();
        // Why the step test: the concentr8:auth listener may already show the calendar step; closing it would flicker.
        if (r.ok) { status(''); if (dialog.open && step !== 'calendar') dialog.close(); await check(); }
        else status(r.error);
      }
    } finally { ready(); }
  }

  dialog.addEventListener('cancel', (e) => { if (step === 'calendar') e.preventDefault(); }); // Escape must not skip the calendar step
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-signin-close]')) dialog.close();
    else if (e.target.closest('[data-signin-action]')) act();
    else if (e.target.closest('[data-signin-browser]')) openBrowser();
    else if (e.target.closest('[data-signin-out]')) { window.Concentr8.signOut(); dialog.close(); }
  });
  window.addEventListener('concentr8:auth', () => { calendarKnown = false; check(); });
  // Why on focus: after the calendar step in the browser the student comes back to Concentr8; that is when to look again.
  // While busy, the small window flow in connectCalendar() does the check itself.
  window.addEventListener('focus', async () => {
    if (busy || !dialog.open || step !== 'calendar') return;
    calendarKnown = false;
    await check();
    if (!dialog.open) window.dispatchEvent(new CustomEvent('articul8:rerender'));
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-signin-open]')) window.Concentr8Signin.open();
    else if (e.target.closest('[data-signout]')) window.Concentr8.signOut();
  });

  window.Concentr8Signin = { open: () => (window.Concentr8.isSignedIn() ? check() : show('signin')), check };
  check();
})();
