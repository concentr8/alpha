// Purpose: adds the approved read-only Google Calendar connection to Profile Settings and Calendar.
// Called by: frontend/index.html after calendar.js; runtime hooks on articul8:navigate and the initial hash.
// Calls: Concentr8's existing connection/API and CalendarUI.setExternal; Google events never enter Articul8.
(() => {
  'use strict';

  const STATUS_PATH = '/google/status';
  const CALENDARS_PATH = '/google/calendars';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const addDays = (value, count) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day + count);
    return localDate(date);
  };
  const dayInstant = (date) => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  };
  const browserTimezone = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; }
  };
  const currentConnection = () => {
    try { return window.Concentr8?.connection?.() || null; } catch (_) { return null; }
  };
  let authStorageMismatch = false;
  const baseUrl = () => {
    const connection = currentConnection();
    return String(connection?.url || window.Concentr8?.api || '').replace(/\/+$/, '');
  };
  const authToken = () => authStorageMismatch ? '' : currentConnection()?.token || '';

  let accountToken = null;
  let configured = false;
  let connected = false;
  let allCalendars = [];
  let selectedIds = [];
  let updatedAt = null;
  let events = [];
  let calendars = [];
  let activeRange = null;
  let calendarVisible = false;
  let eventController = null;
  let generation = 0;
  let oauthPopup = null;
  let popupPoll = null;
  let lastRefresh = 0;
  let lastAccountCheck = 0;

  const dialog = document.createElement('dialog');
  dialog.className = 'cal-dialog google-calendar-dialog';
  dialog.setAttribute('aria-labelledby', 'google-calendar-title');
  dialog.innerHTML = '<header><h2 id="google-calendar-title">Google Calendar</h2><button class="icon-button" type="button" data-google-close aria-label="Close Google Calendar settings">×</button></header>'
    + '<!-- AI-GENERATED: no approved hand-drawn screen exists for this connection; uses existing Concentr8 calendar controls. -->'
    + '<p class="preview-note">AI generated: Google Calendar connection settings. Your calendar is read only here.</p>'
    + '<p class="google-calendar-status" data-google-status role="status" aria-live="polite">Checking Google Calendar setup…</p>'
    + '<section data-google-calendar-list hidden><h3>Choose calendars</h3><p class="detail-note">Choose up to three calendars to show in your study planner.</p><div class="cal-field"><span>Calendars to display</span><div data-google-calendar-options></div></div><p class="detail-note" data-google-selection-count></p></section>'
    + '<p class="cal-error" data-google-error role="alert" hidden></p>'
    + '<div class="dialog-actions"><button class="wire-button" type="button" data-google-connect>Connect Google Calendar</button><button class="wire-button" type="button" data-google-save hidden>Save selection</button><button class="wire-button" type="button" data-google-disconnect hidden>Disconnect</button></div>';
  document.body.append(dialog);

  function showStatus(text) {
    const target = dialog.querySelector('[data-google-status]');
    if (target) target.textContent = text;
  }

  function showError(text = '') {
    const target = dialog.querySelector('[data-google-error]');
    if (!target) return;
    target.textContent = text;
    target.hidden = !text;
  }

  function apiUrl(path) {
    const root = baseUrl();
    if (!root) throw new Error('The Concentr8 server address is unavailable.');
    return root + path;
  }

  async function request(path, method = 'GET', body, signal) {
    const token = authToken();
    const response = await fetch(apiUrl(path), {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(20000)]),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || `The server answered ${response.status}.`),
      { connected: data.connected === true });
    return data;
  }

  function setCalendarUI(status, message = '') {
    window.CalendarUI?.setExternal({
      status,
      message,
      events,
      calendars,
      updatedAt,
    });
  }

  function clearAccountData(status = 'signin', message = 'Sign in to Concentr8 to view your Google calendars.') {
    generation += 1;
    cancelPopup();
    eventController?.abort();
    eventController = null;
    events = [];
    calendars = [];
    allCalendars = [];
    selectedIds = [];
    updatedAt = null;
    configured = false;
    connected = false;
    activeRange = null;
    lastRefresh = 0;
    drawCalendarOptions();
    showStatus(message);
    setCalendarUI(status, message);
  }

  function cancelPopup() {
    clearInterval(popupPoll);
    popupPoll = null;
    if (oauthPopup && !oauthPopup.closed) oauthPopup.close();
    oauthPopup = null;
  }

  function normalizeCalendars(data) {
    allCalendars = Array.isArray(data.calendars) ? data.calendars
      .filter((calendar) => calendar && calendar.id != null)
      .map((calendar) => ({ id: String(calendar.id), name: String(calendar.name || 'Google calendar'), selected: !!calendar.selected })) : [];
    selectedIds = (Array.isArray(data.selectedIds) ? data.selectedIds : allCalendars.filter((calendar) => calendar.selected).map((calendar) => calendar.id))
      .map(String).filter((id, index, ids) => ids.indexOf(id) === index).slice(0, 3);
    calendars = allCalendars.filter((calendar) => selectedIds.includes(calendar.id)).map(({ id, name }) => ({ id, name }));
  }

  function drawCalendarOptions() {
    const list = dialog.querySelector('[data-google-calendar-list]');
    const options = dialog.querySelector('[data-google-calendar-options]');
    const count = dialog.querySelector('[data-google-selection-count]');
    if (!list || !options) return;
    list.hidden = !connected;
    options.innerHTML = allCalendars.length
      ? allCalendars.map((calendar) => {
        const selected = selectedIds.includes(calendar.id);
        const locked = !selected && selectedIds.length >= 3;
        return `<label class="google-calendar-option"><input type="checkbox" data-google-calendar-id="${esc(calendar.id)}" ${selected ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${esc(calendar.name)}</span></label>`;
      }).join('')
      : '<p class="empty-message">No calendars were returned for this account.</p>';
    if (count) count.textContent = `${selectedIds.length} of 3 selected`;
    dialog.querySelector('[data-google-save]').hidden = !connected;
    dialog.querySelector('[data-google-disconnect]').hidden = !connected;
  }

  function updateCalendarStatus(status, message = '') {
    if (status === 'error' || status === 'stale') {
      setCalendarUI(status, message);
    } else if (!configured) {
      setCalendarUI('unconfigured');
    } else if (!authToken()) {
      setCalendarUI('signin');
    } else if (!connected) {
      setCalendarUI('disconnected');
    } else {
      setCalendarUI(status, message);
    }
  }

  async function refreshEvents(force = false) {
    if (!calendarVisible || !connected || !selectedIds.length || !activeRange) return;
    if (!force && Date.now() - lastRefresh < 5 * 60 * 1000) return;
    eventController?.abort();
    const controller = new AbortController();
    eventController = controller;
    const ownGeneration = generation;
    const ownToken = authToken();
    const ranges = [
      { from: activeRange.from, to: activeRange.to },
      { from: localDate(new Date()), to: addDays(localDate(new Date()), 7) },
    ];
    const timezone = browserTimezone();
    updateCalendarStatus('loading');
    try {
      const responses = await Promise.all(ranges.map(({ from, to }) => {
        const query = new URLSearchParams({ from: dayInstant(from), to: dayInstant(to), timezone });
        return request(`/google/events?${query.toString()}`, 'GET', undefined, controller.signal);
      }));
      if (controller.signal.aborted || ownGeneration !== generation || ownToken !== authToken() || !calendarVisible) return;
      const unique = new Map();
      responses.forEach((result) => (Array.isArray(result.events) ? result.events : []).forEach((event) => {
        if (event?.id != null && event?.calendarId != null) unique.set(`${event.calendarId}:${event.id}`, event);
      }));
      events = [...unique.values()].map((event) => ({
        ...event,
        calendarId: String(event.calendarId),
        id: `${String(event.calendarId).length}:${event.calendarId}${event.id}`,
        kind: 'google',
        readOnly: true,
        start: wallTime(event.start, event.allDay),
        end: wallTime(event.end, event.allDay),
        allDay: !!event.allDay,
      }));
      const timestamps = responses.map((result) => result.updatedAt).filter(Boolean).sort();
      updatedAt = timestamps[timestamps.length - 1] || new Date().toISOString();
      lastRefresh = Date.now();
      updateCalendarStatus('ready');
    } catch (error) {
      if (controller.signal.aborted || ownGeneration !== generation || ownToken !== authToken()) return;
      updateCalendarStatus(events.length ? 'stale' : 'error', error.message || 'Google Calendar could not be loaded. Try again.');
    }
  }

  function wallTime(value, allDay) {
    const text = String(value || '');
    if (allDay) return text.slice(0, 10);
    if (!/[zZ]|[+-]\d\d:\d\d$/.test(text)) return text.slice(0, 16);
    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) return text.slice(0, 16);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: browserTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce((output, part) => ({ ...output, [part.type]: part.value }), {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  async function loadAccount() {
    lastAccountCheck = Date.now();
    const currentToken = authToken() || '';
    const ownGeneration = generation;
    showError('');
    showStatus('Checking Google Calendar setup…');
    try {
      const setup = await request(STATUS_PATH);
      if (ownGeneration !== generation || currentToken !== authToken()) return;
      configured = !!setup.configured;
      dialog.querySelector('[data-google-connect]').disabled = !configured || !authToken();
      if (!configured) {
        generation += 1;
        eventController?.abort();
        eventController = null;
        dialog.querySelector('[data-google-connect]').disabled = true;
        connected = false;
        events = [];
        calendars = [];
        allCalendars = [];
        selectedIds = [];
        updateCalendarStatus('unconfigured');
        showStatus('Not set up yet. Your local tasks and plans are unchanged.');
        drawCalendarOptions();
        return;
      }
      if (!currentToken) {
        connected = false;
        events = [];
        calendars = [];
        allCalendars = [];
        selectedIds = [];
        updatedAt = null;
        showStatus('Sign in to Concentr8 first. Google Calendar uses your existing Concentr8 account.');
        updateCalendarStatus('signin');
        drawCalendarOptions();
        return;
      }
      const data = await request(CALENDARS_PATH);
      if (ownGeneration !== generation || currentToken !== authToken()) return;
      connected = !!data.connected;
      normalizeCalendars(data);
      if (!connected) {
        generation += 1;
        eventController?.abort();
        eventController = null;
        events = [];
        calendars = [];
        allCalendars = [];
        selectedIds = [];
        updatedAt = null;
        updateCalendarStatus('disconnected');
        showStatus('Connect your Google account to choose calendars.');
      } else {
        showStatus('Connected. Choose up to three calendars to display.');
        updateCalendarStatus(selectedIds.length ? 'loading' : 'ready');
      }
      drawCalendarOptions();
      if (calendarVisible && connected) {
        const range = window.CalendarUI?.getRange();
        if (range) activeRange = range;
        await refreshEvents(true);
      }
    } catch (error) {
      if (ownGeneration !== generation || currentToken !== authToken()) return;
      showStatus('Google Calendar setup could not be loaded.');
      showError(error.message || 'Try again in a moment.');
      if (error.connected) {
        connected = true;
        dialog.querySelector('[data-google-disconnect]').hidden = false;
      }
      if (!currentToken) setCalendarUI('signin', 'Sign in to Concentr8 to connect Google Calendar. Local tasks remain available.');
      else updateCalendarStatus(events.length ? 'stale' : 'error', error.message);
    }
  }

  async function inspectSetup() {
    const ownGeneration = generation, token = authToken();
    showError('');
    showStatus('Checking Google Calendar setup…');
    try {
      const setup = await request(STATUS_PATH);
      if (ownGeneration !== generation || token !== authToken()) return;
      configured = !!setup.configured;
      if (!configured) {
        dialog.querySelector('[data-google-connect]').disabled = true;
        connected = false;
        events = [];
        calendars = [];
        allCalendars = [];
        selectedIds = [];
        updatedAt = null;
        showStatus('Not set up yet. Your local tasks and plans are unchanged.');
        drawCalendarOptions();
        updateCalendarStatus('unconfigured');
        return;
      }
      if (!authToken()) {
        dialog.querySelector('[data-google-connect]').disabled = true;
        showStatus('Sign in to Concentr8 first. Google Calendar uses your existing Concentr8 account.');
        updateCalendarStatus('signin');
        return;
      }
      dialog.querySelector('[data-google-connect]').disabled = !configured;
      await loadAccount();
    } catch (error) {
      if (ownGeneration !== generation || token !== authToken()) return;
      showStatus('Google Calendar setup could not be checked.');
      showError(error.message || 'Try again in a moment.');
    }
  }

  function openDialog() {
    showError('');
    if (!dialog.open) dialog.showModal();
    inspectSetup();
  }

  async function connectGoogle() {
    if (!authToken()) {
      showStatus('Sign in to Concentr8 first. Google Calendar uses your existing Concentr8 account.');
      return;
    }
    if (!configured) {
      showStatus('Not set up yet. Your local tasks and plans are unchanged.');
      return;
    }
    const button = dialog.querySelector('[data-google-connect]');
    button.disabled = true;
    let popup = null;
    const ownGeneration = generation, token = authToken();
    showError('');
    showStatus('Preparing a secure Google sign-in…');
    try {
      popup = window.open('about:blank', 'concentr8-google-calendar', 'popup,width=560,height=720');
      if (!popup) throw new Error('Allow the sign-in window to open, then try again.');
      oauthPopup = popup;
      try { popup.opener = null; } catch (_) { /* keep the window reference for close polling */ }
      const result = await request('/google/login', 'POST', {});
      if (ownGeneration !== generation || token !== authToken()) { popup.close(); return; }
      const destination = new URL(result.authorizationUrl);
      const trusted = new URL(baseUrl());
      if (destination.origin !== trusted.origin || destination.pathname !== '/google/login' || !destination.searchParams.has('ticket')) {
        throw new Error('The server returned an invalid Google sign-in link.');
      }
      popup.location.href = destination.href;
      clearInterval(popupPoll);
      const started = Date.now();
      popupPoll = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupPoll);
          popupPoll = null;
          oauthPopup = null;
          showStatus('Checking your Google Calendar connection…');
          loadAccount();
        } else if (Date.now() - started > 5 * 60 * 1000) {
          cancelPopup();
          showStatus('The sign-in window is still open. Close it when you are done.');
        }
      }, 500);
      showStatus('Finish signing in through the Google window.');
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      oauthPopup = null;
      showError(error.message || 'Google Calendar could not be connected.');
      showStatus('Google sign-in did not start.');
    } finally {
      button.disabled = false;
    }
  }

  function chosenIds() {
    return [...dialog.querySelectorAll('[data-google-calendar-id]:checked')].map((input) => input.dataset.googleCalendarId).slice(0, 3);
  }

  async function saveCalendars() {
    const nextIds = chosenIds();
    const button = dialog.querySelector('[data-google-save]');
    const ownGeneration = generation, token = authToken();
    button.disabled = true;
    showError('');
    showStatus('Saving calendar selection…');
    try {
      const data = await request(CALENDARS_PATH, 'POST', { calendarIds: nextIds });
      if (ownGeneration !== generation || token !== authToken()) return;
      generation += 1;
      eventController?.abort();
      eventController = null;
      normalizeCalendars({ ...data, calendars: data.calendars || allCalendars.map((calendar) => ({ ...calendar, selected: nextIds.includes(calendar.id) })), selectedIds: data.selectedIds || nextIds });
      events = [];
      updatedAt = null;
      drawCalendarOptions();
      updateCalendarStatus(selectedIds.length ? 'loading' : 'ready');
      showStatus('Calendar selection saved.');
      await refreshEvents(true);
    } catch (error) {
      if (ownGeneration !== generation || token !== authToken()) return;
      showStatus('Calendar selection could not be saved.');
      showError(error.message || 'Try again in a moment.');
    } finally {
      button.disabled = false;
    }
  }

  async function disconnect() {
    const button = dialog.querySelector('[data-google-disconnect]');
    button.disabled = true;
    const ownGeneration = generation, token = authToken();
    cancelPopup();
    showError('');
    showStatus('Disconnecting Google Calendar…');
    try {
      await request('/google/disconnect', 'POST', {});
      if (ownGeneration !== generation || token !== authToken()) return;
      generation += 1;
      eventController?.abort();
      connected = false;
      events = [];
      calendars = [];
      allCalendars = [];
      selectedIds = [];
      updatedAt = null;
      drawCalendarOptions();
      updateCalendarStatus('disconnected');
      showStatus('Google Calendar disconnected. Your local tasks and plans remain.');
    } catch (error) {
      if (ownGeneration !== generation || token !== authToken()) return;
      showStatus('Google Calendar could not be disconnected.');
      showError(error.message || 'Try again in a moment.');
    } finally {
      button.disabled = false;
    }
  }

  function attachSettingsButton() {
    const parts = location.hash.slice(1).split('/');
    if (parts[0] !== 'profile' || decodeURIComponent(parts[1] || '') !== 'settings') return;
    const content = document.getElementById('page-content');
    if (!content || !content.querySelector('#settings-form') || content.querySelector('[data-open-google-calendar]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'wire-button';
    button.dataset.openGoogleCalendar = '';
    button.textContent = 'Google Calendar';
    const note = document.createElement('p');
    note.className = 'preview-note quiet';
    note.textContent = 'AI generated · Choose up to three read-only calendars to see alongside your study plans.';
    content.append(button, note);
  }

  function updateIdentity() {
    const nextToken = authToken() || '';
    if (accountToken === nextToken) return false;
    accountToken = nextToken;
    clearAccountData(nextToken ? 'loading' : 'signin');
    if (calendarVisible || dialog.open) loadAccount();
    return true;
  }

  function onNavigate(event) {
    calendarVisible = event.detail?.page === 'Calendar' && location.hash.startsWith('#calendar');
    attachSettingsButton();
    const identityChanged = updateIdentity();
    if (calendarVisible) {
      if (!identityChanged) loadAccount();
    } else {
      eventController?.abort();
      eventController = null;
    }
    if (dialog.open && !location.hash.startsWith('#profile/settings')) dialog.close();
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-google-close]')) dialog.close();
    if (event.target.closest('[data-open-google-calendar]')) openDialog();
    if (event.target.closest('[data-google-connect]')) connectGoogle();
    if (event.target.closest('[data-google-save]')) saveCalendars();
    if (event.target.closest('[data-google-disconnect]')) disconnect();
  });
  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-google-calendar-id]');
    if (!input) return;
    if (dialog.querySelectorAll('[data-google-calendar-id]:checked').length > 3) input.checked = false;
    const next = chosenIds();
    dialog.querySelectorAll('[data-google-calendar-id]').forEach((option) => { option.disabled = !option.checked && next.length >= 3; });
    dialog.querySelector('[data-google-selection-count]').textContent = `${next.length} of 3 selected`;
  });
  window.addEventListener('articul8:navigate', onNavigate);
  window.addEventListener('articul8:change', updateIdentity);
  window.addEventListener('storage', (event) => {
    if (event.key !== 'concentr8-server-v1') return;
    let persistedToken = '';
    try { persistedToken = JSON.parse(event.newValue || '{}').token || ''; } catch (_) { /* treat invalid auth storage as signed out */ }
    if (persistedToken !== (currentConnection()?.token || '')) {
      authStorageMismatch = true;
      accountToken = '';
      clearAccountData('signin', 'Your Concentr8 sign-in changed in another tab. Reload to continue.');
      return;
    }
    updateIdentity();
  });
  window.addEventListener('focus', () => {
    if (calendarVisible && !updateIdentity()) loadAccount();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && calendarVisible) {
      if (!updateIdentity() && Date.now() - lastRefresh >= 5 * 60 * 1000) loadAccount();
    }
  });
  window.addEventListener('concentr8:calendar-range', (event) => {
    activeRange = event.detail;
    refreshEvents(true);
  });
  window.addEventListener('concentr8:calendar-retry', () => {
    lastRefresh = 0;
    loadAccount();
  });
  setInterval(() => {
    const identityChanged = updateIdentity();
    if (!identityChanged && calendarVisible && Date.now() - lastAccountCheck >= 5 * 60 * 1000) loadAccount();
  }, 15_000);
  setInterval(() => {
    if (calendarVisible && document.visibilityState === 'visible' && Date.now() - lastRefresh >= 5 * 60 * 1000) refreshEvents(true);
  }, 60_000);

  setTimeout(() => {
    attachSettingsButton();
    const parts = location.hash.slice(1).split('/');
    calendarVisible = parts[0] === 'calendar';
    if (!updateIdentity() && calendarVisible) loadAccount();
  }, 0);
})();
