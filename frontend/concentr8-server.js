// Purpose: connects Jack's web app to the Concentr8 server: the AI chat in the agent panel, Sign in with Google and the phone call setup.
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
  const GUEST_KEY = 'concentr8-guest-v1'; // a random code that lets the server count free messages without an account

  // The token proves who the student is to the server; it stays in this browser, like all other data of the app.
  // From the phone number we keep only the last digits, to show which number is saved.
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; }
  }
  function save(settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* private mode: the student signs up again next time */ }
  }
  let settings = load();

  // Without an account the chat is free for a few messages a day (docs/plans/guest-chat.md). The code is random, made once,
  // and tells the server nothing about the student. If storage is blocked, one code lives until the page is closed.
  let memoryGuestId = null;
  function guestId() {
    try {
      const saved = localStorage.getItem(GUEST_KEY);
      if (/^[a-f0-9]{32}$/.test(saved || '')) return saved;
    } catch (_) { /* storage blocked: use the code in memory */ }
    if (!memoryGuestId) memoryGuestId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(GUEST_KEY, memoryGuestId); } catch (_) { /* kept in memory only */ }
    return memoryGuestId;
  }

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
  // Actions come from the server already checked. The app starts them as "pending" and the student confirms (a button or Enter);
  // only add_todo runs at once, always with an Undo line.
  // Jack: every answer goes to the chat that asked, even when the student switched to another chat meanwhile.
  function addAssistantMessage(chatId, text, actions = []) {
    const app = window.Articul8;
    // A reset or another tab may have removed the chat while the request ran.
    if (!app.state.chats.some(c => c.id === chatId)) return;
    const id = app.uid();
    const list = actions.map((a) => ({ ...a, state: a.type === 'open_tool' ? 'shown' : 'pending' }));
    app.change((s) => {
      const chat = s.chats.find(c => c.id === chatId);
      chat.messages.push({ id, text, role: 'assistant', taskId: null, eventId: null, contextId: null, proposal: null, actions: list });
      chat.updatedAt = Date.now();
      // Preserve automatic adds and their Undo state without switching the visible chat.
      list.filter(a => a.type === 'add_todo').forEach(a => {
        const match = s.tasks.find(t => t.title === a.title);
        const task = match || { id: app.uid(), title: a.title, done: false, course: '', steps: [] };
        if (a.minutes && !task.estimatedMinutes) task.estimatedMinutes = a.minutes; // the time the student confirmed in the chat (CON-35)
        if (!match) s.tasks.push(task);
        Object.assign(a, { state: 'done', taskId: task.id, undoable: !match });
        chat.activeTaskId = task.id;
        if (s.activeChatId === chatId) s.activeTaskId = task.id;
      });
    }, list.some(a => a.type === 'add_todo') ? 'tasks' : 'assistant');
    // The final due date the student named in the chat becomes the task's deadline (CON-35), unless the task has one.
    list.filter(a => a.type === 'add_todo' && a.due && !app.state.calendarEvents.some(e => e.taskId === a.taskId && e.kind === 'deadline')).forEach(a => {
      try { app.saveEvent({ title: a.title, kind: 'deadline', start: a.due + 'T17:00', end: a.due + 'T17:00', allDay: false, taskId: a.taskId, notes: '' }); } catch (_) { /* a bad date only means no deadline */ }
    });
  }

  const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // The last free messages say so, so the limit never comes as a surprise.
  function freeMessagesHint(remaining) {
    if (!(remaining >= 0 && remaining <= 2)) return '';
    const left = remaining === 0 ? 'No free messages left today' : `${remaining} free message${remaining === 1 ? '' : 's'} left today`;
    return ` (${left}. Continue with Google under Profile, Account for more.)`;
  }

  // Jack: each chat waits for its own answer; the others stay usable.
  const pendingChats = new Set();
  const isAsking = (chatId = window.Articul8?.state.activeChatId) => pendingChats.has(chatId);
  const notifyPending = () => window.dispatchEvent(new CustomEvent('concentr8:chat-pending'));
  // Jack's Quick Start: a focus chat gets this planning instruction on the student's last message.
  const focusInstruction = '\n\nQuick Start focus planning: first ask what I need to accomplish and how much time I have. Ask 1–2 concise questions to narrow the task to one achievable outcome. Then propose small steps and a realistic duration. Wait for my agreement before suggesting the timer. I can use the Start focus session button to review the task and minutes.';
  async function ask() {
    const app = window.Articul8;
    if (!app || isAsking()) return;
    const chatId = app.state.activeChatId;
    const chat = app.state.chats.find(c => c.id === chatId);
    if (!chat || !chat.messages.length) return;
    pendingChats.add(chatId);
    notifyPending();
    try {
      const messages = chat.messages.slice(-MESSAGES_SENT).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: m.text }));
      if (chat.mode === 'focus') {
        const lastUser = messages.findLast(m => m.role === 'user');
        if (lastUser) lastUser.text = lastUser.text.slice(0, 1400) + focusInstruction;
      }
      const tasks = app.state.tasks.filter((t) => !t.done).map((t) => t.title);
      const send = (asGuest) => (asGuest
        ? request('/api/chat/guest', 'POST', { guestId: guestId(), messages, tasks, today: localDate() })
        : request('/api/chat', 'POST', { messages, tasks, today: localDate() }));
      let guest = !settings.token;
      let r = await send(guest);
      if (!guest && r.status === 401) {
        // The server no longer knows the saved login (for example its data was reset). Answering with an error would make the
        // chat useless, so we forget the dead login and answer as a guest. Phone number digits and other settings stay.
        delete settings.token;
        save(settings);
        guest = true;
        r = await send(true);
      }
      if (r.ok && r.data.reply) addAssistantMessage(chatId, r.data.reply + (guest ? freeMessagesHint(r.data.remaining) : ''), Array.isArray(r.data.actions) ? r.data.actions : []);
      else if (guest && r.status === 429) addAssistantMessage(chatId, r.error); // the server text already says how to continue
      else addAssistantMessage(chatId, `I could not answer right now. ${r.error}`);
    } finally { pendingChats.delete(chatId); notifyPending(); }
  }

  // --- Sign in with Google (ADR 0032) ---
  // The app makes a random poll code, the server turns it into a Google address, the student signs in in a second window,
  // and the app collects the new token with the same poll code. Google never sees the code; the token never travels in a URL.
  const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- Google windows: a small window on the web, the default browser in the desktop app (ADR 0035) ---
  const BLOCKED_WINDOW_TEXT = 'Sign-in window was blocked. Click to open it in your browser.';
  const isDesktop = () => Boolean(window.concentr8Desktop); // set by app/preload.js, only inside the desktop app

  // Why the empty window first: browsers allow a new window only during the click, and the Google address comes later from
  // the server. The desktop app sends every new window to the default browser (app/main.js), so there it opens nothing.
  function openGoogleWindow(name) {
    if (isDesktop()) return null;
    const popup = window.open('about:blank', name, 'popup,width=560,height=720');
    if (popup) { try { popup.opener = null; } catch (_) { /* we only need to see when it closes */ } }
    return popup;
  }

  // A new tab on the web (works right after a click), the default browser in the desktop app.
  function openInBrowser(url) {
    window.open(url, '_blank', 'noopener');
  }

  // Why a counter: when Google opened in the browser, the student may close that tab and click again. The new click
  // starts a new attempt, and the older one stops asking the server.
  let signInAttempt = 0;

  // onBrowser({ blocked, url }) is called when the sign-in continues in the browser instead of a small window:
  // blocked=false in the desktop app (the browser is already open), blocked=true on the web when the window was blocked
  // (then the caller shows a button that opens url). The Google link works once, so it is opened at most once.
  async function signIn({ onBrowser } = {}) {
    if (settings.token) return { ok: true };
    const attempt = ++signInAttempt;
    const poll = randomHex();
    const popup = openGoogleWindow('concentr8-google-signin');
    const closeWindow = () => { if (popup && !popup.closed) popup.close(); };
    const start = await request('/auth/google/start', 'POST', { poll });
    if (!start.ok) { closeWindow(); return { ok: false, error: start.status === 503 ? 'Google sign-in is not set up yet.' : start.error }; }
    let target;
    try { target = new URL(start.data.authorizationUrl); } catch (_) { target = null; }
    if (!target || target.origin !== new URL(API).origin || target.pathname !== '/auth/google/login') { closeWindow(); return { ok: false, error: 'The server returned an invalid sign-in link.' }; }
    if (popup) popup.location.href = target.href;
    else if (isDesktop()) { openInBrowser(target.href); if (onBrowser) onBrowser({ blocked: false, url: target.href }); }
    else if (onBrowser) onBrowser({ blocked: true, url: target.href });
    else return { ok: false, error: BLOCKED_WINDOW_TEXT };
    const until = Date.now() + 5 * 60 * 1000;
    let closedAt = 0;
    while (Date.now() < until) {
      await wait(1500);
      if (attempt !== signInAttempt) { closeWindow(); return { ok: false, cancelled: true }; }
      const r = await request('/auth/google/token', 'POST', { poll });
      if (r.status === 200 && r.data.token) {
        closeWindow();
        settings = { ...settings, token: r.data.token };
        save(settings);
        window.dispatchEvent(new CustomEvent('concentr8:auth'));
        await syncAccount();
        window.dispatchEvent(new CustomEvent('articul8:rerender'));
        return { ok: true };
      }
      if (r.status !== 202 && r.status !== 0) { closeWindow(); return { ok: false, error: r.error }; }
      // Without a window of our own (browser tab, desktop app) we cannot see a close, so we ask until the five minutes end.
      if (popup && popup.closed) { closedAt = closedAt || Date.now(); if (Date.now() - closedAt > 4000) return { ok: false, error: 'The sign-in was not finished.' }; }
    }
    closeWindow();
    return { ok: false, error: 'The sign-in took too long. Try again.' };
  }

  // The Google account tells the server the email (and name); the profile shows them instead of asking again.
  async function syncAccount() {
    if (!settings.token || !window.Articul8) return;
    const r = await request('/api/me', 'GET');
    if (r.status === 401) { signOut(); return; }
    const profile = window.Articul8.state.profile;
    const newName = r.ok && r.data.name && !profile.name ? r.data.name : ''; // a name the student typed is never overwritten
    if (!r.ok || !r.data.email || (profile.email === r.data.email && !newName)) return;
    window.Articul8.change((s) => { s.profile.email = r.data.email; if (newName) s.profile.name = newName; }, 'profile');
    window.dispatchEvent(new CustomEvent('articul8:rerender'));
  }
  window.addEventListener('load', syncAccount);

  function signOut() {
    delete settings.token;
    save(settings);
    window.dispatchEvent(new CustomEvent('concentr8:auth'));
    window.dispatchEvent(new CustomEvent('articul8:rerender'));
  }

  // --- Phone call setup (Profile > Phone call) ---
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timezone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'America/Los_Angeles'; } };

  function callPage(heading) {
    const saved = Boolean(settings.token);
    return heading
      + '<!-- AI-GENERATED: no wireframe from Jack for this page; built from .product-form, .wire-button and .preview-note. -->'
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
  window.Concentr8 = { api: API, ask, isAsking, signIn, signOut, isDesktop, openGoogleWindow, openInBrowser, blockedWindowText: BLOCKED_WINDOW_TEXT, isSignedIn: () => Boolean(settings.token), connection: () => (settings.token ? { url: API, token: settings.token } : null), callPage: (heading) => { setTimeout(showCodeFieldIfNeeded, 0); return callPage(heading); } };
})();
