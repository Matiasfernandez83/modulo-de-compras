import urllib.request
import json
import urllib.error

def test_login():
    url = 'http://localhost:3000/api/auth/login'
    data = json.dumps({
        'username': 'admin',
        'password': 'admin123'
    }).encode('utf-8')
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    req = urllib.request.Request(url, data=data, headers=headers)
    
    print(f"Intento de login a: {url}")
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"\nStatus Code: {response.getcode()}")
            print(f"Respuesta: {result}")
            print("\n✅ LOGIN EXITOSO desde script (Backend funciona)")
            
    except urllib.error.HTTPError as e:
        print(f"\n❌ LOGIN FALLIDO: Status {e.code}")
        print(f"Error: {e.read().decode('utf-8')}")
    except urllib.error.URLError as e:
        print(f"\n❌ ERROR DE CONEXIÓN: {e.reason}")
        print("Asegúrate de que el backend esté corriendo en el puerto 3000")
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {e}")

if __name__ == '__main__':
    test_login()
