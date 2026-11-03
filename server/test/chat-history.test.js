/* Purpose: protect Jack's chat history rules: saved chats come back safely, a new chat reuses an empty one, chat titles.
   Called by `npm test` in server/; calls only Node's built-in test runner and frontend/chat-history.js. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ChatHistory = require('../../frontend/chat-history.js');

const freshState = () => ({
  tasks: [{ id: 't1', title: 'Essay' }], calendarEvents: [{ id: 'e1', title: 'Exam' }],
  activeTaskId: null, agentEventId: null, messages: [], draft: '', taskContext: '',
});
const userMessage = (id, text) => ({ id, text, role: 'user' });

test('a first start has exactly one empty chat, and it is the active one', () => {
  const state = ChatHistory.restore(freshState(), null);
  assert.equal(state.chats.length, 1);
  assert.equal(state.activeChatId, state.chats[0].id);
  assert.deepEqual(state.messages, []);
  assert.equal(state.chats[0].mode, 'chat');
});

test('old saved data with one message list becomes one chat', () => {
  const state = ChatHistory.restore(freshState(), { messages: [userMessage('m1', 'Plan my essay')], draft: 'half typed' });
  assert.equal(state.chats.length, 1);
  assert.equal(state.messages[0].text, 'Plan my essay');
  assert.equal(state.draft, 'half typed');
});

test('saved chats are cleaned: duplicates, broken messages, unknown tasks and events are dropped', () => {
  const saved = {
    activeChatId: 'c2',
    chats: [
      { id: 'c1', mode: 'chat', messages: [userMessage('m1', 'one')], activeTaskId: 'gone', agentEventId: 'e1' },
      { id: 'c1', mode: 'chat', messages: [] },
      { id: 'c2', mode: 'focus', messages: [userMessage('m2', 'two'), { id: 5, text: 'bad id' }, null], activeTaskId: 't1' },
      { id: 'c3', mode: 'something else', messages: [{ id: 'm3', text: 'x', role: 'admin' }] },
    ],
  };
  const state = ChatHistory.restore(freshState(), saved);
  assert.deepEqual(state.chats.map((c) => c.id), ['c1', 'c2', 'c3']);
  assert.equal(state.chats[0].activeTaskId, null);
  assert.equal(state.chats[0].agentEventId, 'e1');
  assert.equal(state.activeChatId, 'c2');
  assert.equal(state.activeTaskId, 't1');
  assert.deepEqual(state.messages.map((m) => m.id), ['m2']);
  assert.equal(state.chats[2].mode, 'chat');
  assert.equal(state.chats[2].messages[0].role, 'user');
});

test('a new chat reuses an untouched empty chat instead of adding rows', () => {
  const state = ChatHistory.restore(freshState(), null);
  const first = state.activeChatId;
  ChatHistory.start(state, 'focus');
  assert.equal(state.chats.length, 1);
  assert.equal(state.activeChatId, first);
  assert.equal(state.chats[0].mode, 'focus');
});

test('switching chats keeps each conversation and its draft', () => {
  const state = ChatHistory.restore(freshState(), null);
  state.messages.push(userMessage('m1', 'Physics homework'));
  state.draft = 'not sent yet';
  ChatHistory.sync(state, 'message');
  const first = state.activeChatId;
  ChatHistory.start(state);
  assert.equal(state.chats.length, 2);
  assert.deepEqual(state.messages, []);
  assert.equal(state.draft, '');
  assert.equal(ChatHistory.select(state, first), true);
  assert.equal(state.messages[0].text, 'Physics homework');
  assert.equal(state.draft, 'not sent yet');
  assert.equal(ChatHistory.select(state, 'missing'), false);
});

test('chat titles are short topics, not greetings or the Quick Start seed', () => {
  const title = (text, mode = 'chat') => ChatHistory.title({ mode, messages: [userMessage('m', text)], draft: '' });
  assert.equal(title('Hi, could you help me work on my physics homework due tomorrow'), 'Physics homework');
  assert.equal(title('I need to finish my CS188 project but I also want to go hiking'), 'Finish CS188 · Hiking');
  assert.equal(title('ok'), 'New chat');
  assert.equal(title('Help me plan a focus session.', 'focus'), 'Focus session');
  assert.ok(title('word '.repeat(40)).length <= 40);
});
