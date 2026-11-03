// Purpose: verify "Sign in with Google" (ADR 0032) without a real Google account or network.
// Called by npm test; calls the sign-in module with a fake Google (fetch) and a plain Node HTTP server.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const { createGoogleSignin, readIdToken, settings } = require('../google-signin');

const CLIENT = '<GOOGLE_CLIENT_ID>';
const env = { GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: '<GOOGLE_CLIENT_SECRET>', GOOGLE_SIGNIN_REDIRECT_URI: 'http://localhost/auth/google/callback' };
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const newUser = (id, fields = {}) => ({ id, tokenHash: null, phoneNumber: null, consentAt: null, ...fields });
const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

let clock = Date.now();
const users = {}; // one object for the whole file: the module keeps this reference, so reset() empties it
let saved, signupsOpen, signupsToday, signupLimit, nextClaims, exchanged, googleDown;
function reset() {
  for (const id of Object.keys(users)) delete users[id];
  saved = 0; signupsOpen = true; signupsToday = 0; signupLimit = 200; exchanged = []; googleDown = false;
  nextClaims = { sub: 'google-sub-1', email: 'Student@Example.edu', email_verified: true, name: 'Test Student' };
}
const idToken = (claims) => {
  const part = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part({ iss: 'https://accounts.google.com', aud: CLIENT, exp: Math.floor(clock / 1000) + 3600, ...claims })}.<signature>`;
};
async function fakeFetch(url, opts) {
  exchanged.push({ url: String(url), body: String(opts.body) });
  if (googleDown) return new Response('{}', { status: 503 });
  return new Response(JSON.stringify({ id_token: idToken(nextClaims), access_token: '<ACCESS_TOKEN>' }));
}

const signin = createGoogleSignin({
  env, users,
  save: () => { saved += 1; }, newUser, sha256, send,
  newSignupAllowed: () => signupsOpen,
  countSignup: () => {
    if (signupsToday >= signupLimit) throw Object.assign(new Error('Too many sign-ups today.'), { status: 429 });
    signupsToday += 1;
  },
  fetchImpl: fakeFetch, now: () => clock,
});

let server, base;
test.before(async () => {
  server = http.createServer(async (req, res) => {
    if (!(await signin.handle(req, res, new URL(req.url, 'http://localhost')))) send(res, 404, { error: 'other' });
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(reset);

const poll = () => crypto.randomBytes(16).toString('hex');
const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const pathOf = (href) => { const u = new URL(href); return u.pathname + u.search; };

/** The whole browser part: ticket -> Google address -> back to the callback with the cookie of the same browser. */
async function browserSignIn(pollCode, { cookie = true, state: stateOverride } = {}) {
  const started = await (await post('/auth/google/start', { poll: pollCode })).json();
  const login = await fetch(`${base}${pathOf(started.authorizationUrl)}`, { redirect: 'manual' });
  const google = new URL(login.headers.get('location'));
  const setCookie = login.headers.get('set-cookie');
  const state = stateOverride || google.searchParams.get('state');
  const headers = cookie && setCookie ? { Cookie: setCookie.split(';')[0] } : {};
  const callback = await fetch(`${base}/auth/google/callback?state=${state}&code=<CODE>`, { headers });
  return { started, login, google, callback, html: await callback.text() };
}
const pickUp = async (pollCode) => { const r = await post('/auth/google/token', { poll: pollCode }); return { status: r.status, body: await r.json() }; };

test('sign-in is switched off unless the callback ends in /auth/google/callback', () => {
  assert.ok(settings(env));
  assert.equal(settings({ ...env, GOOGLE_SIGNIN_REDIRECT_URI: 'http://localhost/google/callback' }), null);
  assert.equal(settings({ ...env, GOOGLE_SIGNIN_REDIRECT_URI: 'http://example.com/auth/google/callback' }), null);
  assert.equal(settings({ ...env, GOOGLE_CLIENT_ID: '' }), null);
});

test('the whole flow makes an account and gives the app its token exactly once', async () => {
  const code = poll();
  const { google, callback, html } = await browserSignIn(code);
  assert.equal(callback.status, 200);
  assert.match(html, /You are signed in/);
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(google.searchParams.get('client_id'), CLIENT);

  const first = await pickUp(code);
  assert.equal(first.status, 200);
  assert.match(first.body.token, /^[a-f0-9]{48}$/);
  const user = users[first.body.userId];
  assert.equal(user.googleSub, 'google-sub-1');
  assert.equal(user.email, 'student@example.edu');
  assert.equal(user.googleName, 'Test Student');
  assert.equal(user.tokenHash, sha256(first.body.token));
  assert.equal(user.phoneNumber, null, 'no phone number is needed');
  assert.equal(user.consentAt, null, 'consent for calls comes with the first phone number, not here');

  const second = await pickUp(code);
  assert.equal(second.status, 202, 'the token is handed over once');
  assert.equal(second.body.token, undefined);
});

test('sign-in asks for openid, email and profile only: calendar access stays a separate opt-in', async () => {
  const { google } = await browserSignIn(poll());
  assert.equal(google.searchParams.get('scope'), 'openid email profile');
  assert.doesNotMatch(google.href, /calendar/);
  assert.doesNotMatch(exchanged.map((e) => e.body).join(' '), /calendar/);
  assert.equal(google.searchParams.get('access_type'), null, 'no refresh token is requested');
});

test('the same Google account is the same student, with a new token each time', async () => {
  const a = poll(), b = poll();
  await browserSignIn(a);
  const one = await pickUp(a);
  nextClaims = { ...nextClaims, email: 'new-address@example.edu' };
  await browserSignIn(b);
  const two = await pickUp(b);
  assert.equal(one.body.userId, two.body.userId);
  assert.equal(Object.keys(users).length, 1);
  assert.equal(users[two.body.userId].email, 'new-address@example.edu', 'the account follows the sub, not the email');
  assert.notEqual(one.body.token, two.body.token);
  assert.equal(users[two.body.userId].tokenHash, sha256(two.body.token), 'the old token no longer works');
});

test('two Google accounts are two students', async () => {
  const a = poll(), b = poll();
  await browserSignIn(a);
  nextClaims = { sub: 'google-sub-2', email: 'other@example.com', email_verified: true };
  await browserSignIn(b);
  assert.notEqual((await pickUp(a)).body.userId, (await pickUp(b)).body.userId);
  assert.equal(Object.keys(users).length, 2);
});

test('an unverified email, a wrong audience, an old token or a wrong issuer make no account', async () => {
  const bad = [
    { email_verified: false },
    { email_verified: 'false' },
    { aud: 'someone-else' },
    { exp: Math.floor(clock / 1000) - 10 },
    { iss: 'https://evil.example' },
    { email: undefined },
    { sub: undefined },
  ];
  for (const change of bad) {
    reset();
    nextClaims = { sub: 'google-sub-1', email: 'student@example.edu', email_verified: true, ...change };
    const code = poll();
    const { callback } = await browserSignIn(code);
    assert.equal(callback.status, 400, JSON.stringify(change));
    assert.deepEqual(users, {}, `${JSON.stringify(change)} must not make an account`);
    assert.equal((await pickUp(code)).status, 202);
  }
});

test('the callback needs the cookie of the browser that started, and a known state', async () => {
  const noCookie = await browserSignIn(poll(), { cookie: false });
  assert.equal(noCookie.callback.status, 400);
  const wrongState = await browserSignIn(poll(), { state: 'not-a-state' });
  assert.equal(wrongState.callback.status, 400);
  assert.deepEqual(users, {});
  assert.equal(exchanged.length, 0, 'Google is not even asked');
});

test('a ticket works once and a state works once', async () => {
  const started = await (await post('/auth/google/start', { poll: poll() })).json();
  const path = pathOf(started.authorizationUrl);
  const first = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.equal(first.status, 302);
  assert.equal((await fetch(`${base}${path}`, { redirect: 'manual' })).status, 400, 'ticket used up');

  const state = new URL(first.headers.get('location')).searchParams.get('state');
  const headers = { Cookie: first.headers.get('set-cookie').split(';')[0] };
  assert.equal((await fetch(`${base}/auth/google/callback?state=${state}&code=x`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/auth/google/callback?state=${state}&code=x`, { headers })).status, 400, 'state used up');
});

