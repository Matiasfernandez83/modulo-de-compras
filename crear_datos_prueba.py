"""
Script para crear datos de prueba en el sistema de gestión de compras.
Crea datos de ejemplo para todos los módulos.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuración
BASE_URL = "http://localhost:3000/api"
USERNAME = "admin"
PASSWORD = "admin123"

# Variables globales
token = None
proveedores_ids = []
articulos_ids = []
categorias_ids = []
listas_ids = []
planificacion_ids = []

def login():
    """Autenticar y obtener token"""
    global token
    print("[*] Iniciando sesion...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "username": USERNAME,
        "password": PASSWORD
    })
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print("[OK] Login exitoso! Token obtenido.")
        return True
    else:
        print(f"[ERROR] Error en login: {response.status_code}")
        print(response.text)
        return False

def get_headers():
    """Obtener headers con token"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def crear_categorias():
    """Crear categorías de artículos"""
    global categorias_ids
    print("\n[CAT] Creando categorías...")
    
    categorias = [
        {"nombre": "SECOS", "descripcion": "Productos secos"},
        {"nombre": "LACTEOS", "descripcion": "Productos lácteos"},
        {"nombre": "CARNES", "descripcion": "Carnes y embutidos"},
        {"nombre": "VERDURAS", "descripcion": "Verduras y hortalizas"},
        {"nombre": "LIMPIEZA", "descripcion": "Productos de limpieza"}
    ]
    
    for cat in categorias:
        response = requests.post(
            f"{BASE_URL}/articulos/categorias",
            headers=get_headers(),
            json=cat
        )
        if response.status_code == 201:
            cat_id = response.json().get('id')
            categorias_ids.append(cat_id)
            print(f"  [OK] Categoría '{cat['nombre']}' creada (ID: {cat_id})")
        else:
            print(f"  [WARN]  Error creando categoría '{cat['nombre']}': {response.status_code}")

def crear_proveedores():
    """Crear proveedores de prueba"""
    global proveedores_ids
    print("\n[PROV] Creando proveedores...")
    
    proveedores = [
        {
            "nombre": "Distribuidora Central S.A.",
            "telefono": "011-4567-8901",
            "email": "ventas@distribuidoracentral.com",
            "direccion": "Av. Corrientes 1234, CABA",
            "forma_pago": "Cuenta Corriente",
            "plazo_pago": 30,
            "tiempo_entrega": 3
        },
        {
            "nombre": "Mayorista del Sur",
            "telefono": "011-4567-8902",
            "email": "pedidos@mayoristadelsur.com",
            "direccion": "Av. Rivadavia 5678, CABA",
            "forma_pago": "30 días",
            "plazo_pago": 30,
            "tiempo_entrega": 5
        },
        {
            "nombre": "Alimentos Frescos S.R.L.",
            "telefono": "011-4567-8903",
            "email": "contacto@alimentosfrescos.com",
            "direccion": "Av. San Juan 9012, CABA",
            "forma_pago": "Contado",
            "plazo_pago": 0,
            "tiempo_entrega": 1
        },
        {
            "nombre": "Limpieza Total",
            "telefono": "011-4567-8904",
            "email": "ventas@limpiezatotal.com",
            "direccion": "Av. Belgrano 3456, CABA",
            "forma_pago": "60 días",
            "plazo_pago": 60,
            "tiempo_entrega": 7
        }
    ]
    
    for prov in proveedores:
        response = requests.post(
            f"{BASE_URL}/proveedores",
            headers=get_headers(),
            json=prov
        )
        if response.status_code == 201:
            prov_id = response.json().get('id')
            proveedores_ids.append(prov_id)
            print(f"  [OK] Proveedor '{prov['nombre']}' creado (ID: {prov_id})")
        else:
            print(f"  [WARN]  Error creando proveedor '{prov['nombre']}': {response.status_code}")

