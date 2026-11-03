/* Purpose: local conversation records, short topic titles and safe restoration.
   Called by app-state.js and the Home/history UI in index.html; uses no network
   or storage directly. Exported for Node tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChatHistory = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  const uid = () => globalThis.crypto.randomUUID();
  const text = (value, limit = 2000) => typeof value === 'string' ? value.slice(0, limit) : '';
  const contextFields = ['draft', 'taskContext', 'activeTaskId', 'agentEventId'];

  function create(mode = 'chat') {
    return { id: uid(), createdAt: Date.now(), updatedAt: Date.now(), mode,
      messages: [], draft: '', taskContext: '', activeTaskId: null, agentEventId: null };
  }

  function cleanMessages(messages) {
    if (!Array.isArray(messages)) return [];
    return messages.filter(m => m && typeof m.id === 'string' && typeof m.text === 'string').map(m => ({
      ...m, text: text(m.text, 16000), role: m.role === 'assistant' ? 'assistant' : 'user',
      actions: Array.isArray(m.actions) ? m.actions.filter(a => a && typeof a.type === 'string') : []
    }));
  }

  function activate(state, chat) {
    state.activeChatId = chat.id;
    state.messages = chat.messages;
    for (const field of contextFields) state[field] = chat[field];
  }

  function restore(state, saved) {
    const seen = new Set();
    state.chats = (Array.isArray(saved?.chats) ? saved.chats : []).filter(chat => {
      if (!chat || typeof chat.id !== 'string' || seen.has(chat.id)) return false;
      seen.add(chat.id);
      return true;
    }).map(chat => ({
      id: chat.id, createdAt: Number.isFinite(chat.createdAt) ? chat.createdAt : Date.now(),
      updatedAt: Number.isFinite(chat.updatedAt) ? chat.updatedAt : Date.now(),
      mode: chat.mode === 'focus' ? 'focus' : 'chat', messages: cleanMessages(chat.messages),
      draft: text(chat.draft), taskContext: text(chat.taskContext),
      activeTaskId: state.tasks.some(t => t.id === chat.activeTaskId) ? chat.activeTaskId : null,
      agentEventId: state.calendarEvents.some(e => e.id === chat.agentEventId) ? chat.agentEventId : null
    }));
    if (!state.chats.length) {
      const chat = create();
      chat.messages = cleanMessages(saved?.messages);
      chat.draft = text(saved?.draft);
      chat.taskContext = text(saved?.taskContext);
      chat.activeTaskId = state.activeTaskId;
      chat.agentEventId = state.agentEventId;
      state.chats.push(chat);
    }
    activate(state, state.chats.find(c => c.id === saved?.activeChatId) || state.chats[0]);
    return state;
  }

  function sync(state, reason) {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    if (!chat) return;
    chat.messages = state.messages;
    for (const field of contextFields) chat[field] = state[field];
    if (['message', 'draft', 'chat-action'].includes(reason)) chat.updatedAt = Date.now();
  }

  function start(state, mode = 'chat') {
    sync(state);
    // Reuse an untouched blank chat instead of filling history with empty rows.
    const blank = state.chats.find(c => !c.messages.length && !c.draft.trim());
    const chat = blank || create();
    Object.assign(chat, { mode, taskContext: '', activeTaskId: null, agentEventId: null });
    if (!blank) state.chats.push(chat);
    activate(state, chat);
    return chat;
  }

  function select(state, id) {
    const chat = state.chats.find(c => c.id === id);
    if (!chat) return false;
    sync(state);
    activate(state, chat);
    return true;
  }

  const fillerWords = new Set(('a an the my our your me myself please really actually basically just also ' +
    'some any very maybe probably currently already still only').split(' '));
  const wordSegmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

  function shortTopic(value, maxCharacters = 40, maxWords = 6) {
    // Whole words keep course names and Chinese compounds readable. Array.from
    // also avoids splitting an emoji/surrogate pair in the fallback path.
    const units = wordSegmenter ? [...wordSegmenter.segment(value)].map(s => s.segment) : value.split(/(\s+)/);
    let result = '', words = 0, truncated = false;
    for (const unit of units) {
      const nextWords = words + (/\p{L}|\p{N}/u.test(unit) ? 1 : 0);
      if (nextWords > maxWords || Array.from(result + unit).length > maxCharacters) { truncated = true; break; }
      result += unit; words = nextWords;
    }
    result = result.trim().replace(/[\s,:;·/–—-]+$/u, '');
    if (truncated) result = result.replace(/\s+(?:(?:to|for|in|on|of|with|and|or|about)\s*)+$/i, '');
    if (!result) result = Array.from(value).slice(0, maxCharacters).join('');
    return result.replace(/^\p{L}/u, letter => letter.toLocaleUpperCase());
  }

  function topicPhrase(value) {
    let phrase = value
      .replace(/https?:\/\/\S+|```[\s\S]*?```/gi, ' ')
      .replace(/[*_`#<>]/g, '')
      .replace(/\b(?:next|this)\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
      .replace(/\b(?:today|tonight|tomorrow|right now)\b/gi, '')
      .replace(/\b(?:\d+(?:\.\d+)?|one|two|three|half an?)\s*(?:minutes?|mins?|hours?|hrs?)\b/gi, '')
      .replace(/\b[\p{L}]+\b/gu, word => fillerWords.has(word.toLowerCase()) ? '' : word)
      .replace(/\s+/g, ' ').trim();
    // Remove conversational framing rather than simply clipping the sentence.
    // Repeat because openings can stack: "Hi, could you help me work on ...".
    const opening = /^(?:(?:hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\b[\s,!:.]*|(?:can|could|would|will) you\b\s*|(?:i|we)(?:['’]m|['’]re| am| are)?\b\s*|(?:want|need|would like|hope|trying|try|have|got|must|should)\b\s*(?:to\b\s*)?|(?:help|assist|support)\b\s*(?:with\b\s*)?|(?:get started|start|work|working|focus|focusing) on\b\s*|(?:to|with)\b\s*|go\s+(?=\w+ing\b))/i;
    for (let i = 0; i < 10; i++) {
      const next = phrase.replace(opening, '').trim();
      if (next === phrase) break;
      phrase = next;
    }
    phrase = phrase
      .replace(/^(?:been\s+)?(?:thinking|wondering) about\s+(?:how to\s+)?/i, '')
      .replace(/^(?:struggling|having trouble) with\s+|^how to\s+/i, '')
      .replace(/^compare\s+(?:(?:two|three|different|several)\s+)?(?:approaches|options|solutions|strategies)\s+(?:to|for)\s+(.+)$/i, '$1 comparison')
      .replace(/\s+(?:with|for)\s+(?:friends|family)\b.*$/i, '')
      .replace(/\s+(?:due|left|to do|to finish|as well)$/i, '')
      .replace(/^(?:(?:你好|您好)[，,！!\s]*|(?:我|我们)?(?:现在|今天)?(?:想要|想|需要|打算|希望|准备)|(?:可以|能不能|能否|请)?(?:你)?(?:帮我|帮助我|协助我)|请|一下)+/u, '')
      .replace(/(?:，|,)?(?:谢谢|可以吗|好吗|一下)[！!？?。\s]*$/u, '')
      .replace(/一下(?=\p{Script=Han})/gu, '')
      .trim();
    // A greeting, duration or the Quick Start seed is not the conversation topic.
    if (!phrase || /^(?:hi|hello|hey|thanks|ok(?:ay)?|yes|no|sure|help|help needed|you are doing well|lot on plate|plan (?:a )?focus session|focus session|study|studying|work|working|get started|getting started|你好|谢谢|好的|专注一下|开始专注|(?:我)?(?:只)?有\s*\d+\s*(?:分钟|小时))$/i.test(phrase)) return '';
    return phrase;
  }

  function messageTopic(value) {
    // Contrast/conjunction separates independent goals, e.g. hiking vs a paper.
    const parts = text(value).replace(/https?:\/\/\S+|```[\s\S]*?```/gi, ' ')
      .split(/\b(?:but|however|and (?=(?:i|we)\b))\b|但是|但我|不过/iu);
    const topics = parts.map(part => {
      const clauses = part.split(/[!?。！？\n;,，；]|\.(?=\s|$)|\b(?:because|so that)\b/iu);
      return clauses.map(topicPhrase).find(Boolean) || '';
    }).filter(Boolean);
    if (!topics.length) return '';
    const first = topics[0];
    const second = topics.find(topic => topic.toLowerCase() !== first.toLowerCase());
    if (second) return shortTopic(first, 18, 3) + ' · ' + shortTopic(second, 18, 3);
    const hasHan = /\p{Script=Han}/u.test(first);
    return shortTopic(first, hasHan ? 18 : 40, hasHan ? 10 : 6);
  }

  function title(chat) {
    // Derive from the earliest meaningful user topic: stable as a chat grows,
    // immediate for old saved chats, and no metadata requests or quota charges.
    for (const message of chat.messages) {
      if (message.role === 'assistant') continue;
      const topic = messageTopic(message.text);
      if (topic) return topic;
    }
    return messageTopic(chat.draft) || (chat.mode === 'focus' ? 'Focus session' : 'New chat');
  }

  return { restore, sync, start, select, title, activate };
});

