-- Schema de Base de Datos para Sistema de Gestión de Compras

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT,
    rol TEXT DEFAULT 'comprador' CHECK(rol IN ('admin', 'comprador', 'visualizador')),
    activo BOOLEAN DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME
);

-- Tabla de Sesiones de Usuario
CREATE TABLE IF NOT EXISTS sesiones_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME,
    duracion_minutos INTEGER,
    ip_address TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de Memoria de Usuario
CREATE TABLE IF NOT EXISTS memoria_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('favorito', 'acceso_rapido', 'nota')),
    referencia TEXT,
    descripcion TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    telefono TEXT,
    direccion TEXT,
    email TEXT,
    forma_pago TEXT,
    plazo_pago INTEGER,
    tiempo_entrega INTEGER,
    activo BOOLEAN DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT 1
);

-- Tabla de Artículos
CREATE TABLE IF NOT EXISTS articulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_interno TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER,
    unidad_medida TEXT,
    activo BOOLEAN DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabla de Mapeo de Códigos de Proveedor
CREATE TABLE IF NOT EXISTS mapeo_codigos_proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER NOT NULL,
    articulo_id INTEGER NOT NULL,
    codigo_proveedor TEXT NOT NULL,
    descripcion_proveedor TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (articulo_id) REFERENCES articulos(id),
    UNIQUE(proveedor_id, codigo_proveedor)
);

-- Tabla de Stock
CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articulo_id INTEGER NOT NULL,
    cantidad REAL DEFAULT 0,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (articulo_id) REFERENCES articulos(id),
    UNIQUE(articulo_id)
);

-- Tabla de Depósitos
CREATE TABLE IF NOT EXISTS depositos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    direccion TEXT,
    activo BOOLEAN DEFAULT 1
);

-- Tabla de Stock por Depósito
CREATE TABLE IF NOT EXISTS stock_por_deposito (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articulo_id INTEGER NOT NULL,
    deposito_id INTEGER NOT NULL,
    cantidad REAL DEFAULT 0,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (articulo_id) REFERENCES articulos(id),
    FOREIGN KEY (deposito_id) REFERENCES depositos(id),
    UNIQUE(articulo_id, deposito_id)
);

-- Tabla de Unidades de Negocio
CREATE TABLE IF NOT EXISTS unidades_negocio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT 1
);

-- Tabla de Listas de Precios
CREATE TABLE IF NOT EXISTS listas_precios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    proveedor_id INTEGER NOT NULL,
    tipo TEXT DEFAULT 'generales',
    lista_base_id INTEGER,
    moneda TEXT DEFAULT 'PESOS',
    fecha_vigencia DATE NOT NULL,
    fecha_vencimiento DATE,
    fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT 1,
    usuario_creacion_id INTEGER,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (lista_base_id) REFERENCES listas_precios(id),
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id)
);

-- Tabla de Items de Lista de Precios
CREATE TABLE IF NOT EXISTS lista_precios_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lista_precio_id INTEGER NOT NULL,
    articulo_id INTEGER NOT NULL,
    codigo_proveedor TEXT,
    codigo_externo TEXT,
    ingrediente TEXT,
    iva_porcentaje REAL DEFAULT 21.0,
    precio_bruto REAL,
    descuento_porcentaje REAL DEFAULT 0,
    impuesto_adicional BOOLEAN DEFAULT 0,
    precio_neto REAL,
    ultima_carga_precio REAL,
    indice_precio REAL DEFAULT 1.0,
    presentacion TEXT,
    FOREIGN KEY (lista_precio_id) REFERENCES listas_precios(id),
    FOREIGN KEY (articulo_id) REFERENCES articulos(id)
);

-- Tabla de Planificaciones
CREATE TABLE IF NOT EXISTS planificaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT 1,
    archivo_origen TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion_id INTEGER,
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id)
);

-- Tabla de Items de Planificación
CREATE TABLE IF NOT EXISTS planificacion_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planificacion_id INTEGER NOT NULL,
    articulo_id INTEGER NOT NULL,
    cantidad_requerida REAL NOT NULL,
    fecha_necesidad DATE,
    FOREIGN KEY (planificacion_id) REFERENCES planificaciones(id),
    FOREIGN KEY (articulo_id) REFERENCES articulos(id)
);

-- Tabla de Competencias
CREATE TABLE IF NOT EXISTS competencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    planificacion_id INTEGER,
    origen TEXT CHECK(origen IN ('planificacion', 'requisicion_mp', 'reposicion')),
    fecha_inicio_periodo DATE,
    fecha_fin_periodo DATE,
    fecha_precios_desde DATE,
    unidades_negocio TEXT,
    categorias_ingredientes TEXT,
    deposito_entrega_id INTEGER,
    tipo_entrega TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador', 'en_proceso', 'confirmada', 'cerrada')),
    usuario_creacion_id INTEGER,
    FOREIGN KEY (planificacion_id) REFERENCES planificaciones(id),
    FOREIGN KEY (deposito_entrega_id) REFERENCES depositos(id),
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id)
);

