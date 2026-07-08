"""Tests de productos y sus recetas (BOM): crear, agregar/quitar insumo, importar Excel."""
import io

import openpyxl


def test_crear_producto_y_agregar_insumo(admin_client):
    r = admin_client.post('/api/productos', json={'codigo': 'ACOPLADO-A1', 'nombre': 'Acoplado A1'})
    assert r.status_code == 201
    pid = r.get_json()['id']

    # Código duplicado rechazado
    assert admin_client.post('/api/productos', json={'codigo': 'ACOPLADO-A1', 'nombre': 'x'}).status_code == 400

    # Un artículo cualquiera del catálogo
    art = admin_client.get('/api/articulos?page=1&per_page=1').get_json()['items'][0]

    add = admin_client.post(f'/api/productos/{pid}/materiales', json={
        'articulo_id': art['id'], 'cantidad_por_unidad': 5, 'seccion': 'TEST'
    })
    assert add.status_code == 201

    det = admin_client.get(f'/api/productos/{pid}').get_json()
    assert det['total_materiales'] == 1
    mat_id = det['materiales'][0]['id']
    assert det['materiales'][0]['cantidad_por_unidad'] == 5

    # Quitar el insumo
    assert admin_client.delete(f'/api/productos/{pid}/materiales/{mat_id}').status_code == 200
    assert admin_client.get(f'/api/productos/{pid}').get_json()['total_materiales'] == 0


def test_importar_receta_excel(admin_client):
    r = admin_client.post('/api/productos', json={'codigo': 'BATEA-XL', 'nombre': 'Batea XL'})
    pid = r.get_json()['id']

    # Dos artículos reales: uno por código interno, otro por código Softland
    art = admin_client.get('/api/articulos?page=1&per_page=1').get_json()['items'][0]
    from database.connection import get_db
    conn = get_db()
    soft = conn.execute("SELECT codigo_interno, codigo_softland FROM articulos WHERE codigo_softland IS NOT NULL LIMIT 1").fetchone()
    conn.close()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(['Código', 'Cantidad', 'Sección', 'Observaciones'])
    ws.append([art['codigo_interno'], 12, 'ESTRUCTURA', 'por código interno'])
    ws.append([soft['codigo_softland'], 3, 'ESTRUCTURA', 'por código Softland'])
    ws.append(['NO-EXISTE-999', 5, '', ''])  # debe ir a errores
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    resp = admin_client.post(f'/api/productos/{pid}/materiales/bulk',
                             data={'file': (buf, 'receta.xlsx')},
                             content_type='multipart/form-data')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['insertados'] == 2
    assert data['total_errores'] == 1

    det = admin_client.get(f'/api/productos/{pid}').get_json()
    assert det['total_materiales'] == 2


def test_template_receta_descarga(admin_client):
    resp = admin_client.get('/api/productos/template')
    assert resp.status_code == 200
    assert 'spreadsheet' in resp.content_type
