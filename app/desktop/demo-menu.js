// Purpose: the menu bar of the demo build: the usual app, Edit, View and Window menus plus a "Demo" menu that jumps to the
//          start of each recorded scene, resets the mock data, opens Demo setup and sizes the window for recording (16:9).
// Called by: app/main.js (Menu.buildFromTemplate) and app/test/demo.test.js.
// Calls: nothing itself; it gets run(js) for the page and setSize(width, height) for the window from main.js.
// DEMO ONLY: branch demo/video-2026-11-04, never merged.
const SCENES = [
  [1, 'Your semester, synced (Canvas + Calendar)'],
  [2, 'From overwhelm to a plan (AI chat)'],
  [3, 'Distractions, blocked (focus + blocking)'],
  [4, "When you're stuck, Concentr8 calls"],
  [5, 'Progress you can see (Data)'],
];
// Why these sizes: 16:9 like the video, and small enough for a 14-inch MacBook screen (1512 x 982 points).
const SIZES = [[1280, 720], [1440, 810], [1600, 900]];

function demoMenuTemplate({ run, setSize, isMac }) {
  const demo = {
    label: 'Demo',
    submenu: [
      ...SCENES.map(([n, label]) => ({ label: `Scene ${n}: ${label}`, accelerator: `CmdOrCtrl+Alt+${n}`, click: () => run(`window.Concentr8Demo && Concentr8Demo.prepareScene(${n})`) })),
      { type: 'separator' },
      { label: 'Reset demo data (back to scene 1)', accelerator: 'CmdOrCtrl+Alt+R', click: () => run('window.Concentr8Demo && Concentr8Demo.reset()') },
      { label: 'Demo setup (real calls, scenes)…', accelerator: 'CmdOrCtrl+Alt+0', click: () => run("location.hash = '#profile/demo'") },
      { type: 'separator' },
      ...SIZES.map(([w, h]) => ({ label: `Window ${w} × ${h} (16:9)`, click: () => setSize(w, h) })),
    ],
  };
  return [
    ...(isMac ? [{ role: 'appMenu' }] : [{ role: 'fileMenu' }]),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    demo,
    { role: 'windowMenu' },
  ];
}

module.exports = { demoMenuTemplate, SCENES, SIZES };
