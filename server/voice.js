// Purpose: speech with ElevenLabs for the app: text to speech (read aloud) and speech to text (voice input).
// Called by: server/index.js, routes POST /api/voice/speak and POST /api/voice/transcribe (signed-in students only).
// Calls: https://api.elevenlabs.io (plain fetch, no package). Ported from backend/src/voice/ (Python) so the app needs only one server.
// Why here and not in the browser: the ElevenLabs key must never reach the browser.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const API_BASE = 'https://api.elevenlabs.io';
// Limits protect the ElevenLabs credits from a runaway page or a bad actor.
const MAX_TEXT_CHARS = 2000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// Counters live in memory: they reset when the server restarts. TODO: keep them in the data file if more than one server runs.
const recentRequests = new Map(); // student id -> request times in the last hour
let day = '';
let spokenCharsToday = 0;
let transcriptionsToday = 0;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function settings(env) {
  return {
    key: env.ELEVENLABS_API_KEY || '',
    voiceId: env.ELEVENLABS_VOICE_ID || '',
    ttsModel: env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2',
    sttModel: env.ELEVENLABS_STT_MODEL || 'scribe_v2',
    perHour: Number(env.VOICE_REQUESTS_PER_USER_PER_HOUR || 60),
    dailySpeechChars: Number(env.VOICE_DAILY_SPEECH_CHARACTERS || 20000),
    dailyTranscriptions: Number(env.VOICE_DAILY_TRANSCRIPTIONS || 200),
  };
}

function checkStudent(userId, perHour, now = Date.now()) {
  const recent = (recentRequests.get(userId) || []).filter((t) => now - t < 3_600_000);
  if (recent.length >= perHour) throw httpError(429, 'Too many voice requests from you. Try again later.');
  recent.push(now);
  recentRequests.set(userId, recent);
}

function startNewDayIfNeeded() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    spokenCharsToday = 0;
    transcriptionsToday = 0;
  }
}

// The daily meditation reads the same words to everyone, so the audio is saved: ElevenLabs is paid once per text.
// The file name changes with voice and model, so a new voice never gets old audio.
function cacheFile(env, s, text) {
  const dir = path.join(path.dirname(env.DATA_FILE || path.join(__dirname, 'data.json')), 'voice-cache');
  const name = crypto.createHash('sha256').update(`${s.voiceId}|${s.ttsModel}|${text}`).digest('hex');
  return path.join(dir, `${name}.mp3`);
}

async function speak(env, userId, text) {
  const s = settings(env);
  if (!s.key || !s.voiceId) throw httpError(503, 'Spoken answers are not set up on this server.');
  if (typeof text !== 'string' || !text.trim()) throw httpError(400, 'Missing text.');
  if (text.length > MAX_TEXT_CHARS) throw httpError(413, `The text is longer than ${MAX_TEXT_CHARS} characters.`);
  checkStudent(userId, s.perHour);

  const file = cacheFile(env, s, text);
  try { return fs.readFileSync(file); } catch { /* not saved yet */ }

  startNewDayIfNeeded();
  if (spokenCharsToday + text.length > s.dailySpeechChars) throw httpError(429, 'The daily voice budget is used up. Try again tomorrow.');
  spokenCharsToday += text.length;
  let res;
  try {
    res = await fetch(`${API_BASE}/v1/text-to-speech/${encodeURIComponent(s.voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': s.key, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: s.ttsModel }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw httpError(502, `ElevenLabs did not answer (${err.name})`);
  }
  // The status only: the text is the student's own words.
  if (!res.ok) throw httpError(502, `ElevenLabs answered ${res.status}`);
  const audio = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, audio);
  return audio;
}

async function transcribe(env, userId, audio, contentType) {
  const s = settings(env);
  if (!s.key) throw httpError(503, 'Voice input is not set up on this server.');
  if (!audio.length) throw httpError(400, 'The recording is empty.');
  checkStudent(userId, s.perHour);
  startNewDayIfNeeded();
  if (transcriptionsToday >= s.dailyTranscriptions) throw httpError(429, 'The daily voice budget is used up. Try again tomorrow.');
  transcriptionsToday += 1;

  const form = new FormData();
  form.append('model_id', s.sttModel);
  form.append('file', new Blob([audio], { type: contentType || 'audio/webm' }), 'voice');
  let res;
  try {
    res = await fetch(`${API_BASE}/v1/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': s.key }, body: form, signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    throw httpError(502, `ElevenLabs did not answer (${err.name})`);
  }
  if (!res.ok) throw httpError(502, `ElevenLabs answered ${res.status}`);
  const answer = await res.json().catch(() => ({}));
  return String(answer.text || '');
}

// Reads a recording from the request. index.js limits normal bodies to 1 MB, a recording may be larger.
function readAudio(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_AUDIO_BYTES) {
        reject(httpError(413, `The recording is larger than ${MAX_AUDIO_BYTES} bytes.`));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = { speak, transcribe, readAudio, MAX_TEXT_CHARS };
