import { useEffect, useMemo, useState } from 'react';
import { catalogApi } from '../../api/store';
import { getApiError } from '../../api/http';
import ProductCard from '../../components/ProductCard';
import LoadingScreen from '../../components/LoadingScreen';
import FlashMessage from '../../components/FlashMessage';

const initialFilters = { search: '', brand: '', ram: '', storage: '', color: '', inStock: false, sort: 'newest', page: 1, limit: 12 };

function filterKey({ search, brand, ram, storage, color, inStock, sort }) {
  return JSON.stringify({ search, brand, ram, storage, color, inStock, sort });
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { ...filters, inStock: filters.inStock || undefined };
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
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [draft, isFilterPending]);

  function clearFilters() {
    setDraft(initialFilters);
    setFilters(initialFilters);
  }

  function changePage(page) {
    if (isFilterPending) return;
    setFilters((current) => ({ ...current, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="catalog-page">
      <div className="page-heading"><div><p className="eyebrow">CỬA HÀNG</p><h1>Điện thoại</h1><p>Tìm cấu hình phù hợp với nhu cầu và ngân sách của bạn.</p></div></div>
      <div className="catalog-filters">
        <input className="catalog-search" placeholder="Tìm theo tên hoặc mã sản phẩm" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} />
        <select value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })}><option value="">Tất cả hãng</option>{brands.map((brand) => <option key={brand._id} value={brand.slug}>{brand.name}</option>)}</select>
        <select value={draft.ram} onChange={(event) => setDraft({ ...draft, ram: event.target.value })}><option value="">Tất cả RAM</option>{ramOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={draft.storage} onChange={(event) => setDraft({ ...draft, storage: event.target.value })}><option value="">Tất cả bộ nhớ</option>{storageOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}><option value="">Tất cả màu sắc</option>{colorOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })}><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select>
        <label className="checkbox-label"><input type="checkbox" checked={draft.inStock} onChange={(event) => setDraft({ ...draft, inStock: event.target.checked })} />Chỉ còn hàng</label>
        <div className="button-row"><button type="button" className="button button--ghost" onClick={clearFilters}>Xóa lọc</button></div>
      </div>
      {isFilterPending && <p className="catalog-filtering">Đang chờ dừng thao tác để áp dụng bộ lọc…</p>}
      <FlashMessage type="error">{error}</FlashMessage>
      {loading ? <LoadingScreen /> : <>
        <p className="catalog-total">Tìm thấy <strong>{meta.total}</strong> sản phẩm</p>
        {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <p className="empty-store">Không có sản phẩm phù hợp với bộ lọc này.</p>}
        {meta.totalPages > 1 && <nav className="pagination" aria-label="Phân trang"><button disabled={meta.page === 1 || isFilterPending} onClick={() => changePage(meta.page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={meta.page === meta.totalPages || isFilterPending} onClick={() => changePage(meta.page + 1)}>Sau →</button></nav>}
      </>}
    </section>
  );
}
