// Purpose: checks the demo build's mock data, scripted chat and fake backend without a browser.
// Called by: `npm test` in app/ (the demo branch adds this file to the app tests).
// Calls: frontend/demo/demo-data.js, demo-chat.js and demo-api.js with a fake storage and a fake network.
//        Fake phone numbers only (+15555550100 style).
// DEMO ONLY: branch demo/video-2026-11-04, never merged.
const test = require('node:test');
const assert = require('node:assert/strict');
const DemoData = require('../demo-data');
const DemoChat = require('../demo-chat');
const DemoApi = require('../demo-api');

// The same checks app-state.js runs when it loads the saved state (index.html, validTime/validEvent).
const validTime = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) && new Date(v + 'Z').toISOString().slice(0, 16) === v;
const validEvent = (e) => e && typeof e.title === 'string' && e.title.trim() && validTime(e.start) && validTime(e.end) && (e.kind === 'deadline' || e.end > e.start);

// A Wednesday afternoon, like the day the demo was built (local time of the test machine).
const WED = new Date(2026, 10, 4, 14, 5);
const SAT_MORNING = new Date(2026, 10, 7, 8, 40);
const LATE = new Date(2026, 10, 4, 21, 50);

test('fake bCourses answers like the Canvas REST API', () => {
  const me = DemoData.canvasApi('/api/v1/users/self', WED);
  assert.equal(me.name, 'Maya Chen');
  const courses = DemoData.canvasApi('https://bcourses.berkeley.edu/api/v1/courses?enrollment_state=active', WED);
  assert.equal(courses.length, 4);
  assert.ok(courses.every((c) => Number.isInteger(c.id) && c.course_code && c.name));
  const cs188 = DemoData.canvasApi('/api/v1/courses/1880/assignments?bucket=upcoming', WED);
  assert.deepEqual(cs188.map((a) => a.name), ['Project 3: Reinforcement Learning', 'Homework 6: MDPs']);
  assert.ok(cs188.every((a) => !Number.isNaN(Date.parse(a.due_at)) && a.html_url.startsWith('https://bcourses.berkeley.edu/courses/1880/')));
  assert.equal(DemoData.canvasApi('/api/v1/courses/9999/assignments', WED), null);
  assert.equal(DemoData.canvasApi('/api/v1/nothing', WED), null);
});

test('the Canvas import gives courses, tasks with steps and valid deadlines', () => {
  const out = DemoData.canvasImport(WED);
  assert.equal(out.courses.length, 4);
  assert.equal(out.tasks.length, 8);
  assert.equal(out.deadlines.length, 8);
  assert.ok(out.tasks.every((t) => t.steps.length >= 2 && t.source.startsWith('canvas:') && t.estimatedMinutes > 0));
  assert.ok(out.deadlines.every((d) => validEvent(d) && d.kind === 'deadline' && out.tasks.some((t) => t.id === d.taskId)));
  // Due dates are relative to the day of recording: the lab is always due tomorrow.
  const lab = out.deadlines.find((d) => d.title.startsWith('Lab 9'));
  assert.equal(lab.start, '2026-11-05T23:59');
  assert.equal(DemoData.dueLabel(WED, lab.start), 'tomorrow');
});

test('the fake Google Calendar has a believable week and respects the chosen calendars', () => {
  const all = DemoData.googleEvents('2026-11-02', '2026-11-09');
  assert.equal(all.length, 17); // classes, gym, club and family: a full student week
  assert.ok(all.every((e) => validTime(e.start) && validTime(e.end) && e.end > e.start));
  assert.ok(!all.some((e) => e.calendarId === 'demo-holidays'));
  const onlyClasses = DemoData.googleEvents('2026-11-02', '2026-11-09', ['demo-school']);
  assert.ok(onlyClasses.length > 0 && onlyClasses.every((e) => e.calendarId === 'demo-school'));
  assert.ok(DemoData.googleEvents('2026-11-04', '2026-11-05').some((e) => e.title === 'ECON 1 Lecture'));
});

