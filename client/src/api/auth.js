import api from './http';

export const authApi = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  verifyRegistration: (payload, verificationToken) => api.post('/auth/verify-registration', payload, { headers: { Authorization: `Bearer ${verificationToken}` } }),
  resendRegistrationVerificationCode: (verificationToken) => api.post('/auth/resend-registration-verification-code', null, { headers: { Authorization: `Bearer ${verificationToken}` } }),
  sendEmailVerificationCode: () => api.post('/auth/email-verification-code'),
  verifyEmail: (payload) => api.post('/auth/verify-email', payload),
  sendPasswordChangeCode: () => api.post('/auth/password-change-code'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (payload) => api.patch('/auth/profile', payload),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.put('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAvatar: () => api.delete('/auth/avatar'),
  changePassword: (payload) => api.patch('/auth/change-password', payload),
};
