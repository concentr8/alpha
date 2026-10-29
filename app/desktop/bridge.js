// Purpose: connects the web page to the blocker. The page calls window.concentr8Desktop (see app/preload.js); this file
//          answers in the main process and shows the notifications.
// Called by: app/main.js.
// Calls: app/desktop/blocker.js, app/desktop/relevance.js, app/desktop/platform.js, Electron's ipcMain and Notification.
const { createBlocker } = require('./blocker');
const { createCachedJudge, createServerAsker } = require('./relevance');
const { createPlatform } = require('./platform');

const CHANNELS = { start: 'concentr8:start', stop: 'concentr8:stop', pause: 'concentr8:pause', status: 'concentr8:status', test: 'concentr8:test', changed: 'concentr8:changed' };

// Only an https address of the Concentr8 server is accepted, so the token cannot be sent anywhere else by a bad page.
const safeServer = (server) => (server && /^https:\/\/[^/\s]+$/.test(server.url || '') && typeof server.token === 'string' ? server : null);

function setupBridge({ ipcMain, Notification, getWindow }) {
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
  return blocker;
}

module.exports = { setupBridge, CHANNELS, safeServer };
