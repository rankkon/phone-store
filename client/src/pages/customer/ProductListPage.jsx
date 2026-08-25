import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../../api/store';
import { getApiError } from '../../api/http';
import ProductCard from '../../components/ProductCard';
import LoadingScreen from '../../components/LoadingScreen';
import FlashMessage from '../../components/FlashMessage';

const initialFilters = { search: '', brand: '', ram: '', storage: '', color: '', minPrice: '', maxPrice: '', inStock: false, sort: 'newest', page: 1, limit: 12 };
const pricePresets = [
  { label: 'Dưới 5 triệu', minPrice: '', maxPrice: '5000000' },
  { label: '5 – 10 triệu', minPrice: '5000000', maxPrice: '10000000' },
  { label: '10 – 20 triệu', minPrice: '10000000', maxPrice: '20000000' },
  { label: 'Từ 20 triệu', minPrice: '20000000', maxPrice: '' },
];

function filterKey({ search, brand, ram, storage, color, minPrice, maxPrice, inStock, sort }) {
  return JSON.stringify({ search, brand, ram, storage, color, minPrice, maxPrice, inStock, sort });
}

export default function ProductListPage() {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [ramOptions, setRamOptions] = useState([]);
  const [storageOptions, setStorageOptions] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const draftFilterKey = useMemo(() => filterKey(draft), [draft]);
  const appliedFilterKey = useMemo(() => filterKey(filters), [filters]);
  const isFilterPending = draftFilterKey !== appliedFilterKey;
  const invalidPriceRange = draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { ...filters, minPrice: filters.minPrice || undefined, maxPrice: filters.maxPrice || undefined, inStock: filters.inStock || undefined };
    catalogApi.list(params)
      .then((response) => {
        if (!active) return;
        setProducts(response.data.data);
        setBrands(response.data.filters.brands);
        setRamOptions(response.data.filters.ram || []);
        setStorageOptions(response.data.filters.storage || []);
        setColorOptions(response.data.filters.colors || []);
        setMeta(response.data.meta);
      })
      .catch((requestError) => active && setError(getApiError(requestError)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    if (!isFilterPending) return undefined;
    if (invalidPriceRange) {
      setError('Giá từ phải nhỏ hơn hoặc bằng giá đến.');
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setError('');
      setFilters({ ...draft, page: 1 });
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [draft, invalidPriceRange, isFilterPending]);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setDraft(initialFilters);
    setFilters(initialFilters);
  }

  function applyPricePreset(preset) {
    setDraft((current) => ({ ...current, minPrice: preset.minPrice, maxPrice: preset.maxPrice }));
  }

  function changePage(page) {
    if (isFilterPending) return;
    setFilters((current) => ({ ...current, page }));
    setDraft((current) => ({ ...current, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="catalog-page">
      <div className="page-heading">
        <div><p className="eyebrow">CỬA HÀNG</p><h1>Điện thoại</h1><p>Tìm cấu hình phù hợp với nhu cầu và ngân sách của bạn.</p></div>
      </div>
      <FlashMessage type="error">{error}</FlashMessage>
      <div className="catalog-layout">
        <aside className="catalog-filter-panel" aria-label="Bộ lọc sản phẩm">
          <div className="catalog-filter-panel__heading">
            <div><p className="eyebrow">BỘ LỌC</p><h2>Tìm sản phẩm</h2></div>
            <button type="button" className="text-button" onClick={clearFilters}>Xóa lọc</button>
          </div>
          <label className="catalog-filter-field">
            <span>Từ khóa</span>
            <input className="catalog-search" placeholder="Tên hoặc mã sản phẩm" value={draft.search} onChange={(event) => updateDraft('search', event.target.value)} />
          </label>
          <label className="catalog-filter-field"><span>Hãng</span><select value={draft.brand} onChange={(event) => updateDraft('brand', event.target.value)}><option value="">Tất cả hãng</option>{brands.map((brand) => <option key={brand._id} value={brand.slug}>{brand.name}</option>)}</select></label>
          <label className="catalog-filter-field"><span>RAM</span><select value={draft.ram} onChange={(event) => updateDraft('ram', event.target.value)}><option value="">Tất cả RAM</option>{ramOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="catalog-filter-field"><span>Bộ nhớ trong</span><select value={draft.storage} onChange={(event) => updateDraft('storage', event.target.value)}><option value="">Tất cả bộ nhớ</option>{storageOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="catalog-filter-field"><span>Màu sắc</span><select value={draft.color} onChange={(event) => updateDraft('color', event.target.value)}><option value="">Tất cả màu sắc</option>{colorOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <div className="catalog-price-filter"><span>Khoảng giá (VND)</span><div className="catalog-price-filter__inputs"><label>Từ<input type="number" inputMode="numeric" min="0" step="100000" placeholder="0" value={draft.minPrice} onChange={(event) => updateDraft('minPrice', event.target.value)} /></label><label>Đến<input type="number" inputMode="numeric" min="0" step="100000" placeholder="Không giới hạn" value={draft.maxPrice} onChange={(event) => updateDraft('maxPrice', event.target.value)} /></label></div><div className="catalog-price-presets">{pricePresets.map((preset) => <button type="button" key={preset.label} className={draft.minPrice === preset.minPrice && draft.maxPrice === preset.maxPrice ? 'catalog-price-preset catalog-price-preset--active' : 'catalog-price-preset'} onClick={() => applyPricePreset(preset)} aria-pressed={draft.minPrice === preset.minPrice && draft.maxPrice === preset.maxPrice}>{preset.label}</button>)}</div>{invalidPriceRange && <small className="catalog-price-error">Khoảng giá chưa hợp lệ.</small>}</div>
          <label className="checkbox-label catalog-stock-filter"><input type="checkbox" checked={draft.inStock} onChange={(event) => updateDraft('inStock', event.target.checked)} />Chỉ hiển thị sản phẩm còn hàng</label>
          <p className="catalog-filter-help" aria-live="polite">{isFilterPending ? <><span className="spinner" />Đang tìm kiếm...</> : 'Kết quả được cập nhật tự động.'}</p>
        </aside>

        <div className="catalog-results">
          <div className="catalog-results__toolbar">
            <p className="catalog-total">Tìm thấy <strong>{meta.total}</strong> sản phẩm</p>
            <label className="catalog-sort"><span>Sắp xếp</span><select value={draft.sort} onChange={(event) => updateDraft('sort', event.target.value)}><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select></label>
          </div>
          {isFilterPending && <p className="catalog-filtering"><span className="spinner" />Đang tìm kiếm...</p>}
          {loading ? <LoadingScreen /> : <>
            {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <p className="empty-store">Không có sản phẩm phù hợp với bộ lọc này.</p>}
            {meta.totalPages > 1 && <nav className="pagination" aria-label="Phân trang"><button disabled={meta.page === 1 || isFilterPending} onClick={() => changePage(meta.page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={meta.page === meta.totalPages || isFilterPending} onClick={() => changePage(meta.page + 1)}>Sau →</button></nav>}
          </>}
        </div>
      </div>
    </section>
  );
}
