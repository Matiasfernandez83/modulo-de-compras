import sqlite3
import os
from pathlib import Path

def init_database():
    """Inicializa la base de datos SQLite con el schema"""
    # Crear directorio si no existe
    db_dir = Path(__file__).parent
    db_path = db_dir / 'gestion_compras.db'
    
    # Conectar a la base de datos (la crea si no existe)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Leer y ejecutar el schema
    schema_path = db_dir / 'schema.sql'
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    cursor.executescript(schema_sql)
    
    # Crear usuario admin por defecto
    from werkzeug.security import generate_password_hash
    admin_password = generate_password_hash('admin123')
    
    cursor.execute("""
        INSERT OR IGNORE INTO usuarios (username, email, password_hash, nombre_completo, rol)
        VALUES (?, ?, ?, ?, ?)
    """, ('admin', 'admin@gestion-compras.com', admin_password, 'Administrador', 'admin'))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Base de datos inicializada en: {db_path}")
    print("   Usuario admin creado: admin / admin123")
    
    return str(db_path)

if __name__ == '__main__':
    init_database()