def crear_articulos():
    """Crear artículos de prueba"""
    global articulos_ids
    print("\n[ART] Creando artículos...")
    
    if not categorias_ids:
        print("  [WARN]  No hay categorías creadas")
        return
    
    articulos = [
        # SECOS
        {"codigo_interno": "ART001", "nombre": "Harina 000", "descripcion": "Harina de trigo 000", "categoria_id": categorias_ids[0], "unidad_medida": "KG"},
        {"codigo_interno": "ART002", "nombre": "Azúcar", "descripcion": "Azúcar blanca refinada", "categoria_id": categorias_ids[0], "unidad_medida": "KG"},
        {"codigo_interno": "ART003", "nombre": "Arroz", "descripcion": "Arroz largo fino", "categoria_id": categorias_ids[0], "unidad_medida": "KG"},
        {"codigo_interno": "ART004", "nombre": "Fideos", "descripcion": "Fideos secos", "categoria_id": categorias_ids[0], "unidad_medida": "KG"},
        
        # LACTEOS
        {"codigo_interno": "ART005", "nombre": "Leche Entera", "descripcion": "Leche entera larga vida", "categoria_id": categorias_ids[1], "unidad_medida": "LT"},
        {"codigo_interno": "ART006", "nombre": "Queso Cremoso", "descripcion": "Queso cremoso", "categoria_id": categorias_ids[1], "unidad_medida": "KG"},
        {"codigo_interno": "ART007", "nombre": "Yogur", "descripcion": "Yogur natural", "categoria_id": categorias_ids[1], "unidad_medida": "LT"},
        
        # CARNES
        {"codigo_interno": "ART008", "nombre": "Carne Molida", "descripcion": "Carne molida común", "categoria_id": categorias_ids[2], "unidad_medida": "KG"},
        {"codigo_interno": "ART009", "nombre": "Pollo", "descripcion": "Pollo entero", "categoria_id": categorias_ids[2], "unidad_medida": "KG"},
        
        # VERDURAS
        {"codigo_interno": "ART010", "nombre": "Tomate", "descripcion": "Tomate perita", "categoria_id": categorias_ids[3], "unidad_medida": "KG"},
        {"codigo_interno": "ART011", "nombre": "Lechuga", "descripcion": "Lechuga mantecosa", "categoria_id": categorias_ids[3], "unidad_medida": "UN"},
        
        # LIMPIEZA
        {"codigo_interno": "ART012", "nombre": "Detergente", "descripcion": "Detergente líquido", "categoria_id": categorias_ids[4], "unidad_medida": "LT"},
        {"codigo_interno": "ART013", "nombre": "Lavandina", "descripcion": "Lavandina concentrada", "categoria_id": categorias_ids[4], "unidad_medida": "LT"},
    ]
    
    for art in articulos:
        response = requests.post(
            f"{BASE_URL}/articulos",
            headers=get_headers(),
            json=art
        )
        if response.status_code == 201:
            art_id = response.json().get('id')
            articulos_ids.append(art_id)
            print(f"  [OK] Artículo '{art['nombre']}' creado (ID: {art_id})")
        else:
            print(f"  [WARN]  Error creando artículo '{art['nombre']}': {response.status_code}")

def crear_listas_precios():
    """Crear listas de precios"""
    global listas_ids
    print("\n[PRICE] Creando listas de precios...")
    
    if not proveedores_ids or not articulos_ids:
        print("  [WARN]  Faltan proveedores o artículos")
        return
    
    hoy = datetime.now().strftime("%Y-%m-%d")
    fin_mes = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Crear lista para cada proveedor
    for i, prov_id in enumerate(proveedores_ids[:2]):  # Solo primeros 2 proveedores
        lista_data = {
            "nombre": f"Lista Enero 2026 - Proveedor {i+1}",
            "proveedor_id": prov_id,
            "moneda": "PESOS",
            "fecha_vigencia": hoy,
            "fecha_vencimiento": fin_mes
        }
        
        response = requests.post(
            f"{BASE_URL}/listas-precios",
            headers=get_headers(),
            json=lista_data
        )
        
        if response.status_code == 201:
            lista_id = response.json().get('id')
            listas_ids.append(lista_id)
            print(f"  [OK] Lista de precios creada (ID: {lista_id})")
            
            # Agregar items a la lista
            items = []
            for j, art_id in enumerate(articulos_ids[:8]):  # Primeros 8 artículos
                items.append({
                    "articulo_id": art_id,
                    "codigo_proveedor": f"PROV{i+1}-{j+1:03d}",
                    "precio_bruto": 100 + (j * 50) + (i * 20),
                    "iva_porcentaje": 21,
                    "descuento_porcentaje": 5 if j % 2 == 0 else 0,
                    "presentacion": "Unidad"
                })
            
            response_items = requests.post(
                f"{BASE_URL}/listas-precios/{lista_id}/items",
                headers=get_headers(),
                json={"items": items}
            )
            
            if response_items.status_code == 201:
                print(f"    [OK] {len(items)} items agregados a la lista")
            else:
                print(f"    [WARN]  Error agregando items: {response_items.status_code}")
        else:
            print(f"  [WARN]  Error creando lista: {response.status_code}")

