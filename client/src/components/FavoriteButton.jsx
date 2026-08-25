import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoriteButton({ productId, className = '' }) {
  const { user } = useAuth();
  const { isFavorite, isWorking, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const saved = isFavorite(productId);
  const working = isWorking(productId);

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: '/favorites' } });
      return;
    }
    if (user.role !== 'CUSTOMER') return;
    try { await toggleFavorite(productId); } catch { /* Trang danh sách yêu thích hiển thị lỗi chi tiết. */ }
  }

  if (user && user.role !== 'CUSTOMER') return null;
  return <button type="button" className={`favorite-button${saved ? ' favorite-button--saved' : ''}${className ? ` ${className}` : ''}`} onClick={handleClick} disabled={working} aria-label={saved ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'} aria-pressed={saved} title={saved ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}>{saved ? '♥' : '♡'}</button>;
}
