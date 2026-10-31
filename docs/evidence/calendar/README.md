# Calendar review evidence

Purpose: explains screenshots for the three Calendar PRs; read by reviewers.
All shown calendar data is synthetic/demo data. No real Google account,
credentials or personal information were used. No Google tokens reach the UI.

Each desktop image was captured at 1440 × 1000, phone at 390 × 844.

| Change | Before | After |
|---|---|---|
| Redesign desktop | before-desktop.jpg | after-desktop.jpg |
| Redesign phone | before-phone.jpg | after-phone.jpg |
| Find time desktop | after-desktop.jpg | find-time-desktop.jpg |
| Find time phone | after-phone.jpg | find-time-phone.jpg |
| Google Settings desktop | google-settings-before-desktop.jpg | google-settings-after-desktop.jpg |
| Google Settings phone | google-settings-before-phone.jpg | google-settings-after-phone.jpg |
| Google Calendar desktop | find-time-desktop.jpg | google-calendar-desktop.jpg |
| Google Calendar phone | find-time-phone.jpg | google-calendar-phone.jpg |

Find time is in the Calendar rail (the Calendars disclosure on a phone).
`google-connected-desktop.jpg` additionally shows the three-calendar limit.
The connected Google screenshots use browser-only synthetic API responses;
they do not prove live consent, school-account permissions or deployment.
The disabled Settings screenshots verify the absent-configuration message.

Browser checks exercised: 1440/800/390 layouts without horizontal overflow,
15-minute quick-add proposal before confirmation, Month's 42 cells,
find-time suggestion into the existing task-linked editor, read-only Google
detail, three-calendar selection/save, chip/rail synchronized visibility,
stale-event retention, stale-data availability blocking and cross-tab logout
clearing external events and account options.

Server checks use dependency-free Node HTTP and mocked provider fetch;
run `npm test` in server/. Existing desktop tests: `npm test` in app/.
Python tests could not run in this environment because pytest is unavailable;
no dependency was installed. Real OAuth and desktop popup consent still need
the server's environment configured and a human-approved school test account.
