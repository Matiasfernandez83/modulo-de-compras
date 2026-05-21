import openpyxl
import pandas as pd
from pathlib import Path

def parse_articulos_excel(file_path):
    """
    Parsea un archivo Excel con artículos.
    
    Formato esperado:
    | Código | Nombre | Descripción | Categoría | Unidad Medida |
    
    Returns:
        dict: Diccionario con success, articulos/error, y total
    """
    try:
        # Verificar que el archivo existe
        if not Path(file_path).exists():
            return {
                'success': False,
                'error': 'El archivo no existe'
            }
        
        # Leer Excel
        try:
            df = pd.read_excel(file_path)
        except Exception as e:
            return {
                'success': False,
                'error': f'Error al leer el archivo Excel: {str(e)}. Verifica que sea un archivo Excel válido (.xlsx o .xls)'
            }
        
        # Verificar que no esté vacío
        if df.empty:
            return {
                'success': False,
                'error': 'El archivo Excel está vacío'
            }
        
        # Normalizar nombres de columnas
        df.columns = df.columns.str.strip().str.lower()
        
        # Mapeo de posibles nombres de columnas
        column_map = {
            'codigo': ['codigo', 'código', 'code', 'codigo_interno', 'codigo interno'],
            'nombre': ['nombre', 'name', 'articulo', 'artículo', 'producto'],
            'descripcion': ['descripcion', 'descripción', 'description', 'desc'],
            'categoria': ['categoria', 'categoría', 'category', 'rubro'],
            'unidad_medida': ['unidad_medida', 'unidad medida', 'unidad', 'um', 'unit']
        }
        
        # Encontrar columnas reales
        real_columns = {}
        for key, possible_names in column_map.items():
            for col in df.columns:
                if col in possible_names:
                    real_columns[key] = col
                    break
        
        # Validar columnas obligatorias
        if 'codigo' not in real_columns:
            return {
                'success': False,
                'error': 'No se encontró la columna "Código". Columnas disponibles: ' + ', '.join(df.columns)
            }
        
        if 'nombre' not in real_columns:
            return {
                'success': False,
                'error': 'No se encontró la columna "Nombre". Columnas disponibles: ' + ', '.join(df.columns)
            }
        
        articulos = []
        filas_con_error = 0
        
        for idx, row in df.iterrows():
            try:
                codigo = str(row.get(real_columns.get('codigo', ''), '')).strip()
                nombre = str(row.get(real_columns.get('nombre', ''), '')).strip()
                
                # Saltar filas vacías
                if not codigo or codigo == 'nan' or not nombre or nombre == 'nan':
                    filas_con_error += 1
                    continue
                
                articulo = {
                    'codigo_interno': codigo,
                    'nombre': nombre,
                    'descripcion': str(row.get(real_columns.get('descripcion', ''), '')).strip() if 'descripcion' in real_columns else '',
                    'categoria': str(row.get(real_columns.get('categoria', ''), '')).strip() if 'categoria' in real_columns else '',
                    'unidad_medida': str(row.get(real_columns.get('unidad_medida', ''), '')).strip() if 'unidad_medida' in real_columns else ''
                }
                
                # Limpiar valores 'nan'
                for key in articulo:
                    if articulo[key] == 'nan':
                        articulo[key] = ''
                
                articulos.append(articulo)
                
            except Exception as e:
                filas_con_error += 1
                continue
        
        if len(articulos) == 0:
            return {
                'success': False,
                'error': f'No se encontraron artículos válidos en el archivo. Filas con errores: {filas_con_error}'
            }
        
        return {
            'success': True,
            'articulos': articulos,
            'total': len(articulos)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Error inesperado al procesar el archivo: {str(e)}'
        }

def parse_proveedores_excel(file_path):
    """
    Parsea un archivo Excel con proveedores.
    
    Formato esperado:
    | Nombre | Teléfono | Dirección | Email | Forma Pago | Plazo Pago | Tiempo Entrega |
    """
    try:
        df = pd.read_excel(file_path)
        df.columns = df.columns.str.strip().str.lower()
        
        column_map = {
            'nombre': ['nombre', 'name', 'proveedor', 'razon_social'],
            'telefono': ['telefono', 'teléfono', 'phone', 'tel'],
            'direccion': ['direccion', 'dirección', 'address', 'domicilio'],
            'email': ['email', 'mail', 'correo'],
            'forma_pago': ['forma_pago', 'forma de pago', 'payment'],
            'plazo_pago': ['plazo_pago', 'plazo', 'dias_pago'],
            'tiempo_entrega': ['tiempo_entrega', 'entrega', 'delivery']
        }
        
        real_columns = {}
        for key, possible_names in column_map.items():
            for col in df.columns:
                if col in possible_names:
                    real_columns[key] = col
                    break
        
        proveedores = []
        for _, row in df.iterrows():
            proveedor = {
                'nombre': str(row.get(real_columns.get('nombre', ''), '')).strip(),
                'telefono': str(row.get(real_columns.get('telefono', ''), '')).strip(),
                'direccion': str(row.get(real_columns.get('direccion', ''), '')).strip(),
                'email': str(row.get(real_columns.get('email', ''), '')).strip(),
                'forma_pago': str(row.get(real_columns.get('forma_pago', ''), '')).strip(),
                'plazo_pago': row.get(real_columns.get('plazo_pago', ''), None),
                'tiempo_entrega': row.get(real_columns.get('tiempo_entrega', ''), None)
            }
            
            if proveedor['nombre']:
                proveedores.append(proveedor)
        
        return {
            'success': True,
            'proveedores': proveedores,
            'total': len(proveedores)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def parse_lista_precios_excel(file_path, proveedor_id):
    """
    Parsea un archivo Excel con lista de precios.
    
    Formato esperado:
    | Código Proveedor | Código Interno | Artículo | Precio | IVA | Descuento |
    """
    try:
        df = pd.read_excel(file_path)
        df.columns = df.columns.str.strip().str.lower()
        
        column_map = {
            'codigo_proveedor': ['codigo_proveedor', 'codigo proveedor', 'cod_prov'],
            'codigo_interno': ['codigo_interno', 'codigo interno', 'codigo', 'código'],
            'articulo': ['articulo', 'artículo', 'nombre', 'producto'],
            'precio': ['precio', 'price', 'precio_bruto', 'importe'],
            'iva': ['iva', 'impuesto', 'tax'],
            'descuento': ['descuento', 'desc', 'discount']
        }
        
        real_columns = {}
        for key, possible_names in column_map.items():
            for col in df.columns:
                if col in possible_names:
                    real_columns[key] = col
                    break
        
        items = []
        for _, row in df.iterrows():
            try:
                precio_bruto = float(row.get(real_columns.get('precio', ''), 0))
                iva = float(row.get(real_columns.get('iva', ''), 21))
                descuento = float(row.get(real_columns.get('descuento', ''), 0))
                
                item = {
                    'codigo_proveedor': str(row.get(real_columns.get('codigo_proveedor', ''), '')).strip(),
                    'codigo_interno': str(row.get(real_columns.get('codigo_interno', ''), '')).strip(),
                    'ingrediente': str(row.get(real_columns.get('articulo', ''), '')).strip(),
                    'precio_bruto': precio_bruto,
                    'iva_porcentaje': iva,
                    'descuento_porcentaje': descuento
                }
                
                if item['codigo_proveedor'] or item['codigo_interno']:
                    items.append(item)
            except:
                continue
        
        return {
            'success': True,
            'items': items,
            'total': len(items)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
