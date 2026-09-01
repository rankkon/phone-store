import { useEffect, useState } from 'react';
import { brandApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';

const initialBrand = { name: '', logoUrl: '', isActive: true };
const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const logoMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(initialBrand);
  const [editingId, setEditingId] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadBrands() {
    setLoading(true);
    try { const response = await brandApi.list(); setBrands(response.data.data); } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }

  useEffect(() => { loadBrands(); }, []);

  function beginEdit(brand) {
    setEditingId(brand._id);
    setForm({ name: brand.name, logoUrl: brand.logoUrl || '', isActive: brand.isActive });
    setLogoFile(null);
    setMessage(''); setError('');
  }

  function resetForm() { setEditingId(null); setForm(initialBrand); setLogoFile(null); }

  function selectLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!logoMimeTypes.has(file.type) || file.size > MAX_LOGO_SIZE) {
      event.target.value = '';
      setLogoFile(null);
      setError('Logo phải là ảnh JPG, PNG hoặc WEBP và không vượt quá 2 MB.');
      return;
    }
    setError('');
    setLogoFile(file);
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = editingId ? await brandApi.update(editingId, form) : await brandApi.create(form);
      const savedBrand = response.data.data;
      if (logoFile) {
        try {
          await brandApi.uploadLogo(savedBrand._id, logoFile);
        } catch (uploadError) {
          setEditingId(savedBrand._id);
          setForm({ name: savedBrand.name, logoUrl: savedBrand.logoUrl || '', isActive: savedBrand.isActive });
          setError(`Đã lưu hãng nhưng chưa tải được logo: ${getApiError(uploadError)}. Bạn có thể thử lại.`);
          await loadBrands();
          return;
        }
      }
      setMessage(editingId ? 'Đã cập nhật hãng.' : 'Đã thêm hãng mới.');
      resetForm(); await loadBrands();
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSaving(false); }
  }

  async function toggleStatus(brand) {
    setError('');
    try { await brandApi.setStatus(brand._id, !brand.isActive); await loadBrands(); } catch (requestError) { setError(getApiError(requestError)); }
  }

  if (loading) return <LoadingScreen />;
  return (
    <div className="admin-page">
      <div className="page-heading"><div><p className="eyebrow">DANH MỤC</p><h1>Hãng điện thoại</h1></div></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="admin-grid">
        <form className="panel form-stack" onSubmit={submit}>
          <h2>{editingId ? 'Sửa hãng' : 'Thêm hãng'}</h2>
          <label>Tên hãng<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Logo hãng<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectLogo} /><small className="brand-logo-hint">JPG, PNG hoặc WEBP; tối đa 2 MB, mỗi hãng chỉ có một logo. {logoFile ? `Đã chọn: ${logoFile.name}` : 'Ảnh mới sẽ thay thế logo hiện có.'}</small></label>
          {form.logoUrl && <div className="brand-logo-preview"><img src={form.logoUrl} alt={`Logo ${form.name || 'hãng'}`} /><span>Logo hiện tại</span></div>}
          <label>URL logo (tùy chọn)<input type="url" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Hiển thị hãng</label>
          <div className="button-row"><button className="button" disabled={saving}>{saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm hãng'}</button>{editingId && <button type="button" className="button button--ghost" onClick={resetForm}>Hủy</button>}</div>
        </form>
        <section className="panel table-panel">
          <h2>Danh sách hãng ({brands.length})</h2>
          <div className="table-scroll"><table><thead><tr><th>Hãng</th><th>Trạng thái</th><th /></tr></thead><tbody>
            {brands.map((brand) => <tr key={brand._id}><td className="brand-cell">{brand.logoUrl && <img src={brand.logoUrl} alt="" />}<span><strong>{brand.name}</strong><small>/{brand.slug}</small></span></td><td><span className={brand.isActive ? 'status status--active' : 'status'}>{brand.isActive ? 'Đang hiện' : 'Đang ẩn'}</span></td><td className="table-actions"><button onClick={() => beginEdit(brand)}>Sửa</button><button onClick={() => toggleStatus(brand)}>{brand.isActive ? 'Ẩn' : 'Hiện'}</button></td></tr>)}
            {brands.length === 0 && <tr><td colSpan="3" className="empty-cell">Chưa có hãng nào.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  );
}
