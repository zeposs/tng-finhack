"""SQLite-backed mock wallet database.

Schema:
- users(user_id TEXT PRIMARY KEY, name TEXT, balance REAL)
- history(id INTEGER PK, user_id TEXT, kind TEXT, amount REAL,
          counterparty TEXT, ts TEXT)
- promotions(id INTEGER PK, merchant TEXT, title TEXT, save_amount REAL,
             label TEXT, accent TEXT)
"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Iterator

from app.config import settings

DEFAULT_USER_ID = "demo-user"
DEFAULT_USER_NAME = "Auntie Lim"
DEFAULT_BALANCE = 250.00


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create tables and seed default data if empty. Safe to call repeatedly."""
    with _connect() as conn:
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                balance REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                amount REAL NOT NULL,
                counterparty TEXT,
                ts TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant TEXT NOT NULL,
                title TEXT NOT NULL,
                save_amount REAL NOT NULL,
                label TEXT NOT NULL,
                accent TEXT NOT NULL
            );
            """
        )

        cur.execute("SELECT COUNT(*) AS c FROM users")
        if cur.fetchone()["c"] == 0:
            cur.execute(
                "INSERT INTO users(user_id, name, balance) VALUES(?,?,?)",
                (DEFAULT_USER_ID, DEFAULT_USER_NAME, DEFAULT_BALANCE),
            )

        cur.execute("SELECT COUNT(*) AS c FROM promotions")
        if cur.fetchone()["c"] == 0:
            cur.executemany(
                """
                INSERT INTO promotions
                    (merchant, title, save_amount, label, accent)
                VALUES (?,?,?,?,?)
                """,
                [
                    (
                        "Jaya Grocer",
                        "15% off fresh produce",
                        12.00,
                        "Show this at shop",
                        "#16a34a",
                    ),
                    (
                        "AEON",
                        "Buy 2 Free 1 on household items",
                        8.00,
                        "Show this at shop",
                        "#db2777",
                    ),
                    (
                        "99 Speedmart",
                        "RM5 off min spend RM30",
                        5.00,
                        "Show this at shop",
                        "#f59e0b",
                    ),
                ],
            )


_initialised = False


def _ensure_init() -> None:
    """Idempotent guard so direct imports (e.g. tests) work without Flask."""
    global _initialised
    if not _initialised:
        init_db()
        _initialised = True


def get_balance(user_id: str = DEFAULT_USER_ID) -> float:
    _ensure_init()
    with _connect() as conn:
        row = conn.execute(
            "SELECT balance FROM users WHERE user_id = ?", (user_id,)
        ).fetchone()
        return float(row["balance"]) if row else 0.0


def set_balance(new_balance: float, user_id: str = DEFAULT_USER_ID) -> float:
    _ensure_init()
    with _connect() as conn:
        conn.execute(
            "UPDATE users SET balance = ? WHERE user_id = ?",
            (round(float(new_balance), 2), user_id),
        )
    return get_balance(user_id)


def add_history(
    kind: str,
    amount: float,
    counterparty: str | None = None,
    user_id: str = DEFAULT_USER_ID,
) -> dict:
    _ensure_init()
    ts = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO history(user_id, kind, amount, counterparty, ts)
            VALUES(?,?,?,?,?)
            """,
            (user_id, kind, round(float(amount), 2), counterparty, ts),
        )
        return {
            "id": cur.lastrowid,
            "kind": kind,
            "amount": round(float(amount), 2),
            "counterparty": counterparty,
            "ts": ts,
        }


def list_history(limit: int = 10, user_id: str = DEFAULT_USER_ID) -> list[dict]:
    _ensure_init()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, kind, amount, counterparty, ts
            FROM history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]


def list_promotions() -> list[dict]:
    _ensure_init()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, merchant, title, save_amount, label, accent
            FROM promotions
            ORDER BY id ASC
            """
        ).fetchall()
        return [dict(r) for r in rows]
