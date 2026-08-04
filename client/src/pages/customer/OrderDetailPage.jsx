import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { orderApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels } from '../../utils/order';

export default function OrderDetailPage() {
  const { orderCode } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paymentStatus = searchParams.get('payment');
  const paymentCode = searchParams.get('code');

  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  useEffect(() => {
    orderApi.getMine(orderCode).then((response) => setOrder(response.data.data)).catch((requestError) => setError(getApiError(requestError)));

    if (paymentStatus === 'success') {
      setCancelSuccess('Thanh toán trực tuyến qua VNPay thành công!');
    } else if (paymentStatus === 'fail') {
      setCancelError(`Thanh toán thất bại hoặc đã bị hủy. ${paymentCode ? `(Mã lỗi VNPay: ${paymentCode})` : ''}`);
    }
  }, [orderCode, paymentStatus, paymentCode]);

  const handleCancelRequest = () => {
    if (!window.confirm('Bạn có chắc chắn muốn gửi yêu cầu hủy đơn hàng này không?')) return;
    setCanceling(true);
    setCancelError('');
    setCancelSuccess('');
    orderApi.cancelRequest(order._id)
      .then((response) => {
        setOrder(response.data.data);
        setCancelSuccess('Gửi yêu cầu hủy đơn thành công.');
        setCanceling(false);
      })
      .catch((err) => {
        setCancelError(getApiError(err));
        setCanceling(false);
      });
  };

  const handleRetryVnpayPayment = () => {
    setRetryingPayment(true);
    setCancelError('');
    orderApi.retryVnpayOrder(order.orderCode)
      .then((response) => {
        const { paymentUrl } = response.data.data;
        if (!paymentUrl) throw new Error('Không nhận được liên kết thanh toán VNPay.');
        window.location.assign(paymentUrl);
      })
      .catch((requestError) => {
        setCancelError(getApiError(requestError));
        setRetryingPayment(false);
      });
  };

  if (!order && !error) return <LoadingScreen />;
  if (!order) return <section><FlashMessage type="error">{error}</FlashMessage><Link className="button" to="/orders">Về danh sách đơn</Link></section>;
  return (
    <section className="order-detail"><Link className="back-link" to="/orders">← Đơn hàng của tôi</Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CHI TIẾT ĐƠN</p>
          <h1>{order.orderCode}</h1>
          <p>{formatDate(order.createdAt)}</p>
        </div>
        <span className="status status--active">{orderStatusLabels[order.status]}</span>
      </div>

      {cancelError && <FlashMessage type="error">{cancelError}</FlashMessage>}
      {cancelSuccess && <FlashMessage type="success">{cancelSuccess}</FlashMessage>}

      <div className="order-detail__grid">
        <section className="panel">
          <h2>Sản phẩm</h2>
          {order.items.map((item) => (
            <article className="order-line" key={`${item.productId}-${item.variantId}`}>
              <div className="order-line__image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>PHONE</span>}</div>
              <div>
                <h3>{item.productName}</h3>
                <p>{item.ram} · {item.storage} · {item.color}</p>
                <small>{item.sku}</small>
              </div>
              <div>
                <p>{currency.format(item.unitPrice)} × {item.quantity}</p>
                <strong>{currency.format(item.lineTotal)}</strong>
              </div>
            </article>
          ))}
        </section>
        <aside className="order-summary">
          <h2>Thanh toán</h2>
          <div><span>Tạm tính</span><strong>{currency.format(order.pricing.subtotal)}</strong></div>
          {order.pricing.discount > 0 && (
            <div style={{ color: '#c5221f' }}>
              <span>Giảm giá ({order.voucher?.code})</span>
              <strong>−{currency.format(order.pricing.discount)}</strong>
            </div>
          )}
          <div><span>Phí vận chuyển</span><strong>{order.pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(order.pricing.shippingFee)}</strong></div>
          <div className="summary-total"><span>Tổng thanh toán</span><strong>{currency.format(order.pricing.total)}</strong></div>
          <hr />
          <p>
            <strong>{order.payment.method === 'VNPAY' ? 'VNPay' : 'COD'}</strong>
            {' · '}
            {order.payment.status === 'PAID'
              ? 'Đã thanh toán'
              : order.payment.status === 'FAILED'
                ? 'Thanh toán thất bại'
                : order.payment.method === 'COD'
                  ? 'Thanh toán khi nhận hàng'
                  : 'Đang chờ thanh toán'}
          </p>

          {order.payment.method === 'VNPAY' && ['UNPAID', 'PENDING'].includes(order.payment.status) && order.status === 'PENDING' && (
            <button className="button button--large" onClick={handleRetryVnpayPayment} disabled={retryingPayment} style={{ width: '100%', marginTop: '1rem' }}>
              {retryingPayment ? 'Đang mở VNPay...' : 'Tiếp tục thanh toán qua VNPay'}
            </button>
          )}

          {['PENDING', 'CONFIRMED'].includes(order.status) && (
            <div style={{ marginTop: '1.5rem' }}>
              <button 
                className="button button--danger" 
                onClick={handleCancelRequest} 
                disabled={canceling}
                style={{ width: '100%' }}
              >
                {canceling ? 'Đang gửi yêu cầu...' : 'Yêu cầu hủy đơn'}
              </button>
            </div>
          )}
        </aside>
      </div>
      <div className="order-detail__grid">
        <section className="panel">
          <h2>Địa chỉ nhận hàng</h2>
          <p><strong>{order.shippingAddress.recipientName}</strong> · {order.shippingAddress.phone}</p>
          <p>{order.shippingAddress.detail}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}</p>
          {order.note && <p><strong>Ghi chú:</strong> {order.note}</p>}
        </section>
        <section className="panel">
          <h2>Trạng thái đơn hàng</h2>
          <ol className="order-timeline">
            {order.statusHistory.map((entry, index) => (
              <li key={`${entry.status}-${index}`}>
                <strong>{orderStatusLabels[entry.status] || entry.status}</strong>
                <span>{formatDate(entry.changedAt)}</span>
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
