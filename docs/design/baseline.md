# Baseline: how many steps the five core tasks take today

Purpose: the yardstick for "simpler". Phase 3 re-runs exactly these five tasks and compares.
Measured on `main` at commit `158af01` (2026-11-10). Raw notes with `file:line` for every step were produced by
reading the code and by driving the app in headless Chrome (1280x800 and 390x844, demo mode `?demo`).

## How it was measured (read this before trusting a number)
- **Steps** = everything the student does or waits for. **Clicks** = clicks inside Concentr8 (clicks on Google's
  pages are listed separately because we do not control them). **Screens** = distinct pages or dialogs on the path.
- **Words** = every visible word on a screen of the path (sidebar, headings, labels, placeholders), counted from the
  rendered page. A to-do title the student wrote counts too.
- **Time** = a Keystroke-Level Model estimate (Card, Moran & Newell): click = think 1.35 s + point 1.1 s + press
  0.2 s = **2.65 s**; typing = 0.4 s to reach the keyboard + 0.28 s per character; Enter = 0.28 s. The sample to-do
  is "Read chapter 4" (14 characters). It is a model for a practised user, **not a stopwatch on a real student**.
  It leaves out reading, hesitation and every wait.
- **Not measured:** the real Google pages, the server wake-up wait and real AI answers. The sandbox cannot reach the
  server, and no real account was used. The moderated test in Phase 3 measures these with real students.
- The brief says the calendar step is mandatory. **In the code it is optional** (ADR 0039 superseded ADR 0033;
  `frontend/concentr8-signin.js:52-57`). Task a is therefore measured both ways.

## Results

| Task | Shortest path today | Steps | Clicks in app | Typing | Screens | Words on the path | Time (KLM) |
|---|---|---|---|---|---|---|---|
| **a. New user → signed in, calendar connected, own first to-do** | blank page → Google → Home → Profile → Settings → "Google Calendar" → "Connect Google Calendar" → Google consent → tick a calendar → "Save selection" → close → "To Do List" → field → type → Enter | **17** | **10** (+ at least 3 on Google) | 1 | **8** | about 163 | **31.1 s** + Google + 4 waits |
| a'. same, calendar skipped (what the code allows) | blank page → Google → Home → "To Do List" → field → type → Enter | 7 | 2 (+ at least 1 on Google) | 1 | 4 | 66 | 9.9 s + Google + 2 waits |
| **b. Home → focus session running** | "Toolbox" → "Timer" → "Start" | **3** | **3** | 0 | 4 | 92 | **8.0 s** |
| **c. Add a to-do (from Home)** | "To Do List" → click field → type → Enter | **4** | **2** | 1 | 2 | 66 | **9.9 s** |
| **d. Know what to do next** | Home names no task. Open "To Do List" and read an unsorted list | 1 + reading | 1 | 0 | 2 | 66 | 2.7 s + reading and deciding |
| **e. Come back after a day** | The last chat reopens. To see to-dos: "To Do List". To focus: 3 clicks as in b | 0 to land, 1 to see to-dos, 3 to focus | 0 / 1 / 3 | 0 | 1-4 | 101 on landing (in the test) | 0 / 2.7 s / 8.0 s |

## What the numbers hide (facts that make a task harder than its click count)
- **a:** the first thing a new student sees is a **blank page** while the server wakes up, then Google
  (`concentr8-signin.js:60-72`). The calendar is four levels deep (Profile → Settings → button → dialog) and needs a
  manual "Save selection" because no calendar is pre-selected (`server/google-calendar.js:217`).
- **a:** every new account already contains 3 fake to-dos, 3 fake courses and 4 fake calendar blocks
  (`frontend/index.html:1307-1325`). The student's first own to-do lands under them.
- **b:** the 3-click path creates a to-do called "Focus session" as a side effect (`index.html:1527-1531`).
  The visible main button on Home, "Quick Start", is slower: at least 4 clicks, a typed answer and two AI waits, and
  it fails when the server is unreachable.
- **b:** there are five different labels for starting: "Quick Start", "Start focus session", "Start focus",
  "Start", and a "Quick start" option inside the Start focus dialog.
- **c:** adding through the chat is 0 extra clicks but not predictable: the AI may ask one or two questions first.
- **d:** on Home, **0 of 13 interactive elements name a task, a deadline or a next step.** The To Do List is not
  sorted by due date.
- **e:** nothing is re-asked (good). But the student lands inside yesterday's chat; greeting, question and
  "Quick Start" are hidden until they open the chat switcher and click "New chat" (2 clicks).

## Targets for the redesign (checked again in Phase 3)

| Task | Baseline | Target | How |
|---|---|---|---|
| a | 17 steps, 10 clicks, 8 screens | **6 steps, 1 click, 3 screens** | status line instead of a blank page; one calendar screen right after sign-in; first calendar selected automatically; first to-do typed into a focused field on Home |
| b | 3 steps, 3 clicks | **1 step, 1 click** | "Start focus" on the Next card on Home |
| c | 4 steps, 2 clicks | **3 steps, 1 click** (0 clicks with the `N` key) | add row on Home |
| d | 1 click + reading an unsorted list | **0 clicks, 1 element names the next task** | Next card: the most urgent to-do, with its due date in words |
| e | lands in an old chat; 1 click to see to-dos, 3 to focus | **0 clicks to see what is next, 1 click to focus** | Home always opens fresh; the last chat is one click away |

Honest trade-off: Home will carry more interactive elements than today (about 18 instead of 13), because the
to-dos move onto it. What goes down is the number of competing *primary* actions (one) and the navigation needed
for b, c, d and e. Phase 3 has to show that students still find the next action at once.
