import api from './http';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  sendEmailVerificationCode: () => api.post('/auth/email-verification-code'),
  verifyEmail: (payload) => api.post('/auth/verify-email', payload),
  sendPasswordChangeCode: () => api.post('/auth/password-change-code'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/profile', payload),
  changePassword: (payload) => api.patch('/auth/change-password', payload),
};
