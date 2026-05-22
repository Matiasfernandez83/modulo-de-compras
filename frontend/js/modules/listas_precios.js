import { API } from '../api.js';

export async function initListasPrecios() {
    const contentArea = document.getElementById('content-area');

    contentArea.innerHTML = `
        <div class="listas-container">
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Listas de Precios</h3>
                    <button class="btn btn-primary" onclick="window.listasModule.showNuevaListaModal()">
                        + Nueva Lista
                    </button>
                </div>
                <div class="card-body">
                    <div id="listas-table-container">
                        <div class="flex-center" style="padding:40px"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal historial artículo dentro de lista -->
        <div id="art-historial-modal" class="modal-overlay" style="display:none">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="art-historial-titulo">Historial del Artículo</h3>
                    <button class="modal-close" onclick="document.getElementById('art-historial-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="art-historial-body">
                    <div class="flex-center"><div class="spinner"></div></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('art-historial-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal Nueva Lista -->
        <div id="modal-nueva-lista" class="modal-overlay" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <h3>Nueva Lista de Precios</h3>
                    <button class="modal-close" onclick="window.listasModule.closeNuevaListaModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="form-nueva-lista">
                        <div class="form-group">
                            <label>Nombre de la Lista *</label>
                            <input type="text" id="lista-nombre" required>
                        </div>
                        <div class="form-group">
                            <label>Proveedor *</label>
                            <select id="lista-proveedor" required>
                                <option value="">Seleccione un proveedor</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Moneda</label>
                            <select id="lista-moneda">
                                <option value="PESOS">Pesos</option>
                                <option value="DOLARES">Dólares</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha Vigencia *</label>
                            <input type="date" id="lista-vigencia" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha Vencimiento (opcional)</label>
                            <input type="date" id="lista-vencimiento">
                        </div>
                        <div class="form-group">
                            <label>Cargar desde archivo (opcional)</label>
                            <input type="file" id="lista-archivo" accept=".xlsx,.xls,.pdf">
                            <small class="form-text">Excel (.xlsx, .xls) o PDF</small>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="window.listasModule.closeNuevaListaModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Crear Lista</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    await loadProveedores();
    await loadListas();

    document.getElementById('form-nueva-lista').addEventListener('submit', handleNuevaLista);

    window.listasModule = {
        showNuevaListaModal,
        closeNuevaListaModal,
        viewLista,
        exportLista,
        verHistorialArticulo,
    };
    // compatibilidad con código viejo
    window.showNuevaListaModal = showNuevaListaModal;
    window.closeNuevaListaModal = closeNuevaListaModal;
    window.viewLista = viewLista;
    window.exportLista = exportLista;
}

async function loadProveedores() {
    try {
        const proveedores = await API.get('/proveedores');
        const select = document.getElementById('lista-proveedor');
        proveedores.forEach(prov => {
            const opt = document.createElement('option');
            opt.value = prov.id;
            opt.textContent = prov.nombre;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

async function loadListas() {
    try {
        const listas = await API.get('/listas-precios');
        const container = document.getElementById('listas-table-container');

        if (listas.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay listas de precios creadas</p>';
            return;
        }

        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr><th>Nombre</th><th>Proveedor</th><th>Moneda</th><th>Vigencia</th><th>Items</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                    ${listas.map(l => `<tr>
                        <td>${l.nombre}</td>
                        <td>${l.proveedor_nombre || '-'}</td>
                        <td>${l.moneda}</td>
                        <td>${l.fecha_vigencia ? new Date(l.fecha_vigencia).toLocaleDateString('es-AR') : '-'}</td>
                        <td>${l.cantidad_articulos || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.viewLista(${l.id})">👁 Ver</button>
                            <button class="btn btn-sm btn-secondary" onclick="window.exportLista(${l.id})">📊 Exportar</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        console.error(e);
    }
}

function showNuevaListaModal() {
    document.getElementById('modal-nueva-lista').style.display = 'flex';
}

