// Purpose: checks the blocker logic without a Mac: rules, block list names, AppleScript text, the AI check and the loop.
// Called by: `npm test` in app/ and the CI workflow.
// Calls: app/desktop/*.js with fake platforms, fake servers and fake phone numbers where needed (none are used here).
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify } = require('../desktop/rules');
const { rulesFromNames } = require('../desktop/apps');
const { createMacPlatform, asString } = require('../desktop/platform');
const { judgeActivity, createCachedJudge, createServerAsker, usefulLocation } = require('../desktop/relevance');
const { createBlocker, isRestorableUrl } = require('../desktop/blocker');
const { safeServer } = require('../desktop/bridge');

const ctx = (activity, intent = 'write essay about Hamlet') => ({ activity: { at: 0, url: null, title: null, ...activity }, intent });
const rules = rulesFromNames(['YouTube', 'Steam', 'Notion']);

test('block list names become app and domain rules', () => {
  assert.deepEqual(rules.blockedDomains.sort(), ['steampowered.com', 'steamcommunity.com', 'youtube.com'].sort());
  assert.ok(rules.blockedApps.includes('Steam') && rules.blockedApps.includes('Notion'));
  assert.deepEqual(rulesFromNames(['reddit.com/r/all']).blockedDomains, ['reddit.com/r/all']);
});

test('a blocked program and a blocked site are distractions', () => {
  assert.equal(classify(ctx({ app: 'Steam' }), rules).kind, 'distraction');
  assert.equal(classify(ctx({ app: 'Google Chrome', url: 'https://www.youtube.com/watch?v=1' }), rules).kind, 'distraction');
});

test('a study site and a page that matches the task are not distractions', () => {
  assert.equal(classify(ctx({ app: 'Google Chrome', url: 'https://docs.google.com/document/d/1' }), rules).kind, 'neutral');
  assert.equal(classify(ctx({ app: 'Google Chrome', url: 'https://en.wikipedia.org/wiki/Hamlet', title: 'Hamlet essay sources' }), rules).kind, 'focus');
});

test('Firefox is judged by its window title; short names never match', () => {
  assert.equal(classify(ctx({ app: 'Firefox', title: 'Funny cats - YouTube' }), rules).kind, 'distraction');
  assert.equal(classify(ctx({ app: 'Firefox', title: 'x marks the spot' }), rulesFromNames(['x'])).kind, 'neutral');
});

test('a blank new tab is neutral even on a blocked rule list', () => {
  assert.equal(classify(ctx({ app: 'Google Chrome', url: 'chrome://newtab/' }), rules).kind, 'neutral');
});

test('AppleScript strings are escaped', () => {
  assert.equal(asString('a"b\\c'), '"a\\"b\\\\c"');
});

test('the Mac platform reads the front browser tab and reports no activity without permission', async () => {
  const answers = [];
  const calls = [];
  const run = async (lines) => { calls.push(lines.join('\n')); const next = answers.shift(); if (next instanceof Error) throw next; return next; };
  const platform = createMacPlatform(run);
  answers.push('google chrome', 'https://example.com/\x1eExample');
  assert.deepEqual({ ...(await platform.activity()), at: 0 }, { app: 'Google Chrome', url: 'https://example.com/', title: 'Example', at: 0 });
  answers.push(new Error('not allowed'));
  assert.equal(await platform.activity(), null);
  answers.push('');
  assert.equal(await platform.redirect('Google Chrome', 'https://example.com/"x'), true);
  assert.match(calls.at(-1), /set URL of active tab of front window to "https:\/\/example.com\/\\"x"/);
  assert.equal(await platform.redirect('Firefox', 'https://example.com/'), false);
});

test('Claude is asked only when the plain rules stay neutral, and only when it is sure', async () => {
  let asked = 0;
  const judge = createCachedJudge(async () => { asked++; return { relevance: 'unrelated', confidence: 0.95, reason: 'Shopping page' }; });
  const page = ctx({ app: 'Google Chrome', url: 'https://shop.example/shoes', title: 'Shoes' });
  assert.deepEqual(await judgeActivity(page, rules, judge), { kind: 'distraction', reason: 'Shopping page' });
  await judgeActivity(page, rules, judge);
  assert.equal(asked, 1, 'the same page is asked once');
  assert.equal((await judgeActivity(ctx({ app: 'Steam' }), rules, judge)).kind, 'distraction');
  assert.equal(asked, 1, 'a plain-rule verdict never reaches Claude');
  const unsure = createCachedJudge(async () => ({ relevance: 'unrelated', confidence: 0.6, reason: 'maybe' }));
  assert.equal((await judgeActivity(page, rules, unsure)).kind, 'neutral');
  const broken = createCachedJudge(async () => { throw new Error('down'); });
  assert.equal((await judgeActivity(page, rules, broken)).kind, 'neutral');
});

test('the server asker sends the token and fails without a server', async () => {
  let seen;
  const ask = createServerAsker(() => ({ url: 'https://api.example', token: 't0k' }), async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ relevance: 'relevant', confidence: 1, reason: '' }) }; });
  await ask({ intent: 'x' });
  assert.equal(seen.url, 'https://api.example/api/relevance');
  assert.equal(seen.init.headers.Authorization, 'Bearer t0k');
  await assert.rejects(createServerAsker(() => null)({}), /No Concentr8 server/);
  assert.equal(usefulLocation('https://www.google.com/search?q=hamlet+notes&tracking=1'), 'www.google.com/search; query: hamlet notes');
});

