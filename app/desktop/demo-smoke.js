// Purpose: the smoke test of the demo app, run by CI on the built Mac app (and on Linux with a virtual screen):
//          the page loads from the app folder, the mock data is there, the Demo menu exists, scene 4 opens a running
//          focus session with the "I'm stuck" button, and the blocker starts. Prints one line "DEMO SMOKE OK {...}".
// Called by: app/main.js when the environment variable CONCENTR8_SMOKE=1 is set (.github/workflows/app-demo.yml).
// Calls: the window's page through executeJavaScript, the blocker through window.concentr8Desktop.status().
// DEMO ONLY: branch demo/video-2026-11-04, never merged.
const fs = require('node:fs');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Why a file as well: on a Mac, output into a pipe is written later, and the app may already be gone by then.
function defaultLog(line) {
  console.log(line);
  if (process.env.CONCENTR8_SMOKE_FILE) fs.appendFileSync(process.env.CONCENTR8_SMOKE_FILE, line + '\n');
}

// Waits until the page answers `check` with a truthy value, or gives up after `ms`.
async function until(win, check, ms = 15000) {
  for (const end = Date.now() + ms; Date.now() < end; await wait(300)) {
    const value = await win.webContents.executeJavaScript(check).catch(() => null);
    if (value) return value;
  }
  return null;
}

async function runSmoke({ app, BrowserWindow, Menu, log = defaultLog }) {
  const errors = [];
  const fail = (why) => { log('DEMO SMOKE FAILED: ' + why + (errors.length ? ' | page errors: ' + errors.join(' | ') : '')); setTimeout(() => app.exit(1), 300); };
  const timer = setTimeout(() => fail('took longer than 90 seconds'), 90000);
  let win = null;
  for (let i = 0; i < 50 && !win; i++) { win = BrowserWindow.getAllWindows()[0] || null; if (!win) await wait(200); }
  if (!win) return fail('no window');
  win.webContents.on('console-message', (...args) => {
    // Electron 37 hands one event object; older versions hand (event, level, message).
    const e = args[0] && typeof args[0] === 'object' && 'message' in args[0] ? args[0] : { level: args[1], message: args[2] };
    if (e.level === 'error' || e.level === 3) errors.push(String(e.message).slice(0, 200));
  });
  const first = await until(win, "window.Concentr8Demo && window.Articul8 && JSON.stringify({ scene: Concentr8Demo.scene, tasks: Articul8.state.tasks.length, desktop: !!window.concentr8Desktop, title: document.title })");
  if (!first) return fail('the page did not load with the demo build');
  const menu = Menu.getApplicationMenu();
  const demoMenu = menu && menu.items.find((i) => i.label === 'Demo');
  if (!demoMenu || demoMenu.submenu.items.filter((i) => /^Scene \d/.test(i.label)).length !== 5) return fail('no Demo menu with 5 scenes');
  // Scene 4: what the Demo menu does, then the page reloads into a running focus session.
  await win.webContents.executeJavaScript('Concentr8Demo.prepareScene(4)').catch(() => null);
  await wait(1500);
  const four = await until(win, "location.hash.startsWith('#focus') && Articul8.state.activeSession && document.querySelector('[data-demo-stuck]') && JSON.stringify({ scene: Concentr8Demo.scene, session: Articul8.state.activeSession.status, task: Articul8.state.activeSession.taskTitle })");
  if (!four) return fail('scene 4 did not open a focus session with the "I\'m stuck" button');
  const blocker = await until(win, "window.concentr8Desktop.status().then((s) => s.running && JSON.stringify(s))", 10000);
  if (!blocker) return fail('the blocker did not start in the focus session');
  // Scene 1 again, so a person who opens the app after the test starts at the beginning.
  await win.webContents.executeJavaScript('Concentr8Demo.prepareScene(1)').catch(() => null);
  await wait(1500);
  const one = await until(win, "location.hash.startsWith('#courses') && Concentr8Demo.scene === 1 && !Articul8.state.canvas.syncedAt && 'ok'");
  if (!one) return fail('scene 1 did not come back');
  clearTimeout(timer);
  log('DEMO SMOKE OK ' + JSON.stringify({ first: JSON.parse(first), scene4: JSON.parse(four), blocker: JSON.parse(blocker), errors }));
  setTimeout(() => app.exit(0), 300);
}

module.exports = { runSmoke };
