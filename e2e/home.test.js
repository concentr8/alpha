/* Purpose: proves Home of docs/plans/simplicity-redesign.md 3.2 and the acceptance criteria of PR 4 in a real browser, in
   demo mode (?demo, no sign-in): one-click focus, the order of to-dos, the N key, tick and delete with Undo, the empty card,
   a fresh Home after reload, the compact card in a chat, one filled button, target sizes, 320 px and German texts.
   Run with: cd e2e && node --test (see e2e/README.md). No server is needed; every outside address is blocked.
   Calls: e2e/helpers.js, the frontend in frontend/ through Chrome. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers.js');

let site;
let browser;
before(async () => { site = await h.serveFrontend(); browser = await h.launchBrowser(); });
after(async () => { await browser.close(); await site.close(); });

// Opens Home in demo mode. seedState replaces the sample data before the first load; viewport and query are optional.
async function openHome({ seedState, viewport, query = '' } = {}) {
  const context = await h.newContext(browser, site.base, viewport ? { viewport } : {});
  if (seedState) await h.seed(context, { state: seedState });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(`${site.appUrl}?demo${query}`);
  await page.locator('.c8-next').first().waitFor({ timeout: 10_000 });
  return { context, page, errors };
}

const titlesOnHome = (page) => page.$$eval('.c8-next__title, .c8-row__title', (els) => els.map((el) => el.textContent.trim()));
const openTodos = (page) => page.evaluate(() => window.Articul8.state.tasks.filter((x) => !x.done).map((x) => x.title));
const noteText = (page) => page.locator('.c8-note').innerText();
// Deadlines far in the past or future, so the order never depends on today's date.
const deadline = (taskId, start) => ({ id: `d-${taskId}`, title: taskId, kind: 'deadline', start, end: start, taskId, allDay: false });
const todo = (id, title) => ({ id, title, done: false, steps: [] });

test('1. one click on "Start focus" opens Focus with a running timer for the Next to-do and the minutes from Settings', async () => {
  const { context, page, errors } = await openHome();
  // Settings → Default focus minutes = 40, saved through the real form.
  await page.goto(`${site.appUrl}?demo#profile/settings`);
  await page.fill('#settings-form input[name="minutes"]', '40');
  await page.click('#settings-form button[type="submit"]');
  await page.click('[data-page="Home"]');
  const start = page.locator('.c8-next [data-home-start]');
  await start.waitFor();
  assert.match(await start.innerText(), /40 min/);
  const nextTitle = (await page.locator('.c8-next .c8-next__title').innerText()).trim();

  await start.click();
  await page.waitForFunction(() => location.hash === '#focus');
  const session = await page.evaluate(() => {
    const a = window.Articul8.state.activeSession;
    const task = window.Articul8.state.tasks.find((x) => x.id === a.taskId);
    return { status: a.status, title: task && task.title, seconds: a.phases[a.index || 0].seconds };
  });
  assert.deepEqual(session, { status: 'running', title: nextTitle, seconds: 40 * 60 });
  const timer = page.locator('[data-timer-value]');
  await timer.waitFor();
  const first = await timer.innerText();
  await page.waitForFunction((was) => document.querySelector('[data-timer-value]').textContent !== was, first, { timeout: 3_000 });
  assert.match(first, /^(40:00|39:5\d)$/, `timer starts at the Settings minutes (${first})`);
  assert.deepEqual(errors, []);
  await context.close();
});

test('2. order: overdue first (oldest first), then by deadline, then no date in the order added', async () => {
  const base = { version: 2, courses: [] };
  const overdue = await openHome({ seedState: { ...base,
    tasks: [todo('none', 'No date'), todo('future', 'Future'), todo('newer', 'Overdue newer'), todo('older', 'Overdue older')],
    calendarEvents: [deadline('future', '2099-01-05T09:00'), deadline('newer', '2020-06-01T09:00'), deadline('older', '2020-01-01T09:00')] } });
  assert.deepEqual(await titlesOnHome(overdue.page), ['Overdue older', 'Overdue newer', 'Future']);
  await overdue.context.close();

  const undated = await openHome({ seedState: { ...base,
    tasks: [todo('a', 'No date A'), todo('b', 'No date B'), todo('late', 'Later'), todo('soon', 'Sooner')],
    calendarEvents: [deadline('late', '2099-03-01T09:00'), deadline('soon', '2099-01-01T09:00')] } });
  assert.deepEqual(await titlesOnHome(undated.page), ['Sooner', 'Later', 'No date A']);
  await undated.context.close();
});

test('3. N focuses the add field unless a text field has focus; Enter adds and keeps focus; Escape leaves', async () => {
  const { context, page } = await openHome();
  const isAddField = () => page.evaluate(() => document.activeElement.matches('[data-home-input]'));
  // Typing "n" in the chat composer must stay in the composer.
  await page.click('#main-composer textarea');
  await page.keyboard.press('n');
  assert.equal(await isAddField(), false);
  assert.equal(await page.inputValue('#main-composer textarea'), 'n');
  await page.fill('#main-composer textarea', '');

  await page.click('h1');
  await page.keyboard.press('n');
  assert.equal(await isAddField(), true, 'N focuses the add field');
  assert.equal(await page.inputValue('.c8-row--add [data-home-input]'), '', 'the N itself is not typed into the field');
  await page.keyboard.type('Email the TA');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Articul8.state.tasks.some((x) => x.title === 'Email the TA'));
  assert.equal(await isAddField(), true, 'focus stays for the next one');
  assert.match(await noteText(page), /Added "Email the TA"\.\s*Undo/);
  await page.keyboard.press('Escape');
  assert.equal(await isAddField(), false, 'Escape leaves the field');
  await context.close();
});

test('4. ticking shows "Done." with Undo, keeps every row in its place, and Undo restores the to-do', async () => {
  const { context, page } = await openHome();
  const before = await titlesOnHome(page);
  const ticked = before[1];
  await page.locator('.home-rows [data-home-check]').first().click();
  await page.locator('.c8-note').waitFor();
  assert.match(await noteText(page), /^Done\.\s*Undo$/);
  assert.deepEqual(await titlesOnHome(page), before, 'rows keep their positions');
  assert.ok(!(await openTodos(page)).includes(ticked), 'the to-do is done');
  await page.click('[data-home-undo]');
  await page.waitForFunction((title) => window.Articul8.state.tasks.some((x) => x.title === title && !x.done), ticked);
  assert.deepEqual(await titlesOnHome(page), before);
  await context.close();
});

test('5. delete from the ⋯ menu shows a note; Undo restores the to-do and its calendar blocks', async () => {
  const { context, page } = await openHome();
  const read = () => page.evaluate(() => {
    const s = window.Articul8.state;
    const id = document.querySelector('.c8-next [data-home-start]').dataset.homeStart;
    return { id, tasks: s.tasks.length, blocks: s.calendarEvents.filter((e) => e.taskId === id).map((e) => e.id).sort() };
  });
  const before = await read();
  assert.ok(before.blocks.length > 0, 'the Next to-do has calendar blocks in the demo data');
  const title = (await page.locator('.c8-next .c8-next__title').innerText()).trim();
  await page.click('.c8-next [data-home-menu]');
  await page.click('.c8-menu [data-home-delete]');
  await page.locator('.c8-note').waitFor();
  assert.match(await noteText(page), new RegExp(`Deleted "${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\.\\s*Undo`));
  const gone = await page.evaluate((id) => ({ task: window.Articul8.state.tasks.some((x) => x.id === id), blocks: window.Articul8.state.calendarEvents.filter((e) => e.taskId === id).length }), before.id);
  assert.deepEqual(gone, { task: false, blocks: 0 });
  await page.click('[data-home-undo]');
  const restored = await page.evaluate((id) => ({ tasks: window.Articul8.state.tasks.length, blocks: window.Articul8.state.calendarEvents.filter((e) => e.taskId === id).map((e) => e.id).sort() }), before.id);
  assert.deepEqual(restored, { tasks: before.tasks, blocks: before.blocks });
  await context.close();
});

test('6. no open to-do: the field and "Just start 25 min"; that session creates no to-do, and none is titled "Focus session"', async () => {
  const { context, page } = await openHome({ seedState: { version: 2, courses: [], calendarEvents: [], tasks: [{ ...todo('x', 'Old one'), done: true }] } });
  await page.locator('.c8-next--empty [data-home-input]').waitFor();
  const just = page.locator('[data-home-just-start]');
  assert.equal((await just.innerText()).trim(), 'Just start 25 min');
  const count = await page.evaluate(() => window.Articul8.state.tasks.length);
  await just.click();
  await page.waitForFunction(() => window.Articul8.state.activeSession && window.Articul8.state.activeSession.status === 'running');
  const after = await page.evaluate(() => ({ tasks: window.Articul8.state.tasks.length, named: window.Articul8.state.tasks.some((x) => x.title === 'Focus session') }));
  assert.deepEqual(after, { tasks: count, named: false });
  await context.close();
});

test('7. reload: fresh Home with the Next card and an empty composer; the previous chat with its draft is listed under "Chats"', async () => {
  const { context, page } = await openHome();
  await page.fill('#main-composer textarea', 'I have three assignments due, where should I start');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Articul8.state.messages.length >= 2, null, { timeout: 10_000 });
  await page.fill('#main-composer textarea', 'half typed');
  await page.waitForFunction(() => window.Articul8.state.chats.some((c) => c.draft === 'half typed'));
  const chatId = await page.evaluate(() => window.Articul8.state.activeChatId);

  await page.reload();
  await page.locator('.c8-next:not(.c8-next--compact)').waitFor({ timeout: 10_000 });
  assert.equal(await page.inputValue('#main-composer textarea'), '', 'the composer is empty');
  const s = await page.evaluate((id) => {
    const chat = window.Articul8.state.chats.find((c) => c.id === id);
    return { messages: window.Articul8.state.messages.length, kept: chat && chat.messages.length, draft: chat && chat.draft };
  }, chatId);
  assert.equal(s.messages, 0, 'Home shows no conversation');
  assert.ok(s.kept >= 2, 'the previous chat kept its messages');
  assert.equal(s.draft, 'half typed', 'and its draft');
  await page.click('#chat-history-toggle');
  const firstRow = page.locator('.chat-history-row').first();
  await firstRow.waitFor();
  await firstRow.click();
  await page.waitForFunction(() => window.Articul8.state.messages.length >= 2);
  assert.equal(await page.inputValue('#main-composer textarea'), 'half typed', 'the first row under "Chats" is that chat, draft intact');
  await context.close();
});

test('8. inside a chat the compact card stays visible and its "Start focus" starts a session in one click', async () => {
  const { context, page } = await openHome();
  const nextId = await page.locator('.c8-next [data-home-start]').getAttribute('data-home-start');
  await page.fill('#main-composer textarea', 'I have three assignments due, where should I start');
  await page.keyboard.press('Enter');
  const compactStart = page.locator('.c8-next--compact [data-home-start]');
  await compactStart.waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => window.Articul8.state.messages.length >= 2, null, { timeout: 10_000 });
  assert.ok(await compactStart.isVisible());
  assert.equal(await page.evaluate(() => window.Articul8.state.activeSession), null);
  await compactStart.click();
  await page.waitForFunction(() => window.Articul8.state.activeSession && window.Articul8.state.activeSession.status === 'running');
  assert.equal(await page.evaluate(() => window.Articul8.state.activeSession.taskId), nextId);
  await context.close();
});

test('9. exactly one filled (--action) button on Home and no interactive target under 24x24 px', async () => {
  const { context, page } = await openHome();
  const result = await page.evaluate(() => {
    // Resolve --action to the browser's rgb() form so it can be compared with computed backgrounds.
    const probe = document.createElement('div');
    probe.style.background = 'var(--action)';
    document.body.append(probe);
    const action = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const visible = (el) => el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
    const filled = [...document.querySelectorAll('.workspace button')].filter(visible)
      .filter((b) => getComputedStyle(b).backgroundColor === action).map((b) => b.textContent.trim());
    const small = [...document.querySelectorAll('.workspace button, .workspace input, .workspace a, .workspace textarea, .workspace select, .workspace [role="button"]')]
      .filter(visible).map((el) => [el, el.getBoundingClientRect()]).filter(([, r]) => r.width < 24 || r.height < 24)
      .map(([el, r]) => `${(el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    return { action, filled, small };
  });
  assert.equal(result.filled.length, 1, `filled buttons (${result.action}): ${JSON.stringify(result.filled)}`);
  assert.match(result.filled[0], /^Start focus/);
  assert.deepEqual(result.small, []);
  await context.close();
});

test('10. at 320 px width nothing scrolls sideways', async () => {
  const { context, page } = await openHome({ viewport: { width: 320, height: 700 } });
  const widths = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, view: document.documentElement.clientWidth }));
  assert.ok(widths.page <= widths.view, `scrollWidth ${widths.page} > ${widths.view}`);
  await context.close();
});

test('11. ?lang=de shows German texts on the Next card', async () => {
  const { context, page } = await openHome({ query: '&lang=de' });
  const card = await page.locator('.c8-next').first().innerText();
  assert.match(card, /Fokus starten/);
  assert.doesNotMatch(card, /Start focus/);
  await context.close();
});

// Found in Phase 3 testing (docs/design/test-report.md, N1): the field kept its text, so a second Enter added a duplicate.
test('12. after adding a to-do the add field is empty, and a second Enter adds nothing', async () => {
  const { context, page, errors } = await openHome();
  await page.click('.c8-row--add [data-home-input]');
  await page.keyboard.type('Email the TA');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Articul8.state.tasks.some((x) => x.title === 'Email the TA'));
  assert.equal(await page.inputValue('.c8-row--add [data-home-input]'), '');
  await page.keyboard.press('Enter');
  assert.equal((await openTodos(page)).filter((title) => title === 'Email the TA').length, 1);
  assert.deepEqual(errors, []);
  await context.close();
});

// Found in Phase 3 testing (N2): the floating "Focus · 24:59" button sat on the composer's send button.
test('13. while the card shows the running session, the floating "Focus" button is hidden on Home', async () => {
  const { context, page, errors } = await openHome();
  await page.click('.c8-next [data-home-start]');
  await page.waitForFunction(() => window.Articul8.state.activeSession?.status === 'running');
  await page.click('[data-page="Home"]');
  await page.locator('.c8-next [data-home-open]').waitFor();
  await page.waitForTimeout(1200); // the floating button is refreshed once a second
  assert.equal(await page.isVisible('#resume-focus'), false);
  await page.click('[data-page="To Do List"]');
  await page.locator('#resume-focus').waitFor({ state: 'visible' }); // other pages keep the way back
  assert.deepEqual(errors, []);
  await context.close();
});

// Found in Phase 3 testing (N3, N4): a redraw dropped the keyboard focus, and Space on a checkbox was swallowed while a note showed.
test('14. keyboard: focus stays on the control after a tick, and Space still ticks while a note is showing', async () => {
  const { context, page, errors } = await openHome();
  const focusedIsCheck = () => page.evaluate(() => document.activeElement.matches('[data-home-check]'));
  const done = () => page.evaluate(() => window.Articul8.state.tasks.filter((x) => x.done).length);
  const checks = page.locator('.home-rows [data-home-check]');
  await checks.nth(0).focus();
  await page.keyboard.press('Space');
  assert.equal(await done(), 1);
  assert.equal(await focusedIsCheck(), true, 'focus is still on a checkbox, not on the page body');
  await checks.nth(1).focus();
  await page.keyboard.press('Space');
  assert.equal(await done(), 2, 'Space ticks the second to-do while the note of the first is showing');
  assert.deepEqual(errors, []);
  await context.close();
});

// Found in Phase 3 testing (N5): the ⋯ menu ignored arrow keys, and Tab left it open.
test('15. keyboard: arrow keys move inside the ⋯ menu; Tab closes it and returns to its button', async () => {
  const { context, page } = await openHome();
  await page.locator('.home-rows [data-home-menu]').first().focus();
  await page.keyboard.press('Enter');
  const focusedItem = () => page.evaluate(() => document.activeElement.textContent.trim());
  assert.equal(await focusedItem(), 'Start focus');
  await page.keyboard.press('ArrowDown');
  assert.equal(await focusedItem(), 'Edit');
  await page.keyboard.press('End');
  assert.equal(await focusedItem(), 'Delete');
  await page.keyboard.press('ArrowDown');
  assert.equal(await focusedItem(), 'Start focus', 'wraps around');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.c8-menu').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.matches('[data-home-menu]')), true);
  await context.close();
});

// Found in Phase 3 testing (N10): inside a chat, ticking the one-line card gave no Undo and kept "Start focus" on a done to-do.
test('16. inside a chat, ticking the compact card shows "Done." with Undo and hides its "Start focus"', async () => {
  const { context, page } = await openHome();
  await page.fill('#main-composer textarea', 'Where should I start?');
  await page.keyboard.press('Enter');
  await page.locator('.c8-next--compact [data-home-check]').click();
  assert.match(await noteText(page), /Done\.\s*Undo/);
  assert.equal(await page.locator('.c8-next--compact [data-home-start]').count(), 0);
  await page.click('[data-home-undo]');
  assert.equal(await page.locator('.c8-next--compact [data-home-start]').count(), 1);
  await context.close();
});

// Found in Phase 3 testing (N7): from the first chat there was no visible way back to the Home with the add row.
test('17. pressing "Home" in the sidebar while a chat is open shows the full Home again; the chat stays in the chat switcher', async () => {
  const { context, page } = await openHome();
  await page.fill('#main-composer textarea', 'Where should I start?');
  await page.keyboard.press('Enter');
  await page.locator('.c8-next--compact').waitFor();
  await page.click('[data-page="Home"]');
  await page.locator('.c8-row--add [data-home-input]').waitFor();
  assert.equal(await page.locator('.c8-next--compact').count(), 0);
  const kept = await page.evaluate(() => window.Articul8.state.chats.some((chat) => chat.messages.some((m) => m.text === 'Where should I start?')));
  assert.equal(kept, true);
  await context.close();
});
