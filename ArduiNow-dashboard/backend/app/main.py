from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
import time

import httpx
import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.config import settings
from app.models import ControlState, DeviceHealth, EventLog, SensorReading
from app.models import StudyPresenceInput, StudyToday, WeatherCurrent
from app.providers import create_provider

provider = None
weather_cache: dict[tuple[float, float], tuple[float, WeatherCurrent]] = {}
WEATHER_CACHE_SECONDS = 300


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


@app.get("/api/weather/current", response_model=WeatherCurrent)
def get_current_weather(lat: float, lon: float) -> WeatherCurrent:
    cache_key = (round(lat, 3), round(lon, 3))
    cached = weather_cache.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < WEATHER_CACHE_SECONDS:
        return cached[1]

    try:
        response = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
                "timezone": "auto",
            },
            timeout=5,
        )
        response.raise_for_status()
        payload = response.json()
        current = payload["current"]
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="Weather service is temporarily unavailable") from exc

    weather = WeatherCurrent(
        timestamp=datetime.fromisoformat(str(current["time"])),
        temperature=float(current["temperature_2m"]),
        apparent_temperature=float(current["apparent_temperature"]),
        humidity=int(current["relative_humidity_2m"]),
        precipitation=float(current["precipitation"]),
        wind_speed=float(current["wind_speed_10m"]),
        weather_code=int(current["weather_code"]),
        description=_weather_description(int(current["weather_code"])),
        latitude=lat,
        longitude=lon,
    )
    weather_cache[cache_key] = (now, weather)
    return weather


@app.post("/api/study/presence", response_model=StudyToday)
def post_study_presence(payload: StudyPresenceInput) -> StudyToday:
    return database.record_presence(payload)


@app.get("/api/study/today", response_model=StudyToday)
def get_study_today() -> StudyToday:
    return database.study_today()


@app.post("/api/study/session/reset", response_model=StudyToday)
def reset_study_session() -> StudyToday:
    return database.reset_study_today()


@app.get("/api/ping")
def ping() -> dict[str, str]:
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


def _weather_description(code: int) -> str:
    descriptions = {
        0: "맑음",
        1: "대체로 맑음",
        2: "부분적으로 흐림",
        3: "흐림",
        45: "안개",
        48: "서리 안개",
        51: "약한 이슬비",
        53: "이슬비",
        55: "강한 이슬비",
        61: "약한 비",
        63: "비",
        65: "강한 비",
        71: "약한 눈",
        73: "눈",
        75: "강한 눈",
        80: "약한 소나기",
        81: "소나기",
        82: "강한 소나기",
        95: "뇌우",
    }
    return descriptions.get(code, "날씨 정보")
