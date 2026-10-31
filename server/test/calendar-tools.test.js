/* Purpose: protect the pure Calendar date and quick-add rules.
   Called by `npm test` in server/; calls only Node's built-in test runner. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { addDays, localDate, validDate, weekStart, parseQuickAdd } = require('../../frontend/calendar-tools.js');

test('calendar date helpers use browser-local day and ISO calendar arithmetic', () => {
  assert.equal(localDate(new Date(2025, 0, 1, 0, 15)), '2025-01-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-12-31', 1), '2025-01-01');
  assert.equal(addDays('2025-01-01', -1), '2024-12-31');
  assert.equal(weekStart('2024-12-31'), '2024-12-30');
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2025-02-29'), false);
});

test('quick add parses title, weekday, time and duration without inference', () => {
  const result = parseQuickAdd('study OR sheet tue 3pm 2h', { today: '2025-01-06' });
  assert.equal(result.status, 'valid');
  assert.deepEqual(result.event, {
    title: 'study OR sheet',
    kind: 'plan',
    start: '2025-01-07T15:00',
    end: '2025-01-07T17:00',
    allDay: false,
    taskId: null,
    notes: ''
  });
});

test('quick add accepts today, tomorrow and explicit dates across month boundaries', () => {
  assert.equal(parseQuickAdd('Reading today 11:30pm 30m', { today: '2025-01-31' }).event.start, '2025-01-31T23:30');
  assert.equal(parseQuickAdd('Reading today 11:30pm 30m', { today: '2025-01-31' }).event.end, '2025-02-01T00:00');
  assert.equal(parseQuickAdd('Reading tomorrow 12am 1h', { today: '2025-01-31' }).event.start, '2025-02-01T00:00');
  assert.equal(parseQuickAdd('Review 2024-02-29 9:15am 45m', { today: '2025-03-01' }).event.end, '2024-02-29T10:00');
});

test('quick add distinguishes invalid and ambiguous date, time and duration input', () => {
  assert.equal(parseQuickAdd('Study Tuesday 3pm 2h', { today: '2025-01-06' }).status, 'valid');
  assert.equal(parseQuickAdd('Study Friday 3pm 2h', { today: '2025-01-06' }).event.start, '2025-01-10T15:00');
  assert.equal(parseQuickAdd('Study 2025-02-30 3pm 2h', { today: '2025-01-06' }).status, 'invalid');
  assert.equal(parseQuickAdd('Study today tomorrow 3pm 2h', { today: '2025-01-06' }).status, 'ambiguous');
  assert.equal(parseQuickAdd('Study Tue 3pm and 4pm 2h', { today: '2025-01-06' }).status, 'ambiguous');
  assert.equal(parseQuickAdd('Study Tuesday 3pm', { today: '2025-01-06' }).status, 'invalid');
  assert.equal(parseQuickAdd('Lunch Tuesday 11pm 2h', { today: '2025-01-06' }).reason, 'crosses-day');
  assert.equal(parseQuickAdd('just an idea', { today: '2025-01-06' }).reason, 'missing-date');
});
