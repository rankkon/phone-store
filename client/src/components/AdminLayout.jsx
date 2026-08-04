import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p className="sidebar-label">QUẢN TRỊ</p>
        {user?.role === 'ADMIN' && (
          <>
            <NavLink to="/admin/dashboard">Tổng quan</NavLink>
            <NavLink to="/admin/products">Sản phẩm</NavLink>
            <NavLink to="/admin/brands">Hãng điện thoại</NavLink>
            <NavLink to="/admin/vouchers">Voucher</NavLink>
          </>
        )}
        <NavLink to="/admin/orders">Đơn hàng</NavLink>
        {user?.role === 'ADMIN' && (
          <NavLink to="/admin/users">Người dùng</NavLink>
        )}
        <NavLink to="/">← Về cửa hàng</NavLink>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}

