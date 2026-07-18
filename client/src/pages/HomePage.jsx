import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../api/store';
import ProductCard from '../components/ProductCard';
import { getApiError } from '../api/http';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    catalogApi.list({ limit: 4, sort: 'newest' })
      .then((response) => setProducts(response.data.data))
      .catch((requestError) => setError(getApiError(requestError)));
  }, []);

  return (
    <>
      <section className="store-hero">
        <div>
          <p className="eyebrow">PHONE STORE</p>
          <h1>Chọn chiếc điện thoại hợp với bạn.</h1>
          <p>Khám phá điện thoại chính hãng, so sánh các phiên bản RAM, bộ nhớ trong và màu sắc trước khi đặt hàng.</p>
          <div className="button-row"><Link className="button" to="/products">Mua sắm ngay</Link><Link className="button button--ghost" to="/register">Tạo tài khoản</Link></div>
        </div>
        <div className="store-hero__visual"><span>NEW</span><strong>Điện thoại<br />chính hãng.</strong><p>Chọn đúng cấu hình, biết rõ giá và tồn kho.</p></div>
      </section>
      <section className="home-products">
        <div className="section-heading"><div><p className="eyebrow">SẢN PHẨM MỚI</p><h2>Thiết bị vừa về</h2></div><Link to="/products">Xem tất cả →</Link></div>
        {error && <p className="inline-error">{error}</p>}
        {products.length > 0 ? <div className="product-grid">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> : !error && <p className="empty-store">Chưa có sản phẩm. Admin có thể thêm sản phẩm trong khu vực quản trị.</p>}
      </section>
    </>
  );
}