def crear_planificaciones():
    """Crear planificaciones de compra"""
    global planificacion_ids
    print("\n[PLAN] Creando planificaciones...")
    
    if not articulos_ids:
        print("  [WARN]  Faltan artículos")
        return
    
    hoy = datetime.now()
    
    planificaciones = [
        {
            "nombre": "Planificación Enero 2026",
            "descripcion": "Compras mensuales de enero",
            "fecha_inicio": hoy.strftime("%Y-%m-%d"),
            "fecha_fin": (hoy + timedelta(days=30)).strftime("%Y-%m-%d")
        },
        {
            "nombre": "Planificación Febrero 2026",
            "descripcion": "Compras mensuales de febrero",
            "fecha_inicio": (hoy + timedelta(days=31)).strftime("%Y-%m-%d"),
            "fecha_fin": (hoy + timedelta(days=60)).strftime("%Y-%m-%d")
        }
    ]
    
    for plan in planificaciones:
        response = requests.post(
            f"{BASE_URL}/planificacion",
            headers=get_headers(),
            json=plan
        )
        
        if response.status_code == 201:
            plan_id = response.json().get('id')
            planificacion_ids.append(plan_id)
            print(f"  [OK] Planificación '{plan['nombre']}' creada (ID: {plan_id})")
            
            # Agregar items a la planificación
            for art_id in articulos_ids[:5]:  # Primeros 5 artículos
                item_data = {
                    "articulo_id": art_id,
                    "cantidad_estimada": 100
                }
                
                response_item = requests.post(
                    f"{BASE_URL}/planificacion/{plan_id}/items",
                    headers=get_headers(),
                    json=item_data
                )
                
                if response_item.status_code != 201:
                    print(f"    [WARN]  Error agregando item a planificación")
            
            print(f"    [OK] Items agregados a la planificación")
        else:
            print(f"  [WARN]  Error creando planificación: {response.status_code}")

def verificar_datos():
    """Verificar que los datos se crearon correctamente"""
    print("\n[CHECK] Verificando datos creados...")
    
    # Verificar proveedores
    response = requests.get(f"{BASE_URL}/proveedores", headers=get_headers())
    if response.status_code == 200:
        proveedores = response.json()
        print(f"  [OK] Proveedores: {len(proveedores)} encontrados")
    
    # Verificar artículos
    response = requests.get(f"{BASE_URL}/articulos", headers=get_headers())
    if response.status_code == 200:
        articulos = response.json()
        print(f"  [OK] Artículos: {len(articulos)} encontrados")
    
    # Verificar listas de precios
    response = requests.get(f"{BASE_URL}/listas-precios", headers=get_headers())
    if response.status_code == 200:
        listas = response.json()
        print(f"  [OK] Listas de precios: {len(listas)} encontradas")
    
    # Verificar planificaciones
    response = requests.get(f"{BASE_URL}/planificacion", headers=get_headers())
    if response.status_code == 200:
        planificaciones = response.json()
        print(f"  [OK] Planificaciones: {len(planificaciones)} encontradas")

def main():
    """Función principal"""
    print("=" * 60)
    print("  CREACIÓN DE DATOS DE PRUEBA")
    print("  Sistema de Gestión de Compras")
    print("=" * 60)
    
    if not login():
        print("\n[ERROR] No se pudo autenticar. Verifica que el backend esté corriendo.")
        return
    
    try:
        crear_categorias()
        crear_proveedores()
        crear_articulos()
        crear_listas_precios()
        crear_planificaciones()
        verificar_datos()
        
        print("\n" + "=" * 60)
        print("  [OK] DATOS DE PRUEBA CREADOS EXITOSAMENTE")
        print("=" * 60)
        print("\n[DATA] Resumen:")
        print(f"  • Categorías: {len(categorias_ids)}")
        print(f"  • Proveedores: {len(proveedores_ids)}")
        print(f"  • Artículos: {len(articulos_ids)}")
        print(f"  • Listas de precios: {len(listas_ids)}")
        print(f"  • Planificaciones: {len(planificacion_ids)}")
        print("\n[SUCCESS] Ahora puedes usar la aplicación con datos de ejemplo!")
        print("   Abre http://localhost:5500 y explora los módulos.\n")
        
    except Exception as e:
        print(f"\n[ERROR] Error durante la creación de datos: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
