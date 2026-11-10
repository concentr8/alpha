/* Purpose: regression coverage for persisted chats and in-flight API replies.
   Run with node --test frontend/test/chat-history.test.js. Uses VM, fake storage
   and mocked fetch; never sends messages or changes the hosted backend. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const ChatHistory = require('../chat-history.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
// Font licences are JSON data blocks, not executable inline scripts.
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(match => !/^<script[^>]*type=["']application\/json/i.test(match[0]));
const stateScript = html.match(/<script data-source="app-state.js">([\s\S]*?)<\/script>/)[1];
const serverScript = fs.readFileSync(path.join(__dirname, '../concentr8-server.js'), 'utf8');
const key = 'articul8-wireframe-v2';

function boot(saved = null, fetch = async () => { throw new Error('offline'); }, blocked = false) {
  const data = new Map(saved ? [[key, JSON.stringify(saved)]] : []);
  const listeners = new Map();
  const window = {
    addEventListener(name, listener) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(listener); },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); }
  };
  const context = vm.createContext({ window, ChatHistory, crypto, Intl, Date, console, fetch, AbortSignal,
    matchMedia: () => ({ matches: false }), setTimeout,
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    document: { addEventListener() {} },
    localStorage: {
      getItem(name) { if (blocked) throw new Error('storage blocked'); return data.get(name) || null; },
      setItem(name, value) { if (blocked) throw new Error('storage blocked'); data.set(name, value); },
      removeItem(name) { data.delete(name); }
    }
  });
  vm.runInContext(stateScript, context);
  vm.runInContext(serverScript, context);
  return { app: window.Articul8, api: window.Concentr8, window, data, saved: () => JSON.parse(data.get(key)) };
}
const response = (reply, actions = []) => ({ ok: true, status: 200, json: async () => ({ reply, actions, remaining: 8 }) });

test('all inline scripts parse', () => {
  for (const [index, match] of scripts.entries()) new vm.Script(match[1], { filename: `inline-${index}.js` });
});

// ADR 0049: every start opens a fresh Home in a blank chat; earlier chats keep their messages and drafts and are one click away.
test('separate chats retain messages and drafts after reload; the app opens a fresh chat', () => {
  const first = boot();
  first.app.send('Write the essay outline');
  const firstId = first.app.state.activeChatId;
  first.app.setDraft('Three points to include');
  first.app.newChat();
  assert.equal(first.app.state.messages.length, 0);
  assert.equal(first.app.state.draft, '');
  first.app.send('Read chapter four');
  first.app.selectChat(firstId);
  assert.equal(first.app.state.messages[0].text, 'Write the essay outline');
  assert.equal(first.app.state.draft, 'Three points to include');
  const restored = boot(first.saved());
  assert.notEqual(restored.app.state.activeChatId, firstId);
  assert.equal(restored.app.state.messages.length, 0);
  assert.equal(restored.app.state.chats.length, 3);
  restored.app.selectChat(firstId);
  assert.equal(restored.app.state.draft, 'Three points to include');
  assert.equal(restored.app.state.messages, restored.app.state.chats.find(c => c.id === firstId).messages);
});

test('migration preserves old tasks and a legacy conversation, empty chats are reused', () => {
  const old = { version: 2, tasks: [{ id: 'mine', title: 'My edited task', done: true }], calendarEvents: [],
    messages: [{ id: 'msg', text: 'Earlier conversation' }], draft: 'An unfinished thought' };
  const { app } = boot(old);
  assert.equal(app.state.tasks[0].title, 'My edited task');
  assert.equal(app.state.chats.find(c => c.messages.length).messages[0].text, 'Earlier conversation');
  app.newChat(); app.newChat(); app.newChat();
  assert.equal(app.state.chats.length, 2);
  assert.equal(app.state.tasks[0].done, true);
});

test('a late reply stays in its originating chat, with one task and working undo', async () => {
  const requests = [];
  const env = boot(null, (url, options) => new Promise(resolve => requests.push({ resolve, body: JSON.parse(options.body) })));
  env.app.send('Help with the outline');
  const firstId = env.app.state.activeChatId;
  const firstRequest = env.api.ask();
  assert.equal(env.api.isAsking(), true);
  env.app.newChat(); env.app.send('Help with reading');
  const secondId = env.app.state.activeChatId;
  const secondRequest = env.api.ask();
  requests[1].resolve(response('Read one section first.'));
  await secondRequest;
  requests[0].resolve(response('Outline the first paragraph.', [{ type: 'add_todo', title: 'Outline first paragraph' }]));
  await firstRequest;
  assert.equal(env.app.state.activeChatId, secondId);
  assert.equal(env.app.state.messages.at(-1).text, 'Read one section first.');
  env.app.selectChat(firstId);
  const message = env.app.state.messages.at(-1);
  assert.equal(message.text, 'Outline the first paragraph.');
  assert.equal(message.actions[0].state, 'done');
  const reloaded = boot(env.saved());
  assert.equal(reloaded.app.state.tasks.filter(t => t.title === 'Outline first paragraph').length, 1);
  reloaded.app.selectChat(firstId);
  reloaded.app.runAction(message.id, 0, 'undo');
  assert.equal(reloaded.app.state.tasks.some(t => t.title === 'Outline first paragraph'), false);
});

test('reset drops in-flight results instead of resurrecting a deleted conversation', async () => {
  let finish;
  const env = boot(null, () => new Promise(resolve => { finish = resolve; }));
  env.app.send('Old chat'); const pending = env.api.ask();
  env.app.reset();
  finish(response('Late reply', [{ type: 'add_todo', title: 'Late task' }]));
  await pending;
  assert.equal(env.app.state.messages.length, 0);
  assert.equal(env.app.state.tasks.some(t => t.title === 'Late task'), false);
});

test('Quick Start adds planning guidance to API context without polluting saved messages', async () => {
  let body;
  const env = boot(null, async (url, options) => { body = JSON.parse(options.body); return response('What task and how much time?'); });
  env.app.newChat('focus'); env.app.send('Help me plan a focus session.');
  await env.api.ask();
  assert.match(body.messages.at(-1).text, /one achievable outcome/);
  assert.equal(env.app.state.messages[0].text, 'Help me plan a focus session.');
  assert.equal(boot(env.saved()).app.state.chats[0].mode, 'focus');
});

test('offline errors go to the correct chat and blocked storage still allows local use', async () => {
  const env = boot(null, async () => { throw new Error('offline'); }, true);
  env.app.send('My task'); await env.api.ask();
  assert.match(env.app.state.messages.at(-1).text, /not reachable/);
  assert.equal(env.api.isAsking(), false);
  env.app.newChat(); assert.equal(env.app.state.messages.length, 0);
});

test('storage updates do not switch the chat selected in this tab', () => {
  const env = boot(); env.app.send('First chat');
  const id = env.app.state.activeChatId;
  env.app.newChat(); env.app.send('Second chat');
  const external = env.saved();
  env.app.selectChat(id);
  env.window.dispatchEvent({ type: 'storage', key, newValue: JSON.stringify(external) });
  assert.equal(env.app.state.activeChatId, id);
  assert.equal(env.app.state.messages[0].text, 'First chat');
});

test('short topics remove conversational setup and retain independent goals', () => {
  const examples = [
    ['I want to go hiking with my friends, but I also have a paper due tonight', 'Hiking · Paper'],
    ['Hi, could you please help me prepare for my biology exam next Monday? I have three chapters left.', 'Prepare for biology exam'],
    ['Can you help me compare two approaches to the React dashboard redesign?', 'React dashboard redesign comparison'],
    ['I have been thinking about how to improve the course dashboard.', 'Improve course dashboard'],
    ['Hi, I hope you are doing well. I need to write my biology paper.', 'Write biology paper'],
    ['Please help me fix the Next.js login redirect.', 'Fix Next.js login redirect'],
    ['Please help me turn notifications on', 'Turn notifications on'],
    ['\u6211\u60f3\u8bf7\u4f60\u5e2e\u6211\u6574\u7406\u4e00\u4e0b\u6bd5\u4e1a\u8bba\u6587\u7684\u5927\u7eb2，\u8c22\u8c22', '\u6574\u7406\u6bd5\u4e1a\u8bba\u6587\u7684\u5927\u7eb2'],
    ['\u6211\u53ea\u670925\u5206\u949f，\u6211\u60f3\u590d\u4e60\u7ebf\u6027\u4ee3\u6570', '\u590d\u4e60\u7ebf\u6027\u4ee3\u6570']
  ];
  for (const [message, expected] of examples) {
    const { app } = boot(); app.send(message);
    assert.equal(ChatHistory.title(app.state.chats[0]), expected, message);
  }
});

test('greetings and Quick Start wait for a real topic, then keep that title stable', () => {
  const { app } = boot();
  app.send('Hello!');
  assert.equal(ChatHistory.title(app.state.chats[0]), 'New chat');
  app.send('I want to work on my essay');
  assert.equal(ChatHistory.title(app.state.chats[0]), 'Essay');
  app.send('First paragraph');
  assert.equal(ChatHistory.title(app.state.chats[0]), 'Essay');
  app.newChat('focus');
  const chat = app.state.chats.find(c => c.id === app.state.activeChatId);
  app.send('Help me plan a focus session.');
  assert.equal(ChatHistory.title(chat), 'Focus session');
  app.send('I have 25 minutes to outline an essay.');
  assert.equal(ChatHistory.title(chat), 'Outline essay');
});

test('existing chats get short topics without changing content or recency', () => {
  const original = boot();
  original.app.send('I want to go hiking with my friends, but I also have a paper due tonight');
  original.app.setDraft('Keep this unfinished thought');
  const saved = original.saved();
  saved.chats[0].updatedAt = 1000;
  const restored = boot(saved);
  restored.app.selectChat(saved.chats[0].id); // a reload opens a fresh chat (ADR 0049)
  const before = JSON.stringify(restored.app.state);
  assert.equal(ChatHistory.title(restored.app.state.chats[0]), 'Hiking · Paper');
  assert.equal(JSON.stringify(restored.app.state), before);
  restored.app.newChat();
  restored.app.selectChat(saved.chats[0].id);
  const reloaded = boot(restored.saved());
  assert.equal(ChatHistory.title(reloaded.app.state.chats[0]), 'Hiking · Paper');
  assert.equal(reloaded.app.state.chats[0].updatedAt, 1000);
  assert.equal(reloaded.app.state.chats[0].draft, 'Keep this unfinished thought');
  assert.notEqual(reloaded.app.state.activeChatId, saved.chats[0].id);
});

test('topic titles work offline without consulting assistant answers or sending requests', () => {
  const env = boot(null, () => { throw new Error('Title generation must not fetch'); }, true);
  env.app.send('Hello');
  env.app.change(s => s.messages.push({ id: 'reply', role: 'assistant', text: 'Start a timer now.' }), 'assistant');
  env.app.send('Please help me review my chemistry notes');
  assert.equal(ChatHistory.title(env.app.state.chats[0]), 'Review chemistry notes');
  assert.equal(env.api.isAsking(), false);
});

test('long English and Chinese topics remain bounded and drafts use the same topic extraction', () => {
  const { app } = boot();
  app.setDraft('Please help me outline my economics paper');
  assert.equal(ChatHistory.title(app.state.chats[0]), 'Outline economics paper');
  app.send('I need to review advanced computational neuroscience research methods and their practical applications');
  const title = ChatHistory.title(app.state.chats[0]);
  assert.ok(title.length <= 40);
  assert.match(title, /^Review advanced computational/);
  assert.doesNotMatch(title, /[\uD800-\uDBFF]$/);
  app.newChat(); app.send('\u6211\u60f3\u6574\u7406\u6709\u5173\u4eba\u5de5\u667a\u80fd\u5728\u6559\u80b2\u9886\u57df\u5e94\u7528\u7684\u7814\u7a76\u8bba\u6587\u548c\u53c2\u8003\u8d44\u6599');
  assert.ok(Array.from(ChatHistory.title(app.state.chats.at(-1))).length <= 18);
});
