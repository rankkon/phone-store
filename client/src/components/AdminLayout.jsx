import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__identity"><UserAvatar user={user} size="lg" /><div><p>{user?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'}</p><strong>{user?.fullName || user?.email}</strong><span>{user?.email}</span></div></div>
        <nav className="admin-sidebar__nav" aria-label="Điều hướng quản trị">
          {user?.role === 'ADMIN' && (
            <>
              <p className="sidebar-label">VẬN HÀNH</p>
              <NavLink to="/admin/dashboard">Tổng quan</NavLink>
              <NavLink to="/admin/products">Sản phẩm</NavLink>
              <NavLink to="/admin/inventory">Tồn kho</NavLink>
              <NavLink to="/admin/brands">Hãng điện thoại</NavLink>
              <NavLink to="/admin/vouchers">Voucher</NavLink>
              <NavLink to="/admin/reviews">Đánh giá</NavLink>
            </>
          )}
          <p className="sidebar-label">BÁN HÀNG</p>
          <NavLink to="/admin/orders">Đơn hàng & POS</NavLink>
          <NavLink to="/admin/returns">Hoàn trả</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/admin/users">Khách hàng</NavLink>}
          <NavLink className="admin-sidebar__store-link" to="/">← Về cửa hàng</NavLink>
        </nav>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}

