/* Purpose: shared setup for the end-to-end browser tests of first start and Home (docs/plans/simplicity-redesign.md 3.1, 3.2).
   Serves frontend/ on a random local port, launches Chrome, and answers the Concentr8 server's calls with a mock, so the
   tests need no real server, no Google account and no network.
   Called by: e2e/first-start.test.js, e2e/home.test.js.
   Calls: the playwright library (chromium), node:http, node:fs. Nothing outside this machine. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// The address the frontend calls (frontend/concentr8-server.js). Every request to it is answered by mockServer below.
const API = 'https://concentr8-api-ahc6ercddegqdaen.westus3-01.azurewebsites.net';
const FRONTEND = path.join(__dirname, '..', 'frontend');
const STATE_KEY = 'articul8-wireframe-v2'; // the app's own storage key (frontend/index.html)
const SERVER_KEY = 'concentr8-server-v1'; // where the sign-in token lives (frontend/concentr8-server.js)
const EMAIL = 'maya@example.edu'; // a fake account; never a real person's address

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

// A plain static file server: the frontend has no build step, so the files are served as they are.
function serveFrontend() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.normalize(path.join(FRONTEND, name === '/' ? 'index.html' : name));
    // Why the check: never serve a file outside frontend/, even to a test.
    if (!file.startsWith(FRONTEND) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const base = `http://127.0.0.1:${server.address().port}`;
    resolve({ appUrl: `${base}/index.html`, base, close: () => new Promise((done) => server.close(done)) });
  }));
}

// CHROME_PATH wins; else the system Chrome; else Playwright's own Chromium (npx playwright install chromium).
function launchBrowser() {
  const system = '/usr/bin/google-chrome';
  const executablePath = process.env.CHROME_PATH || (fs.existsSync(system) ? system : undefined);
  return chromium.launch({ executablePath, args: ['--no-sandbox'] });
}

// Only the local frontend may load; every other address is blocked so a test never reaches the internet.
async function blockOutside(context, base) {
  await context.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// Lets a test hold one kind of answer back (the server waking up, a slow chat) and release it later.
function holder() {
  let waiting = [];
  let held = true;
  return {
    hold: (answer) => (held ? waiting.push(answer) : answer()),
    release: () => { held = false; waiting.forEach((answer) => answer()); waiting = []; },
    count: () => waiting.length,
  };
}

/* The mocked Concentr8 server. scenario:
   new      a new account; the Google window grants the calendar and closes itself
   fail     the Google window closes without the calendar permission
   offline  the server cannot be reached at all
   existing a signed-in account whose calendar is already connected
   Options: holdSignIn (hold /auth/google/start), holdChat (hold /api/chat), appUrl (where Google sends the student back).
   Registered after blockOutside, so it wins for the API address (later Playwright routes win). */
async function mockServer(context, { scenario = 'new', appUrl, holdSignIn = false, holdChat = false } = {}) {
  const mock = { connected: scenario === 'existing', saved: null, chatCalls: 0, paths: [] };
  mock.signIn = holder();
  mock.chat = holder();
  if (!holdSignIn) mock.signIn.release();
  if (!holdChat) mock.chat.release();
  await context.route(`${API}/**`, (route) => {
    const req = route.request();
    const where = req.url().slice(API.length).split('?')[0];
    mock.paths.push(`${req.method()} ${where}`);
    if (scenario === 'offline') return route.abort();
    if (where === '/auth/google/start') {
      return mock.signIn.hold(() => json(route, { authorizationUrl: `${API}/auth/google/login?state=x` }));
    }
    if (where === '/auth/google/login') return route.fulfill({ status: 302, headers: { Location: appUrl } });
    if (where === '/auth/google/token') return json(route, { token: 'test-token' });
    if (where === '/api/me') return json(route, { email: EMAIL, name: 'Maya' });
    if (where === '/google/status') return json(route, { configured: true });
    if (where === '/google/calendars' && req.method() === 'GET') {
      if (!mock.connected) return json(route, { connected: false, calendars: [] });
      // The account's own calendar is second on purpose: the app must pick it by its id, not by its place.
      return json(route, { connected: true, calendars: [{ id: 'class-schedule', name: 'Classes' }, { id: EMAIL, name: 'Maya' }], selectedIds: scenario === 'existing' ? [EMAIL] : [] });
    }
    if (where === '/google/calendars' && req.method() === 'POST') {
      mock.saved = JSON.parse(req.postData()).calendarIds;
      return json(route, { connected: true, calendars: mock.saved.map((id) => ({ id, name: id, selected: true })), selectedIds: mock.saved });
    }
    if (where === '/google/login' && req.method() === 'POST') return json(route, { authorizationUrl: `${API}/google/login?ticket=t1` });
    if (where === '/google/login') {
      // The Google window: grants the permission (or not) and closes itself, like Google's page does.
      if (scenario !== 'fail') mock.connected = true;
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p><script>setTimeout(() => window.close(), 300)</script>' });
    }
    if (where === '/api/chat') {
      mock.chatCalls += 1;
      return mock.chat.hold(() => json(route, { reply: 'Got it. When is it due?', actions: [] }));
    }
    if (where.startsWith('/google/events')) return json(route, { events: [] });
    return json(route, {});
  });
  return mock;
}

// Puts a saved app state (and optionally a sign-in token) into localStorage before the first page load only, so a
// reload inside the test keeps what the app itself saved since.
async function seed(context, { state, token }) {
  await context.addInitScript(({ state, token, STATE_KEY, SERVER_KEY }) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    if (token) localStorage.setItem(SERVER_KEY, JSON.stringify({ token }));
    if (state) localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, { state, token, STATE_KEY, SERVER_KEY });
}

// Counts the student's real clicks inside the app (isTrusted), across the trip to Google and back (sessionStorage).
async function countClicks(context, base) {
  await context.addInitScript((base) => {
    if (!location.href.startsWith(base)) return;
    document.addEventListener('click', (event) => {
      if (!event.isTrusted) return;
      sessionStorage.setItem('e2e-clicks', String(Number(sessionStorage.getItem('e2e-clicks') || 0) + 1));
    }, true);
  }, base);
}
const clicksSoFar = (page) => page.evaluate(() => Number(sessionStorage.getItem('e2e-clicks') || 0));

// Remembers every first-start step that was ever on screen in this tab, also ones that showed only for a moment.
async function recordSteps(context) {
  await context.addInitScript(() => {
    const seen = new Set(JSON.parse(sessionStorage.getItem('e2e-steps') || '[]'));
    window.e2eSteps = seen; // resetSteps empties this too, or the next change would write the old steps back
    const look = () => {
      for (const el of document.querySelectorAll('dialog[open] .c8-step')) seen.add(el.textContent.trim());
      sessionStorage.setItem('e2e-steps', JSON.stringify([...seen]));
    };
    new MutationObserver(look).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
  });
}
const stepsSeen = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem('e2e-steps') || '[]'));
const resetSteps = (page) => page.evaluate(() => { window.e2eSteps.clear(); sessionStorage.removeItem('e2e-steps'); });

// A fresh browser context with outside addresses blocked; the caller adds mocks and seeds before opening a page.
async function newContext(browser, base, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
  await blockOutside(context, base);
  return context;
}

module.exports = { API, EMAIL, STATE_KEY, serveFrontend, launchBrowser, newContext, mockServer, seed, countClicks, clicksSoFar,
  recordSteps, stepsSeen, resetSteps };
