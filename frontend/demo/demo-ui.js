/* Purpose: the visible parts of the demo build: the bCourses (Canvas) connection, the live blocking line and the
   "I'm stuck" call on the focus page, the result of a real phone call coming back into the app, and Profile > Demo setup.
   Called by: frontend/index.html, as the last script (after pages.js), only on the demo branch.
   Calls: window.Product, window.Articul8, FocusUI, ProductPages, window.Concentr8 (wrapped, not changed), DemoData,
          DemoChat, window.fetch (answered by demo-api.js), window.concentr8Desktop (desktop app only).
   AI-GENERATED: none of these parts has a wireframe from Jack. They are built from existing classes (.product-form,
   .import-list, .detail-note, .preview-note, .wire-button, .dialog-actions) so the look stays the same.
   DEMO ONLY: never merged into main. */
(() => {
  'use strict';
  if (!window.Concentr8Demo) return;
  const P = window.Product, S = window.Articul8, D = window.DemoData, C = window.DemoChat, demo = window.Concentr8Demo;
  const desktop = window.concentr8Desktop || null;
  const API = window.Concentr8.api;
  const esc = P.esc;
  const rerender = () => window.dispatchEvent(new CustomEvent('articul8:rerender'));
  const say = (text) => { if (typeof window.announce === 'function') window.announce(text); };
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${demo.DEMO_TOKEN}` };
  const bringToFront = () => { if (desktop && desktop.demoFocus) desktop.demoFocus().catch(() => {}); };
  const minutesAgo = (ms) => { const m = Math.max(0, Math.round((Date.now() - ms) / 60000)); return m < 1 ? 'just now' : m === 1 ? '1 min ago' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

  // Google windows of the demo close by themselves (demo-mode.js), so Calendar and sign-in never open a real page.
  window.Concentr8.openGoogleWindow = () => demo.fakeGoogleWindow();

  // Profile > Data > Reset all data: the reload that follows starts scene 1 again (demo-mode.js), not Jack's sample data.
  const appReset = S.reset;
  S.reset = () => { appReset(); demo.resetOnReload(); };

  // The scripted chat names the task the student means; the Start focus button then picks it.
  window.addEventListener('concentr8-demo:select-task', (e) => { if (S.state.tasks.some((t) => t.id === e.detail.taskId)) S.selectTask(e.detail.taskId); });

  // ---------- 1. bCourses (Canvas) ----------
  async function canvas(path) {
    const r = await fetch(D.persona.canvasUrl + path, { headers: { Authorization: 'Bearer demo-canvas-token' } });
    if (!r.ok) throw new Error('bCourses answered ' + r.status);
    return r.json();
  }
  function canvasConnect() {
    const synced = Boolean(S.state.canvas.syncedAt);
    const d = P.open(synced ? 'Sync bCourses' : 'Connect Canvas', `<!-- AI-GENERATED: demo Canvas connection, built from .product-form and .detail-note. -->
      <form class="product-form"><label>School Canvas URL<input type="url" name="school" aria-label="School Canvas URL" value="${esc(S.state.canvas.schoolUrl || D.persona.canvasUrl)}" required></label>
      <p class="detail-note">Concentr8 reads your courses and due dates. Read only: nothing is changed in Canvas.</p>
      <div class="dialog-actions"><button class="wire-button solid" type="submit">${synced ? 'Sync now' : 'Connect'}</button></div></form>`);
    d.querySelector('form').onsubmit = (event) => { event.preventDefault(); const url = event.currentTarget.elements.school.value.trim(); S.change((s) => { s.canvas.schoolUrl = url; }, 'settings'); canvasProgress(d); };
  }
  async function canvasProgress(d) {
    const lines = [];
    // .import-list, not .focus-steps: a finished line gets a tick but no strike-through (it is progress, not a done task).
    const draw = () => { d.querySelector('form, [data-demo-canvas]')?.remove(); d.insertAdjacentHTML('beforeend', `<div data-demo-canvas><div class="import-list" role="status" aria-live="polite">${lines.map((l) => `<label><input type="checkbox" ${l.done ? 'checked' : ''} disabled><span>${esc(l.text)}</span></label>`).join('')}</div></div>`); };
    const step = async (text, work) => { lines.push({ text, done: false }); draw(); const result = await work(); lines[lines.length - 1] = { text: typeof result === 'string' ? result : text, done: true }; draw(); return result; };
    try {
      const me = await step('Signing in to bCourses…', async () => { const u = await canvas('/api/v1/users/self'); return u; });
      lines[lines.length - 1].text = `Signed in as ${me.name}`; draw();
      const courses = await step('Reading your courses…', () => canvas('/api/v1/courses?enrollment_state=active'));
      lines[lines.length - 1].text = `${courses.length} courses this term`; draw();
      const byCourse = {};
      await step('Finding upcoming assignments…', async () => { for (const c of courses) byCourse[c.id] = await canvas(`/api/v1/courses/${c.id}/assignments?bucket=upcoming`); });
      const total = Object.values(byCourse).reduce((n, list) => n + list.length, 0);
      lines[lines.length - 1].text = `${total} upcoming assignments with due dates`; draw();
      canvasPreview(d, courses, byCourse);
    } catch (error) {
      lines.push({ text: 'Could not reach bCourses: ' + error.message, done: false }); draw();
    }
  }
  function canvasPreview(d, courses, byCourse) {
    const now = new Date();
    const rows = courses.map((c) => {
      const list = byCourse[c.id] || [];
      const next = list.map((a) => a.due_at).sort()[0];
      return `<label><input type="checkbox" name="import" value="${c.id}" checked><span>${esc(c.course_code)} · ${esc(c.name)}<span>${list.length} assignment${list.length === 1 ? '' : 's'}${next ? ' · next due ' + esc(D.dueLabel(now, D.wall(new Date(next)))) : ''}</span></span></label>`;
    }).join('');
    d.querySelector('[data-demo-canvas]').insertAdjacentHTML('beforeend', `<p class="detail-note" style="margin-top:28px">Pick the courses to bring into Concentr8.</p><form class="product-form" data-demo-canvas-import><div class="import-list">${rows}</div><div class="dialog-actions"><button class="wire-button solid" type="submit">Import</button></div></form>`);
    d.querySelector('[data-demo-canvas-import]').onsubmit = (event) => {
      event.preventDefault();
      const ids = [...d.querySelectorAll('[name="import"]:checked')].map((i) => Number(i.value));
      const picked = courses.filter((c) => ids.includes(c.id));
      const found = D.canvasToApp(picked, byCourse);
      let added = 0;
      S.change((s) => {
        found.courses.forEach((c) => { if (!s.courses.some((x) => x.name === c.name)) s.courses.push(c); });
        found.tasks.forEach((t) => { if (!s.tasks.some((x) => x.id === t.id)) { s.tasks.push(t); added += 1; } });
        found.deadlines.forEach((e) => { const old = s.calendarEvents.find((x) => x.id === e.id); if (old) Object.assign(old, e); else s.calendarEvents.push(e); });
        s.canvas.imported = [...new Set([...(s.canvas.imported || []), ...found.tasks.map((t) => t.source)])];
        s.canvas.syncedAt = Date.now();
      }, 'courses');
      d.close();
      say(added ? `${added} assignments from bCourses added to your To Do List and Calendar.` : 'bCourses is up to date.');
    };
  }
  P.canvasConnect = canvasConnect;

  const coursesPage = window.ProductPages.courses;
  window.ProductPages.courses = () => {
    const html = coursesPage();
    if (!S.state.canvas.syncedAt) return html;
    return html.replace('data-canvas-connect>Connect Canvas</button>', `data-canvas-connect>Sync bCourses</button>`)
      .replace('<div class="heading-actions">', `<div class="heading-actions"><span class="detail-note" style="margin:0;align-self:center">Synced with bCourses · ${esc(minutesAgo(S.state.canvas.syncedAt))}</span>`);
  };

  // ---------- 2. Focus page: live blocking line and "I'm stuck" ----------
  let live = null;
  let callStatus = '';
  if (desktop) desktop.onChange((status) => { live = status; const el = document.querySelector('[data-demo-block-live]'); if (el) el.textContent = blockText(); });
  function blockText() {
    const names = S.state.tools.blockedApps;
    if (!names.length) return 'No apps on your block list.';
    const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
    if (!desktop) return `Blocking ${list} (in the desktop app).`;
    if (!live || !live.running) return `Blocking ${list}.`;
    if (live.paused) return 'Blocking is paused for your break.';
    return `Blocking ${list} · Warnings: ${live.nudges} · Closed: ${live.blocks}`;
  }
  const focusPage = window.FocusUI.render;
  window.FocusUI.render = () => {
    const html = focusPage();
    const a = S.state.activeSession;
    if (!a || a.status === 'review' || a.timerOnly) return html;
    return html
      .replace('<button class="wire-button" type="button" data-focus-end>', `<button class="wire-button" type="button" data-demo-stuck>I'm stuck · call me</button><button class="wire-button" type="button" data-focus-end>`)
      .replace('<div class="focus-layout">', `<!-- AI-GENERATED: demo status lines, built from .detail-note. --><p class="detail-note" data-demo-block-live>${esc(blockText())}</p>${callStatus ? `<p class="detail-note" data-demo-call-status role="status">${esc(callStatus)}</p>` : ''}<div class="focus-layout">`);
  };
  const setCallStatus = (text) => { callStatus = text; const el = document.querySelector('[data-demo-call-status]'); if (el) el.textContent = text; else if (location.hash.startsWith('#focus')) rerender(); const call = document.getElementById('call-status'); if (call && text) call.textContent = text; };

  // What the real server can do (GET /api/health): "stuck-call" only when its stuck agent is set up (server/README.md).
  let features = null;
  async function serverFeatures() {
    if (features) return features;
    try { const r = await demo.realFetch(API + '/api/health'); const h = await r.json(); features = Array.isArray(h.features) ? h.features : []; } catch (_) { return []; }
    return features;
  }

  // Why a fallback: the stuck call needs CARTESIA_STUCK_AGENT_ID on the server. Without it, the normal planning call rings
  // instead, and what the student says ("Q1, value iteration, now") becomes the first step, so the scene works either way.
  let stuckViaPlanCall = false;
  let lastStuckClick = 0; // a double click must not ring the phone twice
  async function stuckCall() {
    if (Date.now() - lastStuckClick < 20000) return;
    lastStuckClick = Date.now();
    const a = S.state.activeSession;
    const task = S.state.tasks.find((t) => t.id === a?.taskId);
    if (!demo.real().token) { lastStuckClick = 0; setCallStatus('Real calls are not set up yet: Profile, Phone call, connect with Google or enter your number.'); return; }
    setCallStatus('Calling your phone… pick up.');
    const title = task?.title || a?.taskTitle || 'my task';
    const stuckReady = (await serverFeatures()).includes('stuck-call');
    stuckViaPlanCall = !stuckReady;
    let r;
    try { r = await fetch(API + '/api/call-now', { method: 'POST', headers: authHeaders, body: JSON.stringify(stuckReady ? { reason: 'stuck', task: title } : {}) }); } catch (_) { r = { ok: false, status: 'no internet', json: async () => ({}) }; }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { stuckViaPlanCall = false; lastStuckClick = 0; setCallStatus('The call did not start: ' + (body.error || r.status)); }
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-demo-stuck]')) stuckCall(); });

  // ---------- 3. A real call comes back into the app ----------
  let watch = null;
  async function today() {
    try { const r = await fetch(API + '/api/today', { headers: authHeaders }); return r.ok ? r.json() : null; } catch (_) { return null; }
  }
  window.addEventListener('concentr8-demo:call', async (e) => {
    const { at } = e.detail;
    // 'stuck': first step from the stuck agent. 'plan': task and start time. 'stuck-plan': a planning call for "I'm stuck".
    const reason = e.detail.reason === 'plan' && stuckViaPlanCall ? 'stuck-plan' : e.detail.reason;
    stuckViaPlanCall = false;
    clearInterval(watch?.timer);
    const baseline = await today();
    if (reason !== 'stuck') setCallStatus('Calling you now. Pick up your phone.');
    watch = { reason, at, baseline, until: Date.now() + 8 * 60000 };
    watch.timer = setInterval(checkCall, 3000);
  });
  // A planning call is finished when the server has a task from it that it did not have before the call.
  const newPlan = (t, baseline) => t.focusTask && t.lastCallStatus === 'completed' && (baseline?.lastCallStatus !== 'completed' || t.focusTask !== baseline?.focusTask || t.startTime !== baseline?.startTime);
  async function checkCall() {
    const w = watch;
    if (!w) return;
    if (Date.now() > w.until) { clearInterval(w.timer); watch = null; return; }
    const t = await today();
    if (!t || watch !== w) return;
    const done = () => { clearInterval(w.timer); watch = null; };
    if (w.reason === 'stuck' && t.firstStep && Date.parse(t.firstStepAt || 0) >= w.at - 5000) { done(); applyFirstStep(t.firstStep); }
    else if (w.reason === 'stuck-plan' && newPlan(t, w.baseline)) { done(); applyFirstStep(t.focusTask); }
    else if (w.reason === 'plan' && newPlan(t, w.baseline)) { done(); applyPlan(t.focusTask, t.startTime); }
  }

  // Stuck call: the agreed first step goes on top of the task and the timer shows five minutes (the agent says so).
  function applyFirstStep(text) {
    const step = String(text).replace(/\.$/, '');
    let a = S.state.activeSession;
    if (!a || a.status === 'review') {
      const taskId = S.state.activeTaskId || D.FOCUS_TASK;
      if (S.state.tasks.some((t) => t.id === taskId)) window.FocusUI.start({ taskId, minutes: 5, selected: ['timer', 'block'], origin: 'Home' });
      a = S.state.activeSession;
    }
    S.change((s) => {
      const session = s.activeSession;
      const task = s.tasks.find((t) => t.id === session?.taskId);
      if (task) { task.steps = [{ id: S.uid(), text: step, done: false }, ...(task.steps || [])]; task.done = false; }
      const phase = session?.phases[session.index];
      if (phase && phase.kind === 'focus') {
        const elapsed = session.phaseElapsedMs + (session.status === 'running' ? Date.now() - session.phaseStartedAt : 0);
        phase.seconds = Math.ceil(elapsed / 1000) + 5 * 60;
        if (session.status !== 'running') { session.status = 'running'; session.phaseStartedAt = Date.now(); }
      }
    }, 'focus');
    setCallStatus(`From your call: "${step}" · 5-minute timer started.`);
    P.go('Focus');
    say('Your first step from the call is on screen.');
    bringToFront();
  }

  // Planning call: the task and start time the student said on the phone become a block in the calendar and a chat note.
  function applyPlan(focusTask, startTime) {
    const tasks = S.state.tasks.filter((t) => !t.done);
    const match = C.findTask(focusTask, tasks) || tasks.find((t) => t.title.toLowerCase() === String(focusTask).toLowerCase());
    const taskId = match ? match.id : S.upsertTask({ title: String(focusTask).slice(0, 200), steps: [] });
    const task = S.state.tasks.find((t) => t.id === taskId);
    const begin = C.parseTime(startTime, new Date());
    const minutes = Math.min(task.estimatedMinutes || 50, 90);
    let eventId = null;
    if (begin) {
      const end = new Date(begin.getTime() + minutes * 60000);
      try { eventId = S.saveEvent({ title: task.title, kind: 'plan', start: D.wall(begin), end: D.wall(end), allDay: false, taskId, notes: 'Planned on the phone with Concentr8.' }); } catch (_) { /* a bad time only means no block */ }
    }
    const when = begin ? `${begin.getDate() === new Date().getDate() ? 'today' : 'tomorrow'} at ${C.time12(D.wall(begin))}` : startTime;
    S.change((s) => {
      s.messages.push({ id: S.uid(), role: 'assistant', text: `From your phone call: you'll start ${task.title} ${when}.${eventId ? ` I blocked ${minutes} minutes in your calendar and I'll keep distractions away.` : ''}`, taskId, eventId, contextId: null, proposal: null, actions: [] });
      s.activeTaskId = taskId;
    }, 'assistant');
    setCallStatus(`Locked in from your call: ${task.title}, ${when}.`);
    P.go('Home');
    say('Your plan from the call is in Concentr8.');
    bringToFront();
  }

  // ---------- 4. Phone call page: no account deletion in the demo, and a line about the real call ----------
  const callPage = window.Concentr8.callPage;
  window.Concentr8.callPage = (heading) => {
    const html = callPage(heading).replace('<button class="wire-button" type="button" data-call-delete>Delete my account</button>', '');
    const real = demo.real();
    // AI-GENERATED: demo-only lines and button, built from .detail-note and .wire-button.
    if (real.token) return html + `<p class="detail-note" data-demo-real>Real calls are on${real.phoneEnd ? ` (number ending in ${esc(real.phoneEnd)})` : ' (add your number above and press Save)'}. After the call, your plan shows up in Concentr8 by itself.</p>`;
    return html + `<p class="detail-note" data-demo-real>Real calls: connect the Google account you use in Concentr8 (your saved number is used), or enter a new number above and press Save.</p>
      <div class="dialog-actions" style="justify-content:flex-start"><button class="wire-button" type="button" data-demo-real-google>Connect real calls with Google</button></div>
      <p class="detail-note" data-demo-setup-note role="status">${esc(setupNote)}</p>`;
  };

  // ---------- 5. Profile > Demo setup (opened from the Demo menu or Ctrl+Alt+0, not linked in the app) ----------
  let setupNote = '';
  function demoSetup() {
    const real = demo.real();
    const scenes = Object.entries(D.SCENES).map(([n, s]) => `<button class="wire-button" type="button" data-demo-scene="${n}">${n} · ${esc(s.title)}</button>`).join(' ');
    return `<div class="product-heading"><button class="text-back" type="button" data-product-back="Profile">${P.icon(P.paths.back)}Back</button><h1>Demo setup</h1></div>
      <!-- AI-GENERATED: demo-only page, built from .profile-detail, .detail-note and .wire-button. -->
      <p class="preview-note">Only in the demo build. Not part of the video.</p>
      <div class="profile-detail"><h2>Real phone calls</h2>
        <p>${real.token ? `Connected to the real Concentr8 server${real.phoneEnd ? `, number ending in ${esc(real.phoneEnd)}` : ' (no phone number yet)'}.` : 'Not set up. Calls and "I\'m stuck" need your real phone number.'}</p>
        <p class="detail-note">Easiest: Profile, Phone call, enter your number, tick the box, Save. If the server says the number already has an account, use your Google account instead: it signs in to the real server in your browser.</p>
        <p class="detail-note" data-demo-features>Checking what the call server can do…</p>
        <div class="dialog-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="wire-button" type="button" data-profile="call">Phone call settings</button><button class="wire-button" type="button" data-demo-real-google>Use my Google account</button>${real.token ? '<button class="wire-button" type="button" data-demo-real-forget>Forget real account</button>' : ''}</div>
        <p class="detail-note" data-demo-setup-note role="status">${esc(setupNote)}</p></div>
      <div class="profile-detail"><h2>Scenes</h2><p class="detail-note">Each button resets the mock data to the start of that scene and reloads. Your real call setup stays.</p><div class="dialog-actions" style="justify-content:flex-start;flex-wrap:wrap">${scenes}</div></div>
      <div class="profile-detail"><h2>Before you record</h2><p class="detail-note">Desktop app: Demo menu, Window 1440 × 810 (16:9). Use Google Chrome or Safari for the blocking scene (Firefox can only close tabs, not go back to your work page). Press the button below once: macOS asks to allow notifications and to let "Concentr8 Demo" control Chrome and System Events. Allow all, so no question pops up while you record.</p><div class="dialog-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="wire-button" type="button" data-block-test>Test notification and permissions</button><button class="wire-button" type="button" data-demo-chrome>Allow control of Chrome</button></div><p class="detail-note" data-block-test-result role="status"></p><p class="detail-note" data-demo-chrome-result role="status"></p></div>`;
  }
  async function chromeAccess() {
    const el = () => document.querySelector('[data-demo-chrome-result]');
    if (!desktop || !desktop.demoChrome) { if (el()) el().textContent = 'Only in the desktop app.'; return; }
    if (el()) el().textContent = 'Asking macOS… click OK if it asks.';
    const answer = await desktop.demoChrome().catch(() => 'denied');
    const text = { allowed: 'Chrome: allowed. Blocking can send YouTube back to your work page.', denied: 'Chrome: not allowed. System Settings, Privacy & Security, Automation: turn on Google Chrome for Concentr8 Demo.', unsupported: 'Only needed on a Mac.' }[answer] || answer;
    if (el()) el().textContent = text;
  }
  // Filled in after the page is drawn: one request to the real server, which answers without a token.
  function showFeatures() {
    serverFeatures().then((list) => {
      const el = document.querySelector('[data-demo-features]');
      if (!el) return;
      if (!features) { el.textContent = 'The Concentr8 server did not answer. Check the internet connection.'; return; }
      el.textContent = list.includes('stuck-call')
        ? '"I\'m stuck · call me" uses the stuck-call agent of the server.'
        : '"I\'m stuck · call me" uses the planning call (the server has no stuck-call agent). What you say on the phone becomes the first step.';
    });
  }
  const onDemoPage = () => { if (location.hash.startsWith('#profile/demo')) setTimeout(showFeatures, 0); };
  window.addEventListener('articul8:navigate', onDemoPage);
  window.addEventListener('articul8:rerender', onDemoPage);
  const profilePage = window.ProductPages.profile;
  window.ProductPages.profile = (path) => (path === 'demo' ? demoSetup() : profilePage(path));
  const note = (text) => { setupNote = text; const el = document.querySelector('[data-demo-setup-note]'); if (el) el.textContent = text; };

  // Signs in to the REAL server with Google in the browser; the token is used for calls only (the app stays the demo student).
  async function realGoogle() {
    const raw = demo.realFetch;
    const poll = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    note('Opening Google in your browser…');
    let start;
    try { start = await (await raw(API + '/auth/google/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poll }) })).json(); } catch (_) { note('The Concentr8 server is not reachable.'); return; }
    let target = null;
    try { target = new URL(start.authorizationUrl); } catch (_) { /* checked below */ }
    if (!target || target.origin !== new URL(API).origin) { note(start.error || 'The server returned no sign-in link.'); return; }
    window.open(target.href, '_blank', 'noopener');
    note('Finish signing in in your browser, then come back here.');
    for (const until = Date.now() + 5 * 60000; Date.now() < until;) {
      await new Promise((r) => setTimeout(r, 1500));
      const r = await raw(API + '/auth/google/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ poll }) }).catch(() => null);
      if (!r || r.status === 202) continue;
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.token) { note(body.error || 'Google sign-in did not finish.'); return; }
      demo.setReal({ token: body.token });
      const me = await (await raw(API + '/api/me', { headers: { Authorization: `Bearer ${body.token}` } })).json().catch(() => ({}));
      if (me.phoneNumber) demo.setReal({ phoneEnd: String(me.phoneNumber).replace(/\D/g, '').slice(-4) });
      note(me.phoneNumber ? 'Done. Real calls go to your saved number.' : 'Done. Now add your number under Phone call settings.');
      rerender();
      return;
    }
    note('The sign-in took too long. Try again.');
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-demo-scene')) demo.prepareScene(Number(b.dataset.demoScene));
    if (b.hasAttribute('data-demo-real-google')) realGoogle();
    if (b.hasAttribute('data-demo-chrome')) chromeAccess();
    if (b.hasAttribute('data-demo-real-forget')) { demo.forgetReal(); note('Forgotten. Calls are off until you set them up again.'); rerender(); }
  });

  // The page was drawn once by pages.js before this file loaded (a scene can open straight on Focus, Courses or Profile),
  // so it is drawn again with the demo parts.
  rerender();

  // ---------- 6. Shortcuts in the browser (the desktop app has the Demo menu instead) ----------
  if (!desktop) {
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey && e.altKey)) return;
      if (/^Digit[1-5]$/.test(e.code)) { e.preventDefault(); demo.prepareScene(Number(e.code.slice(5))); }
      if (e.code === 'Digit0') { e.preventDefault(); P.go('Profile', 'demo'); }
    });
  }
})();
