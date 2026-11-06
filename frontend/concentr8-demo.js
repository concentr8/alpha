/* AI-GENERATED: no wireframe needed, this adds no visible control (plan: docs/plans/demo-without-google.md, ADR 0042).
   Purpose: demo mode. A link with ?demo (or the desktop app started with --demo) skips the Google sign-in, and the chat
   answers "I have three assignments due, where should I start" with a fixed, always working answer: three to-dos, each
   broken into small steps. Normal students never see this: without ?demo nothing here is active.
   Called by: frontend/index.html (script tag, before concentr8-server.js), concentr8-server.js (reply), concentr8-signin.js
   (isDemo) and frontend/test/demo.test.js.
   Calls: nothing. Needs no server, no Claude key and no account. */
(function (root, factory) {
  const demo = factory();
  if (typeof module === 'object' && module.exports) module.exports = demo;
  if (root && root.location) root.Concentr8Demo = demo.create(root.location.search, root.sessionStorage);
})(typeof window === 'undefined' ? null : window, function () {
  const KEY = 'concentr8-demo-v1';
  // Why also sessionStorage: sign-in and reloads drop the ?demo from the address, the tab must stay a demo tab.
  const remember = (storage) => { try { storage.setItem(KEY, '1'); } catch (_) { /* then only the address counts */ } };
  const remembered = (storage) => { try { return storage.getItem(KEY) === '1'; } catch (_) { return false; } };

  const ASKS_WHERE_TO_START = /(\b3\b|three).{0,30}(assignment|homework|deadline|due)|where (should|do|to) i (start|begin)/i;

  // Dates are given in days from today, so the demo always looks current.
  const addDays = (day, n) => {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const TODOS = [
    { title: 'Computer Vision Project: Object Detection', course: 'COMPSCI 188', minutes: 120, in: 3, steps: [
      'Open the project description and list its three requirements',
      'Run the starter code once to see it work',
      'Train a first detector for ten minutes',
      'Write two sentences on what worked for the report'] },
    { title: 'Microeconomics Homework 2', course: 'ECON 1', minutes: 60, in: 5, steps: [
      'Open the homework and read all questions once',
      'Solve the question you find easiest',
      'Do the remaining questions',
      'Check your answers against the lecture notes'] },
    { title: 'Rhetoric Essay 2: Persuasive Writing', course: 'RHETOR 10', minutes: 90, in: 7, steps: [
      'Read the essay prompt',
      'Write your main claim in one sentence',
      'List three reasons that support it',
      'Write the first paragraph'] },
  ];

  const REPLY = 'Start with the Computer Vision project: it is due first and the biggest. Okay, so these are your to-dos. '
    + 'I added them and broke each one into small steps. Your first step is to open the project description.';

  function create(search, storage) {
    const active = /[?&]demo(=|&|$)/.test(search || '') || remembered(storage);
    if (active) remember(storage);
    // reply: the fixed answer when the student's last message asks where to start, else null (the normal chat answers).
    function reply(messages, today) {
      if (!active) return null;
      const last = [...messages].reverse().find((m) => m.role === 'user');
      if (!last || !ASKS_WHERE_TO_START.test(last.text)) return null;
      const actions = TODOS.map((t) => ({
        type: 'add_todo', title: t.title, course: t.course, minutes: t.minutes, due: addDays(today, t.in), steps: t.steps,
      }));
      return { reply: REPLY, actions };
    }
    return { isDemo: () => active, reply };
  }

  return { create, TODOS };
});
