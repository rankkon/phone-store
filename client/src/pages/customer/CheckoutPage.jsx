import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartApi, orderApi, voucherApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { isValidPersonName, isValidPhone, onlyDigits, onlyPersonName } from '../../utils/input';
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
  const [paymentMethod, setPaymentMethod] = useState('COD');
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
    event.preventDefault(); setError('');
    if (!isValidPersonName(address.recipientName)) { setError('Họ tên người nhận chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.'); return; }
    if (!isValidPhone(address.phone, { required: true })) { setError('Số điện thoại người nhận phải gồm 9–15 chữ số.'); return; }
    if (![address.province, address.district, address.ward].every((value) => value.trim().length >= 2) || address.detail.trim().length < 3) {
      setError('Vui lòng nhập đầy đủ địa chỉ nhận hàng hợp lệ.'); return;
    }
    setSubmitting(true);
    try {
      if (paymentMethod === 'VNPAY') {
        const response = await orderApi.createVnpayOrder({ shippingAddress: address, note, voucherCode: quote?.voucher?.code || '' });
        const { paymentUrl } = response.data.data;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error('Không nhận được liên kết thanh toán VNPay.');
        }
      } else {
        const response = await orderApi.create({ shippingAddress: address, note, voucherCode: quote?.voucher?.code || '', paymentMethod: 'COD' });
        navigate(`/orders/success/${response.data.data.orderCode}`, { replace: true, state: { order: response.data.data } });
      }
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSubmitting(false); }
  }

  if (loading) return <LoadingScreen />;
  const items = cart?.items || [];
  if (items.length === 0) return <section className="empty-store"><p>Giỏ hàng đang trống, không thể đặt hàng.</p><button className="button" onClick={() => navigate('/products')}>Xem điện thoại</button></section>;
  const pricing = quote?.pricing || { subtotal: cart.pricing.subtotal, discount: 0, shippingFee: 0, total: cart.pricing.subtotal };

  return (
    <section className="checkout-page"><div className="page-heading"><div><p className="eyebrow">THANH TOÁN</p><h1>Đặt hàng</h1></div></div><FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <form className="checkout-layout" onSubmit={submitOrder}><div className="form-stack panel"><h2>Thông tin nhận hàng</h2><div className="two-columns">
        <label>Họ tên người nhận<input value={address.recipientName} onChange={(event) => setAddress({ ...address, recipientName: onlyPersonName(event.target.value) })} minLength="2" maxLength="100" required /></label><label>Số điện thoại<input inputMode="numeric" pattern="[0-9]{9,15}" maxLength="15" value={address.phone} onChange={(event) => setAddress({ ...address, phone: onlyDigits(event.target.value) })} required /></label>
        <label>Tỉnh / thành phố<input value={address.province} onChange={(event) => setAddress({ ...address, province: event.target.value })} required /></label><label>Quận / huyện<input value={address.district} onChange={(event) => setAddress({ ...address, district: event.target.value })} required /></label>
        <label>Phường / xã<input value={address.ward} onChange={(event) => setAddress({ ...address, ward: event.target.value })} required /></label><label>Địa chỉ chi tiết<input value={address.detail} onChange={(event) => setAddress({ ...address, detail: event.target.value })} required /></label>
      </div><label>Ghi chú cho đơn hàng<textarea rows="3" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <h2>Phương thức thanh toán</h2>
      <div className="payment-choices" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', background: paymentMethod === 'COD' ? '#f5f9ff' : '#fff', borderColor: paymentMethod === 'COD' ? '#1a73e8' : '#ddd' }}>
          <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
          <div>
            <strong>COD</strong>
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#666' }}>Thanh toán tiền mặt khi nhận hàng</span>
          </div>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', background: paymentMethod === 'VNPAY' ? '#f5f9ff' : '#fff', borderColor: paymentMethod === 'VNPAY' ? '#1a73e8' : '#ddd' }}>
          <input type="radio" name="paymentMethod" value="VNPAY" checked={paymentMethod === 'VNPAY'} onChange={() => setPaymentMethod('VNPAY')} />
          <div>
            <strong>VNPay</strong>
            <span style={{ display: 'block', fontSize: '0.85rem', color: '#666' }}>Thanh toán trực tuyến qua thẻ ATM / tín dụng</span>
          </div>
        </label>
      </div>
      </div>
      <aside className="order-summary checkout-summary"><h2>Đơn hàng ({items.length})</h2>{items.map((item) => <p className="summary-item" key={item.variantId}><span>{item.product?.name || 'Sản phẩm'} × {item.quantity}</span><strong>{currency.format(item.lineTotal)}</strong></p>)}<div className="voucher-form"><input placeholder="Mã voucher" value={voucherCode} onChange={(event) => setVoucherCode(event.target.value.toUpperCase())} /><button type="button" onClick={applyVoucher}>Áp dụng</button></div>{quote?.voucher && <p className="voucher-applied">Đang dùng mã {quote.voucher.code}</p>}<div><span>Tạm tính</span><strong>{currency.format(pricing.subtotal)}</strong></div><div><span>Giảm giá</span><strong>−{currency.format(pricing.discount)}</strong></div><div><span>Phí vận chuyển</span><strong>{pricing.shippingFee === 0 ? 'Miễn phí' : currency.format(pricing.shippingFee)}</strong></div><div className="summary-total"><span>Tổng thanh toán</span><strong>{currency.format(pricing.total)}</strong></div>
      <button className="button button--large" disabled={submitting}>
        {submitting ? 'Đang tạo đơn...' : paymentMethod === 'VNPAY' ? 'Thanh toán qua VNPay' : 'Đặt hàng COD'}
      </button>
      </aside></form>
    </section>
  );
}
