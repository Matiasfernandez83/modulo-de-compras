import urllib.request
import urllib.error
import json

print("=== DIAGNÓSTICO DEL SISTEMA ===\n")

# 1. Verificar si el backend está corriendo
print("1. Verificando si el backend está corriendo...")
try:
    response = urllib.request.urlopen('http://localhost:3000/api/health', timeout=2)
    print("   ✅ Backend está corriendo")
except urllib.error.URLError as e:
    print(f"   ❌ Backend NO está corriendo: {e.reason}")
    print("\n   SOLUCIÓN: Ejecuta 'start_app.bat' para iniciar el servidor")
    exit(1)

# 2. Verificar base de datos
print("\n2. Verificando base de datos...")
import sqlite3
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(base_dir, 'backend', 'database', 'gestion_compras.db')

if not os.path.exists(db_path):
    print(f"   ❌ Base de datos NO existe en: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Verificar si existe la tabla usuarios
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
if not cursor.fetchone():
    print("   ❌ Tabla 'usuarios' no existe")
    exit(1)

# Verificar si existe el usuario admin
cursor.execute("SELECT username, password_hash FROM usuarios WHERE username='admin'")
user = cursor.fetchone()

if not user:
    print("   ❌ Usuario 'admin' NO existe en la base de datos")
    print("\n   SOLUCIÓN: Ejecuta 'python reset_admin.py' para crear el usuario")
    exit(1)

print(f"   ✅ Usuario 'admin' existe")
print(f"   Password hash: {user[1][:50]}...")

# 3. Probar login
print("\n3. Probando login con admin/admin123...")
url = 'http://localhost:3000/api/auth/login'
data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode('utf-8')
headers = {'Content-Type': 'application/json'}
req = urllib.request.Request(url, data=data, headers=headers)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print("   ✅ LOGIN EXITOSO!")
        print(f"   Usuario: {result['user']['username']}")
        print(f"   Rol: {result['user']['rol']}")
        print("\n=== EL BACKEND FUNCIONA CORRECTAMENTE ===")
        print("\nSi el login no funciona en el navegador, el problema está en el FRONTEND.")
        print("Abre la consola del navegador (F12) y busca errores de JavaScript.")
        
except urllib.error.HTTPError as e:
    error_msg = e.read().decode('utf-8')
    print(f"   ❌ LOGIN FALLIDO: {e.code}")
    print(f"   Error: {error_msg}")
    
    if "Credenciales inválidas" in error_msg:
        print("\n   PROBLEMA: La contraseña no coincide")
        print("   SOLUCIÓN: El hash de la contraseña está mal. Ejecuta:")
        print("   python reset_admin.py")
    
except Exception as e:
    print(f"   ❌ ERROR: {e}")

conn.close()
