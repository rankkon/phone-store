import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../../api/store';
import { getApiError } from '../../api/http';
import ProductCard from '../../components/ProductCard';
import LoadingScreen from '../../components/LoadingScreen';
import FlashMessage from '../../components/FlashMessage';

const initialFilters = { search: '', brand: '', ram: '', storage: '', color: '', minPrice: '', maxPrice: '', inStock: false, sort: 'newest', page: 1, limit: 12 };
const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 100_000_000;
const PRICE_RANGE_STEP = 100_000;
const priceFormatter = new Intl.NumberFormat('vi-VN');

function formatPrice(value) {
  return `${priceFormatter.format(value)} đ`;
}

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
  const selectedMinPrice = Number(draft.minPrice || PRICE_RANGE_MIN);
  const selectedMaxPrice = Number(draft.maxPrice || PRICE_RANGE_MAX);
  const priceRangeStart = ((selectedMinPrice - PRICE_RANGE_MIN) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;
  const priceRangeWidth = ((selectedMaxPrice - selectedMinPrice) / (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) * 100;

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
    const timeoutId = window.setTimeout(() => {
      setError('');
      setFilters({ ...draft, page: 1 });
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [draft, isFilterPending]);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setDraft(initialFilters);
    setFilters(initialFilters);
  }

  function updatePriceRange(boundary, rawValue) {
    const nextValue = Number(rawValue);
    setDraft((current) => {
      const currentMin = Number(current.minPrice || PRICE_RANGE_MIN);
      const currentMax = Number(current.maxPrice || PRICE_RANGE_MAX);
      const minPrice = boundary === 'min' ? Math.min(nextValue, currentMax) : currentMin;
      const maxPrice = boundary === 'max' ? Math.max(nextValue, currentMin) : currentMax;
      return {
        ...current,
        minPrice: minPrice === PRICE_RANGE_MIN ? '' : String(minPrice),
        maxPrice: maxPrice === PRICE_RANGE_MAX ? '' : String(maxPrice),
      };
    });
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
          <div className="catalog-price-filter"><span>Khoảng giá</span><div className="catalog-price-slider" style={{ '--range-start': `${priceRangeStart}%`, '--range-width': `${priceRangeWidth}%` }}><div className="catalog-price-slider__track" aria-hidden="true" /><input type="range" min={PRICE_RANGE_MIN} max={PRICE_RANGE_MAX} step={PRICE_RANGE_STEP} value={selectedMinPrice} onChange={(event) => updatePriceRange('min', event.target.value)} aria-label="Giá tối thiểu" aria-valuetext={formatPrice(selectedMinPrice)} /><input type="range" min={PRICE_RANGE_MIN} max={PRICE_RANGE_MAX} step={PRICE_RANGE_STEP} value={selectedMaxPrice} onChange={(event) => updatePriceRange('max', event.target.value)} aria-label="Giá tối đa" aria-valuetext={selectedMaxPrice === PRICE_RANGE_MAX ? 'Không giới hạn' : formatPrice(selectedMaxPrice)} /></div><div className="catalog-price-filter__values"><span>Từ <strong>{formatPrice(selectedMinPrice)}</strong></span><span>Đến <strong>{selectedMaxPrice === PRICE_RANGE_MAX ? 'Không giới hạn' : formatPrice(selectedMaxPrice)}</strong></span></div></div>
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
