import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const getInbounds = () => api.get('/inbounds');
export const createInbound = (data: any) => api.post('/inbounds', data);
export const deleteInbound = (id: number) => api.delete(`/inbounds/${id}`);

export const getClients = () => api.get('/clients');
export const createClient = (data: any) => api.post('/clients', data);
export const deleteClient = (id: string) => api.delete(`/clients/${id}`);

export default api;
