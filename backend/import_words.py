import csv
import sqlite3

conn = sqlite3.connect('words.db')
cursor = conn.cursor()

cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        cover TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    '''
)
cursor.execute("SELECT id FROM books ORDER BY id ASC LIMIT 1")
row = cursor.fetchone()
if row:
    default_book_id = row[0]
else:
    cursor.execute(
        '''
        INSERT INTO books (name, description, cover)
        VALUES (?, ?, ?)
        ''',
        ('默认词书', '系统默认词书', '')
    )
    default_book_id = cursor.lastrowid

cursor.execute("PRAGMA table_info(words)")
columns = {row[1] for row in cursor.fetchall()}
if 'pos' not in columns:
    cursor.execute("ALTER TABLE words ADD COLUMN pos TEXT DEFAULT '未知'")
if 'phonetic' not in columns:
    cursor.execute("ALTER TABLE words ADD COLUMN phonetic TEXT DEFAULT ''")
if 'audio' not in columns:
    cursor.execute("ALTER TABLE words ADD COLUMN audio TEXT DEFAULT ''")
if 'book_id' not in columns:
    cursor.execute("ALTER TABLE words ADD COLUMN book_id INTEGER")

with open('words.csv', 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file)

    data = [
        (
            row['word'],
            row['meaning'],
            row.get('pos', '未知') or '未知',
            row.get('phonetic', '') or '',
            row.get('audio', '') or '',
            default_book_id
        )
        for row in reader
    ]

cursor.executemany(
    "INSERT INTO words (word, meaning, pos, phonetic, audio, book_id) VALUES (?, ?, ?, ?, ?, ?)",
    data
)

conn.commit()
conn.close()

print(f"成功导入 {len(data)} 条单词！")
