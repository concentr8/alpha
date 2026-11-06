/* Purpose: regression coverage for the sign-in page on start (ADR 0038), with no calendar step after it (ADR 0039).
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

function boot({ signedIn = false } = {}) {
  const dialog = fakeDialog();
  const listeners = new Map();
  const window = {
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); }
  };
  let token = signedIn ? 'test-token' : '';
  const setToken = (value) => { token = value; window.dispatchEvent({ type: 'concentr8:auth' }); };
  window.Concentr8 = {
    isSignedIn: () => Boolean(token),
    finishSignIn: () => setToken('test-token'),
    signOut: () => setToken('')
  };
  const context = vm.createContext({ window,
    document: { createElement: () => dialog, body: { append() {} }, addEventListener() {} } });
  vm.runInContext(signinScript, context);
  return { dialog, window };
}

test('signed out on start: the Google sign-in page opens', () => {
  const { dialog } = boot();
  assert.equal(dialog.open, true);
});

test('the sign-in page has no close button and Escape does not close it', () => {
  const { dialog } = boot();
  assert.doesNotMatch(dialog.innerHTML, /data-signin-close/);
  let prevented = false;
  dialog.fire('cancel', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('a close the app did not ask for (Escape before any click in Chrome) opens the page again', () => {
  const { dialog } = boot();
  dialog.close();
  assert.equal(dialog.open, true);
});

test('the sign-in text no longer offers free guest messages', () => {
  const { dialog } = boot();
  assert.doesNotMatch(dialog.innerHTML, /free messages/);
});

test('signed in: the page stays away, and no calendar step follows (ADR 0039)', () => {
  const { dialog } = boot({ signedIn: true });
  assert.equal(dialog.open, false);
});

test('finishing sign-in closes the page and the app opens', () => {
  const { dialog, window } = boot();
  window.Concentr8.finishSignIn();
  assert.equal(dialog.open, false);
});

test('sign-in never starts the calendar connection', () => {
  assert.doesNotMatch(signinScript, /google\/calendars|google\/login/);
});

test('signing out brings back the sign-in page', () => {
  const { dialog, window } = boot({ signedIn: true });
  window.Concentr8.signOut();
  assert.equal(dialog.open, true);
});
