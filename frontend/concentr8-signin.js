// Purpose: the central sign-in page ("Continue with Google") and the calendar step that must follow it (ADR 0032, ADR 0033).
// Called by: frontend/index.html (script tag, loaded after concentr8-server.js). Opens by itself when a signed-in student has no
//            calendar connected; the sign-in page opens from Profile, Account (button data-signin-open) or Concentr8Signin.open().
// Calls: window.Concentr8 (signIn, signOut, connection) and the server routes GET /google/calendars, POST /google/login.
// AI-GENERATED: Jack has no wireframe for this page; it is built from .cal-dialog, .wire-button and .preview-note (docs/design.md).
(() => {
  const dialog = document.createElement('dialog');
  dialog.className = 'cal-dialog signin-dialog';
  dialog.setAttribute('aria-labelledby', 'signin-title');
  dialog.innerHTML = '<header><h2 id="signin-title">Concentr8</h2><button class="icon-button" type="button" data-signin-close aria-label="Close">×</button></header>'
    + '<!-- AI-GENERATED: no wireframe from Jack for this page; built from .cal-dialog, .wire-button and .preview-note. -->'
    + '<p class="preview-note">AI generated: Jack has not drawn this page yet. It will be redrawn.</p>'
    + '<p data-signin-text></p>'
    + '<p class="detail-note" data-signin-status role="status" aria-live="polite"></p>'
    + '<div class="dialog-actions"><button class="wire-button" type="button" data-signin-out hidden>Sign out</button>'
    + '<button class="wire-button solid" type="button" data-signin-action></button></div>';
  document.body.append(dialog);

  const $ = (name) => dialog.querySelector(`[data-signin-${name}]`);
  let step = 'signin'; // 'signin' or 'calendar'
  let busy = false;
  let calendarKnown = false; // true once the server said the calendar is connected, for this token

  const text = (value) => { $('text').textContent = value; };
  const status = (value) => { $('status').textContent = value; };

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
    if (r.ok && r.data.connected === false) show('calendar');
    else if (r.data && (r.data.connected === true)) { calendarKnown = true; if (dialog.open) dialog.close(); }
    else if (r.status === 0 || r.status >= 500) { /* server not reachable: do not lock the student out because of that */ if (dialog.open && step === 'calendar') dialog.close(); }
  }

  async function connectCalendar() {
    const c = window.Concentr8.connection();
    if (!c) return;
    const popup = window.open('about:blank', 'concentr8-google-calendar', 'popup,width=560,height=720');
    if (!popup) { status('Allow the sign-in window to open, then try again.'); return; }
    try { popup.opener = null; } catch (_) { /* only needed to see when it closes */ }
    status('Preparing a secure Google window…');
    let result;
    try {
      const res = await fetch(c.url + '/google/login', { method: 'POST', headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30_000) });
      result = { ok: res.ok, data: await res.json().catch(() => ({})) };
    } catch (_) { result = { ok: false, data: {} }; }
    let target = null;
    try { target = new URL(result.data.authorizationUrl); } catch (_) { /* handled below */ }
    if (!result.ok || !target || target.origin !== new URL(c.url).origin || target.pathname !== '/google/login') {
      popup.close();
      status(result.data.error || 'Google Calendar could not be started. Try again in a moment.');
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
    try {
      if (step === 'calendar') await connectCalendar();
      else {
        status('Opening Google…');
        const r = await window.Concentr8.signIn();
        if (r.ok) { status(''); if (dialog.open) dialog.close(); await check(); }
        else status(r.error);
      }
    } finally { busy = false; $('action').disabled = false; }
  }

  dialog.addEventListener('cancel', (e) => { if (step === 'calendar') e.preventDefault(); }); // Escape must not skip the calendar step
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-signin-close]')) dialog.close();
    else if (e.target.closest('[data-signin-action]')) act();
    else if (e.target.closest('[data-signin-out]')) { window.Concentr8.signOut(); dialog.close(); }
  });
  window.addEventListener('concentr8:auth', () => { calendarKnown = false; check(); });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-signin-open]')) window.Concentr8Signin.open();
    else if (e.target.closest('[data-signout]')) window.Concentr8.signOut();
  });

  window.Concentr8Signin = { open: () => (window.Concentr8.isSignedIn() ? check() : show('signin')), check };
  check();
})();
