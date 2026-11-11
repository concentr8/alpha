/* Purpose: proves the first start of docs/plans/simplicity-redesign.md 3.1 and the acceptance criteria of PR 3 in a real
   browser: status line instead of a blank page, calendar step with one click, first to-do with Enter, failure texts,
   "Not now" and Escape, empty new accounts, existing accounts untouched, demo mode without sign-in.
   Run with: cd e2e && node --test (see e2e/README.md). The Concentr8 server and Google are mocked (e2e/helpers.js).
   Calls: e2e/helpers.js, the frontend in frontend/ through Chrome. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers.js');

let site;
let browser;
before(async () => { site = await h.serveFrontend(); browser = await h.launchBrowser(); });
after(async () => { await browser.close(); await site.close(); });

const STEP2 = 'Step 2 of 3';
const STEP3 = 'Step 3 of 3';
const dialogText = (page) => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.innerText).join('\n'));
const state = (page) => page.evaluate(() => {
  const s = window.Articul8.state;
  return { tasks: s.tasks.map((x) => x.title), courses: s.courses.length, events: s.calendarEvents.length, onboarding: s.onboarding };
});

// A signed-out new student opens the app; the mock sends them to "Google" and back. Returns once step 2 shows.
async function arriveAtCalendarStep(scenario = 'new', options = {}) {
  const context = await h.newContext(browser, site.base);
  const mock = await h.mockServer(context, { scenario, appUrl: site.appUrl, ...options });
  await h.countClicks(context, site.base);
  await h.recordSteps(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(site.appUrl, { waitUntil: 'commit' });
  await page.locator('[data-onboarding-connect]').waitFor({ timeout: 20_000 });
  return { context, mock, page, errors };
}

// Step 3 has arrived when its field has focus (the plan: "the field in step 3 has focus on arrival").
const waitForFirstTodoField = (page) => page.waitForFunction(() => document.activeElement && document.activeElement.matches('[data-onboarding-todo] input'), null, { timeout: 15_000 });

test('1. while the server answer is held, "Opening Google sign-in…" shows and the page is not blank', async () => {
  const context = await h.newContext(browser, site.base);
  const mock = await h.mockServer(context, { appUrl: site.appUrl, holdSignIn: true });
  const page = await context.newPage();
  await page.goto(site.appUrl, { waitUntil: 'commit' });
  const status = page.locator('[data-signin-wait]');
  await status.waitFor({ state: 'visible', timeout: 5_000 });
  assert.equal((await status.innerText()).trim(), 'Opening Google sign-in…');
  await page.waitForFunction(() => document.readyState === 'complete');
  assert.ok(mock.signIn.count() >= 1, 'the sign-in answer is still held, so the server is "waking up"');
  assert.ok(await page.locator('.signin-dialog .c8-brand').isVisible(), 'the brand is visible');
  assert.ok(await status.isVisible(), 'the status line is still visible while the answer is held');
  await context.close();
});

test('2. happy path: Google → step 2 → one click connects, saves the account calendar, step 3 focused, Enter adds the to-do', async () => {
  const { context, mock, page, errors } = await arriveAtCalendarStep('new', { holdChat: true });
  assert.match(await dialogText(page), new RegExp(STEP2, 'i'));
  const popup = context.waitForEvent('page');
  await page.click('[data-onboarding-connect]');
  const google = await popup;
  await google.waitForEvent('close', { timeout: 10_000 });
  await waitForFirstTodoField(page);
  assert.deepEqual(mock.saved, [h.EMAIL], 'the calendar whose id is the account email was saved without another click');
  assert.match(await dialogText(page), new RegExp(STEP3, 'i'));
  assert.equal(await h.clicksSoFar(page), 1, 'one click inside Concentr8 before typing');

  await page.keyboard.type('Read chapter 4');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Articul8.state.tasks.some((x) => x.title === 'Read chapter 4'), null, { timeout: 2_000 });
  assert.ok(mock.chatCalls <= 1 && mock.chat.count() === mock.chatCalls, 'the chat reply has not arrived yet');
  const before = await page.evaluate(() => window.Articul8.state.messages.filter((m) => m.role === 'assistant').length);
  assert.equal(before, 0, 'the to-do exists before the chat reply');

  mock.chat.release();
  await page.locator('.c8-next .c8-next__title').first().waitFor({ timeout: 5_000 });
  assert.equal(await page.locator('.c8-next .c8-next__title').first().innerText(), 'Read chapter 4');
  assert.equal(await page.locator('dialog[open]').count(), 0, 'no first-start screen is left open');
  assert.deepEqual(errors, []);
  await context.close();
});

test('3. "Not now" goes to step 3, and after a reload the calendar step never returns', async () => {
  const { context, page } = await arriveAtCalendarStep();
  await page.click('[data-onboarding-later]');
  await waitForFirstTodoField(page);
  assert.equal((await state(page)).onboarding.calendar, 'skipped');

  await h.resetSteps(page);
  await page.reload();
  // Without a to-do, step 3 may come back (it asks for the first to-do); step 2 must not.
  await waitForFirstTodoField(page);
  assert.deepEqual(await h.stepsSeen(page), [STEP3]);

  await page.keyboard.type('Read chapter 4');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await h.resetSteps(page);
  await page.reload();
  await page.locator('.c8-next').first().waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => window.Articul8.state.onboarding.firstTodo === 'done');
  await page.waitForTimeout(1_000); // give a wrongly returning step the time it would need to show
  assert.deepEqual(await h.stepsSeen(page), [], 'no step returns after a reload');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await context.close();
});

test('4. Google window closed without permission: "The calendar did not connect." with "Try again", never "Failed to fetch"', async () => {
  const { context, page } = await arriveAtCalendarStep('fail');
  await page.click('[data-onboarding-connect]');
  await page.getByText('The calendar did not connect.').waitFor({ timeout: 15_000 });
  assert.equal(await page.locator('[data-onboarding-connect]').innerText(), 'Try again');
  assert.ok(await page.locator('[data-onboarding-later]').isVisible(), '"Not now" is still offered');
  assert.doesNotMatch(await page.evaluate(() => document.body.innerText), /Failed to fetch/i);
  await context.close();
});

test('5. server unreachable: "We could not reach Concentr8." and "Continue with Google", no "AI generated" text', async () => {
  const context = await h.newContext(browser, site.base);
  await h.mockServer(context, { scenario: 'offline', appUrl: site.appUrl });
  const page = await context.newPage();
  await page.goto(site.appUrl);
  await page.getByText('We could not reach Concentr8.').waitFor({ timeout: 10_000 });
  const action = page.locator('[data-signin-action]');
  assert.ok(await action.isVisible());
  assert.equal((await action.innerText()).trim(), 'Continue with Google');
  const text = await page.evaluate(() => document.body.innerText);
  assert.doesNotMatch(text, /AI[ -]generated/i);
  assert.doesNotMatch(text, /Failed to fetch/i);
  await context.close();
});

test('6. empty Enter in step 3 shows "Type a to-do first."', async () => {
  const { context, page } = await arriveAtCalendarStep();
  await page.click('[data-onboarding-later]');
  await waitForFirstTodoField(page);
  const error = page.locator('#onboarding-todo-error');
  assert.equal(await error.isVisible(), false);
  await page.keyboard.press('Enter');
  await error.waitFor({ state: 'visible', timeout: 2_000 });
  assert.equal((await error.innerText()).trim(), 'Type a to-do first.');
  assert.deepEqual((await state(page)).tasks, [], 'nothing was added');
  await context.close();
});

test('7. Escape on step 2 behaves like "Not now"', async () => {
  const { context, page } = await arriveAtCalendarStep();
  await page.keyboard.press('Escape');
  await waitForFirstTodoField(page);
  assert.equal((await state(page)).onboarding.calendar, 'skipped');
  assert.match(await dialogText(page), new RegExp(STEP3, 'i'));
  await context.close();
});

test('8. a new account has 0 to-dos, 0 courses and 0 calendar events', async () => {
  const { context, page } = await arriveAtCalendarStep();
  const s = await state(page);
  assert.deepEqual([s.tasks.length, s.courses, s.events], [0, 0, 0]);
  await context.close();
});

test('9. an existing account keeps its own to-dos and never sees step 3', async () => {
  const context = await h.newContext(browser, site.base);
  await h.mockServer(context, { scenario: 'existing', appUrl: site.appUrl });
  await h.seed(context, {
    token: 'old-token',
    state: { version: 2, tasks: [{ id: 'own', title: 'My own essay', done: false, steps: [] }], courses: [{ id: 'c', name: 'MATH 1A' }], calendarEvents: [] },
  });
  await h.recordSteps(context);
  const page = await context.newPage();
  await page.goto(site.appUrl);
  await page.waitForFunction(() => window.Articul8.state.onboarding.firstTodo === 'had-todos', null, { timeout: 10_000 });
  await page.waitForTimeout(1_000); // a wrongly shown step would appear within this time
  const s = await state(page);
  assert.deepEqual(s.tasks, ['My own essay']);
  assert.equal(s.courses, 1);
  assert.deepEqual(await h.stepsSeen(page), []);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await context.close();
});

test('10. ?demo shows the samples and no sign-in', async () => {
  const context = await h.newContext(browser, site.base);
  const mock = await h.mockServer(context, { appUrl: site.appUrl });
  const page = await context.newPage();
  await page.goto(`${site.appUrl}?demo`);
  await page.locator('.c8-next').first().waitFor({ timeout: 10_000 });
  const s = await state(page);
  assert.ok(s.tasks.length >= 3, `samples present (${s.tasks.length} to-dos)`);
  assert.ok(s.courses >= 3 && s.events > 0);
  assert.equal(await page.locator('dialog[open]').count(), 0, 'no sign-in screen');
  assert.ok(!mock.paths.some((p) => p.includes('/auth/google')), 'no trip to Google');
  await context.close();
});

// Found in Phase 3 testing (N6): after Enter on "Connect Google Calendar" the focus moved to "Not now",
// so a second Enter skipped the calendar for good.
test('11. keyboard: a second Enter right after "Connect Google Calendar" does not skip the calendar', async () => {
  const { context, page } = await arriveAtCalendarStep();
  await page.locator('[data-onboarding-connect]').focus();
  const popup = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await popup;
  await page.locator('[data-onboarding-todo]').waitFor({ timeout: 10_000 });
  assert.equal(await page.evaluate(() => window.Articul8.state.onboarding.calendar), 'connected');
  await context.close();
});
