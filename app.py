"""
Punto de entrada raíz de la aplicación para despliegues simplificados.
Permite que el servidor (por ejemplo, Gunicorn en Render.com) inicie la aplicación
directamente desde la raíz del repositorio sin necesidad de configurar carpetas adicionales.
"""
import sys
import os

# Agregar la carpeta 'backend' al path de Python para que las importaciones relativas
# y los blueprints internos funcionen como si estuviéramos dentro de 'backend/'
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Importar la instancia de Flask creada por create_app() en backend/app.py
from backend.app import app

if __name__ == '__main__':
    # Ejecución local si se llama directamente
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 3000)), debug=True)
