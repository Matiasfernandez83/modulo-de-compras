"""Carga inicial de estructuras de producto (BOM) desde bom_inicial.csv.

Crea los productos (ej: BATEA 305) y su lista de materiales, vinculando cada
insumo a un artículo del catálogo por código Softland (validando que la
descripción coincida, porque Softland repite códigos). Los insumos sin código
o sin match se dan de alta como artículos nuevos en su categoría, con código
generado automáticamente (TAL + prefijo + número).

Solo corre si la tabla de productos está vacía.
"""

import csv
import sqlite3
from pathlib import Path

try:
    from fuzzywuzzy import fuzz
    FUZZY = True
except ImportError:
    FUZZY = False


def _descripciones_similares(a, b):
    if FUZZY:
        return fuzz.token_set_ratio(a.upper(), b.upper()) >= 55
    return a.upper()[:20] == b.upper()[:20]


def seed_bom(conn):
    """Sembrar productos y sus listas de materiales. Devuelve cantidad de renglones."""
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    if cursor.execute("SELECT COUNT(*) FROM productos").fetchone()[0] > 0:
        return 0
    csv_path = Path(__file__).parent / 'bom_inicial.csv'
    if not csv_path.exists():
        return 0

    # Artículos existentes indexados por código Softland
    por_softland = {}
    for fila in cursor.execute("SELECT id, codigo_softland, nombre FROM articulos WHERE codigo_softland IS NOT NULL"):
        por_softland.setdefault(fila['codigo_softland'], []).append((fila['id'], fila['nombre']))

    # Subcategorías por nombre para crear artículos nuevos, y contador de códigos por prefijo
    subcats = {}
    for fila in cursor.execute("""
            SELECT s.id, s.nombre, c.prefijo || s.prefijo AS prefijo_completo, s.categoria_id
            FROM subcategorias s JOIN categorias c ON s.categoria_id = c.id"""):
        subcats[fila['nombre']] = (fila['id'], fila['prefijo_completo'], fila['categoria_id'])

    def proximo_codigo(prefijo):
        maximo = 0
        for fila in cursor.execute("SELECT codigo_interno FROM articulos WHERE codigo_interno LIKE ?", (prefijo + '%',)):
            sufijo = fila['codigo_interno'][len(prefijo):]
            if sufijo.isdigit():
                maximo = max(maximo, int(sufijo))
        return f"{prefijo}{maximo + 1:03d}"

    def resolver_articulo(codigo_softland, descripcion, um, categoria):
        # 1) match por código Softland con descripción parecida
        for art_id, nombre in por_softland.get(codigo_softland, []) if codigo_softland else []:
            if _descripciones_similares(nombre, descripcion):
                return art_id
        # 2) crear artículo nuevo en su categoría
        sub = subcats.get(categoria) or subcats.get('FERRETERIA')
        codigo = proximo_codigo(sub[1])
        cursor.execute("""
            INSERT INTO articulos (codigo_interno, nombre, categoria_id, subcategoria_id,
                                   unidad_medida, codigo_softland)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (codigo, descripcion, sub[2], sub[0], um, codigo_softland or None))
        art_id = cursor.lastrowid
        cursor.execute("INSERT INTO stock (articulo_id, cantidad) VALUES (?, 0)", (art_id,))
        if codigo_softland:
            por_softland.setdefault(codigo_softland, []).append((art_id, descripcion))
        return art_id

    productos = {}
    renglones = 0
    with open(csv_path, newline='', encoding='utf-8') as f:
        for fila in csv.DictReader(f):
            pcod = fila['producto_codigo']
            if pcod not in productos:
                cursor.execute("INSERT INTO productos (codigo, nombre) VALUES (?, ?)",
                               (pcod, fila['producto_nombre']))
                productos[pcod] = cursor.lastrowid
            articulo_id = resolver_articulo(fila['codigo_softland'], fila['descripcion'],
                                            fila['um'], fila['categoria'])
            cursor.execute("""
                INSERT OR IGNORE INTO producto_materiales
                    (producto_id, articulo_id, cantidad_por_unidad, seccion, observaciones, plano)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (productos[pcod], articulo_id, float(fila['cantidad']),
                  fila['seccion'] or None, fila['observaciones'] or None, fila['plano'] or None))
            renglones += 1

    conn.commit()
    return renglones
