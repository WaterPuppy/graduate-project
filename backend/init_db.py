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

cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT,
        meaning TEXT,
        pos TEXT DEFAULT '未知',
        phonetic TEXT DEFAULT '',
        audio TEXT DEFAULT '',
        book_id INTEGER
    )
    '''
)

cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS wrong_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        meaning TEXT NOT NULL,
        pos TEXT DEFAULT '未知',
        error_count INTEGER NOT NULL DEFAULT 1,
        is_mastered INTEGER NOT NULL DEFAULT 0,
        is_focus INTEGER NOT NULL DEFAULT 0,
        needs_review INTEGER NOT NULL DEFAULT 1,
        last_wrong_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(word, meaning)
    )
    '''
)

cursor.execute(
    '''
    CREATE TABLE IF NOT EXISTS study_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        book_id INTEGER,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    '''
)

cursor.execute("SELECT id FROM books ORDER BY id ASC LIMIT 1")
row = cursor.fetchone()
if not row:
    cursor.execute(
        '''
        INSERT INTO books (name, description, cover)
        VALUES (?, ?, ?)
        ''',
        ('默认词书', '系统默认词书', '')
    )
    default_book_id = cursor.lastrowid
else:
    default_book_id = row[0]

cursor.execute("UPDATE words SET book_id = ? WHERE book_id IS NULL", (default_book_id,))

conn.commit()
conn.close()

print("数据库初始化完成")
