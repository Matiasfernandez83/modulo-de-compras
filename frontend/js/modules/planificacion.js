// Módulo de planificación estilo MRP: estructuras de producto (BOM),
// explosión de materiales y cálculo de necesidades de compra contra stock.
import { API, ArticulosAPI, ProductosAPI } from '../api.js';

let planificaciones = [];
let productos = [];
let articulos = [];
let currentPlanId = null;
let currentProductoId = null;

export async function initPlanificacion() {
    renderPlanificacionView();
    await Promise.all([loadPlanificaciones(), loadProductos()]);
    loadArticulos();
}

function renderPlanificacionView() {
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
            </div>
            <p style="padding:8px 16px; margin:0; color:#666; font-size:0.85rem">
                Cada estructura define qué insumos y en qué cantidad lleva UNA unidad del producto.
            </p>
            <div class="card-body">
                <div id="productos-table-container">
                    <div class="flex-center" style="padding: 24px;"><div class="spinner"></div></div>
                </div>
            </div>
        </div>

        <!-- Modal necesidades de compra -->
        <div id="plan-detalle-modal" class="modal-overlay" style="display:none">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="plan-detalle-titulo">Necesidades de Compra</h3>
                    <button class="modal-close" onclick="document.getElementById('plan-detalle-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="plan-detalle-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
                <div class="modal-footer" style="gap:8px; flex-wrap:wrap">
                    <a id="plan-export-link" class="btn btn-secondary" href="#" download>📥 Exportar a Excel</a>
                    <button class="btn btn-secondary" onclick="window.planificacionModule.showItemsModal()">+ Agregar Artículo</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('plan-detalle-modal').style.display='none'">Cerrar</button>
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
                <div class="modal-body" id="producto-modal-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
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
                            <select id="articulo_id" name="articulo_id" required>
                                <option value="">Seleccione un artículo...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="cantidad_estimada">Cantidad *</label>
                            <input type="number" id="cantidad_estimada" name="cantidad_estimada" min="0.01" step="0.01" required>
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
}

async function loadPlanificaciones() {
    try {
        planificaciones = await API.get('/planificacion');
        renderPlanificacionesTable();
    } catch (error) {
        document.getElementById('planificaciones-table-container').innerHTML =
            '<p class="error-message">Error al cargar planificaciones</p>';
    }
}

async function loadProductos() {
    try {
        productos = await ProductosAPI.getAll();
        renderProductosTable();
        poblarSelectProductos();
    } catch (e) {
        document.getElementById('productos-table-container').innerHTML =
            '<p class="error-message">Error al cargar productos</p>';
    }
}

