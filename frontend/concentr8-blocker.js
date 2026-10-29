// Purpose: connects the Block App page and the focus session to the blocker of the desktop app.
// Called by: frontend/index.html (script tag after concentr8-server.js). The Block App page calls
//            window.Concentr8Blocker.panel(); everything else runs by itself from the app events.
// Calls: window.concentr8Desktop (app/preload.js, only in the desktop app), window.Concentr8.connection() for the
//        server token, and window.Articul8 (app-state.js) to read the session and the block list.
// AI-GENERATED: Jack has no wireframe for the blocking hints and settings; they are built from existing classes
//               (.preview-note, .detail-section, .wire-button, docs/design.md) so Jack can redraw them.
// Why this file and not index.html: Jack's focus code stays untouched; this file only listens to "articul8:change".
(() => {
  const desktop = window.concentr8Desktop || null;
  const KEY = 'concentr8-blocker-v1';
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Per-device setting, so it lives next to the app and not in the shared app state.
  let aiCheck = true;
  try { aiCheck = JSON.parse(localStorage.getItem(KEY) || '{}').aiCheck !== false; } catch (_) { /* private mode: default */ }
  const saveAiCheck = () => { try { localStorage.setItem(KEY, JSON.stringify({ aiCheck })); } catch (_) { /* not saved */ } };

  let running = false;
  let lastKey = '';
  let live = null;
  let testMessage = '';

  const connection = () => (window.Concentr8 && window.Concentr8.connection ? window.Concentr8.connection() : null);

  // Why: a student who put apps on the list expects blocking in every focus session, also without ticking the Block App
  // tool. The tool only matters for the AI check on its own (empty list). Breaks and paused sessions are never blocked.
  function wanted() {
    const app = window.Articul8;
    const a = app && app.state.activeSession;
    if (!a || a.status === 'review' || a.timerOnly) return null;
    const phase = a.phases && a.phases[a.index];
    if (!phase) return null;
    return { task: a.taskTitle, hasTool: !!(phase.tools && phase.tools.includes('block')), active: a.status === 'running' && phase.kind === 'focus' };
  }

  async function sync() {
    if (!desktop) return;
    const app = window.Articul8;
    const w = wanted();
    const names = app ? app.state.tools.blockedApps : [];
    const server = connection();
    const useAi = aiCheck && !!server;
    if (!w || (!names.length && !(useAi && w.hasTool))) {
      if (running) { running = false; lastKey = ''; await desktop.stop(); }
      return;
    }
    const key = JSON.stringify([w.task, names, useAi, !!server]);
    if (!running || key !== lastKey) {
      running = true;
      lastKey = key;
      await desktop.start({ task: w.task, names, aiCheck: useAi, server });
    }
    await desktop.pause(!w.active);
  }

  function repaint() { window.dispatchEvent(new CustomEvent('articul8:rerender')); }

  if (desktop) {
    desktop.onChange((status) => { live = status; const el = document.querySelector('[data-block-live]'); if (el) el.textContent = liveText(); });
    window.addEventListener('articul8:change', () => { sync().catch(() => {}); });
    window.addEventListener('focus', () => { sync().catch(() => {}); });
  }

  function liveText() {
    if (!live || !live.running) return 'Not running right now. It starts with your next focus session.';
    if (live.paused) return 'Paused (break).';
    return `Running. Warnings: ${live.nudges}, closed: ${live.blocks}.`;
  }

  // Why: only the Mac can read the web address; Windows and Linux see the program and the window title.
  const OS_HINT = {
    win32: 'On Windows, websites are found by the words in the tab title, and a tab is closed with Ctrl+W. This is new and not tested on many computers yet.<br>',
    linux: 'On Linux this needs the tool xdotool (install it with your package manager) and an X11 session, not Wayland. Websites are found by the tab title. This is new and not tested on many computers yet.<br>',
  };

  // The hints at the top of the Block App page.
  function panel() {
    if (!desktop) {
      return '<div class="preview-note">AI generated · Blocking works only in the Concentr8 app for Mac. In the browser your list is saved, but nothing is closed. Download the app on concentr8.github.io.</div>';
    }
    if (!['darwin', 'win32', 'linux'].includes(desktop.platform)) {
      return '<div class="preview-note">AI generated · Blocking is not available on this system. Your list is saved.</div>';
    }
    const signedIn = !!connection();
    return `<div class="preview-note">AI generated · Blocking is on in every focus session as soon as your list has an app. <span data-block-live>${esc(liveText())}</span>
      <details><summary>How it works</summary>
      ${OS_HINT[desktop.platform] || ''}Concentr8 looks at your screen every few seconds. If you open something on your list, you get a notification and 15 seconds to switch back. After that the tab is closed (your browser goes back to your last work page) or the app is hidden. Breaks are never blocked.<br>
      ${desktop.platform === 'darwin' ? 'The first time, macOS asks if Concentr8 may control your browser and System Events. Click Allow. Firefox also needs Accessibility (System Settings, Privacy &amp; Security).' : ''}</details>
      <label><input type="checkbox" data-ai-check ${aiCheck && signedIn ? 'checked' : ''} ${signedIn ? '' : 'disabled'}> Let AI check that my screen fits my task ${signedIn ? '' : '(first set up Profile, Phone call)'}</label>
      <details><summary>What the AI check sends</summary>The app name, page title and web address of pages that your list does not cover go to the Concentr8 server and are judged by Claude. Nothing is stored.</details>
      <button class="wire-button" type="button" data-block-test>Test notification and permissions</button> <span data-block-test-result>${esc(testMessage)}</span></div>`;
  }

  document.addEventListener('change', (e) => {
    if (!e.target.matches || !e.target.matches('[data-ai-check]')) return;
    aiCheck = e.target.checked;
    saveAiCheck();
    sync().catch(() => {});
  });

  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-block-test]');
    if (!b || !desktop) return;
    const result = await desktop.test();
    testMessage = result.activity
      ? `Works. Right now Concentr8 sees: ${result.activity}.`
      : 'Notification sent, but the screen cannot be read yet. On Mac: allow Concentr8 under System Settings, Privacy & Security, Automation. On Linux: install xdotool.';
    const el = document.querySelector('[data-block-test-result]');
    if (el) el.textContent = testMessage; else repaint();
  });

  window.Concentr8Blocker = { panel };
})();
