"""Tests del sistema de codificación estilo Polaris (RUBRO+SUBRUBRO+número)."""


def _crear_estructura(admin_client, nombre_cat, prefijo_cat, nombre_sub, prefijo_sub):
    cat = admin_client.post('/api/articulos/categorias',
                            json={'nombre': nombre_cat, 'prefijo': prefijo_cat}).get_json()
    sub = admin_client.post('/api/articulos/subcategorias',
                            json={'categoria_id': cat['id'], 'nombre': nombre_sub,
                                  'prefijo': prefijo_sub}).get_json()
    return cat['id'], sub['id']


def test_codigo_generado_automaticamente(admin_client):
    cat_id, sub_id = _crear_estructura(admin_client, 'FIAMBRES', 'FIA', 'Fiambres crudos', 'FFF')

    # Vista previa del próximo código
    resp = admin_client.get(f'/api/articulos/proximo-codigo?categoria_id={cat_id}&subcategoria_id={sub_id}')
    assert resp.status_code == 200
    assert resp.get_json()['codigo'] == 'FIAFFF001'

    # Crear artículo sin código: se genera solo
    resp = admin_client.post('/api/articulos', json={
        'nombre': 'PANCETA SALADA - CALCHAQUI - X KG.',
        'categoria_id': cat_id,
        'subcategoria_id': sub_id,
        'unidad_medida': 'KG',
    })
    assert resp.status_code == 201
    assert resp.get_json()['codigo_interno'] == 'FIAFFF001'

    # El segundo artículo del mismo subrubro incrementa el número
    resp = admin_client.post('/api/articulos', json={
        'nombre': 'PANCETA AHUMADA - PIAMONTESA - X KG',
        'categoria_id': cat_id,
        'subcategoria_id': sub_id,
    })
    assert resp.get_json()['codigo_interno'] == 'FIAFFF002'


def test_prefijo_derivado_de_iniciales(admin_client):
    # Nombre de 3+ palabras: usa iniciales (FRUTAS Y VERDURAS -> FYV, como en Polaris)
    resp = admin_client.post('/api/articulos/categorias', json={'nombre': 'FRUTAS Y VERDURAS'})
    assert resp.status_code == 201
    assert resp.get_json()['prefijo'] == 'FYV'

    # Nombre de una palabra: primeras 3 letras
    resp = admin_client.post('/api/articulos/categorias', json={'nombre': 'GOLOSINAS'})
    assert resp.get_json()['prefijo'] == 'GOL'


def test_prefijo_invalido_rechazado(admin_client):
    resp = admin_client.post('/api/articulos/categorias',
                             json={'nombre': 'Lacteos', 'prefijo': 'LACTEOS'})
    assert resp.status_code == 400

    resp = admin_client.post('/api/articulos/categorias',
                             json={'nombre': 'Lacteos', 'prefijo': 'L4C'})
    assert resp.status_code == 400


def test_crear_sin_codigo_ni_categoria_falla(admin_client):
    resp = admin_client.post('/api/articulos', json={'nombre': 'Artículo suelto'})
    assert resp.status_code == 400


def test_codigo_manual_sigue_funcionando(admin_client):
    resp = admin_client.post('/api/articulos', json={
        'codigo_interno': 'MANUAL001',
        'nombre': 'Artículo con código manual',
    })
    assert resp.status_code == 201
    assert resp.get_json()['codigo_interno'] == 'MANUAL001'

    # Código duplicado rechazado
    resp = admin_client.post('/api/articulos', json={
        'codigo_interno': 'MANUAL001',
        'nombre': 'Otro artículo',
    })
    assert resp.status_code == 400


def test_subcategorias_filtradas_por_categoria(admin_client):
    cat_id, sub_id = _crear_estructura(admin_client, 'GOLOSINAS DULCES', 'GOD', 'Alfajores', 'ALF')

    resp = admin_client.get(f'/api/articulos/subcategorias?categoria_id={cat_id}')
    assert resp.status_code == 200
    subs = resp.get_json()
    assert any(s['id'] == sub_id and s['prefijo'] == 'ALF' for s in subs)
