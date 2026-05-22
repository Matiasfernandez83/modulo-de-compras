// Aplicación principal
import { isAuthenticated, login, logout, getCurrentUser } from './auth.js';
import { initProveedores } from './modules/proveedores.js';
import { initArticulos } from './modules/articulos.js';
import { initDashboard } from './modules/dashboard.js';
import { initListasPrecios } from './modules/listas_precios.js';
import { initPlanificacion } from './modules/planificacion.js';
import { initCompetencia } from './modules/competencia.js';
import { initOrdenesCompra } from './modules/ordenes_compra.js';
import { initUsuarios } from './modules/usuarios.js';
import { initNotifications } from './modules/notifications.js';

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        showMainApp();
    } else {
        showLoginScreen();
    }
});

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    
    // Manejar login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            showLoading();
            const user = await login(username, password);
            hideLoading();
            showMainApp();
        } catch (error) {
            hideLoading();
            errorDiv.textContent = error.message || 'Error al iniciar sesión';
            errorDiv.style.display = 'block';
        }
    });
}

function showMainApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    // Cargar datos de usuario
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.nombre_completo || user.username;
        document.getElementById('user-role').textContent = user.rol;
    }
    
    // Inicializar sistema de notificaciones
    initNotifications();
    
    // Configurar logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Configurar navegación
    setupNavigation();
    
    // Cargar dashboard por defecto
    loadModule('dashboard');
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remover clase active de todos
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Agregar clase active al clickeado
            item.classList.add('active');
            
            // Cargar módulo correspondiente
            const module = item.dataset.module;
            loadModule(module);
        });
    });
}

async function loadModule(moduleName) {
    const contentArea = document.getElementById('content-area');
    const moduleTitle = document.getElementById('current-module-title');
    
    // Actualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'proveedores': 'Proveedores',
        'articulos': 'Artículos',
        'listas-precios': 'Listas de Precios',
        'planificacion': 'Planificación',
        'competencia': 'Competencia',
        'ordenes-compra': 'Órdenes de Compra',
        'usuarios': 'Usuarios'
    };
    
    moduleTitle.textContent = titles[moduleName] || moduleName;
    
    // Cargar módulo
    try {
        showLoading();
        
        switch (moduleName) {
            case 'dashboard':
                await initDashboard();
                break;
            case 'proveedores':
                await initProveedores();
                break;
            case 'articulos':
                await initArticulos();
                break;
            case 'listas-precios':
                await initListasPrecios();
                break;
            case 'planificacion':
                await initPlanificacion();
                break;
            case 'competencia':
                await initCompetencia();
                break;
            case 'ordenes-compra':
                await initOrdenesCompra();
                break;
            case 'usuarios':
                await initUsuarios();
                break;
            default:
                contentArea.innerHTML = '<div class="card"><div class="card-body"><p>Módulo no encontrado</p></div></div>';
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading module:', error);
        hideLoading();
        contentArea.innerHTML = '<div class="card"><div class="card-body"><p class="error-message">Error al cargar módulo</p></div></div>';
    }
}

function renderDashboard() {
    return `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Dashboard</h2>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div class="card">
                        <div class="card-body">
                            <h3>Proveedores</h3>
                            <p style="font-size: 32px; font-weight: bold; color: var(--primary-color);">-</p>
                            <p>Total activos</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <h3>Artículos</h3>
                            <p style="font-size: 32px; font-weight: bold; color: var(--secondary-color);">-</p>
                            <p>En catálogo</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <h3>Competencias Activas</h3>
                            <p style="font-size: 32px; font-weight: bold; color: var(--success-color);">-</p>
                            <p>En proceso</p>
                        </div>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <h3>Órdenes de Compra</h3>
                            <p style="font-size: 32px; font-weight: bold; color: var(--warning-color);">-</p>
                            <p>Este mes</p>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <h3>Bienvenido al Sistema de Gestión de Compras</h3>
                    <p>Seleccione un módulo del menú lateral para comenzar.</p>
                </div>
            </div>
        </div>
    `;
}

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

