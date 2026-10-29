'use strict';
// Spoken answers and voice input: ElevenLabs through the server, only for signed-in students, with limits.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c8v-'));
Object.assign(process.env, {
  DATA_FILE: path.join(dir, 'data.json'),
  APP_API_KEY: 'owner-key',
  REGISTER_CODE: 'calhacks',
  ELEVENLABS_API_KEY: 'xi-test',
  ELEVENLABS_VOICE_ID: 'voice_1',
  VOICE_DAILY_TRANSCRIPTIONS: '2',
});

const { server } = require('../index.js');

const eleven = [];
let elevenStatus = 200;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (String(url).startsWith('https://api.elevenlabs.io/')) {
    eleven.push({ url: String(url), headers: opts.headers, body: opts.body });
    if (elevenStatus !== 200) return new Response('{}', { status: elevenStatus });
    return String(url).includes('speech-to-text')
      ? new Response(JSON.stringify({ text: 'hello there' }), { status: 200 })
      : new Response(Buffer.from([1, 2, 3, 4]), { status: 200 });
  }
  return realFetch(url, opts);
};

let base;
test.before(async () => {
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const call = (p, body, key, type = 'application/json') =>
  fetch(base + p, { method: 'POST', headers: { 'Content-Type': type, ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body });

async function signup(phone) {
  return (await call('/api/register', JSON.stringify({ phoneNumber: phone, inviteCode: 'calhacks', consent: true }))).json();
}

test('speak: needs a student, asks ElevenLabs once per text, then serves the saved audio', async () => {
  const s = await signup('+15555550151');
  assert.equal((await call('/api/voice/speak', JSON.stringify({ text: 'hi' }))).status, 401);

  const first = await call('/api/voice/speak', JSON.stringify({ text: 'Breathe in.' }), s.token);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'audio/mpeg');
  assert.deepEqual([...Buffer.from(await first.arrayBuffer())], [1, 2, 3, 4]);
  assert.equal(eleven.length, 1);
  assert.equal(eleven[0].url, 'https://api.elevenlabs.io/v1/text-to-speech/voice_1');
  assert.equal(eleven[0].headers['xi-api-key'], 'xi-test');
  assert.deepEqual(JSON.parse(eleven[0].body), { text: 'Breathe in.', model_id: 'eleven_multilingual_v2' });

  await call('/api/voice/speak', JSON.stringify({ text: 'Breathe in.' }), s.token);
  assert.equal(eleven.length, 1, 'the same text comes from the saved file');
});

test('speak: refuses empty and too long text, and reports ElevenLabs errors without the text', async () => {
  const s = await signup('+15555550152');
  assert.equal((await call('/api/voice/speak', JSON.stringify({ text: '  ' }), s.token)).status, 400);
  assert.equal((await call('/api/voice/speak', JSON.stringify({ text: 'x'.repeat(2001) }), s.token)).status, 413);
  elevenStatus = 401;
  const r = await call('/api/voice/speak', JSON.stringify({ text: 'a new sentence' }), s.token);
  elevenStatus = 200;
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error, 'ElevenLabs answered 401');
});

test('transcribe: sends the recording to ElevenLabs and returns the words; daily budget applies', async () => {
  const s = await signup('+15555550153');
  eleven.length = 0;
  const r = await call('/api/voice/transcribe', Buffer.from('fake-webm'), s.token, 'audio/webm');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { text: 'hello there' });
  assert.match(eleven[0].url, /speech-to-text$/);
  assert.equal(eleven[0].body.get('model_id'), 'scribe_v2');
  assert.equal((await call('/api/voice/transcribe', Buffer.alloc(0), s.token, 'audio/webm')).status, 400, 'empty recording');
  assert.equal((await call('/api/voice/transcribe', Buffer.from('b'), s.token, 'audio/webm')).status, 200);
  assert.equal((await call('/api/voice/transcribe', Buffer.from('c'), s.token, 'audio/webm')).status, 429, 'daily budget (2 in this test)');
});

test('without an ElevenLabs key the server says so and health does not list voice', async () => {
  const s = await signup('+15555550154');
  const key = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    assert.equal((await call('/api/voice/speak', JSON.stringify({ text: 'hi' }), s.token)).status, 503);
    const h = await (await fetch(base + '/api/health')).json();
    assert.ok(!h.features.includes('voice'));
  } finally { process.env.ELEVENLABS_API_KEY = key; }
  assert.ok((await (await fetch(base + '/api/health')).json()).features.includes('voice'));
});
