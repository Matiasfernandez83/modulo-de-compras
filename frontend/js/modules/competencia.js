// Módulo de Competencia
import { CompetenciaAPI, ProveedoresAPI, API } from '../api.js';

let competencias = [];
let currentCompetenciaId = null;
let matrizData = null;

export async function initCompetencia() {
    renderCompetenciaView();
    await loadCompetencias();
}

function renderCompetenciaView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Competencias de Precios</h2>
                <button class="btn btn-primary" onclick="window.competenciaModule.showCreateModal()">
                    + Nueva Competencia
                </button>
            </div>
            <div class="card-body">
                <div id="competencias-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal para crear competencia -->
        <div id="competencia-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Nueva Competencia</h3>
                    <button class="modal-close" onclick="window.competenciaModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="competencia-form">
                        <div class="form-group">
                            <label for="nombre">Nombre *</label>
                            <input type="text" id="nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="origen">Origen</label>
                            <select id="origen" name="origen">
                                <option value="">Seleccione...</option>
                                <option value="planificacion">Planificación</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="fecha_inicio_periodo">Fecha Inicio Período</label>
                            <input type="date" id="fecha_inicio_periodo" name="fecha_inicio_periodo">
                        </div>
                        <div class="form-group">
                            <label for="fecha_fin_periodo">Fecha Fin Período</label>
                            <input type="date" id="fecha_fin_periodo" name="fecha_fin_periodo">
                        </div>
                        <div class="form-group">
                            <label for="proveedores">Proveedores *</label>
                            <div id="proveedores-checkboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
                                <p class="text-muted">Cargando proveedores...</p>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.competenciaModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.competenciaModule.saveCompetencia()">Crear</button>
                </div>
            </div>
        </div>

        <!-- Modal para vista detallada con tabs -->
        <div id="competencia-detail-modal" class="modal-overlay" style="display: none;">
            <div class="modal" style="max-width: 95%; width: 1200px;">
                <div class="modal-header">
                    <h3 class="modal-title" id="detail-modal-title">Competencia</h3>
                    <button class="modal-close" onclick="window.competenciaModule.closeDetailModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Tabs de navegación -->
                    <div class="tabs-container">
                        <div class="tabs-nav" id="competencia-tabs">
                            <button class="tab-btn active" data-tab="resumen">Resumen</button>
                            <button class="tab-btn" data-tab="proveedores">Proveedores</button>
                            <button class="tab-btn" data-tab="articulos">Artículos</button>
                            <button class="tab-btn" data-tab="comparacion">Comparación</button>
                            <button class="tab-btn" data-tab="condiciones">Condiciones</button>
                            <button class="tab-btn" data-tab="categorias">Por Categoría</button>
                            <button class="tab-btn" data-tab="mejores">Mejores Precios</button>
                            <button class="tab-btn" data-tab="totales">Totales</button>
                            <button class="tab-btn" data-tab="observaciones">Observaciones</button>
                            <button class="tab-btn" data-tab="historial">Historial</button>
                            <button class="tab-btn" data-tab="documentos">Documentos</button>
                            <button class="tab-btn" data-tab="acciones">Acciones</button>
                        </div>
                        <div class="tabs-content" id="competencia-tabs-content">
                            <!-- El contenido se cargará dinámicamente -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    setupTabNavigation();
}

function setupTabNavigation() {
    // Se configurará cuando se abra el modal de detalle
}

async function loadCompetencias() {
    try {
        competencias = await CompetenciaAPI.getAll();
        renderCompetenciasTable();
    } catch (error) {
        console.error('Error loading competencias:', error);
        document.getElementById('competencias-table-container').innerHTML = 
            '<p class="error-message">Error al cargar competencias</p>';
    }
}