test('tickets and states expire after five minutes', async () => {
  const started = await (await post('/auth/google/start', { poll: poll() })).json();
  clock += 5 * 60 * 1000 + 1;
  assert.equal((await fetch(`${base}${pathOf(started.authorizationUrl)}`, { redirect: 'manual' })).status, 400);
});

test('a finished sign-in is dropped when the app never picks it up', async () => {
  const code = poll();
  await browserSignIn(code);
  clock += 5 * 60 * 1000 + 1;
  assert.equal((await pickUp(code)).status, 202);
});

test('the poll code must look right, and another code cannot take the token', async () => {
  for (const bad of ['', 'short', 'x'.repeat(40), undefined, 12345]) {
    assert.equal((await post('/auth/google/start', { poll: bad })).status, 400);
    assert.equal((await post('/auth/google/token', { poll: bad })).status, 400);
  }
  const code = poll();
  await browserSignIn(code);
  assert.equal((await pickUp(poll())).status, 202, 'someone else polling gets nothing');
  assert.equal((await pickUp(code)).status, 200);
});

test('closed sign-ups stop new students, but students that exist can still sign in', async () => {
  const a = poll();
  await browserSignIn(a);
  await pickUp(a);
  signupsOpen = false;
  const again = poll();
  assert.equal((await browserSignIn(again)).callback.status, 200);
  assert.equal((await pickUp(again)).status, 200);
  nextClaims = { sub: 'google-sub-9', email: 'new@example.com', email_verified: true };
  const stranger = poll();
  assert.equal((await browserSignIn(stranger)).callback.status, 403);
  assert.equal((await pickUp(stranger)).status, 202);
  assert.equal(Object.keys(users).length, 1);
});

