// Purpose: steps 2 and 3 of the first start (docs/plans/simplicity-redesign.md 3.1, ADR 0048). Step 1, signing in, is
//          frontend/concentr8-signin.js. Step 2 connects Google Calendar with one button (quiet "Not now", ADR 0045) and picks a
//          calendar by itself. Step 3 asks for the one thing to get done; Enter creates the to-do at once and hands the same
//          words to the chat. Each step shows once per account in this browser; nothing is asked twice; there is no tour.
// Called by: frontend/index.html (script tag after concentr8-google-calendar.js and concentr8-signin.js); frontend/test/onboarding.test.js
//            loads the pure parts (nextStep, pickCalendar) in Node.
// Calls: window.Concentr8 (isSignedIn, ask), window.Concentr8Demo, window.Concentr8GoogleCalendar.onboarding, window.Articul8
//        (state.onboarding, addTask, newChat, send, change), window.I18n.
// AI-GENERATED: built from the c8- building blocks; Jonas's go replaces Jack's review (ADR 0045).
(function (root) {
  // Which step to show now, or null. calendar: what the calendar check answered (connected | disconnected | unconfigured |
  // signin | unknown). Why "unknown" skips the step without marking it done: the server was not reachable, so ask next time.
  function nextStep({ signedIn, demo, done = {}, calendar = 'unknown', openTodos = 0 }) {
    if (!signedIn || demo) return null;
    if (!done.calendar && calendar === 'disconnected') return 'calendar';
    if (!done.firstTodo && openTodos === 0) return 'first-todo';
    return null;
  }

  // The calendar to show after connecting: the main one (its id is the Google account's email), otherwise the first.
  function pickCalendar(calendars, email) {
    const list = Array.isArray(calendars) ? calendars.filter((c) => c && c.id != null) : [];
    const wanted = String(email || '').toLowerCase();
    const main = wanted && list.find((c) => String(c.id).toLowerCase() === wanted);
    return main ? String(main.id) : list[0] ? String(list[0].id) : null;
  }

  const api = { nextStep, pickCalendar };
  if (typeof module !== 'undefined') module.exports = api;
  if (!root.document) return;

  // ---------- In the browser ----------
  const t = (text, values) => (root.I18n ? root.I18n.t(text, values) : text);
  const store = () => root.Articul8;
  const isDemo = () => Boolean(root.Concentr8Demo && root.Concentr8Demo.isDemo());
  const calendarApi = () => root.Concentr8GoogleCalendar && root.Concentr8GoogleCalendar.onboarding;
  const STEPS = 3; // 1 sign-in, 2 calendar, 3 first to-do

  const dialog = document.createElement('dialog');
  dialog.className = 'c8-screen onboarding-dialog';
  dialog.setAttribute('aria-labelledby', 'onboarding-title');
  document.body.append(dialog);

  let running = false;
  let connection = null; // the Google connection while step 2 waits for it

  function markDone(step, value) {
    store().change((s) => { s.onboarding = { ...s.onboarding, [step]: value }; }, 'onboarding');
  }
  function open() { if (!dialog.open) dialog.showModal(); }
  function close() { if (dialog.open) dialog.close(); dialog.innerHTML = ''; }

  // A neutral screen while the calendar is checked, so the student never sees Home flash up and disappear.
  function showChecking() {
    dialog.innerHTML = '<div class="c8-onboarding"><div class="c8-brand" id="onboarding-title">Concentr8</div>'
      + `<p class="c8-status" role="status"><span class="c8-spinner" aria-hidden="true"></span><span>${t('One moment…')}</span></p></div>`;
    open();
  }

  // ----- Step 2: calendar. look: ready | waiting | failed -----
  function showCalendar(look, openInBrowser) {
    const step = `<div class="c8-step">${t('Step {n} of {total}', { n: 2, total: STEPS })}</div>`;
    const title = `<h1 class="c8-title" id="onboarding-title">${t('Plan around your real day')}</h1>`;
    const text = look === 'waiting'
      ? `<p class="c8-body" role="status">${t('Finish in the Google window. Concentr8 continues by itself.')}</p>`
      : look === 'failed'
        ? `<p class="c8-alert" role="alert"><strong>${t('The calendar did not connect.')}</strong> ${t('Nothing was changed. You can try again or do it later in Settings.')}</p>`
        : `<p class="c8-body">${t('Concentr8 reads your Google Calendar to find free time for your to-dos. It never changes your calendar.')}</p>`;
    const main = look === 'waiting'
      ? `<button class="c8-btn c8-btn--main" type="button" disabled><span class="c8-spinner" aria-hidden="true"></span>${t('Waiting for Google…')}</button>`
      : `<button class="c8-btn c8-btn--main" type="button" data-onboarding-connect>${look === 'failed' ? t('Try again') : t('Connect Google Calendar')}</button>`;
    const browser = openInBrowser ? `<button class="c8-btn" type="button" data-onboarding-browser>${t('Open in browser')}</button>` : '';
    dialog.innerHTML = `<div class="c8-onboarding">${step}${title}${text}<div class="c8-stack">${main}${browser}`
      + `<button class="c8-btn c8-btn--quiet" type="button" data-onboarding-later>${t('Not now')}</button></div></div>`;
    dialog.onclick = (event) => {
      if (event.target.closest('[data-onboarding-connect]')) connect();
      else if (event.target.closest('[data-onboarding-later]')) later();
      else if (event.target.closest('[data-onboarding-browser]') && openInBrowser) { openInBrowser(); showCalendar('waiting'); }
    };
    open();
    const first = dialog.querySelector('[data-onboarding-connect], [data-onboarding-later]');
    if (first) first.focus();
  }

  async function connect() {
    const api = calendarApi();
    if (!api) { showCalendar('failed'); return; }
    showCalendar('waiting');
    connection = api.connect({ onBrowserNeeded: (openIt) => showCalendar('waiting', openIt) });
    const result = await connection.done;
    connection = null;
    if (result.cancelled) return; // "Not now" already moved on
    if (!result.ok) { showCalendar('failed'); return; }
    // Why pick one: a new student should not have to tick a box and press "Save selection" (audit A11).
    const id = result.selectedIds && result.selectedIds.length ? null : pickCalendar(result.calendars, store().state.profile.email);
    if (id) await api.save([id]);
    markDone('calendar', 'connected');
    advance();
  }

  function later() {
    if (connection) { connection.cancel(); connection = null; }
    markDone('calendar', 'skipped'); // Settings still offers the calendar
    advance();
  }

  // ----- Step 3: the first to-do -----
  function showFirstTodo() {
    dialog.innerHTML = '<form class="c8-onboarding" data-onboarding-todo novalidate>'
      + `<div class="c8-step">${t('Step {n} of {total}', { n: 3, total: STEPS })}</div>`
      + `<h1 class="c8-title" id="onboarding-title">${t('What is the one thing you need to get done?')}</h1>`
      + `<div class="c8-field" style="width:min(100%,var(--content-width))"><input name="todo" autocomplete="off" maxlength="2000" aria-label="${t('Your first to-do')}" aria-describedby="onboarding-todo-error" placeholder="${t('For example: read chapter 4')}"><span class="c8-kbd" aria-hidden="true">Enter</span></div>`
      + `<p class="c8-field-error" id="onboarding-todo-error" role="alert" hidden>${t('Type a to-do first.')}</p>`
      + `<p class="c8-meta">${t('You can add more later.')}</p></form>`;
    const form = dialog.querySelector('form');
    const input = form.elements.todo;
    form.onsubmit = (event) => {
      event.preventDefault();
      const text = input.value.trim();
      const error = dialog.querySelector('#onboarding-todo-error');
      if (!text) { error.hidden = false; input.parentElement.classList.add('c8-field--error'); input.focus(); return; }
      // Why local first: the to-do must appear at once, also when the server is slow or down.
      store().addTask(text);
      markDone('firstTodo', 'done');
      close();
      // The chat asks its one or two questions about the same words (ADR 0031); the message links to the new to-do.
      store().newChat();
      store().send(text);
      if (root.Concentr8 && root.Concentr8.ask) root.Concentr8.ask();
    };
    input.oninput = () => { dialog.querySelector('#onboarding-todo-error').hidden = true; input.parentElement.classList.remove('c8-field--error'); };
    open();
    input.focus();
  }

  // Escape is "Not now" on step 2 and "later" on step 3; it never leaves a half-open screen.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (dialog.querySelector('[data-onboarding-later]')) later();
    else if (dialog.querySelector('[data-onboarding-todo]')) { markDone('firstTodo', 'skipped'); close(); }
  });

  // Decides and shows the next step; closes the screen when nothing is left.
  async function advance() {
    if (running) return;
    running = true;
    try {
      const s = store();
      if (!s || !root.Concentr8 || !root.Concentr8.isSignedIn() || isDemo()) { close(); return; }
      const done = s.state.onboarding || {};
      let calendar = 'unknown';
      if (!done.calendar && calendarApi()) {
        if (!dialog.open) showChecking();
        calendar = (await calendarApi().status()).state;
        if (calendar === 'connected') markDone('calendar', 'connected');
        // Why remember "unavailable": Google is not set up on this server, which does not change from one start to the next.
        if (calendar === 'unconfigured') markDone('calendar', 'unavailable');
      }
      const openTodos = s.state.tasks.filter((task) => !task.done).length;
      // A student who already has a to-do never gets step 3, not even after deleting them all later.
      if (openTodos > 0 && !(s.state.onboarding || {}).firstTodo) markDone('firstTodo', 'had-todos');
      const step = nextStep({ signedIn: true, demo: false, done: s.state.onboarding, calendar, openTodos });
      if (step === 'calendar') showCalendar('ready');
      else if (step === 'first-todo') showFirstTodo();
      else close();
    } finally {
      running = false;
    }
  }

  const finished = () => { const done = (store() && store().state.onboarding) || {}; return done.calendar && done.firstTodo; };
  // On start and right after signing in (concentr8-signin.js and concentr8-server.js fire concentr8:auth).
  root.addEventListener('concentr8:auth', () => { if (root.Concentr8.isSignedIn() && !finished()) advance(); });
  if (!finished()) advance();
  root.Concentr8Onboarding = api;
})(typeof window !== 'undefined' ? window : globalThis);
