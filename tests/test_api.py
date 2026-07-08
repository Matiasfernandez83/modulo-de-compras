"""Tests de la API: auth, CRUD, paginación, rate limiting y foreign keys."""

import sqlite3

import pytest


def test_health(client):
    resp = client.get('/api/health')
    assert resp.status_code == 200
    assert resp.get_json()['status'] == 'ok'


def test_login_credenciales_invalidas(client):
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'incorrecta'})
    assert resp.status_code == 401


def test_login_ok_y_me(client):
    resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    assert resp.status_code == 200
    assert resp.get_json()['user']['username'] == 'admin'

    me = client.get('/api/auth/me')
    assert me.status_code == 200
    assert me.get_json()['rol'] == 'admin'


def test_endpoint_protegido_sin_sesion(client):
    resp = client.get('/api/proveedores')
    assert resp.status_code == 401


def test_logout_no_permite_cerrar_sesion_ajena(app):
    """El logout solo debe cerrar registros de sesión del usuario logueado."""
    client = app.test_client()
    login = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123'})
    sesion_id = login.get_json()['sesion_id']

    # Sin sesión iniciada, mandar un sesion_id ajeno no debe marcarlo cerrado
    anon = app.test_client()
    resp = anon.post('/api/auth/logout', json={'sesion_id': sesion_id})
    assert resp.status_code == 200

    from database.connection import get_db
    conn = get_db()
    row = conn.execute('SELECT fecha_fin FROM sesiones_usuario WHERE id = ?', (sesion_id,)).fetchone()
    conn.close()
    assert row['fecha_fin'] is None


def test_rate_limit_login(client):
    from routes.auth import LOGIN_MAX_ATTEMPTS, _login_attempts
    _login_attempts.clear()
    ip = {'REMOTE_ADDR': '10.99.99.99'}
    for _ in range(LOGIN_MAX_ATTEMPTS):
        resp = client.post('/api/auth/login', environ_base=ip,
                           json={'username': 'admin', 'password': 'mala'})
        assert resp.status_code == 401
    resp = client.post('/api/auth/login', environ_base=ip,
                       json={'username': 'admin', 'password': 'mala'})
    assert resp.status_code == 429
    _login_attempts.clear()


def test_crud_proveedores_con_update_parcial(admin_client):
    # Crear
    resp = admin_client.post('/api/proveedores', json={
        'nombre': 'Proveedor Test',
        'telefono': '011-1234-5678',
        'email': 'test@proveedor.com',
        'plazo_pago': 30,
    })
    assert resp.status_code == 201
    pid = resp.get_json()['id']

    # Update parcial: solo el teléfono; el resto debe conservarse
    resp = admin_client.put(f'/api/proveedores/{pid}', json={'telefono': '011-9999-0000'})
    assert resp.status_code == 200

    resp = admin_client.get(f'/api/proveedores/{pid}')
    prov = resp.get_json()
    assert prov['telefono'] == '011-9999-0000'
    assert prov['nombre'] == 'Proveedor Test'
    assert prov['email'] == 'test@proveedor.com'
    assert prov['plazo_pago'] == 30

    # PUT de un id inexistente
    resp = admin_client.put('/api/proveedores/999999', json={'nombre': 'X'})
    assert resp.status_code == 404

    # Soft delete
    resp = admin_client.delete(f'/api/proveedores/{pid}')
    assert resp.status_code == 200
    resp = admin_client.get(f'/api/proveedores/{pid}')
    assert resp.get_json()['activo'] == 0


def test_articulos_paginacion(admin_client):
    for i in range(5):
        admin_client.post('/api/articulos', json={
            'codigo_interno': f'PAGTEST{i:03d}',
            'nombre': f'Artículo Paginado {i}',
        })

    # Sin ?page= responde lista completa (compatibilidad con frontend)
    resp = admin_client.get('/api/articulos')
    assert resp.status_code == 200
    assert isinstance(resp.get_json(), list)

    # Con ?page= responde estructura paginada
    resp = admin_client.get('/api/articulos?page=1&per_page=2')
    data = resp.get_json()
    assert resp.status_code == 200
    assert len(data['items']) == 2
    assert data['total'] >= 5
    assert data['page'] == 1

    # Update parcial de artículo conserva campos no enviados
    resp = admin_client.get('/api/articulos?page=1&per_page=1')
    art_id = resp.get_json()['items'][0]['id']
    resp = admin_client.put(f'/api/articulos/{art_id}', json={'descripcion': 'Nueva descripción'})
    assert resp.status_code == 200
    art = admin_client.get(f'/api/articulos/{art_id}').get_json()
    assert art['descripcion'] == 'Nueva descripción'
    assert art['nombre']  # el nombre no fue pisado con NULL


def test_foreign_keys_activas():
    """La conexión central debe rechazar inserts que violan claves foráneas."""
    from database.connection import get_db, IntegrityError
    conn = get_db()
    with pytest.raises(IntegrityError):
        conn.execute('INSERT INTO stock (articulo_id, cantidad) VALUES (999999, 1)')
    conn.rollback()
    conn.close()
