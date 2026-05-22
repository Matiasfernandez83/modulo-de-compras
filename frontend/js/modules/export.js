// Módulo de exportación
import { API } from '../api.js';

export async function exportToExcel(endpoint, filename) {
    try {
        showExportLoading();
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API.baseURL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al exportar');
        }
        
        // Obtener el blob del archivo
        const blob = await response.blob();
        
        // Crear URL temporal para descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        hideExportLoading();
        showExportSuccess('Archivo exportado exitosamente');
    } catch (error) {
        console.error('Error exporting:', error);
        hideExportLoading();
        showExportError('Error al exportar archivo');
    }
}

function showExportLoading() {
    // Crear overlay de carga si no existe
    let overlay = document.getElementById('export-loading');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'export-loading';
        overlay.className = 'export-loading-overlay';
        overlay.innerHTML = `
            <div class="export-loading-content">
                <div class="spinner"></div>
                <p>Generando archivo Excel...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

function hideExportLoading() {
    const overlay = document.getElementById('export-loading');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showExportSuccess(message) {
    showToast(message, 'success');
}

function showExportError(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    // Crear toast si no existe
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${getToastIcon(type)}</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
}

// Exportar funciones específicas para cada módulo
export const ExportAPI = {
    proveedores: () => exportToExcel('/export/proveedores', 'proveedores.xlsx'),
    articulos: () => exportToExcel('/export/articulos', 'articulos.xlsx'),
    usuarios: () => exportToExcel('/export/usuarios', 'usuarios.xlsx'),
    listaPrecios: (id) => exportToExcel(`/export/lista-precios/${id}`, `lista_precios_${id}.xlsx`),
    competencia: (id) => exportToExcel(`/export/competencia/${id}`, `competencia_${id}.xlsx`),
    ordenCompra: (id) => exportToExcel(`/export/orden-compra/${id}`, `orden_compra_${id}.xlsx`)
};

// Exponer globalmente
window.ExportAPI = ExportAPI;


