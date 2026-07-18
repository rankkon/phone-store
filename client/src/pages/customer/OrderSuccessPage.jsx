import { Link, useLocation, useParams } from 'react-router-dom';
import { currency } from '../../utils/order';

export default function OrderSuccessPage() {
  const { orderCode } = useParams();
  const location = useLocation();
  const order = location.state?.order;
  return (
    <section className="success-page"><div className="success-icon">✓</div><p className="eyebrow">ĐẶT HÀNG THÀNH CÔNG</p><h1>Cảm ơn bạn đã mua sắm.</h1><p>Mã đơn hàng của bạn là <strong>{orderCode}</strong>. Chúng tôi sẽ xác nhận đơn trong thời gian sớm nhất.</p>{order && <p className="success-total">Tổng thanh toán: {currency.format(order.pricing.total)}</p>}<div className="button-row"><Link className="button" to={`/orders/${orderCode}`}>Xem chi tiết đơn</Link><Link className="button button--ghost" to="/products">Tiếp tục mua sắm</Link></div></section>
  );
}
