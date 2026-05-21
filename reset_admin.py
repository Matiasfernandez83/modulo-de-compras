import sqlite3
from werkzeug.security import generate_password_hash

def reset_admin():
    db_path = 'backend/database/gestion_compras.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Generar nuevo hash
    new_password = generate_password_hash('admin123')
    
    # Actualizar usuario admin
    cursor.execute("""
        UPDATE usuarios 
        SET password_hash = ? 
        WHERE username = 'admin'
    """, (new_password,))
    
    if cursor.rowcount == 0:
        print("⚠️ Usuario admin no encontrado. Creándolo...")
        cursor.execute("""
            INSERT INTO usuarios (username, email, password_hash, nombre_completo, rol)
            VALUES (?, ?, ?, ?, ?)
        """, ('admin', 'admin@gestion-compras.com', new_password, 'Administrador', 'admin'))
    
    conn.commit()
    conn.close()
    print("✅ Contraseña de admin reseteada a: admin123")

if __name__ == '__main__':
    reset_admin()
