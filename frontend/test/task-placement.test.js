/* Purpose: regression coverage for placing new to-dos on the calendar by themselves (ADR 0041).
   Run with node --test frontend/test/task-placement.test.js. Uses a fake store and fake Google answers;
   never calls the hosted backend. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Tools = require('../calendar-tools.js');
const Placement = require('../task-placement.js');

const NOON = new Date(2026, 10, 2, 12, 0, 0); // a Monday
const plan = (id, taskId, start, end) => ({ id, taskId, kind: 'plan', title: id, start, end, allDay: false });
const deadline = (taskId, start, allDay = false) => ({ id: 'due-' + taskId, taskId, kind: 'deadline', title: 'due', start, end: start, allDay });
const task = (id, fields = {}) => ({ id, title: 'Task ' + id, done: false, steps: [], ...fields });

// A store that behaves like window.Articul8 where it matters: saveEvent makes the task active and announces the change.
function setup({ tasks = [], events: calendarEvents = [], busy = async () => [], saved = null, clock = () => NOON } = {}) {
  const listeners = new Map();
  const events = {
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    fire(name, detail) { (listeners.get(name) || []).forEach(listener => listener({ detail })); }
  };
  const data = new Map(saved ? [['concentr8-task-blocks-v1', JSON.stringify(saved)]] : []);
  const storage = { getItem: name => data.get(name) ?? null, setItem: (name, value) => data.set(name, value) };
  let nextId = 0, timers = [];
  const store = {
    state: { tasks, calendarEvents, activeTaskId: 'student-choice', settings: { focusMinutes: 25 } },
    saveEvent(input) {
      const id = 'block-' + (++nextId);
      store.state.calendarEvents.push({ ...input, id });
      store.state.activeTaskId = input.taskId;
      events.fire('articul8:change', { reason: 'calendar' });
      return id;
    },
    deleteEvent(id) {
      store.state.calendarEvents = store.state.calendarEvents.filter(event => event.id !== id);
      events.fire('articul8:change', { reason: 'calendar' });
    },
    change(fn) { fn(store.state); events.fire('articul8:change', { reason: 'calendar' }); }
  };
  const later = fn => { timers.push(fn); };
  const flush = async () => { for (let i = 0; i < 20 && timers.length; i += 1) { const run = timers; timers = []; for (const fn of run) await fn(); } };
  const handle = Placement.start({ store, tools: Tools, busyEvents: busy, storage, events, clock, later });
  const addTask = async (added, reason = 'tasks') => { store.state.tasks.push(added); events.fire('articul8:change', { reason }); await flush(); };
  const blocks = id => store.state.calendarEvents.filter(event => event.taskId === id && event.kind === 'plan');
  return { store, events, handle, flush, addTask, blocks };
}

test('a new to-do gets a block in the first free slot, with no Google Calendar', async () => {
  const { addTask, blocks } = setup();
  await addTask(task('a'));
  assert.equal(blocks('a').length, 1);
  assert.equal(blocks('a')[0].start, '2026-11-02T12:00');
  assert.equal(blocks('a')[0].end, '2026-11-02T12:25');
});

test('its estimate sets the length, and a second to-do goes after the first', async () => {
  const { addTask, blocks } = setup();
  await addTask(task('a', { estimatedMinutes: 60 }));
  await addTask(task('b'));
  assert.equal(blocks('a')[0].end, '2026-11-02T13:00');
  assert.equal(blocks('b')[0].start, '2026-11-02T13:00');
});

test('Google events block a slot', async () => {
  const { addTask, blocks } = setup({ busy: async () => [{ id: 'g', kind: 'google', start: '2026-11-02T12:00', end: '2026-11-02T14:00', allDay: false }] });
  await addTask(task('a'));
  assert.equal(blocks('a')[0].start, '2026-11-02T14:00');
});

test('while Google cannot be read the to-do waits, and gets its block afterwards', async () => {
  let time = NOON, answer = null;
  const { addTask, events, flush, blocks } = setup({ busy: async () => answer, clock: () => time });
  await addTask(task('a'));
  assert.equal(blocks('a').length, 0);
  answer = [];
  time = new Date(NOON.getTime() + 61000);
  events.fire('focus');
  await flush();
  assert.equal(blocks('a').length, 1);
});

test('a slot that ends after the deadline is not used, and that to-do stays on the list', async () => {
  const { addTask, blocks, store } = setup({ events: [deadline('a', '2026-11-02T12:10')] });
  await addTask(task('a'));
  assert.equal(blocks('a').length, 0);
  assert.equal(store.state.tasks.length, 1);
});

test('the block sees a deadline saved right after the to-do', async () => {
  const { store, events, flush, blocks } = setup();
  store.state.tasks.push(task('a'));
  events.fire('articul8:change', { reason: 'tasks' });
  store.state.calendarEvents.push(deadline('a', '2026-11-02T12:10'));
  await flush();
  assert.equal(blocks('a').length, 0);
});

test('an all-day deadline leaves the whole day', async () => {
  const { addTask, blocks } = setup({ events: [deadline('a', '2026-11-02T00:00', true)] });
  await addTask(task('a'));
  assert.equal(blocks('a').length, 1);
});

test('a full week means no block, and nothing is overbooked', async () => {
  const days = [2, 3, 4, 5, 6, 7, 8].map(d => plan('busy' + d, 'other', `2026-11-0${d}T08:00`, `2026-11-0${d}T21:00`));
  const { addTask, blocks } = setup({ events: days });
  await addTask(task('a'));
  assert.equal(blocks('a').length, 0);
});

test('a calendar event made by hand creates its own task, and that task gets no second block', async () => {
  const { addTask, blocks } = setup({ events: [plan('mine', 'a', '2026-11-03T10:00', '2026-11-03T11:00')] });
  await addTask(task('a'));
  assert.equal(blocks('a').length, 1);
  assert.equal(blocks('a')[0].id, 'mine');
});

test('a deleted block never comes back', async () => {
  const { addTask, blocks, store, flush, events } = setup();
  await addTask(task('a'));
  store.deleteEvent(blocks('a')[0].id);
  await flush();
  events.fire('articul8:change', { reason: 'tasks' });
  await flush();
  assert.equal(blocks('a').length, 0);
});

test('placing a block does not change the task the student is working on', async () => {
  const { addTask, store } = setup();
  await addTask(task('a'));
  assert.equal(store.state.activeTaskId, 'student-choice');
});

test('finishing a to-do removes its future block, but not one the student planned', async () => {
  const { addTask, blocks, store, events, flush } = setup({ events: [plan('now', 'other', '2026-11-02T12:00', '2026-11-02T13:00'), plan('mine', 'b', '2026-11-03T10:00', '2026-11-03T11:00')] });
  await addTask(task('a')); // lands at 13:00, so it is still ahead
  await addTask(task('b'));
  store.state.tasks.forEach(t => { t.done = true; });
  events.fire('articul8:change', { reason: 'tasks' });
  await flush();
  assert.equal(blocks('a').length, 0);
  assert.equal(blocks('b').length, 1);
});

test('a block already in the past stays when the to-do is finished', async () => {
  let time = NOON;
  const { addTask, blocks, store, events, flush } = setup({ clock: () => time });
  await addTask(task('a'));
  time = new Date(2026, 10, 2, 15, 0, 0);
  store.state.tasks[0].done = true;
  events.fire('articul8:change', { reason: 'tasks' });
  await flush();
  assert.equal(blocks('a').length, 1);
});

test('to-dos from before this change are left alone', async () => {
  const { flush, blocks } = setup({ tasks: [task('old')] });
  await flush();
  assert.equal(blocks('old').length, 0);
});

test('tasks arriving through a reset or another tab are left alone', async () => {
  const { addTask, blocks } = setup();
  await addTask(task('other-tab'), 'restore');
  assert.equal(blocks('other-tab').length, 0);
});

test('a finished to-do never gets a block', async () => {
  const { addTask, blocks } = setup();
  await addTask(task('a', { done: true }));
  assert.equal(blocks('a').length, 0);
});

test('minutesFor falls back to the focus length, then 25, and stays within a working day', () => {
  assert.equal(Placement.minutesFor({ estimatedMinutes: 45 }, 30), 45);
  assert.equal(Placement.minutesFor({}, 30), 30);
  assert.equal(Placement.minutesFor({}, undefined), 25);
  assert.equal(Placement.minutesFor({ estimatedMinutes: 5000 }, 30), 780);
});
