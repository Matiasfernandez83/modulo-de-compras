// API Configuration - detecta automáticamente si está en localhost o en producción (Render)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`;

// Cliente API - usa cookies de sesión (sin tokens)
export const API = {
    baseURL: API_BASE_URL,

    // Headers base - NO incluye Authorization, el navegador envía la cookie automáticamente
    getHeaders() {
        return { 'Content-Type': 'application/json' };
    },

    // Método genérico para hacer requests
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders(),
            credentials: 'include'  // Envía la cookie de sesión automáticamente
        };

        try {
            const response = await fetch(url, config);

            // Sesión expirada o no iniciada → redirigir al login
            if (response.status === 401) {
                console.warn('[Auth] Sesión no activa. Redirigiendo al login...');
                localStorage.clear();
                window.location.reload();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Métodos HTTP
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Upload de archivos (también usa sesión por cookie)
    async upload(endpoint, formData) {
        const url = `${API_BASE_URL}${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.status === 401) {
                localStorage.clear();
                window.location.reload();
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al subir archivo');
            }

            return data;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    }
};

// API endpoints específicos
export const AuthAPI = {
    login: (username, password) => API.post('/auth/login', { username, password }),
    logout: (sesionId) => API.post('/auth/logout', { sesion_id: sesionId }),
    me: () => API.get('/auth/me')
};

export const ProveedoresAPI = {
    getAll: () => API.get('/proveedores'),
    getById: (id) => API.get(`/proveedores/${id}`),
    create: (data) => API.post('/proveedores', data),
    update: (id, data) => API.put(`/proveedores/${id}`, data),
    delete: (id) => API.delete(`/proveedores/${id}`)
};

export const ArticulosAPI = {
    getAll: (categoriaId = null) => {
        const query = categoriaId ? `?categoria_id=${categoriaId}` : '';
        return API.get(`/articulos${query}`);
    },
    getById: (id) => API.get(`/articulos/${id}`),
    create: (data) => API.post('/articulos', data),
    update: (id, data) => API.put(`/articulos/${id}`, data),
    getCategorias: () => API.get('/articulos/categorias'),
    createCategoria: (data) => API.post('/articulos/categorias', data),
    getSubcategorias: (categoriaId) => API.get(`/articulos/subcategorias?categoria_id=${categoriaId}`),
    createSubcategoria: (data) => API.post('/articulos/subcategorias', data),
    proximoCodigo: (categoriaId, subcategoriaId) =>
        API.get(`/articulos/proximo-codigo?categoria_id=${categoriaId}&subcategoria_id=${subcategoriaId}`)
};

export const ListasPreciosAPI = {
    getAll: (proveedorId = null) => {
        const query = proveedorId ? `?proveedor_id=${proveedorId}` : '';
        return API.get(`/listas-precios${query}`);
    },
    getById: (id) => API.get(`/listas-precios/${id}`),
    create: (data) => API.post('/listas-precios', data),
    addItems: (id, items) => API.post(`/listas-precios/${id}/items`, { items })
};

export const CompetenciaAPI = {
    getAll: () => API.get('/competencia'),
    getById: (id) => API.get(`/competencia/${id}`),
    create: (data) => API.post('/competencia', data),
    confirmar: (id) => API.put(`/competencia/${id}/confirmar`, {}),
    getMatriz: (id) => API.get(`/competencia/${id}/matriz`),
    saveMatriz: (id, data) => API.put(`/competencia/${id}/matriz`, data)
};

export const OrdenesCompraAPI = {
    getAll: () => API.get('/ordenes-compra'),
    getById: (id) => API.get(`/ordenes-compra/${id}`),
    create: (data) => API.post('/ordenes-compra', data)
};

export const ProductosAPI = {
    getAll: () => API.get('/productos'),
    getById: (id) => API.get(`/productos/${id}`),
    create: (data) => API.post('/productos', data),
    addMaterial: (id, data) => API.post(`/productos/${id}/materiales`, data),
    updateMaterial: (id, materialId, data) => API.put(`/productos/${id}/materiales/${materialId}`, data),
    deleteMaterial: (id, materialId) => API.delete(`/productos/${id}/materiales/${materialId}`)
};

export const UsuariosAPI = {
    getAll: () => API.get('/usuarios'),
    create: (data) => API.post('/usuarios', data),
    getSesiones: (id) => API.get(`/usuarios/${id}/sesiones`),
    getTiempoUso: (id) => API.get(`/usuarios/${id}/tiempo-uso`)
};

