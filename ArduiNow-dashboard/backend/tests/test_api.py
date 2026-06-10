from fastapi.testclient import TestClient

from app import main
from app.models import SensorReading


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
