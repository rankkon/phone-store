import { useEffect, useState } from 'react';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';

const emptyAddress = { recipientName: '', phone: '', province: '', district: '', ward: '', detail: '' };

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', address: emptyAddress });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Đã đổi mật khẩu thành công.');
    } catch (requestError) { setError(getApiError(requestError)); }
  }

  return (
    <section className="profile-page">
      <div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Hồ sơ cá nhân</h1></div><span className="role-chip">{user.role}</span></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="profile-grid">
        <form className="panel form-stack" onSubmit={saveProfile}>
          <h2>Thông tin liên hệ</h2>
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
          <label>Mật khẩu hiện tại<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label>
          <label>Mật khẩu mới<input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></label>
          <label>Xác nhận mật khẩu mới<input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></label>
          <button className="button button--secondary">Đổi mật khẩu</button>
        </form>
      </div>
    </section>
  );
}
