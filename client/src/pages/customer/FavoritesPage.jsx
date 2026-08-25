import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi, favoriteApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { useFavorites } from '../../context/FavoritesContext';
import { currency } from '../../utils/order';

function priceMessage(change) {
  if (change === null) return 'Sản phẩm hiện không còn phiên bản đang bán.';
  if (change < 0) return `Đã giảm ${currency.format(Math.abs(change))} kể từ khi lưu`;
  if (change > 0) return `Đã tăng ${currency.format(change)} kể từ khi lưu`;
  return 'Giá không thay đổi kể từ khi lưu';
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { refreshFavorites } = useFavorites();

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const response = await favoriteApi.list();
      const items = response.data.data || [];
      setFavorites(items);
      setSelectedVariants(Object.fromEntries(items.map((item) => [item._id, item.product?.variants.find((variant) => variant.stock > 0)?._id || ''])));
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const activeFavorites = useMemo(() => favorites.filter((item) => item.product), [favorites]);

  async function removeFavorite(item) {
    setWorkingId(item._id); setError(''); setMessage('');
    try {
      await favoriteApi.remove(item.productId);
      setFavorites((current) => current.filter((candidate) => candidate._id !== item._id));
      await refreshFavorites();
      setMessage('Đã xóa sản phẩm khỏi danh sách yêu thích.');
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  async function moveToCart(item) {
    const variantId = selectedVariants[item._id];
    if (!variantId) { setError('Sản phẩm này hiện không còn phiên bản để thêm vào giỏ.'); return; }
    setWorkingId(item._id); setError(''); setMessage('');
    try {
      await cartApi.addItem({ productId: item.product._id, variantId, quantity: 1 });
      setMessage(`Đã thêm ${item.product.name} vào giỏ hàng.`);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  if (loading) return <LoadingScreen />;
  return (
    <section className="favorites-page">
      <div className="page-heading"><div><p className="eyebrow">DANH SÁCH CÁ NHÂN</p><h1>Sản phẩm yêu thích</h1><p>Theo dõi thay đổi giá và chuyển nhanh phiên bản bạn muốn vào giỏ hàng.</p></div><span className="role-chip">{activeFavorites.length} sản phẩm</span></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      {favorites.length === 0 ? <div className="empty-store"><p>Bạn chưa lưu sản phẩm nào.</p><Link className="button" to="/products">Khám phá điện thoại</Link></div> : <div className="favorites-grid">{favorites.map((item) => {
        const { product } = item;
        if (!product) return <article className="favorite-card favorite-card--unavailable" key={item._id}><p>Sản phẩm này không còn tồn tại.</p><button type="button" className="button button--ghost" onClick={() => removeFavorite(item)} disabled={workingId === item._id}>Xóa khỏi danh sách</button></article>;
        const availableVariants = product.variants.filter((variant) => variant.stock > 0);
        const image = product.images[0];
        return <article className="favorite-card" key={item._id}>
          <Link className="favorite-card__image" to={`/products/${product.slug}`}>{image ? <img src={image.url} alt={image.alt || product.name} /> : <span>PHONE</span>}</Link>
          <div className="favorite-card__body"><p className="product-brand">{product.brand?.name || 'PHONE STORE'}</p><h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2><p className="favorite-card__price">{item.currentPrice === null ? 'Tạm ngừng kinh doanh' : `Từ ${currency.format(item.currentPrice)}`}</p><p className={item.priceChange < 0 ? 'price-tracker price-tracker--down' : item.priceChange > 0 ? 'price-tracker price-tracker--up' : 'price-tracker'}>{priceMessage(item.priceChange)}</p><small>Giá khi lưu: {currency.format(item.savedPrice)}</small>
          {availableVariants.length > 0 && <label className="favorite-card__variant"><span>Phiên bản chuyển vào giỏ</span><select value={selectedVariants[item._id] || ''} onChange={(event) => setSelectedVariants({ ...selectedVariants, [item._id]: event.target.value })}>{availableVariants.map((variant) => <option key={variant._id} value={variant._id}>{variant.ram} · {variant.storage} · {variant.color} — {currency.format(variant.salePrice)}</option>)}</select></label>}
          <div className="favorite-card__actions"><button type="button" className="button button--secondary" onClick={() => moveToCart(item)} disabled={workingId === item._id || availableVariants.length === 0}>{workingId === item._id ? 'Đang xử lý...' : 'Thêm vào giỏ'}</button><button type="button" className="button button--ghost" onClick={() => removeFavorite(item)} disabled={workingId === item._id}>Bỏ yêu thích</button></div></div>
        </article>;
      })}</div>}
    </section>
  );
}