test('free slots never sit on a class and stop at 22:00', () => {
  const slot = DemoData.freeSlot(WED, 90);
  assert.equal(slot.start, '2026-11-04T15:00'); // 14:00-15:00 is ECON 1
  const late = DemoData.freeSlot(LATE, 90);
  assert.equal(late.start.slice(0, 10), '2026-11-05'); // too late today: tomorrow
  const busy = DemoData.googleEvents(late.start.slice(0, 10), DemoData.plusDays(late.start.slice(0, 10), 1));
  assert.ok(!busy.some((e) => late.start < e.end && late.end > e.start));
});

test('every scene seeds a state that app-state.js accepts', () => {
  for (const now of [WED, SAT_MORNING, LATE]) {
    for (const scene of [1, 2, 3, 4, 5]) {
      const s = DemoData.state(scene, now);
      assert.equal(s.version, 2);
      assert.ok(s.calendarEvents.every(validEvent), `scene ${scene}: invalid calendar event`);
      assert.ok(s.tasks.every((t) => typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.steps)));
      assert.ok(s.sessions.every((r) => r.finishedAt <= now.getTime()), `scene ${scene}: a session in the future`);
      assert.ok(s.chats.some((c) => c.id === s.activeChatId));
      assert.deepEqual(s.tools.blockedApps, ['YouTube', 'Instagram', 'TikTok', 'Reddit', 'Netflix']);
      assert.equal(s.tasks.length, scene === 1 ? 2 : 10);
    }
  }
  assert.ok(DemoData.state(3, WED).calendarEvents.some((e) => e.id === DemoData.FOCUS_BLOCK_ID && e.start === '2026-11-04T14:00'));
  const four = DemoData.state(4, WED);
  assert.equal(four.activeSession.status, 'running');
  assert.equal(four.activeSession.taskId, DemoData.FOCUS_TASK);
  assert.equal(DemoData.state(5, WED).sessions.length, DemoData.state(3, WED).sessions.length + 1);
  assert.deepEqual(DemoData.state(2, WED), DemoData.state(2, WED)); // the same every take
});

// ---------- scripted chat ----------
function chatCtx(now = WED) {
  const s = DemoData.state(2, now);
  const tasks = s.tasks.map((t) => ({ ...t, due: s.calendarEvents.filter((e) => e.taskId === t.id && e.kind === 'deadline').map((e) => e.start)[0] || null }));
  return { tasks, today: DemoData.dateKey(now), dueLabel: (w) => DemoData.dueLabel(now, w), slot: (m, nb) => DemoData.freeSlot(now, m, [], nb) };
}
const say = (pairs) => ({ messages: pairs.map(([role, text]) => ({ role, text })) });

test('chat: the brain dump lists what is due first and asks for time', () => {
  const out = DemoChat.answer(say([['user', "I have so much due this week and I don't know where to start"]]), chatCtx());
  assert.match(out.reply, /Lab 9: Feature Engineering \(DATA C100\) — due tomorrow/);
  assert.match(out.reply, /How much time do you have today\?/);
  assert.deepEqual(out.actions, []);
});

test('chat: "about two hours" becomes two calendar suggestions in free slots', () => {
  const first = DemoChat.answer(say([['user', 'so much due']]), chatCtx());
  const out = DemoChat.answer(say([['user', 'so much due'], ['assistant', first.reply], ['user', 'About two hours']]), chatCtx());
  assert.equal(out.actions.length, 2);
  assert.ok(out.actions.every((a) => a.type === 'suggest_calendar' && validTime(a.start) && validTime(a.end) && a.end > a.start));
  assert.equal(out.actions[0].title, 'Project 3: Reinforcement Learning');
  assert.equal(out.actions[0].start, '2026-11-04T15:00');
  assert.equal(out.actions[1].start, out.actions[0].end);
  assert.match(out.reply, /fits your 2 hours/);
});