function closeNuevaListaModal() {
    document.getElementById('modal-nueva-lista').style.display = 'none';
    document.getElementById('form-nueva-lista').reset();
}

async function handleNuevaLista(e) {
    e.preventDefault();
    try {
        const lista = await API.post('/listas-precios', {
            nombre: document.getElementById('lista-nombre').value,
            proveedor_id: parseInt(document.getElementById('lista-proveedor').value),
            moneda: document.getElementById('lista-moneda').value,
            fecha_vigencia: document.getElementById('lista-vigencia').value,
            fecha_vencimiento: document.getElementById('lista-vencimiento').value || null
        });

        const archivo = document.getElementById('lista-archivo').files[0];
        if (archivo) {
            const fd = new FormData();
            fd.append('file', archivo);
            await fetch(`' + window.location.origin + '/api/upload/lista-precios/${lista.id}`, {
                method: 'POST', credentials: 'include', body: fd
            });
        }

        closeNuevaListaModal();
        await loadListas();
        alert('Lista de precios creada exitosamente');
    } catch (error) {
        alert('Error al crear la lista: ' + (error.message || 'Error desconocido'));
    }
}

async function viewLista(listaId) {
    try {
        const lista = await API.get(`/listas-precios/${listaId}`);
        const contentArea = document.getElementById('content-area');

        let itemsHTML = '';
        for (const [categoria, items] of Object.entries(lista.items_por_categoria || {})) {
            itemsHTML += `
                <div style="margin-bottom:20px">
                    <h5 style="background:#f0f0f0; padding:8px 12px; border-radius:4px; font-weight:700">${categoria}</h5>
                    <table class="table">
                        <thead><tr>
                            <th>Código</th><th>Artículo</th>
                            <th>Precio Bruto</th><th>IVA %</th><th>Desc %</th><th>Precio Neto</th>
                        </tr></thead>
                        <tbody>
                            ${items.map(item => `<tr>
                                <td>${item.codigo_proveedor || item.codigo_interno || '-'}</td>
                                <td>
                                    <span style="color:var(--primary-color);cursor:pointer;font-weight:500"
                                          onclick="window.listasModule.verHistorialArticulo(${item.articulo_id}, '${(item.articulo_nombre||'').replace(/'/g,"\\'")}', ${listaId})"
                                          title="Click para ver historial completo del artículo">
                                        ${item.articulo_nombre}
                                    </span>
                                </td>
                                <td>$${(item.precio_bruto||0).toFixed(2)}</td>
                                <td>${item.iva_porcentaje||0}%</td>
                                <td>${item.descuento_porcentaje||0}%</td>
                                <td><strong>$${(item.precio_neto||0).toFixed(2)}</strong></td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        contentArea.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>${lista.nombre}</h3>
                    <button class="btn btn-secondary"
                            onclick="window.listasModule.showNuevaListaModal ? initListasPrecios() : location.reload()">
                        ← Volver
                    </button>
                </div>
                <div class="card-body">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:20px">
                        <div><strong>Proveedor:</strong> ${lista.proveedor_nombre}</div>
                        <div><strong>Moneda:</strong> ${lista.moneda}</div>
                        <div><strong>Vigencia:</strong> ${lista.fecha_vigencia ? new Date(lista.fecha_vigencia).toLocaleDateString('es-AR') : '-'}</div>
                        <div><strong>Total Items:</strong> ${lista.total_items}</div>
                    </div>
                    <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin-bottom:16px">
                        Items por Categoría
                        <small style="font-weight:400; font-size:0.8rem; color:#666"> — Click en el nombre del artículo para ver su historial completo</small>
                    </h4>
                    ${itemsHTML || '<p class="text-muted">Sin items cargados</p>'}
                </div>
            </div>

            <!-- Modal historial artículo -->
            <div id="art-historial-modal" class="modal-overlay" style="display:none">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3 class="modal-title" id="art-historial-titulo">Historial del Artículo</h3>
                        <button class="modal-close" onclick="document.getElementById('art-historial-modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body" id="art-historial-body">
                        <div class="flex-center"><div class="spinner"></div></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('art-historial-modal').style.display='none'">Cerrar</button>
                    </div>
                </div>
            </div>`;

        // Re-exponer función ya que el DOM cambió
        window.listasModule.verHistorialArticulo = verHistorialArticulo;
        // Botón volver funcional
        const btnVolver = contentArea.querySelector('.btn-secondary');
        if (btnVolver) btnVolver.onclick = () => { initListasPrecios(); };

    } catch (e) {
        console.error(e);
        alert('Error al cargar la lista');
    }
}

async function verHistorialArticulo(articuloId, nombreArticulo, listaActualId) {
    const modal = document.getElementById('art-historial-modal');
    document.getElementById('art-historial-titulo').textContent = `Historial: ${nombreArticulo}`;
    document.getElementById('art-historial-body').innerHTML =
        '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';
    modal.style.display = 'flex';

    try {
        const [precios, compras] = await Promise.all([
            API.get(`/articulos/${articuloId}/historial-precios`),
            API.get(`/articulos/${articuloId}/historial-compras`)
        ]);

        const tablaPrecios = precios.length === 0
            ? '<p class="text-muted">Sin historial de listas de precios</p>'
            : `<table class="table">
                <thead><tr>
                    <th>Lista</th><th>Proveedor</th><th>Vigencia</th>
                    <th>Precio Bruto</th><th>Desc%</th><th>IVA%</th><th>Precio Neto</th>
                </tr></thead>
                <tbody>
                ${precios.map(p => `<tr ${p.lista_id == listaActualId ? 'style="background:#fff3e0; font-weight:600"' : ''}>
                    <td>${p.lista} ${p.lista_id == listaActualId ? '← actual' : ''}</td>
                    <td>${p.proveedor}</td>
                    <td>${p.fecha_vigencia ? new Date(p.fecha_vigencia).toLocaleDateString('es-AR') : '-'}</td>
                    <td>$${(p.precio_bruto||0).toFixed(2)}</td>
                    <td>${p.descuento_porcentaje||0}%</td>
                    <td>${p.iva_porcentaje||0}%</td>
                    <td><strong>$${(p.precio_neto||0).toFixed(2)}</strong></td>
                </tr>`).join('')}
                </tbody></table>`;

        const tablaCompras = compras.length === 0
            ? '<p class="text-muted">Sin órdenes de compra registradas</p>'
            : `<table class="table">
                <thead><tr>
                    <th>N° OC</th><th>Fecha</th><th>Proveedor</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th>
                </tr></thead>
                <tbody>
                ${compras.map(c => `<tr>
                    <td><strong>${c.numero || c.comprobante_id}</strong></td>
                    <td>${c.fecha_emision ? new Date(c.fecha_emision).toLocaleDateString('es-AR') : '-'}</td>
                    <td>${c.proveedor}</td>
                    <td>${c.cantidad}</td>
                    <td>$${(c.precio_unitario||0).toFixed(2)}</td>
                    <td>$${(c.subtotal||0).toFixed(2)}</td>
                </tr>`).join('')}
                </tbody></table>`;

        document.getElementById('art-historial-body').innerHTML = `
            <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin-bottom:12px">
                💰 Historial de Listas de Precios (${precios.length})
            </h4>
            ${tablaPrecios}
            <h4 style="border-bottom:2px solid var(--primary-color); padding-bottom:6px; margin:20px 0 12px">
                📋 Historial de Compras (${compras.length})
            </h4>
            ${tablaCompras}
        `;
    } catch (e) {
        document.getElementById('art-historial-body').innerHTML =
            '<p class="error-message">Error al cargar historial</p>';
    }
}

async function exportLista(listaId) {
    const a = document.createElement('a');
    a.href = `' + window.location.origin + '/api/export/lista-precios/${listaId}`;
    a.download = `lista_${listaId}.xlsx`;
    a.click();
}


