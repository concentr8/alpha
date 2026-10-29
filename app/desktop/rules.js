// Purpose: decides whether what is on the screen is work, neutral or a distraction. Pure functions, easy to test.
// Called by: app/desktop/relevance.js (and its tests).
// Calls: nothing.
// Origin: ported from the old Mac app (intentguard-v2/src/services/rules.ts), without the Berkeley and Canvas special cases.

const SELF_APPS = ['Concentr8', 'Electron']; // the app itself while it runs from the repo

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'app', 'assignment', 'build', 'complete', 'continue', 'course', 'courses', 'dashboard', 'demo', 'do',
  'document', 'docs', 'finish', 'for', 'from', 'github', 'google', 'home', 'homework', 'in', 'into', 'login', 'make', 'my',
  'of', 'on', 'page', 'project', 'search', 'start', 'task', 'the', 'this', 'to', 'with', 'work', 'working',
]);

// Browsers whose active tab address we can read and change.
const SCRIPTABLE_BROWSERS = ['Google Chrome', 'Arc', 'Brave Browser', 'Microsoft Edge', 'Safari'];
// Browsers we can only see through the window title.
const TITLE_ONLY_BROWSERS = ['Firefox', 'Zen'];

const isBrowser = (app) => SCRIPTABLE_BROWSERS.includes(app) || TITLE_ONLY_BROWSERS.includes(app);

function isExplicitBlankUrl(raw) {
  const url = raw.trim().toLowerCase();
  if (url === 'about:blank' || url === 'about:newtab') return true;
  if (/^(favorites|topsites):\/\//.test(url)) return true; // Safari's start page
  return /^(chrome|edge|brave|arc):\/\/(newtab|new-tab-page)\/?(?:[?#].*)?$/.test(url);
}

// Why exact cases only: a real page that happens to be called "New Tab" must still be judged.
function isBlankBrowserActivity(activity) {
  if (!isBrowser(activity.app)) return false;
  if (activity.url && isExplicitBlankUrl(activity.url)) return true;
  return (activity.title || '').trim().toLowerCase() === 'new tab' && !(activity.url || '').trim();
}

function parseUrl(raw) {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    return { host: u.hostname.replace(/^www\./, '').toLowerCase(), path: u.pathname.toLowerCase() };
  } catch (_) {
    return null;
  }
}

// "linkedin.com/feed" matches the host or any subdomain; an optional path part must be a prefix.
function matchesDomainRule(rule, host, path) {
  const clean = rule.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (!clean) return false;
  const slash = clean.indexOf('/');
  const ruleHost = slash === -1 ? clean : clean.slice(0, slash);
  const rulePath = slash === -1 ? '' : clean.slice(slash);
  const hostOk = host === ruleHost || host.endsWith('.' + ruleHost);
  return hostOk && (rulePath === '' || path.startsWith(rulePath));
}

// "youtube.com" -> "youtube", used to spot a site in the window title of Firefox.
function titleKeyword(rule) {
  const parts = rule.toLowerCase().replace(/^www\./, '').split('/')[0].split('.');
  return parts.length > 1 ? parts[parts.length - 2] : parts[0];
}

function tokens(text) {
  const raw = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) || [];
  const expanded = [...raw];
  // "math 185" becomes "math185", but "Concentr8" or "HW8" never turn into a lone digit that matches other tasks.
  for (let i = 0; i < raw.length - 1; i++) {
    if (/^[a-z]{2,4}$/.test(raw[i]) && /^\d{2,3}$/.test(raw[i + 1])) expanded.push(raw[i] + raw[i + 1]);
  }
  return new Set(expanded.filter((t) => !STOP_WORDS.has(t) && (/^\d+$/.test(t) ? t.length >= 2 : t.length >= 3)));
}

function activityEvidence(activity) {
  const parts = [activity.title || ''];
  if (!activity.url) return parts.join(' ');
  try {
    const url = new URL(activity.url);
    let path = url.pathname;
    try { path = decodeURIComponent(path); } catch (_) { /* a broken escape must not hide the title */ }
    parts.push(path, ...url.searchParams.values());
  } catch (_) { /* an invalid address gives no evidence */ }
  return parts.join(' ');
}

function hasStrongIntentOverlap({ activity, intent }) {
  const wanted = tokens(intent);
  const seen = tokens(activityEvidence(activity));
  const shared = [...wanted].filter((t) => seen.has(t));
  const words = shared.filter((t) => /[a-z]/.test(t));
  if (words.some((t) => /[a-z]\d|\d[a-z]/.test(t))) return true;
  if (words.some((t) => t.length >= 7)) return true;
  return shared.length >= 2 && words.length >= 1;
}

// Returns { kind: 'focus' | 'neutral' | 'distraction', reason? }.
function classify(context, rules) {
  const { activity } = context;
  const app = activity.app;

  if (isBlankBrowserActivity(activity)) return { kind: 'neutral' };
  if (rules.blockedApps.some((a) => a.toLowerCase() === app.toLowerCase())) return { kind: 'distraction', reason: app };

  if (activity.url) {
    const parsed = parseUrl(activity.url);
    if (!parsed) return { kind: 'neutral' };
    const allowed = rules.allowedDomains.some((r) => matchesDomainRule(r, parsed.host, parsed.path));
    const hit = rules.blockedDomains.find((r) => matchesDomainRule(r, parsed.host, parsed.path));
    if (hit && !allowed) return { kind: 'distraction', reason: hit };
    return hasStrongIntentOverlap(context) ? { kind: 'focus' } : { kind: 'neutral' };
  }

  if (activity.title && isBrowser(app)) {
    const title = activity.title.toLowerCase();
    const hit = rules.blockedDomains.find((r) => {
      const word = titleKeyword(r);
      // Why 4+: a short keyword such as "x" would match almost every title.
      return word.length >= 4 && new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(title);
    });
    if (hit) return { kind: 'distraction', reason: hit };
  }

  if (hasStrongIntentOverlap(context)) return { kind: 'focus' };
  if (SELF_APPS.some((a) => a.toLowerCase() === app.toLowerCase())) return { kind: 'focus' };
  return { kind: 'neutral' };
}

module.exports = { classify, isBrowser, isBlankBrowserActivity, parseUrl, matchesDomainRule, SCRIPTABLE_BROWSERS, TITLE_ONLY_BROWSERS };
