from __future__ import annotations

import math
import random
from abc import ABC, abstractmethod
from datetime import datetime

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


def create_provider(kind: str) -> SensorProvider:
    if kind == "dummy":
        return DummySensorProvider()
    raise ValueError(f"Unsupported sensor provider: {kind}")
