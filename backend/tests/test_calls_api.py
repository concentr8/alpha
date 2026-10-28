"""Tests for the web addresses of the call feature (src/calls/router.py).

Purpose:  proves that each rule from service.py turns into the right HTTP
          status. The rules themselves are tested in test_calls_service.py.
Run:      cd backend && pytest
"""

from fastapi.testclient import TestClient

from src.calls.store import store
from src.main import app

client = TestClient(app)

REQUEST = {
    "user_id": "u1",
    "phone_e164": "+15555550100",  # fake number, see AGENTS.md
    "timezone": "America/Los_Angeles",
    "local_time": "08:00",
    "weekdays": [0, 1, 2],
    "consent_to_calls": True,
}


def setup_function() -> None:
    store.clear()


def test_create_schedule_returns_201_and_an_id() -> None:
    response = client.post("/calls/schedules", json=REQUEST)

    assert response.status_code == 201
    assert response.json()["id"]
    assert response.json()["active"] is True


def test_unknown_time_zone_returns_422() -> None:
    response = client.post("/calls/schedules", json={**REQUEST, "timezone": "Mars/Olympus"})

    assert response.status_code == 422


def test_weekday_7_returns_422() -> None:
    response = client.post("/calls/schedules", json={**REQUEST, "weekdays": [7]})

    assert response.status_code == 422


def test_stop_returns_204_and_a_stopped_schedule_cannot_be_called() -> None:
    schedule_id = client.post("/calls/schedules", json=REQUEST).json()["id"]

    assert client.delete(f"/calls/schedules/{schedule_id}").status_code == 204
    assert client.post(f"/calls/test-call/{schedule_id}").status_code == 409


def test_unknown_schedule_returns_404() -> None:
    assert client.delete("/calls/schedules/nope").status_code == 404
    assert client.post("/calls/test-call/nope").status_code == 404
