/* Purpose: all mock data of the demo build (persona, fake bCourses/Canvas API answers, fake Google Calendar events,
   focus history) and the app state for each recorded scene. Pure: no network, no storage, no DOM.
   Called by: frontend/demo/demo-mode.js (seeding, scenes), frontend/demo/demo-api.js (fake API answers),
   frontend/demo/demo-ui.js (Canvas import) and the Node tests in frontend/demo/test/.
   Calls: nothing.
   DEMO ONLY: this folder exists on the branch demo/video-2026-11-04 and is never merged into main.
   Why everything is relative to "now": the video can be recorded on any day and still shows "due tomorrow",
   "this week" and a calendar that is full around the moment of recording. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DemoData = factory();
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const VERSION = 5; // bump when the seed changes, so an installed demo app reseeds by itself
  const DAY = 86400000;

  const persona = { name: 'Maya Chen', firstName: 'Maya', email: 'maya.demo@berkeley.edu', school: 'UC Berkeley', canvasUrl: 'https://bcourses.berkeley.edu' };

  // ---------- local date helpers (wall time of the computer, like the calendar of the app) ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const wall = (d) => `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  function atDay(now, offsetDays, hhmm = '00:00') {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, h, m, 0, 0);
  }
  const plusDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dateKey(new Date(y, m - 1, d + n)); };
  const weekday = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay(); }; // 0 = Sunday
  const mondayOf = (now) => atDay(now, -((now.getDay() + 6) % 7));
  const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  // "tomorrow", "Friday", "next Tuesday": how a student says a due date.
  function dueLabel(now, dueWall) {
    const days = Math.round((Date.parse(dueWall.slice(0, 10) + 'T12:00:00Z') - Date.parse(dateKey(now) + 'T12:00:00Z')) / DAY);
    const name = new Date(dueWall.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    if (days <= 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 7) return name;
    return 'next ' + name;
  }

  // ---------- fake bCourses (Canvas LMS) ----------
  // Shapes follow the Canvas REST API (GET /api/v1/courses, GET /api/v1/courses/:id/assignments), cut to the fields we use.
  const canvasCourses = [
    { id: 1880, name: 'Introduction to Artificial Intelligence', course_code: 'COMPSCI 188', why: 'The class I want to work in' },
    { id: 1100, name: 'Principles and Techniques of Data Science', course_code: 'DATA C100', why: '' },
    { id: 1001, name: 'Introduction to Economics', course_code: 'ECON 1', why: '' },
    { id: 1835, name: 'Technology Entrepreneurship', course_code: 'ENGIN 183E', why: 'Our startup lives here' },
  ];
  // due: days from today plus a local time. minutes: what a student would estimate. steps: the small steps of the app.
  const canvasAssignments = [
    { id: 90001, course: 1880, name: 'Project 3: Reinforcement Learning', due: [2, '23:59'], points: 25, minutes: 240, steps: ['Read the project spec', 'Q1: Value iteration', 'Q2: Policies', 'Q3: Q-learning', 'Run the autograder'] },
    { id: 90002, course: 1100, name: 'Lab 9: Feature Engineering', due: [1, '23:59'], points: 10, minutes: 45, steps: ['Open the lab notebook', 'Finish part 1', 'Finish part 2', 'Submit to Gradescope'] },
    { id: 90003, course: 1001, name: 'Problem Set 5: Market Failures', due: [2, '17:00'], points: 20, minutes: 90, steps: ['Read chapter 10 notes', 'Questions 1-3', 'Questions 4-6', 'Upload the PDF'] },
    { id: 90004, course: 1835, name: 'Customer Discovery: 5 Interviews', due: [5, '09:00'], points: 15, minutes: 150, steps: ['Write 8 interview questions', 'Book 5 interviews', 'Run the interviews', 'Summarize the learnings'] },
    { id: 90005, course: 1880, name: 'Homework 6: MDPs', due: [5, '23:59'], points: 10, minutes: 75, steps: ['Read the questions', 'Solve the first half', 'Solve the second half', 'Submit'] },
    { id: 90006, course: 1100, name: 'Homework 5: Regression', due: [6, '23:59'], points: 20, minutes: 120, steps: ['Load the dataset', 'Fit the model', 'Answer the written questions', 'Submit'] },
    { id: 90007, course: 1001, name: 'Reading Quiz: Chapter 11', due: [7, '10:00'], points: 5, minutes: 30, steps: ['Read chapter 11', 'Take the quiz'] },
    { id: 90008, course: 1835, name: 'Pitch Deck Draft', due: [9, '17:00'], points: 20, minutes: 180, steps: ['Outline 10 slides', 'Draft the problem slide', 'Draft the demo slide', 'Share with the team'] },
  ];

  function canvasApi(path, now = new Date()) {
    const clean = String(path).replace(/^https?:\/\/[^/]+/, '').split('?')[0].replace(/\/+$/, '');
    if (clean === '/api/v1/users/self') return { id: 4242, name: persona.name, primary_email: persona.email };
    if (clean === '/api/v1/courses') return canvasCourses.map(({ id, name, course_code }) => ({ id, name, course_code, enrollment_term_id: 2268, workflow_state: 'available' }));
    const match = clean.match(/^\/api\/v1\/courses\/(\d+)\/assignments$/);
    if (match) {
      const courseId = Number(match[1]);
      if (!canvasCourses.some((c) => c.id === courseId)) return null;
      return canvasAssignments.filter((a) => a.course === courseId).map((a) => {
        const due = atDay(now, a.due[0], a.due[1]);
        return { id: a.id, course_id: courseId, name: a.name, due_at: due.toISOString(), points_possible: a.points, html_url: `${persona.canvasUrl}/courses/${courseId}/assignments/${a.id}`, submission_types: ['online_upload'] };
      });
    }
    return null;
  }

  // Canvas answers -> courses, tasks and deadlines of the app (the same code runs for the live import and for the seeds).
  function canvasToApp(courses, assignmentsByCourse) {
    const out = { courses: [], tasks: [], deadlines: [] };
    for (const course of courses) {
      const known = canvasCourses.find((c) => c.id === course.id);
      out.courses.push({ id: 'canvas-' + course.id, name: course.course_code, why: known?.why || '', source: 'canvas' });
      for (const a of assignmentsByCourse[course.id] || []) {
        const extra = canvasAssignments.find((x) => x.id === a.id) || {};
        const taskId = 'canvas-task-' + a.id;
        out.tasks.push({ id: taskId, title: a.name, done: false, course: course.course_code, source: 'canvas:' + a.id, why: '', ...(extra.minutes ? { estimatedMinutes: extra.minutes } : {}), steps: (extra.steps || []).map((text, i) => ({ id: `${taskId}-s${i + 1}`, text, done: false })) });
        if (a.due_at) {
          const due = wall(new Date(a.due_at));
          out.deadlines.push({ id: 'canvas-deadline-' + a.id, title: a.name, kind: 'deadline', start: due, end: due, allDay: false, taskId, notes: 'From bCourses: ' + a.html_url });
        }
      }
    }
    return out;
  }

  function canvasImport(now = new Date()) {
    const courses = canvasApi('/api/v1/courses', now);
    const byCourse = {};
    courses.forEach((c) => { byCourse[c.id] = canvasApi(`/api/v1/courses/${c.id}/assignments`, now); });
    return canvasToApp(courses, byCourse);
  }

  // ---------- fake Google Calendar ----------
  const googleCalendars = [
    { id: 'demo-school', name: 'Berkeley classes', selected: true },
    { id: 'demo-personal', name: 'Personal', selected: true },
    { id: 'demo-clubs', name: 'Clubs & events', selected: true },
    { id: 'demo-holidays', name: 'US holidays', selected: false },
  ];
  // Weekly pattern, day 1 = Monday ... 7 = Sunday.
  const weekly = [
    { cal: 'demo-school', days: [1, 3, 5], from: '11:00', to: '12:00', title: 'DATA C100 Lecture', notes: 'Wheeler Hall 150' },
    { cal: 'demo-school', days: [2, 4], from: '12:30', to: '14:00', title: 'COMPSCI 188 Lecture', notes: 'Dwinelle Hall 155' },
    { cal: 'demo-school', days: [1, 3], from: '14:00', to: '15:00', title: 'ECON 1 Lecture', notes: 'Valley Life Sciences 2050' },
    { cal: 'demo-school', days: [5], from: '13:00', to: '15:00', title: 'ENGIN 183E Seminar', notes: 'Sutardja Dai Hall' },
    { cal: 'demo-school', days: [4], from: '10:00', to: '11:00', title: 'DATA C100 Lab', notes: 'Soda Hall 275' },
    { cal: 'demo-school', days: [3], from: '17:00', to: '18:00', title: 'COMPSCI 188 Discussion', notes: 'Cory Hall 241' },
    { cal: 'demo-personal', days: [1, 3, 5], from: '07:30', to: '08:15', title: 'Gym', notes: 'RSF' },
    { cal: 'demo-personal', days: [4], from: '19:00', to: '20:30', title: 'Dinner with roommates', notes: '' },
    { cal: 'demo-personal', days: [7], from: '17:00', to: '17:45', title: 'Call with family', notes: '' },
    { cal: 'demo-clubs', days: [2], from: '18:00', to: '19:30', title: 'Startup club meeting', notes: 'Haas, room F320' },
    { cal: 'demo-clubs', days: [6], from: '10:00', to: '12:00', title: 'Farmers market with Alex', notes: '' },
  ];

  function googleEvents(fromKey, toKey, selected = googleCalendars.filter((c) => c.selected).map((c) => c.id)) {
    const events = [];
    for (let key = fromKey; key < toKey; key = plusDays(key, 1)) {
      const dow = ((weekday(key) + 6) % 7) + 1;
      weekly.forEach((rule, i) => {
        if (!rule.days.includes(dow) || !selected.includes(rule.cal)) return;
        events.push({ id: `${key}-${i}`, calendarId: rule.cal, title: rule.title, start: `${key}T${rule.from}`, end: `${key}T${rule.to}`, allDay: false, notes: rule.notes });
      });
    }
    return events;
  }

  // ---------- free time (the chat plans into gaps of the real-looking day) ----------
  function busyOn(key, planEvents = []) {
    const list = googleEvents(key, plusDays(key, 1)).map((e) => [minutesOf(e.start.slice(11)), minutesOf(e.end.slice(11))]);
    planEvents.filter((e) => e.kind === 'plan' && e.start.slice(0, 10) === key).forEach((e) => list.push([minutesOf(e.start.slice(11)), minutesOf(e.end.slice(11))]));
    return list;
  }

  // First slot of `minutes` today after `now` (rounded up to :00 or :30), else from 9:00 on the next days. Ends by 22:00.
  function freeSlot(now, minutes, planEvents = [], notBefore = null) {
    for (let offset = 0; offset < 7; offset++) {
      const key = dateKey(atDay(now, offset));
      const busy = busyOn(key, planEvents);
      let start = offset === 0 ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 10) / 30) * 30 : 9 * 60;
      if (notBefore && offset === 0) start = Math.max(start, minutesOf(notBefore));
      for (; start + minutes <= 22 * 60; start += 30) {
        const end = start + minutes;
        if (!busy.some(([a, b]) => start < b && end > a)) {
          const at = (m) => `${key}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
          return { start: at(start), end: at(end) };
        }
      }
    }
    return null;
  }

  // ---------- focus history for the Data page (deterministic, no Math.random) ----------
  const historyPlan = [ // days ago, start time, minutes, task
    [13, '16:00', 35, 'Homework 4: Search'], [12, '15:30', 45, 'Lab 7: Visualization'], [12, '20:00', 25, 'Reading Quiz: Chapter 9'],
    [11, '14:00', 50, 'Homework 4: Search'], [10, '10:30', 30, 'Market sizing for the pitch'], [9, '16:30', 40, 'Lab 8: Modeling'],
    [7, '15:00', 55, 'Homework 5: Games'], [6, '13:30', 25, 'Problem Set 4: Elasticity'], [6, '19:30', 45, 'Homework 5: Games'],
    [5, '11:00', 35, 'Lab 8: Modeling'], [4, '16:00', 50, 'Project 2: Multi-Agent Search'], [3, '15:30', 45, 'Project 2: Multi-Agent Search'],
    [3, '20:30', 25, 'Interview questions'], [2, '14:30', 60, 'Project 2: Multi-Agent Search'], [1, '16:00', 40, 'Problem Set 5: Market Failures'],
    [1, '20:00', 30, 'Lab 9: Feature Engineering'], [0, '09:00', 25, 'Lab 9: Feature Engineering'],
  ];
  function sessions(now) {
    return historyPlan.map(([ago, from, minutes, title], i) => {
      const startedAt = atDay(now, -ago, from).getTime();
      if (startedAt + minutes * 60000 > now.getTime()) return null; // never a session "in the future" when recording early in the day
      const steps = i % 3 === 0 ? [{ id: `hist-${i}-1`, text: 'Do the first small step' }, { id: `hist-${i}-2`, text: 'Check your work' }] : [{ id: `hist-${i}-1`, text: 'Do the first small step' }];
      return { id: 'demo-session-' + i, taskId: null, taskTitle: title, workflowId: null, workflowSnapshot: null, startedAt, finishedAt: startedAt + minutes * 60000, focusMs: minutes * 60000, steps, stepTotal: 3, taskDone: i % 4 === 0, helpful: i % 5 === 0 ? true : null };
    }).filter(Boolean);
  }
  function usage(now) {
    const days = {};
    for (let ago = 13; ago >= 0; ago--) {
      const key = dateKey(atDay(now, -ago));
      const count = historyPlan.filter((x) => x[0] === ago).length;
      days[key] = { ms: (count * 9 + 6 + (ago % 3) * 4) * 60000, visits: count * 2 + 1 + (ago % 2) };
    }
    return days;
  }

  // ---------- older chats in the history list ----------
  function oldChats(now) {
    const t = (ago, h) => atDay(now, -ago, h).getTime();
    const chat = (id, ago, h, pairs) => ({ id, createdAt: t(ago, h), updatedAt: t(ago, h) + 6 * 60000, mode: 'chat', draft: '', taskContext: '', activeTaskId: null, agentEventId: null,
      messages: pairs.map(([role, text], i) => ({ id: `${id}-m${i}`, role, text, taskId: null, eventId: null, contextId: null, proposal: null, actions: [] })) });
    return [
      chat('demo-chat-midterm', 1, '21:10', [
        ['user', 'Midterm prep plan for ECON 1'],
        ['assistant', 'Let us split it into three short sessions: Monday review the slides, Tuesday do the practice exam, Wednesday go over the mistakes. 40 minutes each.'],
      ]),
      chat('demo-chat-interviews', 4, '18:40', [
        ['user', 'How do I start the customer interviews for 183E?'],
        ['assistant', 'Start tiny: write three questions about the last time the problem happened. Then message two classmates today. I added it to your to-dos.'],
      ]),
    ];
  }

  // ---------- the app state for each scene ----------
  // 1 = Canvas not connected yet (live import), 2 = synced, fresh chat, 3 = plan made, focus block now,
  // 4 = focus session running, 5 = like 3 plus one more finished session (Data page).
  const SCENES = {
    1: { page: '#courses', title: 'Your semester, synced' },
    2: { page: '#home', title: 'From overwhelm to a plan' },
    3: { page: '#calendar', title: 'Distractions, blocked' },
    4: { page: '#focus', title: 'When you are stuck, Concentr8 calls' },
    5: { page: '#data', title: 'Progress you can see' },
  };
  const BLOCK_LIST = ['YouTube', 'Instagram', 'TikTok', 'Reddit', 'Netflix'];
  const FOCUS_TASK = 'canvas-task-90001'; // CS 188 Project 3
  const FOCUS_BLOCK_ID = 'demo-plan-project3'; // the block "now" of scenes 3 to 5

  function personalTasks() {
    return [
      { id: 'demo-personal-advising', title: 'Book an advising appointment', done: false, course: '', source: '', why: '', estimatedMinutes: 10, steps: [{ id: 'adv-1', text: 'Open the advising page', done: false }, { id: 'adv-2', text: 'Pick a time', done: false }] },
      { id: 'demo-personal-recruiter', title: 'Reply to the internship recruiter', done: false, course: '', source: '', why: '', estimatedMinutes: 15, steps: [{ id: 'rec-1', text: 'Read the email again', done: false }, { id: 'rec-2', text: 'Write three sentences', done: false }] },
    ];
  }

  // The plan block the chat makes in scene 2, placed around "now" for scenes 3 to 5.
  function focusBlock(now) {
    const start = atDay(now, 0, `${pad(now.getHours())}:${now.getMinutes() < 30 ? '00' : '30'}`);
    const end = new Date(start.getTime() + 50 * 60000); // 50 min: the timer reads 49:59, not 1:29:59
    return { id: FOCUS_BLOCK_ID, title: 'Project 3: Reinforcement Learning', kind: 'plan', start: wall(start), end: wall(end), allDay: false, taskId: FOCUS_TASK, notes: 'Goal: Q1 value iteration passes the autograder.' };
  }

  function pastBlocks(now) {
    const mon = mondayOf(now);
    const blocks = [];
    const add = (offset, from, to, title, taskId) => { const s = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + offset, ...from.split(':').map(Number)); const e = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + offset, ...to.split(':').map(Number)); if (e < now) blocks.push({ id: `demo-plan-past-${offset}-${from}`, title, kind: 'plan', start: wall(s), end: wall(e), allDay: false, taskId, notes: '' }); };
    add(0, '15:30', '16:30', 'Problem Set 5: Market Failures', 'canvas-task-90003');
    add(1, '09:00', '10:00', 'Lab 9: Feature Engineering', 'canvas-task-90002');
    add(1, '15:00', '16:30', 'Project 3: Reinforcement Learning', FOCUS_TASK);
    return blocks;
  }

  function state(scene = 1, now = new Date()) {
    const synced = scene >= 2;
    const canvas = synced ? canvasImport(now) : { courses: [], tasks: [], deadlines: [] };
    const tasks = [...canvas.tasks, ...personalTasks()];
    if (synced) { // a little progress, so the lists do not look brand new
      const lab = tasks.find((t) => t.id === 'canvas-task-90002'); lab.steps[0].done = true;
      const p3 = tasks.find((t) => t.id === FOCUS_TASK); p3.steps[0].done = true;
    }
    const calendarEvents = [...canvas.deadlines, ...(synced ? pastBlocks(now) : [])];
    if (scene >= 3) calendarEvents.push(focusBlock(now));
    const history = sessions(now);
    let activeSession = null;
    if (scene === 4) {
      const started = now.getTime() - 6 * 60000;
      activeSession = { id: 'demo-active-session', timerOnly: false, taskId: FOCUS_TASK, taskTitle: 'Project 3: Reinforcement Learning', eventId: 'demo-plan-project3', workflowId: null, workflowSnapshot: null,
        phases: [{ id: 'demo-phase-focus', kind: 'focus', title: 'Focus', seconds: 50 * 60, tools: ['timer', 'block'] }], index: 0, status: 'running', startedAt: started, phaseStartedAt: started, phaseElapsedMs: 0, focusMs: 0,
        initialDone: [`${FOCUS_TASK}-s1`], initialTaskDone: false, soundOff: false, origin: 'Calendar', originPath: '' };
    }
    if (scene === 5) {
      const s = now.getTime() - 70 * 60000;
      history.push({ id: 'demo-session-today', taskId: FOCUS_TASK, taskTitle: 'Project 3: Reinforcement Learning', workflowId: null, workflowSnapshot: null, startedAt: s, finishedAt: s + 52 * 60000, focusMs: 52 * 60000, steps: [{ id: `${FOCUS_TASK}-s2`, text: 'Q1: Value iteration' }], stepTotal: 5, taskDone: false, helpful: true });
      tasks.find((t) => t.id === FOCUS_TASK).steps[1].done = true;
    }
    const current = { id: 'demo-chat-now', createdAt: now.getTime(), updatedAt: now.getTime(), mode: 'chat', draft: '', taskContext: '', activeTaskId: null, agentEventId: null, messages: [] };
    return {
      version: 2, draft: '', collapsed: false, messages: [], agentEventId: null, activeTaskId: scene === 4 ? FOCUS_TASK : null, taskContext: '',
      courses: canvas.courses, workflows: [], sessions: history, activeSession,
      tools: { favorites: ['timer', 'block', 'music'], selected: [], customSelection: false, blockedApps: BLOCK_LIST.slice(), sound: 'brown' },
      wellness: { saved: [] }, social: { messages: {} }, usage: { days: usage(now) },
      profile: { name: persona.firstName, email: persona.email, avatar: '' }, settings: { focusMinutes: 50, autoAdvance: true },
      canvas: { schoolUrl: synced ? persona.canvasUrl : '', imported: canvas.tasks.map((t) => t.source), syncedAt: synced ? now.getTime() - 4 * 60000 : null },
      calendarEvents, tasks,
      chats: [...oldChats(now), current], activeChatId: current.id,
    };
  }

  return { VERSION, persona, SCENES, BLOCK_LIST, FOCUS_TASK, FOCUS_BLOCK_ID, canvasCourses, canvasAssignments, canvasApi, canvasToApp, canvasImport,
    googleCalendars, googleEvents, freeSlot, sessions, state, dueLabel, dateKey, wall, atDay, plusDays };
});