test('the bridge accepts only an https server address', () => {
  assert.ok(safeServer({ url: 'https://api.example', token: 'a' }));
  assert.equal(safeServer({ url: 'http://api.example', token: 'a' }), null);
  assert.equal(safeServer({ url: 'https://api.example/path', token: 'a' }), null);
  assert.equal(safeServer(null), null);
});

test('only real pages are restored after a block', () => {
  assert.equal(isRestorableUrl('https://a.example'), true);
  assert.equal(isRestorableUrl('favorites://'), false);
  assert.equal(isRestorableUrl(null), false);
});

// A fake screen that the test changes by hand, and a clock it moves by hand.
async function setup(t) {
  const screen = { activity: { app: 'Google Chrome', url: 'https://docs.google.com/d/1', title: 'Essay' } };
  const log = { notes: [], redirects: [], hidden: [] };
  let clock = 1_000_000;
  const platform = {
    supported: true,
    activity: async () => ({ ...screen.activity, at: clock }),
    redirect: async (app, url) => { log.redirects.push([app, url]); return true; },
    closeTab: async () => true,
    hideApp: async (app) => { log.hidden.push(app); return true; },
  };
  const blocker = createBlocker({ platform, judge: null, notify: (title, body) => log.notes.push(title), onChange: () => {}, now: () => clock });
  t.after(() => blocker.stop()); // also when a check fails, so the timer never keeps the test run open
  await blocker.start({ task: 'write essay', names: ['YouTube', 'Steam'], aiCheck: false });
  return { screen, log, blocker, advance: (ms) => { clock += ms; } };
}

test('nudge first, close after the grace time, and send the browser back to the last work page', async (t) => {
  const { screen, log, blocker, advance } = await setup(t);
  screen.activity = { app: 'Google Chrome', url: 'https://www.youtube.com/watch?v=1', title: 'Cats' };
  await blocker.tick();
  assert.deepEqual(log.notes, ['Back to: write essay']);
  advance(16_000);
  await blocker.tick();
  assert.deepEqual(log.redirects, [['Google Chrome', 'https://docs.google.com/d/1']]);
  assert.equal(log.notes.at(-1), 'Closed youtube.com');
  assert.equal(blocker.status().blocks, 1);
});

test('a blocked program is hidden, and a break pauses everything', async (t) => {
  const { screen, log, blocker, advance } = await setup(t);
  blocker.pause(true);
  screen.activity = { app: 'Steam', url: null, title: null };
  await blocker.tick();
  assert.deepEqual(log.notes, []);
  blocker.pause(false);
  await blocker.tick();
  advance(16_000);
  await blocker.tick();
  assert.deepEqual(log.hidden, ['Steam']);
});

test('going back in time stops the warning', async (t) => {
  const { screen, log, blocker, advance } = await setup(t);
  screen.activity = { app: 'Steam', url: null, title: null };
  await blocker.tick();
  screen.activity = { app: 'Google Chrome', url: 'https://docs.google.com/d/1', title: 'Essay' };
  advance(30_000);
  await blocker.tick();
  assert.deepEqual(log.hidden, []);
});
