// Módulo de planificación (MRP): lista + hoja de trabajo de necesidades a
// pantalla completa, explosión de materiales y generación de comparativa.
import { API, ArticulosAPI, ProductosAPI } from '../api.js';

let planificaciones = [];
let productos = [];
let articulos = [];
let currentPlanId = null;
let necesidadesActuales = [];

export async function initPlanificacion() {
    showListaView();
}

// ---------- Vista LISTA ----------
async function showListaView() {
    currentPlanId = null;
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Planificación de Compras (MRP)</h2>
                <button class="btn btn-primary" onclick="window.planificacionModule.showCreateModal()">
                    + Nueva Planificación
                </button>
            </div>
            <p style="padding:8px 16px; margin:0; color:#666; font-size:0.85rem">
                💡 Elegí un producto y cuántas unidades vas a fabricar: el sistema calcula solo
                todos los insumos necesarios y qué falta comprar según el stock.
            </p>
            <div class="card-body">
                <div id="planificaciones-table-container">
                    <div class="flex-center" style="padding: 40px;"><div class="spinner"></div></div>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:16px">
            <div class="card-header">
                <h2 class="card-title">Estructuras de Producto (recetas)</h2>
                <button class="btn btn-primary" onclick="window.planificacionModule.showProductoModal()">
                    + Nuevo Producto
                </button>
            </div>
            <p style="padding:8px 16px; margin:0; color:#666; font-size:0.85rem">
                Cada estructura define qué insumos y en qué cantidad lleva UNA unidad del producto.
                Podés cargar la receta de un producto nuevo (batea, acoplado, etc.) e importar sus insumos desde Excel.
            </p>
            <div class="card-body">
                <div id="productos-table-container">
                    <div class="flex-center" style="padding: 24px;"><div class="spinner"></div></div>
                </div>
            </div>
        </div>

        <!-- Modal crear producto -->
        <div id="producto-create-modal" class="modal-overlay" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nuevo Producto (receta)</h3>
                    <button class="modal-close" onclick="document.getElementById('producto-create-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="producto-create-form">
                        <div class="form-group">
                            <label for="prod-codigo">Código *</label>
                            <input type="text" id="prod-codigo" placeholder="Ej: BATEA-401, ACOPLADO-A1">
                        </div>
                        <div class="form-group">
                            <label for="prod-nombre">Nombre *</label>
                            <input type="text" id="prod-nombre" placeholder="Ej: BATEA 401 CAÑO REDONDO">
                        </div>
                        <div class="form-group">
                            <label for="prod-descripcion">Descripción</label>
                            <textarea id="prod-descripcion" rows="2"></textarea>
                        </div>
                    </form>
                    <p style="color:#666; font-size:0.85rem">Después de crearlo, tocá "Ver estructura" para cargar sus insumos (a mano o importando un Excel).</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('producto-create-modal').style.display='none'">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.saveProducto()">Crear Producto</button>
                </div>
            </div>
        </div>

        <!-- Modal estructura de producto -->
        <div id="producto-modal" class="modal-overlay" style="display:none">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="producto-modal-titulo">Estructura de Producto</h3>
                    <button class="modal-close" onclick="document.getElementById('producto-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="producto-modal-body"><div class="flex-center"><div class="spinner"></div></div></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('producto-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal crear planificación -->
        <div id="planificacion-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nueva Planificación</h3>
                    <button class="modal-close" onclick="window.planificacionModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="planificacion-form">
                        <div class="form-group">
                            <label for="plan-producto">Producto a fabricar</label>
                            <select id="plan-producto" name="producto_id">
                                <option value="">(Planificación manual, sin producto)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="plan-cantidad">Cantidad de unidades a fabricar</label>
                            <input type="number" id="plan-cantidad" value="1" min="1" step="1">
                            <small style="color:#666">Ej: 20 bateas → el sistema multiplica la receta × 20</small>
                        </div>
                        <div class="form-group">
                            <label for="plan-nombre">Nombre *</label>
                            <input type="text" id="plan-nombre" name="nombre" required placeholder="Ej: Pedido Diciembre - 20 bateas">
                        </div>
                        <div class="form-group">
                            <label for="plan-descripcion">Descripción</label>
                            <textarea id="plan-descripcion" name="descripcion" rows="2"></textarea>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                            <div class="form-group">
                                <label for="plan-fecha-inicio">Fecha Inicio</label>
                                <input type="date" id="plan-fecha-inicio" name="fecha_inicio">
                            </div>
                            <div class="form-group">
                                <label for="plan-fecha-fin">Fecha Fin</label>
                                <input type="date" id="plan-fecha-fin" name="fecha_fin">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.savePlanificacion()">Crear y Calcular</button>
                </div>
            </div>
        </div>
    `;
    await Promise.all([loadPlanificaciones(), loadProductos()]);
    loadArticulos();
}

async function loadPlanificaciones() {
    try {
        planificaciones = await API.get('/planificacion');
        renderPlanificacionesTable();
    } catch (error) {
        const c = document.getElementById('planificaciones-table-container');
        if (c) c.innerHTML = '<p class="error-message">Error al cargar planificaciones</p>';
    }
}

async function loadProductos() {
    try {
        productos = await ProductosAPI.getAll();
        renderProductosTable();
        poblarSelectProductos();
    } catch (e) {
        const c = document.getElementById('productos-table-container');
        if (c) c.innerHTML = '<p class="error-message">Error al cargar productos</p>';
    }
}

async function loadArticulos() {
    try { articulos = await ArticulosAPI.getAll(); } catch (e) { articulos = []; }
}

function poblarSelectProductos() {
    const sel = document.getElementById('plan-producto');
    if (!sel) return;
    sel.innerHTML = '<option value="">(Planificación manual, sin producto)</option>';
    productos.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.codigo} — ${p.nombre} (${p.total_materiales} insumos)`;
        sel.appendChild(opt);
    });
}

