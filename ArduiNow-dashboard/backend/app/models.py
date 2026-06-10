from datetime import datetime
from pydantic import BaseModel, Field


class SensorReading(BaseModel):
    timestamp: datetime
    temperature: float = Field(ge=-40, le=85)
    humidity: int = Field(ge=0, le=100)
    light: int = Field(ge=0, le=100)
    air_quality: int = Field(ge=0, le=100)
    air_quality_raw: int = Field(default=0, ge=0, le=1023)


class ControlState(BaseModel):
    light: bool = True
    fan: bool = False
    local_only: bool = True
    alerts: bool = True


class DeviceHealth(BaseModel):
    cpu_load: int = Field(ge=0, le=100)
    memory_usage: int = Field(ge=0, le=100)
    network_quality: int = Field(ge=0, le=100)
    model: str = "UNO Q"
    server_status: str = "online"


class EventLog(BaseModel):
    id: int
    level: str
    title: str
    detail: str
    timestamp: datetime


class WeatherCurrent(BaseModel):
    timestamp: datetime
    temperature: float
    apparent_temperature: float
    humidity: int = Field(ge=0, le=100)
    precipitation: float = Field(ge=0)
    wind_speed: float = Field(ge=0)
    weather_code: int
    description: str
    latitude: float
    longitude: float


class StudyPresenceInput(BaseModel):
    present: bool
    confidence: float = Field(ge=0, le=1)
    source: str = Field(default="browser_camera", min_length=1, max_length=40)
    observed_at: datetime | None = None


class StudyToday(BaseModel):
    date: str
    present: bool
    active: bool
    total_seconds: int = Field(ge=0)
    current_session_seconds: int = Field(ge=0)
    last_source: str | None = None
    last_confidence: float | None = Field(default=None, ge=0, le=1)
    last_observed_at: datetime | None = None
