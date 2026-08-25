import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { favoriteApi } from '../api/store';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const customerId = user?._id;
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [workingProductIds, setWorkingProductIds] = useState(() => new Set());

  const refreshFavorites = useCallback(async () => {
    if (user?.role !== 'CUSTOMER' || !customerId) {
      setFavoriteIds(new Set());
      return [];
    }
    setLoading(true);
    try {
      const response = await favoriteApi.list();
      const items = response.data.data || [];
      setFavoriteIds(new Set(items.map((item) => String(item.productId))));
      return items;
    } finally { setLoading(false); }
  }, [customerId, user?.role]);

  useEffect(() => {
    refreshFavorites().catch(() => setFavoriteIds(new Set()));
  }, [refreshFavorites]);

  const toggleFavorite = useCallback(async (productId) => {
    const id = String(productId);
    if (user?.role !== 'CUSTOMER') throw new Error('Chỉ tài khoản Customer mới có thể dùng danh sách yêu thích.');
    if (workingProductIds.has(id)) return null;
    setWorkingProductIds((current) => new Set(current).add(id));
    try {
      if (favoriteIds.has(id)) {
        await favoriteApi.remove(id);
        setFavoriteIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        return false;
      }
      await favoriteApi.add(id);
      setFavoriteIds((current) => new Set(current).add(id));
      return true;
    } finally {
      setWorkingProductIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [favoriteIds, user?.role, workingProductIds]);

  const value = useMemo(() => ({
    favoriteIds,
    loading,
    isFavorite: (productId) => favoriteIds.has(String(productId)),
    isWorking: (productId) => workingProductIds.has(String(productId)),
    toggleFavorite,
    refreshFavorites,
  }), [favoriteIds, loading, workingProductIds, toggleFavorite, refreshFavorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside FavoritesProvider.');
  return context;
}