function renderCompetenciasTable() {
    const container = document.getElementById('competencias-table-container');
    
    if (competencias.length === 0) {
        container.innerHTML = '<p class="text-center">No hay competencias registradas</p>';
        return;
    }
    
    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Origen</th>
                    <th>Período</th>
                    <th>Estado</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${competencias.map(c => `
                    <tr>
                        <td>${c.nombre}</td>
                        <td>${c.origen || '-'}</td>
                        <td>${formatPeriodo(c.fecha_inicio_periodo, c.fecha_fin_periodo)}</td>
                        <td><span class="badge badge-${getEstadoClass(c.estado)}">${c.estado || 'borrador'}</span></td>
                        <td>${formatDate(c.fecha_creacion)}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.competenciaModule.viewCompetencia(${c.id})">Ver Detalle</button>
                            <button class="btn btn-sm btn-primary" onclick="window.competenciaModule.exportCompetencia(${c.id})">Exportar</button>
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
        const container = document.getElementById('proveedores-checkboxes');
        
        if (proveedores.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay proveedores disponibles</p>';
        } else {
            container.innerHTML = proveedores.map(p => `
                <div style="margin-bottom: 8px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" name="proveedores" value="${p.id}" style="margin-right: 8px;">
                        ${p.nombre}
                    </label>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading proveedores:', error);
    }
    
    document.getElementById('competencia-form').reset();
    document.getElementById('competencia-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('competencia-modal').style.display = 'none';
}

async function saveCompetencia() {
    const form = document.getElementById('competencia-form');
    const formData = new FormData(form);
    
    const nombre = formData.get('nombre');
    if (!nombre) {
        alert('El nombre es requerido');
        return;
    }
    
    // Obtener proveedores seleccionados
    const proveedoresCheckboxes = document.querySelectorAll('input[name="proveedores"]:checked');
    const proveedores = Array.from(proveedoresCheckboxes).map(cb => parseInt(cb.value));
    
    if (proveedores.length === 0) {
        alert('Debe seleccionar al menos un proveedor');
        return;
    }
    
    const data = {
        nombre: nombre,
        origen: formData.get('origen') || null,
        fecha_inicio_periodo: formData.get('fecha_inicio_periodo') || null,
        fecha_fin_periodo: formData.get('fecha_fin_periodo') || null,
        proveedores: proveedores
    };
    
    try {
        await CompetenciaAPI.create(data);
        closeModal();
        await loadCompetencias();
        alert('Competencia creada exitosamente');
    } catch (error) {
        console.error('Error saving competencia:', error);
        alert('Error al guardar competencia: ' + error.message);
    }
}

async function viewCompetencia(id) {
    currentCompetenciaId = id;

    let competencia;
    try {
        competencia = await CompetenciaAPI.getById(id);
    } catch (error) {
        alert('Error al cargar competencia');
        return;
    }

    // Hoja de trabajo a pantalla completa (reemplaza el contenido del módulo)
    const contentArea = document.getElementById('content-area');
    const tabs = ['resumen', 'proveedores', 'articulos', 'comparacion', 'condiciones',
                  'categorias', 'mejores', 'totales', 'observaciones', 'historial',
                  'documentos', 'acciones'];
    const labels = {
        resumen: 'Resumen', proveedores: 'Proveedores', articulos: 'Artículos',
        comparacion: 'Comparación', condiciones: 'Condiciones', categorias: 'Por Categoría',
        mejores: 'Mejores Precios', totales: 'Totales', observaciones: 'Observaciones',
        historial: 'Historial', documentos: 'Documentos', acciones: 'Acciones'
    };
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header" style="flex-wrap:wrap; gap:8px">
                <div style="display:flex; align-items:center; gap:12px">
                    <button class="btn btn-secondary" onclick="window.competenciaModule.volver()">← Volver</button>
                    <h2 class="card-title" style="margin:0">${competencia.nombre}</h2>
                    <span class="badge badge-${getEstadoClass(competencia.estado)}">${competencia.estado || 'borrador'}</span>
                </div>
            </div>
            <div class="tabs-container">
                <div class="tabs-nav" id="competencia-tabs" style="display:flex; flex-wrap:wrap; gap:4px; padding:8px 16px; border-bottom:1px solid #eee">
                    ${tabs.map((t, i) => `<button class="tab-btn${i === 3 ? ' active' : ''}" data-tab="${t}">${labels[t]}</button>`).join('')}
                </div>
                <div class="tabs-content" id="competencia-tabs-content" style="padding:16px"></div>
            </div>
        </div>`;

    const tabBtns = contentArea.querySelectorAll('#competencia-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTabContent(btn.dataset.tab, competencia);
        });
    });

    // Arranca en la matriz de Comparación (la hoja de trabajo principal)
    renderTabContent('comparacion', competencia);
}

function volver() {
    currentCompetenciaId = null;
    matrizData = null;
    renderCompetenciaView();
    loadCompetencias();
}

function closeDetailModal() {
    volver();
}

function renderTabContent(tab, competencia) {
    const container = document.getElementById('competencia-tabs-content');
    
    switch (tab) {
        case 'resumen':
            container.innerHTML = renderResumenTab(competencia);
            break;
        case 'proveedores':
            container.innerHTML = renderProveedoresTab(competencia);
            break;
        case 'articulos':
            container.innerHTML = renderArticulosTab(competencia);
            break;
        case 'comparacion':
            renderComparacionTab(competencia);
            break;
        case 'condiciones':
            container.innerHTML = renderCondicionesTab(competencia);
            break;
        case 'categorias':
            container.innerHTML = renderCategoriasTab(competencia);
            break;
        case 'mejores':
            container.innerHTML = renderMejoresTab(competencia);
            break;
        case 'totales':
            container.innerHTML = renderTotalesTab(competencia);
            break;
        case 'observaciones':
            container.innerHTML = renderObservacionesTab(competencia);
            break;
        case 'historial':
            container.innerHTML = renderHistorialTab(competencia);
            break;
        case 'documentos':
            container.innerHTML = renderDocumentosTab(competencia);
            break;
        case 'acciones':
            container.innerHTML = renderAccionesTab(competencia);
            break;
    }
}

function renderResumenTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Información General</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div>
                    <p><strong>Nombre:</strong> ${competencia.nombre}</p>
                    <p><strong>Origen:</strong> ${competencia.origen || '-'}</p>
                    <p><strong>Estado:</strong> <span class="badge badge-${getEstadoClass(competencia.estado)}">${competencia.estado || 'borrador'}</span></p>
                </div>
                <div>
                    <p><strong>Período:</strong> ${formatPeriodo(competencia.fecha_inicio_periodo, competencia.fecha_fin_periodo)}</p>
                    <p><strong>Fecha Creación:</strong> ${formatDate(competencia.fecha_creacion)}</p>
                    <p><strong>Proveedores:</strong> ${competencia.proveedores?.length || 0}</p>
                </div>
            </div>
        </div>
    `;
}

function renderProveedoresTab(competencia) {
    if (!competencia.proveedores || competencia.proveedores.length === 0) {
        return '<p class="text-muted">No hay proveedores en esta competencia</p>';
    }
    
    return `
        <div class="tab-content-section">
            <h4>Proveedores Participantes</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Forma de Pago</th>
                        <th>Plazo Pago</th>
                        <th>Tiempo Entrega</th>
                        <th>Seleccionado</th>
                    </tr>
                </thead>
                <tbody>
                    ${competencia.proveedores.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.forma_pago || '-'}</td>
                            <td>${p.plazo_pago ? p.plazo_pago + ' días' : '-'}</td>
                            <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
                            <td>${p.seleccionado ? '✓' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderArticulosTab(competencia) {
    if (!competencia.items_por_categoria) {
        return '<p class="text-muted">No hay artículos en esta competencia</p>';
    }
    
    const categorias = Object.keys(competencia.items_por_categoria);
    
    return `
        <div class="tab-content-section">
            <h4>Artículos por Categoría</h4>
            ${categorias.map(cat => `
                <div style="margin-bottom: 30px;">
                    <h5>${cat}</h5>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Artículo</th>
                                <th>Cantidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${competencia.items_por_categoria[cat].map(item => `
                                <tr>
                                    <td>${item.codigo_interno}</td>
                                    <td>${item.articulo_nombre}</td>
                                    <td>${item.cantidad_necesaria ?? '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>
    `;
}

async function renderComparacionTab(competencia) {
    const container = document.getElementById('competencia-tabs-content');
    container.innerHTML = '<div class="flex-center" style="padding:30px"><div class="spinner"></div></div>';

    let data;
    try {
        data = await CompetenciaAPI.getMatriz(competencia.id);
    } catch (e) {
        container.innerHTML = '<p class="error-message">Error al cargar la comparación</p>';
        return;
    }

    if (!data.proveedores.length) {
        container.innerHTML = `<div class="tab-content-section">
            <h4>Comparación de Precios</h4>
            <p class="text-muted">Esta comparativa no tiene proveedores vinculados. Se vinculan
            automáticamente los que tengan listas de precios con estos insumos.</p></div>`;
        return;
    }

    // Guardar la matriz en memoria para editar y persistir
    matrizData = data;

    if (!data.proveedores.length) {
        container.innerHTML = `<div class="tab-content-section">
            <h4>Comparación de Precios</h4>
            <p class="text-muted">Esta comparativa no tiene proveedores vinculados.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="tab-content-section">
            <h4>Comparación de Precios por Proveedor</h4>
            <p class="text-muted">
                <strong>Cantidad req.</strong> viene de la planificación (editable).
                En cada celda de proveedor cargá <strong>cuánto comprarle</strong> de ese insumo;
                el precio se autocompleta de su lista (editable). Celda verde ✓ = mejor precio.
            </p>
            ${data.sin_precios ? '<p class="text-muted" style="color:#F9A825">⚠️ Todavía no hay precios en las listas de estos proveedores; podés cargarlos a mano en la matriz.</p>' : ''}
            <div style="margin-bottom:10px">
                <button class="btn btn-primary btn-sm" onclick="window.competenciaModule.guardarMatriz()">💾 Guardar comparativa</button>
            </div>
            <div class="table-responsive" id="matriz-container">${renderMatrizTabla()}</div>
        </div>`;
    recomputeTotales();
}

function renderMatrizTabla() {
    const data = matrizData;

    const filas = data.items.map((it, i) => {
        const celdas = data.proveedores.map(p => {
            const c = it.celdas[p.proveedor_id] || (it.celdas[p.proveedor_id] = { precio: null, cantidad: 0 });
            const esMejor = p.proveedor_id === it.mejor_proveedor_id;
            return `<td style="${esMejor ? 'background:#e8f5e9' : ''}; padding:2px; white-space:nowrap">
                <input type="number" min="0" step="0.01" value="${c.cantidad || ''}" placeholder="cant."
                       style="width:68px; text-align:right" title="Cantidad a comprar a este proveedor"
                       oninput="window.competenciaModule.editCelda(${i},${p.proveedor_id},'cantidad',this.value)">
                <input type="number" min="0" step="0.01" value="${c.precio ?? ''}" placeholder="precio"
                       style="width:78px; text-align:right; ${esMejor ? 'color:#2e7d32;font-weight:bold' : ''}" title="Precio unitario"
                       oninput="window.competenciaModule.editCelda(${i},${p.proveedor_id},'precio',this.value)">
                ${esMejor ? '✓' : ''}
            </td>`;
        }).join('');
        return `<tr>
            <td>${it.codigo_interno}</td>
            <td style="min-width:180px">${it.nombre}</td>
            <td style="padding:2px">
                <input type="number" min="0" step="0.01" value="${it.cantidad_necesaria ?? ''}"
                       style="width:75px; text-align:right; font-weight:bold"
                       oninput="window.competenciaModule.editReq(${i},this.value)">
            </td>
            <td id="asig-${i}" style="text-align:right" title="Total asignado a proveedores"></td>
            ${celdas}
        </tr>`;
    }).join('');

    const filaTotales = data.proveedores.map(p =>
        `<td id="tot-${p.proveedor_id}" style="text-align:right; font-weight:bold"></td>`).join('');

    return `<table class="table">
        <thead><tr>
            <th>Código</th><th>Insumo</th><th>Cant. req.</th><th>Asignado</th>
            ${data.proveedores.map(p => `<th style="text-align:center">${p.nombre}</th>`).join('')}
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr style="border-top:2px solid #1F4E79">
            <td colspan="4" style="font-weight:bold">TOTAL POR PROVEEDOR</td>
            ${filaTotales}
        </tr></tfoot>
    </table>`;
}

// Recalcula "asignado" por fila y totales por proveedor SIN recrear los inputs
// (así no se pierde el foco mientras se tipea).
function recomputeTotales() {
    const data = matrizData;
    const money = v => '$' + Number(v).toLocaleString('es-AR', {minimumFractionDigits: 2});
    const totales = {};
    data.proveedores.forEach(p => { totales[p.proveedor_id] = 0; });

    data.items.forEach((it, i) => {
        let asignado = 0;
        data.proveedores.forEach(p => {
            const c = it.celdas[p.proveedor_id];
            if (c) {
                asignado += Number(c.cantidad) || 0;
                totales[p.proveedor_id] += (Number(c.precio) || 0) * (Number(c.cantidad) || 0);
            }
        });
        const cel = document.getElementById(`asig-${i}`);
        if (cel) {
            const completo = asignado >= (Number(it.cantidad_necesaria) || 0) && asignado > 0;
            cel.textContent = asignado.toLocaleString('es-AR');
            cel.style.color = completo ? '#2e7d32' : '#c62828';
        }
    });
    data.proveedores.forEach(p => {
        const cel = document.getElementById(`tot-${p.proveedor_id}`);
        if (cel) cel.textContent = money(totales[p.proveedor_id]);
    });
}

function editReq(i, val) {
    matrizData.items[i].cantidad_necesaria = val === '' ? null : Number(val);
    recomputeTotales();
}

function editCelda(i, provId, campo, val) {
    const cel = matrizData.items[i].celdas[provId] || (matrizData.items[i].celdas[provId] = { precio: null, cantidad: 0 });
    cel[campo] = val === '' ? (campo === 'cantidad' ? 0 : null) : Number(val);
    recomputeTotales();
}

async function guardarMatriz() {
    if (!matrizData) return;
    const items = matrizData.items.map(it => ({
        articulo_id: it.articulo_id,
        cantidad_necesaria: it.cantidad_necesaria,
    }));
    const ofertas = [];
    matrizData.items.forEach(it => {
        matrizData.proveedores.forEach(p => {
            const c = it.celdas[p.proveedor_id];
            if (c && (c.cantidad || c.precio != null)) {
                ofertas.push({
                    articulo_id: it.articulo_id,
                    proveedor_id: p.proveedor_id,
                    cantidad: c.cantidad || 0,
                    precio_unitario: c.precio,
                });
            }
        });
    });
    try {
        await CompetenciaAPI.saveMatriz(matrizData.competencia.id, { items, ofertas });
        alert('Comparativa guardada correctamente');
    } catch (e) {
        alert('Error al guardar: ' + e.message);
    }
}

function renderCondicionesTab(competencia) {
    if (!competencia.proveedores || competencia.proveedores.length === 0) {
        return '<p class="text-muted">No hay proveedores para mostrar condiciones</p>';
    }
    
    return `
        <div class="tab-content-section">
            <h4>Condiciones Comerciales por Proveedor</h4>
            <table class="table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Forma de Pago</th>
                        <th>Plazo de Pago</th>
                        <th>Tiempo de Entrega</th>
                    </tr>
                </thead>
                <tbody>
                    ${competencia.proveedores.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.forma_pago || '-'}</td>
                            <td>${p.plazo_pago ? p.plazo_pago + ' días' : '-'}</td>
                            <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCategoriasTab(competencia) {
    return renderArticulosTab(competencia);
}

function renderMejoresTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Ranking de Mejores Precios por Item</h4>
            <p class="text-muted">Esta funcionalidad requiere datos de precios detallados. Actualmente en desarrollo.</p>
        </div>
    `;
}

function renderTotalesTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Totales por Proveedor</h4>
            <p class="text-muted">Esta funcionalidad requiere datos de precios detallados. Actualmente en desarrollo.</p>
        </div>
    `;
}

function renderObservacionesTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Observaciones y Comentarios</h4>
            <textarea class="form-control" rows="6" placeholder="Agregar observaciones..."></textarea>
            <button class="btn btn-primary" style="margin-top: 10px;">Guardar Observaciones</button>
        </div>
    `;
}

function renderHistorialTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Historial de Cambios</h4>
            <p class="text-muted">No hay cambios registrados</p>
        </div>
    `;
}

function renderDocumentosTab(competencia) {
    return `
        <div class="tab-content-section">
            <h4>Documentos Adjuntos</h4>
            <input type="file" class="form-control" multiple>
            <button class="btn btn-primary" style="margin-top: 10px;">Subir Documentos</button>
            <hr>
            <p class="text-muted">No hay documentos adjuntos</p>
        </div>
    `;
}

function renderAccionesTab(competencia) {
    const isConfirmada = competencia.estado === 'confirmada';
    
    return `
        <div class="tab-content-section">
            <h4>Acciones Disponibles</h4>
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 400px;">
                ${!isConfirmada ? `
                    <button class="btn btn-success" onclick="window.competenciaModule.confirmarCompetencia(${competencia.id})">
                        ✓ Confirmar Competencia
                    </button>
                ` : '<p class="text-success">✓ Competencia confirmada</p>'}
                <button class="btn btn-primary" onclick="window.competenciaModule.exportCompetencia(${competencia.id})">
                    📥 Exportar a Excel
                </button>
                <button class="btn btn-secondary" onclick="window.competenciaModule.generarOrdenCompra(${competencia.id})">
                    📋 Generar Orden de Compra
                </button>
            </div>
        </div>
    `;
}

async function confirmarCompetencia(id) {
    if (!confirm('¿Está seguro de confirmar esta competencia?')) {
        return;
    }
    
    try {
        await CompetenciaAPI.confirmar(id);
        alert('Competencia confirmada exitosamente');
        closeDetailModal();
        await loadCompetencias();
    } catch (error) {
        console.error('Error confirming competencia:', error);
        alert('Error al confirmar competencia');
    }
}

async function exportCompetencia(id) {
    try {
        const url = `${API.baseURL}/export/competencia/${id}`;
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
        a.download = `competencia_${id}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        alert('Competencia exportada exitosamente');
    } catch (error) {
        console.error('Error exporting competencia:', error);
        alert('Error al exportar competencia');
    }
}

function generarOrdenCompra(id) {
    alert('Funcionalidad de generar orden de compra en desarrollo');
}

// Funciones auxiliares
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

function formatPeriodo(inicio, fin) {
    if (!inicio && !fin) return '-';
    if (!inicio) return `Hasta ${formatDate(fin)}`;
    if (!fin) return `Desde ${formatDate(inicio)}`;
    return `${formatDate(inicio)} - ${formatDate(fin)}`;
}

function getEstadoClass(estado) {
    const classes = {
        'borrador': 'secondary',
        'confirmada': 'success',
        'cancelada': 'danger'
    };
    return classes[estado] || 'secondary';
}

// Exportar funciones para uso global
window.competenciaModule = {
    showCreateModal,
    closeModal,
    saveCompetencia,
    viewCompetencia,
    closeDetailModal,
    confirmarCompetencia,
    exportCompetencia,
    generarOrdenCompra,
    editReq,
    editCelda,
    guardarMatriz,
    volver
};


