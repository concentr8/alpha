/* AI-GENERATED: no wireframe needed, this adds no visible control (plan: docs/plans/todos-on-calendar.md, ADR 0041).
   Purpose: gives every new to-do a block in the first free slot of the student's calendar, with or without Google Calendar.
   Called by frontend/index.html (script tag, after concentr8-google-calendar.js) and frontend/test/task-placement.test.js.
   Calls window.Articul8 (saveEvent, deleteEvent, change), CalendarTools.findFreeSlot and Concentr8GoogleCalendar.busyEvents. */
(function (root, factory) {
  const placement = factory();
  if (typeof module === 'object' && module.exports) module.exports = placement;
  if (root && root.Articul8 && root.CalendarTools) placement.start({
    store: root.Articul8,
    tools: root.CalendarTools,
    busyEvents: () => root.Concentr8GoogleCalendar.busyEvents(),
    storage: root.localStorage,
    events: root,
  });
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const KEY = 'concentr8-task-blocks-v1'; // task id -> id of its block, or null when it got none. A listed task is never placed again.
  const MAX_MINUTES = 780; // the longest block findFreeSlot accepts: 08:00 to 21:00
  const RETRY_MS = 60000; // why: without this, every key press would ask the server again while Google is unreachable

  function minutesFor(task, focusMinutes) {
    const wanted = Math.round(Number(task.estimatedMinutes)) || Math.round(Number(focusMinutes)) || 25;
    return Math.min(wanted, MAX_MINUTES);
  }

  // Why the plan test: a calendar event made by hand or from the chat creates its own task, which already has its time.
  function needsBlock(task, events, handled) {
    return !task.done && !(task.id in handled) && !events.some(event => event.taskId === task.id && event.kind === 'plan');
  }

  // The moment the block must end by, or null. An all-day deadline leaves the whole day.
  function deadlineFor(task, events) {
    const times = events.filter(event => event.taskId === task.id && event.kind === 'deadline')
      .map(event => (event.allDay ? event.start.slice(0, 10) + 'T23:59' : event.start)).sort();
    return times[0] || null;
  }

  // findFreeSlot gives the earliest slot, so when that one ends after the deadline, no slot can work.
  // Why the task's own events are left out: an all-day deadline would otherwise block the very day the work is due.
  function slotFor(task, events, focusMinutes, now, findFreeSlot) {
    const slot = findFreeSlot(events.filter(event => event.taskId !== task.id), minutesFor(task, focusMinutes), now);
    const deadline = deadlineFor(task, events);
    return slot && (!deadline || slot.end <= deadline) ? slot : null;
  }

  // Blocks still ahead of a finished to-do. Only blocks this file made: a block the student planned stays theirs.
  function finishedBlocks(tasks, events, handled, now) {
    return events.filter(event => event.kind === 'plan' && event.start > now && handled[event.taskId] === event.id
      && tasks.some(task => task.id === event.taskId && task.done)).map(event => event.id);
  }

  function wallNow(tools, date = new Date()) {
    const rounded = date.getSeconds() ? new Date(date.getTime() + 60000) : date;
    return `${tools.localDate(rounded)}T${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
  }

  function start({ store, tools, busyEvents, storage, events, clock = () => new Date(), later = setTimeout }) {
    let memory = null; // used when the browser refuses storage
    let running = false, again = false, waitUntil = 0;

    function load() {
      try { const saved = JSON.parse(storage.getItem(KEY)); if (saved) return saved; } catch (_) { /* the memory copy below */ }
      return memory;
    }
    function remember(handled) {
      memory = handled;
      try { storage.setItem(KEY, JSON.stringify(handled)); } catch (_) { /* kept in memory until the page closes */ }
    }
    // Why: to-dos that were there before must not fill the week at once, also after a reset or a change in another tab.
    function markExisting() {
      const handled = { ...(load() || {}) };
      store.state.tasks.forEach(task => { if (!(task.id in handled)) handled[task.id] = null; });
      remember(handled);
    }

    function place(task, busy, handled) {
      const slot = slotFor(task, [...store.state.calendarEvents, ...busy], store.state.settings?.focusMinutes, wallNow(tools, clock()), tools.findFreeSlot);
      const activeTaskId = store.state.activeTaskId;
      let eventId = null;
      if (slot) {
        try { eventId = store.saveEvent({ title: task.title, kind: 'plan', start: slot.start, end: slot.end, allDay: false, taskId: task.id, notes: '' }); }
        catch (_) { /* a title the calendar refuses only means no block */ }
      }
      handled[task.id] = eventId;
      remember(handled);
      // Why: saveEvent makes the task active. A block appearing must not change what the student is working on.
      if (eventId && store.state.activeTaskId !== activeTaskId) store.change(s => { s.activeTaskId = activeTaskId; }, 'calendar');
    }

    async function sweep() {
      if (running) { again = true; return; }
      running = true;
      try {
        const handled = { ...(load() || {}) };
        finishedBlocks(store.state.tasks, store.state.calendarEvents, handled, wallNow(tools, clock())).forEach(id => store.deleteEvent(id));
        if (clock().getTime() < waitUntil || !store.state.tasks.some(task => needsBlock(task, store.state.calendarEvents, handled))) return;
        const busy = await busyEvents();
        // Null means we cannot see the student's Google calendars right now. Better late than on top of a real class.
        if (!busy) { waitUntil = clock().getTime() + RETRY_MS; return; }
        // Why the state is read again: the student can change things while the server answers.
        [...store.state.tasks].forEach(task => { if (needsBlock(task, store.state.calendarEvents, handled)) place(task, busy, handled); });
      } finally {
        running = false;
        if (again) { again = false; sweep(); }
      }
    }

    if (!load()) markExisting();
    // Why later: a to-do and its deadline are saved one after the other. The block has to see both.
    events.addEventListener('articul8:change', event => { if (event.detail?.reason === 'restore') markExisting(); else later(sweep, 0); });
    events.addEventListener('focus', () => later(sweep, 0)); // a to-do that had to wait for Google gets its turn
    later(sweep, 0);
    return { sweep };
  }

  return { minutesFor, needsBlock, deadlineFor, slotFor, finishedBlocks, start };
});
