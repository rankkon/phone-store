import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState(location.state?.message || '');

  async function handleSubmit(event) {
    event.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      const response = await authApi.login(form);
      login(response.data.data);
      const destination = location.state?.from || (response.data.data.user.role === 'ADMIN' ? '/admin/products' : response.data.data.user.role === 'CUSTOMER' ? '/products' : '/profile');
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally { setSubmitting(false); }
  }

  return (
    <section className="auth-card">
      <div><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h1>Đăng nhập</h1><p>Truy cập khu vực phù hợp với vai trò của bạn.</p></div>
      <FlashMessage type="success">{message}</FlashMessage>
      <FlashMessage type="error">{error}</FlashMessage>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="current-password" /></label>
        <button className="button" disabled={submitting}>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
      </form>
      <p className="form-footer"><Link to="/forgot-password">Quên mật khẩu?</Link></p>
      <p className="form-footer">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </section>
  );
}
