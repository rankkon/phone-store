import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function sendCode() {
    setMessage(''); setError(''); setSubmitting(true);
    try {
      const response = await authApi.forgotPassword({ email: form.email });
      setCodeSent(true);
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSubmitting(false); }
  }

  async function resetPassword(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setError('Xác nhận mật khẩu chưa khớp.'); return; }
    setMessage(''); setError(''); setSubmitting(true);
    try {
      await authApi.resetPassword(form);
      navigate('/login', { replace: true, state: { message: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.' } });
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSubmitting(false); }
  }

  return (
    <section className="auth-card">
      <div><p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p><h1>Quên mật khẩu</h1><p>Nhập email đã xác minh để nhận mã gồm 6 số. Mã có hiệu lực trong 10 phút.</p></div>
      <FlashMessage type="success">{message}</FlashMessage>
      <FlashMessage type="error">{error}</FlashMessage>
      <form onSubmit={resetPassword} className="form-stack">
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoComplete="email" /></label>
        <button type="button" className="button button--secondary" onClick={sendCode} disabled={submitting || !form.email}>{submitting ? 'Đang gửi...' : codeSent ? 'Gửi lại mã' : 'Gửi mã xác nhận'}</button>
        {codeSent && <>
          <label>Mã xác nhận<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '') })} required /></label>
          <label>Mật khẩu mới<input type="password" minLength="8" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required autoComplete="new-password" /></label>
          <label>Xác nhận mật khẩu mới<input type="password" minLength="8" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required autoComplete="new-password" /></label>
          <button className="button" disabled={submitting || form.code.length !== 6}>{submitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}</button>
        </>}
      </form>
      <p className="form-footer"><Link to="/login">Quay lại đăng nhập</Link></p>
    </section>
  );
}
