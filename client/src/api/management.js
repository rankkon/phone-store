import api from './http';

export const managementOrderApi = {
  list: (params) => api.get('/management/orders', { params }),
  get: (id) => api.get(`/management/orders/${id}`),
  exportCsv: (params) => api.get('/management/orders/export', { params, responseType: 'blob' }),
  updateStatus: (id, status, note) => api.patch(`/management/orders/${id}/status`, { status, note }),
  updatePaymentStatus: (id, paymentStatus) => api.patch(`/management/orders/${id}/payment-status`, { paymentStatus }),
  approveCancel: (id, note) => api.post(`/management/orders/${id}/cancel/approve`, { note }),
  rejectCancel: (id, note) => api.post(`/management/orders/${id}/cancel/reject`, { note }),
  createOffline: (payload) => api.post('/management/orders/offline', payload),
  lookupCustomer: (params) => api.get('/management/orders/customer-lookup', { params }),
};
