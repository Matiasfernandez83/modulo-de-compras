import pdfplumber
import re
from pathlib import Path

def parse_pdf_lista_precios(file_path):
    """
    Parsea un archivo PDF con lista de precios.
    Intenta extraer tablas y datos estructurados.
    
    Returns:
        dict: Diccionario con success, items/error, y total
    """
    try:
        if not Path(file_path).exists():
            return {
                'success': False,
                'error': 'El archivo no existe'
            }
        
        items = []
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Intentar extraer tablas
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        # Procesar cada fila de la tabla
                        for i, row in enumerate(table):
                            # Saltar encabezados (primera fila)
                            if i == 0:
                                continue
                            
                            if not row or len(row) < 2:
                                continue
                            
                            try:
                                # Intentar identificar columnas
                                # Formato común: Código | Artículo | Precio | IVA | Descuento
                                item = {
                                    'codigo_proveedor': str(row[0] or '').strip(),
                                    'ingrediente': str(row[1] or '').strip(),
                                    'precio_bruto': 0,
                                    'iva_porcentaje': 21,
                                    'descuento_porcentaje': 0
                                }
                                
                                # Intentar extraer precio
                                if len(row) > 2 and row[2]:
                                    precio_str = str(row[2]).replace('$', '').replace(',', '.').strip()
                                    try:
                                        item['precio_bruto'] = float(precio_str)
                                    except:
                                        pass
                                
                                # Intentar extraer IVA
                                if len(row) > 3 and row[3]:
                                    iva_str = str(row[3]).replace('%', '').strip()
                                    try:
                                        item['iva_porcentaje'] = float(iva_str)
                                    except:
                                        pass
                                
                                # Intentar extraer descuento
                                if len(row) > 4 and row[4]:
                                    desc_str = str(row[4]).replace('%', '').strip()
                                    try:
                                        item['descuento_porcentaje'] = float(desc_str)
                                    except:
                                        pass
                                
                                # Solo agregar si tiene código o nombre
                                if item['codigo_proveedor'] or item['ingrediente']:
                                    items.append(item)
                            
                            except Exception as e:
                                continue
                
                else:
                    # Si no hay tablas, intentar extraer texto
                    text = page.extract_text()
                    if text:
                        # Buscar patrones de precios
                        # Ejemplo: "CODIGO123 Producto XYZ $1500"
                        lines = text.split('\n')
                        for line in lines:
                            # Patrón simple: buscar líneas con código y precio
                            match = re.search(r'(\w+)\s+(.+?)\s+\$?\s*(\d+[\.,]?\d*)', line)
                            if match:
                                try:
                                    item = {
                                        'codigo_proveedor': match.group(1).strip(),
                                        'ingrediente': match.group(2).strip(),
                                        'precio_bruto': float(match.group(3).replace(',', '.')),
                                        'iva_porcentaje': 21,
                                        'descuento_porcentaje': 0
                                    }
                                    items.append(item)
                                except:
                                    continue
        
        if len(items) == 0:
            return {
                'success': False,
                'error': 'No se pudieron extraer items del PDF. Verifica que el PDF contenga tablas o datos estructurados.'
            }
        
        return {
            'success': True,
            'items': items,
            'total': len(items)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Error al procesar el PDF: {str(e)}'
        }
