// Purpose: "Sign in with Google" for students. Finds or creates the student's account and hands the app a token.
// Called by index.js (route /auth/google/...) and by tests; calls Google's HTTPS token endpoint with fetch.
// Why a module of its own: sign-in asks for `openid email` only. Calendar access stays a separate opt-in in
// google-calendar.js (ADR 0030), so signing in can never grant it by accident.
'use strict';

const crypto = require('node:crypto');

const SCOPE = 'openid email';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIVE_MINUTES = 300000;
const POLL = /^[a-f0-9]{32,64}$/; // random, made once by the app for one sign-in attempt
const error = (status, message) => Object.assign(new Error(message), { status });
const random = () => crypto.randomBytes(32).toString('base64url');

/** Sign-in needs the Google client and a registered callback that ends in /auth/google/callback; else it is off. */
function settings(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  try {
    const redirect = new URL(env.GOOGLE_SIGNIN_REDIRECT_URI);
    const local = redirect.hostname === 'localhost';
    if ((redirect.protocol !== 'https:' && !(local && redirect.protocol === 'http:')) ||
        redirect.pathname !== '/auth/google/callback' || redirect.search || redirect.hash ||
        redirect.username || redirect.password) return null;
    return { client: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET, redirect: redirect.href, secure: redirect.protocol === 'https:' };
  } catch (_) { return null; }
}

/**
 * The id_token comes straight from Google's token endpoint over TLS (not from the browser), so reading it without
 * checking the signature is allowed by the OpenID Connect rules. We still check who it is for, that it is fresh,
 * and that Google verified the email. Returns { sub, email } or throws.
 */
function readIdToken(idToken, clientId, nowMs) {
  let claims;
  try { claims = JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString('utf8')); } catch (_) { throw error(400, 'Google sign-in failed.'); }
  const issuerOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  if (!issuerOk || claims.aud !== clientId || !(claims.exp * 1000 > nowMs) || !claims.sub || !claims.email || !verified) {
    throw error(400, 'Google sign-in failed.');
  }
  return { sub: String(claims.sub), email: String(claims.email).toLowerCase().slice(0, 254) };
}

