import api from './http';

export const managementOrderApi = {
  list: (params) => api.get('/management/orders', { params }),
  get: (id) => api.get(`/management/orders/${id}`),
  updateStatus: (id, status, note) => api.patch(`/management/orders/${id}/status`, { status, note }),
  approveCancel: (id, note) => api.post(`/management/orders/${id}/cancel/approve`, { note }),
  rejectCancel: (id, note) => api.post(`/management/orders/${id}/cancel/reject`, { note }),
};
