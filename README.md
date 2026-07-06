# Sistema de Gestión de Compras

Sistema completo de gestión de compras con autenticación, gestión de proveedores, artículos, listas de precios, competencias y órdenes de compra.

## 🚀 Características Principales

### Módulos Core

- ✅ **Autenticación** - Login/logout con sesiones de Flask (cookies HttpOnly) y rate limiting
- ✅ **Proveedores** - CRUD completo
- ✅ **Artículos** - Gestión de catálogo con categorías
- ✅ **Listas de Precios** - Gestión de precios por proveedor
- ✅ **Competencia** - Sistema de comparación de precios entre proveedores
- ✅ **Órdenes de Compra** - Trazabilidad completa (OC → Recepción → Factura → Pago)
- ✅ **Usuarios** - Gestión de usuarios y roles
- ✅ **Dashboard** - Estadísticas y KPIs en tiempo real

### Funcionalidades Avanzadas (Nuevas)

#### 1. Parser Excel/PDF

Carga masiva de listas de precios desde archivos Excel o PDF.

- Detección automática de tipo de archivo
- Detección automática de columnas
- Soporte: `.xlsx`, `.xls`, `.pdf`

**Endpoint**: `POST /api/upload/lista-precios/:id`

#### 2. Exportación a Excel

Exportar datos de cualquier módulo a Excel con formato profesional.

**Endpoints**:

- `GET /api/export/proveedores`
- `GET /api/export/articulos`
- `GET /api/export/usuarios`
- `GET /api/export/lista-precios/:id`
- `GET /api/export/competencia/:id`
- `GET /api/export/orden-compra/:id`

#### 3. Dashboard Mejorado

Análisis adicionales y KPIs.

**Endpoints nuevos**:

- `GET /api/dashboard/top-proveedores` - Top 5 proveedores
- `GET /api/dashboard/precio-promedio-categoria` - Análisis de precios

#### 4. Matching de Códigos

Matching simple por código exacto entre proveedores.

**Endpoints**:

- `GET /api/matching/by-code/:codigo` - Buscar matches
- `GET /api/matching/sin-match` - Artículos sin match

#### 5. Planificación

CRUD básico de planificaciones de compras.

**Endpoints**:

- `GET /api/planificacion` - Listar
- `POST /api/planificacion` - Crear
- `POST /api/planificacion/:id/items` - Agregar items

#### 6. Roles y Permisos

Sistema de permisos granulares por módulo y acción.

**Uso en código**:

```python
from middleware.session_auth import require_permission

@app.route('/api/proveedores', methods=['POST'])
@require_permission('proveedores', 'crear')
def create_proveedor():
    # ...
```

**Roles disponibles**: `admin`, `usuario`  
**Permisos**: 24 permisos pre-configurados (ver, crear, editar, eliminar por módulo)

#### 7. Notificaciones

Sistema de notificaciones para usuarios.

**Endpoints**:

- `GET /api/notifications` - Todas las notificaciones
- `GET /api/notifications/no-leidas` - Solo no leídas
- `PUT /api/notifications/:id/leer` - Marcar como leída

**Uso en código**:

```python
from services.notification_service import crear_notificacion

crear_notificacion(
    usuario_id=1,
    tipo='info',
    titulo='Nueva orden creada',
    mensaje='Se creó la orden #123'
)
```

#### 8. Auditoría

Registro completo de cambios en el sistema.

**Endpoint**:

- `GET /api/audit?tabla=X&usuario_id=Y&limit=100`

**Uso en código**:

```python
from routes.audit import registrar_auditoria

registrar_auditoria(
    usuario_id=1,
    tabla='proveedores',
    registro_id=5,
    accion='editar',
    datos_anteriores={'nombre': 'Proveedor A'},
    datos_nuevos={'nombre': 'Proveedor B'}
)
```

---

## 🛠️ Tecnologías

**Backend**:

- Python 3.11
- Flask (sesiones con cookies, sin JWT)
- Flask-CORS
- SQLite (conexión centralizada en `backend/database/connection.py`, con foreign keys y modo WAL activados)
- openpyxl (Excel)
- pdfplumber (PDF)
- pytest (tests)

**Frontend**:

- HTML5
- CSS3
- JavaScript (ES6+)
- Fetch API

---

## 📦 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd gestion-compras

# Instalar dependencias
pip install -r requirements.txt

# Inicializar base de datos
cd backend/database
python apply_schemas.py
cd ../..

# Iniciar backend
cd backend
python app.py

