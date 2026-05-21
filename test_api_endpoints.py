import requests
import json

# URL base
BASE_URL = 'http://localhost:3000/api'

# 1. Login
print("1. Intentando login...")
login_response = requests.post(
    f'{BASE_URL}/auth/login',
    json={'username': 'admin', 'password': 'admin123'}
)

print(f"Status Code: {login_response.status_code}")
print(f"Response: {login_response.text}")

if login_response.status_code == 200:
    data = login_response.json()
    access_token = data.get('access_token')
    print(f"\n✅ Login exitoso!")
    print(f"Token: {access_token[:50]}...")
    
    # 2. Probar endpoint de artículos
    print("\n2. Intentando obtener artículos...")
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    articulos_response = requests.get(
        f'{BASE_URL}/articulos',
        headers=headers
    )
    
    print(f"Status Code: {articulos_response.status_code}")
    print(f"Response: {articulos_response.text[:500]}")
    
    if articulos_response.status_code == 200:
        print("\n✅ Artículos obtenidos exitosamente!")
    else:
        print(f"\n❌ Error al obtener artículos: {articulos_response.status_code}")
else:
    print(f"\n❌ Error en login: {login_response.status_code}")
