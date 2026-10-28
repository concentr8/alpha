"""First test: the server starts and answers /health.

Purpose:  proves the skeleton is wired correctly. Add one test file per
          feature next to this one, mirroring src/.
"""

from fastapi.testclient import TestClient

from src.main import app


def test_health() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_schedule_without_consent_is_refused() -> None:
    client = TestClient(app)
    response = client.post(
        "/calls/schedules",
        json={
            "user_id": "u1",
            "phone_e164": "+15555550100",  # fake number
            "timezone": "America/Los_Angeles",
            "local_time": "08:00",
            "weekdays": [0, 1, 2],
            "consent_to_calls": False,
        },
    )
    assert response.status_code == 422
