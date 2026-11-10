/* Purpose: proves which first-start step shows when (frontend/onboarding.js, ADR 0048) and which calendar is picked after
   connecting. Run with node --test frontend/test/onboarding.test.js. Loads only the pure functions; no page, no server. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { nextStep, pickCalendar } = require('../onboarding.js');

const newStudent = { signedIn: true, demo: false, done: {}, calendar: 'disconnected', openTodos: 0 };

test('a new student gets the calendar step first', () => {
  assert.equal(nextStep(newStudent), 'calendar');
});

test('after the calendar step (connected or "Not now") comes the first to-do', () => {
  assert.equal(nextStep({ ...newStudent, done: { calendar: 'connected' } }), 'first-todo');
  assert.equal(nextStep({ ...newStudent, done: { calendar: 'skipped' } }), 'first-todo');
});

test('a calendar that is already connected skips step 2', () => {
  assert.equal(nextStep({ ...newStudent, calendar: 'connected' }), 'first-todo');
});

test('no Google on the server or no answer: step 2 is skipped this time', () => {
  assert.equal(nextStep({ ...newStudent, calendar: 'unconfigured' }), 'first-todo');
  assert.equal(nextStep({ ...newStudent, calendar: 'unknown' }), 'first-todo');
});

test('a student who already has an open to-do never gets step 3', () => {
  assert.equal(nextStep({ ...newStudent, done: { calendar: 'skipped' }, openTodos: 2 }), null);
});

test('nothing is asked twice: both steps done means no step', () => {
  assert.equal(nextStep({ ...newStudent, done: { calendar: 'skipped', firstTodo: 'done' } }), null);
});

test('signed out or in demo mode: no step', () => {
  assert.equal(nextStep({ ...newStudent, signedIn: false }), null);
  assert.equal(nextStep({ ...newStudent, demo: true }), null);
});

test('picks the main calendar (its id is the account email), otherwise the first', () => {
  const calendars = [{ id: 'classes', name: 'Classes' }, { id: 'Maya@Example.edu', name: 'Maya' }];
  assert.equal(pickCalendar(calendars, 'maya@example.edu'), 'Maya@Example.edu');
  assert.equal(pickCalendar(calendars, 'someone@else.edu'), 'classes');
  assert.equal(pickCalendar(calendars, ''), 'classes');
  assert.equal(pickCalendar([], 'maya@example.edu'), null);
  assert.equal(pickCalendar(undefined, 'maya@example.edu'), null);
});
