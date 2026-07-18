import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, orderApi, voucherApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { currency } from '../../utils/order';

const blankAddress = { recipientName: '', phone: '', province: '', district: '', ward: '', detail: '' };

export default function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [address, setAddress] = useState(blankAddress);
  const [note, setNote] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadCheckout() {
    setLoading(true);
    try {
      const [cartResponse, quoteResponse] = await Promise.all([cartApi.get(), voucherApi.validate('')]);
      setCart(cartResponse.data.data);
      setQuote(quoteResponse.data.data);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }

  useEffect(() => {
    setAddress({ ...blankAddress, ...(user?.address || {}), recipientName: user?.address?.recipientName || user?.fullName || '' });
    loadCheckout();
  }, [user]);

  async function applyVoucher() {
    setError(''); setMessage('');
    try {
      const response = await voucherApi.validate(voucherCode);
      setQuote(response.data.data);
      setMessage(response.data.message);
    } catch (requestError) { setQuote(null); setError(getApiError(requestError)); }
  }

  async function submitOrder(event) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      const response = await orderApi.create({ shippingAddress: address, note, voucherCode: quote?.voucher?.code || '', paymentMethod: 'COD' });
      navigate(`/orders/success/${response.data.data.orderCode}`, { replace: true, state: { order: response.data.data } });
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSubmitting(false); }
  }

  if (loading) return <LoadingScreen />;
  const items = cart?.items || [];
  if (items.length === 0) return <section className="empty-store"><p>Giỏ hàng đang trống, không thể đặt hàng.</p><button className="button" onClick={() => navigate('/products')}>Xem điện thoại</button></section>;
  const pricing = quote?.pricing || { subtotal: cart.pricing.subtotal, discount: 0, shippingFee: 0, total: cart.pricing.subtotal };

  return (
    <section className="checkout-page"><div className="page-heading"><div><p className="eyebrow">THANH TOÁN</p><h1>Đặt hàng</h1></div></div><FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <form className="checkout-layout" onSubmit={submitOrder}><div className="form-stack panel"><h2>Thông tin nhận hàng</h2><div className="two-columns">
        <label>Họ tên người nhận<input value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: event.target.value })} required /></label><label>Số điện thoại<input value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} required /></label>
        <label>Tỉnh / thành phố<input value={address.province} onChange={(event) => setAddress({ ...address, province: event.target.value })} required /></label><label>Quận / huyện<input value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} required /></label>
        <label>Phường / xã<input value={address.ward} onChange={(event) => setAddress({ ...address, ward: event.target.value })} required /></label><label>Địa chỉ chi tiết<input value={address.detail} onChange={(event) => setAddress({ ...address, detail: event.target.value })} required /></label>
      </div><label>Ghi chú cho đơn hàng<textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} /></label><h2>Phương thức thanh toán</h2><div className="payment-choice"><strong>COD</strong><span>Thanh toán khi nhận hàng</span></div></div>
      <aside className="order-summary checkout-summary"><h2>Đơn hàng ({items.length})</h2>{items.map((item) => <p className="summary-item" key={item.variantId}><span>{item.product?.name || 'Sản phẩm'} × {item.quantity}</span><strong>{currency.format(item.lineTotal)}</strong></p>)}<div className="voucher-form"><input placeholder="Mã voucher" value={voucherCode} onChange={(event) => setVoucherCode(event.target.value.toUpperCase())} /><button type="button" onClick={applyVoucher}>Áp dụng</button></div>{quote?.voucher && <p className="voucher-applied">Đang dùng mã {quote.voucher.code}</p>}<div><span>Tạm tính</span><strong>{currency.format(pricing.subtotal)}</strong></div><div><span>Giảm giá</span><strong>−{currency.format(pricing.discount)}</strong></div><div><span>Phí vận chuyển</span><strong>{pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(pricing.shippingFee)}</strong></div><div className="summary-total"><span>Tổng thanh toán</span><strong>{currency.format(pricing.total)}</strong></div><button className="button button--large" disabled={submitting}>{submitting ? 'Đang tạo đơn...' : 'Đặt hàng COD'}</button></aside></form>
    </section>
  );
}
