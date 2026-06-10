from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime

import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.config import settings
from app.models import ControlState, DeviceHealth, EventLog, SensorReading
from app.providers import create_provider

provider = None


def get_provider():
    global provider
    if provider is None:
        provider = create_provider(settings.sensor_provider)
    return provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    if not database.events():
        database.add_event("info", "System started", "Serial sensor provider is active.")
    yield


app = FastAPI(title="ArduiNow UNO Q API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/sensors/latest", response_model=SensorReading)
def get_latest_sensor() -> SensorReading:
    try:
        reading = get_provider().read()
    except (RuntimeError, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    database.save_reading(reading)
    return reading


@app.get("/api/sensors/history", response_model=list[SensorReading])
def get_sensor_history(limit: int = 60) -> list[SensorReading]:
    stored = database.history(limit)
    if stored:
        return stored
    try:
        reading = get_provider().read()
    except (RuntimeError, OSError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    database.save_reading(reading)
    return [reading]


@app.get("/api/controls", response_model=ControlState)
def get_controls() -> ControlState:
    return database.get_controls()


@app.post("/api/controls", response_model=ControlState)
def update_controls(state: ControlState) -> ControlState:
    current = database.get_controls()
    updated = database.set_controls(state)
    changes = [
        name
        for name in ("light", "fan", "local_only", "alerts")
        if getattr(current, name) != getattr(updated, name)
    ]
    if changes:
        database.add_event("info", "Control state changed", ", ".join(changes) + " changed.")
    return updated


@app.get("/api/device/health", response_model=DeviceHealth)
def get_device_health() -> DeviceHealth:
    return DeviceHealth(
        cpu_load=round(psutil.cpu_percent(interval=0.05)),
        memory_usage=round(psutil.virtual_memory().percent),
        network_quality=82,
        model="Arduino UNO Q 2GB/4GB",
        server_status="online",
    )


@app.get("/api/events", response_model=list[EventLog])
def get_events(limit: int = 20) -> list[EventLog]:
    return database.events(limit)


@app.get("/api/ping")
def ping() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
