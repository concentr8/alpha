/* Purpose: the scripted "AI" of the demo build. It answers the chat like the real server (/api/chat): a short reply plus
   at most two actions of the same shapes (add_todo, suggest_calendar, open_tool). Deterministic, so every take of the
   video looks the same, and tolerant, so other wording still gets a sensible answer.
   Called by: frontend/demo/demo-api.js (fake /api/chat and /api/chat/guest) and frontend/demo/test/demo-chat.test.js.
   Calls: nothing (the caller hands in the tasks, deadlines and a free-slot finder).
   DEMO ONLY: never merged into main. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DemoChat = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  // The server appends this planning instruction to the last message of a Quick Start chat (concentr8-server.js).
  const FOCUS_MARK = '\n\nQuick Start focus planning:';
  const stripInstruction = (text) => { const at = String(text || '').indexOf(FOCUS_MARK); return (at === -1 ? String(text || '') : String(text).slice(0, at)).trim(); };

  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, an: 1, a: 1 };

  // "about two hours", "90 minutes", "an hour and a half", "1.5h" -> minutes, or null.
  function minutesIn(text) {
    const t = text.toLowerCase();
    if (/hour and a half|1\.5 ?h|one and a half hours?/.test(t)) return 90;
    if (/half an hour|30 ?min/.test(t)) return 30;
    const h = t.match(/(\d+(?:\.\d+)?|one|two|three|four|five|six|an|a)\s*(?:hours?|hrs?|h\b)/);
    const m = t.match(/(\d+)\s*(?:minutes?|mins?|m\b)/);
    let total = 0;
    if (h) total += Math.round((Number(h[1]) || WORDS[h[1]] || 0) * 60);
    if (m) total += Number(m[1]);
    return total > 0 ? Math.min(total, 480) : null;
  }

  // Which open task does the student mean? Course codes and keywords, like a person would.
  const HINTS = [
    [/\b(cs ?188|compsci ?188|project 3|reinforcement|rl project|pacman|ai project)\b/i, 'Project 3: Reinforcement Learning'],
    [/\b(lab ?9|data ?c?100 lab|feature engineering|the lab)\b/i, 'Lab 9: Feature Engineering'],
    [/\b(econ|problem set|pset|market failure)/i, 'Problem Set 5: Market Failures'],
    [/\b(interview|customer discovery|183e)\b/i, 'Customer Discovery: 5 Interviews'],
    [/\b(pitch|deck)\b/i, 'Pitch Deck Draft'],
    [/\b(homework 6|hw ?6|mdp)/i, 'Homework 6: MDPs'],
    [/\b(regression|homework 5|hw ?5)\b/i, 'Homework 5: Regression'],
    [/\b(recruiter|internship)\b/i, 'Reply to the internship recruiter'],
    [/\b(advising|advisor)\b/i, 'Book an advising appointment'],
  ];
  function findTask(text, tasks) {
    for (const [re, title] of HINTS) if (re.test(text)) { const t = tasks.find((x) => x.title === title); if (t) return t; }
    const lower = text.toLowerCase();
    return tasks.find((t) => t.title.length > 4 && lower.includes(t.title.toLowerCase())) || null;
  }

  const lastAssistant = (messages) => [...messages].reverse().find((m) => m.role === 'assistant')?.text || '';
  const time12 = (wall) => { const [h, m] = wall.slice(11, 16).split(':').map(Number); const ampm = h >= 12 ? 'PM' : 'AM'; return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`; };
  const isToday = (wall, today) => wall.slice(0, 10) === today;
  const when = (slot, today) => `${isToday(slot.start, today) ? 'today' : 'tomorrow'} ${time12(slot.start)}–${time12(slot.end)}`;

  // ---------- the scripted conversations ----------
  // ctx: { tasks: [{id,title,course,due}], today: 'YYYY-MM-DD', slot(minutes, notBefore?) -> {start,end}|null, dueLabel(wall) }
  function focusChat(userTexts, ctx) {
    if (userTexts.length <= 1) {
      return { reply: "Let's set up one focus session. What do you want to get done, and how much time do you have right now?", actions: [] };
    }
    const text = userTexts[userTexts.length - 1];
    const task = findTask(text, ctx.tasks) || findTask(userTexts.join(' '), ctx.tasks) || ctx.tasks.find((t) => t.due) || ctx.tasks[0];
    const minutes = Math.min(minutesIn(text) || 50, 90);
    const due = task?.due ? ` It's due ${ctx.dueLabel(task.due)}, so this is the right one.` : '';
    if (task && /project 3/i.test(task.title)) {
      return { reply: `Good pick.${due}\nLet's make it one clear outcome: Q1, value iteration, passing the autograder.\n1) Re-read the Q1 part of the spec (5 min)\n2) Write your first version (${Math.max(15, minutes - 15)} min)\n3) Run the Q1 tests and fix one thing (10 min)\nI'll keep YouTube, Instagram and TikTok closed while you work. Press Start focus session when you're ready.`, actions: [{ type: 'open_tool', tool: 'block' }], selectTaskId: task.id, minutes };
    }
    const name = task ? task.title : 'your task';
    return { reply: `Okay: ${name}.${due}\nLet's aim for one small, finished piece in ${minutes} minutes.\n1) Open it and read what is asked (5 min)\n2) Do the first part (${Math.max(10, minutes - 15)} min)\n3) Check it and write down the next step (10 min)\nPress Start focus session when you're ready. Distracting sites stay closed.`, actions: [{ type: 'open_tool', tool: 'block' }], selectTaskId: task?.id || null, minutes };
  }

  function planChat(userTexts, messages, ctx) {
    const text = userTexts[userTexts.length - 1];
    const lower = text.toLowerCase();
    const asked = lastAssistant(messages);
    const soonest = ctx.tasks.filter((t) => t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);

    // A specific feeling or request comes first, whatever the step of the plan.
    if (/\b(stuck|can'?t start|cannot start|blank|frozen)\b/.test(lower)) {
      return { reply: "That happens, and it's not a willpower problem. Start a focus session and press \"I'm stuck\". I'll call your phone and we'll find a first step that takes five minutes.", actions: [{ type: 'open_tool', tool: 'timer' }] };
    }
    if (/\b(stress|stressed|anxious|overwhelmed|panic|tired|exhausted)\b/.test(lower) && !/where to start|so much/.test(lower)) {
      return { reply: "Let's slow down for one minute first. A short breathing exercise helps your brain switch from panic to planning. Then tell me what's due first.", actions: [{ type: 'open_tool', tool: 'breathing' }] };
    }
    // Matched on the original text, so "my TA" keeps its capitals in the to-do title.
    const todo = text.trim().match(/\b(?:i need to|i have to|remind me to|add)\s+(.+?)(?:\s+by\s+(\w+))?[.!]?$/i);
    if (todo && !/so much|everything|where to start/.test(lower) && todo[1].length < 90) {
      const title = todo[1].replace(/\b(to my (to-?do|list))\b/i, '').trim().replace(/^./, (c) => c.toUpperCase());
      const minutes = minutesIn(text) || 15;
      return { reply: `Added "${title}" to your to-dos (${minutes} min). Want me to find a time for it?`, actions: [{ type: 'add_todo', title, minutes }] };
    }

    // Step 2 of the plan: the student says how much time they have.
    const minutes = minutesIn(text);
    if (minutes && /how much time/i.test(asked)) {
      const main = ctx.tasks.find((t) => /project 3/i.test(t.title)) || soonest[0];
      const second = ctx.tasks.find((t) => /lab 9/i.test(t.title)) || soonest.find((t) => t !== main);
      const mainMinutes = Math.min(90, Math.max(30, minutes - 30));
      const first = ctx.slot(mainMinutes);
      const later = second && first ? ctx.slot(30, first.end.slice(11, 16)) : null;
      const actions = [];
      if (first && main) actions.push({ type: 'suggest_calendar', title: main.title, start: first.start, end: first.end });
      if (later && second) actions.push({ type: 'suggest_calendar', title: second.title, start: later.start, end: later.end });
      const p1 = main && first ? `First, ${main.title} — ${mainMinutes} minutes, ${when(first, ctx.today)}. Goal: get Q1 working. It's worth the most and it's due ${ctx.dueLabel(main.due)}.` : '';
      const p2 = second && later ? `\nThen ${second.title} — 30 minutes, ${when(later, ctx.today)}. It's due ${ctx.dueLabel(second.due)} and it's short.` : '';
      const p3 = '\nThe problem set can wait until tomorrow. I found free slots between your classes. Add them to your calendar?';
      return { reply: `Here's a plan that fits your ${minutes >= 60 ? (minutes / 60).toString().replace('.5', '½') + (minutes === 60 ? ' hour' : ' hours') : minutes + ' minutes'}.\n${p1}${p2}${p3}`, actions };
    }

    // Step 3: the student agrees.
    if (/^(yes|yeah|yep|ok|okay|sure|sounds good|perfect|great|let'?s|do it|go)\b/.test(lower) || /sounds good|let'?s (go|start|do)/.test(lower)) {
      return { reply: "Done. When it's time, open the block in your calendar and press Start focus. I'll block YouTube, Instagram and TikTok until you're finished, and if you get stuck, I'll call you.", actions: [{ type: 'open_tool', tool: 'block' }] };
    }

    // Step 1: the brain dump.
    if (/so much|overwhelm|where to start|don'?t know|too much|this week|due|deadline|plan|behind|help/.test(lower) || userTexts.length === 1) {
      const list = soonest.map((t) => `• ${t.title} (${t.course}) — due ${ctx.dueLabel(t.due)}`).join('\n');
      return { reply: `That's a lot at once — let's make it smaller. These are due first:\n${list}\nHow much time do you have today?`, actions: [] };
    }
    const task = findTask(text, ctx.tasks);
    if (task) {
      const slot = ctx.slot(task.estimatedMinutes ? Math.min(task.estimatedMinutes, 90) : 45);
      return { reply: `${task.title}${task.due ? `, due ${ctx.dueLabel(task.due)}` : ''}. The first small step: ${task.steps?.find((s) => !s.done)?.text || 'open it and read what is asked'}. I found time ${slot ? when(slot, ctx.today) : 'later today'}.`, actions: slot ? [{ type: 'suggest_calendar', title: task.title, start: slot.start, end: slot.end }] : [] };
    }
    return { reply: "Got it. What's the one thing you want to finish today? Tell me and I'll split it into small steps and find a time for it.", actions: [] };
  }

  // body: what the app sends to /api/chat ({ messages: [{role,text}], tasks: [titles], today }). ctx: see above.
  function answer(body, ctx) {
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const focus = messages.some((m) => m.role === 'user' && String(m.text).includes(FOCUS_MARK)) || /^help me plan a focus session/i.test(stripInstruction(messages.find((m) => m.role === 'user')?.text));
    const userTexts = messages.filter((m) => m.role === 'user').map((m) => stripInstruction(m.text)).filter(Boolean);
    if (!userTexts.length) return { reply: 'Tell me what is on your plate and I will help you plan it.', actions: [] };
    const out = focus ? focusChat(userTexts, ctx) : planChat(userTexts, messages, ctx);
    return { ...out, actions: (out.actions || []).slice(0, 2) }; // the real server sends at most two
  }

  // What the student said on the phone ("at three thirty", "4 pm", "in 10 minutes", "now") -> a Date today, or null.
  const SPOKEN = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, noon: 12 };
  const SPOKEN_MIN = { 'o\'clock': 0, fifteen: 15, thirty: 30, 'forty five': 45, 'forty-five': 45, half: 30 };
  function parseTime(text, now = new Date()) {
    const t = String(text || '').toLowerCase().replace(/[!?,]/g, ' ').trim();
    if (!t) return null;
    const at = (h, m) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    if (/\b(now|right now|right away|immediately|asap)\b/.test(t)) return new Date(Math.ceil(now.getTime() / 300000) * 300000);
    const rel = t.match(/\bin (\d+|a|an|half an?|one|two|five|ten|fifteen|twenty|thirty) ?(minutes?|mins?|hours?)\b/);
    if (rel) {
      const n = { a: 1, an: 1, one: 1, two: 2, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30 }[rel[1]] ?? (rel[1].startsWith('half') ? 0.5 : Number(rel[1]));
      return new Date(now.getTime() + n * (rel[2].startsWith('h') ? 3600000 : 60000));
    }
    let h = null, m = 0;
    const digits = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/);
    const words = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon)\b(?:\s+(o'clock|fifteen|thirty|forty[ -]five))?/);
    const half = t.match(/\bhalf past (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
    let suffix = '';
    if (digits) { h = Number(digits[1]); m = digits[2] ? Number(digits[2]) : 0; suffix = digits[3] || ''; }
    else if (half) { h = SPOKEN[half[1]]; m = 30; }
    else if (words) { h = SPOKEN[words[1]]; m = words[2] ? SPOKEN_MIN[words[2]] : 0; }
    if (h === null || h > 23 || m > 59) return null;
    if (!suffix) suffix = /\b(p\.?m|pm|afternoon|evening|tonight)\b/.test(t) ? 'pm' : /\b(a\.?m|am|morning)\b/.test(t) ? 'am' : '';
    if (/^p/.test(suffix) && h < 12) h += 12;
    if (/^a/.test(suffix) && h === 12) h = 0;
    // No am/pm said: a student planning "at four" in the afternoon means 16:00, never 4 in the morning.
    if (!suffix && h < 12 && (h < 8 || at(h, m) < now)) h += 12;
    const result = at(h % 24, m);
    return result;
  }

  return { answer, minutesIn, findTask, stripInstruction, time12, parseTime };
});
