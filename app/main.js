// Purpose: opens Jack's web app (frontend/index.html) in a normal desktop window and starts the blocker.
// Called by: Electron, as the "main" file in app/package.json.
// Calls: app/desktop/bridge.js (blocking, notifications, AI check), app/preload.js (the door for the page) and,
//        in the demo build, app/desktop/demo-menu.js (the Demo menu).
const { app, BrowserWindow, shell, ipcMain, Notification, Menu } = require('electron');
const path = require('node:path');
const { setupBridge } = require('./desktop/bridge');
const { opensInBrowser } = require('./desktop/links');
const { demoMenuTemplate } = require('./desktop/demo-menu');

// Why two places: when the app is packaged, electron-builder copies frontend/ next to the app
// (see "extraResources" in package.json). When started from the repo, we use the folder itself.
function frontendFile() {
  const folder = app.isPackaged ? path.join(process.resourcesPath, 'frontend') : path.join(__dirname, '..', 'frontend');
  return path.join(folder, 'index.html');
}

function openWindow() {
  // DEMO: 1440 x 810 content, 16:9 like the video, and it fits a 13- or 14-inch MacBook screen.
  const win = new BrowserWindow({
    width: 1440,
    height: 810,
    useContentSize: true,
    minWidth: 760, // the frontend has a minimum width of 760px (docs/design.md)
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(frontendFile());

  // Why: links to other sites open in the normal browser, so the app window never leaves the app. This includes the Google
  // sign-in (ADR 0035). Empty windows ("about:blank") are refused quietly, so the page knows it must use the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (opensInBrowser(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// DEMO: the Demo menu runs small commands in the page (window.Concentr8Demo, frontend/demo/demo-mode.js).
function setupDemoMenu() {
  const win = () => BrowserWindow.getAllWindows()[0];
  const run = (js) => { const w = win(); if (w) w.webContents.executeJavaScript(js).catch(() => {}); };
  // Content size, not window size: the recorded page is exactly 16:9 (the title bar is not part of it).
  const setSize = (width, height) => { const w = win(); if (!w) return; if (w.isFullScreen()) w.setFullScreen(false); w.setContentSize(width, height, true); w.center(); };
  Menu.setApplicationMenu(Menu.buildFromTemplate(demoMenuTemplate({ run, setSize, isMac: process.platform === 'darwin' })));
}

app.whenReady().then(() => {
  setupBridge({ ipcMain, Notification, getWindow: () => BrowserWindow.getAllWindows()[0], app });
  setupDemoMenu();
  openWindow();
  // DEMO: the CI smoke test of the built app (app/desktop/demo-smoke.js, .github/workflows/app-demo.yml).
  if (process.env.CONCENTR8_SMOKE === '1') require('./desktop/demo-smoke').runSmoke({ app, BrowserWindow, Menu });
  // Why: on a Mac, clicking the dock icon after closing the window should bring the window back.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

// Why: on a Mac apps stay open without a window until the user quits; on Windows and Linux we quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
