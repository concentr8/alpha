// Purpose: Home leads with the next to-do (docs/plans/simplicity-redesign.md 3.2, ADR 0049). Shows one Next card with the page's
//          one filled button ("Start focus 25 min", one click), two more to-dos as one-line rows, an add row (click or the N key),
//          "All to-dos (n)", and a note with Undo after tick, add or delete. Inside a chat the card shrinks to one line.
// Called by: frontend/index.html (script tag after the page scripts); frontend/test/home-next.test.js loads the pure parts in Node.
// Calls: window.Articul8 (state, change, addTask, completeTask), window.FocusUI (start, setup), window.Product (go, taskEditor),
//        window.I18n. Due dates use the device's time zone and language.
// AI-GENERATED: built from the c8- building blocks; Jonas's go replaces Jack's review (ADR 0045).
(function (root) {
  const LOCALES = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

  // Deadlines are stored as wall-clock text ("2026-11-13T17:00"); "today" is the device's own calendar day.
  const pad = (n) => String(n).padStart(2, '0');
  const localDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const localTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const dayNumber = (day) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86400000;

  // The earliest deadline of a to-do, or null.
  function deadlineOf(taskId, events) {
    return (events || []).filter((e) => e.taskId === taskId && e.kind === 'deadline').sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  }

  // Open to-dos in the order Home shows them: by deadline (so overdue first, oldest first), then the ones without a date
  // in the order they were added.
  function order(tasks, events) {
    const open = (tasks || []).filter((task) => !task.done).map((task, index) => ({ task, index, deadline: deadlineOf(task.id, events) }));
    open.sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.start.localeCompare(b.deadline.start) || a.index - b.index;
      if (a.deadline || b.deadline) return a.deadline ? -1 : 1;
      return a.index - b.index;
    });
    return open;
  }

  // Due date in words. short: for rows ("Fri", "Tomorrow"); long: for the Next card ("Due tomorrow, 5:00 PM").
  function dueText(deadline, now, { t = (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => (v && k in v ? v[k] : m)), language = 'en', short = false } = {}) {
    if (!deadline) return { text: t('No date'), overdue: false };
    const locale = LOCALES[language] || 'en-US';
    const day = deadline.start.slice(0, 10);
    const time = deadline.allDay ? '' : deadline.start.slice(11, 16);
    const diff = dayNumber(day) - dayNumber(localDay(now));
    // Why UTC in the formatter: the stored wall-clock time is shown as written, never shifted.
    const timeText = time ? new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(`${day}T${time}:00Z`)) : '';
    if (diff < 0) return { text: diff === -1 ? t('Overdue since yesterday') : t('Overdue {n} days', { n: -diff }), overdue: true };
    if (diff === 0) {
      const passed = Boolean(time) && localTime(now) >= time;
      if (short) return { text: t('Today'), overdue: passed };
      return { text: time ? t('Due today, {time}', { time: timeText }) : t('Due today'), overdue: passed };
    }
    if (diff === 1) {
      if (short) return { text: t('Tomorrow'), overdue: false };
      return { text: time ? t('Due tomorrow, {time}', { time: timeText }) : t('Due tomorrow'), overdue: false };
    }
    const label = new Intl.DateTimeFormat(locale, { ...(diff < 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }), timeZone: 'UTC' })
      .format(new Date(`${day}T12:00:00Z`));
    return { text: short ? label : t('Due {day}', { day: label }), overdue: false };
  }

  // What is left of the running focus phase, in milliseconds.
  function leftMs(session, now) {
    const phase = session && session.phases && session.phases[session.index];
    if (!phase || !phase.seconds) return null;
    const running = session.status === 'running' && session.phaseStartedAt ? now - session.phaseStartedAt : 0;
    return Math.max(0, phase.seconds * 1000 - (session.phaseElapsedMs || 0) - running);
  }

  const api = { order, deadlineOf, dueText, leftMs };
  if (typeof module !== 'undefined') module.exports = api;
  if (!root.document) return;
  root.HomeNext = api; // the To Do List page uses the same order and words

  // ---------- In the browser ----------
  const t = (text, values) => (root.I18n ? root.I18n.t(text, values) : text);
  const language = () => (root.I18n ? root.I18n.language() : 'en');
  const S = root.Articul8;
  const mount = document.getElementById('home-next');
  const checkIn = document.querySelector('.check-in');
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const minutes = () => Math.max(1, Number(S.state.settings.focusMinutes) || 25);
  const session = () => (S.state.activeSession && S.state.activeSession.status !== 'review' ? S.state.activeSession : null);
  const clock = (ms) => (root.FocusUI && root.FocusUI.time ? root.FocusUI.time(ms) : `${Math.ceil(ms / 60000)}`);
  const at = (ms) => new Intl.DateTimeFormat(LOCALES[language()] || 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(Date.now() + ms));

  // After a tick, add or delete, the same to-dos stay where they were, with a note and Undo, until the student's next action
  // (so the pointer never lands on a different to-do by surprise).
  let held = null; // ids shown when the student ticked, or null
  let note = null; // { text, undo }
  let menuFor = null; // id of the to-do whose ⋯ menu is open

  function shown() {
    const s = S.state;
    if (held) return held.map((id) => s.tasks.find((task) => task.id === id)).filter(Boolean).map((task) => ({ task, deadline: deadlineOf(task.id, s.calendarEvents) }));
    const list = order(s.tasks, s.calendarEvents);
    const running = session();
    const current = running && running.taskId && list.find((x) => x.task.id === running.taskId);
    return current ? [current, ...list.filter((x) => x !== current)].slice(0, 3) : list.slice(0, 3);
  }

  function menu(id, items) {
    const open = menuFor === id;
    return `<div class="c8-menu-wrap"><button class="c8-btn c8-btn--icon" type="button" data-home-menu="${esc(id)}" aria-label="${t('More actions')}" aria-haspopup="menu" aria-expanded="${open}">⋯</button>`
      + (open ? `<div class="c8-menu" role="menu">${items.map(([action, label]) => `<button type="button" role="menuitem" data-home-${action}="${esc(id)}">${label}</button>`).join('')}</div>` : '')
      + '</div>';
  }

  function card(entry, compact) {
    const running = session();
    const s = S.state;
    if (!entry && running) entry = { task: null };
    if (!entry) return compact ? '' : emptyCard();
    const { task, deadline } = entry;
    const now = running && (!task || running.taskId === task.id);
    const title = task ? task.title : (running.taskTitle || t('Focus session'));
    let meta;
    if (now) {
      const left = leftMs(running, Date.now());
      meta = left == null ? '' : t('Focus ends at {time}', { time: at(left) });
    } else {
      const due = dueText(deadline, new Date(), { t, language: language() });
      const estimate = task.estimatedMinutes ? ` · ${t('about {n} min', { n: task.estimatedMinutes })}` : '';
      meta = `<span class="${due.overdue ? 'c8-overdue' : ''}">${esc(due.text)}</span>${esc(estimate)}`;
    }
    const check = task ? `<input class="c8-check" type="checkbox" data-home-check="${esc(task.id)}" aria-label="${t('Mark as done')}: ${esc(task.title)}" ${task.done ? 'checked' : ''}>` : '<span></span>';
    let action;
    if (now) {
      const left = leftMs(running, Date.now());
      const done = left == null ? 0 : Math.round(100 - (left / ((running.phases[running.index].seconds || 1) * 1000)) * 100);
      action = `<button class="c8-pill c8-next__start" type="button" data-home-open style="--c8-done:${done}"><span class="c8-ring" aria-hidden="true"></span><span data-home-left>${left == null ? '' : t('{time} left', { time: clock(left) })}</span> · ${t('Open')}</button>`;
    } else if (compact) {
      action = `<button class="c8-btn c8-next__start" type="button" data-home-start="${esc(task.id)}">${t('Start focus')}</button>`;
    } else {
      action = `<span class="c8-next__start" style="display:flex;gap:var(--space-1);align-items:center"><button class="c8-btn c8-btn--main" type="button" data-home-start="${esc(task.id)}">${t('Start focus')} <span class="c8-btn__extra">${t('{n} min', { n: minutes() })}</span></button>`
        + `${menu(task.id, [['options', t('Start with options…')], ['edit', t('Edit')], ['delete', t('Delete')]])}</span>`;
    }
    const label = compact ? '' : `<span class="c8-label c8-next__label">${now ? t('Now') : t('Next')}</span>`;
    const titleClass = `c8-next__title${task && task.done ? ' c8-next__title--done' : ''}`;
    return `<section class="c8-next${compact ? ' c8-next--compact' : ''}" aria-label="${now ? t('Now') : t('Next to-do')}">${label}${check}`
      + `<div><p class="${titleClass}">${esc(title)}</p>${compact ? '' : `<p class="c8-meta" style="margin:0">${meta}</p>`}</div>${action}</section>`;
  }

  // No open to-do: the card asks for the next one, with a quiet way to just start.
  function emptyCard() {
    return `<section class="c8-next c8-next--empty" aria-labelledby="home-empty-title"><span class="c8-label c8-next__label">${t('Next')}</span>`
      + `<form class="home-empty" data-home-add novalidate><label class="c8-next__title" id="home-empty-title" for="home-empty-input">${t('What is the next thing you need to get done?')}</label>`
      + `<div class="c8-field"><input id="home-empty-input" data-home-input autocomplete="off" maxlength="2000" placeholder="${t('For example: read chapter 4')}"><span class="c8-kbd" aria-hidden="true">N</span></div></form>`
      + `<button class="c8-btn c8-btn--quiet home-just-start" type="button" data-home-just-start>${t('Just start {n} min', { n: minutes() })}</button></section>`;
  }

  function row({ task, deadline }) {
    const due = dueText(deadline, new Date(), { t, language: language(), short: true });
    return `<li class="c8-row${task.done ? ' c8-row--done' : ''}" data-home-row="${esc(task.id)}">`
      + `<input class="c8-check" type="checkbox" data-home-check="${esc(task.id)}" aria-label="${t('Mark as done')}: ${esc(task.title)}" ${task.done ? 'checked' : ''}>`
      + `<button class="c8-row__title" type="button" data-home-edit="${esc(task.id)}" title="${esc(task.title)}">${esc(task.title)}</button>`
      + `<span class="c8-meta ${due.overdue && !task.done ? 'c8-overdue' : ''}">${esc(due.text)}</span>`
      + (task.done ? '<span></span>' : menu(task.id, [['start', t('Start focus')], ['edit', t('Edit')], ['delete', t('Delete')]]))
      + '</li>';
  }

  function render() {
    if (!mount) return;
    const s = S.state;
    const compact = s.messages.length > 0;
    // Keep what the student is typing in the add field across a redraw.
    const active = document.activeElement;
    const typing = active && mount.contains(active) && active.matches('[data-home-input]') ? { value: active.value, start: active.selectionStart } : null;
    const list = shown();
    const openCount = s.tasks.filter((task) => !task.done).length;
    let html = card(list[0], compact);
    if (!compact && (list.length || held)) {
      html += `<ul class="c8-rows home-rows">${list.slice(1).map(row).join('')}`
        + `<li class="c8-row c8-row--add"><span class="c8-plus" aria-hidden="true">+</span><form data-home-add novalidate style="display:contents"><input data-home-input autocomplete="off" maxlength="2000" aria-label="${t('Add a to-do')}" placeholder="${t('Add a to-do')}"></form><span class="c8-kbd" aria-hidden="true">N</span></li></ul>`;
    }
    if (!compact && note) html += `<p class="c8-note" role="status">${esc(note.text)}${note.undo ? ` <button type="button" data-home-undo>${t('Undo')}</button>` : ''}</p>`;
    if (!compact && openCount > 0) html += `<button class="c8-btn c8-btn--quiet home-all" type="button" data-home-all>${t('All to-dos ({n})', { n: openCount })}</button>`;
    mount.innerHTML = html;
    if (typing) {
      const input = mount.querySelector('[data-home-input]');
      if (input) { input.value = typing.value; input.focus(); input.setSelectionRange(typing.start, typing.start); }
    }
    const opened = menuFor && mount.querySelector('.c8-menu [role="menuitem"]');
    if (opened) opened.focus();
  }

  // ----- Actions -----
  function tick(id, done) {
    if (!held) held = shown().map((x) => x.task.id);
    S.completeTask(id, done);
    note = done ? { text: t('Done.'), undo: () => S.completeTask(id, false) } : null;
    render();
  }

  function add(input) {
    const text = input.value.trim();
    if (!text) return;
    const before = new Set(S.state.tasks.map((task) => task.id));
    S.addTask(text);
    const created = S.state.tasks.find((task) => !before.has(task.id));
    input.value = '';
    held = null;
    note = { text: t('Added "{title}".', { title: text }), undo: created ? () => remove(created.id, true) : null };
    render();
    const again = mount.querySelector('.c8-row--add [data-home-input]') || mount.querySelector('[data-home-input]');
    if (again) again.focus(); // the field stays ready for the next one
  }

  // Delete without a confirm dialog: Undo brings the to-do and its calendar blocks back where they were.
  function remove(id, silent) {
    const s = S.state;
    const index = s.tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    const task = s.tasks[index];
    const events = s.calendarEvents.filter((e) => e.taskId === id);
    S.change((state) => {
      state.tasks = state.tasks.filter((x) => x.id !== id);
      state.calendarEvents = state.calendarEvents.filter((e) => e.taskId !== id);
      state.messages.forEach((m) => { if (m.taskId === id) m.taskId = null; });
      if (state.activeTaskId === id) state.activeTaskId = null;
    }, 'tasks');
    held = null;
    note = silent ? null : {
      text: t('Deleted "{title}".', { title: task.title }),
      undo: () => S.change((state) => { state.tasks.splice(Math.min(index, state.tasks.length), 0, task); state.calendarEvents.push(...events); }, 'tasks'),
    };
    render();
  }

  function startFocus(id) {
    root.FocusUI.start({ taskId: id, minutes: minutes(), origin: 'Home', selected: ['timer'] });
  }

  mount.addEventListener('click', (event) => {
    event.c8Handled = true;
    const target = event.target.closest('button, input');
    if (!target) return;
    const data = target.dataset;
    if (data.homeCheck) { tick(data.homeCheck, target.checked); return; }
    if (data.homeMenu) { menuFor = menuFor === data.homeMenu ? null : data.homeMenu; render(); return; }
    menuFor = null;
    if (data.homeUndo !== undefined && note && note.undo) { const undo = note.undo; note = null; held = null; undo(); render(); return; }
    if (data.homeStart) startFocus(data.homeStart);
    else if (data.homeOptions) root.FocusUI.setup({ taskId: data.homeOptions, origin: 'Home' });
    else if (data.homeEdit) root.Product.taskEditor(data.homeEdit);
    else if (data.homeDelete) remove(data.homeDelete);
    else if (data.homeOpen !== undefined) root.Product.go(S.state.activeSession && S.state.activeSession.roomId ? 'Room' : 'Focus');
    else if (data.homeAll !== undefined) root.Product.go('To Do List');
    else if (data.homeJustStart !== undefined) root.FocusUI.start({ timerOnly: true, minutes: minutes(), origin: 'Home', selected: ['timer'] });
    else return;
    render();
  });
  mount.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.target.querySelector('[data-home-input]');
    if (input) add(input);
  });
  mount.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (menuFor) { const id = menuFor; menuFor = null; render(); mount.querySelector(`[data-home-menu="${CSS.escape(id)}"]`)?.focus(); event.stopPropagation(); return; }
    if (event.target.matches('[data-home-input]')) { event.target.value = ''; event.target.blur(); }
  });

  // The student's next action ends the held view and the note (but not the Undo click itself).
  document.addEventListener('click', (event) => {
    if (event.c8Handled) return;
    if (held || note || menuFor) { held = null; note = null; menuFor = null; render(); }
  });
  // Why setTimeout: redrawing inside keydown would replace the field before the typed letter lands in it.
  document.addEventListener('keydown', (event) => {
    if (event.target.closest && event.target.closest('[data-home-undo]')) return;
    if ((held || note) && !['Shift', 'Tab', 'Control', 'Alt', 'Meta'].includes(event.key)) { held = null; note = null; setTimeout(render); }
  }, true);

  // N: jump to the add field from anywhere on Home, unless the student is typing somewhere.
  document.addEventListener('keydown', (event) => {
    if ((event.key || '').toLowerCase() !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (document.querySelector('dialog[open]') || document.querySelector('.workspace').hidden) return;
    const input = mount.querySelector('.c8-row--add [data-home-input]') || mount.querySelector('[data-home-input]');
    if (input) { event.preventDefault(); input.focus(); }
  });

  // Touch screens: a swipe to the right on a row also marks it done (the checkbox always works, WCAG 2.5.7).
  let swipe = null;
  mount.addEventListener('pointerdown', (event) => {
    const rowEl = event.pointerType === 'touch' && event.target.closest('[data-home-row]');
    swipe = rowEl ? { id: rowEl.dataset.homeRow, x: event.clientX, y: event.clientY } : null;
  });
  mount.addEventListener('pointerup', (event) => {
    if (swipe && event.clientX - swipe.x > 80 && Math.abs(event.clientY - swipe.y) < 30) tick(swipe.id, true);
    swipe = null;
  });

  // The pill counts down without redrawing the card.
  setInterval(() => {
    const running = session();
    const label = mount.querySelector('[data-home-left]');
    if (!running || !label) return;
    const left = leftMs(running, Date.now());
    if (left != null) label.textContent = t('{time} left', { time: clock(left) });
  }, 1000);

  root.addEventListener('articul8:change', (event) => { if (event.detail.reason !== 'draft') render(); });
  root.addEventListener('articul8:navigate', (event) => { if (event.detail.page === 'Home') { held = null; note = null; render(); } });
  checkIn && render();
})(typeof window !== 'undefined' ? window : globalThis);
