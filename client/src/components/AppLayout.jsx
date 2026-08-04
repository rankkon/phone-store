import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const displayName = user?.fullName?.trim() || user?.email || 'Tài khoản';

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  return (
    <div className="site-shell">
      <header className="site-header">
        <NavLink className="brand-mark" to="/">PHONE<span>STORE</span></NavLink>
        <nav className="site-nav">
          <NavLink to="/">Trang chủ</NavLink>
          <NavLink to="/products">Sản phẩm</NavLink>
          <NavLink to="/about">Về chúng tôi</NavLink>
          <NavLink to="/contact">Liên hệ</NavLink>
          {user?.role === 'CUSTOMER' && <NavLink to="/cart">Giỏ hàng</NavLink>}
          {!user && <NavLink to="/login">Đăng nhập</NavLink>}
          {user && <div className="account-menu" ref={menuRef}>
            <button type="button" className="account-menu__trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>{displayName}<span>⌄</span></button>
            {menuOpen && <div className="account-menu__dropdown">
              <p className="account-menu__email">{user.email}</p>
              <Link to="/profile">Hồ sơ cá nhân</Link>
              {user.role === 'CUSTOMER' && <><Link to="/orders">Đơn hàng của tôi</Link><Link to="/my-vouchers">Ưu đãi của tôi</Link></>}
              {(user.role === 'ADMIN' || user.role === 'STAFF') && <Link to="/admin">Khu vực quản trị</Link>}
              <button type="button" onClick={logout}>Đăng xuất</button>
            </div>}
          </div>}
        </nav>
      </header>
      <main className="site-content"><Outlet /></main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <section><Link className="brand-mark" to="/">PHONE<span>STORE</span></Link><p>Chọn điện thoại chính hãng với thông tin cấu hình, giá và tồn kho minh bạch.</p></section>
          <section><h2>Điều hướng</h2><Link to="/">Trang chủ</Link><Link to="/products">Sản phẩm</Link><Link to="/about">Về chúng tôi</Link><Link to="/contact">Liên hệ</Link></section>
          <section><h2>Hỗ trợ khách hàng</h2>{user?.role === 'CUSTOMER' ? <><Link to="/orders">Theo dõi đơn hàng</Link><Link to="/my-vouchers">Ưu đãi của tôi</Link></> : <Link to="/login">Đăng nhập để quản lý đơn</Link>}<Link to="/contact">Hỗ trợ thanh toán và voucher</Link><Link to="/contact">Chính sách bảo hành, đổi trả</Link></section>
          <section><h2>Liên hệ</h2><a href="tel:0900000000">0900 000 000</a><a href="mailto:support@phonestore.local">support@phonestore.local</a><p>TP. Hồ Chí Minh, Việt Nam</p></section>
        </div>
        <p className="site-footer__copyright">© {new Date().getFullYear()} Phone Store. Dự án thương mại điện tử.</p>
      </footer>
    </div>
  );
}