-- Tabla de Proveedores en Competencia
CREATE TABLE IF NOT EXISTS competencia_proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competencia_id INTEGER NOT NULL,
    proveedor_id INTEGER NOT NULL,
    seleccionado BOOLEAN DEFAULT 1,
    FOREIGN KEY (competencia_id) REFERENCES competencias(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- Tabla de Items de Competencia
CREATE TABLE IF NOT EXISTS competencia_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competencia_id INTEGER NOT NULL,
    articulo_id INTEGER NOT NULL,
    cantidad_necesaria REAL NOT NULL,
    necesidad REAL,
    stock_disponible REAL DEFAULT 0,
    comprado REAL DEFAULT 0,
    compra_sugerida REAL,
    ppm REAL,
    coeficiente_conversion REAL DEFAULT 1.0,
    estado_semaforo TEXT CHECK(estado_semaforo IN ('rojo', 'amarillo', 'verde')),
    proveedor_seleccionado_id INTEGER,
    precio_seleccionado REAL,
    FOREIGN KEY (competencia_id) REFERENCES competencias(id),
    FOREIGN KEY (articulo_id) REFERENCES articulos(id),
    FOREIGN KEY (proveedor_seleccionado_id) REFERENCES proveedores(id)
);

-- Tabla de Comprobantes (OC, Facturas, Recepciones, etc)
CREATE TABLE IF NOT EXISTS comprobantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT CHECK(tipo IN ('orden_compra', 'parte_recepcion', 'factura', 'nota_credito', 'pago')),
    numero TEXT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_recepcion_documento DATE,
    proveedor_id INTEGER,
    deposito_id INTEGER,
    competencia_id INTEGER,
    estado TEXT DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada', 'cancelada')),
    subtotal REAL,
    iva REAL,
    total REAL,
    observaciones TEXT,
    codigo_interno TEXT,
    codigo_barra TEXT,
    forma_pago TEXT,
    primer_vencimiento DATE,
    segundo_vencimiento DATE,
    remito_proveedor TEXT,
    fecha_entrega_estimada DATE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_creacion_id INTEGER,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (deposito_id) REFERENCES depositos(id),
    FOREIGN KEY (competencia_id) REFERENCES competencias(id),
    FOREIGN KEY (usuario_creacion_id) REFERENCES usuarios(id)
);

-- Tabla de Relaciones entre Comprobantes
CREATE TABLE IF NOT EXISTS comprobantes_relaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comprobante_origen_id INTEGER NOT NULL,
    comprobante_destino_id INTEGER NOT NULL,
    tipo_relacion TEXT CHECK(tipo_relacion IN ('genera', 'se_origina_de', 'corrige', 'paga')),
    FOREIGN KEY (comprobante_origen_id) REFERENCES comprobantes(id),
    FOREIGN KEY (comprobante_destino_id) REFERENCES comprobantes(id)
);

-- Tabla de Items de Comprobantes
CREATE TABLE IF NOT EXISTS comprobante_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comprobante_id INTEGER NOT NULL,
    articulo_id INTEGER NOT NULL,
    cantidad REAL NOT NULL,
    presentacion TEXT,
    precio_unitario REAL,
    impuesto_porcentaje REAL DEFAULT 0,
    descuento_porcentaje REAL DEFAULT 0,
    subtotal REAL,
    codigo_estado TEXT,
    FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id),
    FOREIGN KEY (articulo_id) REFERENCES articulos(id)
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comprobante_id INTEGER NOT NULL,
    fecha_pago DATE NOT NULL,
    monto REAL NOT NULL,
    metodo_pago TEXT,
    referencia TEXT,
    observaciones TEXT,
    FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id)
);

-- Tabla de Controles
CREATE TABLE IF NOT EXISTS controles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comprobante_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_control DATETIME DEFAULT CURRENT_TIMESTAMP,
    tipo_control TEXT,
    resultado TEXT CHECK(resultado IN ('aprobado', 'rechazado', 'observado')),
    observaciones TEXT,
    FOREIGN KEY (comprobante_id) REFERENCES comprobantes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_articulos_codigo ON articulos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_mapeo_proveedor ON mapeo_codigos_proveedor(proveedor_id, codigo_proveedor);
CREATE INDEX IF NOT EXISTS idx_lista_precios_vigencia ON listas_precios(fecha_vigencia, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_comprobantes_tipo ON comprobantes(tipo);
CREATE INDEX IF NOT EXISTS idx_comprobantes_proveedor ON comprobantes(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_competencias_estado ON competencias(estado);
