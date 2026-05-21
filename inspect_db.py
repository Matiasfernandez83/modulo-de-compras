import sqlite3
db_path = r'backend\database\gestion_compras.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cursor.fetchall()]
print('TABLAS:', tables)
for t in tables:
    cursor.execute(f'PRAGMA table_info({t})')
    cols = [(r[1], r[2]) for r in cursor.fetchall()]
    print(f'  {t}: {cols}')
conn.close()
