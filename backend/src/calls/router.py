"""Web addresses (endpoints) of the call feature.

Purpose:  translates HTTP requests into calls to service.py, and the service's
          exceptions into HTTP statuses. No business logic here; keep it thin.
Called by: src/main.py (mounted under /calls)
Calls:     service.py
"""

from fastapi import APIRouter, HTTPException

from src.calls import service
from src.calls.schemas import CallSchedule, CallScheduleCreate

router = APIRouter()


@router.post("/schedules", response_model=CallSchedule, status_code=201)
def create_schedule(body: CallScheduleCreate) -> CallSchedule:
    """Save a recurring call schedule for a user."""
    try:
        return service.create_schedule(body)
    except (service.ConsentMissing, service.InvalidTimezone) as err:
        # 422 = "we understood the request, but its content is not acceptable".
        raise HTTPException(status_code=422, detail=str(err))


@router.delete("/schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: str) -> None:
    """Stop all future calls of this schedule. Must always work (opt-out)."""
    try:
        service.delete_schedule(schedule_id)
    except service.ScheduleNotFound as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/test-call/{schedule_id}", status_code=202)
async def test_call(schedule_id: str) -> dict[str, str]:
    """Place one call right now for a saved schedule (for manual testing)."""
    try:
        return await service.place_call_now(schedule_id)
    except service.ScheduleNotFound as err:
        raise HTTPException(status_code=404, detail=str(err))
    except (service.ScheduleInactive, service.OutsideAllowedHours) as err:
        # 409 = "not possible in the current state" (stopped, or wrong time of day).
        raise HTTPException(status_code=409, detail=str(err))
    except NotImplementedError:
        # The chosen provider (dial or elevenlabs) is not built yet.
        raise HTTPException(status_code=501, detail="This voice provider is not built yet")
