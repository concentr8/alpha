// Purpose: the AI check. When the plain rules cannot tell, Claude (asked through the Concentr8 server) judges whether
//          the page or program on screen fits the task of the session.
// Called by: app/desktop/blocker.js.
// Calls: app/desktop/rules.js, and the server route POST /api/relevance (server/index.js) with the student's token.
// Origin: ported from the old Mac app (semantic.ts, semanticServer.ts).
// Privacy: only the task, the program name, the page title and host/path/search query leave the computer, and only for
//          pages the plain rules could not judge. No API key is in the app; the server holds it.
const { classify, isBlankBrowserActivity } = require('./rules');

// Why 0.85: a wrong block is worse than a missed one, so Claude must be quite sure.
const CONFIDENCE_THRESHOLD = 0.85;

const compact = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

// Host, path and search query only: enough to judge a page without sending every parameter.
function usefulLocation(raw) {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const query = ['q', 'query', 'search', 'search_query', 'keyword', 'keywords'].map((k) => url.searchParams.get(k)).find(Boolean);
    return compact(`${url.hostname}${decodeURIComponent(url.pathname)}${query ? `; query: ${query}` : ''}`, 500);
  } catch (_) {
    return compact(String(raw).split('?')[0], 500);
  }
}

// askServer(body) -> { relevance, confidence, reason }; it throws when the server is not reachable.
function createServerAsker(getServer, fetchImpl = fetch) {
  return async (body) => {
    const server = getServer();
    if (!server || !server.url || !server.token) throw new Error('No Concentr8 server connected');
    const res = await fetchImpl(`${server.url}/api/relevance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${server.token}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Server answered ${res.status}`);
    return res.json();
  };
}

const uncertain = (reason) => ({ relevance: 'uncertain', confidence: 0, reason });

// One question per task + program + page, so the same page is not sent to Claude again and again.
function createCachedJudge(askServer, log = () => {}) {
  const cache = new Map();
  return {
    clear: () => cache.clear(),
    judge({ activity, intent }) {
      const key = JSON.stringify([intent.trim().toLowerCase(), activity.app.toLowerCase(), activity.title || '', activity.url || '']);
      if (cache.has(key)) return cache.get(key);
      const request = askServer({
        intent: compact(intent, 300), app: compact(activity.app, 100), title: compact(activity.title, 300),
        location: usefulLocation(activity.url), task: null,
      }).then((a) => {
        const confidence = Number(a && a.confidence);
        if (!['relevant', 'unrelated', 'uncertain'].includes(a && a.relevance) || !(confidence >= 0 && confidence <= 1)) return uncertain('Invalid answer');
        return { relevance: a.relevance, confidence, reason: compact(a.reason, 160) };
      }).catch(() => {
        log('[relevance] server unavailable; neutral');
        return uncertain('Server unavailable');
      });
      cache.set(key, request);
      return request;
    },
  };
}

// Plain rules first (free, instant); Claude only for what stays neutral.
async function judgeActivity(context, rules, judge) {
  const plain = classify(context, rules);
  if (plain.kind !== 'neutral' || isBlankBrowserActivity(context.activity) || !judge) return plain;
  const answer = await judge.judge(context);
  if (answer.confidence < CONFIDENCE_THRESHOLD) return plain;
  if (answer.relevance === 'relevant') return { kind: 'focus' };
  if (answer.relevance === 'unrelated') return { kind: 'distraction', reason: answer.reason || 'Not related to your task' };
  return plain;
}

module.exports = { judgeActivity, createCachedJudge, createServerAsker, usefulLocation, CONFIDENCE_THRESHOLD };
