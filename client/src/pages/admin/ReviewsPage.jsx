import { useCallback, useEffect, useState } from 'react';
import { reviewAdminApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';

function Stars({ rating }) {
  return <span className="review-stars" aria-label={`${rating} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= rating ? 'review-star--filled' : ''}>★</span>)}</span>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [reply, setReply] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reviewAdminApi.list({ search: search.trim() || undefined, visibility, rating: rating || undefined, page, limit: 10 });
      setReviews(response.data.data);
      setMeta(response.data.meta);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }, [page, rating, search, visibility]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  async function toggleVisibility(review) {
    const note = review.isVisible ? 'Ẩn do cần kiểm duyệt lại nội dung.' : 'Đánh giá đã được kiểm duyệt và hiển thị lại.';
    setWorkingId(review._id); setError(''); setMessage('');
    try {
      const response = await reviewAdminApi.setVisibility(review._id, !review.isVisible, note);
      setReviews((current) => current.map((item) => item._id === review._id ? response.data.data : item));
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  async function submitReply(event) {
    event.preventDefault();
    if (!replyingTo) return;
    setWorkingId(replyingTo._id); setError(''); setMessage('');
    try {
      const response = await reviewAdminApi.reply(replyingTo._id, reply);
      setReviews((current) => current.map((item) => item._id === replyingTo._id ? response.data.data : item));
      setReplyingTo(null); setReply('');
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setWorkingId(''); }
  }

  if (loading && page === 1) return <LoadingScreen />;
  return <section className="admin-page reviews-admin-page">
    <div className="page-heading"><div><p className="eyebrow">KIỂM DUYỆT</p><h1>Đánh giá sản phẩm</h1><p>Ẩn/hiện nội dung không phù hợp và phản hồi trực tiếp cho khách hàng.</p></div><span className="role-chip">{meta.total} đánh giá</span></div>
    <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
    <form className="review-admin-filters panel" onSubmit={(event) => { event.preventDefault(); setPage(1); loadReviews(); }}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khách hàng hoặc sản phẩm" /><select value={visibility} onChange={(event) => { setVisibility(event.target.value); setPage(1); }}><option value="all">Tất cả hiển thị</option><option value="visible">Đang hiển thị</option><option value="hidden">Đang ẩn</option></select><select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }}><option value="">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}</select><button className="button button--secondary">Lọc</button></form>
    <div className="reviews-admin-list">{reviews.map((review) => <article className={`admin-review-card${review.isVisible ? '' : ' admin-review-card--hidden'}`} key={review._id}>
      <div className="admin-review-card__top"><div><strong>{review.user?.fullName || 'Khách hàng'}</strong><span>{review.user?.email}</span><p>{review.product?.name || 'Sản phẩm đã xóa'}</p></div><div><Stars rating={review.rating} /><small>{new Date(review.createdAt).toLocaleString('vi-VN')}</small></div></div>
      <p className="admin-review-card__comment">{review.comment}</p>
      {!review.isVisible && <p className="admin-review-card__moderation">Đang ẩn{review.moderation?.note ? `: ${review.moderation.note}` : ''}</p>}
      {review.adminReply && <div className="admin-review-card__reply"><strong>Phản hồi từ cửa hàng</strong><p>{review.adminReply.content}</p></div>}
      <div className="admin-review-card__actions"><button type="button" className="button button--ghost" onClick={() => toggleVisibility(review)} disabled={workingId === review._id}>{review.isVisible ? 'Ẩn đánh giá' : 'Hiển thị lại'}</button><button type="button" className="button button--secondary" onClick={() => { setReplyingTo(review); setReply(review.adminReply?.content || ''); }}>Phản hồi</button></div>
    </article>)}{!loading && reviews.length === 0 && <p className="empty-store">Không tìm thấy đánh giá phù hợp.</p>}</div>
    {meta.totalPages > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(page - 1)}>← Trước</button><span>Trang {meta.page} / {meta.totalPages}</span><button disabled={page === meta.totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div>}
    {replyingTo && <div className="modal" role="presentation"><form className="modal-content form-stack" onSubmit={submitReply}><div className="profile-editor__heading"><div><p className="eyebrow">PHẢN HỒI</p><h2>{replyingTo.product?.name}</h2></div><button type="button" className="text-button" onClick={() => setReplyingTo(null)}>Đóng</button></div><p className="form-hint">Phản hồi sẽ hiển thị công khai cùng đánh giá của khách hàng.</p><label>Nội dung phản hồi<textarea rows="5" minLength="3" maxLength="1000" value={reply} onChange={(event) => setReply(event.target.value)} required /></label><div className="button-row"><button className="button" disabled={workingId === replyingTo._id}>{workingId === replyingTo._id ? 'Đang lưu...' : 'Lưu phản hồi'}</button><button type="button" className="button button--ghost" onClick={() => setReplyingTo(null)}>Hủy</button></div></form></div>}
  </section>;
}
