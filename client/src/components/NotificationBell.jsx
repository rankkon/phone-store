import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationsContext';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  return <Link className="notification-bell" to="/notifications" aria-label={unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'} title="Thông báo"><span aria-hidden="true">🔔</span>{unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}</Link>;
}
