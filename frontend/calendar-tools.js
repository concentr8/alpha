/* AI-GENERATED: reviewed calendar helper only; no AI parsing or network calls.
   Purpose: pure local-date and quick-add helpers for CalendarUI.
   Called by frontend/index.html and server/test/calendar-tools.test.js.
   Calls no browser, storage, AI service, or external API. */
(function (root, factory) {
  const tools = factory();
  if (typeof module === 'object' && module.exports) module.exports = tools;
  if (root) root.CalendarTools = tools;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const DAY_MS = 86400000;
  const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const pad = value => String(value).padStart(2, '0');

  function localDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function addDays(value, amount) {
    if (!validDate(value) || !Number.isInteger(amount)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + amount));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  function weekday(value) {
    if (!validDate(value)) return -1;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  }

  function weekStart(value) {
    const day = weekday(value);
    return day < 0 ? null : addDays(value, -((day + 6) % 7));
  }

  function wallTime(value, minutes) {
    if (!validDate(value) || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return null;
    if (minutes === 1440) return `${addDays(value, 1)}T00:00`;
    return `${value}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }

  function parseQuickAdd(text, options = {}) {
    const original = String(text || '').trim();
    const today = options.today || localDate(options.now || new Date());
    if (!original) return { status: 'invalid', reason: 'empty' };
    if (!validDate(today)) return { status: 'invalid', reason: 'invalid-today' };

    let source = original;
    let date = null;
    let explicitDateCount = 0;
    source = source.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, match => {
      explicitDateCount += 1;
      date = match;
      return ' ';
    });
    if (explicitDateCount > 1) return { status: 'ambiguous', reason: 'multiple-dates' };
    if (explicitDateCount && !validDate(date)) return { status: 'invalid', reason: 'invalid-date' };

    const relative = /\b(today|tomorrow)\b/ig;
    const relatives = [...source.matchAll(relative)];
    if (date && relatives.length) return { status: 'ambiguous', reason: 'multiple-dates' };
    if (relatives.length > 1) return { status: 'ambiguous', reason: 'multiple-dates' };
    if (!date && relatives.length) {
      date = addDays(today, relatives[0][1].toLowerCase() === 'tomorrow' ? 1 : 0);
      source = source.replace(relative, ' ');
    }

    const weekdayPattern = /\b(next\s+)?(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)\b/ig;
    const weekdays = [...source.matchAll(weekdayPattern)];
    if ((date || relatives.length) && weekdays.length) return { status: 'ambiguous', reason: 'multiple-dates' };
    if (weekdays.length > 1) return { status: 'ambiguous', reason: 'multiple-dates' };
    if (!date && weekdays.length) {
      const match = weekdays[0];
      const name = match[2].toLowerCase().slice(0, 3);
      const target = WEEKDAYS.findIndex(day => day.startsWith(name));
      const current = weekday(today);
      let offset = (target - current + 7) % 7;
      if (offset === 0 || match[1]) offset += 7;
      date = addDays(today, offset);
      source = source.replace(weekdayPattern, ' ');
    }
    if (!date) return { status: 'invalid', reason: 'missing-date' };

    const durationMatches = [...source.matchAll(/\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/ig)];
    if (durationMatches.length > 1) return { status: 'ambiguous', reason: 'multiple-durations' };
    let duration = null;
    if (durationMatches.length) {
      const amount = Number(durationMatches[0][1]);
      const unit = durationMatches[0][2].toLowerCase();
      duration = Math.round(amount * (/^(h|hr|hrs|hour|hours)$/.test(unit) ? 60 : 1));
      if (!Number.isFinite(duration) || duration < 1 || duration > 1440) return { status: 'invalid', reason: 'invalid-duration' };
      source = source.replace(durationMatches[0][0], ' ');
    }

    const timePattern = /\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/ig;
    const timeMatches = [...source.matchAll(timePattern)];
    if (timeMatches.length > 1) return { status: 'ambiguous', reason: 'multiple-times' };
    if (!timeMatches.length) return { status: 'invalid', reason: 'missing-time' };
    const match = timeMatches[0];
    let hour, minute;
    if (match[1]) {
      hour = Number(match[1]);
      minute = Number(match[2] || 0);
      if (hour < 1 || hour > 12) return { status: 'invalid', reason: 'invalid-time' };
      if (match[3].toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (match[3].toLowerCase() === 'am' && hour === 12) hour = 0;
    } else {
      hour = Number(match[4]);
      minute = Number(match[5]);
    }
    const startMinutes = hour * 60 + minute;
    if (startMinutes > 1439) return { status: 'invalid', reason: 'invalid-time' };
    if (!duration) return { status: 'invalid', reason: 'missing-duration' };

    const title = source
      .replace(timePattern, ' ')
      .replace(/\b(plan|session|for|at|on|from|schedule)\b/ig, ' ')
      .replace(/[,:;—–-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title) return { status: 'invalid', reason: 'missing-title' };
    if (startMinutes + duration > 1440) return { status: 'invalid', reason: 'crosses-day' };

    return {
      status: 'valid',
      event: {
        title: title.slice(0, 200),
        kind: 'plan',
        start: wallTime(date, startMinutes),
        end: wallTime(date, startMinutes + duration),
        allDay: false,
        taskId: null,
        notes: ''
      }
    };
  }

  return { localDate, validDate, addDays, weekday, weekStart, wallTime, parseQuickAdd, DAY_MS };
});
