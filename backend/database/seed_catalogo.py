"""Carga inicial del catálogo de artículos (migrado desde Softland).

Lee catalogo_inicial.csv y crea categorías (rubros), subcategorías (subrubros)
y artículos con código formato Polaris: PREFIJO_RUBRO + PREFIJO_SUBRUBRO + número
secuencial (ej: TALBUL001). El código original de Softland se guarda en
articulos.codigo_softland como referencia cruzada durante la transición.

Solo corre si la tabla de artículos está vacía, así no pisa datos cargados.
"""

import csv
from pathlib import Path


def seed_catalogo(conn):
    """Sembrar el catálogo inicial. Devuelve la cantidad de artículos creados."""
    cursor = conn.cursor()

    if cursor.execute("SELECT COUNT(*) FROM articulos").fetchone()[0] > 0:
        return 0

    csv_path = Path(__file__).parent / 'catalogo_inicial.csv'
    if not csv_path.exists():
        return 0

    categorias = {}      # nombre -> id
    subcategorias = {}   # (categoria_id, nombre) -> id
    contadores = {}      # prefijo completo -> último número usado
    creados = 0

    with open(csv_path, newline='', encoding='utf-8') as f:
        for fila in csv.DictReader(f):
            rubro = fila['rubro']
            if rubro not in categorias:
                cursor.execute(
                    "INSERT INTO categorias (nombre, prefijo) VALUES (?, ?)",
                    (rubro, fila['prefijo_rubro'])
                )
                categorias[rubro] = cursor.lastrowid
            categoria_id = categorias[rubro]

            clave_sub = (categoria_id, fila['subrubro'])
            if clave_sub not in subcategorias:
                cursor.execute(
                    "INSERT INTO subcategorias (categoria_id, nombre, prefijo) VALUES (?, ?, ?)",
                    (categoria_id, fila['subrubro'], fila['prefijo_subrubro'])
                )
                subcategorias[clave_sub] = cursor.lastrowid
            subcategoria_id = subcategorias[clave_sub]

            prefijo = fila['prefijo_rubro'] + fila['prefijo_subrubro']
            contadores[prefijo] = contadores.get(prefijo, 0) + 1
            codigo = f"{prefijo}{contadores[prefijo]:03d}"

            cursor.execute("""
                INSERT INTO articulos (codigo_interno, nombre, categoria_id, subcategoria_id,
                                       unidad_medida, codigo_softland)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (codigo, fila['descripcion'], categoria_id, subcategoria_id,
                  fila['unidad_medida'], fila['codigo_softland']))
            cursor.execute("INSERT INTO stock (articulo_id, cantidad) VALUES (?, 0)",
                           (cursor.lastrowid,))
            creados += 1

    conn.commit()
    return creados
