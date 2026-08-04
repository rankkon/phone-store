import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';

const emptyAddress = { recipientName: '', phone: '', province: '', district: '', ward: '', detail: '' };

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', address: emptyAddress });
  const [passwordForm, setPasswordForm] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [passwordCodeSending, setPasswordCodeSending] = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || '', phone: user.phone || '', address: { ...emptyAddress, ...user.address } });
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      const response = await authApi.updateProfile(form);
      setUser(response.data.data);
      setMessage('Đã lưu hồ sơ cá nhân.');
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSaving(false); }
  }

  async function updatePassword(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('Xác nhận mật khẩu chưa khớp.'); return; }
    try {
      await authApi.changePassword(passwordForm);
      await logout();
      navigate('/login', { replace: true, state: { message: 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.' } });
    } catch (requestError) { setError(getApiError(requestError)); }
  }

  async function sendVerificationCode() {
    setError(''); setMessage(''); setVerificationSending(true);
    try {
      const response = await authApi.sendEmailVerificationCode();
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setVerificationSending(false); }
  }

  async function verifyEmail() {
    setError(''); setMessage('');
    try {
      const response = await authApi.verifyEmail({ code: verificationCode });
      setUser(response.data.data);
      setVerificationCode('');
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); }
  }

  async function sendPasswordCode() {
    setError(''); setMessage(''); setPasswordCodeSending(true);
    try {
      const response = await authApi.sendPasswordChangeCode();
      setPasswordCodeSent(true);
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setPasswordCodeSending(false); }
  }

  return (
    <section className="profile-page">
      <div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Hồ sơ cá nhân</h1></div><span className="role-chip">{user.role}</span></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="profile-grid">
        <form className="panel form-stack" onSubmit={saveProfile}>
          <h2>Thông tin liên hệ</h2>
          <label>Email<input value={user.email} disabled /></label>
          <div className="form-stack"><h3>Xác minh email</h3>
            <p className="form-hint">Trạng thái: <span className={user.isEmailVerified ? 'status status--active' : 'status'}>{user.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</span></p>
            {!user.isEmailVerified && <>
              <p className="form-hint">Mã gồm 6 số được gửi đến email đăng ký và có hiệu lực trong 10 phút.</p>
              <div className="button-row"><button type="button" className="button button--secondary" onClick={sendVerificationCode} disabled={verificationSending}>{verificationSending ? 'Đang gửi...' : 'Gửi mã xác minh'}</button></div>
              <label>Mã xác minh<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} /></label>
              <button type="button" className="button" onClick={verifyEmail} disabled={verificationCode.length !== 6}>Xác minh email</button>
            </>}
          </div>
          <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
          <label>Số điện thoại<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <h3>Địa chỉ mặc định</h3>
          <div className="two-columns">
            <label>Người nhận<input value={form.address.recipientName} onChange={(event) => setForm({ ...form, address: { ...form.address, recipientName: event.target.value } })} /></label>
            <label>SĐT người nhận<input value={form.address.phone} onChange={(event) => setForm({ ...form, address: { ...form.address, phone: event.target.value } })} /></label>
            <label>Tỉnh / thành phố<input value={form.address.province} onChange={(event) => setForm({ ...form, address: { ...form.address, province: event.target.value } })} /></label>
            <label>Quận / huyện<input value={form.address.district} onChange={(event) => setForm({ ...form, address: { ...form.address, district: event.target.value } })} /></label>
            <label>Phường / xã<input value={form.address.ward} onChange={(event) => setForm({ ...form, address: { ...form.address, ward: event.target.value } })} /></label>
            <label>Địa chỉ chi tiết<input value={form.address.detail} onChange={(event) => setForm({ ...form, address: { ...form.address, detail: event.target.value } })} /></label>
          </div>
          <button className="button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
        </form>
        <form className="panel form-stack" onSubmit={updatePassword}>
          <h2>Đổi mật khẩu</h2>
          <p className="form-hint">Một mã 6 số sẽ được gửi đến email đã xác minh để xác nhận thao tác này.</p>
          <button type="button" className="button button--secondary" onClick={sendPasswordCode} disabled={!user.isEmailVerified || passwordCodeSending}>{passwordCodeSending ? 'Đang gửi...' : passwordCodeSent ? 'Gửi lại mã' : 'Gửi mã đổi mật khẩu'}</button>
          {!user.isEmailVerified && <p className="inline-error">Bạn cần xác minh email trước khi đổi mật khẩu.</p>}
          <label>Mã xác nhận<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={passwordForm.code} onChange={(event) => setPasswordForm({ ...passwordForm, code: event.target.value.replace(/\D/g, '') })} required /></label>
          <label>Mật khẩu mới<input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></label>
          <label>Xác nhận mật khẩu mới<input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></label>
          <button className="button button--secondary" disabled={!passwordCodeSent || passwordForm.code.length !== 6}>Đổi mật khẩu</button>
        </form>
      </div>
    </section>
  );
}
