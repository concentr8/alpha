// Purpose: connects the web page to the blocker. The page calls window.concentr8Desktop (see app/preload.js); this file
//          answers in the main process and shows the notifications.
// Called by: app/main.js.
// Calls: app/desktop/blocker.js, app/desktop/relevance.js, app/desktop/platform.js, Electron's ipcMain and Notification.
const { createBlocker } = require('./blocker');
const { createCachedJudge, createServerAsker } = require('./relevance');
const { createPlatform } = require('./platform');

const CHANNELS = { start: 'concentr8:start', stop: 'concentr8:stop', pause: 'concentr8:pause', status: 'concentr8:status', test: 'concentr8:test', changed: 'concentr8:changed', demoFocus: 'concentr8:demo-focus', demoChrome: 'concentr8:demo-chrome' };

// Only an https address of the Concentr8 server is accepted, so the token cannot be sent anywhere else by a bad page.
const safeServer = (server) => (server && /^https:\/\/[^/\s]+$/.test(server.url || '') && typeof server.token === 'string' ? server : null);

function setupBridge({ ipcMain, Notification, getWindow, app }) {
  let server = null;
  const notify = (title, body) => { if (Notification.isSupported()) new Notification({ title, body }).show(); };
  const platform = createPlatform();
  const blocker = createBlocker({
    platform,
    judge: createCachedJudge(createServerAsker(() => server)),
    notify,
    onChange: (status) => { const win = getWindow(); if (win && !win.isDestroyed()) win.webContents.send(CHANNELS.changed, status); },
  });

  ipcMain.handle(CHANNELS.start, (_event, input) => {
    server = safeServer(input && input.server);
    blocker.start({ task: input && input.task, names: Array.isArray(input && input.names) ? input.names.slice(0, 100) : [], aiCheck: !!(input && input.aiCheck) && !!server });
    return blocker.status();
  });
  ipcMain.handle(CHANNELS.stop, () => { blocker.stop(); return blocker.status(); });
  ipcMain.handle(CHANNELS.pause, (_event, value) => { blocker.pause(value); return blocker.status(); });
  // The "Test" button: shows a notification and reads the front program once, which also makes macOS ask for permission.
  ipcMain.handle(CHANNELS.test, async () => {
    notify('Concentr8', 'Notifications work.');
    const seen = await platform.activity();
    return { activity: seen ? seen.app : null };
  });
  ipcMain.handle(CHANNELS.status, () => blocker.status());
  // DEMO: after a phone call the plan appears in the app; the window comes to the front so the video shows it.
  ipcMain.handle(CHANNELS.demoFocus, () => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return false;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    if (app && process.platform === 'darwin') app.focus({ steal: true });
    return true;
  });
  // DEMO: reads the address of Chrome's front tab once, so macOS asks "control Google Chrome?" before recording,
  // not in the middle of the blocking scene. Answers 'allowed', 'denied' or 'unsupported' (not a Mac).
  ipcMain.handle(CHANNELS.demoChrome, () => askChromeOnce(platform.runScript));
  return blocker;
}

async function askChromeOnce(runScript, os = process.platform) {
  if (os !== 'darwin' || !runScript) return 'unsupported';
  try {
    await runScript(['tell application "Google Chrome"', 'if (count of windows) = 0 then make new window', 'return URL of active tab of front window', 'end tell'], 30000);
    return 'allowed';
  } catch (_) { return 'denied'; }
}

module.exports = { setupBridge, CHANNELS, safeServer, askChromeOnce };
