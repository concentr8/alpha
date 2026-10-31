// Purpose: per-student read-only Google Calendar OAuth and event reads.
// Called by index.js /google routes and tests; calls Google's HTTPS APIs with fetch.
// Credentials stay here and in the encrypted per-student server record, never responses.
'use strict';

const crypto = require('node:crypto');
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_URL = 'https://www.googleapis.com/calendar/v3';
const FIVE_MINUTES = 300000;
const error = (status, message) => Object.assign(new Error(message), { status });
const random = () => crypto.randomBytes(32).toString('base64url');

function settings(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET ||
      !/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY || '')) return null;
  try {
    const redirect = new URL(env.GOOGLE_REDIRECT_URI);
    const local = redirect.hostname === 'localhost';
    if ((redirect.protocol !== 'https:' && !(local && redirect.protocol === 'http:')) ||
        redirect.pathname !== '/google/callback' || redirect.search || redirect.hash ||
        redirect.username || redirect.password) return null;
    return { client: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET,
      redirect: redirect.href, secure: redirect.protocol === 'https:',
      key: Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex') };
  } catch (_) { return null; }
}

function encrypt(token, userId, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(userId));
  const bytes = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map(b => b.toString('base64url')).join('.');
}

function decrypt(record, userId, key) {
  try {
    const parts = String(record).split('.');
    if (parts.length !== 3) throw new Error();
    const [iv, tag, bytes] = parts.map(s => Buffer.from(s, 'base64url'));
    const cipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(userId));
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8');
  } catch (_) { throw error(503, 'Google Calendar credentials need reconnecting.'); }
}

function timezone(value) {
  try {
    if (typeof value !== 'string' || value.length > 100) throw new Error();
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return value;
  } catch (_) { throw error(400, 'Choose a valid time zone.'); }
}

function wallTime(value, zone) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw error(502, 'Google returned an invalid event time.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function eventView(item, calendarId, zone) {
  if (item.status === 'cancelled') return null;
  const allDay = Boolean(item.start?.date);
  if (!item.id || !(allDay ? item.end?.date : item.start?.dateTime && item.end?.dateTime)) {
    throw error(502, 'Google returned an incomplete event.');
  }
  return { id: `google:${calendarId}:${item.id}`, calendarId,
    title: String(item.summary || 'Untitled event').slice(0, 200),
    start: allDay ? item.start.date : wallTime(item.start.dateTime, zone),
    end: allDay ? item.end.date : wallTime(item.end.dateTime, zone),
    allDay, kind: 'google', readOnly: true,
    notes: String(item.description || '').slice(0, 2000) };
}

