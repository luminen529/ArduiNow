from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.models import ControlState, EventLog, SensorReading


def _database_path() -> Path:
    if settings.database_url.startswith("sqlite:///"):
        return Path(settings.database_url.removeprefix("sqlite:///"))
    return Path("arduinow.db")


DB_PATH = _database_path()


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with connect() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                temperature REAL NOT NULL,
                humidity INTEGER NOT NULL,
                light INTEGER NOT NULL,
                air_quality INTEGER NOT NULL,
                air_quality_raw INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        columns = {row["name"] for row in db.execute("PRAGMA table_info(sensor_readings)").fetchall()}
        if "air_quality_raw" not in columns:
            db.execute("ALTER TABLE sensor_readings ADD COLUMN air_quality_raw INTEGER NOT NULL DEFAULT 0")
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS controls (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                light INTEGER NOT NULL,
                fan INTEGER NOT NULL,
                local_only INTEGER NOT NULL,
                alerts INTEGER NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT NOT NULL,
                title TEXT NOT NULL,
                detail TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        db.execute(
            "INSERT OR IGNORE INTO controls (id, light, fan, local_only, alerts) VALUES (1, 1, 0, 1, 1)"
        )


def save_reading(reading: SensorReading) -> None:
    with connect() as db:
        db.execute(
            """
            INSERT INTO sensor_readings (timestamp, temperature, humidity, light, air_quality, air_quality_raw)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                reading.timestamp.isoformat(),
                reading.temperature,
                reading.humidity,
                reading.light,
                reading.air_quality,
                reading.air_quality_raw,
            ),
        )


def latest_reading() -> SensorReading | None:
    with connect() as db:
        row = db.execute("SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 1").fetchone()
    return _reading_from_row(row) if row else None


def history(limit: int = 60) -> list[SensorReading]:
    with connect() as db:
        rows = db.execute(
            "SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_reading_from_row(row) for row in reversed(rows)]


def get_controls() -> ControlState:
    with connect() as db:
        row = db.execute("SELECT * FROM controls WHERE id = 1").fetchone()
    return ControlState(
        light=bool(row["light"]),
        fan=bool(row["fan"]),
        local_only=bool(row["local_only"]),
        alerts=bool(row["alerts"]),
    )


def set_controls(state: ControlState) -> ControlState:
    with connect() as db:
        db.execute(
            """
            UPDATE controls
            SET light = ?, fan = ?, local_only = ?, alerts = ?
            WHERE id = 1
            """,
            (int(state.light), int(state.fan), int(state.local_only), int(state.alerts)),
        )
    return state


def add_event(level: str, title: str, detail: str) -> None:
    with connect() as db:
        db.execute(
            "INSERT INTO events (level, title, detail, timestamp) VALUES (?, ?, ?, ?)",
            (level, title, detail, datetime.now().isoformat()),
        )


def events(limit: int = 20) -> list[EventLog]:
    with connect() as db:
        rows = db.execute("SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    return [
        EventLog(
            id=row["id"],
            level=row["level"],
            title=row["title"],
            detail=row["detail"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
        )
        for row in rows
    ]


def _reading_from_row(row: sqlite3.Row) -> SensorReading:
    return SensorReading(
        timestamp=datetime.fromisoformat(row["timestamp"]),
        temperature=row["temperature"],
        humidity=row["humidity"],
        light=row["light"],
        air_quality=row["air_quality"],
        air_quality_raw=row["air_quality_raw"] if "air_quality_raw" in row.keys() else 0,
    )
