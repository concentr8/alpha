/* Purpose: the fake backend of the demo build. It wraps window.fetch, answers Google Calendar, Google sign-in, the AI chat
   and the bCourses (Canvas) API with mock data, and lets only the real phone-call routes through to the real Concentr8
   server, with the real call token swapped in.
   Why a fetch wrapper: the app code stays exactly as in beta.26 (same requests, same UI). Only the answers are fake.
   Called by: frontend/demo/demo-mode.js (install(), before any app script runs).
   Calls: the real fetch for /api/register, /api/settings, /api/tasks, /api/call-now, /api/today, /api/voice/* and
          /api/health; DemoData and DemoChat for everything else. Dispatches "concentr8-demo:call" when a real call starts.
   DEMO ONLY: never merged into main. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DemoApi = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  // The same server address as frontend/concentr8-server.js (the page has no build step, so it is written twice).
  const API = 'https://concentr8-api-ahc6ercddegqdaen.westus3-01.azurewebsites.net';
  const CANVAS = 'https://bcourses.berkeley.edu';
  const DEMO_TOKEN = 'demo-session-maya';
  const REAL_KEY = 'concentr8-demo-real-v1'; // { token, phoneEnd }: the real account that receives the phone calls
  const CAL_KEY = 'concentr8-demo-calendar-v1'; // { connected, selectedIds }
  // Routes of the real server that the demo uses for real. Everything else on the server address is answered here.
  const REAL_ROUTES = ['/api/register', '/api/settings', '/api/tasks', '/api/call-now', '/api/today', '/api/health', '/api/voice/speak', '/api/voice/transcribe', '/api/me/impact', '/api/first-step', '/auth/google/start', '/auth/google/token'];

  function create({ storage, realFetch, now = () => new Date(), data, chat, appState = () => null, dispatch = () => {}, delay = (ms) => new Promise((r) => setTimeout(r, ms)), latency = 1 }) {
    const read = (key, fallback) => { try { return JSON.parse(storage.getItem(key)) || fallback; } catch (_) { return fallback; } };
    const write = (key, value) => { try { storage.setItem(key, JSON.stringify(value)); } catch (_) { /* demo still works for this run */ } };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    const wait = (ms) => delay(ms * latency);

    const real = () => read(REAL_KEY, {});
    const setReal = (patch) => write(REAL_KEY, { ...real(), ...patch });
    const calendar = () => read(CAL_KEY, { connected: true, selectedIds: data.googleCalendars.filter((c) => c.selected).map((c) => c.id) });

    // ---------- answers made here ----------
    function calendarsBody() {
      const c = calendar();
      return { connected: c.connected, calendars: c.connected ? data.googleCalendars.map((x) => ({ id: x.id, name: x.name, selected: c.selectedIds.includes(x.id) })) : [], selectedIds: c.connected ? c.selectedIds : [] };
    }
    function eventsBody(url) {
      const c = calendar();
      if (!c.connected) return [{ ok: false, error: 'Google Calendar is not connected.', connected: false }, 409];
      const day = (iso, fallback) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? data.dateKey(d) : fallback; };
      const today = data.dateKey(now());
      const from = day(url.searchParams.get('from'), today);
      const to = day(url.searchParams.get('to'), data.plusDays(today, 7));
      return [{ events: clearOfFocusBlock(data.googleEvents(from, to > from ? to : data.plusDays(from, 1), c.selectedIds)), updatedAt: now().toISOString() }, 200];
    }
    // Scenes 3 to 5 put the focus block at the moment of recording. A class at that time is left out, so the block never
    // sits on top of a lecture in the video (the times compare as text: both are "YYYY-MM-DDTHH:MM").
    function clearOfFocusBlock(events) {
      const block = (appState()?.calendarEvents || []).find((e) => e.id === data.FOCUS_BLOCK_ID);
      if (!block) return events;
      return events.filter((e) => !(e.start < block.end && e.end > block.start));
    }
    function chatContext() {
      const s = appState();
      const tasks = (s?.tasks || []).filter((t) => !t.done).map((t) => ({ ...t, due: (s.calendarEvents || []).filter((e) => e.taskId === t.id && e.kind === 'deadline').map((e) => e.start).sort()[0] || null }));
      const plans = (s?.calendarEvents || []).filter((e) => e.kind === 'plan');
      const n = now();
      return { tasks, today: data.dateKey(n), dueLabel: (wall) => data.dueLabel(n, wall), slot: (minutes, notBefore) => data.freeSlot(n, minutes, plans, notBefore) };
    }
    async function chatAnswer(body) {
      const out = chat.answer(body, chatContext());
      await wait(900 + Math.min(900, out.reply.length * 4)); // "Concentr8 is thinking…" for a believable moment
      if (out.selectTaskId) dispatch('concentr8-demo:select-task', { taskId: out.selectTaskId });
      return json({ reply: out.reply, actions: out.actions, remaining: 99 });
    }

    // ---------- the real server, with the real call token ----------
    async function forward(url, init, path) {
      const token = real().token;
      const headers = new Headers(init.headers || {});
      if (token) headers.set('Authorization', `Bearer ${token}`); else headers.delete('Authorization');
      let body = init.body;
      if (path === '/api/settings' && typeof body === 'string') {
        // beta.26 sends no consent with a first number of a Google account; the form already made the student tick it.
        try { const b = JSON.parse(body); if (b.phoneNumber) body = JSON.stringify({ ...b, consent: true }); } catch (_) { /* send as is */ }
      }
      return realFetch(url.href, { ...init, headers, body });
    }

    async function settingsRoute(url, init) {
      let body = {};
      try { body = JSON.parse(init.body || '{}'); } catch (_) { /* empty */ }
      if (real().token) {
        const r = await forward(url, init, '/api/settings');
        if (r.ok && body.phoneNumber) setReal({ phoneEnd: String(body.phoneNumber).replace(/\D/g, '').slice(-4) });
        return r;
      }
      if (!body.phoneNumber) return json({ ok: true }); // nothing to send yet: the time is kept in the app
      // No real account yet: the first phone number creates one on the real server (the demo student stays signed in).
      const r = await realFetch(`${API}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: body.phoneNumber, consent: true, callTime: body.callTime, timezone: body.timezone }) });
      const result = await r.json().catch(() => ({}));
      if (r.ok && result.token) { setReal({ token: result.token, phoneEnd: String(body.phoneNumber).replace(/\D/g, '').slice(-4) }); return json({ ok: true }); }
      if (r.status === 409) return json({ ok: false, error: 'This number already has a Concentr8 account. Open Demo setup (Demo menu) and choose "Use my Google account" to link it.' }, 409);
      return json({ ok: false, error: result.error || `The server answered ${r.status}.` }, r.status || 502);
    }

    async function callRoute(url, init) {
      if (!real().token) return json({ ok: false, error: 'Real calls are not set up yet. Enter your phone number on this page and press Save first.' }, 400);
      let body = {};
      try { body = JSON.parse(init.body || '{}'); } catch (_) { /* morning call */ }
      const at = Date.now();
      const r = await forward(url, init, '/api/call-now');
      if (r.ok) dispatch('concentr8-demo:call', { reason: body.reason === 'stuck' ? 'stuck' : 'plan', task: body.task || '', at });
      return r;
    }

    async function handle(input, init = {}) {
      const url = new URL(typeof input === 'string' ? input : input.url, 'http://localhost');
      const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      if (url.origin === CANVAS) {
        await wait(450);
        const answer = data.canvasApi(url.pathname, now());
        return answer ? json(answer) : json({ errors: [{ message: 'The specified resource does not exist.' }] }, 404);
      }
      if (url.origin !== API) return realFetch(input, init);
      const path = url.pathname.replace(/\/+$/, '') || '/';

      if (path === '/google/status') { await wait(150); return json({ configured: true }); }
      if (path === '/google/calendars' && method === 'GET') { await wait(250); return json(calendarsBody()); }
      if (path === '/google/calendars' && method === 'POST') {
        let ids = [];
        try { ids = JSON.parse(init.body || '{}').calendarIds || []; } catch (_) { /* none */ }
        write(CAL_KEY, { ...calendar(), selectedIds: ids.filter((id) => data.googleCalendars.some((c) => c.id === id)).slice(0, 3) });
        await wait(300);
        return json(calendarsBody());
      }
      if (path === '/google/events') { await wait(350); const [body, status] = eventsBody(url); return json(body, status); }
      if (path === '/google/login') { write(CAL_KEY, { ...calendar(), connected: true }); await wait(300); return json({ authorizationUrl: `${API}/google/login?ticket=demo` }); }
      if (path === '/google/disconnect') { write(CAL_KEY, { ...calendar(), connected: false }); await wait(300); return json({ ok: true }); }
      if (path === '/api/me' && method === 'GET') { await wait(150); return json({ id: 'demo', email: data.persona.email, name: data.persona.name, phoneNumber: real().phoneEnd ? '••••' + real().phoneEnd : null, callTime: '08:00', callSlots: [], timezone: 'America/Los_Angeles', paused: false }); }
      if (path === '/api/me' && method === 'DELETE') {
        if (real().token) await forward(url, init, path).catch(() => null);
        write(REAL_KEY, {});
        return json({ ok: true });
      }
      if (path === '/api/chat' || path === '/api/chat/guest') {
        let body = {};
        try { body = JSON.parse(init.body || '{}'); } catch (_) { return json({ error: 'The request body is not valid JSON.' }, 400); }
        return chatAnswer(body);
      }
      if (path === '/api/relevance') return json({ relevant: true, reason: 'demo' });
      if (path === '/api/settings') return settingsRoute(url, init);
      if (path === '/api/call-now') return callRoute(url, init);
      if (path === '/api/register') {
        const r = await realFetch(url.href, init);
        const result = await r.clone().json().catch(() => ({}));
        if (r.ok && result.token) { setReal({ token: result.token }); return json({ ...result, token: DEMO_TOKEN }); }
        return r;
      }
      if (REAL_ROUTES.includes(path)) {
        if (!real().token && path === '/api/tasks') return json({ ok: true, count: 0 });
        if (!real().token && path !== '/api/health' && !path.startsWith('/auth/')) return json({ ok: false, error: 'Real calls are not set up yet.' }, 401);
        return path.startsWith('/auth/') ? realFetch(url.href, init) : forward(url, init, path);
      }
      return json({ ok: false, error: 'Not available in the demo.' }, 404);
    }

    return { handle, real, setReal, calendar };
  }

  return { create, API, CANVAS, DEMO_TOKEN, REAL_KEY, CAL_KEY, REAL_ROUTES };
});
