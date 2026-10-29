// Purpose: gives the web page a small, safe door to the desktop part: window.concentr8Desktop.
// Called by: Electron, as the preload script of the window in app/main.js.
// Calls: the main process (app/desktop/bridge.js) through ipcRenderer. Nothing else is exposed to the page.
// Why a plain script: sandboxed preload scripts cannot use import/export.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('concentr8Desktop', {
  platform: process.platform,
  start: (input) => ipcRenderer.invoke('concentr8:start', input),
  stop: () => ipcRenderer.invoke('concentr8:stop'),
  pause: (value) => ipcRenderer.invoke('concentr8:pause', value),
  test: () => ipcRenderer.invoke('concentr8:test'),
  status: () => ipcRenderer.invoke('concentr8:status'),
  onChange: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('concentr8:changed', listener);
    return () => ipcRenderer.removeListener('concentr8:changed', listener);
  },
});
