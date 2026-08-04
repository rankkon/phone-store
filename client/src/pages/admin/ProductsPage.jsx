import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadProducts() {
    setLoading(true);
    try { const response = await productApi.list(); setProducts(response.data.data); } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }

  useEffect(() => { loadProducts(); }, []);
  async function toggleStatus(product) {
    try { await productApi.setStatus(product._id, !product.isActive); await loadProducts(); } catch (requestError) { setError(getApiError(requestError)); }
  }

  if (loading) return <LoadingScreen />;
  return (
    <div className="admin-page">
      <div className="page-heading"><div><p className="eyebrow">CATALOG</p><h1>Sản phẩm</h1><p>Giá và tồn kho được quản lý theo từng biến thể.</p></div><Link className="button" to="/admin/products/new">+ Thêm sản phẩm</Link></div>
      <FlashMessage type="error">{error}</FlashMessage>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Hãng</th><th>Biến thể</th><th>Giá từ</th><th>Trạng thái</th><th /></tr></thead><tbody>
        {products.map((product) => {
          const prices = product.variants.map((variant) => variant.salePrice);
          return <tr key={product._id}><td><strong>{product.name}</strong><small>{product.modelCode}</small></td><td>{product.brandId?.name || '—'}</td><td>{product.variants.length}</td><td>{currency.format(Math.min(...prices))}</td><td><span className={product.isActive ? 'status status--active' : 'status'}>{product.isActive ? 'Đang hiện' : 'Đang ẩn'}</span></td><td className="table-actions"><Link to={`/admin/products/${product._id}/edit`}>Sửa</Link><button onClick={() => toggleStatus(product)}>{product.isActive ? 'Ẩn' : 'Hiện'}</button></td></tr>;
        })}
        {products.length === 0 && <tr><td colSpan="6" className="empty-cell">Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên.</td></tr>}
      </tbody></table></div></section>
    </div>
  );
}
