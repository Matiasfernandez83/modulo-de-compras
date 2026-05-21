from fuzzywuzzy import fuzz
from fuzzywuzzy import process
import sqlite3
import os

def get_db():
    """Obtener conexión a la base de datos"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def match_codigo_to_articulo(codigo_proveedor, codigo_interno=None, nombre_articulo=None, threshold=80):
    """
    Intenta hacer match de un código de proveedor con un artículo en la base de datos.
    
    Args:
        codigo_proveedor: Código del proveedor
        codigo_interno: Código interno opcional
        nombre_articulo: Nombre del artículo opcional
        threshold: Umbral de similitud (0-100)
    
    Returns:
        dict: {
            'articulo_id': int o None,
            'confidence': float (0-100),
            'matched_by': str ('codigo_interno', 'codigo_proveedor', 'nombre', 'no_match')
        }
    """
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Buscar por código interno exacto
    if codigo_interno:
        cursor.execute("SELECT id, codigo_interno, nombre FROM articulos WHERE codigo_interno = ?", (codigo_interno,))
        result = cursor.fetchone()
        if result:
            conn.close()
            return {
                'articulo_id': result['id'],
                'confidence': 100,
                'matched_by': 'codigo_interno',
                'articulo_nombre': result['nombre']
            }
    
    # 2. Buscar por código de proveedor en listas anteriores
    if codigo_proveedor:
        cursor.execute("""
            SELECT DISTINCT a.id, a.codigo_interno, a.nombre
            FROM articulos a
            JOIN lista_precios_items lpi ON a.id = lpi.articulo_id
            WHERE lpi.codigo_proveedor = ?
            LIMIT 1
        """, (codigo_proveedor,))
        result = cursor.fetchone()
        if result:
            conn.close()
            return {
                'articulo_id': result['id'],
                'confidence': 95,
                'matched_by': 'codigo_proveedor',
                'articulo_nombre': result['nombre']
            }
    
    # 3. Fuzzy matching por nombre
    if nombre_articulo:
        cursor.execute("SELECT id, codigo_interno, nombre FROM articulos")
        articulos = cursor.fetchall()
        
        if articulos:
            # Crear lista de nombres para comparar
            nombres = [(art['nombre'], art['id'], art['codigo_interno']) for art in articulos]
            
            # Buscar mejor match
            best_match = process.extractOne(
                nombre_articulo,
                [n[0] for n in nombres],
                scorer=fuzz.token_sort_ratio
            )
            
            if best_match and best_match[1] >= threshold:
                # Encontrar el artículo correspondiente
                matched_nombre = best_match[0]
                for nombre, art_id, codigo in nombres:
                    if nombre == matched_nombre:
                        conn.close()
                        return {
                            'articulo_id': art_id,
                            'confidence': best_match[1],
                            'matched_by': 'nombre',
                            'articulo_nombre': nombre
                        }
    
    conn.close()
    
    # No se encontró match
    return {
        'articulo_id': None,
        'confidence': 0,
        'matched_by': 'no_match',
        'articulo_nombre': None
    }

def batch_match_items(items, threshold=80):
    """
    Hace match de múltiples items a la vez.
    
    Args:
        items: Lista de dicts con codigo_proveedor, codigo_interno, ingrediente
        threshold: Umbral de similitud
    
    Returns:
        list: Items con campo 'match_result' agregado
    """
    results = []
    
    for item in items:
        match_result = match_codigo_to_articulo(
            codigo_proveedor=item.get('codigo_proveedor'),
            codigo_interno=item.get('codigo_interno'),
            nombre_articulo=item.get('ingrediente'),
            threshold=threshold
        )
        
        item['match_result'] = match_result
        results.append(item)
    
    return results

def suggest_new_articulos(items):
    """
    Sugiere artículos nuevos que no tienen match.
    
    Returns:
        list: Items sin match que podrían ser artículos nuevos
    """
    unmatched = []
    
    for item in items:
        if 'match_result' in item and item['match_result']['articulo_id'] is None:
            unmatched.append({
                'codigo_proveedor': item.get('codigo_proveedor'),
                'nombre_sugerido': item.get('ingrediente'),
                'precio': item.get('precio_bruto')
            })
    
    return unmatched
