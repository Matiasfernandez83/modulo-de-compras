"""Conexión centralizada a la base de datos: PostgreSQL o SQLite.

- Si existe la variable de entorno DATABASE_URL (postgres://...), usa PostgreSQL
  (persistente, para producción en Render/Supabase/Neon).
- Si no, usa SQLite local (desarrollo y tests), como hasta ahora.

Un adaptador fino hace que el resto del código no cambie: traduce los
placeholders `?`→`%s`, emula `cursor.lastrowid` con `RETURNING id`, permite
acceder a las filas por nombre y por índice, y convierte `INSERT OR IGNORE`.
"""

import os
import re
import sqlite3
from pathlib import Path


def _database_url():
    url = os.getenv('DATABASE_URL', '').strip()
    # Render/Heroku a veces exponen 'postgres://'; psycopg quiere 'postgresql://'
    if url.startswith('postgres://'):
        url = 'postgresql://' + url[len('postgres://'):]
    return url


DATABASE_URL = _database_url()
IS_POSTGRES = DATABASE_URL.startswith('postgresql://')

# Excepción de violación de integridad, portable entre SQLite y PostgreSQL.
# Usar `except IntegrityError` en el resto del código en lugar de sqlite3.IntegrityError.
_integrity_errors = [sqlite3.IntegrityError]
try:  # psycopg puede no estar instalado en entornos solo-SQLite
    import psycopg as _psycopg
    _integrity_errors.append(_psycopg.errors.IntegrityError)
except Exception:
    pass
IntegrityError = tuple(_integrity_errors)


def get_db_path():
    """Path del archivo SQLite (DATABASE_PATH o el default del repo)."""
    env_path = os.getenv('DATABASE_PATH')
    if env_path:
        return env_path
    return str(Path(__file__).resolve().parent / 'gestion_compras.db')


# ----------------------------- PostgreSQL -----------------------------

class _PgRow(dict):
    """Fila que se comporta como sqlite3.Row: acceso por nombre e índice, y dict()."""
    def __init__(self, columnas, valores):
        super().__init__(zip(columnas, valores))
        self._valores = tuple(valores)

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._valores[key]
        return super().__getitem__(key)


def _pg_row_factory(cursor):
    cols = [c.name for c in cursor.description] if cursor.description else []
    def make(values):
        return _PgRow(cols, values)
    return make


# INSERT sin RETURNING ni ON CONFLICT ... DO NOTHING → le agregamos RETURNING id
_INSERT_RE = re.compile(r'^\s*INSERT\s+', re.IGNORECASE)
_HAS_RETURNING_RE = re.compile(r'\bRETURNING\b', re.IGNORECASE)
_DO_NOTHING_RE = re.compile(r'ON\s+CONFLICT.*DO\s+NOTHING', re.IGNORECASE | re.DOTALL)


def _translate(sql):
    """Traduce SQL de SQLite a PostgreSQL. Devuelve (sql, espera_returning)."""
    # INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
    ignore = False
    if re.match(r'^\s*INSERT\s+OR\s+IGNORE\s+', sql, re.IGNORECASE):
        sql = re.sub(r'^\s*INSERT\s+OR\s+IGNORE\s+', 'INSERT ', sql, count=1, flags=re.IGNORECASE)
        ignore = True
    sql = re.sub(r'^\s*INSERT\s+OR\s+REPLACE\s+', 'INSERT ', sql, count=1, flags=re.IGNORECASE)

    # Placeholders posicionales
    sql = sql.replace('?', '%s')

    espera_returning = False
    if _INSERT_RE.match(sql) and not _HAS_RETURNING_RE.search(sql):
        cuerpo = sql.rstrip().rstrip(';')
        if ignore and not _DO_NOTHING_RE.search(cuerpo):
            cuerpo += ' ON CONFLICT DO NOTHING'
        sql = cuerpo + ' RETURNING id'
        espera_returning = True
    return sql, espera_returning


class _PgCursor:
    def __init__(self, real):
        self._cur = real
        self.lastrowid = None

    def execute(self, sql, params=()):
        sql2, espera_returning = _translate(sql)
        self._cur.execute(sql2, params)
        if espera_returning:
            try:
                fila = self._cur.fetchone()
                self.lastrowid = fila[0] if fila else None
            except Exception:
                self.lastrowid = None
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def __iter__(self):
        # sqlite permite iterar el cursor tras execute(); emulamos ese comportamiento
        return iter(self._cur)

    @property
    def rowcount(self):
        return self._cur.rowcount

    @property
    def description(self):
        return self._cur.description

    def close(self):
        self._cur.close()


class _PgConnection:
    """Envuelve una conexión psycopg imitando la API de sqlite3."""
    def __init__(self, real):
        self._conn = real

    def cursor(self):
        return _PgCursor(self._conn.cursor(row_factory=_pg_row_factory))

    def execute(self, sql, params=()):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def _connect_postgres():
    import psycopg
    # prepare_threshold=None desactiva prepared statements: necesario para que
    # funcione con el pooler de Supabase (Supavisor) en modo transacción.
    real = psycopg.connect(DATABASE_URL, autocommit=False, prepare_threshold=None)
    return _PgConnection(real)


# ------------------------------- SQLite -------------------------------

def _connect_sqlite():
    conn = sqlite3.connect(get_db_path(), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA busy_timeout = 15000')
    conn.execute('PRAGMA journal_mode = WAL')
    return conn


def get_db():
    """Abrir una conexión a la base configurada (PostgreSQL o SQLite)."""
    if IS_POSTGRES:
        return _connect_postgres()
    return _connect_sqlite()