# Iniciar frontend (en otra terminal)
cd frontend
python -m http.server 5500
```

### Ejecutar los tests

```bash
pip install pytest
python -m pytest tests/ -v
```

---

## 💾 Persistencia de datos en producción (Render)

⚠️ El filesystem de Render es **efímero**: sin configuración extra, el archivo
SQLite se borra en cada deploy o reinicio y se pierden todos los datos.

Opciones (ver comentarios en `render.yaml`):

1. **Disco persistente de Render** (plan pago): montar un disco en `/var/data`
   y setear `DATABASE_PATH=/var/data/gestion_compras.db`. La app ya soporta
   la variable de entorno `DATABASE_PATH`.
2. **Migrar a PostgreSQL** (recomendado a largo plazo): Render Postgres,
   Supabase o Neon. Todo el acceso a datos pasa por
   `backend/database/connection.py`, lo que simplifica la migración.

---

## 🔐 Credenciales por Defecto

- **Usuario**: admin
- **Contraseña**: admin123

---

## 📊 Estructura del Proyecto

```
gestion-compras/
├── backend/
│   ├── database/
│   │   ├── gestion_compras.db
│   │   ├── schema.sql
│   │   ├── permissions_schema.sql
│   │   ├── audit_schema.sql
│   │   ├── notifications_schema.sql
│   │   └── apply_schemas.py
│   ├── middleware/
│   │   └── permissions.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── usuarios.py
│   │   ├── proveedores.py
│   │   ├── articulos.py
│   │   ├── listas_precios.py
│   │   ├── competencia.py
│   │   ├── ordenes_compra.py
│   │   ├── upload.py
│   │   ├── dashboard.py
│   │   ├── export.py
│   │   ├── matching.py
│   │   ├── planificacion.py
│   │   ├── notifications.py
│   │   └── audit.py
│   ├── services/
│   │   ├── excel_parser.py
│   │   ├── pdf_parser.py
│   │   ├── excel_exporter.py
│   │   ├── matching_service.py
│   │   └── notification_service.py
│   ├── app.py
│   └── config.py
├── frontend/
│   ├── css/
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── modules/
│   │       ├── dashboard.js
│   │       ├── proveedores.js
│   │       ├── articulos.js
│   │       ├── listas_precios.js
│   │       ├── competencia.js
│   │       ├── ordenes_compra.js
│   │       └── usuarios.js
│   └── index.html
└── requirements.txt
```

---

## 📝 API Endpoints

### Autenticación

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Usuario actual

### Proveedores

- `GET /api/proveedores` - Listar
- `GET /api/proveedores/:id` - Obtener
- `POST /api/proveedores` - Crear
- `PUT /api/proveedores/:id` - Actualizar
- `DELETE /api/proveedores/:id` - Eliminar

### Artículos

- `GET /api/articulos` - Listar
- `GET /api/articulos/:id` - Obtener
- `POST /api/articulos` - Crear
- `PUT /api/articulos/:id` - Actualizar
- `DELETE /api/articulos/:id` - Eliminar

### Listas de Precios

- `GET /api/listas-precios` - Listar
- `GET /api/listas-precios/:id` - Obtener
- `POST /api/listas-precios` - Crear
- `PUT /api/listas-precios/:id` - Actualizar
- `DELETE /api/listas-precios/:id` - Eliminar
- `GET /api/listas-precios/:id/items` - Items de lista

### Competencias

- `GET /api/competencia` - Listar
- `GET /api/competencia/:id` - Obtener
- `POST /api/competencia` - Crear
- `PUT /api/competencia/:id` - Actualizar
- `DELETE /api/competencia/:id` - Eliminar
- `GET /api/competencia/:id/resultados` - Resultados

### Órdenes de Compra

- `GET /api/ordenes-compra` - Listar
- `GET /api/ordenes-compra/:id` - Obtener
- `POST /api/ordenes-compra` - Crear
- `PUT /api/ordenes-compra/:id` - Actualizar
- `DELETE /api/ordenes-compra/:id` - Eliminar

### Dashboard

- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/recent-activity` - Actividad reciente
- `GET /api/dashboard/charts/monthly-orders` - Órdenes por mes
- `GET /api/dashboard/charts/supplier-distribution` - Distribución proveedores
- `GET /api/dashboard/charts/category-distribution` - Distribución categorías
- `GET /api/dashboard/top-proveedores` - Top 5 proveedores ⭐ NUEVO
- `GET /api/dashboard/precio-promedio-categoria` - Precio promedio ⭐ NUEVO

### Upload

- `POST /api/upload/articulos` - Subir Excel de artículos
- `POST /api/upload/proveedores` - Subir Excel de proveedores
- `POST /api/upload/lista-precios/:id` - Subir Excel/PDF de lista ⭐ NUEVO

### Export

- `GET /api/export/proveedores` - Exportar proveedores ⭐ NUEVO
- `GET /api/export/articulos` - Exportar artículos ⭐ NUEVO
- `GET /api/export/usuarios` - Exportar usuarios ⭐ NUEVO
- `GET /api/export/lista-precios/:id` - Exportar lista
- `GET /api/export/competencia/:id` - Exportar competencia
- `GET /api/export/orden-compra/:id` - Exportar orden

### Matching ⭐ NUEVO

- `GET /api/matching/by-code/:codigo` - Buscar matches
- `GET /api/matching/sin-match` - Artículos sin match

### Planificación ⭐ NUEVO

- `GET /api/planificacion` - Listar planificaciones
- `POST /api/planificacion` - Crear planificación
- `POST /api/planificacion/:id/items` - Agregar items

### Notificaciones ⭐ NUEVO

- `GET /api/notifications` - Todas las notificaciones
- `GET /api/notifications/no-leidas` - Solo no leídas
- `PUT /api/notifications/:id/leer` - Marcar como leída

### Auditoría ⭐ NUEVO

- `GET /api/audit` - Historial de cambios

### Usuarios

- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Obtener
- `POST /api/usuarios` - Crear
- `PUT /api/usuarios/:id` - Actualizar
- `DELETE /api/usuarios/:id` - Eliminar

---

## 🎯 Próximos Pasos

1. Integrar frontend para las nuevas funcionalidades
2. Agregar llamadas a `registrar_auditoria()` en endpoints existentes
3. Crear notificaciones automáticas en eventos importantes
4. Aplicar middleware `@require_permission()` en endpoints sensibles

---

## 📄 Licencia

MIT

---

## 👥 Autor

Desarrollado para gestión de compras empresarial.
