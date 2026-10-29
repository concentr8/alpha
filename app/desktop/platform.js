// Purpose: asks macOS what is in front (program, browser address, window title) and pushes distractions away.
// Called by: app/desktop/blocker.js.
// Calls: osascript (AppleScript), only on macOS. Windows and Linux are in platform-other.js; any other system uses a "null" platform that blocks nothing.
// Origin: ported from the old Mac app (intentguard-v2/src/services/platform.ts).
// Permissions on the first run, macOS asks:
//   - "Concentr8 wants to control Google Chrome / Safari / System Events" (Automation) -> Allow
//   - Firefox titles and closing Firefox tabs also need Accessibility:
//     System Settings -> Privacy & Security -> Accessibility -> enable Concentr8.
const { execFile } = require('node:child_process');
const { SCRIPTABLE_BROWSERS, TITLE_ONLY_BROWSERS } = require('./rules');
const { createWindowsPlatform, createLinuxPlatform } = require('./platform-other');

const SEPARATOR = '\x1e'; // splits address and title in one AppleScript answer

function osascript(lines, timeoutMs = 2500) {
  const args = lines.flatMap((l) => ['-e', l]);
  return new Promise((resolve, reject) => {
    execFile('osascript', args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

// Makes a value safe inside an AppleScript string, so a page title can never run code.
const asString = (value) => '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

// System Events reports some programs differently ("firefox"); map them to their real names.
const canonicalApp = (name) => [...SCRIPTABLE_BROWSERS, ...TITLE_ONLY_BROWSERS].find((k) => k.toLowerCase() === name.toLowerCase()) || name;

const isSafari = (app) => app === 'Safari';
const isChromium = (app) => SCRIPTABLE_BROWSERS.includes(app) && !isSafari(app);
const isTitleOnly = (app) => TITLE_ONLY_BROWSERS.includes(app);

function splitDetails(output) {
  const at = output.indexOf(SEPARATOR);
  if (at === -1) return { url: output || null, title: null };
  return { url: output.slice(0, at) || null, title: output.slice(at + 1) || null };
}

const FRONT_PROCESS = 'tell application "System Events" to get name of first application process whose frontmost is true';

// runScript can be replaced in tests, so no Mac is needed to check the logic.
function createMacPlatform(runScript = osascript) {
  let lastProcessName = '';
  return {
    supported: true,

    async activity() {
      let processName;
      try {
        processName = await runScript([FRONT_PROCESS]);
      } catch (_) {
        return null; // no Automation permission for System Events yet
      }
      lastProcessName = processName;
      const app = canonicalApp(processName);
      let url = null;
      let title = null;
      try {
        if (isChromium(app)) {
          ({ url, title } = splitDetails(await runScript([
            `tell application ${asString(app)}`, 'if (count of windows) > 0 then',
            'set activeUrl to URL of active tab of front window', 'set activeTitle to title of active tab of front window',
            'return activeUrl & (ASCII character 30) & activeTitle', 'end if', 'end tell',
          ])));
        } else if (isSafari(app)) {
          ({ url, title } = splitDetails(await runScript([
            'tell application "Safari"', 'if (count of windows) > 0 then',
            'set activeUrl to URL of current tab of front window', 'set activeTitle to name of current tab of front window',
            'return activeUrl & (ASCII character 30) & activeTitle', 'end if', 'end tell',
          ])));
        } else if (isTitleOnly(app)) {
          title = await runScript([
            `tell application "System Events" to tell process ${asString(processName)}`,
            'if (count of windows) > 0 then return name of front window', 'end tell',
          ]);
        }
      } catch (_) { /* permission missing or window closing; the program is still reported */ }
      return { app, url: url || null, title: title || null, at: Date.now() };
    },

    // Replace the active tab's page with `url`.
    async redirect(app, url) {
      try {
        if (isChromium(app)) await runScript([`tell application ${asString(app)} to set URL of active tab of front window to ${asString(url)}`]);
        else if (isSafari(app)) await runScript([`tell application "Safari" to set URL of current tab of front window to ${asString(url)}`]);
        else return false;
        return true;
      } catch (_) { return false; }
    },

    async closeTab(app) {
      try {
        if (isChromium(app)) await runScript([`tell application ${asString(app)} to close active tab of front window`]);
        else if (isSafari(app)) await runScript(['tell application "Safari" to close current tab of front window']);
        else if (isTitleOnly(app)) {
          // Firefox has no tab scripting: press Cmd+W, but only if it is still in front.
          if (canonicalApp(await runScript([FRONT_PROCESS])) !== app) return false;
          await runScript(['tell application "System Events" to keystroke "w" using command down']);
        } else return false;
        return true;
      } catch (_) { return false; }
    },

    async hideApp(app) {
      const processName = canonicalApp(lastProcessName) === app ? lastProcessName : app;
      try {
        await runScript([`tell application "System Events" to set visible of process ${asString(processName)} to false`]);
        return true;
      } catch (_) { return false; }
    },
  };
}

// Other systems: nothing can be seen or blocked.
function createNullPlatform() {
  return { supported: false, activity: async () => null, redirect: async () => false, closeTab: async () => false, hideApp: async () => false };
}

function createPlatform(os = process.platform) {
  if (os === 'darwin') return createMacPlatform();
  if (os === 'win32') return createWindowsPlatform();
  if (os === 'linux') return createLinuxPlatform();
  return createNullPlatform();
}

module.exports = { createPlatform, createMacPlatform, createNullPlatform, asString, canonicalApp };
