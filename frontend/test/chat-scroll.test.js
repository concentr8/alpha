/* Purpose: regression coverage for layout-aware Home and agent chat scrolling.
   Run with node --test frontend/test/chat-scroll.test.js. Uses fake browser
   geometry, frames and observers; no network, browser profile or user storage. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ChatScroll = require('../chat-scroll.js');

function scene({ height = 400, content = 400, top = 0, shown = true, separateContent = false } = {}) {
  let nextFrame = 0;
  const frames = new Map();
  const listeners = new Map();
  const observers = [];
  let writes = 0;
  const view = {
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; this.active = false; this.targets = new Set(); observers.push(this); }
      observe(target) { assert.ok(target === log || target === contents); this.targets.add(target); this.active = true; }
      disconnect() { this.active = false; }
    }
  };
  const log = {
    ownerDocument: { defaultView: view },
    clientHeight: height,
    scrollHeight: content,
    shown,
    get scrollTop() { return top; },
    set scrollTop(value) { top = value; writes++; },
    getClientRects() { return this.shown ? [{}] : []; },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name); }
  };
  const contents = separateContent ? {} : log;
  return {
    log,
    contents,
    controller: ChatScroll.create(log, contents),
    frames,
    get writes() { return writes; },
    get listeners() { return listeners.size; },
    get observing() { return observers.some(observer => observer.active); },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    resize(target = log) { observers.filter(observer => observer.active && observer.targets.has(target)).forEach(observer => observer.callback()); },
    scroll(value) { top = value; listeners.get('scroll')?.(); }
  };
}

test('new messages share one frame and use the final conversation layout', () => {
  const page = scene();
  page.log.scrollHeight = 1300;
  page.controller.schedule(true);
  page.controller.schedule(true);
  page.log.clientHeight = 320; // Composer and focus actions settle afterward.
  page.log.scrollHeight = 1800;
  page.resize();
  page.scroll(0); // A layout scroll event cannot cancel the forced request.
  assert.equal(page.frames.size, 1);
  assert.equal(page.writes, 0);
  page.flush();
  assert.equal(page.log.scrollTop, 1480);
  assert.equal(page.writes, 1);
});

test('draft and container resizing follow an already pinned conversation', () => {
  const page = scene({ content: 1400, top: 1000 });
  page.log.clientHeight = 300;
  page.resize();
  page.controller.schedule();
  page.flush();
  assert.equal(page.log.scrollTop, 1100);
  page.log.clientHeight = 500;
  page.resize();
  page.flush();
  assert.equal(page.log.scrollTop, 900);
});

test('content reflow follows the bottom when its outer viewport stays unchanged', () => {
  const page = scene({ content: 1400, top: 1000, separateContent: true });
  page.log.scrollHeight = 1700; // A font or content reflow grows the inner log.
  page.resize(page.contents);
  page.flush();
  assert.equal(page.log.scrollTop, 1300);
  page.scroll(200);
  page.log.scrollHeight = 1900;
  page.resize(page.contents);
  page.flush();
  assert.equal(page.log.scrollTop, 200);
});

test('reading older messages survives resize and ordinary updates until a new message', () => {
  const page = scene({ content: 2000, top: 1600 });
  page.scroll(300);
  page.log.scrollHeight = 2300;
  page.log.clientHeight = 350;
  page.resize();
  page.controller.schedule();
  page.flush();
  assert.equal(page.log.scrollTop, 300);
  assert.equal(page.writes, 0);
  page.controller.schedule(true);
  page.flush();
  assert.equal(page.log.scrollTop, 1950);
});

test('manual scrolling cancels a queued ordinary follow but not a forced message', () => {
  const page = scene({ content: 1200, top: 800 });
  page.controller.schedule();
  page.scroll(100);
  page.flush();
  assert.equal(page.log.scrollTop, 100);
  assert.equal(page.writes, 0);
  page.controller.schedule(true);
  page.scroll(200);
  page.flush();
  assert.equal(page.log.scrollTop, 800);
});

test('48 pixels from the bottom is considered pinned and farther away is preserved', () => {
  const page = scene({ content: 1200, top: 752 });
  page.controller.schedule();
  page.flush();
  assert.equal(page.log.scrollTop, 800);
  page.scroll(751);
  page.controller.schedule();
  page.flush();
  assert.equal(page.log.scrollTop, 751);
  assert.equal(page.writes, 1);
});

test('a hidden log retains a forced request without spinning animation frames', () => {
  const page = scene({ shown: false, height: 0, content: 0 });
  page.controller.schedule(true);
  page.flush();
  assert.equal(page.writes, 0);
  assert.equal(page.frames.size, 0);
  page.scroll(0);
  page.log.shown = true;
  page.log.clientHeight = 450;
  page.log.scrollHeight = 2400;
  page.resize();
  page.flush();
  assert.equal(page.log.scrollTop, 1950);
});

test('an explicit return-to-Home schedule works after a hidden render', () => {
  const page = scene({ content: 1800, top: 50 });
  page.log.shown = false;
  page.controller.schedule(true);
  page.flush();
  page.log.shown = true;
  page.controller.schedule();
  page.flush();
  assert.equal(page.log.scrollTop, 1400);
});

test('short or newly empty chats settle at zero', () => {
  const page = scene({ content: 1200, top: 800 });
  page.log.scrollHeight = 120;
  page.controller.schedule(true);
  page.flush();
  assert.equal(page.log.scrollTop, 0);
});

test('destroy cancels queued work and removes observers and listeners', () => {
  const page = scene({ content: 1200, top: 800 });
  page.controller.schedule(true);
  page.controller.destroy();
  page.controller.destroy();
  page.resize();
  page.controller.schedule(true);
  page.flush();
  assert.equal(page.writes, 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.listeners, 0);
  assert.equal(page.observing, false);
});

test('browser script exposes the same ChatScroll factory', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../chat-scroll.js'), 'utf8'), context);
  assert.equal(typeof context.window.ChatScroll.create, 'function');
});
