# 0029. Find study time within the Calendar

Status: Proposed for review.

Purpose: explains the availability decision to calendar maintainers.

Search today plus six days at 15-minute start intervals, 08:00–21:00 local.
No past slots. All events block time regardless of their visibility toggles.
All-day ends are exclusive; timed deadlines reserve the 30 minutes they
occupy in the grid. A missing slot is not an error.

Why: hidden calendars must not produce false availability, and the search
must be deterministic and independently testable with no services or AI.

Task estimates live in browser-local calendar preferences keyed by task ID.
Why: expanding the shared task schema would exceed the calendar-only scope.
No other page is changed. The estimate can be entered in the Calendar rail.
The existing editor still confirms every proposed addition.

Connected Google data must be fresh before a free slot is offered. Until
OAuth is added this searches local events only.
