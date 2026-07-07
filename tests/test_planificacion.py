"""Tests del módulo de planificación: BOM, explosión de materiales y necesidades."""


def test_producto_batea_cargado(admin_client):
    resp = admin_client.get('/api/productos')
    assert resp.status_code == 200
    productos = resp.get_json()
    batea = next((p for p in productos if p['codigo'] == 'BATEA-305'), None)
    assert batea is not None, 'La batea debe estar sembrada'
    assert batea['total_materiales'] > 400

    detalle = admin_client.get(f"/api/productos/{batea['id']}").get_json()
    assert detalle['total_materiales'] == batea['total_materiales']
    assert all(m['cantidad_por_unidad'] > 0 for m in detalle['materiales'])


def test_explosion_de_materiales(admin_client):
    productos = admin_client.get('/api/productos').get_json()
    batea = next(p for p in productos if p['codigo'] == 'BATEA-305')

    resp = admin_client.post('/api/planificacion', json={
        'nombre': 'Test 20 bateas',
        'producto_id': batea['id'],
        'cantidad_unidades': 20,
    })
    assert resp.status_code == 201
    creado = resp.get_json()
    assert creado['items_generados'] == batea['total_materiales']
    plan_id = creado['id']

    # Necesidades: cantidad requerida = receta × 20; sin stock, todo en rojo
    data = admin_client.get(f'/api/planificacion/{plan_id}/necesidades').get_json()
    assert data['resumen']['total_articulos'] == batea['total_materiales']

    detalle_prod = admin_client.get(f"/api/productos/{batea['id']}").get_json()
    por_articulo = {m['articulo_id']: m['cantidad_por_unidad'] for m in detalle_prod['materiales']}
    for n in data['necesidades'][:20]:
        esperado = round(por_articulo[n['articulo_id']] * 20, 2)
        assert round(n['cantidad_requerida'], 2) == esperado


def test_necesidades_descuentan_stock(app, admin_client):
    productos = admin_client.get('/api/productos').get_json()
    kit = next(p for p in productos if p['codigo'] == 'KIT-FRENO-SABS')

    resp = admin_client.post('/api/planificacion', json={
        'nombre': 'Test kit frenos',
        'producto_id': kit['id'],
        'cantidad_unidades': 2,
    })
    plan_id = resp.get_json()['id']

    data = admin_client.get(f'/api/planificacion/{plan_id}/necesidades').get_json()
    primera = data['necesidades'][0]
    assert primera['semaforo'] == 'rojo'  # sin stock

    # Cargar stock que cubre todo el requerido de ese artículo → verde
    from database.connection import get_db
    conn = get_db()
    conn.execute('UPDATE stock SET cantidad = ? WHERE articulo_id = ?',
                 (primera['cantidad_requerida'], primera['articulo_id']))
    conn.commit()
    conn.close()

    data = admin_client.get(f'/api/planificacion/{plan_id}/necesidades').get_json()
    actualizada = next(n for n in data['necesidades'] if n['articulo_id'] == primera['articulo_id'])
    assert actualizada['semaforo'] == 'verde'
    assert actualizada['necesidad_neta'] == 0


def test_export_necesidades_excel(admin_client):
    planes = admin_client.get('/api/planificacion').get_json()
    plan_id = planes[0]['id']
    resp = admin_client.get(f'/api/planificacion/{plan_id}/necesidades/export')
    assert resp.status_code == 200
    assert 'spreadsheet' in resp.content_type


def test_planificacion_manual_sin_producto(admin_client):
    resp = admin_client.post('/api/planificacion', json={'nombre': 'Plan manual'})
    assert resp.status_code == 201
    assert resp.get_json()['items_generados'] == 0
