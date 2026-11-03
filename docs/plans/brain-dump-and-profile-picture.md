# Plan: brain dump to to-dos, and a profile picture (Linear CON-32, 33, 34, 36)

Status: go given by Jonas 2026-11-03. Much of the flow existed already (the chat asks for minutes, `add_todo` carries them, Up next reads deadlines). This closes the gaps.

## Brain dump
- Home leads with "What's on your plate right now?" (visible line, composer label and placeholder). AI generated, no wireframe yet.
- Server chat prompt: the student may get out everything; the chat asks one short question per reply until each to-do is complete (what, course, final due date), sums up, then says "First, let's figure out how long each one takes." and collects the minutes.
- `add_todo` / `suggest_todo` get an optional `due` (YYYY-MM-DD, checked by the server; a wrong date is dropped, the task stays).
- App: accepting a to-do with `due` creates the task's deadline event (the rule Up next already uses). Chat note shows "(90 min) · due 2026-11-20".
- Side panel: the to-do list is sorted by due date and shows time and due date ("· 90 min · Due Fri").

## Complete to-do and question limit (CON-34, decided by Claude, Jonas can change)
- A to-do is complete when it has a name and minutes; course and final due date are asked for, but "I don't know" is accepted.
- At most six questions in total, then the chat sums up with what it has.
- Nothing is added to the list before the summary and the agreed times. (Chat messages already stopped becoming to-dos by themselves with ADR 0027; only the model's checked `add_todo` adds.)

## Profile picture
- Profile, Personal information: "Choose picture" and "Remove". The picture is cut square and shrunk to 128 px in the browser and stored in `profile.avatar` (a small data URL in the app's local data; it is not sent to the server).
- The Profile button bottom left in the sidebar and the Profile page show it; without a picture the first letter of the name stays.
- Saving name and email keeps the picture.

## Not in this change
- Showing the picture on other devices (needs server storage and a decision about Google's account photo).
- Splitting big deliverables from small to-dos in the side panel (CON-36 stays open for Jack's wireframe).
