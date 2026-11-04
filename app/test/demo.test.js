// Purpose: checks the desktop parts of the demo build: the Demo menu, the Chrome permission question, the shorter warning
//          time, the separate app identity and the doors the page gets.
// Called by: `npm test` in app/.
// Calls: app/desktop/demo-menu.js, app/desktop/bridge.js, app/desktop/blocker.js; reads app/package.json, app/preload.js
//        and frontend/concentr8-blocker.js as text.
// DEMO ONLY: branch demo/video-2026-11-04, never merged.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { demoMenuTemplate, SCENES, SIZES } = require('../desktop/demo-menu');
const { CHANNELS, askChromeOnce } = require('../desktop/bridge');
const { GRACE_SECONDS } = require('../desktop/blocker');
const pkg = require('../package.json');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the Demo menu jumps to every scene and sizes the window 16:9', () => {
  const ran = [];
  const sized = [];
  const menu = demoMenuTemplate({ run: (js) => ran.push(js), setSize: (w, h) => sized.push([w, h]), isMac: true });
  const demo = menu.find((m) => m.label === 'Demo');
  assert.ok(demo);
  assert.equal(menu[0].role, 'appMenu');
  const items = demo.submenu.filter((i) => i.click);
  items.forEach((i) => i.click());
  for (const [n] of SCENES) assert.ok(ran.includes(`window.Concentr8Demo && Concentr8Demo.prepareScene(${n})`), `scene ${n}`);
  assert.ok(ran.includes('window.Concentr8Demo && Concentr8Demo.reset()'));
  assert.ok(ran.includes("location.hash = '#profile/demo'"));
  assert.deepEqual(sized, SIZES);
  assert.ok(SIZES.every(([w, h]) => Math.abs(w / h - 16 / 9) < 0.01));
  const keys = items.map((i) => i.accelerator).filter(Boolean);
  assert.equal(new Set(keys).size, keys.length, 'no shortcut twice');
  assert.equal(demoMenuTemplate({ run() {}, setSize() {}, isMac: false })[0].role, 'fileMenu');
});

test('the Chrome permission is asked once, only on a Mac', async () => {
  assert.equal(await askChromeOnce(async () => 'https://inst.eecs.berkeley.edu/', 'linux'), 'unsupported');
  assert.equal(await askChromeOnce(undefined, 'darwin'), 'unsupported');
  let script = null;
  assert.equal(await askChromeOnce(async (lines) => { script = lines.join('\n'); return 'https://x'; }, 'darwin'), 'allowed');
  assert.match(script, /tell application "Google Chrome"/);
  assert.equal(await askChromeOnce(async () => { throw new Error('Not authorized to send Apple events'); }, 'darwin'), 'denied');
});

test('the page gets the demo doors, and nothing else is new', () => {
  assert.equal(CHANNELS.demoFocus, 'concentr8:demo-focus');
  assert.equal(CHANNELS.demoChrome, 'concentr8:demo-chrome');
  const preload = read('preload.js');
  assert.match(preload, /demoFocus: \(\) => ipcRenderer\.invoke\('concentr8:demo-focus'\)/);
  assert.match(preload, /demoChrome: \(\) => ipcRenderer\.invoke\('concentr8:demo-chrome'\)/);
});

test('the warning time is 10 seconds in the app and in the text the student reads', () => {
  assert.equal(GRACE_SECONDS, 10);
  assert.match(read('../frontend/concentr8-blocker.js'), /10 seconds to switch back/);
});

test('the demo app never replaces the real Concentr8 app or its data', () => {
  assert.equal(pkg.productName, 'Concentr8 Demo'); // other .app name, other data folder
  assert.equal(pkg.build.productName, 'Concentr8 Demo');
  assert.equal(pkg.build.appId, 'app.concentr8.demo');
  assert.match(pkg.version, /-demo$/);
  assert.match(pkg.build.artifactName, /^Concentr8-Demo-/);
});
