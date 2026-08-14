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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    managementOrderApi.get(id)
      .then((response) => setOrder(response.data.data))
      .catch((requestError) => setError(getApiError(requestError)));
  }, [id]);

  const handleUpdateStatus = (newStatus) => {
    if (!newStatus || newStatus === order.status) return;

    const isReopeningFinishedOrder = ['COMPLETED', 'CANCELLED'].includes(order.status);
    if (isReopeningFinishedOrder && !window.confirm(
      `Đơn đang ở trạng thái "${orderStatusLabels[order.status]}". Bạn có chắc muốn đổi lại thành "${orderStatusLabels[newStatus]}"?`,
    )) return;

    setUpdating(true);
    setActionError('');
    setSuccessMessage('');
    managementOrderApi.updateStatus(id, newStatus, note)
      .then((response) => {
        setOrder(response.data.data);
        setSuccessMessage(`Đã cập nhật trạng thái đơn hàng thành: ${orderStatusLabels[newStatus]}`);
        setNote('');
        setSelectedStatus('');
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

  const isStorePickupAddress = order.shippingAddress.detail === 'Mua trực tiếp tại cửa hàng'
    && ['province', 'district', 'ward'].every((field) => order.shippingAddress[field] === 'Tại quầy');
  const isWalkInGuest = isStorePickupAddress
    && (order.shippingAddress.recipientName === 'Khách vãng lai'
      || order.userId?.email === 'walkin@phonestore.com'
      || order.shippingAddress.phone === '0000000000');

  // Xác định các nút hành động khả thi dựa trên trạng thái hiện tại
  const renderActionButtons = () => {
    const currentStatus = order.status;
    let quickActions = null;

    if (currentStatus === 'PENDING') {
      quickActions = (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('CONFIRMED')}>Xác nhận đơn</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'CONFIRMED') {
      quickActions = (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('PREPARING')}>Chuẩn bị hàng</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'PREPARING') {
      quickActions = (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('SHIPPING')}>Bắt đầu giao hàng</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Hủy đơn hàng</button>
        </div>
      );
    }
    if (currentStatus === 'SHIPPING') {
      quickActions = (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button" onClick={() => handleUpdateStatus('COMPLETED')}>Hoàn thành giao hàng (Đã thu tiền)</button>
          <button className="button button--danger" onClick={() => handleUpdateStatus('CANCELLED')}>Giao hàng thất bại (Hủy đơn)</button>
        </div>
      );
    }
    if (currentStatus === 'CANCEL_REQUESTED') {
      quickActions = (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="button button--danger" onClick={handleApproveCancel}>Đồng ý hủy đơn (Hoàn kho)</button>
          <button className="button button--secondary" onClick={handleRejectCancel}>Từ chối hủy đơn</button>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {updating ? <span>Đang xử lý...</span> : quickActions}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          <label htmlFor="manual-order-status" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Điều chỉnh trạng thái thủ công:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              id="manual-order-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              disabled={updating}
              style={{ flex: '1 1 220px' }}
            >
              <option value="">Chọn trạng thái cần cập nhật</option>
              {Object.entries(orderStatusLabels).map(([status, label]) => (
                <option key={status} value={status} disabled={status === currentStatus}>
                  {label}{status === currentStatus ? ' (hiện tại)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button button--secondary"
              disabled={updating || !selectedStatus || selectedStatus === currentStatus}
              onClick={() => handleUpdateStatus(selectedStatus)}
            >
              Cập nhật trạng thái
            </button>
          </div>
          {['COMPLETED', 'CANCELLED'].includes(currentStatus) && (
            <p style={{ margin: '0.6rem 0 0', color: '#666', fontSize: '0.82rem' }}>
              Có thể mở lại đơn nếu trạng thái kết thúc đã được cập nhật nhầm. Thao tác sẽ được lưu vào lịch sử.
            </p>
          )}
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpdatePaymentStatus = (newPaymentStatus) => {
    if (!window.confirm(`Bạn có chắc muốn cập nhật trạng thái thanh toán sang "${newPaymentStatus === 'PAID' ? 'Đã thanh toán' : newPaymentStatus === 'PENDING' ? 'Chờ thanh toán' : newPaymentStatus === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán'}"?`)) {
      return;
    }
    setUpdating(true);
    setActionError('');
    setSuccessMessage('');
    managementOrderApi.updatePaymentStatus(id, newPaymentStatus)
      .then((response) => {
        setOrder(response.data.data);
        setSuccessMessage('Đã cập nhật trạng thái thanh toán thành công.');
        setUpdating(false);
      })
      .catch((requestError) => {
        setActionError(getApiError(requestError));
        setUpdating(false);
      });
  };

  return (
    <section className="order-detail" style={{ padding: '1.5rem' }}>
      <style>{`
        .print-only {
          display: none !important;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          header, footer, nav, aside, .back-link, button, label, textarea, select, .back-to-top, .app-header {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            padding: 15px !important;
            margin: 0 !important;
          }
          .order-detail {
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
          }
        }
      `}</style>

      {/* 1. Giao diện tương tác trên màn hình (Ẩn khi in) */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Link className="back-link" to="/admin/orders" style={{ textDecoration: 'none' }}>
            ← Danh sách đơn hàng quản lý
          </Link>
          <button
            onClick={handlePrint}
            className="button button--secondary button--small"
            style={{ padding: '0.4rem 1rem', fontWeight: 'bold' }}
          >
            🖨️ In hóa đơn
          </button>
        </div>
        
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
            <div style={{ marginTop: '0.75rem' }} className="no-print">
              <label htmlFor="manual-payment-status" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#555' }}>
                Cập nhật thanh toán thủ công:
              </label>
              <select
                id="manual-payment-status"
                value={order.payment.status}
                onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                disabled={updating}
                style={{ fontSize: '0.85rem', padding: '0.35rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%', cursor: 'pointer' }}
              >
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PENDING">Chờ thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="FAILED">Thanh toán thất bại</option>
              </select>
            </div>
          </aside>
        </div>

        <div className="order-detail__grid" style={{ marginTop: '1.5rem' }}>
          <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <h2>Thông tin giao hàng & Khách hàng</h2>
            {isStorePickupAddress ? (
              <>
                <p style={{ margin: '0.5rem 0' }}><strong>Tên người nhận:</strong> {order.shippingAddress.recipientName}</p>
                {!isWalkInGuest && <p style={{ margin: '0.5rem 0' }}><strong>Số điện thoại:</strong> {order.shippingAddress.phone}</p>}
                <p style={{ margin: '0.5rem 0' }}><strong>Địa chỉ:</strong> Mua trực tiếp tại cửa hàng</p>
              </>
            ) : (
              <>
                <p style={{ margin: '0.5rem 0' }}><strong>Tên người nhận:</strong> {order.shippingAddress.recipientName}</p>
                <p style={{ margin: '0.5rem 0' }}><strong>Số điện thoại:</strong> {order.shippingAddress.phone}</p>
                <p style={{ margin: '0.5rem 0' }}>
                  <strong>Địa chỉ:</strong> {order.shippingAddress.detail}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
                </p>
              </>
            )}
            {order.note && <p style={{ margin: '0.5rem 0', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px' }}><strong>Ghi chú:</strong> {order.note}</p>}
            {!isWalkInGuest && (
              <>
                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '1rem 0' }} />
                <p style={{ margin: '0.5rem 0' }}><strong>Tài khoản đặt hàng:</strong> {order.userId ? `${order.userId.fullName} (${order.userId.email})` : 'Khách mua lẻ tại quầy (Chưa đăng ký tài khoản)'}</p>
              </>
            )}
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
            {order.statusHistory.map((entry, index) => {
              const roleLabel = entry.changedBy?.role === 'ADMIN' ? 'Quản trị viên' : entry.changedBy?.role === 'STAFF' ? 'Nhân viên' : entry.changedBy?.role || '';
              return (
                <li key={`${entry.status}-${index}`} style={{ marginBottom: '1rem' }}>
                  <strong>{orderStatusLabels[entry.status] || entry.status}</strong>
                  <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                    ({formatDate(entry.changedAt)})
                    {entry.changedBy && (
                      <span style={{ marginLeft: '0.5rem', color: '#1a73e8', fontWeight: '500' }}>
                        — Thực hiện bởi: {entry.changedBy.fullName} ({roleLabel})
                      </span>
                    )}
                  </span>
                  {entry.note && <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>{entry.note}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* 2. Giao diện hóa đơn chuyên nghiệp khi in (Chỉ hiển thị khi in) */}
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Phiếu Giao Hàng / Hóa Đơn</h2>
          <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 'bold' }}>Mã đơn: {order.orderCode}</div>
          <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>Ngày đặt hàng: {formatDate(order.createdAt)}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>ĐƠN VỊ BÁN HÀNG</h3>
            <strong style={{ fontSize: '1.05rem' }}>PHONE STORE</strong>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
              Địa chỉ: 123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh <br />
              Hotline: 1900 1234 | Email: support@phonestore.com
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '0.25rem', margin: '0 0 0.5rem 0' }}>THÔNG TIN NGƯỜI NHẬN</h3>
            {isStorePickupAddress ? (
              <>
                <strong style={{ fontSize: '1.05rem' }}>{order.shippingAddress.recipientName}</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  {!isWalkInGuest && <>Điện thoại: {order.shippingAddress.phone}<br /></>}
                  Địa chỉ: Mua trực tiếp tại cửa hàng
                  {order.note && <><br />Ghi chú: {order.note}</>}
                </div>
              </>
            ) : (
              <>
                <strong style={{ fontSize: '1.05rem' }}>{order.shippingAddress.recipientName}</strong>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', lineHeight: '1.4' }}>
                  Điện thoại: {order.shippingAddress.phone} <br />
                  Địa chỉ: {order.shippingAddress.detail}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province} <br />
                  {order.note && <span>Ghi chú: {order.note}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333', background: '#f9f9f9', textAlign: 'left', fontWeight: 'bold' }}>
              <th style={{ padding: '0.5rem', width: '5%' }}>STT</th>
              <th style={{ padding: '0.5rem', width: '50%' }}>Tên sản phẩm</th>
              <th style={{ padding: '0.5rem', width: '20%' }}>Phân loại</th>
              <th style={{ padding: '0.5rem', width: '10%', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ padding: '0.5rem', width: '5%', textAlign: 'center' }}>SL</th>
              <th style={{ padding: '0.5rem', width: '10%', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={`${item.productId}-${item.variantId}`} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ fontWeight: 'bold' }}>{item.productName}</div>
                  <small style={{ color: '#666' }}>SKU: {item.sku}</small>
                </td>
                <td style={{ padding: '0.5rem' }}>{item.ram} / {item.storage} / {item.color}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>{currency.format(item.unitPrice)}</td>
                <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{currency.format(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ width: '300px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cộng tiền hàng:</span>
              <span>{currency.format(order.pricing.subtotal)}</span>
            </div>
            {order.pricing.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c5221f' }}>
                <span>Giảm giá ({order.voucher?.code}):</span>
                <span>−{currency.format(order.pricing.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Phí vận chuyển:</span>
              <span>{order.pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(order.pricing.shippingFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem', fontSize: '1.05rem', fontWeight: 'bold' }}>
              <span>Tổng thanh toán:</span>
              <span style={{ color: '#1a73e8' }}>{currency.format(order.pricing.total)}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.5rem', fontStyle: 'italic', textAlign: 'right' }}>
              Phương thức: {order.payment.method} ({paymentStatusLabel})
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', fontSize: '0.85rem', marginTop: '3rem', pageBreakInside: 'avoid' }}>
          <div>
            <strong>Người nhận hàng</strong> <br />
            <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
          </div>
          <div>
            <strong>Người giao hàng</strong> <br />
            <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
          </div>
          <div>
            <strong>Người lập phiếu</strong> <br />
            <span style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '5rem', borderTop: '1px dashed #ccc', paddingTop: '1rem', fontSize: '0.8rem', color: '#666' }}>
          Cảm ơn quý khách đã mua sắm tại Phone Store!
        </div>
      </div>
    </section>
  );
}