async function loadArticulos() {
    try {
        articulos = await ArticulosAPI.getAll();
    } catch (e) { articulos = []; }
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

async function verEstructura(productoId) {
    currentProductoId = productoId;
    document.getElementById('producto-modal-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    document.getElementById('producto-modal').style.display = 'flex';
    try {
        const p = await ProductosAPI.getById(productoId);
        document.getElementById('producto-modal-titulo').textContent = `${p.codigo} — ${p.nombre}`;

        let html = `<p style="color:#666; margin-bottom:12px">
            Cantidades por <strong>1 unidad</strong> del producto (${p.total_materiales} insumos)</p>`;
        let seccionActual = null;
        html += '<div class="table-responsive"><table class="table"><thead><tr><th>Código</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th><th>Plano</th></tr></thead><tbody>';
        for (const m of p.materiales) {
            if (m.seccion && m.seccion !== seccionActual) {
                seccionActual = m.seccion;
                html += `<tr><td colspan="5" style="background:#f0f4f8; font-weight:bold">${seccionActual}</td></tr>`;
            }
            html += `<tr>
                <td>${m.codigo_interno}</td>
                <td title="${m.observaciones || ''}">${m.articulo_nombre}</td>
                <td><strong>${m.cantidad_por_unidad}</strong></td>
                <td>${m.unidad_medida || '-'}</td>
                <td style="font-size:0.8rem; color:#666">${m.plano || '-'}</td>
            </tr>`;
        }
        html += '</tbody></table></div>';
        document.getElementById('producto-modal-body').innerHTML = html;
    } catch (e) {
        document.getElementById('producto-modal-body').innerHTML =
            '<p class="error-message">Error al cargar la estructura</p>';
    }
}

function renderPlanificacionesTable() {
    const container = document.getElementById('planificaciones-table-container');
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
                        <td><button class="btn btn-sm btn-primary"
                                    onclick="window.planificacionModule.verNecesidades(${p.id})">🧮 Necesidades</button></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

async function verNecesidades(planId) {
    currentPlanId = planId;
    document.getElementById('plan-detalle-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    document.getElementById('plan-detalle-modal').style.display = 'flex';
    document.getElementById('plan-export-link').href =
        `${window.location.origin}/api/planificacion/${planId}/necesidades/export`;

    try {
        const data = await API.get(`/planificacion/${planId}/necesidades`);
        const plan = data.planificacion;
        const res = data.resumen;
        document.getElementById('plan-detalle-titulo').textContent = `Necesidades — ${plan.nombre}`;

        const semaforos = { rojo: '🔴', amarillo: '🟡', verde: '🟢' };
        const cabecera = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:16px">
                <div><strong>Producto:</strong> ${plan.producto_nombre || 'Manual'}</div>
                <div><strong>Unidades:</strong> ${plan.cantidad_unidades || '-'}</div>
                <div>🔴🟡 <strong>A comprar:</strong> ${res.a_comprar}</div>
                <div>🟢 <strong>Cubiertos por stock:</strong> ${res.cubiertos_por_stock}</div>
            </div>`;

        const tabla = data.necesidades.length === 0
            ? '<p class="text-muted">Sin ítems. Agregá artículos o creá la planificación desde un producto.</p>'
            : `<div class="table-responsive"><table class="table">
                <thead><tr>
                    <th></th><th>Código</th><th>Artículo</th><th>Categoría</th><th>UM</th>
                    <th>Requerido</th><th>Stock</th><th>A Comprar</th>
                </tr></thead>
                <tbody>
                    ${data.necesidades.map(n => `<tr>
                        <td>${semaforos[n.semaforo]}</td>
                        <td>${n.codigo_interno}</td>
                        <td>${n.nombre}</td>
                        <td>${n.categoria || '-'}</td>
                        <td>${n.unidad_medida || '-'}</td>
                        <td>${n.cantidad_requerida}</td>
                        <td>${n.stock_disponible}</td>
                        <td><strong>${n.necesidad_neta > 0 ? n.necesidad_neta : '—'}</strong></td>
                    </tr>`).join('')}
                </tbody>
               </table></div>`;

        document.getElementById('plan-detalle-body').innerHTML = cabecera + tabla;
    } catch (e) {
        document.getElementById('plan-detalle-body').innerHTML =
            '<p class="error-message">Error al calcular las necesidades</p>';
    }
}

function showCreateModal() {
    document.getElementById('planificacion-form').reset();
    document.getElementById('plan-cantidad').value = 1;
    poblarSelectProductos();
    document.getElementById('planificacion-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('planificacion-modal').style.display = 'none';
}

function showItemsModal() {
    const select = document.getElementById('articulo_id');
    select.innerHTML = '<option value="">Seleccione un artículo...</option>';
    articulos.forEach(art => {
        const opt = document.createElement('option');
        opt.value = art.id;
        opt.textContent = `${art.codigo_interno} — ${art.nombre || art.descripcion}`;
        select.appendChild(opt);
    });
    document.getElementById('items-form').reset();
    document.getElementById('items-modal').style.display = 'flex';
}

function closeItemsModal() {
    document.getElementById('items-modal').style.display = 'none';
}

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
        await loadPlanificaciones();
        if (r.items_generados) {
            alert(`Planificación creada: ${r.items_generados} insumos calculados automáticamente`);
            verNecesidades(r.id);
        } else {
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
    showCreateModal,
    closeModal,
    savePlanificacion,
    showItemsModal,
    closeItemsModal,
    addItem,
    verNecesidades,
    verEstructura,
};
