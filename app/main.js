// Purpose: opens Jack's web app (frontend/index.html) in a normal desktop window.
// Called by: Electron, as the "main" file in app/package.json.
// Calls: nothing of ours. It only loads frontend/index.html, which is not changed (ADR 0001).
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

// Why two places: when the app is packaged, electron-builder copies frontend/ next to the app
// (see "extraResources" in package.json). When started from the repo, we use the folder itself.
function frontendFile() {
  const folder = app.isPackaged ? path.join(process.resourcesPath, 'frontend') : path.join(__dirname, '..', 'frontend');
  return path.join(folder, 'index.html');
}

function openWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 760, // the frontend has a minimum width of 760px (docs/design.md)
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadFile(frontendFile());

  // Why: links to other sites open in the normal browser, so the app window never leaves the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  openWindow();
  // Why: on a Mac, clicking the dock icon after closing the window should bring the window back.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openWindow();
  });
});

// Why: on a Mac apps stay open without a window until the user quits; on Windows and Linux we quit.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
