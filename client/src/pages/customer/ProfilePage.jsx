import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import UserAvatar from '../../components/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { isValidPersonName, isValidPhone, onlyDigits, onlyPersonName } from '../../utils/input';
import { useFeedback } from '../../context/FeedbackContext';

const emptyAddress = { recipientName: '', phone: '', province: '', district: '', ward: '', detail: '' };

function formatAddress(address) {
  const values = [address?.detail, address?.ward, address?.district, address?.province].filter(Boolean);
  return values.length ? values.join(', ') : 'Chưa thiết lập địa chỉ';
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', address: emptyAddress });
  const [passwordForm, setPasswordForm] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [passwordCodeSending, setPasswordCodeSending] = useState(false);
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [activeEditor, setActiveEditor] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const { confirm, notify } = useFeedback();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) setForm({ fullName: user.fullName || '', phone: user.phone || '', address: { ...emptyAddress, ...user.address } });
  }, [user]);

  function openEditor(editor) {
    setError('');
    setMessage('');
    setActiveEditor(editor);
  }

  function closeEditor() {
    setActiveEditor('');
    setError('');
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setMessage(''); setAvatarUploading(true);
    try {
      const response = await authApi.uploadAvatar(file);
      setUser(response.data.data);
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setAvatarUploading(false); }
  }

  async function handleAvatarDelete() {
    const confirmed = await confirm({ title: 'Xóa ảnh đại diện?', message: 'Ảnh đại diện hiện tại sẽ bị xóa và không thể khôi phục.', confirmLabel: 'Xóa ảnh', tone: 'danger' });
    if (!confirmed) return;
    setError(''); setMessage(''); setAvatarUploading(true);
    try {
      const response = await authApi.deleteAvatar();
      setUser(response.data.data);
      setMessage(response.data.message);
      notify(response.data.message);
    } catch (requestError) { const message = getApiError(requestError); setError(message); notify(message, { type: 'error' }); } finally { setAvatarUploading(false); }
  }

  async function saveProfile(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!isValidPersonName(form.fullName)) { setError('Họ và tên chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.'); return; }
    if (!isValidPhone(form.phone)) { setError('Số điện thoại chỉ gồm 9–15 chữ số.'); return; }
    const addressValues = Object.values(form.address).map((value) => String(value || '').trim());
    if (addressValues.some(Boolean) && addressValues.some((value) => !value)) { setError('Vui lòng nhập đủ các trường địa chỉ hoặc để trống toàn bộ.'); return; }
    if (form.address.recipientName && !isValidPersonName(form.address.recipientName)) { setError('Tên người nhận chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.'); return; }
    if (!isValidPhone(form.address.phone)) { setError('Số điện thoại người nhận chỉ gồm 9–15 chữ số.'); return; }
    setSaving(true);
    try {
      const response = await authApi.updateProfile(form);
      setUser(response.data.data);
      setActiveEditor('');
      setMessage('Đã lưu thông tin cá nhân.');
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
      <div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Hồ sơ cá nhân</h1><p>Quản lý thông tin liên hệ và bảo mật tài khoản.</p></div><span className="role-chip">{user.role}</span></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>

      <section className="profile-overview panel">
        <div className="profile-avatar-block">
          <UserAvatar user={user} size="xl" />
          <div><p className="eyebrow">ẢNH ĐẠI DIỆN</p><h2>{user.fullName || user.email}</h2><p>JPG, PNG hoặc WEBP; tối đa 2 MB. Ảnh sẽ xuất hiện trong menu tài khoản và khu vực quản trị.</p></div>
          <div className="profile-avatar-block__actions"><label className="button button--secondary" aria-disabled={avatarUploading}> <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={avatarUploading} />{avatarUploading ? 'Đang tải...' : user.avatarUrl ? 'Thay ảnh' : 'Tải ảnh lên'}</label>{user.avatarUrl && <button type="button" className="button button--ghost" onClick={handleAvatarDelete} disabled={avatarUploading}>Xóa ảnh</button>}</div>
        </div>
        <div className="profile-overview__heading"><div><h2>Thông tin tài khoản</h2><p>Thông tin này được dùng khi đặt hàng và hỗ trợ đơn hàng.</p></div><span className={user.isEmailVerified ? 'status status--active' : 'status'}>{user.isEmailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}</span></div>
        <dl className="profile-summary-grid">
          <div><dt>Họ và tên</dt><dd>{user.fullName || 'Chưa cập nhật'}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Số điện thoại</dt><dd>{user.phone || 'Chưa cập nhật'}</dd></div>
          <div><dt>Địa chỉ</dt><dd>{formatAddress(user.address)}</dd></div>
        </dl>
        <div className="profile-actions"><button type="button" className="button" onClick={() => openEditor('profile')}>Sửa thông tin</button><button type="button" className="button button--ghost" onClick={() => openEditor('password')}>Đổi mật khẩu</button></div>
      </section>

      {activeEditor === 'profile' && <form className="panel form-stack profile-editor" onSubmit={saveProfile}>
        <div className="profile-editor__heading"><div><p className="eyebrow">CẬP NHẬT</p><h2>Sửa thông tin cá nhân</h2></div><button type="button" className="text-button" onClick={closeEditor}>Đóng</button></div>
        <label>Email<input value={user.email} disabled /></label>
        {!user.isEmailVerified && <section className="profile-verification"><div><h3>Xác minh email</h3><p>Mã gồm 6 số được gửi về email đăng ký và có hiệu lực trong 10 phút.</p></div><div className="profile-verification__actions"><button type="button" className="button button--secondary" onClick={sendVerificationCode} disabled={verificationSending}>{verificationSending ? 'Đang gửi...' : 'Gửi mã xác minh'}</button><label>Mã xác minh<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))} /></label><button type="button" className="button button--ghost" onClick={verifyEmail} disabled={verificationCode.length !== 6}>Xác minh email</button></div></section>}
        <div className="two-columns">
          <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: onlyPersonName(event.target.value) })} minLength="2" maxLength="100" required /></label>
          <label>Số điện thoại<input inputMode="numeric" pattern="[0-9]{9,15}" maxLength="15" value={form.phone} onChange={(event) => setForm({ ...form, phone: onlyDigits(event.target.value) })} /></label>
        </div>
        <div className="profile-editor__section"><h3>Địa chỉ</h3></div>
        <div className="two-columns">
          <label>Người nhận<input value={form.address.recipientName} onChange={(event) => setForm({ ...form, address: { ...form.address, recipientName: onlyPersonName(event.target.value) } })} minLength="2" maxLength="100" /></label>
          <label>SĐT người nhận<input inputMode="numeric" pattern="[0-9]{9,15}" maxLength="15" value={form.address.phone} onChange={(event) => setForm({ ...form, address: { ...form.address, phone: onlyDigits(event.target.value) } })} /></label>
          <label>Tỉnh / thành phố<input value={form.address.province} onChange={(event) => setForm({ ...form, address: { ...form.address, province: event.target.value } })} /></label>
          <label>Quận / huyện<input value={form.address.district} onChange={(event) => setForm({ ...form, address: { ...form.address, district: event.target.value } })} /></label>
          <label>Phường / xã<input value={form.address.ward} onChange={(event) => setForm({ ...form, address: { ...form.address, ward: event.target.value } })} /></label>
          <label>Địa chỉ chi tiết<input value={form.address.detail} onChange={(event) => setForm({ ...form, address: { ...form.address, detail: event.target.value } })} /></label>
        </div>
        <div className="profile-actions"><button className="button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button><button type="button" className="button button--ghost" onClick={closeEditor}>Hủy</button></div>
      </form>}

      {activeEditor === 'password' && <form className="panel form-stack profile-editor profile-editor--narrow" onSubmit={updatePassword}>
        <div className="profile-editor__heading"><div><p className="eyebrow">BẢO MẬT</p><h2>Đổi mật khẩu</h2></div><button type="button" className="text-button" onClick={closeEditor}>Đóng</button></div>
        <p className="form-hint">Để bảo vệ tài khoản, hệ thống sẽ gửi mã 6 số đến email đã xác minh trước khi đổi mật khẩu.</p>
        <button type="button" className="button button--secondary" onClick={sendPasswordCode} disabled={!user.isEmailVerified || passwordCodeSending}>{passwordCodeSending ? 'Đang gửi...' : passwordCodeSent ? 'Gửi lại mã' : 'Gửi mã đổi mật khẩu'}</button>
        {!user.isEmailVerified && <p className="inline-error">Hãy xác minh email trong phần sửa thông tin trước khi đổi mật khẩu.</p>}
        <label>Mã xác nhận<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={passwordForm.code} onChange={(event) => setPasswordForm({ ...passwordForm, code: event.target.value.replace(/\D/g, '') })} required /></label>
        <label>Mật khẩu mới<input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required /></label>
        <label>Xác nhận mật khẩu mới<input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required /></label>
        <div className="profile-actions"><button className="button" disabled={!passwordCodeSent || passwordForm.code.length !== 6}>Đổi mật khẩu</button><button type="button" className="button button--ghost" onClick={closeEditor}>Hủy</button></div>
      </form>}
    </section>
  );
}
