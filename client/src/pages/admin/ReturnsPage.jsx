import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { managementReturnApi } from '../../api/management';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, returnStatusLabels } from '../../utils/order';

const actionLabels = { APPROVED: 'Duyệt yêu cầu', REJECTED: 'Từ chối yêu cầu', COMPLETED: 'Hoàn tất xử lý' };

export default function ReturnsPage() {
  const [requests, setRequests] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [processing, setProcessing] = useState(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await managementReturnApi.list({ search: search || undefined, status: status || undefined, page, limit: 10 });
      setRequests(response.data.data);
      setMeta(response.data.meta);
      setStats(response.data.stats || { pendingCount: 0 });
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  function openProcessing(request, nextStatus) {
    setProcessing({ request, nextStatus });
    setNote('');
  }

  async function submitProcessing(event) {
    event.preventDefault();
    if (!processing) return;
    setWorkingId(processing.request._id); setError(''); setMessage('');
    try {
      const response = await managementReturnApi.updateStatus(processing.request._id, processing.nextStatus, note);
      setRequests((current) => current.map((item) => item._id === processing.request._id ? response.data.data : item));
      setStats((current) => ({ ...current, pendingCount: processing.request.status === 'PENDING' ? Math.max(0, current.pendingCount - 1) : current.pendingCount }));
      setMessage(response.data.message);
      setProcessing(null); setNote('');
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  if (loading && page === 1) return <LoadingScreen />;
  return <section className="admin-page returns-admin-page">
    <div className="page-heading"><div><p className="eyebrow">HẬU MÃI</p><h1>Yêu cầu hoàn trả</h1><p>Duyệt hoặc từ chối yêu cầu của khách hàng, sau đó ghi nhận khi quy trình đã hoàn tất.</p></div><span className="role-chip">{stats.pendingCount} chờ xử lý</span></div>
    <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
    <form className="return-admin-filters panel" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Mã đơn, tên, email hoặc số điện thoại" /><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{Object.entries(returnStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button--secondary">Lọc</button></form>
    <div className="return-admin-list">{requests.map((request) => <article className="admin-return-card" key={request._id}>
      <div className="admin-return-card__top"><div><p className="order-code">{request.orderId?.orderCode || 'Đơn hàng không còn tồn tại'}</p><strong>{request.userId?.fullName || 'Khách hàng'}</strong><span>{request.userId?.email || request.userId?.phone || ''}</span></div><div><span className={`return-status return-status--${request.status.toLowerCase()}`}>{returnStatusLabels[request.status]}</span><small>{formatDate(request.createdAt)}</small></div></div>
      <p className="admin-return-card__reason"><b>Lý do khách gửi:</b> {request.reason}</p>
      {request.orderId && <div className="admin-return-card__order"><span>{request.orderId.items.length} sản phẩm · {currency.format(request.orderId.pricing.total)}</span><Link to={`/admin/orders/${request.orderId._id}`}>Xem đơn gốc →</Link></div>}
      <ol className="return-history">{request.statusHistory.map((entry, index) => <li key={`${entry.status}-${entry.changedAt}-${index}`}><strong>{returnStatusLabels[entry.status] || entry.status}</strong><span>{formatDate(entry.changedAt)}{entry.changedBy?.fullName ? ` · ${entry.changedBy.fullName}` : ''}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol>
      <div className="admin-return-card__actions">{request.status === 'PENDING' && <><button className="button button--secondary" onClick={() => openProcessing(request, 'APPROVED')} disabled={workingId === request._id}>Duyệt</button><button className="button button--danger" onClick={() => openProcessing(request, 'REJECTED')} disabled={workingId === request._id}>Từ chối</button></>}{request.status === 'APPROVED' && <button className="button" onClick={() => openProcessing(request, 'COMPLETED')} disabled={workingId === request._id}>Xác nhận đã hoàn tất</button>}</div>
    </article>)}{!loading && requests.length === 0 && <p className="empty-store">Không có yêu cầu hoàn trả phù hợp.</p>}</div>
    {meta.totalPages > 1 && <nav className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></nav>}
    {processing && <div className="modal" role="presentation"><form className="modal-content form-stack" onSubmit={submitProcessing}><div className="profile-editor__heading"><div><p className="eyebrow">XỬ LÝ HOÀN TRẢ</p><h2>{actionLabels[processing.nextStatus]}</h2></div><button type="button" className="text-button" onClick={() => setProcessing(null)}>Đóng</button></div><p className="form-hint">Đơn {processing.request.orderId?.orderCode}. Nội dung xử lý sẽ được lưu vào lịch sử và hiển thị cho khách hàng.</p><label>{processing.nextStatus === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú xử lý (không bắt buộc)'}<textarea rows="5" minLength={processing.nextStatus === 'REJECTED' ? 3 : undefined} maxLength="1000" value={note} onChange={(event) => setNote(event.target.value)} required={processing.nextStatus === 'REJECTED'} /></label><div className="button-row"><button className={processing.nextStatus === 'REJECTED' ? 'button button--danger' : 'button'} disabled={workingId === processing.request._id}>{workingId === processing.request._id ? 'Đang lưu...' : actionLabels[processing.nextStatus]}</button><button type="button" className="button button--ghost" onClick={() => setProcessing(null)}>Hủy</button></div></form></div>}
  </section>;
}
