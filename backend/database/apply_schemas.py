import sqlite3
import os

# Conectar a la base de datos
base_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(base_dir, 'gestion_compras.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Aplicando schemas...")

# Leer y ejecutar permissions_schema.sql
with open(os.path.join(base_dir, 'permissions_schema.sql'), 'r', encoding='utf-8') as f:
    cursor.executescript(f.read())
print("✓ Permissions schema aplicado")

# Leer y ejecutar audit_schema.sql
with open(os.path.join(base_dir, 'audit_schema.sql'), 'r', encoding='utf-8') as f:
    cursor.executescript(f.read())
print("✓ Audit schema aplicado")

# Leer y ejecutar notifications_schema.sql
with open(os.path.join(base_dir, 'notifications_schema.sql'), 'r', encoding='utf-8') as f:
    cursor.executescript(f.read())
print("✓ Notifications schema aplicado")

conn.commit()
conn.close()

print("\n✅ Todos los schemas aplicados exitosamente!")
