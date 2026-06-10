from __future__ import annotations

import re
import time
from threading import Lock
from abc import ABC, abstractmethod
from datetime import datetime

from app.config import settings
from app.models import SensorReading


class SensorProvider(ABC):
    @abstractmethod
    def read(self) -> SensorReading:
        """Return one sensor reading from the active data source."""


class SerialArduinoSensorProvider(SensorProvider):
    _temperature_pattern = re.compile(r"Temperature:\s*(-?\d+(?:\.\d+)?)", re.IGNORECASE)
    _humidity_pattern = re.compile(r"Humidity:\s*(\d+(?:\.\d+)?)", re.IGNORECASE)
    _air_raw_pattern = re.compile(r"AirQualityRaw:\s*(\d+)", re.IGNORECASE)
    _air_quality_pattern = re.compile(r"AirQuality:\s*(\d+)", re.IGNORECASE)

    def __init__(self, port: str, baudrate: int) -> None:
        try:
            import serial
        except ImportError as exc:
            raise RuntimeError("pyserial is required for SENSOR_PROVIDER=serial_arduino") from exc

        self._serial = serial.Serial(port=port, baudrate=baudrate, timeout=3)
        self._serial.timeout = 1
        self._lock = Lock()
        self._last_reading: SensorReading | None = None

    def read(self) -> SensorReading:
        with self._lock:
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                line = self._serial.readline().decode("utf-8", errors="ignore").strip()
                reading = self._parse_line(line)
                if reading:
                    self._last_reading = reading
                    return reading

        raise RuntimeError("No valid sensor data received from Arduino serial port")

    def _parse_line(self, line: str) -> SensorReading | None:
        temperature = self._temperature_pattern.search(line)
        humidity = self._humidity_pattern.search(line)
        air_raw = self._air_raw_pattern.search(line)
        air_quality = self._air_quality_pattern.search(line)
        if not (temperature and humidity):
            return None

        air_quality_raw = int(air_raw.group(1)) if air_raw else 0
        air_quality_score = int(air_quality.group(1)) if air_quality else 0

        return SensorReading(
            timestamp=datetime.now(),
            temperature=round(float(temperature.group(1)), 1),
            humidity=round(float(humidity.group(1))),
            light=0,
            air_quality=max(0, min(100, air_quality_score)),
            air_quality_raw=max(0, min(1023, air_quality_raw)),
        )


def create_provider(kind: str) -> SensorProvider:
    if kind in {"serial_arduino", "serial_dht"}:
        return SerialArduinoSensorProvider(settings.serial_port, settings.serial_baudrate)
    raise ValueError(f"Unsupported sensor provider: {kind}")
