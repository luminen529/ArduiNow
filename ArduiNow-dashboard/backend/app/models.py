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
