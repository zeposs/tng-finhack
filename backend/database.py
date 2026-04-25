import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'quickmode.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT DEFAULT 'Demo User',
            balance REAL DEFAULT 250.00
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT,
            amount REAL,
            merchant TEXT,
            timestamp TEXT,
            status TEXT DEFAULT 'completed'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS promotions (
            id INTEGER PRIMARY KEY,
            merchant TEXT,
            discount TEXT,
            savings TEXT,
            label TEXT
        )
    ''')

    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO users (id, name, balance) VALUES (1, "Demo User", 250.00)')

    cursor.execute('SELECT COUNT(*) FROM promotions')
    if cursor.fetchone()[0] == 0:
        cursor.executemany('INSERT INTO promotions (id, merchant, discount, savings, label) VALUES (?, ?, ?, ?, ?)', [
            (1, 'Jaya Grocer', '15% off fresh produce', 'RM12', 'Show this at shop'),
            (2, 'AEON', 'Buy 2 Free 1 on household items', 'RM8', 'Show this at shop'),
            (3, '99 Speedmart', 'RM5 off min spend RM30', 'RM5', 'Show this at shop'),
        ])

    conn.commit()
    conn.close()

def get_balance(user_id=1):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT balance FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row['balance'] if row else 0.0

def update_balance(user_id, amount):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET balance = balance + ? WHERE id = ?', (amount, user_id))
    conn.commit()
    cursor.execute('SELECT balance FROM users WHERE id = ?', (user_id,))
    row = cursor.fetchone()
    conn.close()
    return row['balance'] if row else 0.0

def add_transaction(user_id, tx_type, amount, merchant=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO transactions (user_id, type, amount, merchant, timestamp) VALUES (?, ?, ?, ?, ?)',
        (user_id, tx_type, amount, merchant, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def get_promotions():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM promotions')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

init_db()
