import { useEffect, useState } from 'react';
import { catalogApi } from '../../api/store';
import { getApiError } from '../../api/http';
import ProductCard from '../../components/ProductCard';
import LoadingScreen from '../../components/LoadingScreen';
import FlashMessage from '../../components/FlashMessage';

const initialFilters = { search: '', brand: '', ram: '', storage: '', color: '', inStock: false, sort: 'newest', page: 1, limit: 12 };

export default function ProductListPage() {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { ...filters, inStock: filters.inStock || undefined };
    catalogApi.list(params)
      .then((response) => {
        if (!active) return;
        setProducts(response.data.data);
        setBrands(response.data.filters.brands);
        setMeta(response.data.meta);
      })
      .catch((requestError) => active && setError(getApiError(requestError)))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters]);

  function applyFilters(event) {
    event.preventDefault();
    setError('');
    setFilters({ ...draft, page: 1 });
  }

  function clearFilters() {
    setDraft(initialFilters);
    setFilters(initialFilters);
  }

  function changePage(page) {
    setFilters((current) => ({ ...current, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <section className="catalog-page">
      <div className="page-heading"><div><p className="eyebrow">CỬA HÀNG</p><h1>Điện thoại</h1><p>Tìm cấu hình phù hợp với nhu cầu và ngân sách của bạn.</p></div></div>
      <form className="catalog-filters" onSubmit={applyFilters}>
        <input className="catalog-search" placeholder="Tìm theo tên hoặc mã sản phẩm" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} />
        <select value={draft.brand} onChange={(event) => setDraft({ ...draft, brand: event.target.value })}><option value="">Tất cả hãng</option>{brands.map((brand) => <option key={brand._id} value={brand.slug}>{brand.name}</option>)}</select>
        <input placeholder="RAM, ví dụ: 8GB" value={draft.ram} onChange={(event) => setDraft({ ...draft, ram: event.target.value })} />
        <input placeholder="Bộ nhớ, ví dụ: 256GB" value={draft.storage} onChange={(event) => setDraft({ ...draft, storage: event.target.value })} />
        <input placeholder="Màu sắc" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        <select value={draft.sort} onChange={(event) => setDraft({ ...draft, sort: event.target.value })}><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select>
        <label className="checkbox-label"><input type="checkbox" checked={draft.inStock} onChange={(event) => setDraft({ ...draft, inStock: event.target.checked })} />Chỉ còn hàng</label>
        <div className="button-row"><button className="button">Áp dụng</button><button type="button" className="button button--ghost" onClick={clearFilters}>Xóa lọc</button></div>
      </form>
      <FlashMessage type="error">{error}</FlashMessage>
      {loading ? <LoadingScreen /> : <>
        <p className="catalog-total">Tìm thấy <strong>{meta.total}</strong> sản phẩm</p>
        {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : <p className="empty-store">Không có sản phẩm phù hợp với bộ lọc này.</p>}
        {meta.totalPages > 1 && <nav className="pagination" aria-label="Phân trang"><button disabled={meta.page === 1} onClick={() => changePage(meta.page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={meta.page === meta.totalPages} onClick={() => changePage(meta.page + 1)}>Sau →</button></nav>}
      </>}
    </section>
  );
}
