import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { returnApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, returnStatusLabels } from '../../utils/order';

export default function ReturnRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await returnApi.listMine({ status: status || undefined, page, limit: 10 });
      setRequests(response.data.data);
      setMeta(response.data.meta);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }, [page, status]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  if (loading && page === 1) return <LoadingScreen />;
  return <section className="returns-page">
    <div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Yêu cầu hoàn trả</h1><p>Theo dõi quá trình tiếp nhận và xử lý các yêu cầu hoàn trả của bạn.</p></div><span className="role-chip">{meta.total || 0} yêu cầu</span></div>
    <FlashMessage type="error">{error}</FlashMessage>
    <div className="returns-toolbar panel"><label>Trạng thái<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(returnStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="return-request-list">{requests.map((request) => <article className="return-request-card" key={request._id}>
      <div className="return-request-card__heading"><div><p className="order-code">{request.orderId?.orderCode || 'Đơn hàng không còn tồn tại'}</p><strong>{returnStatusLabels[request.status]}</strong><span>Gửi lúc {formatDate(request.createdAt)}</span></div><div><span className={`return-status return-status--${request.status.toLowerCase()}`}>{returnStatusLabels[request.status]}</span><strong>{request.orderId?.pricing ? currency.format(request.orderId.pricing.total) : ''}</strong></div></div>
      <p className="return-request-card__reason"><b>Lý do:</b> {request.reason}</p>
      {request.orderId && <Link className="text-button" to={`/orders/${request.orderId.orderCode}`}>Xem đơn hàng →</Link>}
      <ol className="return-history">{request.statusHistory.map((entry, index) => <li key={`${entry.status}-${entry.changedAt}-${index}`}><strong>{returnStatusLabels[entry.status] || entry.status}</strong><span>{formatDate(entry.changedAt)}{entry.changedBy?.fullName ? ` · ${entry.changedBy.fullName}` : ''}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol>
    </article>)}{!loading && requests.length === 0 && <div className="empty-store"><p>Chưa có yêu cầu hoàn trả nào.</p><Link className="button" to="/orders">Xem đơn hàng của tôi</Link></div>}</div>
    {meta.totalPages > 1 && <nav className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></nav>}
  </section>;
}
