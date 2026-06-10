from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from app.config import settings
from app.models import ControlState, EventLog, SensorReading
from app.models import StudyPresenceInput, StudyToday

PRESENT_START_SECONDS = 5
ABSENT_STOP_SECONDS = 15


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
            """
            CREATE TABLE IF NOT EXISTS study_presence_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                observed_at TEXT NOT NULL,
                present INTEGER NOT NULL,
                confidence REAL NOT NULL,
                source TEXT NOT NULL
            )
            """
        )
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                source TEXT NOT NULL,
                status TEXT NOT NULL
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


def record_presence(payload: StudyPresenceInput) -> StudyToday:
    observed_at = payload.observed_at or datetime.now()
    with connect() as db:
        db.execute(
            """
            INSERT INTO study_presence_events (observed_at, present, confidence, source)
            VALUES (?, ?, ?, ?)
            """,
            (observed_at.isoformat(), int(payload.present), payload.confidence, payload.source),
        )
        _apply_study_session_rules(db, observed_at, payload)
    return study_today()


def study_today(now: datetime | None = None) -> StudyToday:
    current_time = now or datetime.now()
    start_of_day = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    with connect() as db:
        active = _active_session(db)
        sessions = db.execute(
            """
            SELECT * FROM study_sessions
            WHERE started_at >= ?
            ORDER BY started_at ASC
            """,
            (start_of_day.isoformat(),),
        ).fetchall()
        last_event = db.execute(
            """
            SELECT * FROM study_presence_events
            WHERE observed_at >= ?
            ORDER BY observed_at DESC
            LIMIT 1
            """,
            (start_of_day.isoformat(),),
        ).fetchone()

    total_seconds = 0
    current_session_seconds = 0
    for row in sessions:
        started_at = datetime.fromisoformat(row["started_at"])
        ended_at = datetime.fromisoformat(row["ended_at"]) if row["ended_at"] else current_time
        duration = max(0, int((ended_at - started_at).total_seconds()))
        total_seconds += duration
        if active and row["id"] == active["id"]:
            current_session_seconds = duration

    return StudyToday(
        date=current_time.date().isoformat(),
        present=bool(last_event["present"]) if last_event else False,
        active=active is not None,
        total_seconds=total_seconds,
        current_session_seconds=current_session_seconds,
        last_source=last_event["source"] if last_event else None,
        last_confidence=last_event["confidence"] if last_event else None,
        last_observed_at=datetime.fromisoformat(last_event["observed_at"]) if last_event else None,
    )


def reset_study_today() -> StudyToday:
    now = datetime.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    with connect() as db:
        db.execute("DELETE FROM study_presence_events WHERE observed_at >= ?", (start_of_day.isoformat(),))
        db.execute("DELETE FROM study_sessions WHERE started_at >= ?", (start_of_day.isoformat(),))
    return study_today(now)


def _apply_study_session_rules(db: sqlite3.Connection, observed_at: datetime, payload: StudyPresenceInput) -> None:
    active = _active_session(db)
    if payload.present:
        if active is None and _current_streak_seconds(db, observed_at, present=True) >= PRESENT_START_SECONDS:
            streak_start = _current_streak_start(db, present=True) or observed_at
            db.execute(
                """
                INSERT INTO study_sessions (started_at, ended_at, source, status)
                VALUES (?, NULL, ?, 'active')
                """,
                (streak_start.isoformat(), payload.source),
            )
        return

    if active and _current_streak_seconds(db, observed_at, present=False) >= ABSENT_STOP_SECONDS:
        absent_start = _current_streak_start(db, present=False) or observed_at
        db.execute(
            """
            UPDATE study_sessions
            SET ended_at = ?, status = 'paused'
            WHERE id = ?
            """,
            (absent_start.isoformat(), active["id"]),
        )


def _active_session(db: sqlite3.Connection) -> sqlite3.Row | None:
    return db.execute(
        "SELECT * FROM study_sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1"
    ).fetchone()


def _current_streak_seconds(db: sqlite3.Connection, observed_at: datetime, present: bool) -> int:
    streak_start = _current_streak_start(db, present)
    if streak_start is None:
        return 0
    return max(0, int((observed_at - streak_start).total_seconds()))


def _current_streak_start(db: sqlite3.Connection, present: bool) -> datetime | None:
    rows = db.execute(
        """
        SELECT observed_at, present FROM study_presence_events
        ORDER BY observed_at DESC
        LIMIT 120
        """
    ).fetchall()
    if not rows or bool(rows[0]["present"]) != present:
        return None

    start = datetime.fromisoformat(rows[0]["observed_at"])
    for row in rows[1:]:
        if bool(row["present"]) != present:
            break
        start = datetime.fromisoformat(row["observed_at"])
    return start


def _reading_from_row(row: sqlite3.Row) -> SensorReading:
    return SensorReading(
        timestamp=datetime.fromisoformat(row["timestamp"]),
        temperature=row["temperature"],
        humidity=row["humidity"],
        light=row["light"],
        air_quality=row["air_quality"],
        air_quality_raw=row["air_quality_raw"] if "air_quality_raw" in row.keys() else 0,
    )
