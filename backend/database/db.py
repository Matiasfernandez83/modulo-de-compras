import re
import sqlite3
from pathlib import Path

from database.connection import get_db, get_db_path, IS_POSTGRES


def _sqlite_schema_to_pg(sql):
    """Traduce el DDL/DML de SQLite a PostgreSQL (tipos, autoincrement, INSERT OR IGNORE)."""
    sql = re.sub(r'INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bAUTOINCREMENT\b', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bDATETIME\b', 'TIMESTAMP', sql, flags=re.IGNORECASE)
    # SQLite usa BOOLEAN con 0/1; en PG lo dejamos como SMALLINT para no romper comparaciones = 1/0
    sql = re.sub(r'\bBOOLEAN\b', 'SMALLINT', sql, flags=re.IGNORECASE)
    # INSERT OR IGNORE ... ; → INSERT ... ON CONFLICT DO NOTHING ;
    sql = re.sub(
        r'INSERT\s+OR\s+IGNORE\b(.*?);',
        lambda m: 'INSERT' + m.group(1) + ' ON CONFLICT DO NOTHING;',
        sql, flags=re.IGNORECASE | re.DOTALL)
    return sql


def _column_exists(cursor, tabla, columna):
    if IS_POSTGRES:
        cursor.execute("""
            SELECT 1 FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        """, (tabla, columna))
        return cursor.fetchone() is not None
    columnas = [fila[1] for fila in cursor.execute(f"PRAGMA table_info({tabla})").fetchall()]
    return columna in columnas


def _ensure_column(cursor, tabla, columna, definicion):
    """Agregar una columna si no existe (migración liviana para bases ya creadas)."""
    if not _column_exists(cursor, tabla, columna):
        definicion_pg = _sqlite_schema_to_pg(definicion) if IS_POSTGRES else definicion
        cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion_pg}")


def _run_schema(cursor, sql):
    """Ejecutar un archivo de esquema completo en la base configurada."""
    if IS_POSTGRES:
        cursor.execute(_sqlite_schema_to_pg(sql))
    else:
        cursor.executescript(sql)


def init_database():
    """Inicializa la base de datos (PostgreSQL o SQLite) con todos los esquemas."""
    db_dir = Path(__file__).parent

    conn = get_db()
    cursor = conn.cursor()

    schemas = ['schema.sql', 'permissions_schema.sql', 'audit_schema.sql', 'notifications_schema.sql']
    for schema_name in schemas:
        schema_path = db_dir / schema_name
        if schema_path.exists():
            print(f"Aplicando esquema: {schema_name}...")
            _run_schema(cursor, schema_path.read_text(encoding='utf-8'))
        else:
            print(f"Advertencia: No se encontró el esquema {schema_name}")

    # Migraciones livianas sobre bases existentes (CREATE TABLE IF NOT EXISTS no altera tablas)
    _ensure_column(cursor, 'categorias', 'prefijo', 'TEXT')
    _ensure_column(cursor, 'articulos', 'subcategoria_id', 'INTEGER REFERENCES subcategorias(id)')
    _ensure_column(cursor, 'articulos', 'codigo_softland', 'TEXT')
    _ensure_column(cursor, 'planificaciones', 'producto_id', 'INTEGER REFERENCES productos(id)')
    _ensure_column(cursor, 'planificaciones', 'cantidad_unidades', 'REAL DEFAULT 1')
    conn.commit()

    # Cargar catálogo inicial (migrado desde Softland) si la base está vacía
    from database.seed_catalogo import seed_catalogo
    sembrados = seed_catalogo(conn)
    if sembrados:
        print(f"   Catálogo inicial cargado: {sembrados} artículos")

    # Cargar estructuras de producto (BOM de la batea) si no hay productos
    from database.seed_bom import seed_bom
    bom = seed_bom(conn)
    if bom:
        print(f"   Estructuras de producto cargadas: {bom} renglones de materiales")

    # Crear usuario admin por defecto
    from werkzeug.security import generate_password_hash
    admin_password = generate_password_hash('admin123')
    cursor.execute("""
        INSERT OR IGNORE INTO usuarios (username, email, password_hash, nombre_completo, rol)
        VALUES (?, ?, ?, ?, ?)
    """, ('admin', 'admin@gestion-compras.com', admin_password, 'Administrador', 'admin'))

    conn.commit()
    conn.close()

    motor = 'PostgreSQL' if IS_POSTGRES else f'SQLite ({get_db_path()})'
    print(f"✅ Base de datos totalmente inicializada en: {motor}")
    print("   Usuario admin creado: admin / admin123")
    return motor


if __name__ == '__main__':
    init_database()
