// Purpose: the same screen reading and blocking as platform.js, for Windows (PowerShell) and Linux (xdotool).
// Called by: app/desktop/platform.js (createPlatform picks the right one).
// Calls: powershell.exe on Windows, xdotool on Linux (X11 only). No new dependency in the app.
// Limits, said plainly: here we only see the program name and the window title, never the web address. So websites
//   are found by the words in the title ("Funny cats - YouTube - Google Chrome"), and a blocked tab is closed with
//   Ctrl+W (the browser cannot be sent back to the last work page). Linux needs xdotool installed and no Wayland.
// Not tried on a real Windows or Linux computer yet; the tests use fake command output.
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const { SCRIPTABLE_BROWSERS, TITLE_ONLY_BROWSERS } = require('./rules');

const BROWSERS = [...SCRIPTABLE_BROWSERS, ...TITLE_ONLY_BROWSERS];

// Program (process) names to the names used in the block list and the rules.
const FRIENDLY = {
  chrome: 'Google Chrome', 'google-chrome': 'Google Chrome', msedge: 'Microsoft Edge', 'microsoft-edge': 'Microsoft Edge',
  brave: 'Brave Browser', 'brave-browser': 'Brave Browser', firefox: 'Firefox', 'firefox-esr': 'Firefox', zen: 'Zen',
  'ms-teams': 'Microsoft Teams', teams: 'Microsoft Teams', steamwebhelper: 'Steam', epicgameslauncher: 'Epic Games Launcher',
};
const friendly = (name) => FRIENDLY[name.toLowerCase().replace(/\.exe$/, '')] || name.replace(/\.exe$/, '');

function run(file, args, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

// ---------- Windows ----------

// One PowerShell call reads the front window; `action` then does something to that same window.
const WIN_HEAD = `Add-Type -Namespace C8 -Name W -MemberDefinition '[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);'
$h = [C8.W]::GetForegroundWindow(); $sb = New-Object System.Text.StringBuilder 512; [void][C8.W]::GetWindowText($h, $sb, 512)
$p = 0; [void][C8.W]::GetWindowThreadProcessId($h, [ref]$p); $n = (Get-Process -Id $p).ProcessName`;
const WIN_READ = `${WIN_HEAD}\n"$n\`t$($sb.ToString())"`;
// $want is checked first: nothing is touched if the student already switched to another program.
const winAct = (want, action) => `${WIN_HEAD}\nif ($n -ne '${want.replace(/'/g, "''")}') { 'no'; exit }\n${action}\n'ok'`;
const WIN_MINIMIZE = '[void][C8.W]::ShowWindow($h, 6)';
const WIN_CLOSE_TAB = "(New-Object -ComObject WScript.Shell).SendKeys('^w')";

function createWindowsPlatform(exec = run) {
  const ps = (script) => exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  let lastProcess = '';
  const act = async (app, action) => {
    try { return (await ps(winAct(lastProcess || app, action))) === 'ok'; } catch (_) { return false; }
  };
  return {
    supported: true,
    async activity() {
      try {
        const [processName, ...title] = (await ps(WIN_READ)).split('\t');
        if (!processName) return null;
        lastProcess = processName;
        return { app: friendly(processName), url: null, title: title.join('\t') || null, at: Date.now() };
      } catch (_) { return null; }
    },
    redirect: async () => false, // the address cannot be changed here; the blocker falls back to closing the tab
    closeTab: (app) => (BROWSERS.includes(app) ? act(app, WIN_CLOSE_TAB) : Promise.resolve(false)),
    hideApp: (app) => act(app, WIN_MINIMIZE),
  };
}

// ---------- Linux (X11) ----------

function createLinuxPlatform(exec = run, readComm = (pid) => fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim()) {
  const xdo = (...args) => exec('xdotool', args, 2500);
  async function front() {
    const title = await xdo('getactivewindow', 'getwindowname');
    const pid = await xdo('getactivewindow', 'getwindowpid');
    return { name: friendly(readComm(pid)), title };
  }
  return {
    supported: true,
    async activity() {
      try {
        const { name, title } = await front();
        return { app: name, url: null, title: title || null, at: Date.now() };
      } catch (_) { return null; } // xdotool missing, or Wayland: nothing can be seen
    },
    redirect: async () => false,
    async closeTab(app) {
      try {
        if (!BROWSERS.includes(app) || (await front()).name.toLowerCase() !== app.toLowerCase()) return false;
        await xdo('key', '--clearmodifiers', 'ctrl+w');
        return true;
      } catch (_) { return false; }
    },
    async hideApp(app) {
      try {
        if ((await front()).name.toLowerCase() !== app.toLowerCase()) return false;
        await xdo('getactivewindow', 'windowminimize');
        return true;
      } catch (_) { return false; }
    },
  };
}

module.exports = { createWindowsPlatform, createLinuxPlatform, friendly };
