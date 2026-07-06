"""Fixtures compartidas: app Flask con base de datos temporal."""

import os
import sys
import tempfile

import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# La base temporal tiene que estar definida ANTES de importar la app,
# porque app.py inicializa la base al importarse.
_db_fd, _db_path = tempfile.mkstemp(prefix='test_gestion_compras_', suffix='.db')
os.environ['DATABASE_PATH'] = _db_path


@pytest.fixture(scope='session')
def app():
    from app import app as flask_app
    flask_app.config['TESTING'] = True
    yield flask_app
    os.close(_db_fd)
    for ext in ('', '-wal', '-shm'):
        try:
            os.unlink(_db_path + ext)
        except FileNotFoundError:
            pass


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def admin_client(app):
    """Cliente con sesión de admin iniciada (admin/admin123 creado por init_database)."""
    client = app.test_client()
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert resp.status_code == 200, resp.get_json()
    return client
