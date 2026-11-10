"""SQLite persistence layer for cases, documents and events."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    source_type TEXT NOT NULL,
    source_label TEXT,
    raw_text TEXT NOT NULL,
    document_date TEXT NOT NULL,
    date_confidence TEXT NOT NULL,
    media_path TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id),
    case_id INTEGER NOT NULL REFERENCES cases(id),
    event_date TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    people_involved TEXT,
    verbatim_excerpt TEXT,
    importance TEXT NOT NULL,
    reason TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)


def create_case(name: str) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO cases (name, created_at) VALUES (?, ?)",
            (name, _now()),
        )
        return cur.lastrowid


def list_cases() -> list[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM cases ORDER BY created_at DESC"
        ).fetchall()


def importance_sequences() -> dict[int, list[str]]:
    """Return {case_id: [importance, ...]} in event-date order, oldest first.

    Lets the overview draw each case's priority-over-time bar without fetching
    every case's full detail.
    """
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT case_id, importance FROM events ORDER BY event_date, id"
        ).fetchall()
    sequences: dict[int, list[str]] = {}
    for r in rows:
        sequences.setdefault(r["case_id"], []).append(r["importance"])
    return sequences


def importance_counts() -> dict[int, dict[str, int]]:
    """Return {case_id: {importance: count}} across all events.

    Used to show a per-case "flagged for review" summary on the overview,
    without fetching every case's full detail.
    """
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT case_id, importance, COUNT(*) AS n "
            "FROM events GROUP BY case_id, importance"
        ).fetchall()
    counts: dict[int, dict[str, int]] = {}
    for r in rows:
        counts.setdefault(r["case_id"], {})[r["importance"]] = r["n"]
    return counts


def add_document(
    case_id: int,
    source_type: str,
    source_label: str,
    raw_text: str,
    document_date: str,
    date_confidence: str,
    media_path: str | None,
) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO documents
               (case_id, source_type, source_label, raw_text, document_date,
                date_confidence, media_path, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                case_id,
                source_type,
                source_label,
                raw_text,
                document_date,
                date_confidence,
                media_path,
                _now(),
            ),
        )
        return cur.lastrowid


def add_events(document_id: int, case_id: int, events: list[dict]) -> None:
    with get_connection() as conn:
        conn.executemany(
            """INSERT INTO events
               (document_id, case_id, event_date, category, summary,
                people_involved, verbatim_excerpt, importance, reason)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [
                (
                    document_id,
                    case_id,
                    e["event_date"],
                    e["category"],
                    e["summary"],
                    ", ".join(e.get("people_involved") or []),
                    e.get("verbatim_excerpt"),
                    e["importance"],
                    e.get("reason"),
                )
                for e in events
            ],
        )


def list_documents(case_id: int) -> list[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM documents WHERE case_id = ? ORDER BY created_at",
            (case_id,),
        ).fetchall()


def list_events(case_id: int) -> list[sqlite3.Row]:
    with get_connection() as conn:
        return conn.execute(
            "SELECT * FROM events WHERE case_id = ? ORDER BY event_date",
            (case_id,),
        ).fetchall()


def delete_document(case_id: int, document_id: int) -> sqlite3.Row | None:
    """Delete one document and its events; return the deleted row (for its media), or None.

    Scoped to the case so a document id from another case can't be deleted via this one.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND case_id = ?", (document_id, case_id)
        ).fetchone()
        if row is None:
            return None
        conn.execute("DELETE FROM events WHERE document_id = ?", (document_id,))
        conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        return row


def _clear_case(conn: sqlite3.Connection, case_id: int) -> list[str]:
    paths = [
        r["media_path"]
        for r in conn.execute(
            "SELECT media_path FROM documents WHERE case_id = ? AND media_path IS NOT NULL",
            (case_id,),
        )
    ]
    # Events first: foreign keys are enforced and there is no ON DELETE CASCADE.
    conn.execute("DELETE FROM events WHERE case_id = ?", (case_id,))
    conn.execute("DELETE FROM documents WHERE case_id = ?", (case_id,))
    return paths


def clear_case(case_id: int) -> list[str]:
    """Delete every document and event in a case, keeping the case; return media paths."""
    with get_connection() as conn:
        return _clear_case(conn, case_id)


def delete_case(case_id: int) -> bool:
    """Delete a case with all its documents and events. False if it didn't exist."""
    with get_connection() as conn:
        _clear_case(conn, case_id)
        return conn.execute("DELETE FROM cases WHERE id = ?", (case_id,)).rowcount > 0
