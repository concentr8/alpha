# Moderated test: 15 minutes with 5 Berkeley students

Purpose: find out whether real students with ADHD find Concentr8 simple. AI testing (`docs/design/test-report.md`)
cannot answer that. This script tests the redesigned first start and Home (`docs/plans/simplicity-redesign.md`).

## Who and how
- **5 students** at UC Berkeley who have ADHD (diagnosed or self-identified) and have never seen Concentr8. Aim for
  3 in their first year. One at a time, 15 minutes each, in person or on a call with screen sharing.
- **Their own laptop and their own Google account**, on the web version (https://concentr8.github.io/alpha).
  One of the five uses the Mac app instead (the desktop sign-in was not tested by AI).
- One moderator, one note-taker if possible. Record the screen with permission. No personal data in the notes:
  call them P1 to P5, do not write down to-do titles that name people or health topics.
- **Rules for the moderator:** do not explain the app, do not point, do not help in the first 60 seconds of being
  stuck. Ask "What are you thinking?" when they go quiet. Never say the words on a button before they found it.
- Before each session: a fresh browser profile (or a private window), a stopwatch, this sheet.

## Opening (1 minute, read aloud)
"Thanks for helping. We are testing the app, not you. Nothing you do is wrong. Please think out loud: say what you
see, what you expect and what confuses you. I will stay quiet most of the time. You can stop at any moment."

## Tasks (about 10 minutes)
Give one task at a time. Start the stopwatch when you finish the sentence; stop it when the goal state is on screen.

| # | Say this | Goal state | Baseline → target | Watch for |
|---|---|---|---|---|
| 1 | "Open this link and get set up until the app is ready for you to use." | Signed in, past the calendar screen, first to-do exists | 10 → 1 click in the app | Do they wait calmly on "Opening Google sign-in…"? What do they say at Google's "unverified app" warning? Do they connect the calendar or press "Not now", and why? Do they type a real to-do without asking what to write? |
| 2 | "You have 25 minutes right now. Start working on that to-do with the app." | Timer running for their to-do | 3 → 1 click | They land in a chat after step 3: do they see "Start focus" at the top, or do they answer the chat's question first? Count wrong clicks. |
| 3 | (After they end or leave the session) "You just remembered two more things you need to do this week. Put them in." | Two more to-dos exist | 2 → 1 click each | Add row, chat box, or To Do List page? Does anyone find the `N` key? Do they try to give a due date, and where? |
| 4 | "Without clicking anything: what should you work on next, and how do you know?" | They name the Next card's to-do | not possible → 0 clicks | Do they read the Next card or scan the list? Do they trust the order? |
| 5 | "Mark one of them as done. Then imagine that was a mistake." | Ticked, then undone | new | Do they see "Done. Undo"? Is the row staying in place helpful or confusing? |
| 6 | Reload the page for them. "It is tomorrow. You open the app again. What do you do?" | They state the next action or start focus | lands in old chat → Home | First words. Do they miss yesterday's chat? Can they find it ("Chats" switcher)? |

If a task takes more than 2 minutes, say "That's fine, let's move on" and note it as failed.

## Three things AI testing could not settle (observe on every participant)
1. **Colour:** Jack's warm look was kept, black/white/grey was the alternative. Note any comment on colour or calm.
2. **Top 3 only:** do they look for the rest of their to-dos? Does "All to-dos (n)" get found? Any sign of worry that
   something is hidden?
3. **Next card versus chat box:** which do their eyes and pointer go to first on Home? After step 3 they land in a
   chat where "Start focus" is a small outlined button: do they notice it?

## Questions (3 minutes)
1. "In your own words, what is this app for?"
2. "What was the most confusing moment?" (Then: "Show me where.")
3. "Was there a point where you did not know what to do next?"
4. "The app picked what is 'Next' for you. How did that feel?"
5. "How easy was it overall, from 1 (very hard) to 7 (very easy)?" (Single Ease Question.)
6. "Would you open it again tomorrow? What would make you?"

## What to write down per participant
| Field | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| Task 1: time, clicks in app, calendar connected or "Not now" | | | | | |
| Task 2: time, clicks, first thing they clicked | | | | | |
| Task 3: time, how they added (row / chat / page / N) | | | | | |
| Task 4: correct without clicking? (yes/no) | | | | | |
| Task 5: found Undo? (yes/no) | | | | | |
| Task 6: first words | | | | | |
| Tasks failed or helped | | | | | |
| Ease 1-7 | | | | | |
| Colour / top-3 / Next-card observations | | | | | |
| Quotes (word for word) | | | | | |

## Reading the results
- **Pass for a task:** at least 4 of 5 finish it without help, and nobody needs more than 2 minutes.
- A problem seen with **2 or more** students gets a Linear issue (team Concentr8) with the quote and the timestamp.
  A problem seen once is noted, not acted on, unless it blocked the task.
- Five students find most large problems but prove nothing about small differences: do not use this test to choose
  between two colours or two labels. Use it to find where students stop.
- Compare clicks with `docs/design/baseline.md`. Times from this test replace the model estimates there.
