"""Keeps call schedules and call results in memory.

Purpose:  the one place that remembers data while the server runs.
Called by: service.py (and the tests, which call `store.clear()`)
Why in memory: phase 1 of docs/plans/call-feature.md needs no database yet,
          because hosting and database are still undecided (ADR 0008). The
          price: everything is lost when the server restarts.
TODO:     replace the inside of this class with the real database
          (DATABASE_URL). Only this file should have to change.
"""

from src.calls.schemas import CallLogEntry, CallSchedule


class ScheduleStore:
    def __init__(self) -> None:
        self._schedules: dict[str, CallSchedule] = {}
        self._calls: list[CallLogEntry] = []

    def save(self, schedule: CallSchedule) -> None:
        """Add a schedule, or replace the stored one that has the same id."""
        self._schedules[schedule.id] = schedule

    def get(self, schedule_id: str) -> CallSchedule | None:
        return self._schedules.get(schedule_id)

    def count_schedules(self) -> int:
        return len(self._schedules)

    def add_call(self, entry: CallLogEntry) -> None:
        self._calls.append(entry)

    def calls_for(self, schedule_id: str) -> list[CallLogEntry]:
        return [c for c in self._calls if c.schedule_id == schedule_id]

    def clear(self) -> None:
        """Forget everything. Used by tests so they do not affect each other."""
        self._schedules.clear()
        self._calls.clear()


# One shared store for the whole app.
store = ScheduleStore()
