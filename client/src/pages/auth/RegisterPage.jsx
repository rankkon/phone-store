import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Xác nhận mật khẩu chưa khớp.'); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      const response = await authApi.register(payload);
      login(response.data.data);
      navigate('/products', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally { setSubmitting(false); }
  }

  return (
    <section className="auth-card">
      <div><p className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</p><h1>Tạo tài khoản</h1><p>Tài khoản mới mặc định có vai trò Customer.</p></div>
      <FlashMessage type="error">{error}</FlashMessage>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <label>Số điện thoại<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label>Mật khẩu<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" /></label>
        <label>Xác nhận mật khẩu<input type="password" minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required autoComplete="new-password" /></label>
        <button className="button" disabled={submitting}>{submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
      </form>
      <p className="form-footer">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </section>
  );
}
