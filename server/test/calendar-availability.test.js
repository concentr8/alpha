// Purpose: pure first-free-slot cases for CalendarUI; npm test calls Node only.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findFreeSlot } = require('../../frontend/calendar-tools');
const event = (start, end, extra = {}) => ({ start, end, ...extra });
test('first slot starts at 08:00, or the next quarter hour after now', () => {
  assert.deepEqual(findFreeSlot([], 60, '2026-01-01T07:00'), { start:'2026-01-01T08:00', end:'2026-01-01T09:00' });
  assert.equal(findFreeSlot([], 30, '2026-01-01T08:01').start, '2026-01-01T08:15');
});
test('overlaps block time, touching intervals do not', () => {
  const busy = [event('2026-01-01T08:00','2026-01-01T09:00'),event('2026-01-01T09:30','2026-01-01T10:00')];
  assert.equal(findFreeSlot(busy,30,'2026-01-01T07:00').start,'2026-01-01T09:00');
  assert.equal(findFreeSlot(busy,60,'2026-01-01T07:00').start,'2026-01-01T10:00');
});
test('all-day and multi-day events block every included day', () => {
  const busy=[event('2026-01-01T00:00','2026-01-03T00:00',{allDay:true,kind:'google'}),event('2026-01-03T07:00','2026-01-03T09:00')];
  assert.equal(findFreeSlot(busy,60,'2026-01-01T07:00').start,'2026-01-03T09:00');
});
test('deadlines block their visible interval, including an entire all-day date', () => {
  assert.equal(findFreeSlot([event('2026-01-01T08:00','2026-01-01T08:00',{kind:'deadline'})],30,'2026-01-01T08:00').start,'2026-01-01T08:30');
  assert.equal(findFreeSlot([event('2026-01-01T00:00','2026-01-01T00:00',{kind:'deadline',allDay:true})],30,'2026-01-01T07:00').start,'2026-01-02T08:00');
});
test('workday ends at 21:00 and unavailable weeks have no slot', () => {
  assert.equal(findFreeSlot([],60,'2026-01-01T20:00').end,'2026-01-01T21:00');
  assert.equal(findFreeSlot([],60,'2026-01-01T20:01').start,'2026-01-02T08:00');
  assert.equal(findFreeSlot([event('2026-01-01T00:00','2026-01-08T00:00',{allDay:true})],15,'2026-01-01T07:00'),null);
  assert.equal(findFreeSlot([],781,'2026-01-01T07:00'),null);
});
