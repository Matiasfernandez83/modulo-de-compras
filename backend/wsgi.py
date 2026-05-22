"""
Punto de entrada WSGI para Render.com
Asegura que el directorio backend esté en sys.path para que
gunicorn pueda importar los módulos correctamente.
"""
import sys
import os

# Agregar el directorio backend al path de Python
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app

if __name__ == '__main__':
    app.run()
