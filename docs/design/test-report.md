# Test report: is the redesigned Concentr8 simpler?

Purpose: Phase 3 of `docs/plans/simplicity-redesign.md`. Compares the new version with `docs/design/baseline.md`,
repeats the audit, and lists what was tested, fixed and left open.
Version tested: `main` at `70f270a` (pull requests #62 to #66), then the fixes of this pull request.
Date: 2026-11-10. Tester: AI, headless Chrome, a mocked Concentr8 server. **No real student, no real Google account.**

## 1. Verdict
- **All five core tasks need fewer steps and clicks than the baseline.** One number went up: Home carries more words
  and controls than before, because the to-dos moved onto it (section 2).
- **No blocking problem was found.** Testing found 3 major and 17 smaller problems in the new screens; 12 are fixed in
  this pull request, with tests. 8 are on the fix list (section 6); none of them blocks a core task.
- **Not proven:** that students with ADHD find it simple. That needs the moderated test in
  `docs/design/user-test-script.md`. Also not tested: the Mac app, real Google pages, Safari, Firefox, screen readers.

## 2. The five core tasks, before and after
Same method as the baseline: steps and clicks counted on the shortest path, words counted from the rendered page,
time from the Keystroke-Level Model (a model, not a stopwatch; it leaves out reading and waiting).

| Task | Baseline | Now | Simpler? |
|---|---|---|---|
| **a. New user: signed in, calendar connected, first to-do** | 17 steps, 10 clicks (+ Google), 8 screens, about 163 words, 31.1 s | **6 steps, 1 click (+ Google), 3 screens, 60 words, 7.3 s** | Yes |
| **b. Home → focus session running** | 3 steps, 3 clicks, 4 screens, 92 words, 8.0 s | **1 step, 1 click, 2 screens, 101 words, 2.7 s** | Yes, except words |
| **c. Add a to-do from Home** | 4 steps, 2 clicks, 2 screens, 66 words, 9.9 s | **3 steps, 1 click (0 with `N`), 1 screen, 60 words, 7.3 s** | Yes |
| **d. Know what to do next** | 1 click + reading an unsorted list; 0 of 13 controls on Home name a task | **0 clicks; the Next card names the most urgent to-do with its due date in words** | Yes |
| **e. Come back after a day** | lands in yesterday's chat (101 words); 1 click to see to-dos, 3 to focus | **lands on Home with the Next card (45 to 64 words); 0 clicks to see what is next, 1 to focus** | Yes |

What is not simpler, and why:
- **Words in task b: 92 → 101.** Home now shows three to-dos; 22 of its 60 words are the student's own to-do titles.
  The words a student must read to start are fewer: the Next card (title, due date, "Start focus 25 min").
- **Controls on Home: 13 → 23** (15 in the main area; the plan predicted about 18). Each to-do row has a checkbox, a
  title and a ⋯ menu. There is still exactly one filled button (checked by a test). Whether students find the next
  action at once is the first thing to watch in the moderated test.
- **Clicks on Google's own pages are unchanged** (at least 1 to sign in, at least 3 for the calendar permission,
  including the "Google hasn't verified this app" warning). Concentr8 cannot shorten them until Google verifies the app.
- After step 3 a new student lands **in a chat**, not on the full Home: their to-do is a one-line card on top with an
  outlined "Start focus" button, and the chat asks its first question. This follows the plan, but the most important
  button is at its smallest at this moment (question 1 in section 7).

## 3. Audit repeated (issues A1 to A20 of `docs/design/audit.md`)
| # | Issue (short) | Sev | Now |
|---|---|---|---|
| A1 | Home never says what to do next | 4 | **Fixed**: Next card |
| A2 | First contact is a blank page | 4 | **Fixed**: "Opening Google sign-in…". Left: no "taking longer" text after 10 s (L3), Home visible for 3 to 7 frames first (L4) |
| A3 | The calendar cannot be found | 4 | **Fixed**: step 2 right after sign-in, 1 click |
| A4 | Main button is the slowest way to focus | 4 | **Fixed**: "Start focus" starts in 1 click, also without the server |
| A5 | Returning student lands in yesterday's chat | 3 | **Fixed**: fresh Home on every start; the chat is in the chat switcher |
| A6 | New accounts full of fake data | 3 | **Fixed**: samples only in demo mode |
| A7 | Five names for one action | 3 | **Mostly fixed**: "Start focus" on Home, in chats and menus. The Timer tool still says "Start" |
| A8 | Timer creates a "Focus session" to-do | 3 | **Fixed** (test) |
| A9 | Internal notes and raw errors reach students | 3 | **Mostly fixed**: no "AI generated", no "Failed to fetch". Left: the sign-in error box can still show the server's own sentence (L2) |
| A10 | Dead "Continue with Google" buttons | 3 | **Fixed** |
| A11 | Nothing selected after connecting the calendar | 3 | **Fixed**: the main calendar is saved automatically |
| A12 | Adding a to-do needs a page change | 2 | **Fixed**: add row on Home, `N` key |
| A13 | To Do List not sorted, no due words | 2 | **Fixed** on Home and the To Do List |
| A14 | No calendar block without Google | 2 | Open, CON-55 (outside the redesign) |
| A15 | Contrast | 2 | **Fixed**, ratios in ADR 0046 |
| A16 | Reduced motion incomplete | 1 | **Fixed**: 20 of 20 screens and states have no animation over 1 ms |
| A17 | No scale for type and spacing | 2 | **Partly**: five text sizes, two radii. 469 off-scale spacing values stay on purpose |
| A18 | Focus page scrolled down on phones; "AI" button covers content | 2 | Partly: Toolbox buttons are clear of the "AI" button. Rest open, CON-56 |
| A19 | Privacy text and guest chat out of date | 2 | Text **fixed**; code cleanup open, CON-57 |
| A20 | No translation layer | 2 | **Fixed** for the new screens (71 texts in German, French, Spanish). The rest of the app: CON-43 |

