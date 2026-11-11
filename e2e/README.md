# End-to-end tests (first start and Home)
Browser tests for docs/plans/simplicity-redesign.md 3.1 and 3.2 (acceptance criteria of PR 3 and PR 4).
`first-start.test.js`: sign-in status line, calendar step, first to-do, failure texts, new/existing accounts, demo mode.
`home.test.js`: one-click focus, order, N key, Undo, empty card, reload, chat card, button sizes, 320 px, German.
The Concentr8 server and Google are mocked with Playwright routes (`helpers.js`); no network, no account, no secrets.
Run: `cd e2e && npm install && npm test` (uses `node --test` and `playwright`).
Needs Chrome: set `CHROME_PATH` (optional), else /usr/bin/google-chrome, else run `npx playwright install chromium`.
With a global Playwright instead of npm install: `NODE_PATH=/path/to/node_modules node --test`.
Not part of `server/` npm test: CI has no browser.
