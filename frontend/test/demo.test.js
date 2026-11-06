/* Purpose: coverage for demo mode (ADR 0042): ?demo switches it on, the fixed answer breaks three assignments into steps,
   and without ?demo nothing changes. Run with node --test frontend/test/demo.test.js. No server, no Claude. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../concentr8-demo.js');

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const ask = (text) => [{ role: 'user', text }];

test('?demo switches demo mode on; without it nothing is active', () => {
  assert.equal(create('?demo', memory()).isDemo(), true);
  assert.equal(create('', memory()).isDemo(), false);
  assert.equal(create('?demonstration=1', memory()).isDemo(), false);
});

test('the tab stays a demo tab after the address loses ?demo', () => {
  const storage = memory();
  create('?demo', storage);
  assert.equal(create('', storage).isDemo(), true);
});

test('demo: "three assignments due, where should I start" gives three to-dos with steps and future due dates', () => {
  const r = create('?demo', memory()).reply(ask('I have three assignment due, where should I start'), '2026-11-06');
  assert.equal(r.actions.length, 3);
  assert.deepEqual(r.actions.map((a) => a.due), ['2026-11-09', '2026-11-11', '2026-11-13']);
  for (const a of r.actions) {
    assert.equal(a.type, 'add_todo');
    assert.ok(a.minutes > 0 && a.steps.length >= 3);
  }
  assert.match(r.reply, /Computer Vision/);
});

test('demo: other messages go to the normal chat', () => {
  assert.equal(create('?demo', memory()).reply(ask('hello'), '2026-11-06'), null);
});

test('not a demo: the same sentence is never answered with the fixed answer', () => {
  assert.equal(create('', memory()).reply(ask('I have three assignment due, where should I start'), '2026-11-06'), null);
});
