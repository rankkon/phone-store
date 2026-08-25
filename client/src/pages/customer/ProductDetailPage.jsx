import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogApi, cartApi } from '../../api/store';
import { getApiError } from '../../api/http';
import LoadingScreen from '../../components/LoadingScreen';
import FlashMessage from '../../components/FlashMessage';
import { useAuth } from '../../context/AuthContext';
import ProductReviews from '../../components/ProductReviews';
import FavoriteButton from '../../components/FavoriteButton';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    catalogApi.getBySlug(slug)
      .then((response) => {
        const nextProduct = response.data.data;
        setProduct(nextProduct);
        setVariantId(nextProduct.variants.find((variant) => variant.stock > 0)?._id || nextProduct.variants[0]?._id || '');
      })
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingScreen />;
  if (!product) return <section><FlashMessage type="error">{error || 'Không tìm thấy sản phẩm.'}</FlashMessage><Link className="button" to="/products">Về danh sách sản phẩm</Link></section>;
  const selectedVariant = product.variants.find((variant) => variant._id === variantId);

  async function addToCart() {
    setError(''); setMessage('');
    if (!user) { navigate('/login', { state: { from: `/products/${slug}` } }); return; }
    if (user.role !== 'CUSTOMER') { setError('Chỉ tài khoản Customer mới có thể mua hàng.'); return; }
    if (!selectedVariant || selectedVariant.stock <= 0) { setError('Vui lòng chọn biến thể còn hàng.'); return; }
    setSubmitting(true);
    try {
      await cartApi.addItem({ productId: product._id, variantId: selectedVariant._id, quantity });
      setMessage('Đã thêm vào giỏ hàng.');
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSubmitting(false); }
  }

  return (
    <section className="product-detail">
      <Link className="back-link" to="/products">← Quay lại cửa hàng</Link>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="product-detail__grid">
        <div className="product-gallery">{product.images.length > 0 ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} /> : <span>PHONE</span>}</div>
        <div className="product-info"><div className="product-info__title"><div><p className="product-brand">{product.brandId.name}</p><h1>{product.name}</h1></div><FavoriteButton productId={product._id} className="favorite-button--detail" /></div><p className="model-code">Mã sản phẩm: {product.modelCode}</p><p className="product-description">{product.description}</p>
          <div className="variant-picker"><h2>Chọn phiên bản</h2>{product.variants.map((variant) => <button key={variant._id} className={variant._id === variantId ? 'variant-option variant-option--selected' : 'variant-option'} disabled={variant.stock <= 0} onClick={() => { setVariantId(variant._id); setQuantity(1); }}><span>{variant.ram} · {variant.storage} · {variant.color}</span><strong>{currency.format(variant.salePrice)}</strong>{variant.stock <= 0 && <small>Hết hàng</small>}</button>)}</div>
          {selectedVariant && <div className="purchase-row"><label>Số lượng<input type="number" min="1" max={selectedVariant.stock} value={quantity} onChange={(event) => setQuantity(Math.min(selectedVariant.stock, Math.max(1, Number(event.target.value) || 1)))} /></label><div><p className="detail-price">{currency.format(selectedVariant.salePrice)}</p><p className={selectedVariant.stock > 0 ? 'stock stock--available' : 'stock'}>{selectedVariant.stock > 0 ? `Còn ${selectedVariant.stock} sản phẩm` : 'Hết hàng'}</p></div></div>}
          <button className="button button--large" disabled={submitting || !selectedVariant || selectedVariant.stock <= 0} onClick={addToCart}>{submitting ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}</button>
        </div>
      </div>
      <section className="specifications"><h2>Thông số kỹ thuật</h2><dl>{Object.entries({ Chip: product.specifications.chip, Pin: product.specifications.battery, 'Màn hình': product.specifications.screen, 'Camera sau': product.specifications.rearCamera, 'Camera trước': product.specifications.frontCamera, 'Hệ điều hành': product.specifications.operatingSystem }).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <ProductReviews productId={product._id} />
    </section>
  );
}
