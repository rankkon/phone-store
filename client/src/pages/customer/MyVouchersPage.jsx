import { useEffect, useState } from 'react';
import { voucherApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

function voucherBenefit(voucher) {
  return voucher.type === 'PERCENT' ? `Giảm ${voucher.value}%` : `Giảm ${currency.format(voucher.value)}`;
}

export default function MyVouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    voucherApi.available()
      .then((response) => setVouchers(response.data.data))
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, []);

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Đã sao chép mã ${code}.`);
    } catch {
      setError('Không thể sao chép mã. Bạn có thể tự nhập mã khi thanh toán.');
    }
  }

  if (loading) return <LoadingScreen />;
  return (
    <section className="voucher-wallet">
      <div className="page-heading"><div><p className="eyebrow">VOUCHER WALLET</p><h1>Ưu đãi của tôi</h1><p>Các mã đang hoạt động có thể áp dụng khi thanh toán, nếu đơn hàng đạt điều kiện tối thiểu.</p></div></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="voucher-wallet__grid">
        {vouchers.map((voucher) => <article className="voucher-card" key={voucher._id}><div><p className="voucher-card__benefit">{voucherBenefit(voucher)}</p><h2>{voucher.code}</h2><p>Đơn tối thiểu: {currency.format(voucher.minOrderValue)}</p>{voucher.maxDiscount !== null && <p>Giảm tối đa: {currency.format(voucher.maxDiscount)}</p>}<p>Hạn dùng: {new Date(voucher.endAt).toLocaleDateString('vi-VN')}</p></div><button className="button button--ghost" onClick={() => copyCode(voucher.code)}>Sao chép mã</button></article>)}
        {vouchers.length === 0 && <p className="empty-store panel">Hiện chưa có voucher khả dụng.</p>}
      </div>
    </section>
  );
}
