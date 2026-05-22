// Módulo de proveedores
import { ProveedoresAPI, API } from '../api.js';

let proveedores = [];
let editingId = null;

export async function initProveedores() {
    renderProveedoresView();
    await loadProveedores();
}

function renderProveedoresView() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Proveedores</h2>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <a href="${window.location.origin}/api/proveedores/template" 
                       class="btn btn-secondary" download title="Descargar planilla Excel para carga masiva">
                        📥 Descargar Template Excel
                    </a>
                    <button class="btn btn-secondary" onclick="window.proveedoresModule.showUploadModal()">
                        📤 Importar Excel
                    </button>
                    <button class="btn btn-secondary" onclick="window.proveedoresModule.exportar()">
                        📊 Exportar Excel
                    </button>
                    <button class="btn btn-primary" onclick="window.proveedoresModule.showCreateModal()">
                        + Nuevo Proveedor
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="proveedores-table-container">
                    <div class="flex-center" style="padding: 40px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal importar Excel -->
        <div id="prov-upload-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Importar Proveedores desde Excel</h3>
                    <button class="modal-close" onclick="window.proveedoresModule.closeUploadModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-area" id="prov-upload-area">
                        <div class="upload-icon">📁</div>
                        <p><strong>Arrastrá tu archivo Excel aquí</strong></p>
                        <p>o hacé click para seleccionar</p>
                        <input type="file" id="prov-file-input" accept=".xlsx,.xls" style="display: none;">
                        <button class="btn btn-secondary" onclick="document.getElementById('prov-file-input').click()">
                            Seleccionar Archivo
                        </button>
                    </div>
                    <div style="margin-top:12px; text-align:center">
                        <a href="${window.location.origin}/api/proveedores/template" download class="btn btn-secondary btn-sm">
                            📥 Descargar Template
                        </a>
                    </div>
                    <div id="prov-upload-result" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>

        <!-- Modal Ficha Proveedor (click en nombre) -->
        <div id="ficha-proveedor-modal" class="modal-overlay" style="display: none;">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h3 class="modal-title" id="ficha-proveedor-titulo">Ficha del Proveedor</h3>
                    <button class="modal-close" onclick="document.getElementById('ficha-proveedor-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body" id="ficha-proveedor-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('ficha-proveedor-modal').style.display='none'">Cerrar</button>
                </div>
            </div>
        </div>

        <!-- Modal crear/editar proveedor -->
        <div id="proveedor-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="proveedor-modal-titulo">Nuevo Proveedor</h3>
                    <button class="modal-close" onclick="window.proveedoresModule.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="proveedor-form">
                        <div class="form-group">
                            <label for="prov-nombre">Nombre *</label>
                            <input type="text" id="prov-nombre" name="nombre" required>
                        </div>
                        <div class="form-group">
                            <label for="prov-telefono">Teléfono</label>
                            <input type="text" id="prov-telefono" name="telefono">
                        </div>
                        <div class="form-group">
                            <label for="prov-direccion">Dirección</label>
                            <input type="text" id="prov-direccion" name="direccion">
                        </div>
                        <div class="form-group">
                            <label for="prov-email">Email</label>
                            <input type="email" id="prov-email" name="email">
                        </div>
                        <div class="form-group">
                            <label for="prov-forma_pago">Forma de Pago</label>
                            <select id="prov-forma_pago" name="forma_pago">
                                <option value="">Seleccione...</option>
                                <option value="Contado">Contado</option>
                                <option value="Cuenta Corriente">Cuenta Corriente</option>
                                <option value="30 días">30 días</option>
                                <option value="60 días">60 días</option>
                            </select>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                            <div class="form-group">
                                <label for="prov-plazo_pago">Plazo de Pago (días)</label>
                                <input type="number" id="prov-plazo_pago" name="plazo_pago">
                            </div>
                            <div class="form-group">
                                <label for="prov-tiempo_entrega">Tiempo de Entrega (días)</label>
                                <input type="number" id="prov-tiempo_entrega" name="tiempo_entrega">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="window.proveedoresModule.closeModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.proveedoresModule.saveProveedor()">Guardar</button>
                </div>
            </div>
        </div>

        <!-- Modal Enviar Email -->
        <div id="email-proveedor-modal" class="modal-overlay" style="display: none;">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Enviar Email al Proveedor</h3>
                    <button class="modal-close" onclick="document.getElementById('email-proveedor-modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Para:</label>
                        <p id="email-destinatario" style="font-weight:bold; color:var(--primary-color)"></p>
                    </div>
                    <div class="form-group">
                        <label for="email-asunto">Asunto</label>
                        <input type="text" id="email-asunto" value="Consulta comercial">
                    </div>
                    <div class="form-group">
                        <label for="email-cuerpo">Mensaje</label>
                        <textarea id="email-cuerpo" rows="5" placeholder="Escriba su mensaje aquí..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('email-proveedor-modal').style.display='none'">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.proveedoresModule.enviarEmail()">📧 Abrir cliente de correo</button>
                </div>
            </div>
        </div>
    `;

    setupDragAndDrop();
}

async function loadProveedores() {
    try {
        proveedores = await ProveedoresAPI.getAll();
        renderProveedoresTable();
    } catch (error) {
        console.error('Error loading proveedores:', error);
        showError('Error al cargar proveedores');
    }
}

function renderProveedoresTable() {
    const container = document.getElementById('proveedores-table-container');

    if (proveedores.length === 0) {
        container.innerHTML = '<p class="text-center">No hay proveedores registrados</p>';
        return;
    }

    const html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Forma de Pago</th>
                    <th>Tiempo Entrega</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${proveedores.map(p => `
                    <tr>
                        <td>
                            <span class="link-text" onclick="window.proveedoresModule.verFicha(${p.id})" 
                                  style="color:var(--primary-color);cursor:pointer;font-weight:500" 
                                  title="Click para ver ficha completa">${p.nombre}</span>
                        </td>
                        <td>${p.telefono || '-'}</td>
                        <td>
                            ${p.email 
                                ? `<span class="link-text" onclick="window.proveedoresModule.abrirEmail('${p.email}', '${p.nombre}')"
                                        style="color:var(--primary-color);cursor:pointer" 
                                        title="Click para enviar email">${p.email}</span>`
                                : '-'}
                        </td>
                        <td>${p.forma_pago || '-'}</td>
                        <td>${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-secondary" onclick="window.proveedoresModule.editProveedor(${p.id})">✏️ Editar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function verFicha(id) {
    const p = proveedores.find(x => x.id === id);
    if (!p) return;

    document.getElementById('ficha-proveedor-titulo').textContent = p.nombre;
    document.getElementById('ficha-proveedor-body').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px">
            <div>
                <p><strong>Nombre:</strong> ${p.nombre}</p>
                <p><strong>Teléfono:</strong> ${p.telefono || '-'}</p>
                <p><strong>Dirección:</strong> ${p.direccion || '-'}</p>
                <p><strong>Email:</strong> ${p.email 
                    ? `<a href="mailto:${p.email}" style="color:var(--primary-color)">${p.email}</a>` 
                    : '-'}</p>
            </div>
            <div>
                <p><strong>Forma de Pago:</strong> ${p.forma_pago || '-'}</p>
                <p><strong>Plazo de Pago:</strong> ${p.plazo_pago ? p.plazo_pago + ' días' : '-'}</p>
                <p><strong>Tiempo de Entrega:</strong> ${p.tiempo_entrega ? p.tiempo_entrega + ' días' : '-'}</p>
                <p><strong>Alta:</strong> ${p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString('es-AR') : '-'}</p>
            </div>
        </div>
        <div style="margin-top:16px; display:flex; gap:8px">
            <button class="btn btn-secondary" onclick="window.proveedoresModule.abrirEmail('${p.email || ''}', '${p.nombre}')">
                📧 Enviar Email
            </button>
            <button class="btn btn-primary" onclick="document.getElementById('ficha-proveedor-modal').style.display='none'; window.proveedoresModule.editProveedor(${p.id})">
                ✏️ Editar
            </button>
        </div>
    `;
    document.getElementById('ficha-proveedor-modal').style.display = 'flex';
}

function abrirEmail(email, nombre) {
    if (!email) {
        showError('Este proveedor no tiene email registrado');
        return;
    }
    document.getElementById('email-destinatario').textContent = `${nombre} <${email}>`;
    document.getElementById('email-asunto').value = `Consulta comercial - ${nombre}`;
    document.getElementById('email-cuerpo').value = '';
    document.getElementById('email-proveedor-modal').style.display = 'flex';
    window._emailActual = { email, nombre };
}

function enviarEmail() {
    const asunto = encodeURIComponent(document.getElementById('email-asunto').value);
    const cuerpo = encodeURIComponent(document.getElementById('email-cuerpo').value);
    const email = window._emailActual?.email;
    if (!email) return;
    window.open(`mailto:${email}?subject=${asunto}&body=${cuerpo}`, '_blank');
    document.getElementById('email-proveedor-modal').style.display = 'none';
}

function showCreateModal() {
    editingId = null;
    document.getElementById('proveedor-modal-titulo').textContent = 'Nuevo Proveedor';
    document.getElementById('proveedor-form').reset();
    document.getElementById('proveedor-modal').style.display = 'flex';
}

function editProveedor(id) {
    const p = proveedores.find(x => x.id === id);
    if (!p) return;

    editingId = id;
    document.getElementById('proveedor-modal-titulo').textContent = 'Editar Proveedor';

    document.getElementById('prov-nombre').value = p.nombre || '';
    document.getElementById('prov-telefono').value = p.telefono || '';
    document.getElementById('prov-direccion').value = p.direccion || '';
    document.getElementById('prov-email').value = p.email || '';
    document.getElementById('prov-forma_pago').value = p.forma_pago || '';
    document.getElementById('prov-plazo_pago').value = p.plazo_pago || '';
    document.getElementById('prov-tiempo_entrega').value = p.tiempo_entrega || '';

    document.getElementById('proveedor-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('proveedor-modal').style.display = 'none';
    editingId = null;
}

async function saveProveedor() {
    const data = {
        nombre: document.getElementById('prov-nombre').value,
        telefono: document.getElementById('prov-telefono').value,
        direccion: document.getElementById('prov-direccion').value,
        email: document.getElementById('prov-email').value,
        forma_pago: document.getElementById('prov-forma_pago').value,
        plazo_pago: document.getElementById('prov-plazo_pago').value,
        tiempo_entrega: document.getElementById('prov-tiempo_entrega').value,
    };

    try {
        if (editingId) {
            await ProveedoresAPI.update(editingId, data);
            showSuccess('Proveedor actualizado exitosamente');
        } else {
            await ProveedoresAPI.create(data);
            showSuccess('Proveedor creado exitosamente');
        }
        closeModal();
        await loadProveedores();
    } catch (error) {
        console.error('Error saving proveedor:', error);
        showError('Error al guardar proveedor');
    }
}

async function exportar() {
    try {
        const url = '' + window.location.origin + '/api/export/proveedores';
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proveedores.xlsx';
        a.click();
    } catch (e) {
        showError('Error al exportar');
    }
}

function showUploadModal() {
    document.getElementById('prov-upload-modal').style.display = 'flex';
    document.getElementById('prov-upload-result').innerHTML = '';
}

function closeUploadModal() {
    document.getElementById('prov-upload-modal').style.display = 'none';
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('prov-upload-area');
    const fileInput = document.getElementById('prov-file-input');
    if (!uploadArea || !fileInput) return;

    ['dragenter','dragover','dragleave','drop'].forEach(e =>
        uploadArea.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }));

    ['dragenter','dragover'].forEach(e => uploadArea.addEventListener(e, () => {
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.background = 'rgba(198,34,0,0.05)';
    }));

    ['dragleave','drop'].forEach(e => uploadArea.addEventListener(e, () => {
        uploadArea.style.borderColor = '#ddd';
        uploadArea.style.background = '#f9f9f9';
    }));

    uploadArea.addEventListener('drop', e => {
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', e => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
}

async function handleFile(file) {
    const resultDiv = document.getElementById('prov-upload-result');
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        resultDiv.innerHTML = '<div class="error-message">❌ Formato inválido. Usá .xlsx o .xls</div>';
        return;
    }
    resultDiv.innerHTML = '<p>📤 Subiendo archivo...</p>';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${window.location.origin}/api/upload/proveedores`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const data = await response.json();
        if (response.ok) {
            resultDiv.innerHTML = `<div class="success-message">
                ✅ Importación exitosa. Insertados: ${data.insertados || 0} de ${data.total || 0}
                ${data.errores?.length ? `<br><small>${data.errores.join(', ')}</small>` : ''}
            </div>`;
            setTimeout(() => loadProveedores(), 1000);
        } else {
            resultDiv.innerHTML = `<div class="error-message">❌ ${data.error || 'Error al procesar'}</div>`;
        }
    } catch (e) {
        resultDiv.innerHTML = `<div class="error-message">❌ Error de conexión: ${e.message}</div>`;
    }
}

function showError(message) {
    alert(message);
}

function showSuccess(message) {
    alert(message);
}

window.proveedoresModule = {
    showCreateModal,
    closeModal,
    saveProveedor,
    editProveedor,
    verFicha,
    abrirEmail,
    enviarEmail,
    exportar,
    showUploadModal,
    closeUploadModal,
};