### Persona walkthroughs on the new version
**Maya (first semester, overwhelmed, first visit).** Status line → Google → one calendar screen with one reason →
"What is the one thing you need to get done?" with a focused field. She types one deadline, presses Enter, and it
exists. The app now takes a decision off her twice (which calendar; what comes next). Still hard: Google's
"unverified app" warning arrives without a word of preparation from Concentr8, and her other four deadlines need the
add row, which the first chat does not show. Fixed here: pressing "Home" in the sidebar now shows the full Home.
**Leo (11 pm, essay due tomorrow, returning).** Opens the app: "Next: Rhetoric essay, Due tomorrow, 5:00 PM",
"Start focus 25 min". One click, the timer runs for the essay. No chat in the way, no extra to-do created. Still weak:
the Focus page lists three template steps ("Read the prompt…") that are not about his essay (known, CON-53).
**Sam (skeptical tester).** Slow server: a status line, not a blank page. Server down: "We could not reach Concentr8.
Check your internet, then try again." and one button. Home has no fake to-dos. Profile's Google button works. A failed
calendar connection says so in plain words. Sam's remaining exit points: Google's warning screen, and a wait of up to
45 s on a very slow server with the same status line and no way out (L3).

## 4. What was tested
| Area | How | Result |
|---|---|---|
| Unit tests | `npm test` in `server/` (includes `frontend/test/`) and `app/` | 193 + 19 pass |
| **End-to-end tests (new, `e2e/`)** | 28 browser tests of first start and Home, run 3 times | 28 pass, none flaky, about 24 s |
| Languages × widths | en, de, fr, es × 320, 390, 768, 1280 px × 19 screens and states (304 cells): sideways scroll, clipped text, overlaps | 292 pass; 12 fail: example text in the first-to-do field is cut at 320 px (L8) |
| Untranslated text on new screens | de, fr, es × 19 screens | New texts are translated. Old Home controls are English: "New chat", voice and send labels, chat notes (CON-43) |
| Keyboard only | First start and every Home action with Tab, Enter, Space, Escape, arrows | No trap, focus ring always visible. 6 problems found, all fixed here (section 5) |
| Reduced motion | 8 first-start screens, 6 Home states, two widths | 20 of 20 pass |
| Slow network | Every server answer delayed 3 s and 15 s; processor slowed 4× | Never blank or frozen; the first to-do appears 0.02 s after Enter without the server. No "taking longer" text (L3) |
| Errors | Server down, server error 500, sign-in expired, popup blocked, empty calendar list, offline after loading | Plain words in most cases; 3 fixed here, 3 on the fix list (L2, L5, L6). Offline: add, tick and focus still work |
| Odd data | 0, 1, 50 and 200 to-dos; 300-character titles; HTML, emoji and right-to-left text in titles; deadlines in 5 minutes, 400 days overdue, equal deadlines, all-day | Pass. HTML in a title is shown as text, never run |
| Speed | Time from key or click to the updated page, 10 runs each; long tasks; typing 40 characters | Tick 1.5 ms, add 3.8 ms, Start focus 4.9 ms (median). With 200 to-dos and a 4× slower processor all under 60 ms. No long task, no lost character |
| Layout shift | On load and after tick, add, delete | 0.00 at normal speed. **On a 4× slower processor the page jumps on load** (0.16 at 1280 px, 0.69 at 390 px; "good" is under 0.1) (L1) |
| WCAG 2.2 AA spot checks | Text spacing, 200 % and 400 % zoom, names of all controls, dialog labels, target sizes, colour as the only cue | Pass after the fixes here. Screen-reader announcements not verified |
| No feature lost | 20 features of plan section 3.6 clicked through | 20 of 20 work, no page error |
| Live builds | GitHub Actions for `70f270a` | Web deploy, tests and Mac beta `v1.1.0-beta.32` succeeded. Two server deploys failed (section 7) |