test('chat: yes, stuck, stress and a plain to-do get fitting answers', () => {
  const ctx = chatCtx();
  assert.equal(DemoChat.answer(say([['user', 'x'], ['assistant', 'Add them to your calendar?'], ['user', 'Sounds good']]), ctx).actions[0].tool, 'block');
  assert.equal(DemoChat.answer(say([['user', "I'm stuck on the project"]]), ctx).actions[0].tool, 'timer');
  assert.equal(DemoChat.answer(say([['user', 'I feel really stressed']]), ctx).actions[0].tool, 'breathing');
  const todo = DemoChat.answer(say([['user', 'remind me to email my TA about the regrade']]), ctx);
  assert.equal(todo.actions[0].type, 'add_todo');
  assert.equal(todo.actions[0].title, 'Email my TA about the regrade');
});

test('chat: Quick Start focus planning picks the task the student names', () => {
  const mark = '\n\nQuick Start focus planning: (server instruction)';
  const ctx = chatCtx();
  assert.match(DemoChat.answer(say([['user', 'Help me plan a focus session' + mark]]), ctx).reply, /how much time/i);
  const out = DemoChat.answer(say([['user', 'Help me plan a focus session'], ['assistant', '?'], ['user', 'CS 188 project, 45 minutes' + mark]]), ctx);
  assert.equal(out.selectTaskId, DemoData.FOCUS_TASK);
  assert.match(out.reply, /value iteration/);
});

