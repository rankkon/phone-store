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
