import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels } from '../../utils/order';

export default function OrderDetailPage() {
  const { orderCode } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    orderApi.getMine(orderCode).then((response) => setOrder(response.data.data)).catch((requestError) => setError(getApiError(requestError)));
  }, [orderCode]);

  if (!order && !error) return <LoadingScreen />;
  if (!order) return <section><FlashMessage type="error">{error}</FlashMessage><Link className="button" to="/orders">Về danh sách đơn</Link></section>;
  return (
    <section className="order-detail"><Link className="back-link" to="/orders">← Đơn hàng của tôi</Link><div className="page-heading"><div><p className="eyebrow">CHI TIẾT ĐƠN</p><h1>{order.orderCode}</h1><p>{formatDate(order.createdAt)}</p></div><span className="status status--active">{orderStatusLabels[order.status]}</span></div>
      <div className="order-detail__grid"><section className="panel"><h2>Sản phẩm</h2>{order.items.map((item) => <article className="order-line" key={`${item.productId}-${item.variantId}`}><div className="order-line__image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>PHONE</span>}</div><div><h3>{item.productName}</h3><p>{item.ram} · {item.storage} · {item.color}</p><small>{item.sku}</small></div><div><p>{currency.format(item.unitPrice)} × {item.quantity}</p><strong>{currency.format(item.lineTotal)}</strong></div></article>)}</section><aside className="order-summary"><h2>Thanh toán</h2><div><span>Tạm tính</span><strong>{currency.format(order.pricing.subtotal)}</strong></div><div><span>Giảm giá</span><strong>−{currency.format(order.pricing.discount)}</strong></div><div><span>Phí vận chuyển</span><strong>{order.pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(order.pricing.shippingFee)}</strong></div><div className="summary-total"><span>Tổng thanh toán</span><strong>{currency.format(order.pricing.total)}</strong></div><hr /><p><strong>COD</strong> · {order.payment.status === 'UNPAID' ? 'Thanh toán khi nhận hàng' : order.payment.status}</p></aside></div>
      <div className="order-detail__grid"><section className="panel"><h2>Địa chỉ nhận hàng</h2><p><strong>{order.shippingAddress.recipientName}</strong> · {order.shippingAddress.phone}</p><p>{order.shippingAddress.detail}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}</p>{order.note && <p><strong>Ghi chú:</strong> {order.note}</p>}</section><section className="panel"><h2>Trạng thái đơn hàng</h2><ol className="order-timeline">{order.statusHistory.map((entry, index) => <li key={`${entry.status}-${index}`}><strong>{orderStatusLabels[entry.status] || entry.status}</strong><span>{formatDate(entry.changedAt)}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol></section></div>
    </section>
  );
}
