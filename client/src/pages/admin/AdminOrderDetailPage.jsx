import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { managementOrderApi } from '../../api/management';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels } from '../../utils/order';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    managementOrderApi.get(id)
      .then((response) => setOrder(response.data.data))
      .catch((requestError) => setError(getApiError(requestError)));
  }, [id]);

  const handleUpdateStatus = (newStatus) => {
    setUpdating(true);
    setActionError('');
    setSuccessMessage('');
    managementOrderApi.updateStatus(id, newStatus, note)
      .then((response) => {
        setOrder(response.data.data);
        setSuccessMessage(`Đã cập nhật trạng thái đơn hàng thành: ${orderStatusLabels[newStatus]}`);
        setNote('');
        setUpdating(false);
      })
      .catch((requestError) => {
        setActionError(getApiError(requestError));
        setUpdating(false);
      });
  };

  const handleApproveCancel = () => {
    setUpdating(true);
    setActionError('');
    setSuccessMessage('');
    managementOrderApi.approveCancel(id, note)
      .then((response) => {
        setOrder(response.data.data);
        setSuccessMessage('Đã duyệt yêu cầu hủy đơn hàng. Tồn kho đã được khôi phục.');
        setNote('');
        setUpdating(false);
      })
      .catch((requestError) => {
        setActionError(getApiError(requestError));
        setUpdating(false);
      });
  };

  const handleRejectCancel = () => {
    setUpdating(true);
    setActionError('');
    setSuccessMessage('');
    managementOrderApi.rejectCancel(id, note)
      .then((response) => {
        setOrder(response.data.data);
        setSuccessMessage('Đã từ chối yêu cầu hủy đơn hàng.');
        setNote('');
        setUpdating(false);
      })
      .catch((requestError) => {
        setActionError(getApiError(requestError));
        setUpdating(false);
      });
  };

  if (!order && !error) return <LoadingScreen />;
  if (!order) return <section><FlashMessage type="error">{error}</FlashMessage><Link className="button" to="/admin/orders">Về danh sách đơn</Link></section>;

  const paymentStatusLabel = order.payment.status === 'PAID'
    ? 'Đã thanh toán'
    : order.payment.status === 'FAILED'
      ? 'Thanh toán thất bại'
      : order.payment.method === 'COD'
        ? 'Chưa thanh toán (thu COD)'
        : 'Đang chờ thanh toán';

  // Xác định các nút hành động khả thi dựa trên trạng thái hiện tại
  const renderActionButtons = () => {
    if (updating) return <span>Đang xử lý...</span>;

    const currentStatus = order.status;

    if (currentStatus === 'PENDING') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('CONFIRMED')}>Xác nhận đơn</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'CONFIRMED') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('PREPARING')}>Chuẩn bị hàng</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'PREPARING') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('SHIPPING')}>Bắt đầu giao hàng</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'SHIPPING') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('COMPLETED')}>Hoàn thành giao hàng (Đã thu tiền)</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Giao hàng thất bại (Hủy đơn)</button>
        </div>
      );
    }
    if (currentStatus === 'CANCEL_REQUESTED') {
      return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button button--danger" onClick={handleApproveCancel}>Đồng ý hủy đơn (Hoàn kho)</button>
          <button className="button button--secondary" onClick={handleRejectCancel}>Từ chối hủy đơn</button>
        </div>
      );
    }
    return <span style={{ color: '#666', fontStyle: 'italic' }}>Đơn hàng đã kết thúc (Hoàn thành hoặc Hủy).</span>;
  };

  return (
    <section className="order-detail" style={{ padding: '1.5rem' }}>
      <Link className="back-link" to="/admin/orders" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
        ← Danh sách đơn hàng quản lý
      </Link>
      
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow">CHI TIẾT ĐƠN HÀNG QUẢN TRỊ</p>
          <h1>{order.orderCode}</h1>
          <p style={{ color: '#666' }}>{formatDate(order.createdAt)}</p>
        </div>
        <span className={`status status--${order.status.toLowerCase()}`} style={{
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          fontWeight: 'bold',
          background: order.status === 'COMPLETED' ? '#e6f4ea' : order.status === 'CANCELLED' ? '#fce8e6' : '#fef7e0',
          color: order.status === 'COMPLETED' ? '#137333' : order.status === 'CANCELLED' ? '#c5221f' : '#b06000'
        }}>
          {orderStatusLabels[order.status]}
        </span>
      </div>

      {actionError && <FlashMessage type="error">{actionError}</FlashMessage>}
      {successMessage && <FlashMessage type="success">{successMessage}</FlashMessage>}

      <div className="order-detail__grid">
        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
          <h2>Sản phẩm ({order.items.length})</h2>
          {order.items.map((item) => (
            <article className="order-line" key={`${item.productId}-${item.variantId}`} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid #eee' }}>
              <div className="order-line__image" style={{ width: '60px', height: '60px', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : <span>PHONE</span>}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{item.productName}</h3>
                <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>{item.ram} · {item.storage} · {item.color}</p>
                <small style={{ color: '#999' }}>SKU: {item.sku}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0 }}>{currency.format(item.unitPrice)} × {item.quantity}</p>
                <strong>{currency.format(item.lineTotal)}</strong>
              </div>
            </article>
          ))}
        </section>

        <aside className="order-summary" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
          <h2>Tóm tắt thanh toán</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Tạm tính</span>
            <strong>{currency.format(order.pricing.subtotal)}</strong>
          </div>
          {order.pricing.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', color: '#c5221f' }}>
              <span>Giảm giá ({order.voucher?.code})</span>
              <strong>−{currency.format(order.pricing.discount)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0' }}>
            <span>Phí vận chuyển</span>
            <strong>{order.pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(order.pricing.shippingFee)}</strong>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '1rem 0' }} />
          <div className="summary-total" style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', fontSize: '1.2rem' }}>
            <span>Tổng cộng</span>
            <strong style={{ color: '#1a73e8' }}>{currency.format(order.pricing.total)}</strong>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '1rem 0' }} />
          <p style={{ margin: 0 }}>
            <strong>Phương thức:</strong> {order.payment.method} <br />
            <strong>Thanh toán:</strong> <span style={{ fontWeight: 'bold', color: order.payment.status === 'PAID' ? '#137333' : order.payment.status === 'FAILED' ? '#c5221f' : '#b06000' }}>
              {paymentStatusLabel}
            </span>
            {order.payment.paidAt && <span> ({formatDate(order.payment.paidAt)})</span>}
          </p>
        </aside>
      </div>

      <div className="order-detail__grid" style={{ marginTop: '1.5rem' }}>
        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
          <h2>Thông tin giao hàng & Khách hàng</h2>
          <p style={{ margin: '0.5rem 0' }}><strong>Tên người nhận:</strong> {order.shippingAddress.recipientName}</p>
          <p style={{ margin: '0.5rem 0' }}><strong>Số điện thoại:</strong> {order.shippingAddress.phone}</p>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Địa chỉ:</strong> {order.shippingAddress.detail}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
          </p>
          {order.note && <p style={{ margin: '0.5rem 0', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}><strong>Ghi chú:</strong> {order.note}</p>}
          <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '1rem 0' }} />
          <p style={{ margin: '0.5rem 0' }}><strong>Tài khoản đặt hàng:</strong> {order.userId?.fullName} ({order.userId?.email})</p>
        </section>

        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
          <h2>Cập nhật trạng thái đơn hàng</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="action-note" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>Ghi chú duyệt đơn / cập nhật:</label>
            <textarea
              id="action-note"
              rows="3"
              placeholder="Nhập lý do hủy, ghi chú giao hàng hoặc phản hồi..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          {renderActionButtons()}
        </section>
      </div>

      <div className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee', marginTop: '1.5rem' }}>
        <h2>Lịch sử trạng thái đơn hàng</h2>
        <ol className="order-timeline" style={{ paddingLeft: '1.25rem', margin: 0 }}>
          {order.statusHistory.map((entry, index) => (
            <li key={`${entry.status}-${index}`} style={{ marginBottom: '1rem' }}>
              <strong>{orderStatusLabels[entry.status] || entry.status}</strong>
              <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '0.5rem' }}>({formatDate(entry.changedAt)})</span>
              {entry.note && <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>{entry.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