function renderProductosTable() {
    const container = document.getElementById('productos-table-container');
    if (!container) return;
    if (!productos.length) {
        container.innerHTML = '<p class="text-center">No hay productos con estructura cargada.</p>';
        return;
    }
    container.innerHTML = `
        <table class="table">
            <thead><tr><th>Código</th><th>Producto</th><th>Insumos en la receta</th><th>Acciones</th></tr></thead>
            <tbody>
                ${productos.map(p => `<tr>
                    <td><strong>${p.codigo}</strong></td>
                    <td>${p.nombre}</td>
                    <td>${p.total_materiales}</td>
                    <td><button class="btn btn-sm btn-secondary"
                                onclick="window.planificacionModule.verEstructura(${p.id})">📋 Ver estructura</button></td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

let currentProductoId = null;

async function verEstructura(productoId) {
    currentProductoId = productoId;
    document.getElementById('producto-modal-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    document.getElementById('producto-modal').style.display = 'flex';
    try {
        const p = await ProductosAPI.getById(productoId);
        document.getElementById('producto-modal-titulo').textContent = `${p.codigo} — ${p.nombre}`;

        // Barra de acciones: importar Excel + agregar insumo a mano
        let html = `
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #eee">
                <a href="${window.location.origin}/api/productos/template" download class="btn btn-secondary btn-sm">📥 Template receta</a>
                <label class="btn btn-secondary btn-sm" style="margin:0">
                    📤 Importar receta Excel
                    <input type="file" accept=".xlsx,.xls" style="display:none"
                           onchange="window.planificacionModule.importarReceta(event)">
                </label>
                <button class="btn btn-secondary btn-sm" onclick="window.planificacionModule.showAddMaterial()">+ Agregar insumo</button>
                <span style="flex:1"></span>
                <span style="color:#666; font-size:0.85rem">${p.total_materiales} insumos · cantidades por 1 unidad</span>
            </div>
            <div id="add-material-box" style="display:none; background:#f9f9f9; padding:10px; border-radius:6px; margin-bottom:12px">
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:end">
                    <div style="flex:2; min-width:220px">
                        <label style="font-size:0.8rem">Artículo</label>
                        <select id="add-mat-articulo" style="width:100%"></select>
                    </div>
                    <div style="width:110px">
                        <label style="font-size:0.8rem">Cantidad/unidad</label>
                        <input type="number" id="add-mat-cant" min="0.0001" step="0.0001" style="width:100%">
                    </div>
                    <div style="width:150px">
                        <label style="font-size:0.8rem">Sección</label>
                        <input type="text" id="add-mat-seccion" style="width:100%" placeholder="opcional">
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="window.planificacionModule.addMaterial()">Agregar</button>
                </div>
            </div>`;

        let seccionActual = null;
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Código</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th><th>Plano</th><th></th></tr></thead><tbody>';
        if (!p.materiales.length) {
            html += '<tr><td colspan="6" class="text-muted" style="text-align:center; padding:20px">Sin insumos. Importá un Excel o agregalos a mano.</td></tr>';
        }
        for (const m of p.materiales) {
            if (m.seccion && m.seccion !== seccionActual) {
                seccionActual = m.seccion;
                html += `<tr><td colspan="6" style="background:#f0f4f8; font-weight:bold">${seccionActual}</td></tr>`;
            }
            html += `<tr><td>${m.codigo_interno}</td><td title="${m.observaciones || ''}">${m.articulo_nombre}</td>
                <td><strong>${m.cantidad_por_unidad}</strong></td><td>${m.unidad_medida || '-'}</td>
                <td style="font-size:0.8rem; color:#666">${m.plano || '-'}</td>
                <td><button class="btn btn-sm btn-secondary" style="background:#c62828;color:#fff"
                            onclick="window.planificacionModule.quitarMaterial(${m.id})" title="Quitar">🗑</button></td></tr>`;
        }
        html += '</tbody></table></div>';
        document.getElementById('producto-modal-body').innerHTML = html;
    } catch (e) {
        document.getElementById('producto-modal-body').innerHTML = '<p class="error-message">Error al cargar la estructura</p>';
    }
}

function showProductoModal() {
    document.getElementById('producto-create-form').reset();
    document.getElementById('producto-create-modal').style.display = 'flex';
}

async function saveProducto() {
    const data = {
        codigo: document.getElementById('prod-codigo').value.trim(),
        nombre: document.getElementById('prod-nombre').value.trim(),
        descripcion: document.getElementById('prod-descripcion').value.trim(),
    };
    if (!data.codigo || !data.nombre) { alert('Código y nombre son obligatorios'); return; }
    try {
        const r = await ProductosAPI.create(data);
        document.getElementById('producto-create-modal').style.display = 'none';
        await loadProductos();
        verEstructura(r.id); // abrir la estructura recién creada para cargar insumos
    } catch (e) {
        alert('Error al crear el producto: ' + e.message);
    }
}

function showAddMaterial() {
    const box = document.getElementById('add-material-box');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    const sel = document.getElementById('add-mat-articulo');
    if (sel && !sel.options.length) {
        sel.innerHTML = '<option value="">Seleccione...</option>' +
            articulos.map(a => `<option value="${a.id}">${a.codigo_interno} — ${a.nombre || a.descripcion}</option>`).join('');
    }
}

async function addMaterial() {
    const articulo_id = document.getElementById('add-mat-articulo').value;
    const cantidad = document.getElementById('add-mat-cant').value;
    const seccion = document.getElementById('add-mat-seccion').value.trim();
    if (!articulo_id || !cantidad) { alert('Elegí un artículo y la cantidad'); return; }
    try {
        await ProductosAPI.addMaterial(currentProductoId, {
            articulo_id: Number(articulo_id), cantidad_por_unidad: Number(cantidad), seccion: seccion || null
        });
        await verEstructura(currentProductoId);
        loadProductos();
    } catch (e) {
        alert('Error al agregar insumo: ' + e.message);
    }
}

async function quitarMaterial(materialId) {
    if (!confirm('¿Quitar este insumo de la receta?')) return;
    try {
        await ProductosAPI.deleteMaterial(currentProductoId, materialId);
        await verEstructura(currentProductoId);
        loadProductos();
    } catch (e) {
        alert('Error al quitar el insumo: ' + e.message);
    }
}

async function importarReceta(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    document.getElementById('producto-modal-body').insertAdjacentHTML('afterbegin',
        '<p id="import-msg" style="color:#666">📤 Importando receta...</p>');
    try {
        const r = await ProductosAPI.importMateriales(currentProductoId, fd);
        let msg = `✅ Importado: ${r.insertados} nuevos, ${r.actualizados} actualizados.`;
        if (r.total_errores) msg += ` ⚠️ ${r.total_errores} con error (ej: ${(r.errores[0] || '')}).`;
        alert(msg);
        await verEstructura(currentProductoId);
        loadProductos();
    } catch (e) {
        alert('Error al importar la receta: ' + e.message);
        const m = document.getElementById('import-msg'); if (m) m.remove();
    }
}

function renderPlanificacionesTable() {
    const container = document.getElementById('planificaciones-table-container');
    if (!container) return;
    if (planificaciones.length === 0) {
        container.innerHTML = '<p class="text-center">No hay planificaciones. Creá una eligiendo un producto y la cantidad a fabricar.</p>';
        return;
    }
    container.innerHTML = `
        <table class="table">
            <thead><tr>
                <th>Nombre</th><th>Producto</th><th>Unidades</th>
                <th>Fecha Inicio</th><th>Fecha Fin</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
                ${planificaciones.map(p => {
                    const estado = getEstado(p);
                    return `<tr>
                        <td><span style="color:var(--primary-color);cursor:pointer;font-weight:500"
                              onclick="window.planificacionModule.verNecesidades(${p.id})">${p.nombre}</span></td>
                        <td>${p.producto_nombre || '-'}</td>
                        <td>${p.producto_id ? p.cantidad_unidades : '-'}</td>
                        <td>${formatDate(p.fecha_inicio)}</td>
                        <td>${formatDate(p.fecha_fin)}</td>
                        <td><span class="badge badge-${estado.class}">${estado.text}</span></td>
                        <td style="display:flex; gap:6px; flex-wrap:wrap">
                            <button class="btn btn-sm btn-primary"
                                    onclick="window.planificacionModule.verNecesidades(${p.id})">🧮 Abrir</button>
                            <button class="btn btn-sm btn-secondary" style="background:#c62828; color:#fff"
                                    onclick="window.planificacionModule.eliminarPlanificacion(${p.id}, '${(p.nombre || '').replace(/'/g, '')}')">🗑 Eliminar</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

async function eliminarPlanificacion(planId, nombre) {
    if (!confirm(`¿Eliminar la planificación "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
        await API.delete(`/planificacion/${planId}`);
        await loadPlanificaciones();
    } catch (e) {
        alert('Error al eliminar: ' + e.message);
    }
}

// ---------- Vista NECESIDADES (hoja de trabajo a pantalla completa) ----------
async function verNecesidades(planId) {
    currentPlanId = planId;
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header" style="flex-wrap:wrap; gap:8px">
                <div style="display:flex; align-items:center; gap:12px">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.volver()">← Volver</button>
                    <h2 class="card-title" id="nec-titulo" style="margin:0">Necesidades de Compra</h2>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap">
                    <button class="btn btn-primary" onclick="window.planificacionModule.showCategoriasModal()">🔀 Generar Comparativa</button>
                    <a id="plan-export-link" class="btn btn-secondary" href="#" download>📥 Exportar a Excel</a>
                    <button class="btn btn-secondary" onclick="window.planificacionModule.showItemsModal()">+ Agregar Artículo</button>
                </div>
            </div>
            <div id="nec-resumen" style="padding:12px 16px"></div>
            <div class="card-body">
                <input type="text" id="nec-buscador" placeholder="🔍 Buscar insumo por código o nombre..."
                       style="width:100%; padding:8px 12px; border:1px solid #ddd; border-radius:6px; margin-bottom:12px"
                       oninput="window.planificacionModule.filtrarNecesidades(this.value)">
                <div id="nec-tabla"><div class="flex-center" style="padding:30px"><div class="spinner"></div></div></div>
            </div>
        </div>

        <!-- Modal selección de categorías para comparativa -->
        <div id="comparativa-modal" class="modal-overlay" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Generar Comparativa por Categorías</h3>
                    <button class="modal-close" onclick="document.getElementById('comparativa-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:#666; font-size:0.9rem">
                        Elegí las categorías/rubros para comparar. El sistema arma la competencia con
                        esos insumos y trae los proveedores que los proveen.
                    </p>
                    <div class="form-group">
                        <label for="comparativa-nombre">Nombre de la comparativa</label>
                        <input type="text" id="comparativa-nombre" placeholder="(se genera automáticamente)">
                    </div>
                    <div id="comparativa-categorias" style="max-height:320px; overflow-y:auto; border:1px solid #ddd; border-radius:6px; padding:10px">
                        <div class="flex-center"><div class="spinner"></div></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('comparativa-modal').style.display='none'">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.generarComparativa()">Generar Comparativa</button>
                </div>
            </div>
        </div>

        <!-- Modal agregar artículo suelto -->
        <div id="items-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Agregar Artículo a Planificación</h3>
                    <button class="modal-close" onclick="window.planificacionModule.closeItemsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="items-form">
                        <div class="form-group">
                            <label for="articulo_id">Artículo *</label>
                            <select id="articulo_id" name="articulo_id" required><option value="">Seleccione...</option></select>
                        </div>
                        <div class="form-group">
                            <label for="cantidad_estimada">Cantidad *</label>
                            <input type="number" id="cantidad_estimada" min="0.01" step="0.01" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.planificacionModule.closeItemsModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.planificacionModule.addItem()">Agregar</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('plan-export-link').href =
        `${window.location.origin}/api/planificacion/${planId}/necesidades/export`;
    if (!articulos.length) loadArticulos();

    try {
        const data = await API.get(`/planificacion/${planId}/necesidades`);
        const plan = data.planificacion;
        const res = data.resumen;
        necesidadesActuales = data.necesidades;
        document.getElementById('nec-titulo').textContent = `Necesidades — ${plan.nombre}`;
        document.getElementById('nec-resumen').innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px">
                <div><strong>Producto:</strong> ${plan.producto_nombre || 'Manual'}</div>
                <div><strong>Unidades:</strong> ${plan.cantidad_unidades || '-'}</div>
                <div>🔴🟡 <strong>A comprar:</strong> ${res.a_comprar}</div>
                <div>🟢 <strong>Cubiertos por stock:</strong> ${res.cubiertos_por_stock}</div>
            </div>`;
        renderNecesidadesTabla('');
    } catch (e) {
        document.getElementById('nec-tabla').innerHTML = '<p class="error-message">Error al calcular las necesidades</p>';
    }
}

function renderNecesidadesTabla(filtro) {
    const cont = document.getElementById('nec-tabla');
    if (!cont) return;
    const f = (filtro || '').toLowerCase();
    const items = f
        ? necesidadesActuales.filter(n => `${n.codigo_interno} ${n.nombre} ${n.categoria || ''}`.toLowerCase().includes(f))
        : necesidadesActuales;
    if (!items.length) {
        cont.innerHTML = '<p class="text-muted">Sin insumos para mostrar.</p>';
        return;
    }
    const semaforos = { rojo: '🔴', amarillo: '🟡', verde: '🟢' };
    cont.innerHTML = `<div class="table-responsive"><table class="table">
        <thead><tr>
            <th></th><th>Código</th><th>Artículo</th><th>Categoría</th><th>UM</th>
            <th style="text-align:right">Requerido</th><th style="text-align:right">Stock</th><th style="text-align:right">A Comprar</th>
        </tr></thead>
        <tbody>${items.map(n => `<tr>
            <td>${semaforos[n.semaforo]}</td>
            <td>${n.codigo_interno}</td>
            <td>${n.nombre}</td>
            <td>${n.categoria || '-'}</td>
            <td>${n.unidad_medida || '-'}</td>
            <td style="text-align:right">${n.cantidad_requerida}</td>
            <td style="text-align:right">${n.stock_disponible}</td>
            <td style="text-align:right"><strong>${n.necesidad_neta > 0 ? n.necesidad_neta : '—'}</strong></td>
        </tr>`).join('')}</tbody>
    </table></div>`;
}

function filtrarNecesidades(val) { renderNecesidadesTabla(val); }

function volver() { showListaView(); }

// ---------- Modales de acción ----------
function showCreateModal() {
    document.getElementById('planificacion-form').reset();
    document.getElementById('plan-cantidad').value = 1;
    poblarSelectProductos();
    document.getElementById('planificacion-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('planificacion-modal').style.display = 'none'; }

function showItemsModal() {
    const select = document.getElementById('articulo_id');
    select.innerHTML = '<option value="">Seleccione...</option>';
    articulos.forEach(art => {
        const opt = document.createElement('option');
        opt.value = art.id;
        opt.textContent = `${art.codigo_interno} — ${art.nombre || art.descripcion}`;
        select.appendChild(opt);
    });
    document.getElementById('items-form').reset();
    document.getElementById('items-modal').style.display = 'flex';
}
function closeItemsModal() { document.getElementById('items-modal').style.display = 'none'; }

async function savePlanificacion() {
    const productoId = document.getElementById('plan-producto').value || null;
    const data = {
        nombre: document.getElementById('plan-nombre').value,
        descripcion: document.getElementById('plan-descripcion').value,
        fecha_inicio: document.getElementById('plan-fecha-inicio').value || null,
        fecha_fin: document.getElementById('plan-fecha-fin').value || null,
        producto_id: productoId,
        cantidad_unidades: document.getElementById('plan-cantidad').value || 1,
    };
    if (!data.nombre) { alert('Poné un nombre a la planificación'); return; }
    try {
        const r = await API.post('/planificacion', data);
        closeModal();
        if (r.items_generados) {
            alert(`Planificación creada: ${r.items_generados} insumos calculados automáticamente`);
            verNecesidades(r.id);
        } else {
            await loadPlanificaciones();
            alert('Planificación creada');
        }
    } catch (e) {
        alert('Error al guardar planificación: ' + e.message);
    }
}

async function addItem() {
    if (!currentPlanId) { alert('No hay planificación seleccionada'); return; }
    const data = {
        articulo_id: document.getElementById('articulo_id').value,
        cantidad_estimada: document.getElementById('cantidad_estimada').value,
    };
    try {
        await API.post(`/planificacion/${currentPlanId}/items`, data);
        closeItemsModal();
        await verNecesidades(currentPlanId);
    } catch (e) {
        alert('Error al agregar artículo');
    }
}

async function showCategoriasModal() {
    if (!currentPlanId) { alert('No hay planificación seleccionada'); return; }
    document.getElementById('comparativa-nombre').value = '';
    const cont = document.getElementById('comparativa-categorias');
    cont.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';
    document.getElementById('comparativa-modal').style.display = 'flex';
    try {
        const cats = await API.get(`/planificacion/${currentPlanId}/categorias`);
        if (!cats.length) { cont.innerHTML = '<p class="text-muted">La planificación no tiene ítems.</p>'; return; }
        cont.innerHTML = `
            <label style="display:block; margin-bottom:8px; font-weight:600">
                <input type="checkbox" id="cat-todas" onchange="window.planificacionModule.toggleTodasCategorias(this)"> Seleccionar todas
            </label><hr style="margin:8px 0">
            ${cats.map(c => `
                <label style="display:flex; align-items:center; gap:8px; padding:4px 0; cursor:pointer">
                    <input type="checkbox" class="cat-check" value="${c.subcategoria_id || ''}">
                    <span style="flex:1">${c.categoria || 'Sin categoría'}</span>
                    <span style="color:#666; font-size:0.8rem">${c.articulos} insumos · ${c.proveedores} prov.</span>
                </label>`).join('')}`;
    } catch (e) {
        cont.innerHTML = '<p class="error-message">Error al cargar las categorías</p>';
    }
}

function toggleTodasCategorias(master) {
    document.querySelectorAll('.cat-check').forEach(cb => { cb.checked = master.checked; });
}

async function generarComparativa() {
    const ids = Array.from(document.querySelectorAll('.cat-check:checked')).map(cb => cb.value).filter(v => v);
    if (!ids.length) { alert('Elegí al menos una categoría'); return; }
    try {
        const r = await API.post(`/planificacion/${currentPlanId}/generar-competencia`, {
            subcategoria_ids: ids.map(Number),
            nombre: document.getElementById('comparativa-nombre').value || null,
        });
        document.getElementById('comparativa-modal').style.display = 'none';
        alert(`Comparativa generada: ${r.items} insumos y ${r.proveedores} proveedores.\n` +
              (r.proveedores === 0
                ? 'Nota: todavía no hay listas de precios cargadas, así que no se vincularon proveedores.'
                : 'Andá al módulo Competencia para trabajar la comparación de precios.'));
    } catch (e) {
        alert('Error al generar la comparativa: ' + e.message);
    }
}

function getEstado(plan) {
    if (!plan.fecha_inicio || !plan.fecha_fin) return { text: 'Abierta', class: 'info' };
    const hoy = new Date();
    const inicio = new Date(plan.fecha_inicio);
    const fin = new Date(plan.fecha_fin);
    if (hoy < inicio) return { text: 'Pendiente', class: 'warning' };
    if (hoy >= inicio && hoy <= fin) return { text: 'En Curso', class: 'success' };
    return { text: 'Finalizada', class: 'secondary' };
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-AR');
}

window.planificacionModule = {
    showCreateModal, closeModal, savePlanificacion,
    showItemsModal, closeItemsModal, addItem,
    verNecesidades, verEstructura, volver,
    eliminarPlanificacion, filtrarNecesidades,
    showCategoriasModal, toggleTodasCategorias, generarComparativa,
    showProductoModal, saveProducto,
    showAddMaterial, addMaterial, quitarMaterial, importarReceta,
};
