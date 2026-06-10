from fastapi.testclient import TestClient

from app import database
from app import main
from app.models import SensorReading


def setup_function():
    database.DB_PATH = database.DB_PATH.parent / "test_arduinow.db"
    if database.DB_PATH.exists():
        database.DB_PATH.unlink()
    main.weather_cache.clear()


class FakeSensorProvider:
    def read(self) -> SensorReading:
        return SensorReading(
            timestamp="2026-06-10T12:00:00",
            temperature=24.5,
            humidity=45,
            light=0,
            air_quality=82,
            air_quality_raw=184,
        )


def test_latest_sensor_shape():
    main.provider = FakeSensorProvider()
    with TestClient(main.app) as client:
        response = client.get("/api/sensors/latest")
    assert response.status_code == 200
    data = response.json()
    assert -40 <= data["temperature"] <= 85
    assert 0 <= data["humidity"] <= 100
    assert 0 <= data["light"] <= 100
    assert 0 <= data["air_quality"] <= 100
    assert 0 <= data["air_quality_raw"] <= 1023
    assert "timestamp" in data


def test_controls_round_trip():
    payload = {"light": False, "fan": True, "local_only": True, "alerts": False}
    with TestClient(main.app) as client:
        response = client.post("/api/controls", json=payload)
        fetched = client.get("/api/controls")
    assert response.status_code == 200
    assert fetched.json() == payload


def test_weather_current_shape(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "current": {
                    "time": "2026-06-10T12:00",
                    "temperature_2m": 24.2,
                    "relative_humidity_2m": 54,
                    "apparent_temperature": 25.1,
                    "precipitation": 0,
                    "weather_code": 1,
                    "wind_speed_10m": 6.4,
                }
            }

    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: FakeResponse())
    with TestClient(main.app) as client:
        response = client.get("/api/weather/current?lat=37.5665&lon=126.9780")

    assert response.status_code == 200
    data = response.json()
    assert data["temperature"] == 24.2
    assert data["humidity"] == 54
    assert data["description"] == "대체로 맑음"


def test_study_presence_starts_and_pauses_session():
    with TestClient(main.app) as client:
        first = client.post(
            "/api/study/presence",
            json={
                "present": True,
                "confidence": 0.92,
                "source": "browser_camera",
                "observed_at": "2026-06-10T09:00:00",
            },
        )
        started = client.post(
            "/api/study/presence",
            json={
                "present": True,
                "confidence": 0.95,
                "source": "browser_camera",
                "observed_at": "2026-06-10T09:00:05",
            },
        )
        absent = client.post(
            "/api/study/presence",
            json={
                "present": False,
                "confidence": 0.1,
                "source": "browser_camera",
                "observed_at": "2026-06-10T09:00:20",
            },
        )
        paused = client.post(
            "/api/study/presence",
            json={
                "present": False,
                "confidence": 0.05,
                "source": "browser_camera",
                "observed_at": "2026-06-10T09:00:35",
            },
        )

    assert first.status_code == 200
    assert started.json()["active"] is True
    assert absent.json()["active"] is True
    assert paused.json()["active"] is False
    assert paused.json()["total_seconds"] == 20


def test_study_today_returns_accumulated_time():
    with TestClient(main.app) as client:
        client.post(
            "/api/study/presence",
            json={"present": True, "confidence": 1, "source": "browser_camera", "observed_at": "2026-06-10T10:00:00"},
        )
        client.post(
            "/api/study/presence",
            json={"present": True, "confidence": 1, "source": "browser_camera", "observed_at": "2026-06-10T10:00:05"},
        )
        response = client.get("/api/study/today")

    assert response.status_code == 200
    data = response.json()
    assert data["active"] is True
    assert data["total_seconds"] >= 0
