import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('phone_store_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiError(error) {
  const details = error.response?.data?.details;
  return Array.isArray(details) ? details.join(' ') : error.response?.data?.message || 'Không thể kết nối đến máy chủ.';
}

export default api;
