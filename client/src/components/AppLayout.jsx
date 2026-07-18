import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="brand-mark" to="/">PHONE<span>STORE</span></NavLink>
        <nav className="site-nav">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/products">Sản phẩm</NavLink>
          {user?.role === 'CUSTOMER' && <NavLink to="/cart">Giỏ hàng</NavLink>}
          {user?.role === 'CUSTOMER' && <NavLink to="/orders">Đơn hàng</NavLink>}
          {user ? <NavLink to="/profile">Hồ sơ</NavLink> : <NavLink to="/login">Đăng nhập</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin/products">Quản trị</NavLink>}
          {user && <button className="link-button" onClick={logout}>Đăng xuất</button>}
        </nav>
      </header>
      <main className="site-content"><Outlet /></main>
    </div>
  );
}
