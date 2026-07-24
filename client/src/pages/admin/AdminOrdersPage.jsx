import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { managementOrderApi } from '../../api/management';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels } from '../../utils/order';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchOrders = () => {
    setLoading(true);
    managementOrderApi.list({
      status: statusFilter || undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit: 10,
    })
      .then((response) => {
        setOrders(response.data.data);
        setMeta(response.data.meta);
        setLoading(false);
      })
      .catch((requestError) => {
        setError(getApiError(requestError));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery, page]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  if (loading && page === 1) return <LoadingScreen />;

  return (
    <div className="admin-orders">
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Quản lý đơn hàng</h1>
        </div>
      </div>

      {error && <FlashMessage type="error">{error}</FlashMessage>}

      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Tìm theo mã đơn, tên, SĐT khách..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(orderStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">Không tìm thấy đơn hàng nào.</div>
      ) : (
        <>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem' }}>Mã đơn</th>
                  <th style={{ padding: '0.75rem' }}>Khách hàng</th>
                  <th style={{ padding: '0.75rem' }}>Thời gian đặt</th>
                  <th style={{ padding: '0.75rem' }}>Tổng tiền</th>
                  <th style={{ padding: '0.75rem' }}>Thanh toán</th>
                  <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}><strong>{order.orderCode}</strong></td>
                    <td style={{ padding: '0.75rem' }}>
                      <div>{order.shippingAddress.recipientName}</div>
                      <small style={{ color: '#666' }}>{order.shippingAddress.phone}</small>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{formatDate(order.createdAt)}</td>
                    <td style={{ padding: '0.75rem' }}><strong>{currency.format(order.pricing.total)}</strong></td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem' }}>
                        {order.payment.method} · {order.payment.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`status status--${order.status.toLowerCase()}`} style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        background: order.status === 'COMPLETED' ? '#e6f4ea' : order.status === 'CANCELLED' ? '#fce8e6' : '#fef7e0',
                        color: order.status === 'COMPLETED' ? '#137333' : order.status === 'CANCELLED' ? '#c5221f' : '#b06000'
                      }}>
                        {orderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Link to={`/admin/orders/${order._id}`} className="button button--secondary button--small" style={{ textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>
                        Chi tiết / Xử lý
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="button button--secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                Trước
              </button>
              <span style={{ alignSelf: 'center' }}>Trang {page} / {meta.totalPages}</span>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="button button--secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
