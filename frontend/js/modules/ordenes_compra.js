// Módulo de Órdenes de Compra
import { OrdenesCompraAPI, ProveedoresAPI, ArticulosAPI, API } from '../api.js';

let ordenes = [];
let currentOrdenId = null;

export async function initOrdenesCompra() {
    renderOrdenesCompraView();
    await loadOrdenes();
}

function renderOrdenesCompraView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Órdenes de Compra</h2>
                <button class="btn btn-primary" onclick="window.ordenesCompraModule.showCreateModal()">
                    + Nueva Orden de Compra
                </button>
            </div>
            <div class="card-body">
                <div id="ordenes-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para crear orden de compra -->
        <div id="orden-modal" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 900px;">
                <div class="modal-header">
                    <h3 class="modal-title">Nueva Orden de Compra</h3>
                    <button class="modal-close" onclick="window.ordenesCompraModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="orden-form">
                        <div class="form-group">
                            <label for="proveedor_id">Proveedor *</label>
                            <select id="proveedor_id" name="proveedor_id" required>
                                <option value="">Seleccione un proveedor...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="fecha_emision">Fecha Emisión *</label>
                            <input type="date" id="fecha_emision" name="fecha_emision" required>
                        </div>
                        
                        <hr>
                        <h4>Items de la Orden</h4>
                        <div id="items-container">
                            <!-- Items se agregarán dinámicamente -->
                        </div>
                        <button type="button" class="btn btn-secondary" onclick="window.ordenesCompraModule.addItem()">+ Agregar Item</button>
                        
                        <hr>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
                            <div>
                                <label>Subtotal:</label>
                                <p id="subtotal-display" style="font-size: 18px; font-weight: bold;">$0.00</p>
                            </div>
                            <div>
                                <label>IVA (21%):</label>
                                <p id="iva-display" style="font-size: 18px; font-weight: bold;">$0.00</p>
                            </div>
                            <div>
                                <label>Total:</label>
                                <p id="total-display" style="font-size: 20px; font-weight: bold; color: var(--primary-color);">$0.00</p>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.ordenesCompraModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.ordenesCompraModule.saveOrden()">Crear Orden</button>
                </div>
            </div>
        </div>

        <!-- Modal para vista detallada -->
        <div id="orden-detail-modal" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 95%; width: 1000px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="detail-modal-title">Orden de Compra</h3>
                    <button class="modal-close" onclick="window.ordenesCompraModule.closeDetailModal()">&times;</button>
                </div>
                <div class="modal-body" id="orden-detail-content">
                    <!-- Contenido se cargará dinámicamente -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.ordenesCompraModule.closeDetailModal()">Cerrar</button>
                    <button class="btn btn-primary" id="export-orden-btn">Exportar a Excel</button>
                </div>
            </div>
        </div>
    `;

    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('fecha_emision');
    if (fechaInput) {
        fechaInput.value = today;
    }
}

async function loadOrdenes() {
    try {
        ordenes = await OrdenesCompraAPI.getAll();
        renderOrdenesTable();
    } catch (error) {
        console.error('Error loading ordenes:', error);
        document.getElementById('ordenes-table-container').innerHTML = 
            '<p class="error-message">Error al cargar órdenes de compra</p>';
    }
}

function renderOrdenesTable() {
    const container = document.getElementById('ordenes-table-container');
    
    if (ordenes.length === 0) {
        container.innerHTML = '<p class="text-center">No hay órdenes de compra registradas</p>';
        return;
    }
    
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Proveedor</th>
                    <th>Fecha Emisión</th>
                    <th>Fecha Entrega</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${ordenes.map(o => `
                    <tr>
                        <td>${o.numero || '-'}</td>
                        <td>${o.proveedor_nombre}</td>
                        <td>${formatDate(o.fecha_emision)}</td>
                        <td>${formatDate(o.fecha_entrega_estimada)}</td>
                        <td><span class="badge badge-${getEstadoClass(o.estado)}">${o.estado}</span></td>
                        <td>${formatCurrency(o.total)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.ordenesCompraModule.viewOrden(${o.id})">Ver Detalle</button>
                            <button class="btn btn-sm btn-primary" onclick="window.ordenesCompraModule.exportOrden(${o.id})">Exportar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function showCreateModal() {
    // Cargar proveedores
    try {
        const proveedores = await ProveedoresAPI.getAll();
        const select = document.getElementById('proveedor_id');
        
        select.innerHTML = '<option value="">Seleccione un proveedor...</option>' +
            proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error loading proveedores:', error);
    }
    
    // Limpiar items
    document.getElementById('items-container').innerHTML = '';
    addItem(); // Agregar primer item
    
    document.getElementById('orden-form').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fecha_emision').value = today;
    
    updateTotals();
    document.getElementById('orden-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('orden-modal').style.display = 'none';
}

let itemCounter = 0;

async function addItem() {
    itemCounter++;
    const container = document.getElementById('items-container');
    
    // Cargar artículos
    let articulosOptions = '<option value="">Seleccione un artículo...</option>';
    try {
        const articulos = await ArticulosAPI.getAll();
        articulosOptions += articulos.map(a => 
            `<option value="${a.id}">${a.codigo_interno} - ${a.nombre}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading articulos:', error);
    }
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item-row';
    itemDiv.dataset.itemId = itemCounter;
    itemDiv.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: end;';
    
    itemDiv.innerHTML = `
        <div class="form-group" style="margin: 0;">
            <label>Artículo</label>
            <select name="articulo_id" class="item-articulo" required>
                ${articulosOptions}
            </select>
        </div>
        <div class="form-group" style="margin: 0;">
            <label>Cantidad</label>
            <input type="number" name="cantidad" class="item-cantidad" min="1" value="1" required>
        </div>
        <div class="form-group" style="margin: 0;">
            <label>Precio Unit.</label>
            <input type="number" name="precio_unitario" class="item-precio" step="0.01" min="0" value="0" required>
        </div>
        <div class="form-group" style="margin: 0;">
            <label>Subtotal</label>
            <input type="text" class="item-subtotal" readonly style="background: #f5f5f5;" value="$0.00">
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="window.ordenesCompraModule.removeItem(${itemCounter})" style="margin-bottom: 0;">×</button>
    `;
    
    container.appendChild(itemDiv);
    
    // Agregar listeners para calcular subtotales
    const cantidadInput = itemDiv.querySelector('.item-cantidad');
    const precioInput = itemDiv.querySelector('.item-precio');
    
    cantidadInput.addEventListener('input', updateItemSubtotal);
    precioInput.addEventListener('input', updateItemSubtotal);
    
    function updateItemSubtotal() {
        const cantidad = parseFloat(cantidadInput.value) || 0;
        const precio = parseFloat(precioInput.value) || 0;
        const subtotal = cantidad * precio;
        
        itemDiv.querySelector('.item-subtotal').value = formatCurrency(subtotal);
        updateTotals();
    }
}

function removeItem(itemId) {
    const itemDiv = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemDiv) {
        itemDiv.remove();
        updateTotals();
    }
}

function updateTotals() {
    const items = document.querySelectorAll('.item-row');
    let subtotal = 0;
    
    items.forEach(item => {
        const cantidad = parseFloat(item.querySelector('.item-cantidad').value) || 0;
        const precio = parseFloat(item.querySelector('.item-precio').value) || 0;
        subtotal += cantidad * precio;
    });
    
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    
    document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
    document.getElementById('iva-display').textContent = formatCurrency(iva);
    document.getElementById('total-display').textContent = formatCurrency(total);
}

async function saveOrden() {
    const form = document.getElementById('orden-form');
    const formData = new FormData(form);
    
    const proveedorId = formData.get('proveedor_id');
    const fechaEmision = formData.get('fecha_emision');
    
    if (!proveedorId || !fechaEmision) {
        alert('Proveedor y fecha de emisión son requeridos');
        return;
    }
    
    // Obtener items
    const itemsRows = document.querySelectorAll('.item-row');
    const items = [];
    
    itemsRows.forEach(row => {
        const articuloId = row.querySelector('.item-articulo').value;
        const cantidad = parseFloat(row.querySelector('.item-cantidad').value);
        const precioUnitario = parseFloat(row.querySelector('.item-precio').value);
        
        if (articuloId && cantidad && precioUnitario) {
            items.push({
                articulo_id: parseInt(articuloId),
                cantidad: cantidad,
                precio_unitario: precioUnitario
            });
        }
    });
    
    if (items.length === 0) {
        alert('Debe agregar al menos un item a la orden');
        return;
    }
    
    const data = {
        proveedor_id: parseInt(proveedorId),
        fecha_emision: fechaEmision,
        items: items
    };
    
    try {
        await OrdenesCompraAPI.create(data);
        closeModal();
        await loadOrdenes();
        alert('Orden de compra creada exitosamente');
    } catch (error) {
        console.error('Error saving orden:', error);
        alert('Error al guardar orden de compra: ' + error.message);
    }
}

async function viewOrden(id) {
    currentOrdenId = id;
    
    try {
        const orden = await OrdenesCompraAPI.getById(id);
        
        document.getElementById('detail-modal-title').textContent = `Orden de Compra ${orden.numero || '#' + orden.id}`;
        
        const content = `
            <div class="orden-detail">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-bottom: 30px;">
                    <div>
                        <h4>Información General</h4>
                        <p><strong>Número:</strong> ${orden.numero || '-'}</p>
                        <p><strong>Estado:</strong> <span class="badge badge-${getEstadoClass(orden.estado)}">${orden.estado}</span></p>
                        <p><strong>Fecha Emisión:</strong> ${formatDate(orden.fecha_emision)}</p>
                        <p><strong>Fecha Entrega Estimada:</strong> ${formatDate(orden.fecha_entrega_estimada)}</p>
                    </div>
                    <div>
                        <h4>Proveedor</h4>
                        <p><strong>Nombre:</strong> ${orden.proveedor_nombre}</p>
                        <p><strong>Forma de Pago:</strong> ${orden.forma_pago || '-'}</p>
                        <p><strong>Plazo de Pago:</strong> ${orden.plazo_pago ? orden.plazo_pago + ' días' : '-'}</p>
                        <p><strong>Tiempo de Entrega:</strong> ${orden.tiempo_entrega ? orden.tiempo_entrega + ' días' : '-'}</p>
                    </div>
                </div>
                
                <h4>Items de la Orden</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Artículo</th>
                            <th>Cantidad</th>
                            <th>Precio Unitario</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orden.items?.map(item => `
                            <tr>
                                <td>${item.codigo_interno}</td>
                                <td>${item.articulo_nombre}</td>
                                <td>${item.cantidad}</td>
                                <td>${formatCurrency(item.precio_unitario)}</td>
                                <td>${formatCurrency(item.subtotal)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5">No hay items</td></tr>'}
                    </tbody>
                </table>
                
                <div style="display: flex; justify-content: flex-end; gap: 30px; margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
                    <div>
                        <p style="margin: 0;"><strong>Subtotal:</strong></p>
                        <p style="font-size: 18px; margin: 5px 0;">${formatCurrency(orden.subtotal)}</p>
                    </div>
                    <div>
                        <p style="margin: 0;"><strong>IVA (21%):</strong></p>
                        <p style="font-size: 18px; margin: 5px 0;">${formatCurrency(orden.iva)}</p>
                    </div>
                    <div>
                        <p style="margin: 0;"><strong>Total:</strong></p>
                        <p style="font-size: 22px; font-weight: bold; color: var(--primary-color); margin: 5px 0;">${formatCurrency(orden.total)}</p>
                    </div>
                </div>
                
                ${orden.comprobantes_relacionados && orden.comprobantes_relacionados.length > 0 ? `
                    <div style="margin-top: 30px;">
                        <h4>Trazabilidad - Comprobantes Relacionados</h4>
                        <div class="trazabilidad-timeline">
                            ${renderTrazabilidad(orden)}
                        </div>
                    </div>
                ` : `
                    <div style="margin-top: 30px;">
                        <h4>Trazabilidad</h4>
                        <p class="text-muted">No hay comprobantes relacionados aún</p>
                        <div class="trazabilidad-flow">
                            <div class="trazabilidad-step active">
                                <div class="step-icon">📋</div>
                                <div class="step-label">Orden de Compra</div>
                            </div>
                            <div class="trazabilidad-arrow">→</div>
                            <div class="trazabilidad-step">
                                <div class="step-icon">📦</div>
                                <div class="step-label">Recepción</div>
                            </div>
                            <div class="trazabilidad-arrow">→</div>
                            <div class="trazabilidad-step">
                                <div class="step-icon">🧾</div>
                                <div class="step-label">Factura</div>
                            </div>
                            <div class="trazabilidad-arrow">→</div>
                            <div class="trazabilidad-step">
                                <div class="step-icon">💰</div>
                                <div class="step-label">Pago</div>
                            </div>
                        </div>
                    </div>
                `}
            </div>
        `;
        
        document.getElementById('orden-detail-content').innerHTML = content;
        document.getElementById('orden-detail-modal').style.display = 'flex';
        
        // Configurar botón de exportar
        document.getElementById('export-orden-btn').onclick = () => exportOrden(id);
    } catch (error) {
        console.error('Error loading orden:', error);
        alert('Error al cargar orden de compra');
    }
}

function closeDetailModal() {
    document.getElementById('orden-detail-modal').style.display = 'none';
    currentOrdenId = null;
}

function renderTrazabilidad(orden) {
    const comprobantes = orden.comprobantes_relacionados || [];
    
    const tipos = {
        'recepcion': { icon: '📦', label: 'Recepción' },
        'factura': { icon: '🧾', label: 'Factura' },
        'pago': { icon: '💰', label: 'Pago' }
    };
    
    return `
        <table class="table">
            <thead>
                <tr>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Relación</th>
                </tr>
            </thead>
            <tbody>
                ${comprobantes.map(c => `
                    <tr>
                        <td>${tipos[c.tipo]?.icon || '📄'} ${tipos[c.tipo]?.label || c.tipo}</td>
                        <td>${c.numero}</td>
                        <td>${formatDate(c.fecha_emision)}</td>
                        <td>${c.tipo_relacion}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function exportOrden(id) {
    try {
        const url = `${API.baseURL}/export/orden-compra/${id}`;
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al exportar');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `orden_compra_${id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        alert('Orden de compra exportada exitosamente');
    } catch (error) {
        console.error('Error exporting orden:', error);
        alert('Error al exportar orden de compra');
    }
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getEstadoClass(estado) {
    const classes = {
        'abierta': 'primary',
        'parcial': 'warning',
        'completa': 'success',
        'cancelada': 'danger'
    };
    return classes[estado] || 'secondary';
}

// Exportar funciones para uso global
window.ordenesCompraModule = {
    showCreateModal,
    closeModal,
    saveOrden,
    addItem,
    removeItem,
    viewOrden,
    closeDetailModal,
    exportOrden
};


