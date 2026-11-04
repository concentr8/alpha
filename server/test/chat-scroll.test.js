/* Purpose: protect Jack's chat scrolling rule: a conversation follows new messages only while the student is at the bottom.
   Called by `npm test` in server/; calls only Node's built-in test runner and frontend/chat-scroll.js (with a fake log and fake animation frames). */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ChatScroll = require('../../frontend/chat-scroll.js');

// A log the size of a small window; frames run only when the test says so, like a browser's animation frame.
function fakeLog({ visible = true, scrollHeight = 1000, clientHeight = 300, scrollTop = 700 } = {}) {
  const frames = [];
  const listeners = {};
  const view = { requestAnimationFrame: (run) => frames.push(run), cancelAnimationFrame: () => {} };
  const log = {
    ownerDocument: { defaultView: view },
    scrollHeight, clientHeight, scrollTop,
    getClientRects: () => (visible ? [{}] : []),
    addEventListener: (name, run) => { listeners[name] = run; },
    removeEventListener: () => {},
  };
  const runFrames = () => { while (frames.length) frames.shift()(); };
  return { log, runFrames, listeners };
}

test('a new message scrolls to the bottom while the student is at the bottom', () => {
  const { log, runFrames } = fakeLog({ scrollTop: 700 });
  const scroller = ChatScroll.create(log);
  log.scrollHeight = 1200;
  scroller.schedule();
  runFrames();
  assert.equal(log.scrollTop, 900);
});

test('a student who scrolled up is not pulled down by a new message', () => {
  const { log, runFrames, listeners } = fakeLog({ scrollTop: 700 });
  const scroller = ChatScroll.create(log);
  log.scrollTop = 100;
  listeners.scroll();
  log.scrollHeight = 1200;
  scroller.schedule();
  runFrames();
  assert.equal(log.scrollTop, 100);
});

test('an explicit jump (opening Home, sending a message) goes to the bottom even after scrolling up', () => {
  const { log, runFrames, listeners } = fakeLog({ scrollTop: 700 });
  const scroller = ChatScroll.create(log);
  log.scrollTop = 100;
  listeners.scroll();
  scroller.schedule(true);
  runFrames();
  assert.equal(log.scrollTop, 700);
});

test('a hidden log keeps the request until it is visible again', () => {
  const { log, runFrames } = fakeLog({ visible: false, scrollTop: 0 });
  const scroller = ChatScroll.create(log);
  scroller.schedule(true);
  runFrames();
  assert.equal(log.scrollTop, 0);
  log.getClientRects = () => [{}];
  scroller.schedule();
  runFrames();
  assert.equal(log.scrollTop, 700);
});

test('after destroy nothing is scheduled', () => {
  const { log, runFrames } = fakeLog({ scrollTop: 0 });
  const scroller = ChatScroll.create(log);
  scroller.destroy();
  scroller.schedule(true);
  runFrames();
  assert.equal(log.scrollTop, 0);
});
