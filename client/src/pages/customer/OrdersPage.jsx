import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/store';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, formatDate, orderStatusLabels } from '../../utils/order';

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [params, setParams] = useState({ search: '', status: '', page: 1 });
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    orderApi.listMine(params)
      .then((response) => { setOrders(response.data.data); setMeta(response.data.meta); })
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, [params]);

  function searchOrders(event) {
    event.preventDefault(); setParams({ ...params, search, page: 1 });
  }

  if (loading) return <LoadingScreen />;
  return (
    <section className="orders-page"><div className="page-heading"><div><p className="eyebrow">TÀI KHOẢN</p><h1>Đơn hàng của tôi</h1></div></div><FlashMessage type="error">{error}</FlashMessage>
      <form className="order-filters" onSubmit={searchOrders}><input placeholder="Tìm theo mã đơn" value={search} onChange={(event) => setSearch(event.target.value)} /><select value={params.status} onChange={(event) => setParams({ ...params, status: event.target.value, page: 1 })}><option value="">Tất cả trạng thái</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button">Tìm đơn</button></form>
      {orders.length === 0 ? <div className="empty-store"><p>Bạn chưa có đơn hàng nào.</p><Link className="button" to="/products">Mua sắm ngay</Link></div> : <div className="order-list">{orders.map((order) => <article className="order-card" key={order._id}><div><p className="order-code">{order.orderCode}</p><p>{formatDate(order.createdAt)} · {order.items.length} sản phẩm</p></div><div><span className="status status--active">{orderStatusLabels[order.status]}</span><strong>{currency.format(order.pricing.total)}</strong></div><Link to={`/orders/${order.orderCode}`}>Xem chi tiết →</Link></article>)}</div>}
      {meta.totalPages > 1 && <nav className="pagination"><button disabled={meta.page === 1} onClick={() => setParams({ ...params, page: meta.page - 1 })}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={meta.page === meta.totalPages} onClick={() => setParams({ ...params, page: meta.page + 1 })}>Sau →</button></nav>}
    </section>
  );
}
