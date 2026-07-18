import { Link } from 'react-router-dom';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

export default function ProductCard({ product }) {
  const prices = product.variants.map((variant) => variant.price);
  const lowestPrice = Math.min(...prices);
  const totalStock = product.variants.reduce((total, variant) => total + variant.stock, 0);
  const image = product.images[0];

  return (
    <article className="product-card">
      <Link className="product-image" to={`/products/${product.slug}`}>
        {image ? <img src={image.url} alt={image.alt || product.name} /> : <span>PHONE</span>}
      </Link>
      <div className="product-card__body">
        <p className="product-brand">{product.brandId.name}</p>
        <h3><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p className="product-price">Từ {currency.format(lowestPrice)}</p>
        <p className={totalStock > 0 ? 'stock stock--available' : 'stock'}>{totalStock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}</p>
      </div>
    </article>
  );
}
