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
  available: () => api.get('/vouchers/available'),
};

export const reviewApi = {
  list: (params) => api.get('/reviews', { params }),
  mine: (productId) => api.get('/reviews/mine', { params: { productId } }),
  create: (payload) => api.post('/reviews', payload),
  update: (reviewId, payload) => api.patch(`/reviews/${reviewId}`, payload),
};

export const favoriteApi = {
  list: () => api.get('/favorites'),
  add: (productId) => api.post('/favorites', { productId }),
  remove: (productId) => api.delete(`/favorites/${productId}`),
};

export const orderApi = {
  create: (payload) => api.post('/orders', payload),
  listMine: (params) => api.get('/orders/my-orders', { params }),
  getMine: (orderCode) => api.get(`/orders/my-orders/${orderCode}`),
  cancelRequest: (id) => api.post(`/orders/${id}/cancel-request`),
  createVnpayOrder: (payload) => api.post('/payments/vnpay/create', payload),
  retryVnpayOrder: (orderCode) => api.post(`/payments/vnpay/orders/${orderCode}/retry`),
};

export const returnApi = {
  listMine: (params) => api.get('/returns/my-returns', { params }),
  getForOrder: (orderId) => api.get(`/returns/orders/${orderId}`),
  create: (orderId, payload) => api.post(`/returns/orders/${orderId}`, payload),
};

