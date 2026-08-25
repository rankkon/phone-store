import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notifications';
import { getApiError } from '../api/http';
import FlashMessage from '../components/FlashMessage';
import LoadingScreen from '../components/LoadingScreen';
import { useNotifications } from '../context/NotificationsContext';
import { formatDate } from '../utils/order';

const typeLabels = { ORDER: 'Đơn hàng', PAYMENT: 'Thanh toán', CANCEL: 'Hủy đơn', RETURN: 'Hoàn trả', VOUCHER: 'Ưu đãi', SYSTEM: 'Hệ thống' };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { refreshNotifications, markRead, markAllRead, unreadCount } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationApi.list({ unread: unreadOnly || undefined, page, limit: 20 });
      setNotifications(response.data.data || []);
      setMeta(response.data.meta);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }, [page, unreadOnly]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function openNotification(notification) {
    setError('');
    try {
      if (!notification.isRead) {
        setWorkingId(notification._id);
        await markRead(notification._id);
        setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item));
      }
      if (notification.link) navigate(notification.link);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  async function handleMarkAllRead() {
    setError('');
    try {
      await markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() })));
      setMeta((current) => ({ ...current, unreadCount: 0 }));
      await refreshNotifications();
    } catch (requestError) { setError(getApiError(requestError)); }
  }

  if (loading && page === 1) return <LoadingScreen />;
  return <section className="notifications-page"><div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Thông báo</h1><p>Cập nhật về đơn hàng, thanh toán, yêu cầu hậu mãi và ưu đãi của bạn.</p></div>{(unreadCount || meta.unreadCount) > 0 && <button className="button button--ghost" onClick={handleMarkAllRead}>Đánh dấu đã đọc</button>}</div>
    <FlashMessage type="error">{error}</FlashMessage>
    <div className="notification-toolbar panel"><label className="checkbox-label"><input type="checkbox" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.target.checked); setPage(1); }} /> Chỉ hiển thị chưa đọc</label><span>{meta.unreadCount || 0} chưa đọc</span></div>
    <div className="notification-list">{notifications.map((notification) => <article key={notification._id} className={`notification-card${notification.isRead ? '' : ' notification-card--unread'}`}><button type="button" onClick={() => openNotification(notification)} disabled={workingId === notification._id}><div className="notification-card__top"><span className={`notification-type notification-type--${notification.type.toLowerCase()}`}>{typeLabels[notification.type] || 'Hệ thống'}</span><time>{formatDate(notification.createdAt)}</time></div><h2>{notification.title}</h2><p>{notification.message}</p>{notification.link && <small>{workingId === notification._id ? 'Đang mở...' : 'Xem chi tiết →'}</small>}</button></article>)}{!loading && notifications.length === 0 && <div className="empty-store"><p>{unreadOnly ? 'Bạn không có thông báo chưa đọc.' : 'Bạn chưa có thông báo nào.'}</p></div>}</div>
    {meta.totalPages > 1 && <nav className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></nav>}
  </section>;
}
