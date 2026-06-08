from fastapi.testclient import TestClient

from app.main import app


def test_latest_sensor_shape():
    with TestClient(app) as client:
        response = client.get("/api/sensors/latest")
    assert response.status_code == 200
    data = response.json()
    assert -40 <= data["temperature"] <= 85
    assert 0 <= data["humidity"] <= 100
    assert 0 <= data["light"] <= 100
    assert 0 <= data["air_quality"] <= 100
    assert "timestamp" in data


def test_controls_round_trip():
    payload = {"light": False, "fan": True, "local_only": True, "alerts": False}
    with TestClient(app) as client:
        response = client.post("/api/controls", json=payload)
        fetched = client.get("/api/controls")
    assert response.status_code == 200
    assert fetched.json() == payload
