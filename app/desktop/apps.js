// Purpose: turns the names in the student's block list ("YouTube", "Steam") into rules the blocker understands.
// Called by: app/desktop/blocker.js when a focus session starts.
// Calls: nothing.
// Why: Jack's Block App page stores plain names. The blocker needs app names (for programs) and domains (for websites).

// Names Jack's page offers (presets and search), with the program name on the Mac and the websites behind it.
const KNOWN = {
  steam: { apps: ['Steam'], domains: ['steampowered.com', 'steamcommunity.com'] },
  twitch: { apps: ['Twitch'], domains: ['twitch.tv'] },
  discord: { apps: ['Discord'], domains: ['discord.com'] },
  'epic games': { apps: ['Epic Games Launcher'], domains: ['epicgames.com'] },
  youtube: { apps: [], domains: ['youtube.com'] },
  tiktok: { apps: ['TikTok'], domains: ['tiktok.com'] },
  instagram: { apps: ['Instagram'], domains: ['instagram.com'] },
  reddit: { apps: [], domains: ['reddit.com'] },
  x: { apps: [], domains: ['x.com', 'twitter.com'] },
  facebook: { apps: [], domains: ['facebook.com'] },
  slack: { apps: ['Slack'], domains: ['slack.com'] },
  'microsoft teams': { apps: ['Microsoft Teams'], domains: ['teams.microsoft.com'] },
  whatsapp: { apps: ['WhatsApp'], domains: ['web.whatsapp.com'] },
  netflix: { apps: ['Netflix'], domains: ['netflix.com'] },
};

// Study sites that are never blocked by a domain rule, unless the student blocked that very site on purpose.
const ALWAYS_ALLOWED = ['docs.google.com', 'overleaf.com', 'github.com', 'localhost', 'instructure.com', 'gradescope.com'];

const looksLikeDomain = (name) => /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(name);

function rulesFromNames(names) {
  const blockedApps = new Set();
  const blockedDomains = new Set();
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    const known = KNOWN[name.toLowerCase()];
    if (known) {
      known.apps.forEach((a) => blockedApps.add(a));
      known.domains.forEach((d) => blockedDomains.add(d));
    } else if (looksLikeDomain(name)) {
      blockedDomains.add(name.toLowerCase());
    } else {
      // Why both: an unknown name can be a program on the Mac, and its window title is also checked in browsers.
      blockedApps.add(name);
    }
  }
  const allowedDomains = ALWAYS_ALLOWED.filter((d) => ![...blockedDomains].some((b) => b === d || d.endsWith('.' + b)));
  return { blockedApps: [...blockedApps], blockedDomains: [...blockedDomains], allowedDomains };
}

module.exports = { rulesFromNames };
