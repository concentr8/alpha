// Purpose: connects Jack's web app to the Concentr8 server: the AI chat in the agent panel and the phone call setup.
// Called by: frontend/index.html (loaded before the main script). It calls window.Concentr8.ask() after the student
//            sends a chat message and window.Concentr8.callPage() when the page Profile > Phone call is drawn.
// Calls: the Concentr8 server (server/index.js): /api/register, /api/settings, /api/tasks, /api/call-now, /api/chat,
//        /api/me. It reads and changes the app state only through window.Articul8 (app-state.js).
// AI-GENERATED: Jack has no wireframe for the call setup page; it is built from existing classes (docs/design.md).
(() => {
  // Why a constant: the web app, the desktop app and the server are three different addresses, and the page has no build step.
  const API = 'https://concentr8-api-ahc6ercddegqdaen.westus3-01.azurewebsites.net';
  const STORAGE_KEY = 'concentr8-server-v1';
  const MESSAGES_SENT = 12; // the server only uses the last 12 as well
  const NOT_SET_UP = 'To chat with me, first set up your phone call under Profile, Phone call. That creates your account.';

  // The token proves who the student is to the server; it stays in this browser, like all other data of the app.
  // From the phone number we keep only the last digits, to show which number is saved.
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; }
  }
  function save(settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* private mode: the student signs up again next time */ }
  }
  let settings = load();

  async function request(path, method, body) {
    let res;
    try {
      res = await fetch(API + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(settings.token ? { Authorization: `Bearer ${settings.token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30_000), // the server may need a few seconds to wake up
      });
    } catch (_) {
      return { ok: false, status: 0, error: 'The Concentr8 server is not reachable. Check your internet and try again.' };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data, error: data.error || `The server answered ${res.status}.` };
  }

  // --- AI chat ---
  function addAssistantMessage(text) {
    const app = window.Articul8;
    app.change((s) => { s.messages.push({ id: app.uid(), text, role: 'assistant', taskId: null, eventId: null, contextId: null, proposal: null }); }, 'assistant');
  }

  let asking = false;
  async function ask() {
    const app = window.Articul8;
    if (!app || asking) return;
    if (!settings.token) { addAssistantMessage(NOT_SET_UP); return; }
    asking = true;
    try {
      const messages = app.state.messages.slice(-MESSAGES_SENT).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.text }));
      const tasks = app.state.tasks.filter((t) => !t.done).map((t) => t.title);
      const r = await request('/api/chat', 'POST', { messages, tasks });
      if (r.ok && r.data.reply) addAssistantMessage(r.data.reply);
      else if (r.status === 401) addAssistantMessage('The server does not know you any more. Open Profile, Phone call and save again.');
      else addAssistantMessage(`I could not answer right now. ${r.error}`);
    } finally { asking = false; }
  }

  // --- Phone call setup (Profile > Phone call) ---
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timezone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'America/Los_Angeles'; } };

  function callPage(heading) {
    const saved = Boolean(settings.token);
    return heading
      + '<!-- AI-GENERATED: no wireframe from Jack for this page; built from .product-form, .wire-button and .preview-note. -->'
      + '<p class="preview-note">AI generated: Jack has not drawn this page yet. It will be redrawn.</p>'
      + '<form class="product-form profile-form" id="call-form" novalidate>'
      + `<label>Phone number (US)<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="${saved && settings.phoneEnd ? `Saved: number ending in ${esc(settings.phoneEnd)}` : '+1 415 555 1234'}"></label>`
      + `<label>Time of the call<input name="time" type="time" value="${esc(settings.callTime || '18:00')}"></label>`
      + `<p class="detail-note">Your time zone: ${esc(timezone())}. We call you once a day at this time and ask which task you will start and when.</p>`
      + '<label class="check-line"><input name="consent" type="checkbox"' + (settings.consent ? ' checked' : '') + '>I agree that Concentr8 calls this number at this time.</label>'
      + '<label data-recovery hidden>Invite or recovery code<input name="recovery" type="password" autocomplete="off"></label>'
      + '<div class="dialog-actions">'
      + (saved ? '<button class="wire-button" type="button" data-call-delete>Delete my account</button>' : '')
      + '<button class="wire-button" type="button" data-call-now' + (saved ? '' : ' disabled') + '>Call me now</button>'
      + '<button class="wire-button solid" type="submit">Save</button></div>'
      + `<p class="detail-note" id="call-status" role="status" aria-live="polite">${saved ? 'Your call is set up.' : 'Save first, then you can test the call.'}</p>`
      + '</form>';
  }

  // Why: when the server is closed to strangers (OPEN_SIGNUPS=false), the code field must be there from the start.
  async function showCodeFieldIfNeeded() {
    if (settings.token) return;
    const r = await request('/api/health', 'GET');
    const field = document.querySelector('#call-form [data-recovery]');
    if (r.ok && r.data.inviteRequired && field) field.hidden = false;
  }

  const status = (text) => { const el = document.getElementById('call-status'); if (el) el.textContent = text; };

  // The server plans the call from these titles; the app keeps its own list, so we send it before every save and call.
  function syncTasks() {
    const tasks = window.Articul8.state.tasks.filter((t) => !t.done).map((t) => ({ id: t.id, title: t.title, course: t.course || '' }));
    return request('/api/tasks', 'POST', { tasks });
  }

  async function saveForm(form) {
    const phone = form.elements.phone.value.trim();
    const callTime = form.elements.time.value;
    if (!form.elements.consent.checked) { status('Please tick the box so we may call you.'); return; }
    if (!callTime) { status('Pick the time of the call.'); return; }
    if (!settings.token && !phone) { status('Enter your phone number.'); return; }
    status('Saving...');
    let r;
    if (settings.token) {
      r = await request('/api/settings', 'POST', { callTime, timezone: timezone(), ...(phone ? { phoneNumber: phone } : {}) });
    } else {
      const recovery = form.elements.recovery.value.trim();
      r = await request('/api/register', 'POST', { phoneNumber: phone, consent: true, callTime, timezone: timezone(), ...(recovery ? { inviteCode: recovery } : {}) });
      if (r.ok) settings.token = r.data.token;
      else if (r.status === 403 || r.status === 409) form.querySelector('[data-recovery]').hidden = false;
    }
    if (!r.ok) { status(r.error); return; }
    settings = { ...settings, callTime, consent: true, ...(phone ? { phoneEnd: phone.replace(/\D/g, '').slice(-4) } : {}) };
    save(settings);
    await syncTasks();
    window.dispatchEvent(new CustomEvent('articul8:rerender'));
    status('Saved. We will call you at ' + callTime + '.');
  }

  async function callNow() {
    status('Starting the call...');
    await syncTasks();
    const r = await request('/api/call-now', 'POST', {});
    status(r.ok ? 'Calling you now. Pick up your phone.' : r.error);
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account on the server? Your phone number and call settings are removed. Your tasks in this app stay.')) return;
    const r = await request('/api/me', 'DELETE');
    if (!r.ok && r.status !== 401) { status(r.error); return; }
    settings = {};
    save(settings);
    window.dispatchEvent(new CustomEvent('articul8:rerender'));
  }

  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'call-form') return;
    e.preventDefault();
    saveForm(e.target);
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-call-now]')) callNow();
    if (e.target.closest('[data-call-delete]')) deleteAccount();
  });

  // The page is drawn by index.html after callPage() returns, so the check runs right after it.
  window.Concentr8 = { api: API, ask, callPage: (heading) => { setTimeout(showCodeFieldIfNeeded, 0); return callPage(heading); } };
})();
