"""Tests de la integración Planificación → Comparativa (competencia)."""


def _crear_plan_batea(admin_client, unidades=5):
    productos = admin_client.get('/api/productos').get_json()
    batea = next(p for p in productos if p['codigo'] == 'BATEA-305')
    r = admin_client.post('/api/planificacion', json={
        'nombre': f'Plan comparativa {unidades}',
        'producto_id': batea['id'],
        'cantidad_unidades': unidades,
    })
    return r.get_json()['id']


def test_categorias_de_planificacion(admin_client):
    plan_id = _crear_plan_batea(admin_client)
    cats = admin_client.get(f'/api/planificacion/{plan_id}/categorias').get_json()
    assert len(cats) > 0
    # Cada categoría informa cuántos artículos y proveedores tiene
    assert all('articulos' in c and 'proveedores' in c for c in cats)
    assert any(c['articulos'] > 0 for c in cats)


def test_generar_competencia_vincula_proveedores(app, admin_client):
    plan_id = _crear_plan_batea(admin_client)
    cats = admin_client.get(f'/api/planificacion/{plan_id}/categorias').get_json()
    cat = next(c for c in cats if c['subcategoria_id'] and c['articulos'] > 0)

    # Un artículo de esa categoría en la planificación
    from database.connection import get_db
    conn = get_db()
    art = conn.execute("""
        SELECT DISTINCT a.id FROM planificacion_items pi
        JOIN articulos a ON pi.articulo_id = a.id
        WHERE pi.planificacion_id = ? AND a.subcategoria_id = ? LIMIT 1
    """, (plan_id, cat['subcategoria_id'])).fetchone()['id']

    # Crear proveedor + lista de precios con ese artículo
    prov_id = conn.execute("INSERT INTO proveedores (nombre) VALUES ('Proveedor Test Comp')").lastrowid
    lista_id = conn.execute("""
        INSERT INTO listas_precios (nombre, proveedor_id, fecha_vigencia, activo)
        VALUES ('Lista test', ?, '2026-01-01', 1)
    """, (prov_id,)).lastrowid
    conn.execute("""
        INSERT INTO lista_precios_items (lista_precio_id, articulo_id, precio_neto)
        VALUES (?, ?, 1500.50)
    """, (lista_id, art))
    conn.commit()
    conn.close()

    # Ahora la categoría debe reportar al menos 1 proveedor
    cats = admin_client.get(f'/api/planificacion/{plan_id}/categorias').get_json()
    cat_act = next(c for c in cats if c['subcategoria_id'] == cat['subcategoria_id'])
    assert cat_act['proveedores'] >= 1

    # Generar la comparativa
    r = admin_client.post(f'/api/planificacion/{plan_id}/generar-competencia',
                          json={'subcategoria_ids': [cat['subcategoria_id']]})
    assert r.status_code == 201
    data = r.get_json()
    assert data['items'] > 0
    assert data['proveedores'] >= 1
    comp_id = data['competencia_id']

    # La matriz debe traer el precio cargado y marcar el mejor proveedor
    matriz = admin_client.get(f'/api/competencia/{comp_id}/matriz').get_json()
    assert len(matriz['proveedores']) >= 1
    fila = next((it for it in matriz['items'] if it['articulo_id'] == art), None)
    assert fila is not None
    assert fila['precios'][str(prov_id)] == 1500.50 or fila['precios'].get(prov_id) == 1500.50
    assert fila['mejor_proveedor_id'] == prov_id


def test_generar_competencia_sin_categorias_falla(admin_client):
    plan_id = _crear_plan_batea(admin_client)
    r = admin_client.post(f'/api/planificacion/{plan_id}/generar-competencia',
                          json={'subcategoria_ids': []})
    assert r.status_code == 400


def test_competencia_queda_vinculada_a_planificacion(admin_client):
    plan_id = _crear_plan_batea(admin_client)
    cats = admin_client.get(f'/api/planificacion/{plan_id}/categorias').get_json()
    cat = next(c for c in cats if c['subcategoria_id'] and c['articulos'] > 0)
    r = admin_client.post(f'/api/planificacion/{plan_id}/generar-competencia',
                          json={'subcategoria_ids': [cat['subcategoria_id']]})
    comp = admin_client.get(f"/api/competencia/{r.get_json()['competencia_id']}").get_json()
    assert comp['planificacion_id'] == plan_id
    assert comp['origen'] == 'planificacion'
