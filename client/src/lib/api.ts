import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vgate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/setup')) {
        localStorage.removeItem('vgate_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getInbounds = () => api.get('/inbounds');
export const createInbound = (data: any) => api.post('/inbounds', data);
export const deleteInbound = (id: number) => api.delete(`/inbounds/${id}`);

export const getClients = () => api.get('/clients');
export const createClient = (data: any) => api.post('/clients', data);
export const deleteClient = (id: string) => api.delete(`/clients/${id}`);

export const getSettings = () => api.get('/settings');
export const updateSettings = (data: Record<string, string>) => api.post('/settings/bulk', data);
export const restartXray = () => api.post('/settings/restart');
export const getLogs = () => api.get('/settings/logs');

export const getSystemMetrics = () => api.get('/system/metrics');
export const setupSsl = (data: { domain: string, email: string }) => api.post('/system/setup-ssl', data);
export const getCertStatus = (domain: string) => api.get(`/system/cert-status/${domain}`);

// Auth
export const getAuthStatus = () => api.get('/auth/status');
export const setupAdmin = (data: any) => api.post('/auth/setup', data);
export const login = (data: any) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');

export default api;
