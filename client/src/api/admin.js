import api from './http';

export const brandApi = {
  list: () => api.get('/admin/brands'),
  create: (payload) => api.post('/admin/brands', payload),
  update: (id, payload) => api.patch(`/admin/brands/${id}`, payload),
  setStatus: (id, isActive) => api.patch(`/admin/brands/${id}/status`, { isActive }),
};

export const productApi = {
  list: () => api.get('/admin/products'),
  get: (id) => api.get(`/admin/products/${id}`),
  create: (payload) => api.post('/admin/products', payload),
  update: (id, payload) => api.patch(`/admin/products/${id}`, payload),
  setStatus: (id, isActive) => api.patch(`/admin/products/${id}/status`, { isActive }),
  uploadImages: (id, files) => {
    const formData = new FormData();
    [...files].forEach((file) => formData.append('images', file));
    return api.post(`/admin/products/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteImage: (id, imageId) => api.delete(`/admin/products/${id}/images/${imageId}`),
};

export const inventoryApi = {
  history: (productId, variantId, params) => api.get(`/admin/products/${productId}/variants/${variantId}/stock-history`, { params }),
  adjust: (productId, variantId, payload) => api.patch(`/admin/products/${productId}/variants/${variantId}/stock`, payload),
};

export const userApi = {
  list: (params) => api.get('/admin/users', { params }),
  create: (payload) => api.post('/admin/users', payload),
  getLtv: (id) => api.get(`/admin/users/${id}/ltv`),
  exportCsv: (params) => api.get('/admin/users/export', { params, responseType: 'blob' }),
  updateStatus: (id, status, blockReason) => api.patch(`/admin/users/${id}/status`, { status, blockReason }),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  updateProfile: (id, payload) => api.patch(`/admin/users/${id}`, payload),
};

export const dashboardApi = {
  getOverview: () => api.get('/admin/dashboard/overview'),
  getRevenue: (params) => api.get('/admin/dashboard/revenue', { params }),
  getTopProducts: () => api.get('/admin/dashboard/top-products'),
  getLowStock: () => api.get('/admin/dashboard/low-stock'),
};

export const voucherAdminApi = {
  list: () => api.get('/admin/vouchers'),
  create: (payload) => api.post('/admin/vouchers', payload),
  update: (id, payload) => api.patch(`/admin/vouchers/${id}`, payload),
  setStatus: (id, isActive) => api.patch(`/admin/vouchers/${id}/status`, { isActive }),
  remove: (id) => api.delete(`/admin/vouchers/${id}`),
};

export const reviewAdminApi = {
  list: (params) => api.get('/admin/reviews', { params }),
  setVisibility: (id, isVisible, note) => api.patch(`/admin/reviews/${id}/visibility`, { isVisible, note }),
  reply: (id, content) => api.patch(`/admin/reviews/${id}/reply`, { content }),
};
