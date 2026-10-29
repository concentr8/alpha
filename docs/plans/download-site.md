# Plan: Download site, app builds and stable releases

Status: Approved by Jonas on 2026-10-28 ("ok", then "jetzt bauen").
Goal: people open `concentr8.github.io`, see Jack's design, and download the
Concentr8 Mac app (also Windows and Linux). Early testers can get beta builds.

## Two repositories only
| Repo | Holds |
|---|---|
| `concentr8/alpha` | All code and every build: web app (`frontend/`), app shell (`app/`), server, workflows. Beta builds are releases marked "Pre-release". |
| `concentr8/concentr8.github.io` | Only the website and the finished stable downloads (its Releases). |

The old Cal Hacks UI (`renderer/`) is dropped. The app shows Jack's
`frontend/index.html` unchanged (ADR 0001 stays).

## How a version travels
1. A merge to `main` that touches `app/` or `frontend/` builds Mac, Windows and
   Linux and publishes a beta, for example `v1.1.0-beta.4`, in `alpha`.
2. Jonas tests the beta.
3. Jonas runs the workflow "Promote to stable" in `alpha` (Actions, "Run
   workflow") and types the beta tag. The workflow copies exactly those tested
   files into a release `v1.1.0` in `concentr8.github.io` (build once, promote).
4. The website button uses `releases/latest/download/<file>` of its own repo, so
   it shows the new stable at once. The small beta link reads the newest
   Pre-release of `alpha` from the public GitHub API.

## What moves from the Cal Hacks app, what stays behind
- Moves now: the build setup (electron-builder), the icon, a small new main
  file that opens `frontend/index.html`, the release workflows.
- Stays in the old repo for now: `src/services/*` (Canvas, focus, blocking,
  "I'm stuck", updates). Moving them before Jack's UI can use them would be dead
  code. Each one comes back with its own plan when its feature is built.
- Old repos are archived later (read-only, nothing deleted), after Jonas agrees.

## Website
Rebuilt in Jack's look (docs/design.md): same fonts, greys, `.wire-button`,
cards. Content from the old Concentr8 page: how it works, research, Claude,
questions, download. It has no wireframe from Jack, so it carries the grey
"AI generated" note (`.preview-note` plus an `AI-GENERATED:` comment) so Jack can
redraw it.

## Needs from Jonas (one time)
A fine-grained access token that may write Releases in
`concentr8/concentr8.github.io`, saved as secret `RELEASE_TOKEN` in `alpha`
(Settings, Secrets and variables, Actions). Never paste it into chat.

## Open points
- TODO: Apple signing (Developer Program, $99/year). Until then the Mac app is
  unsigned and macOS shows a warning on first open.
- TODO: the app does not talk to the call server yet; it only shows the web app.
- Windows and Linux builds are included because the old pipeline built them; not tested by us.