test('chat: minutes and spoken times are understood', () => {
  assert.equal(DemoChat.minutesIn('about two hours'), 120);
  assert.equal(DemoChat.minutesIn('an hour and a half'), 90);
  assert.equal(DemoChat.minutesIn('45 min'), 45);
  assert.equal(DemoChat.minutesIn('no idea'), null);
  const at = (text) => { const d = DemoChat.parseTime(text, WED); return d && `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  assert.equal(at('four thirty pm'), '16:30');
  assert.equal(at('at 3:30'), '15:30');
  assert.equal(at('half past four'), '16:30');
  assert.equal(at('in 10 minutes'), '14:15');
  assert.equal(at('now'), '14:05');
  assert.equal(at('at four'), '16:00'); // no am/pm in the afternoon: never 4 in the morning
  assert.equal(at('whenever'), null);
});

// ---------- fake backend ----------
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
function setup({ realAnswer } = {}) {
  const sent = [];
  const events = [];
  const storage = memoryStorage();
  let state = DemoData.state(3, WED);
  const realFetch = async (url, init = {}) => {
    sent.push({ url: String(url), auth: new Headers(init.headers || {}).get('Authorization'), body: init.body });
    const answer = realAnswer ? realAnswer(String(url), init) : { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'Content-Type': 'application/json' } });
  };
  const api = DemoApi.create({ storage, realFetch, now: () => WED, data: DemoData, chat: DemoChat, appState: () => state, dispatch: (name, detail) => events.push({ name, detail }), delay: async () => {} });
  return { api, sent, events, storage, setState: (s) => { state = s; } };
}
const A = DemoApi.API;
const post = (body, token = DemoApi.DEMO_TOKEN) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });

test('fake backend: Canvas, Google Calendar and chat never touch the network', async () => {
  const { api, sent } = setup();
  assert.equal((await (await api.handle('https://bcourses.berkeley.edu/api/v1/courses')).json()).length, 4);
  assert.equal((await api.handle('https://bcourses.berkeley.edu/api/v1/courses/1/assignments')).status, 404);
  const cals = await (await api.handle(A + '/google/calendars')).json();
  assert.equal(cals.connected, true);
  assert.equal(cals.calendars.length, 4);
  const events = await (await api.handle(`${A}/google/events?from=2026-11-04T00:00:00Z&to=2026-11-05T12:00:00Z`)).json();
  assert.ok(events.events.length > 0);
  const chat = await (await api.handle(A + '/api/chat', post({ messages: [{ role: 'user', text: 'so much due this week' }] }))).json();
  assert.match(chat.reply, /due first/);
  assert.equal((await api.handle(A + '/api/relevance', post({}))).status, 200);
  assert.equal((await api.handle(A + '/api/unknown')).status, 404);
  assert.deepEqual(sent, []);
});

test('fake backend: a class at the time of the focus block is left out of the calendar', async () => {
  const { api, setState } = setup();
  const day = `${A}/google/events?from=2026-11-04T00:00:00&to=2026-11-05T00:00:00`;
  const withBlock = (await (await api.handle(day)).json()).events.map((e) => e.title);
  assert.ok(!withBlock.includes('ECON 1 Lecture')); // 14:00-15:00, the block is 14:00-15:30
  setState(DemoData.state(2, WED));
  assert.ok((await (await api.handle(day)).json()).events.some((e) => e.title === 'ECON 1 Lecture'));
});

test('fake backend: choosing calendars and disconnecting is kept', async () => {
  const { api } = setup();
  await api.handle(A + '/google/calendars', post({ calendarIds: ['demo-school', 'nope'] }));
  assert.deepEqual(api.calendar().selectedIds, ['demo-school']);
  await api.handle(A + '/google/disconnect', post({}));
  assert.equal((await api.handle(A + '/google/events')).status, 409);
});

test('real calls: the first number makes a real account; its token is used only for the real routes', async () => {
  const { api, sent, events } = setup({ realAnswer: (url) => (url.endsWith('/api/register') ? { status: 200, body: { ok: true, userId: 'u1', token: 'REAL' } } : { status: 200, body: { ok: true } }) });
  assert.equal((await api.handle(A + '/api/call-now', post({}))).status, 400); // not set up yet: nothing is sent
  assert.deepEqual(sent, []);
  const saved = await api.handle(A + '/api/settings', post({ phoneNumber: '+1 555 555 0100', callTime: '08:00', timezone: 'America/Los_Angeles' }));
  assert.equal(saved.status, 200);
  assert.deepEqual(api.real(), { token: 'REAL', phoneEnd: '0100' });
  assert.equal(JSON.parse(sent[0].body).consent, true);
  await api.handle(A + '/api/call-now', post({ reason: 'stuck', task: 'Project 3' }));
  const call = sent.at(-1);
  assert.equal(call.url, A + '/api/call-now');
  assert.equal(call.auth, 'Bearer REAL'); // never the demo token
  assert.deepEqual(events.map((e) => [e.name, e.detail.reason]), [['concentr8-demo:call', 'stuck']]);
  await api.handle(A + '/api/today', { headers: { Authorization: `Bearer ${DemoApi.DEMO_TOKEN}` } });
  assert.equal(sent.at(-1).auth, 'Bearer REAL');
});

test('real calls: settings with a real token add consent for a Google account\'s first number', async () => {
  const { api, sent } = setup();
  api.setReal({ token: 'REAL' });
  await api.handle(A + '/api/settings', post({ phoneNumber: '+15555550100', callTime: '18:00' }));
  assert.equal(JSON.parse(sent[0].body).consent, true);
  assert.equal(sent[0].auth, 'Bearer REAL');
  assert.equal(api.real().phoneEnd, '0100');
});

test('real calls: a number that already has an account gets a clear message', async () => {
  const { api } = setup({ realAnswer: () => ({ status: 409, body: { error: 'This number is already signed up.' } }) });
  const r = await api.handle(A + '/api/settings', post({ phoneNumber: '+15555550100' }));
  assert.equal(r.status, 409);
  assert.match((await r.json()).error, /Use my Google account/);
});

test('without a real account, task sync is a quiet no-op and voice says why', async () => {
  const { api, sent } = setup();
  assert.deepEqual(await (await api.handle(A + '/api/tasks', post({ tasks: [] }))).json(), { ok: true, count: 0 });
  assert.equal((await api.handle(A + '/api/voice/speak', post({ text: 'hi' }))).status, 401);
  assert.deepEqual(sent, []);
});
