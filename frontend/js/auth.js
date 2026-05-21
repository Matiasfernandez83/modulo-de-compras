// Gestión de autenticación - usa sesión de servidor (sin tokens)
import { AuthAPI } from './api.js';
import { startSessionTimer, stopSessionTimer } from './timer.js';

export function isAuthenticated() {
    // Con sesiones de servidor, verificamos si tenemos datos del usuario en memoria
    return !!localStorage.getItem('user_data');
}

export async function login(username, password) {
    try {
        const response = await AuthAPI.login(username, password);

        // Solo guardamos datos del usuario para mostrar en la UI
        // La sesión real la maneja el servidor mediante cookie
        localStorage.setItem('user_data', JSON.stringify(response.user));
        localStorage.setItem('sesion_id', response.sesion_id);

        // Iniciar temporizador de sesión
        startSessionTimer();

        return response.user;
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    try {
        const sesionId = localStorage.getItem('sesion_id');
        if (sesionId) {
            await AuthAPI.logout(sesionId);
        }
    } catch (error) {
        console.error('Error durante logout:', error);
    } finally {
        // Detener temporizador
        stopSessionTimer();

        // Limpiar datos locales (la cookie de sesión se destruye en el servidor)
        localStorage.removeItem('user_data');
        localStorage.removeItem('sesion_id');

        // Recargar página para mostrar login
        window.location.reload();
    }
}

export function getCurrentUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
}
