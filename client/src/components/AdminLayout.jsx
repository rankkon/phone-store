import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p className="sidebar-label">QUẢN TRỊ</p>
        <NavLink to="/admin/products">Sản phẩm</NavLink>
        <NavLink to="/admin/brands">Hãng điện thoại</NavLink>
        <NavLink to="/">← Về cửa hàng</NavLink>
      </aside>
      <section className="admin-content"><Outlet /></section>
    </div>
  );
}
