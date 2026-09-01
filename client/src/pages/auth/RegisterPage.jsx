import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { isValidPersonName, isValidPhone, onlyDigits, onlyPersonName } from '../../utils/input';
import { savePendingEmailVerification } from '../../utils/pendingEmailVerification';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isValidPersonName(form.fullName)) { setError('Họ và tên chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.'); return; }
    if (!isValidPhone(form.phone)) { setError('Số điện thoại chỉ gồm 9–15 chữ số.'); return; }
    if (form.password !== form.confirmPassword) { setError('Xác nhận mật khẩu chưa khớp.'); return; }
    setError(''); setSubmitting(true);
    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      const response = await authApi.register(payload);
      savePendingEmailVerification(response.data.data);
      navigate('/verify-email', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally { setSubmitting(false); }
  }

  return (
    <section className="auth-card">
      <div><p className="eyebrow">TÀI KHOẢN KHÁCH HÀNG</p><h1>Tạo tài khoản</h1><p>Tài khoản mới mặc định có vai trò Customer.</p></div>
      <FlashMessage type="error">{error}</FlashMessage>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: onlyPersonName(event.target.value) })} minLength="2" maxLength="100" required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <label>Số điện thoại<input inputMode="numeric" pattern="[0-9]{9,15}" maxLength="15" value={form.phone} onChange={(event) => setForm({ ...form, phone: onlyDigits(event.target.value) })} /></label>
        <label>Mật khẩu<input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" /></label>
        <label>Xác nhận mật khẩu<input type="password" minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required autoComplete="new-password" /></label>
        <button className="button" disabled={submitting}>{submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button>
      </form>
      <p className="form-footer">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </section>
  );
}
