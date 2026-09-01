import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';
import { clearPendingEmailVerification, getPendingEmailVerification } from '../../utils/pendingEmailVerification';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Mã xác minh gồm 6 số đã được gửi đến email của bạn.');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingVerification = getPendingEmailVerification();

  if (!pendingVerification) {
    return (
      <section className="auth-card">
        <div><p className="eyebrow">XÁC MINH EMAIL</p><h1>Phiên xác minh đã hết</h1><p>Hãy đăng ký hoặc đăng nhập lại để nhận một phiên xác minh email mới.</p></div>
        <p className="form-footer"><Link to="/register">Quay lại đăng ký</Link></p>
      </section>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Vui lòng nhập mã xác minh gồm 6 chữ số.');
      return;
    }

    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await authApi.verifyRegistration({ code }, pendingVerification.verificationToken);
      clearPendingEmailVerification();
      login(response.data.data);
      navigate(location.state?.destination || '/products', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setError('');
    setMessage('');
    setResending(true);
    try {
      const response = await authApi.resendRegistrationVerificationCode(pendingVerification.verificationToken);
      setCode('');
      setMessage(response.data.message);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="auth-card">
      <div><p className="eyebrow">BƯỚC CUỐI</p><h1>Xác minh email</h1><p>Nhập mã 6 số đã gửi đến <strong>{pendingVerification.email}</strong>. Sau khi xác minh, bạn sẽ được đăng nhập tự động.</p></div>
      <FlashMessage type="success">{message}</FlashMessage>
      <FlashMessage type="error">{error}</FlashMessage>
      <form onSubmit={handleSubmit} className="form-stack">
        <label>Mã xác minh<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" required autoFocus /></label>
        <button className="button" disabled={submitting || code.length !== 6}>{submitting ? 'Đang xác minh...' : 'Xác minh và đăng nhập'}</button>
        <button type="button" className="button button--ghost" onClick={resendCode} disabled={resending || submitting}>{resending ? 'Đang gửi lại...' : 'Gửi lại mã'}</button>
      </form>
      <p className="form-footer">Không nhận được mã? Kiểm tra thư mục Spam hoặc chờ 60 giây trước khi gửi lại.</p>
    </section>
  );
}
