// Purpose: the focus loop. During a focus session it looks at the screen every few seconds, warns on a distraction,
//          closes it if the student stays, and sends the browser back to the last work page.
// Called by: app/main.js (through app/desktop/bridge.js).
// Calls: app/desktop/platform.js (screen and blocking), app/desktop/relevance.js (rules + AI check), a notify function.
// Origin: ported from the old Mac app (intentguard-v2/src/services/focus.ts), as plain JavaScript.
const { SCRIPTABLE_BROWSERS, TITLE_ONLY_BROWSERS } = require('./rules');
const { rulesFromNames } = require('./apps');
const { judgeActivity } = require('./relevance');

const TICK_MS = 3000;
const GRACE_SECONDS = 15; // time to switch back before the distraction is closed
// After a block, the same distraction is closed again at once for this long, without a second warning.
const REPEAT_WINDOW_MS = 2 * 60_000;

// Browser start pages (Safari favorites://) cannot be restored by script, so only real pages count as a work tab.
const isRestorableUrl = (url) => !!url && /^(https?|file):\/\//i.test(url.trim());

// deps: { platform, judge, notify(title, body), onChange(status), now?, setTimer?, clearTimer? }
function createBlocker(deps) {
  const now = deps.now || Date.now;
  let session = null; // { task, rules, aiCheck }
  let timer = null;
  let busy = false;
  let paused = false;
  let drift = null; // { target, since }
  let lastRelevantUrl = null;
  const lastBlocked = new Map();
  let status = { running: false, supported: deps.platform.supported, paused: false, current: null, verdict: null, nudges: 0, blocks: 0 };

  const publish = () => deps.onChange({ ...status });

  function resetCounters() {
    drift = null;
    lastRelevantUrl = null;
    lastBlocked.clear();
    if (deps.judge) deps.judge.clear();
  }

  async function block(activity, target) {
    const { platform } = deps;
    const app = activity.app;
    let done = false;
    let where = '';
    if (SCRIPTABLE_BROWSERS.includes(app)) {
      if (isRestorableUrl(lastRelevantUrl)) {
        done = await platform.redirect(app, lastRelevantUrl);
        where = 'your last work page';
      }
      if (!done) done = await platform.closeTab(app);
    } else if (TITLE_ONLY_BROWSERS.includes(app)) {
      done = await platform.closeTab(app);
    } else {
      done = await platform.hideApp(app);
    }
    deps.notify(
      done ? `Closed ${target}` : `Still on ${target}?`,
      done
        ? `Back to "${session.task}"${where ? `. I opened ${where}.` : '.'}`
        : `I could not close it. Check the permissions (Profile, Block App). You said you would do "${session.task}".`,
    );
    return done;
  }

  async function step() {
    const current = session;
    const activity = await deps.platform.activity();
    if (session !== current) return; // stopped while we were looking
    if (!activity) { status = { ...status, current: null, verdict: null }; return publish(); }
    const verdict = await judgeActivity({ activity, intent: current.task }, current.rules, current.aiCheck ? deps.judge : null);
    if (session !== current) return;
    status = { ...status, current: activity.app, verdict: verdict.kind };

    if (verdict.kind !== 'distraction') {
      drift = null;
      if (isRestorableUrl(activity.url) && (verdict.kind === 'focus' || !lastRelevantUrl)) lastRelevantUrl = activity.url;
      return publish();
    }
    if (paused) { drift = null; return publish(); }

    const target = verdict.reason;
    const t = now();
    const recentlyBlocked = t - (lastBlocked.get(target) ?? -Infinity) < REPEAT_WINDOW_MS;
    if (!drift || drift.target !== target) {
      drift = { target, since: t };
      if (!recentlyBlocked) {
        status = { ...status, nudges: status.nudges + 1 };
        deps.notify(`Back to: ${current.task}`, `${target} is not part of the plan. Switch back within ${GRACE_SECONDS}s or I will close it.`);
        return publish();
      }
    }
    if (recentlyBlocked || t - drift.since >= GRACE_SECONDS * 1000) {
      await block(activity, target);
      lastBlocked.set(target, t);
      drift = null;
      status = { ...status, blocks: status.blocks + 1 };
    }
    publish();
  }

  async function tick() {
    if (!session || busy) return;
    busy = true;
    try { await step(); } catch (_) { /* a failed look must never stop the loop */ } finally { busy = false; }
  }

  return {
    // task: what the student wants to do. names: the block list from Jack's page. aiCheck: also ask Claude.
    start({ task, names, aiCheck }) {
      resetCounters();
      session = { task: String(task || '').slice(0, 300), rules: rulesFromNames(names || []), aiCheck: !!aiCheck };
      paused = false;
      status = { running: true, supported: deps.platform.supported, paused: false, current: null, verdict: null, nudges: 0, blocks: 0 };
      clearInterval(timer);
      timer = setInterval(tick, TICK_MS);
      publish();
      return tick(); // the first look happens at once, not after three seconds
    },
    stop() {
      clearInterval(timer);
      timer = null;
      session = null;
      resetCounters();
      status = { ...status, running: false, paused: false, current: null, verdict: null };
      publish();
    },
    // A planned break: nothing is closed until it is over.
    pause(value) {
      paused = !!value;
      drift = null;
      status = { ...status, paused };
      publish();
    },
    status: () => ({ ...status }),
    tick,
  };
}

module.exports = { createBlocker, isRestorableUrl, GRACE_SECONDS };
