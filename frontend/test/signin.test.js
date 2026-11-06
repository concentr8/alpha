/* Purpose: regression coverage for going to Google on start (ADR 0038, 0040), with no calendar step after it (ADR 0039).
   Run with node --test frontend/test/signin.test.js. Uses VM, a tiny fake page and a fake window.Concentr8;
   never opens Google and never calls the hosted backend. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const signinScript = fs.readFileSync(path.join(__dirname, '../concentr8-signin.js'), 'utf8');

// Just enough of a <dialog> for concentr8-signin.js: named parts, open state and event listeners.
function fakeDialog() {
  const parts = new Map();
  const listeners = new Map();
  return {
    open: false, innerHTML: '',
    setAttribute() {},
    querySelector(selector) {
      if (!parts.has(selector)) parts.set(selector, { hidden: false, disabled: false, textContent: '' });
      return parts.get(selector);
    },
    showModal() { this.open = true; },
    close() { this.open = false; if (listeners.has('close')) listeners.get('close')(); },
    addEventListener(name, listener) { listeners.set(name, listener); },
    fire(name, event) { listeners.get(name)(event); }
  };
}

// trip: what finishGoogleTrip answers. google: what goToGoogle answers. Both count their calls in `calls`.
function boot({ signedIn = false, desktop = false, demo = false, trip = { returned: false }, google = { ok: true } } = {}) {
  const dialog = fakeDialog();
  const body = { style: {}, append() {} };
  const calls = { goToGoogle: 0, signIn: 0 };
  const listeners = new Map();
  const window = {
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); }
  };
  let token = signedIn ? 'test-token' : '';
  const setToken = (value) => { token = value; window.dispatchEvent({ type: 'concentr8:auth' }); };
  window.Concentr8 = {
    isSignedIn: () => Boolean(token),
    isDesktop: () => desktop,
    goToGoogle: async () => { calls.goToGoogle += 1; return google; },
    finishGoogleTrip: async () => { if (trip.ok) setToken('test-token'); return trip; },
    signIn: async () => { calls.signIn += 1; return new Promise(() => {}); }, // stays in the browser for the whole test
    signOut: () => setToken('')
  };
  if (demo) window.Concentr8Demo = { isDemo: () => true }; // ADR 0042
  const context = vm.createContext({ window, document: { createElement: () => dialog, body, addEventListener() {} } });
  vm.runInContext(signinScript, context);
  return { dialog, window, body, calls };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('signed out on start: the tab goes to Google, with no Concentr8 page and no flash of the app', async () => {
  const { dialog, body, calls } = boot();
  await settle();
  assert.equal(calls.goToGoogle, 1);
  assert.equal(dialog.open, false);
  assert.equal(body.style.visibility, 'hidden');
});

test('signed in: nothing happens, and no calendar step follows (ADR 0039)', async () => {
  const { dialog, body, calls } = boot({ signedIn: true });
  await settle();
  assert.equal(calls.goToGoogle, 0);
  assert.equal(dialog.open, false);
  assert.notEqual(body.style.visibility, 'hidden');
});

test('back from Google, signed in: the app opens', async () => {
  const { dialog, body, calls } = boot({ trip: { returned: true, ok: true } });
  await settle();
  assert.equal(calls.goToGoogle, 0);
  assert.equal(dialog.open, false);
  assert.equal(body.style.visibility, '');
});

test('back from Google without signing in: the Concentr8 page, never a loop back to Google', async () => {
  const { dialog, body, calls } = boot({ trip: { returned: true, ok: false } });
  await settle();
  assert.equal(calls.goToGoogle, 0);
  assert.equal(dialog.open, true);
  assert.equal(body.style.visibility, '');
  assert.match(dialog.querySelector('[data-signin-status]').textContent, /not finished/);
});

test('server not reachable: the Concentr8 page shows the reason', async () => {
  const { dialog, body } = boot({ google: { ok: false, error: 'The Concentr8 server is not reachable.' } });
  await settle();
  assert.equal(dialog.open, true);
  assert.equal(body.style.visibility, '');
  assert.match(dialog.querySelector('[data-signin-status]').textContent, /not reachable/);
});

test('desktop app: Google opens in the browser by itself, the page says to finish there', async () => {
  const { dialog, calls } = boot({ desktop: true });
  await settle();
  assert.equal(calls.signIn, 1);
  assert.equal(calls.goToGoogle, 0);
  assert.equal(dialog.open, true);
});

test('signing out goes to Google again', async () => {
  const { window, calls } = boot({ signedIn: true });
  await settle();
  window.Concentr8.signOut();
  await settle();
  assert.equal(calls.goToGoogle, 1);
});

test('the Concentr8 page has no close button, and Escape cannot skip it', async () => {
  const { dialog } = boot({ trip: { returned: true, ok: false } });
  await settle();
  assert.doesNotMatch(dialog.innerHTML, /data-signin-close/);
  let prevented = false;
  dialog.fire('cancel', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  dialog.close(); // Chrome: Escape before any click closes it anyway
  assert.equal(dialog.open, true);
});

test('sign-in never starts the calendar connection', () => {
  assert.doesNotMatch(signinScript, /google\/calendars|google\/login/);
});

test('demo mode (ADR 0042): no Google, no Concentr8 page, the app is visible', async () => {
  const { dialog, body, calls } = boot({ demo: true });
  await settle();
  assert.equal(calls.goToGoogle, 0);
  assert.equal(dialog.open, false);
  assert.notEqual(body.style.visibility, 'hidden');
});
