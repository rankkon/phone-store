import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency } from '../../utils/order';

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingVariant, setWorkingVariant] = useState('');
  const [error, setError] = useState('');

  async function loadCart() {
    setLoading(true);
    try { const response = await cartApi.get(); setCart(response.data.data); } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }

  useEffect(() => { loadCart(); }, []);

  async function updateQuantity(item, quantity) {
    setWorkingVariant(item.variantId); setError('');
    try { const response = await cartApi.updateItem(item.variantId, quantity); setCart(response.data.data); } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingVariant(''); }
  }

  async function removeItem(item) {
    setWorkingVariant(item.variantId); setError('');
    try { const response = await cartApi.removeItem(item.variantId); setCart(response.data.data); } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingVariant(''); }
  }

  async function clearAll() {
    setError('');
    try { const response = await cartApi.clear(); setCart(response.data.data); } catch (requestError) { setError(getApiError(requestError)); }
  }

  if (loading) return <LoadingScreen />;
  const items = cart?.items || [];
  return (
    <section className="cart-page">
      <div className="page-heading"><div><p className="eyebrow">GIỎ HÀNG</p><h1>Giỏ hàng của bạn</h1></div>{items.length > 0 && <button className="text-button text-button--danger" onClick={clearAll}>Xóa tất cả</button>}</div>
      <FlashMessage type="error">{error}</FlashMessage>
      {items.length === 0 ? <div className="empty-store"><p>Giỏ hàng đang trống.</p><Link className="button" to="/products">Xem điện thoại</Link></div> : <div className="cart-layout"><section className="cart-items">
        {items.map((item) => <article className="cart-item" key={item.variantId}>
          <Link className="cart-item__image" to={`/products/${item.product?.slug}`}>{item.product?.imageUrl ? <img src={item.product.imageUrl} alt="" /> : <span>PHONE</span>}</Link>
          <div className="cart-item__info"><h2><Link to={`/products/${item.product?.slug}`}>{item.product?.name || 'Sản phẩm không còn tồn tại'}</Link></h2>{item.variant && <p>{item.variant.ram} · {item.variant.storage} · {item.variant.color}</p>}{!item.available && <p className="inline-error">Biến thể này không còn bán hoặc đã hết hàng.</p>}<button className="text-button text-button--danger" disabled={workingVariant === item.variantId} onClick={() => removeItem(item)}>Xóa</button></div>
          <div className="quantity-control"><button disabled={item.quantity <= 1 || workingVariant === item.variantId} onClick={() => updateQuantity(item, item.quantity - 1)}>−</button><span>{item.quantity}</span><button disabled={!item.available || item.quantity >= item.variant.stock || workingVariant === item.variantId} onClick={() => updateQuantity(item, item.quantity + 1)}>+</button></div>
          <strong className="cart-item__total">{currency.format(item.lineTotal)}</strong>
        </article>)}
      </section><aside className="order-summary"><h2>Tóm tắt đơn hàng</h2><div><span>Tạm tính</span><strong>{currency.format(cart.pricing.subtotal)}</strong></div><p>Phí vận chuyển và voucher sẽ được tính ở bước đặt hàng.</p><Link className="button button--large" to="/checkout">Tiến hành đặt hàng</Link></aside></div>}
    </section>
  );
}