function createGoogleSignin({ env, users, save, newUser, sha256, send, newSignupAllowed, countSignup,
  fetchImpl = (...args) => fetch(...args), now = () => Date.now() }) {
  const tickets = new Map(); // ticket -> { pollHash, expires }: the app asked to sign in, the browser has not started yet
  const states = new Map(); // state -> { pollHash, browser, verifier, expires }: the browser is at Google
  const results = new Map(); // pollHash -> { userId, token, expires }: signed in, waiting for the app to pick it up (once)

  function prune() {
    for (const map of [tickets, states, results]) for (const [id, value] of map) if (value.expires <= now()) map.delete(id);
    if (tickets.size + states.size + results.size >= 1000) throw error(429, 'Too many sign-ins at the moment. Try again later.');
  }
  function reply(res, status, body) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    return send(res, status, body);
  }
  function callbackPage(res, status, success) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    return send(res, status, '<!doctype html><html lang="en"><meta charset="utf-8"><title>Concentr8 sign-in</title>' +
      '<h1>Concentr8</h1><p>' + (success ? 'You are signed in. Close this window and go back to Concentr8.'
        : 'Sign-in was not completed. Close this window and try again in Concentr8.') + '</p></html>', 'text/html; charset=utf-8');
  }
  async function exchangeCode(config, code, verifier) {
    let response, body;
    try {
      response = await fetchImpl(TOKEN_URL, { method: 'POST', signal: AbortSignal.timeout(15000), body: new URLSearchParams({
        client_id: config.client, client_secret: config.secret, redirect_uri: config.redirect,
        code, grant_type: 'authorization_code', code_verifier: verifier }) });
      body = await response.json();
    } catch (_) { throw error(502, 'Google is unavailable. Try again.'); }
    if (!response.ok || !body.id_token) throw error(400, 'Google sign-in failed.');
    return body.id_token;
  }

  /** The student of this Google account, made on the first sign-in. A new token replaces the old one, like /api/register. */
  function accountFor({ sub, email }) {
    let user = Object.values(users).find((u) => u.googleSub === sub);
    if (!user) {
      if (!newSignupAllowed()) throw error(403, 'Sign-ups are closed on this server.');
      countSignup(); // throws 429 when today's limit is reached
      user = newUser(crypto.randomBytes(8).toString('hex'), { googleSub: sub });
      users[user.id] = user;
    }
    user.email = email; // an email can change at Google, the sub cannot: the account follows the sub
    const token = crypto.randomBytes(24).toString('hex');
    user.tokenHash = sha256(token);
    save();
    return { user, token };
  }

  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, ''), method = req.method;
    if (!p.startsWith('/auth/google/')) return false;
    try {
      const config = settings(env);
      if (p === '/auth/google/status' && method === 'GET') { reply(res, 200, { configured: Boolean(config) }); return true; }
      if (!config) { reply(res, 503, { configured: false, error: 'Google sign-in is not set up yet' }); return true; }

      // 1. The app says "I want to sign in" with a random poll code only it knows, and opens the returned address.
      if (p === '/auth/google/start' && method === 'POST') {
        prune();
        let body;
        try { body = JSON.parse(await readText(req) || '{}'); } catch (_) { throw error(400, 'Expected { poll }.'); }
        if (!POLL.test(String(body.poll || ''))) throw error(400, 'Missing or wrong poll code.');
        const ticket = random();
        tickets.set(ticket, { pollHash: sha256(body.poll), expires: now() + FIVE_MINUTES });
        const launch = new URL('/auth/google/login', config.redirect);
        launch.searchParams.set('ticket', ticket);
        reply(res, 200, { authorizationUrl: launch.href }); return true;
      }
      // 2. The browser arrives with the ticket: a cookie ties the rest to THIS browser, PKCE ties the code to us.
      if (p === '/auth/google/login' && method === 'GET') {
        prune();
        const ticket = url.searchParams.get('ticket'), entry = tickets.get(ticket);
        if (!entry || entry.expires <= now()) throw error(400, 'Start signing in from Concentr8 again.');
        tickets.delete(ticket);
        const state = random(), browser = random(), verifier = random();
        states.set(state, { pollHash: entry.pollHash, browser, verifier, expires: now() + FIVE_MINUTES });
        res.setHeader('Set-Cookie', `c8_signin_${state.slice(0, 12)}=${browser}; Path=/auth/google; HttpOnly; SameSite=Lax; Max-Age=300${config.secure ? '; Secure' : ''}`);
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.search = new URLSearchParams({ client_id: config.client, redirect_uri: config.redirect, response_type: 'code',
          scope: SCOPE, prompt: 'select_account', state,
          code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
        res.setHeader('Location', auth.href);
        reply(res, 302, { ok: true }); return true;
      }
      // 3. Google sends the browser back. We swap the code for the id_token, find or make the account, keep the token.
      if (p === '/auth/google/callback' && method === 'GET') {
        const state = url.searchParams.get('state'), entry = states.get(state);
        if (!entry || entry.expires <= now()) { callbackPage(res, 400, false); return true; }
        states.delete(state);
        const cookieName = `c8_signin_${state.slice(0, 12)}`;
        const cookie = String(req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${cookieName}=`));
        res.setHeader('Set-Cookie', `${cookieName}=; Path=/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${config.secure ? '; Secure' : ''}`);
        if (!cookie || cookie.slice(cookieName.length + 1) !== entry.browser || url.searchParams.has('error') || !url.searchParams.get('code')) {
          callbackPage(res, 400, false); return true;
        }
        const identity = readIdToken(await exchangeCode(config, url.searchParams.get('code'), entry.verifier), config.client, now());
        const { user, token } = accountFor(identity);
        results.set(entry.pollHash, { userId: user.id, token, expires: now() + FIVE_MINUTES });
        callbackPage(res, 200, true); return true;
      }
      // 4. The app asks with its poll code until the browser part is done. The token is handed over exactly once.
      if (p === '/auth/google/token' && method === 'POST') {
        prune();
        let body;
        try { body = JSON.parse(await readText(req) || '{}'); } catch (_) { throw error(400, 'Expected { poll }.'); }
        if (!POLL.test(String(body.poll || ''))) throw error(400, 'Missing or wrong poll code.');
        const key = sha256(body.poll), result = results.get(key);
        if (!result) { reply(res, 202, { pending: true }); return true; }
        results.delete(key);
        reply(res, 200, { ok: true, userId: result.userId, token: result.token }); return true;
      }
      reply(res, 404, { error: 'Sign-in route not found.' }); return true;
    } catch (err) {
      if (url.pathname === '/auth/google/callback') callbackPage(res, err.status || 502, false);
      else reply(res, err.status || 502, { error: err.status ? err.message : 'Google sign-in is unavailable. Try again.' });
      return true;
    }
  }
  return { handle };
}

async function readText(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 2048) throw error(413, 'Request is too large.');
  }
  return text;
}

module.exports = { createGoogleSignin, readIdToken, settings, SCOPE };