test('the daily sign-up limit stops new students only', async () => {
  signupLimit = 1;
  const a = poll();
  await browserSignIn(a);
  await pickUp(a);
  nextClaims = { sub: 'google-sub-2', email: 'second@example.com', email_verified: true };
  assert.equal((await browserSignIn(poll())).callback.status, 429);
  assert.equal(Object.keys(users).length, 1);
  nextClaims = { sub: 'google-sub-1', email: 'student@example.edu', email_verified: true };
  assert.equal((await browserSignIn(poll())).callback.status, 200, 'the existing student is not counted again');
});

test('Google being down is a clean error, no account', async () => {
  googleDown = true;
  const code = poll();
  const { callback } = await browserSignIn(code);
  assert.equal(callback.status, 400);
  assert.deepEqual(users, {});
});

test('no response shows the email, the token of Google or the secret', async () => {
  const code = poll();
  const { started, login, html } = await browserSignIn(code);
  const picked = JSON.stringify((await pickUp(code)).body);
  for (const text of [JSON.stringify(started), login.headers.get('location'), html, picked]) {
    assert.doesNotMatch(text, /student@example\.edu/i);
    assert.doesNotMatch(text, /<GOOGLE_CLIENT_SECRET>|<ACCESS_TOKEN>|<signature>/);
  }
});

test('readIdToken reads who the token is for and refuses anything odd', () => {
  const ok = readIdToken(idToken({ sub: 'abc', email: 'A@B.COM', email_verified: true }), CLIENT, clock);
  assert.deepEqual(ok, { sub: 'abc', email: 'a@b.com', name: '' });
  assert.equal(readIdToken(idToken({ sub: 'abc', email: 'a@b.com', email_verified: true, name: '  Ada   Lovelace ' }), CLIENT, clock).name, 'Ada Lovelace');
  assert.throws(() => readIdToken('not-a-token', CLIENT, clock), /Google sign-in failed/);
  assert.throws(() => readIdToken('', CLIENT, clock), /Google sign-in failed/);
});

test('without the Google settings the routes say so', async () => {
  const off = createGoogleSignin({ env: {}, users: {}, save() {}, newUser, sha256, send, newSignupAllowed: () => true, countSignup() {} });
  const offServer = http.createServer((req, res) => off.handle(req, res, new URL(req.url, 'http://localhost')));
  await new Promise((r) => offServer.listen(0, r));
  const offBase = `http://localhost:${offServer.address().port}`;
  assert.deepEqual(await (await fetch(`${offBase}/auth/google/status`)).json(), { configured: false });
  assert.equal((await fetch(`${offBase}/auth/google/start`, { method: 'POST', body: '{}' })).status, 503);
  offServer.close();
});
