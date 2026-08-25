import { useEffect, useState } from 'react';
import { voucherAdminApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { useFeedback } from '../../context/FeedbackContext';

const initialVoucher = {
  code: '', type: 'PERCENT', value: '', minOrderValue: '0', maxDiscount: '',
  startAt: '', endAt: '', usageLimit: '100', isActive: true,
};

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toFormVoucher(voucher) {
  return {
    code: voucher.code,
    type: voucher.type,
    value: String(voucher.value),
    minOrderValue: String(voucher.minOrderValue || 0),
    maxDiscount: voucher.maxDiscount ?? '',
    startAt: toLocalDateTime(voucher.startAt),
    endAt: toLocalDateTime(voucher.endAt),
    usageLimit: String(voucher.usageLimit),
    isActive: voucher.isActive,
  };
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export default function VouchersPage() {
  const { confirm, notify } = useFeedback();
  const [vouchers, setVouchers] = useState([]);
  const [form, setForm] = useState(initialVoucher);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadVouchers() {
    setLoading(true);
    try {
      const response = await voucherAdminApi.list();
      setVouchers(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVouchers(); }, []);

  function resetForm() {
    setEditingId(null);
    setForm(initialVoucher);
  }

  function beginEdit(voucher) {
    setEditingId(voucher._id);
    setForm(toFormVoucher(voucher));
    setMessage('');
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      if (editingId) await voucherAdminApi.update(editingId, form);
      else await voucherAdminApi.create(form);
      setMessage(editingId ? 'Đã cập nhật voucher.' : 'Đã thêm voucher mới.');
      resetForm();
      await loadVouchers();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(voucher) {
    setError('');
    try {
      await voucherAdminApi.setStatus(voucher._id, !voucher.isActive);
      await loadVouchers();
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  async function removeVoucher(voucher) {
    const confirmed = await confirm({ title: `Xóa voucher ${voucher.code}?`, message: 'Voucher sẽ bị xóa vĩnh viễn và không thể khôi phục.', confirmLabel: 'Xóa voucher', tone: 'danger' });
    if (!confirmed) return;
    setError('');
    try {
      await voucherAdminApi.remove(voucher._id);
      if (editingId === voucher._id) resetForm();
      setMessage('Đã xóa voucher.');
      notify('Đã xóa voucher.');
      await loadVouchers();
    } catch (requestError) {
      const message = getApiError(requestError);
      setError(message);
      notify(message, { type: 'error' });
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div className="admin-page">
      <div className="page-heading"><div><p className="eyebrow">KHUYẾN MÃI</p><h1>Voucher</h1></div></div>
      <FlashMessage type="success">{message}</FlashMessage>
      <FlashMessage type="error">{error}</FlashMessage>
      <div className="admin-grid">
        <form className="panel form-stack" onSubmit={submit}>
          <h2>{editingId ? 'Sửa voucher' : 'Thêm voucher'}</h2>
          <label>Mã voucher<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} maxLength="30" required /></label>
          <label>Loại giảm giá<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, maxDiscount: event.target.value === 'FIXED' ? '' : form.maxDiscount })}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (VND)</option></select></label>
          <div className="two-columns">
            <label>{form.type === 'PERCENT' ? 'Giá trị (%)' : 'Giá trị (VND)'}<input type="number" min="0.01" max={form.type === 'PERCENT' ? '100' : undefined} step="any" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required /></label>
            <label>Giới hạn lượt dùng<input type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} required /></label>
          </div>
          <label>Giá trị đơn tối thiểu (VND)<input type="number" min="0" step="1000" value={form.minOrderValue} onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })} required /></label>
          {form.type === 'PERCENT' && <label>Mức giảm tối đa (VND, tùy chọn)<input type="number" min="0" step="1000" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} /></label>}
          <label>Bắt đầu<input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} required /></label>
          <label>Kết thúc<input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} required /></label>
          <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Kích hoạt voucher</label>
          <div className="button-row"><button className="button" disabled={saving}>{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm voucher'}</button>{editingId && <button type="button" className="button button--ghost" onClick={resetForm}>Hủy</button>}</div>
        </form>
        <section className="panel table-panel">
          <h2>Danh sách voucher ({vouchers.length})</h2>
          <div className="table-scroll"><table><thead><tr><th>Mã / ưu đãi</th><th>Thời hạn</th><th>Lượt dùng</th><th>Trạng thái</th><th /></tr></thead><tbody>
            {vouchers.map((voucher) => <tr key={voucher._id}>
              <td><strong>{voucher.code}</strong><small>{voucher.type === 'PERCENT' ? `${voucher.value}%` : `${formatMoney(voucher.value)} VND`} · Đơn từ {formatMoney(voucher.minOrderValue)} VND{voucher.maxDiscount !== null ? ` · Tối đa ${formatMoney(voucher.maxDiscount)} VND` : ''}</small></td>
              <td><strong>{new Date(voucher.startAt).toLocaleDateString('vi-VN')}</strong><small>đến {new Date(voucher.endAt).toLocaleDateString('vi-VN')}</small></td>
              <td>{voucher.usedCount} / {voucher.usageLimit}</td>
              <td><span className={voucher.isActive ? 'status status--active' : 'status'}>{voucher.isActive ? 'Đang bật' : 'Đang tắt'}</span></td>
              <td className="table-actions"><button onClick={() => beginEdit(voucher)}>Sửa</button><button onClick={() => toggleStatus(voucher)}>{voucher.isActive ? 'Tắt' : 'Bật'}</button><button className="text-button--danger" onClick={() => removeVoucher(voucher)}>Xóa</button></td>
            </tr>)}
            {vouchers.length === 0 && <tr><td colSpan="5" className="empty-cell">Chưa có voucher nào.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  );
}
