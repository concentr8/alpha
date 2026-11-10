# Audit: where Concentr8 is not simple today

Purpose: the list of design holes the redesign must close. Scope: first start (sign-in, calendar, first to-do) and
Home with to-dos. Version: `main` at `158af01`. Method: heuristic evaluation with Nielsen's 10 heuristics, then a
cognitive walkthrough with three personas. Evidence is code (`file:line`) and screenshots in
`docs/design/mockups/before/`. One evaluator (AI), no real users: treat severity as a hypothesis until the
moderated test.

Severity (Nielsen's scale): **4** blocks the task or loses trust · **3** major, fix before the next release ·
**2** minor · **1** cosmetic.

## 1. Issues

| # | Issue | Heuristic | Sev | Evidence |
|---|---|---|---|---|
| A1 | **Home never says what to do next.** No task, deadline or step is on Home; the question "What's on your plate right now?" hands the work of deciding back to the student. | H6 Recognition rather than recall | **4** | `index.html:577-593`; `02-home-desktop.png` |
| A2 | **First contact is a blank page**, then Google, with no word from Concentr8 about what happens or why. | H1 Visibility of system status | **4** | `concentr8-signin.js:60-72`, ADR 0040 |
| A3 | **The calendar cannot be found.** It is under Profile → Settings → a button → a dialog; the Calendar page says "Connect Google Calendar in Profile Settings", which is not the real label path. 10 clicks in total. | H6, H7 Efficiency | **4** | `concentr8-google-calendar.js:516-530`, `index.html:2101` |
| A4 | **The main button on Home is the slowest way to focus.** "Quick Start" opens an AI interview (at least 4 clicks, typing, two waits) and shows an error when the server is down. The fast way (Toolbox → Timer → Start) is hidden. | H7, H5 Error prevention | **4** | `index.html:2862-2866`, `2804` |
| A5 | **A returning student lands in yesterday's chat.** Greeting and "Quick Start" are hidden; 101 words to read. Two ADRs (0026, 0027) promised a clean start. | H8 Minimalist design, H4 Consistency | **3** | `index.html:782-788`, `chat-history.js:31-56`; `08-return-after-reload-desktop.png` |
| A6 | **New accounts are full of fake data**: 3 to-dos, 3 courses, 4 calendar blocks, classmates "Alex" and "Sam". A student cannot tell what is theirs. | H2 Match with the real world | **3** | `index.html:1307-1325`, `:1908` |
| A7 | **Five names for one action**: "Quick Start", "Start focus session", "Start focus", "Start", and "Quick start" as a workflow option. | H4 Consistency | **3** | `index.html:584`, `586`, `1612`, `1898`, `3010` |
| A8 | **Starting the timer silently creates a to-do** called "Focus session" with three generic steps. | H1, H5 | **3** | `index.html:1527-1531`, `3026` |
| A9 | **Internal notes and raw errors reach students**: "AI generated: Jack has not drawn this page yet", "Failed to fetch". | H9 Help users recover from errors | **3** | `concentr8-signin.js:13`, `concentr8-google-calendar.js:390`; `01-signin-desktop.png`, `07c-…png` |
| A10 | **"Continue with Google" buttons inside the app do nothing** (Profile, Personal information, Sign in & subscription). | H1, H5 | **3** | `index.html:1926`, `1928`, `1931`; no listener in `concentr8-signin.js` |
| A11 | **After connecting the calendar nothing is selected**; the student must tick a box and press "Save selection", and "Connect Google Calendar" stays visible. | H7, H1 | **3** | `server/google-calendar.js:217`, `concentr8-google-calendar.js:185-186` |
| A12 | **Adding a to-do needs a page change**, and the field is not focused on arrival. | H7 | **2** | `index.html:2968` |
| A13 | **The To Do List is not sorted by due date**; a due date shows only if one was set, never as "today / tomorrow / overdue". | H6, H2 | **2** | `index.html:2968` |
| A14 | **To-dos never get a calendar block** unless Google is connected; the app keeps retrying every 60 s without telling the student. | H1 | **2** | `task-placement.js:269-271`, `concentr8-google-calendar.js:253-265` |
| A15 | **Contrast**: muted text `#786657` is 4.13:1 on the sidebar and 4.35:1 on muted surfaces (needs 4.5:1). Divider `#e2d6c9` is 1.38:1, fine as decoration but not as the only edge of a control. | H8; WCAG 1.4.3, 1.4.11 | **2** | tokens `index.html:881-918`; ratios computed |
| A16 | **Reduced motion is not complete** (chat switcher chevron, scripted chat scrolling unverified). | WCAG 2.3.3 (AAA), `prefers-reduced-motion` | **1** | `index.html:767` |
| A17 | **Type and spacing have no scale**: 46 font-size declarations from 11 to 88 px, 14 radius values, spacing tokens used 7 times. The page feels uneven without one obvious cause. | H4, H8 | **2** | `index.html` style blocks (15) |
| A18 | **Mobile: the Focus page opens scrolled down**, so "End session" is off-screen. The floating "AI" button covers content on desktop. | H3 User control | **2** | `index.html:3188`; `05e`, `05c-mobile` |
| A19 | **Privacy text and guest chat are out of date** ("10 free messages a day" although sign-in is required). | H4, H10 Help | **2** | `index.html:1930`, `concentr8-server.js:117-129` |
| A20 | **No translation layer exists**, though four languages are decided. Every new string would ship in English only. | H2 | **2** | no `i18n` in `frontend/`; `docs/plans/languages.md` |

Good things to keep: nothing is re-asked on return; state survives a reload; one filled button per page; focus ring
on every control; Escape and "Undo" in the chat; the "Start focus" dialog is already minimal.

## 2. Cognitive walkthrough

For each step: does the persona know what to do, see the control, connect it to the goal, and see that it worked?

### Persona 1: Maya, first semester, ADHD, overwhelmed (five deadlines, first time in the app)
| Step | What happens | Fails at |
|---|---|---|
| Open the link | Blank page for some seconds. She wonders if it is broken and may switch tabs. | A2 |
| Google page | Signs in. No word from Concentr8 about what comes next. | A2 |
| Home | Reads "What's on your plate right now?" and three unknown to-dos exist somewhere. She must put five deadlines into words in an empty box. This is the task she came to avoid. | A1, A6 |
| Clicks "Quick Start" (the only coloured button) | The AI asks questions. She wanted to start, not to be interviewed. | A4 |
| Calendar | Never finds it. | A3 |
**Verdict:** she can sign in, but the app does not take a decision off her at any point. Highest risk: A1.

### Persona 2: Leo, 11 pm, procrastinating, one essay due tomorrow, has used the app twice
| Step | What happens | Fails at |
|---|---|---|
| Opens the app | Yesterday's chat about a different course fills the page. | A5 |
| Wants to start the essay now | No start button in sight. Chat switcher → "New chat" → "Quick Start" → interview. Or he remembers Toolbox → Timer. | A4, A7 |
| Starts the timer | A new to-do "Focus session" appears; his essay is not attached to the session. | A8 |
**Verdict:** every second between opening and a running timer is a chance to leave. Today that is 3 clicks if he
remembers the hidden path, and an AI conversation if he follows the visible one.

### Persona 3: Sam, skeptical tester, quits after one confusing screen
| Step | What happens | Fails at |
|---|---|---|
| Open the link | Blank page. If the server is slow or down: a dialog that says "AI generated: Jack has not drawn this page yet". | A2, A9 |
| Home | Fake to-dos for courses Sam does not take. | A6 |
| Profile | Clicks "Continue with Google". Nothing happens. | A10 |
| Calendar dialog (if found) | "Failed to fetch", or Google's "unverified app" warning without any preparation. | A9, A3 |
**Verdict:** Sam meets a confusing screen within the first 10 seconds on a bad network and within the first minute
on a good one.

## 3. What the redesign must do (in order of severity)
1. Home shows **one next to-do with one start button** (A1, A4, A5, A7, A12, A13).
2. First start is **three calm screens with words**: signing in, calendar, first to-do (A2, A3, A11).
3. **No fake data, no internal notes, no dead buttons, no raw errors** (A6, A8, A9, A10, A19).
4. **One scale** for type, spacing, radius, motion and contrast-checked colours (A15, A16, A17).
5. A small translation layer so new strings ship in four languages (A20).
A14 and A18 are bugs outside the redesign; they get their own Linear issues.
