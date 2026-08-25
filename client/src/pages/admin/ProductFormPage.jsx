import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { brandApi, productApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { useFeedback } from '../../context/FeedbackContext';

const blankVariant = () => ({ sku: '', ram: '', storage: '', color: '', costPrice: '', salePrice: '', stock: 0, isActive: true });
const ramPresets = ['4GB', '6GB', '8GB', '12GB', '16GB', '18GB', '24GB'];
const storagePresets = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
const initialForm = () => ({
  name: '', modelCode: '', brandId: '', description: '', isActive: true,
  specifications: { chip: '', battery: '', screen: '', rearCamera: '', frontCamera: '', operatingSystem: '' },
  variants: [blankVariant()],
});

export default function ProductFormPage() {
  const { confirm, notify } = useFeedback();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [brands, setBrands] = useState([]);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const brandResponse = await brandApi.list();
        setBrands(brandResponse.data.data);
        if (isEditing) {
          const productResponse = await productApi.get(id);
          const product = productResponse.data.data;
          setForm({
            name: product.name, modelCode: product.modelCode, brandId: product.brandId?._id || product.brandId, description: product.description || '', isActive: product.isActive,
            specifications: { chip: '', battery: '', screen: '', rearCamera: '', frontCamera: '', operatingSystem: '', ...product.specifications },
            variants: product.variants.map((variant) => ({ ...variant })),
          });
          setImages(product.images || []);
        }
      } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
    }
    loadData();
  }, [id, isEditing]);

  function updateVariant(index, field, value) {
    setForm((current) => ({ ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant) }));
  }

  function removeVariant(index) {
    setForm((current) => ({ ...current, variants: current.variants.filter((_, variantIndex) => variantIndex !== index) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.variants.length === 0) { setError('Sản phẩm phải có ít nhất một biến thể.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const payload = {
        ...form,
        variants: form.variants.map((source) => {
          const variant = { ...source };
          return {
            ...variant,
            costPrice: Number(variant.costPrice), salePrice: Number(variant.salePrice), stock: Number(variant.stock),
          };
        }),
      };
      const response = isEditing ? await productApi.update(id, payload) : await productApi.create(payload);
      const saved = response.data.data;
      if (files.length > 0) {
        const uploaded = await productApi.uploadImages(saved._id, files);
        setImages(uploaded.data.data.images);
        setFiles([]);
      }
      setMessage(isEditing ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm mới.');
      if (!isEditing) navigate(`/admin/products/${saved._id}/edit`, { replace: true });
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSaving(false); }
  }

  async function deleteImage(image) {
    const confirmed = await confirm({ title: 'Xóa ảnh sản phẩm?', message: 'Ảnh này sẽ bị xóa vĩnh viễn khỏi sản phẩm.', confirmLabel: 'Xóa ảnh', tone: 'danger' });
    if (!confirmed) return;
    try {
      const response = await productApi.deleteImage(id, image._id);
      setImages(response.data.data.images);
      notify('Đã xóa ảnh sản phẩm.');
    } catch (requestError) { const message = getApiError(requestError); setError(message); notify(message, { type: 'error' }); }
  }

  if (loading) return <LoadingScreen />;
  return (
    <div className="admin-page">
      <div className="page-heading"><div><p className="eyebrow">CATALOG</p><h1>{isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h1></div><Link className="button button--ghost" to="/admin/products">← Danh sách sản phẩm</Link></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <form className="product-form" onSubmit={handleSubmit}>
        <datalist id="ram-presets">{ramPresets.map((value) => <option key={value} value={value} />)}</datalist>
        <datalist id="storage-presets">{storagePresets.map((value) => <option key={value} value={value} />)}</datalist>
        <section className="panel form-stack">
          <h2>Thông tin cơ bản</h2>
          <div className="two-columns">
            <label>Tên sản phẩm<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>Mã sản phẩm<input value={form.modelCode} onChange={(event) => setForm({ ...form, modelCode: event.target.value })} required /></label>
            <label>Hãng<select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: event.target.value })} required><option value="">Chọn hãng</option>{brands.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}{brand.isActive ? '' : ' (đang ẩn)'}</option>)}</select></label>
            <label className="checkbox-label"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Hiển thị sản phẩm</label>
          </div>
          <label>Mô tả<textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        </section>
        <section className="panel form-stack">
          <h2>Thông số kỹ thuật</h2>
          <div className="two-columns">
            {Object.entries({ chip: 'Chip', battery: 'Pin', screen: 'Màn hình', rearCamera: 'Camera sau', frontCamera: 'Camera trước', operatingSystem: 'Hệ điều hành' }).map(([field, label]) => <label key={field}>{label}<input value={form.specifications[field]} onChange={(event) => setForm({ ...form, specifications: { ...form.specifications, [field]: event.target.value } })} /></label>)}
          </div>
        </section>
        <section className="panel form-stack">
          <div className="section-heading"><div><h2>Biến thể</h2><p>Mỗi SKU là duy nhất; giá nhập và giá bán được quản lý theo từng biến thể. Khi đang chỉnh sửa sản phẩm, hãy dùng mục Tồn kho để thay đổi số lượng và lưu nguyên nhân.</p></div><div className="button-row">{isEditing && <Link className="button button--ghost" to="/admin/inventory">Quản lý tồn kho</Link>}<button type="button" className="button button--secondary" onClick={() => setForm({ ...form, variants: [...form.variants, blankVariant()] })}>+ Thêm biến thể</button></div></div>
          {form.variants.map((variant, index) => <fieldset className="variant-card" key={variant._id || index}><legend>Biến thể {index + 1}</legend><div className="variant-grid">
            <label>SKU<input value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} required /></label>
            <label>RAM<input list="ram-presets" placeholder="Chọn hoặc nhập, ví dụ: 8GB" value={variant.ram} onChange={(event) => updateVariant(index, 'ram', event.target.value)} required /></label>
            <label>Bộ nhớ trong<input list="storage-presets" placeholder="Chọn hoặc nhập, ví dụ: 256GB" value={variant.storage} onChange={(event) => updateVariant(index, 'storage', event.target.value)} required /></label>
            <label>Màu sắc<input value={variant.color} onChange={(event) => updateVariant(index, 'color', event.target.value)} required /></label>
            <label>Giá nhập (VND)<input type="number" min="0" value={variant.costPrice} onChange={(event) => updateVariant(index, 'costPrice', event.target.value)} required /></label>
            <label>Giá bán (VND)<input type="number" min="0" value={variant.salePrice} onChange={(event) => updateVariant(index, 'salePrice', event.target.value)} required /></label>
            <label>Tồn kho<input type="number" min="0" step="1" value={variant.stock} onChange={(event) => updateVariant(index, 'stock', event.target.value)} required readOnly={isEditing} />{isEditing && <small className="field-help">Điều chỉnh tại trang Tồn kho.</small>}</label>
            <label className="checkbox-label"><input type="checkbox" checked={variant.isActive !== false} onChange={(event) => updateVariant(index, 'isActive', event.target.checked)} />Đang bán</label>
          </div>{form.variants.length > 1 && (!isEditing || !variant._id) && <button type="button" className="danger-link" onClick={() => removeVariant(index)}>Xóa biến thể này</button>}</fieldset>)}
        </section>
        <section className="panel form-stack">
          <h2>Ảnh sản phẩm</h2>
          <p className="field-help">Ảnh JPG, PNG hoặc WEBP, tối đa 5 MB mỗi ảnh. Cloudinary cần được cấu hình ở backend trước khi tải lên.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles([...event.target.files])} />
          {files.length > 0 && <p className="field-help">Đã chọn {files.length} ảnh, ảnh sẽ được tải lên khi lưu sản phẩm.</p>}
          {images.length > 0 && <div className="image-grid">{images.map((image) => <figure key={image._id}><img src={image.url} alt={image.alt || form.name} />{isEditing && <button type="button" onClick={() => deleteImage(image)}>Xóa ảnh</button>}</figure>)}</div>}
        </section>
        <button className="button button--large" disabled={saving}>{saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button>
      </form>
    </div>
  );
}
