import api from './http';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  getMe: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/profile', payload),
  changePassword: (payload) => api.patch('/auth/change-password', payload),
};
