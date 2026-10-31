'use strict';
// Run: node --test server/test/guest-chat.test.js   (no network: Claude is replaced by a fake fetch)
// Why a file of its own: it needs its own limits and a Claude key, which the other tests must not have.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'c8-guest-')), 'data.json');
process.env.APP_API_KEY = 'owner-key';
process.env.ANTHROPIC_API_KEY = 'fake-key';
process.env.GUEST_CHAT_PER_DAY = '3';
process.env.GUEST_CHAT_PER_IP_PER_DAY = '5';
process.env.GUEST_CHAT_GLOBAL_PER_DAY = '9';

const { server, data } = require('../index.js');

let claudeFails = false;
const claudeCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.anthropic.com/')) {
    claudeCalls.push(JSON.parse(opts.body));
    if (claudeFails) return new Response('{}', { status: 500 });
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Start with one small step.' }] }), { status: 200 });
  }
  return realFetch(url, opts);
};

let base;
test.before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const guestId = (n) => String(n).padStart(32, 'a'); // 32 lower-case hex characters
const chat = (id, { ip = '203.0.113.1', text = 'I cannot start my essay' } = {}) =>
  fetch(`${base}/api/chat/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `${ip}:5555` },
    body: JSON.stringify({ guestId: id, messages: [{ role: 'user', text }], tasks: ['Essay'] }),
  });

test('a failed Claude answer is given back, it does not use up a free message', async () => {
  claudeFails = true;
  const failed = await chat(guestId(40), { ip: '203.0.113.60' });
  claudeFails = false;
  assert.equal(failed.status, 502);
  assert.equal(Object.values(data.guests)[0].count, 0);
});

test('a guest gets answers without any login, and is told how many are left', async () => {
  const r = await chat(guestId(1));
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.reply, 'Start with one small step.');
  assert.equal(body.remaining, 2);
});

test('a guest id must be 32 to 64 hex characters', async () => {
  for (const bad of ['', 'short', 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', 'a'.repeat(65)]) {
    assert.equal((await chat(bad)).status, 400, JSON.stringify(bad));
  }
});

test('the per-guest limit says how to continue, and a refused message costs no Claude call', async () => {
  const id = guestId(2);
  for (let i = 0; i < 3; i += 1) assert.equal((await chat(id, { ip: '203.0.113.2' })).status, 200);
  const before = claudeCalls.length;
  const r = await chat(id, { ip: '203.0.113.2' });
  assert.equal(r.status, 429);
  assert.match((await r.json()).error, /3 free messages for today.*Profile, Phone call/);
  assert.equal(claudeCalls.length, before);
});

test('another guest from the same address is stopped by the per-IP limit', async () => {
  // 203.0.113.9 sends 5 messages as 5 different guests, the 6th guest is refused although it is new.
  for (let i = 10; i < 15; i += 1) assert.equal((await chat(guestId(i), { ip: '203.0.113.9' })).status, 200);
  const r = await chat(guestId(15), { ip: '203.0.113.9' });
  assert.equal(r.status, 429);
  assert.match((await r.json()).error, /busy right now/);
});

test('a made-up X-Forwarded-For at the front does not help: the last entry counts', async () => {
  const send = (fake, n) => fetch(`${base}/api/chat/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `${fake}, 203.0.113.9:4444` },
    body: JSON.stringify({ guestId: guestId(n), messages: [{ role: 'user', text: 'hello' }] }),
  });
  assert.equal((await send('198.51.100.77', 20)).status, 429, 'still the address that already used its 5');
});

test('all guests together are limited too', async () => {
  // Counted so far: 1 + 3 + 5 = 9, the limit for everybody together in this test.
  const r = await chat(guestId(30), { ip: '203.0.113.50' });
  assert.equal(r.status, 429);
  assert.match((await r.json()).error, /busy right now/);
});

test('guest counters are saved as hashes, never as the guest id or an address', async () => {
  const saved = fs.readFileSync(process.env.DATA_FILE, 'utf8');
  assert.ok(!saved.includes(guestId(1)));
  assert.ok(!saved.includes('203.0.113'));
});
