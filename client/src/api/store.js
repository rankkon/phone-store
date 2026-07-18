import api from './http';

export const catalogApi = {
  list: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  brands: () => api.get('/brands'),
};

export const cartApi = {
  get: () => api.get('/cart'),
  addItem: (payload) => api.post('/cart/items', payload),
  updateItem: (variantId, quantity) => api.patch(`/cart/items/${variantId}`, { quantity }),
  removeItem: (variantId) => api.delete(`/cart/items/${variantId}`),
  clear: () => api.delete('/cart'),
};

export const voucherApi = {
  validate: (code) => api.post('/vouchers/validate', { code }),
};

export const orderApi = {
  create: (payload) => api.post('/orders', payload),
  listMine: (params) => api.get('/orders/my-orders', { params }),
  getMine: (orderCode) => api.get(`/orders/my-orders/${orderCode}`),
};
