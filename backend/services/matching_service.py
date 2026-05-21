"""
Servicio simple de matching de artículos entre proveedores.
Solo matching exacto por código - sin fuzzy para mantener simplicidad.
"""

import sqlite3
import os


def get_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, 'database', 'gestion_compras.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def find_matches_by_code(codigo_interno):
    """
    Encuentra matches exactos por código interno.
    Retorna lista de proveedores que tienen ese código.
    """
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT p.id, p.nombre, lpi.codigo_proveedor, lpi.precio_neto
        FROM lista_precios_items lpi
        JOIN listas_precios lp ON lpi.lista_precio_id = lp.id
        JOIN proveedores p ON lp.proveedor_id = p.id
        JOIN articulos a ON lpi.articulo_id = a.id
        WHERE a.codigo_interno = ? AND lp.activo = 1
        ORDER BY lpi.precio_neto ASC
    """, (codigo_interno,))
    
    matches = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return matches


def get_articulos_sin_match():
    """Retorna artículos que no tienen códigos de proveedor asignados."""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT a.id, a.codigo_interno, a.nombre
        FROM articulos a
        WHERE a.activo = 1
        AND NOT EXISTS (
            SELECT 1 FROM lista_precios_items lpi
            WHERE lpi.articulo_id = a.id
        )
        ORDER BY a.nombre
        LIMIT 50
    """)
    
    articulos = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return articulos
