# Deploy the backend on Heroku

> Replaced on 2026-10-28: voice now runs on the Azure server (ADR 0023, docs/plans/voice-on-azure.md). Kept for history.

Status: Route A worked on 2026-10-23 (app `articul8-api`, /health showed
{"status":"ok"}). The first build failed with "APP_BASE was not set": the
config var `APP_BASE=backend` is required, the buildpacks alone are not enough.
Route B was not tried.

Why Heroku: Jonas has the GitHub Student credit ($13 per month for 24 months,
Heroku help page). An Eco dyno ($5 per month) falls under it. It sleeps after
30 minutes without requests, so open the site a few minutes before using it.

## What is in the repo
`backend/Procfile` tells Heroku how to start the app. The backend lives in the
folder `backend/`, not in the repo root, so Heroku needs one extra helper.

## Route A: all in the Heroku dashboard (no command line)
1. Create a NEW app (do not reuse another project's app). Region United States.
2. Settings, Buildpacks: add `https://github.com/lstoll/heroku-buildpack-monorepo`
   and `heroku/python`. The monorepo buildpack must be FIRST in the list.
3. Settings, Config Vars (secrets are typed here by Jonas, never in chat or git):
   - `APP_BASE` = `backend`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
   - `ALLOWED_ORIGINS` = address of the GitHub Pages site (the part before the path)
   - `VOICE_CACHE_DIR` = `/tmp/voice` (the app folder is not safe to write to)
4. Deploy, GitHub: connect the repo, choose branch `main`, deploy.
5. Open `https://<app-name>.herokuapp.com/health`. It must show `{"status":"ok"}`.
6. The frontend uses this address by default (ADR 0013). If the app name
   changes, update `DEFAULT_API` in frontend/index.html.

## Route B: command line (if A fails)
`heroku login`, `heroku git:remote -a <app-name>`, then from the repo root
`git subtree push --prefix backend heroku main`. Config vars as in step 3,
without `APP_BASE`.

## Known limits
- Spending limits (ADR 0011) count in memory and restart from zero when the
  app sleeps or restarts. They are a safety net, not a guarantee.
- Spoken audio saved in `/tmp` is lost when the app restarts. It is only a cache.
- Sleeping: the first request after 30 quiet minutes is slow.
