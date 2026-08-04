import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../api/store';
import { getApiError } from '../api/http';
import { useAuth } from '../context/AuthContext';
import FlashMessage from './FlashMessage';

const emptySummary = { total: 0, average: 0, breakdown: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 })) };

function Stars({ rating }) {
  return <span className="review-stars" aria-label={`${rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= Math.round(rating) ? 'review-star--filled' : ''}>★</span>)}</span>;
}

export default function ProductReviews({ productId }) {
  const { user } = useAuth();
  const canReview = user?.role === 'CUSTOMER' && user.isEmailVerified;
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [myReview, setMyReview] = useState(null);
  const [myReviewLoading, setMyReviewLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadReviews() {
    setLoading(true);
    try {
      const response = await reviewApi.list({ productId, ...(filter === 'ALL' ? {} : { rating: filter }), page, limit: 10 });
      setReviews(response.data.data);
      setSummary(response.data.summary);
      setMeta(response.data.meta);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadMyReview() {
    if (!canReview) {
      setMyReview(null);
      setIsEditing(false);
      setMyReviewLoading(false);
      return;
    }
    setMyReviewLoading(true);
    try {
      const response = await reviewApi.mine(productId);
      setMyReview(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setMyReviewLoading(false);
    }
  }

  useEffect(() => { loadReviews(); }, [productId, filter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMyReview(); }, [productId, user?._id, user?.role, user?.isEmailVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseFilter(nextFilter) {
    setFilter(nextFilter);
    setPage(1);
  }

  function startEditing(review) {
    setForm({ rating: review.rating, comment: review.comment });
    setMessage('');
    setError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setForm({ rating: myReview?.rating || 5, comment: myReview?.comment || '' });
    setIsEditing(false);
  }

  async function submitReview(event) {
    event.preventDefault();
    setError(''); setMessage(''); setSubmitting(true);
    try {
      const response = myReview
        ? await reviewApi.update(myReview._id, form)
        : await reviewApi.create({ productId, ...form });
      setMyReview(response.data.data);
      setMessage(response.data.message);
      setIsEditing(false);
      setPage(1);
      await loadReviews();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  const showReviewForm = canReview && !myReviewLoading && (!myReview || isEditing);

  return (
    <section className="product-reviews">
      <div className="section-heading"><div><p className="eyebrow">PHẢN HỒI KHÁCH HÀNG</p><h2>Đánh giá sản phẩm</h2></div></div>
      <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
      <div className="review-summary panel">
        <div className="review-summary__score"><strong>{summary.average.toFixed(1)}</strong><span>/ 5</span><Stars rating={summary.average} /><p>{summary.total} đánh giá</p></div>
        <div className="review-summary__filters">
          <button className={filter === 'ALL' ? 'review-filter review-filter--active' : 'review-filter'} onClick={() => chooseFilter('ALL')}>Tất cả <small>{summary.total}</small></button>
          {summary.breakdown.map((item) => <button key={item.rating} className={Number(filter) === item.rating ? 'review-filter review-filter--active' : 'review-filter'} onClick={() => chooseFilter(item.rating)}>{item.rating} sao <Stars rating={item.rating} /><small>{item.count}</small></button>)}
        </div>
      </div>

      {showReviewForm && <form className="review-form panel form-stack" onSubmit={submitReview}>
        <h3>{isEditing ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}</h3>
        <p className="form-help">Mỗi tài khoản chỉ có một đánh giá trên mỗi sản phẩm.</p>
        <div><p className="review-form__label">Số sao</p><div className="review-rating-picker">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" className={star <= form.rating ? 'review-star-button review-star-button--active' : 'review-star-button'} onClick={() => setForm({ ...form, rating: star })} aria-label={`${star} sao`}>★</button>)}</div></div>
        <label>Nhận xét<textarea rows="4" minLength="2" maxLength="1000" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này" required /></label>
        <div className="review-form__actions"><button className="button" disabled={submitting}>{submitting ? 'Đang gửi...' : isEditing ? 'Lưu thay đổi' : 'Gửi đánh giá'}</button>{isEditing && <button type="button" className="button button--secondary" onClick={cancelEditing} disabled={submitting}>Hủy</button>}</div>
      </form>}
      {canReview && myReview && !isEditing && <p className="review-notice panel">Bạn đã đánh giá sản phẩm này. Nhấn biểu tượng bút chì trên đánh giá của bạn để chỉnh sửa.</p>}
      {!user && <p className="review-notice panel">Vui lòng <Link to="/login">đăng nhập</Link> để viết đánh giá.</p>}
      {user?.role === 'CUSTOMER' && !user.isEmailVerified && <p className="review-notice panel">Vui lòng <Link to="/profile">xác minh email trong hồ sơ</Link> để viết đánh giá.</p>}

      <div className="review-list">
        {loading && <p className="empty-store">Đang tải đánh giá...</p>}
        {!loading && reviews.map((review) => {
          const isOwnReview = String(review.user?._id) === String(user?._id);
          return <article className="review-card" key={review._id}><div className="review-card__heading"><div><strong>{review.user.fullName}</strong><Stars rating={review.rating} /></div><div className="review-card__tools"><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</time>{isOwnReview && <button type="button" className="review-edit-button" onClick={() => startEditing(review)} aria-label="Chỉnh sửa đánh giá" title="Chỉnh sửa đánh giá">✎</button>}</div></div><p>{review.comment}</p></article>;
        })}
        {!loading && reviews.length === 0 && <p className="empty-store">Chưa có đánh giá {filter === 'ALL' ? 'nào' : ` ${filter} sao`}.</p>}
      </div>
      {meta.totalPages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div>}
    </section>
  );
}
