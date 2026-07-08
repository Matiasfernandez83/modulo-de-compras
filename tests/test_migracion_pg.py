"""Tests de las funciones de traducción SQLite → PostgreSQL (corren sin Postgres)."""

from database.connection import _translate
from database.db import _sqlite_schema_to_pg


def test_translate_placeholders():
    sql, ret = _translate("SELECT * FROM t WHERE id = ? AND x = ?")
    assert sql == "SELECT * FROM t WHERE id = %s AND x = %s"
    assert ret is False


def test_translate_insert_agrega_returning():
    sql, ret = _translate("INSERT INTO t (a) VALUES (?)")
    assert sql.endswith("RETURNING id")
    assert ret is True


def test_translate_insert_or_ignore():
    sql, ret = _translate("INSERT OR IGNORE INTO t (a) VALUES (?)")
    assert "ON CONFLICT DO NOTHING" in sql
    assert sql.strip().endswith("RETURNING id")
    assert ret is True


def test_translate_no_duplica_returning():
    sql, ret = _translate("INSERT INTO t (a) VALUES (?) RETURNING id")
    assert sql.count("RETURNING") == 1


def test_schema_autoincrement_a_serial():
    pg = _sqlite_schema_to_pg("CREATE TABLE t (id INTEGER PRIMARY KEY AUTOINCREMENT, n TEXT);")
    assert "SERIAL PRIMARY KEY" in pg
    assert "AUTOINCREMENT" not in pg


def test_schema_tipos_traducidos():
    pg = _sqlite_schema_to_pg("CREATE TABLE t (activo BOOLEAN DEFAULT 1, f DATETIME);")
    assert "SMALLINT" in pg
    assert "TIMESTAMP" in pg
    assert "BOOLEAN" not in pg
    assert "DATETIME" not in pg


def test_schema_insert_or_ignore_multilinea():
    sql = "INSERT OR IGNORE INTO permisos (a, b) VALUES\n('x','y'),\n('z','w');"
    pg = _sqlite_schema_to_pg(sql)
    assert "ON CONFLICT DO NOTHING;" in pg
    assert "INSERT OR IGNORE" not in pg