Not tested, and why: the **Mac app** (Electron is not installed in the test environment and installs are switched off;
the desktop sign-in text has a unit test only); **real Google pages**; **Safari and Firefox**; **screen readers**;
**real students**.

## 5. Problems found and fixed in this pull request
| # | Problem | Sev | Fix | Test |
|---|---|---|---|---|
| N1 | After adding a to-do the add field kept its text; the next to-do became "First oneSecond one" | 3 | Field is cleared before Home redraws | e2e 12 |
| N3 | Keyboard focus fell to the page after tick, delete, Undo and after the last first-start step | 3 | Home puts focus back on the same control (or Undo); first start hands focus to the chat box | e2e 14 |
| N4 | With a "Done. Undo" note showing, Space on another checkbox did nothing (8 of 12 tries) | 3 | Keys inside Home's own block no longer redraw it | e2e 14 |
| N6 | Enter on "Connect Google Calendar" moved focus to "Not now"; a second Enter skipped the calendar for good | 2 | While waiting, focus rests on the screen itself | e2e first start 11 |
| N7 | From the first chat there was no visible way to the Home with the add row | 2 | "Home" in the sidebar shows the full Home; the chat stays in the chat switcher | e2e 17 |
| N2 | A floating "Focus · 24:59" button covered the send button and the chat box on Home | 2 | Hidden on Home while the card shows the session | e2e 13 |
| N5 | The ⋯ menu ignored arrow keys; Tab left it open | 2 | Arrow keys, Home, End move; Tab closes and returns to the button | e2e 15 |
| N8 | A deadline that passed today was only red ("Due today, 6:28 PM") | 2 | Words: "Was due today, 6:28 PM", "Overdue today" | unit |
| N10 | Inside a chat, ticking the one-line card showed no Undo and kept "Start focus" | 2 | Note with Undo; no start button on a ticked to-do | e2e 16 |
| N9 | Popup blocked in step 2: "Finish in the Google window" although no window existed | 2 | "Your browser blocked the Google window." with the main button "Open in browser" | checked by hand |
| N11 | "Enter" key hint and the blocked-window text were English in fr, es, de | 2 | Translated (5 new texts) | i18n test |
| N12 | A 300-character title pushed "Start focus" off a phone screen; key hint squeezed the example text | 1 | Title cut after three lines (full text in the tooltip and editor); key hint hidden under 420 px | checked by hand |

## 6. Fix list for the next implementation session (also in Linear, CON-58)
| # | Problem | Sev | Where |
|---|---|---|---|
| L1 | On slow devices the page paints before its late style blocks and jumps (layout shift 0.16 to 0.69) | 2 | Move the `theme.css` and `simplicity-components.css` style blocks of `frontend/index.html` into `<head>`, same order |
| L2 | The sign-in error box shows the server's own English sentence | 2 | `concentr8-signin.js` `explain()`; needs error codes from the server instead of sentences |
| L3 | Very slow server: the same status line for up to 45 s, no "taking longer" text, no way out; focus not inside the screen | 2 | `concentr8-signin.js` `showWaiting()` |
| L4 | Home is visible for 3 to 7 frames before the sign-in screen | 1 | The sign-in check runs at the end of `<body>`; hide the app by CSS until it has decided |
| L5 | Calendar list empty after connecting: marked "connected", nothing saved, nothing said | 2 | `onboarding.js` `connect()` |
| L6 | Login expires while step 3 is open: the step stays open under the sign-in screen | 1 | `onboarding.js`, the `concentr8:auth` listener ignores signing out |
| L7 | Old Home controls are English in de, fr, es: "New chat", "Start voice input", "Send message", chat notes | 2 | Part of CON-43 |
| L8 | At 320 px the example text in the first-to-do field is cut ("Par exemple : lire le chap"), and row titles shrink to one word | 1 | Shorter example; let the due date wrap under the title on narrow screens |

## 7. Open questions and notes for Jonas
1. **First landing after step 3.** The new student lands in a chat where "Start focus" is a small outlined button.
   Options: (a) keep and watch it in the student test; (b) make that button filled while it is the only action;
   (c) land on the full Home and let the chat wait. Recommendation: (a) now, decide after five students.
2. **Google's "unverified app" warning** is the largest remaining drop-off risk in first start and cannot be designed
   away. Either add one sentence to step 2 ("Google will show a warning because Concentr8 is new"), or start Google's
   verification. Recommendation: both.
3. **Two server deploys failed** at the Azure step (runs for `20f119c` and `5c4805c`, 24 and 38 seconds after a
   successful one, so most likely because three merges landed within a minute). The only server change they carried is
   the test list in `server/package.json`, so the live server behaves the same. Nothing was touched (deploy is off
   limits); re-run "Deploy call server" from Actions if the stamped commit matters to you.
4. **Translations**: all 71 texts in `frontend/i18n/` still need your review. One to look at: Spanish "Para el vie".
5. **Mac app**: please run the beta once: sign in, calendar step, first to-do, Start focus. It is the one path nobody
   has seen working after the redesign.
