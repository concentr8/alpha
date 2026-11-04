/* Purpose: switches the app into the demo build before any app script runs: seeds the mock data of the chosen scene,
   installs the fake backend (demo-api.js) and offers window.Concentr8Demo (scenes, reset, fake Google sign-in).
   Called by: frontend/index.html, right after demo-data.js, demo-chat.js and demo-api.js and before concentr8-server.js
   and app-state.js. The desktop app's "Demo" menu (app/main.js) and Profile > Demo setup (demo-ui.js) call
   Concentr8Demo.prepareScene() and Concentr8Demo.reset().
   Calls: DemoData, DemoChat, DemoApi; localStorage and sessionStorage.
   DEMO ONLY: never merged into main.
   Why scenes are seeded on the NEXT page load: the app saves its in-memory state when a page is left (usage tracking),
   which would overwrite a seed written now. A flag in sessionStorage survives the reload and is read here first.
   Why the page stops saving once a scene is chosen: the old page saves once more on "pagehide", and that can land
   AFTER the new page wrote its seed. The new page then gets a "storage" event and loads the old data again (app-state.js
   follows other tabs). Found in the browser test: scene 3 came up with the data of scene 1. */
(() => {
  'use strict';
  const META_KEY = 'concentr8-demo-v1';            // { version, scene, seededAt }
  const PENDING_KEY = 'concentr8-demo-pending-scene'; // sessionStorage: scene to seed on this load
  const APP_KEY = 'articul8-wireframe-v2';         // app-state.js
  const SERVER_KEY = 'concentr8-server-v1';        // concentr8-server.js
  const BLOCKER_KEY = 'concentr8-blocker-v1';      // concentr8-blocker.js

  // While this page is being replaced by a new scene, nothing it saves may reach the storage anymore.
  let leaving = false;
  const realSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) { if (leaving && this === window.localStorage) return undefined; return realSetItem.call(this, key, value); };

  const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* nothing to keep */ } };

  function seed(scene) {
    const now = new Date();
    const real = read(DemoApi.REAL_KEY) || {};
    write(APP_KEY, DemoData.state(scene, now));
    // Signed in as the demo student. The real call token, if any, stays in its own key (demo-api.js swaps it in).
    write(SERVER_KEY, { token: DemoApi.DEMO_TOKEN, consent: true, callTime: '08:00', ...(real.phoneEnd ? { phoneEnd: real.phoneEnd } : {}) });
    // Plain rules only: every take blocks the same sites at the same moment (the AI check needs the real server).
    write(BLOCKER_KEY, { aiCheck: false });
    write(DemoApi.CAL_KEY, { connected: true, selectedIds: DemoData.googleCalendars.filter((c) => c.selected).map((c) => c.id) });
    try { localStorage.removeItem('concentr8-calendar-estimates'); } catch (_) { /* fine */ }
    write(META_KEY, { version: DemoData.VERSION, scene, seededAt: now.toISOString() });
  }

  let pending = null;
  try { pending = Number(sessionStorage.getItem(PENDING_KEY)) || null; sessionStorage.removeItem(PENDING_KEY); } catch (_) { /* no session storage */ }
  const meta = read(META_KEY);
  if (pending && DemoData.SCENES[pending]) seed(pending);
  // A new install, a newer seed, or Profile > Data > Reset all data (it deletes the app data): back to scene 1.
  else if (!meta || meta.version !== DemoData.VERSION || !read(APP_KEY)) seed(1);

  // ---------- fake backend ----------
  const realFetch = window.fetch.bind(window);
  const api = DemoApi.create({
    storage: localStorage,
    realFetch,
    data: DemoData,
    chat: DemoChat,
    appState: () => window.Articul8?.state || null,
    dispatch: (name, detail) => setTimeout(() => window.dispatchEvent(new CustomEvent(name, { detail })), 60),
  });
  window.fetch = (input, init) => api.handle(input, init);

  // The fake Google windows of the demo never open a real page: they "close" by themselves after a moment.
  function fakeGoogleWindow() {
    const popup = { closed: false, opener: null, close() { popup.closed = true; }, focus() {} };
    popup.location = { set href(_value) { setTimeout(() => { popup.closed = true; }, 900); }, get href() { return 'about:blank'; } };
    return popup;
  }
  const realOpen = window.open.bind(window);
  window.open = (url, ...rest) => (String(url || '').includes('ticket=demo') ? null : realOpen(url, ...rest));

  function prepareScene(scene) {
    if (!DemoData.SCENES[scene]) return;
    try { sessionStorage.setItem(PENDING_KEY, String(scene)); } catch (_) { seed(scene); }
    leaving = true;
    location.hash = DemoData.SCENES[scene].page;
    location.reload();
  }

  window.Concentr8Demo = {
    enabled: true,
    DEMO_TOKEN: DemoApi.DEMO_TOKEN,
    scenes: DemoData.SCENES,
    get scene() { return read(META_KEY)?.scene || 1; },
    prepareScene,
    reset: () => prepareScene(1),
    // Profile > Data > Reset all data (demo-ui.js wraps Articul8.reset): the page reloads into scene 1, not Jack's samples.
    resetOnReload: () => { try { sessionStorage.setItem(PENDING_KEY, '1'); } catch (_) { /* the empty app key reseeds too */ } leaving = true; },
    real: () => api.real(),
    setReal: (patch) => api.setReal(patch),
    forgetReal: () => { write(DemoApi.REAL_KEY, {}); const s = read(SERVER_KEY) || {}; delete s.phoneEnd; write(SERVER_KEY, s); },
    realFetch,
    fakeGoogleWindow,
    // Used by concentr8-server.js signIn() in the demo: a short pause instead of the Google window.
    fakeGoogleSignIn: () => new Promise((resolve) => setTimeout(resolve, 1200)),
  };
})();
