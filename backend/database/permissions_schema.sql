-- Schema para sistema de roles y permisos granulares

-- Tabla de permisos disponibles
CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo TEXT NOT NULL,
    accion TEXT NOT NULL,
    descripcion TEXT,
    UNIQUE(modulo, accion)
);

-- Relación roles-permisos
CREATE TABLE IF NOT EXISTS rol_permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rol TEXT NOT NULL,
    permiso_id INTEGER NOT NULL,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id)
);

-- Insertar permisos básicos
INSERT OR IGNORE INTO permisos (modulo, accion, descripcion) VALUES
('proveedores', 'crear', 'Crear proveedores'),
('proveedores', 'editar', 'Editar proveedores'),
('proveedores', 'eliminar', 'Eliminar proveedores'),
('proveedores', 'ver', 'Ver proveedores'),
('articulos', 'crear', 'Crear artículos'),
('articulos', 'editar', 'Editar artículos'),
('articulos', 'eliminar', 'Eliminar artículos'),
('articulos', 'ver', 'Ver artículos'),
('listas_precios', 'crear', 'Crear listas de precios'),
('listas_precios', 'editar', 'Editar listas de precios'),
('listas_precios', 'eliminar', 'Eliminar listas de precios'),
('listas_precios', 'ver', 'Ver listas de precios'),
('competencias', 'crear', 'Crear competencias'),
('competencias', 'editar', 'Editar competencias'),
('competencias', 'eliminar', 'Eliminar competencias'),
('competencias', 'ver', 'Ver competencias'),
('ordenes_compra', 'crear', 'Crear órdenes de compra'),
('ordenes_compra', 'editar', 'Editar órdenes de compra'),
('ordenes_compra', 'eliminar', 'Eliminar órdenes de compra'),
('ordenes_compra', 'ver', 'Ver órdenes de compra'),
('usuarios', 'crear', 'Crear usuarios'),
('usuarios', 'editar', 'Editar usuarios'),
('usuarios', 'eliminar', 'Eliminar usuarios'),
('usuarios', 'ver', 'Ver usuarios');

-- Asignar todos los permisos al rol admin
INSERT OR IGNORE INTO rol_permisos (rol, permiso_id)
SELECT 'admin', id FROM permisos;

-- Asignar permisos limitados al rol usuario
INSERT OR IGNORE INTO rol_permisos (rol, permiso_id)
SELECT 'usuario', id FROM permisos WHERE accion IN ('ver', 'crear', 'editar');
