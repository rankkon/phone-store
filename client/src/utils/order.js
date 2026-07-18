export const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export const orderStatusLabels = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị hàng',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Đã hoàn thành',
  CANCEL_REQUESTED: 'Đang yêu cầu hủy',
  CANCELLED: 'Đã hủy',
};

export function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
