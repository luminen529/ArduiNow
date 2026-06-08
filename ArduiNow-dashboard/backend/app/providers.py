from __future__ import annotations

import math
import random
import re
from abc import ABC, abstractmethod
from datetime import datetime

from app.config import settings
from app.models import SensorReading


class SensorProvider(ABC):
    @abstractmethod
    def read(self) -> SensorReading:
        """Return one sensor reading from the active data source."""


class DummySensorProvider(SensorProvider):
    def __init__(self) -> None:
        self._tick = 0

    def read(self) -> SensorReading:
        self._tick += 1
        wave = math.sin(self._tick / 6)
        return SensorReading(
            timestamp=datetime.now(),
            temperature=round(24.2 + wave * 1.8 + random.uniform(-0.25, 0.25), 1),
            humidity=max(35, min(65, round(48 - wave * 5 + random.uniform(-2, 2)))),
            light=max(0, min(100, round(62 + math.sin(self._tick / 4) * 24 + random.uniform(-4, 4)))),
            air_quality=max(0, min(100, round(94 - abs(wave) * 5 + random.uniform(-2, 2)))),
        )


class SerialDhtSensorProvider(SensorProvider):
    _temperature_pattern = re.compile(r"Temperature:\s*(-?\d+(?:\.\d+)?)", re.IGNORECASE)

    def __init__(self, port: str, baudrate: int) -> None:
        try:
            import serial
        except ImportError as exc:
            raise RuntimeError("pyserial is required for SENSOR_PROVIDER=serial_dht") from exc

        self._serial = serial.Serial(port=port, baudrate=baudrate, timeout=3)
        self._last_temperature = 0.0

    def read(self) -> SensorReading:
        for _ in range(8):
            line = self._serial.readline().decode("utf-8", errors="ignore").strip()
            match = self._temperature_pattern.search(line)
            if match:
                self._last_temperature = round(float(match.group(1)), 1)
                break

        return SensorReading(
            timestamp=datetime.now(),
            temperature=self._last_temperature,
            humidity=0,
            light=0,
            air_quality=100,
        )


def create_provider(kind: str) -> SensorProvider:
    if kind == "dummy":
        return DummySensorProvider()
    if kind == "serial_dht":
        return SerialDhtSensorProvider(settings.serial_port, settings.serial_baudrate)
    raise ValueError(f"Unsupported sensor provider: {kind}")
