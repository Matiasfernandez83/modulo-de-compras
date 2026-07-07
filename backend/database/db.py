import sqlite3
import os
from pathlib import Path

from database.connection import get_db_path


def _ensure_column(cursor, tabla, columna, definicion):
    """Agregar una columna si no existe (migración liviana para bases ya creadas)."""
    columnas = [fila[1] for fila in cursor.execute(f"PRAGMA table_info({tabla})").fetchall()]
    if columna not in columnas:
        cursor.execute(f"ALTER TABLE {tabla} ADD COLUMN {columna} {definicion}")


def init_database():
    """Inicializa la base de datos SQLite con todos los schemas"""
    db_dir = Path(__file__).parent
    db_path = Path(get_db_path())
    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Conectar a la base de datos (la crea si no existe)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Lista de archivos de esquema a ejecutar secuencialmente
    schemas = [
        'schema.sql',
        'permissions_schema.sql',
        'audit_schema.sql',
        'notifications_schema.sql'
    ]
    
    for schema_name in schemas:
        schema_path = db_dir / schema_name
        if schema_path.exists():
            print(f"Aplicando esquema: {schema_name}...")
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema_sql = f.read()
            cursor.executescript(schema_sql)
        else:
            print(f"Advertencia: No se encontró el esquema {schema_name}")
    
    # Migraciones livianas sobre bases existentes (CREATE TABLE IF NOT EXISTS no altera tablas)
    _ensure_column(cursor, 'categorias', 'prefijo', 'TEXT')
    _ensure_column(cursor, 'articulos', 'subcategoria_id', 'INTEGER REFERENCES subcategorias(id)')
    _ensure_column(cursor, 'articulos', 'codigo_softland', 'TEXT')
    _ensure_column(cursor, 'planificaciones', 'producto_id', 'INTEGER REFERENCES productos(id)')
    _ensure_column(cursor, 'planificaciones', 'cantidad_unidades', 'REAL DEFAULT 1')

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
    
    print(f"✅ Base de datos totalmente inicializada en: {db_path}")
    print("   Usuario admin creado: admin / admin123")
    
    return str(db_path)

if __name__ == '__main__':
    init_database()

