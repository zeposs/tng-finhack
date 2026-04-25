import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "wallet.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 250.00
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            merchant TEXT,
            description TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            merchant TEXT NOT NULL,
            discount TEXT NOT NULL,
            savings TEXT NOT NULL,
            label TEXT NOT NULL,
            icon TEXT NOT NULL
        )
    """)

    # Seed default user
    cursor.execute("SELECT id FROM users WHERE id = 'user_001'")
    if cursor.fetchone() is None:
        cursor.execute(
            "INSERT INTO users (id, name, balance) VALUES (?, ?, ?)",
            ("user_001", "Ah Ma", 250.00),
        )

    # Seed promotions
    cursor.execute("SELECT COUNT(*) as c FROM promotions")
    if cursor.fetchone()["c"] == 0:
        promos = [
            ("Jaya Grocer", "15% off fresh produce", "RM12", "Show this at shop", "🛒"),
            ("AEON", "Buy 2 Free 1 on household items", "RM8", "Show this at shop", "🏬"),
            ("99 Speedmart", "RM5 off min spend RM30", "RM5", "Show this at shop", "🏪"),
        ]
        cursor.executemany(
            "INSERT INTO promotions (merchant, discount, savings, label, icon) VALUES (?, ?, ?, ?, ?)",
            promos,
        )

    conn.commit()
    conn.close()


def get_balance(user_id="user_001"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row["balance"] if row else 0.0


def make_payment(user_id, amount, merchant):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        return {"success": False, "message": "User not found"}

    current_balance = row["balance"]
    if current_balance < amount:
        conn.close()
        return {"success": False, "message": "Insufficient balance"}

    new_balance = current_balance - amount
    cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
    cursor.execute(
        "INSERT INTO transactions (user_id, type, amount, merchant, description, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, "payment", amount, merchant, f"Payment to {merchant}", datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"success": True, "new_balance": new_balance, "amount": amount, "merchant": merchant}


def top_up(user_id, amount):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT balance FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if row is None:
        conn.close()
        return {"success": False, "message": "User not found"}

    new_balance = row["balance"] + amount
    cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
    cursor.execute(
        "INSERT INTO transactions (user_id, type, amount, merchant, description, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, "topup", amount, None, f"Top up RM{amount:.2f}", datetime.now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"success": True, "new_balance": new_balance, "amount": amount}


def get_transactions(user_id="user_001", limit=10):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_promotions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM promotions")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