function createGoogleCalendar({ env, users, save, authenticate, send,
  fetchImpl = (...args) => fetch(...args), now = () => Date.now() }) {
  const tickets = new Map(), states = new Map(), access = new Map(), generations = new Map();
  function prune() {
    for (const map of [tickets, states]) {
      for (const [id, value] of map) if (value.expires <= now()) map.delete(id);
    }
    if (tickets.size + states.size >= 1000) throw error(429, 'Too many pending Google connections. Try again later.');
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
    return send(res, status, '<!doctype html><html lang="en"><meta charset="utf-8"><title>Concentr8 Calendar</title>' +
      '<h1>Google Calendar</h1><p>' + (success ? 'Connected. Close this window and choose up to three calendars in Concentr8 Settings.'
        : 'Connection was not completed. Close this window and try again from Concentr8 Settings.') + '</p></html>',
    'text/html; charset=utf-8');
  }
  async function google(url, options) {
    let response, body;
    try {
      response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(15000) });
      body = await response.json();
    } catch (_) { throw error(502, 'Google Calendar is unavailable. Try again.'); }
    if (!response.ok) {
      if (body?.error === 'invalid_grant' || response.status === 401) throw error(401, 'Reconnect Google Calendar in Settings.');
      throw error(502, 'Google Calendar could not be loaded. Try again or check school account permissions.');
    }
    return body;
  }
  function assertCurrent(user, record) {
    if (users[user.id] !== user || user.googleCalendar !== record) {
      throw error(409, 'The Google Calendar connection changed. Try again.');
    }
  }
  async function accessToken(user, config) {
    const record = user.googleCalendar;
    if (!record?.refreshToken) throw error(409, 'Connect Google Calendar in Settings first.');
    const cached = access.get(user.id);
    if (cached?.record === record && cached.expires > now()) return cached.token;
    const result = await google(TOKEN_URL, { method: 'POST', body: new URLSearchParams({
      client_id: config.client, client_secret: config.secret,
      refresh_token: decrypt(record.refreshToken, user.id, config.key), grant_type: 'refresh_token',
    }) });
    assertCurrent(user, record);
    if (!result.access_token) throw error(502, 'Google did not provide calendar access.');
    if (result.refresh_token) {
      record.refreshToken = encrypt(result.refresh_token, user.id, config.key);
      save();
    }
    access.set(user.id, { token: result.access_token, record,
      expires: now() + Math.max(0, Number(result.expires_in || 3600) - 60) * 1000 });
    return result.access_token;
  }
  async function pages(user, config, endpoint, params) {
    const record = user.googleCalendar, token = await accessToken(user, config);
    const items = [];
    let next;
    for (let page = 0; page < 20; page += 1) {
      const query = new URLSearchParams(params);
      if (next) query.set('pageToken', next);
      const result = await google(`${CALENDAR_URL}${endpoint}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assertCurrent(user, record);
      if (!Array.isArray(result.items)) throw error(502, 'Google returned an incomplete calendar list.');
      items.push(...result.items);
      next = result.nextPageToken;
      if (!next) return items;
    }
    throw error(502, 'This Google Calendar is too large to load completely. No partial availability was used.');
  }
  async function calendars(user, config) {
    const list = await pages(user, config, '/users/me/calendarList', { maxResults: '250', minAccessRole: 'reader' });
    return list.filter(c => c.id && !c.deleted).map(c => ({
      id: c.id, name: String(c.summaryOverride || c.summary || 'Google calendar').slice(0, 200),
      selected: (user.googleCalendar.selectedIds || []).includes(c.id),
    }));
  }
  function clearPending(userId) {
    generations.set(userId, (generations.get(userId) || 0) + 1);
    for (const map of [tickets, states]) for (const [id, entry] of map) if (entry.userId === userId) map.delete(id);
  }
  async function handle(req, res, url) {
    const p = url.pathname.replace(/\/+$/, ''), method = req.method;
    if (!p.startsWith('/google/')) return false;
    try {
      const config = settings(env);
      if (p === '/google/status' && method === 'GET') {
        reply(res, 200, { configured: Boolean(config) }); return true;
      }
      if (!config) { reply(res, 503, { configured: false, error: 'Not set up yet' }); return true; }
      if (p === '/google/login' && method === 'GET') {
        prune();
        const ticket = url.searchParams.get('ticket'), entry = tickets.get(ticket);
        if (!entry || entry.expires <= now() || !users[entry.userId]) throw error(400, 'Start connecting from Concentr8 Settings again.');
        tickets.delete(ticket);
        const state = random(), browser = random(), verifier = random();
        states.set(state, { ...entry, browser, verifier, expires: now() + FIVE_MINUTES });
        res.setHeader('Set-Cookie', `c8_google_${state.slice(0, 12)}=${browser}; Path=/google; HttpOnly; SameSite=Lax; Max-Age=300${config.secure ? '; Secure' : ''}`);
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.search = new URLSearchParams({ client_id: config.client, redirect_uri: config.redirect,
          response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent',
          state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
          code_challenge_method: 'S256' });
        res.setHeader('Location', auth.href);
        reply(res, 302, { ok: true }); return true;
      }
      if (p === '/google/callback' && method === 'GET') {
        const state = url.searchParams.get('state'), entry = states.get(state);
        if (!entry || entry.expires <= now()) { callbackPage(res, 400, false); return true; }
        states.delete(state);
        const cookieName = `c8_google_${state.slice(0, 12)}`;
        const cookie = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='));
        res.setHeader('Set-Cookie', `${cookieName}=; Path=/google; HttpOnly; SameSite=Lax; Max-Age=0${config.secure ? '; Secure' : ''}`);
        const user = users[entry.userId];
        if (!cookie || cookie.slice(cookieName.length + 1) !== entry.browser ||
            !user || url.searchParams.has('error') || !url.searchParams.get('code')) {
          callbackPage(res, 400, false); return true;
        }
        const prior = user.googleCalendar;
        const result = await google(TOKEN_URL, { method: 'POST', body: new URLSearchParams({
          client_id: config.client, client_secret: config.secret, redirect_uri: config.redirect,
          code: url.searchParams.get('code'), grant_type: 'authorization_code', code_verifier: entry.verifier,
        }) });
        if (users[user.id] !== user || user.googleCalendar !== prior || generations.get(user.id) !== entry.generation) {
          callbackPage(res, 409, false); return true;
        }
        if (!result.refresh_token || !result.access_token || (result.scope && result.scope.split(' ').some(scope => scope !== SCOPE))) {
          callbackPage(res, 400, false); return true;
        }
        user.googleCalendar = { refreshToken: encrypt(result.refresh_token, user.id, config.key), selectedIds: [] };
        access.delete(user.id);
        save();
        callbackPage(res, 200, true); return true;
      }
      // Reject the older general API's query-key fallback on all Google routes.
      const user = req.headers.authorization?.startsWith('Bearer ') ? authenticate(req, url) : null;
      if (!user) { reply(res, 401, { error: 'Sign in to Concentr8 first.' }); return true; }
      if (p === '/google/login' && method === 'POST') {
        prune(); clearPending(user.id);
        const ticket = random();
        tickets.set(ticket, { userId: user.id, generation: generations.get(user.id), expires: now() + FIVE_MINUTES });
        const launch = new URL('/google/login', config.redirect);
        launch.searchParams.set('ticket', ticket);
        reply(res, 200, { authorizationUrl: launch.href }); return true;
      }
      if (p === '/google/calendars' && method === 'GET') {
        const connected = Boolean(user.googleCalendar?.refreshToken);
        let list = [];
        try { if (connected) list = await calendars(user, config); }
        catch (err) {
          reply(res, err.status || 502, { configured: true, connected: true,
            error: err.status ? err.message : 'Google Calendar is unavailable. Try again.' });
          return true;
        }
        reply(res, 200, { configured: true, connected, timezone: user.timezone,
          calendars: list,
          selectedIds: user.googleCalendar?.selectedIds || [] }); return true;
      }
      if (p === '/google/calendars' && method === 'POST') {
        const body = await readJson(req);
        if (!Array.isArray(body.calendarIds) || body.calendarIds.length > 3 ||
            body.calendarIds.some(id => typeof id !== 'string') ||
            new Set(body.calendarIds).size !== body.calendarIds.length) {
          throw error(400, 'Choose up to three different calendars.');
        }
        const record = user.googleCalendar;
        const available = new Set((await calendars(user, config)).map(c => c.id));
        assertCurrent(user, record);
        if (body.calendarIds.some(id => !available.has(id))) throw error(400, 'Choose a calendar from your Google account.');
        user.googleCalendar = { ...record, selectedIds: body.calendarIds };
        access.delete(user.id);
        save();
        reply(res, 200, { ok: true, selectedIds: body.calendarIds }); return true;
      }
      if (p === '/google/events' && method === 'GET') {
        const from = url.searchParams.get('from') || '', to = url.searchParams.get('to') || '';
        const zone = timezone(url.searchParams.get('timezone') || user.timezone);
        const instant = value => /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
        const range = Date.parse(to) - Date.parse(from);
        if (!instant(from) || !instant(to) || range <= 0 || range > 62 * 86400000) throw error(400, 'Choose a valid calendar range of at most 62 days.');
        const selectedIds = user.googleCalendar?.selectedIds;
        if (!selectedIds) throw error(409, 'Connect Google Calendar in Settings first.');
        const record = user.googleCalendar;
        const available = (await calendars(user, config)).filter(c => selectedIds.includes(c.id));
        if (available.length !== selectedIds.length) throw error(409, 'A selected calendar is no longer available. Choose calendars in Settings.');
        const results = await Promise.all(available.map(async calendar => {
          const items = await pages(user, config, `/calendars/${encodeURIComponent(calendar.id)}/events`, {
            timeMin: from, timeMax: to, timeZone: zone, singleEvents: 'true',
            orderBy: 'startTime', showDeleted: 'false', maxResults: '2500',
          });
          return items.map(item => eventView(item, calendar.id, zone)).filter(Boolean);
        }));
        assertCurrent(user, record);
        reply(res, 200, { events: results.flat(), calendars: available.map(c => ({ id: c.id, name: c.name })),
          timezone: zone, updatedAt: new Date(now()).toISOString() }); return true;
      }
      if (p === '/google/disconnect' && method === 'POST') {
        const record = user.googleCalendar;
        // Clear local ownership before the network call so failures cannot undo disconnect.
        clearPending(user.id);
        delete user.googleCalendar; access.delete(user.id); save();
        if (record?.refreshToken) {
          try {
            await fetchImpl('https://oauth2.googleapis.com/revoke', { method: 'POST',
              body: new URLSearchParams({ token: decrypt(record.refreshToken, user.id, config.key) }),
              signal: AbortSignal.timeout(10000) });
          } catch (_) { /* Local disconnect is complete even if Google is offline. */ }
        }
        reply(res, 200, { ok: true }); return true;
      }
      reply(res, 404, { error: 'Google Calendar route not found.' }); return true;
    } catch (err) {
      if (url.pathname === '/google/callback') callbackPage(res, err.status || 502, false);
      else reply(res, err.status || 502, { error: err.status ? err.message : 'Google Calendar is unavailable. Try again.' });
      return true;
    }
  }
  return { handle };
}

async function readJson(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 8192) throw error(413, 'Calendar selection is too large.');
  }
  try { return JSON.parse(text); } catch (_) { throw error(400, 'Expected a calendar selection.'); }
}

module.exports = { createGoogleCalendar, encrypt, decrypt, settings, wallTime, eventView, SCOPE };
