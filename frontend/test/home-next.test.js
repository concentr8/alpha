/* Purpose: proves the order of to-dos on Home and the due-date words (frontend/home-next.js, ADR 0049).
   Run with node --test frontend/test/home-next.test.js. Loads only the pure functions; times are the device's own. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { order, dueText, leftMs } = require('../home-next.js');

const now = new Date(2026, 10, 10, 14, 0); // Tue 10 Nov 2026, 14:00 on this device
const deadline = (taskId, start, allDay = false) => ({ id: 'd-' + taskId, taskId, kind: 'deadline', start, allDay });

test('order: overdue first (oldest first), then by deadline, then no date in the order added; done to-dos left out', () => {
  const tasks = [
    { id: 'none-1', title: 'No date A' }, { id: 'later', title: 'Later' }, { id: 'old', title: 'Old' },
    { id: 'none-2', title: 'No date B' }, { id: 'over', title: 'Overdue' }, { id: 'done', title: 'Done', done: true },
  ];
  const events = [
    deadline('later', '2026-11-20T17:00'), deadline('old', '2026-11-01T09:00'), deadline('over', '2026-11-09T17:00'),
    deadline('done', '2026-11-02T10:00'), { id: 'plan', taskId: 'none-1', kind: 'plan', start: '2026-11-10T10:00' },
  ];
  assert.deepEqual(order(tasks, events).map((x) => x.task.id), ['old', 'over', 'later', 'none-1', 'none-2']);
});

test('order: the earliest of two deadlines counts; equal deadlines keep the order added', () => {
  const tasks = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
  const events = [deadline('a', '2026-11-12T17:00'), deadline('a', '2026-11-11T08:00'), deadline('b', '2026-11-11T08:00')];
  assert.deepEqual(order(tasks, events).map((x) => x.task.id), ['a', 'b']);
});

test('due words: today, tomorrow, a weekday, a later date, no date', () => {
  const text = (start, opts) => dueText(start ? { start } : null, now, opts).text;
  assert.equal(text('2026-11-10T17:00'), 'Due today, 5:00 PM');
  assert.equal(text('2026-11-11T17:00'), 'Due tomorrow, 5:00 PM');
  assert.equal(text('2026-11-13T17:00'), 'Due Fri');
  assert.equal(text('2026-11-24T17:00'), 'Due Nov 24');
  assert.equal(text(null), 'No date');
  assert.equal(dueText({ start: '2026-11-11T00:00', allDay: true }, now).text, 'Due tomorrow');
});

test('due words: overdue since yesterday, overdue n days, and a time today that has passed', () => {
  assert.deepEqual(dueText({ start: '2026-11-09T17:00' }, now), { text: 'Overdue since yesterday', overdue: true });
  assert.deepEqual(dueText({ start: '2026-11-07T17:00' }, now), { text: 'Overdue 3 days', overdue: true });
  assert.deepEqual(dueText({ start: '2026-11-10T09:00' }, now), { text: 'Was due today, 9:00 AM', overdue: true }); // words, not only colour
  assert.deepEqual(dueText({ start: '2026-11-10T09:00' }, now, { short: true }), { text: 'Overdue today', overdue: true });
  assert.equal(dueText({ start: '2026-11-10T17:00' }, now).overdue, false);
});

test('short words for rows', () => {
  const short = (start) => dueText({ start }, now, { short: true }).text;
  assert.equal(short('2026-11-10T17:00'), 'Today');
  assert.equal(short('2026-11-11T17:00'), 'Tomorrow');
  assert.equal(short('2026-11-13T17:00'), 'Fri');
});

test('due words follow the language and keep the stored wall-clock time', () => {
  const t = (text, values) => ({ 'Due tomorrow, {time}': 'Morgen fällig, {time}' }[text] || text).replace(/\{(\w+)\}/g, (m, k) => values[k]);
  assert.equal(dueText({ start: '2026-11-11T17:00' }, now, { t, language: 'de' }).text, 'Morgen fällig, 17:00');
});

test('time left of a running and of a paused focus phase', () => {
  const started = now.getTime() - 5 * 60000;
  const running = { status: 'running', index: 0, phases: [{ seconds: 1500 }], phaseStartedAt: started, phaseElapsedMs: 0 };
  assert.equal(leftMs(running, now.getTime()), 20 * 60000);
  assert.equal(leftMs({ ...running, status: 'paused', phaseStartedAt: null, phaseElapsedMs: 600000 }, now.getTime()), 15 * 60000);
  assert.equal(leftMs({ ...running, phases: [{ seconds: 0 }] }, now.getTime()), null);
});
