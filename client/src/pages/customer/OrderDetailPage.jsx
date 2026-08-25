import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { orderApi, returnApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels, returnStatusLabels } from '../../utils/order';
import { useFeedback } from '../../context/FeedbackContext';

export default function OrderDetailPage() {
  const { orderCode } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const paymentStatus = searchParams.get('payment');
  const paymentCode = searchParams.get('code');

  const [order, setOrder] = useState(null);
  const [returnRequest, setReturnRequest] = useState(null);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const { confirm, notify } = useFeedback();

  useEffect(() => {
    let cancelled = false;
    setOrder(null);
    setReturnRequest(null);
    setError('');
    async function loadOrder() {
      try {
        const response = await orderApi.getMine(orderCode);
        if (cancelled) return;
        const currentOrder = response.data.data;
        setOrder(currentOrder);
        try {
          const returnResponse = await returnApi.getForOrder(currentOrder._id);
          if (!cancelled) setReturnRequest(returnResponse.data.data);
        } catch (requestError) {
          if (!cancelled && requestError.response?.status !== 404) setError(getApiError(requestError));
        }
      } catch (requestError) {
        if (!cancelled) setError(getApiError(requestError));
      }
    }
    loadOrder();

    if (paymentStatus === 'success') {
      setCancelSuccess('Thanh toán trực tuyến qua VNPay thành công!');
    } else if (paymentStatus === 'fail') {
      setCancelError(`Thanh toán thất bại hoặc đã bị hủy. ${paymentCode ? `(Mã lỗi VNPay: ${paymentCode})` : ''}`);
    }
    return () => { cancelled = true; };
  }, [orderCode, paymentStatus, paymentCode]);

  const handleCancelRequest = async () => {
    const confirmed = await confirm({ title: 'Gửi yêu cầu hủy đơn?', message: 'Cửa hàng sẽ xem xét yêu cầu trước khi hủy đơn hàng.', confirmLabel: 'Gửi yêu cầu', tone: 'danger' });
    if (!confirmed) return;
    setCanceling(true);
    setCancelError('');
    setCancelSuccess('');
    orderApi.cancelRequest(order._id)
      .then((response) => {
        setOrder(response.data.data);
        setCancelSuccess('Gửi yêu cầu hủy đơn thành công.');
        notify('Đã gửi yêu cầu hủy đơn.');
        setCanceling(false);
      })
      .catch((err) => {
        setCancelError(getApiError(err));
        notify(getApiError(err), { type: 'error' });
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

  const handleReturnRequest = (event) => {
    event.preventDefault();
    if (returnReason.trim().length < 5) {
      setCancelError('Vui lòng nêu lý do hoàn trả từ 5 ký tự trở lên.');
      return;
    }
    setReturnSubmitting(true);
    setCancelError('');
    setCancelSuccess('');
    returnApi.create(order._id, { reason: returnReason })
      .then((response) => {
        setReturnRequest(response.data.data);
        setReturnReason('');
        setShowReturnForm(false);
        setCancelSuccess(response.data.message);
        notify(response.data.message);
      })
      .catch((requestError) => { const message = getApiError(requestError); setCancelError(message); notify(message, { type: 'error' }); })
      .finally(() => setReturnSubmitting(false));
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

          {order.status === 'COMPLETED' && !returnRequest && (
            <div style={{ marginTop: '1.5rem' }}>
              <button className="button button--secondary" onClick={() => { setShowReturnForm(true); setCancelError(''); }} style={{ width: '100%' }}>
                Yêu cầu hoàn trả
              </button>
            </div>
          )}
          {returnRequest && <div className="return-summary"><span className={`return-status return-status--${returnRequest.status.toLowerCase()}`}>{returnStatusLabels[returnRequest.status]}</span><p>Yêu cầu hoàn trả đã được gửi.</p><Link to="/returns">Xem lịch sử xử lý →</Link></div>}
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
      {returnRequest && <section className="panel return-detail-panel"><div className="profile-editor__heading"><div><p className="eyebrow">HOÀN TRẢ</p><h2>Tiến trình yêu cầu</h2></div><span className={`return-status return-status--${returnRequest.status.toLowerCase()}`}>{returnStatusLabels[returnRequest.status]}</span></div><p><strong>Lý do:</strong> {returnRequest.reason}</p><ol className="return-history">{returnRequest.statusHistory.map((entry, index) => <li key={`${entry.status}-${entry.changedAt}-${index}`}><strong>{returnStatusLabels[entry.status] || entry.status}</strong><span>{formatDate(entry.changedAt)}{entry.changedBy?.fullName ? ` · ${entry.changedBy.fullName}` : ''}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol></section>}
      {showReturnForm && <div className="modal" role="presentation"><form className="modal-content form-stack" onSubmit={handleReturnRequest}><div className="profile-editor__heading"><div><p className="eyebrow">HOÀN TRẢ</p><h2>Gửi yêu cầu hoàn trả</h2></div><button type="button" className="text-button" onClick={() => setShowReturnForm(false)} disabled={returnSubmitting}>Đóng</button></div><p className="form-hint">Hãy mô tả rõ lý do. Cửa hàng sẽ xem xét và cập nhật kết quả tại trang này.</p><label>Lý do hoàn trả<textarea rows="5" minLength="5" maxLength="1000" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} required /></label><div className="button-row"><button className="button button--secondary" disabled={returnSubmitting}>{returnSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button><button type="button" className="button button--ghost" onClick={() => setShowReturnForm(false)} disabled={returnSubmitting}>Hủy</button></div></form></div>}
    </section>
  );
}
