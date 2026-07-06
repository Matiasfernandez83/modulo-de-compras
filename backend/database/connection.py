"""Conexión centralizada a la base de datos.

Único punto de acceso a SQLite para rutas, servicios y middleware.
El path se puede sobreescribir con la variable de entorno DATABASE_PATH
(útil para tests y para montar un disco persistente en Render).
"""

import os
import sqlite3
from pathlib import Path


def get_db_path():
    """Path del archivo SQLite (DATABASE_PATH o el default del repo)."""
    env_path = os.getenv('DATABASE_PATH')
    if env_path:
        return env_path
    return str(Path(__file__).resolve().parent / 'gestion_compras.db')


def get_db():
    """Abrir una conexión con foreign keys activas y modo WAL.

    - foreign_keys=ON: SQLite no valida claves foráneas por defecto.
    - busy_timeout: evita errores 'database is locked' con varios workers.
    - journal_mode=WAL: permite lecturas concurrentes con una escritura.
    """
    conn = sqlite3.connect(get_db_path(), timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA busy_timeout = 15000')
    conn.execute('PRAGMA journal_mode = WAL')
    return conn
