import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);
const TOKEN_KEY = 'phone_store_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const hydrateSession = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    try {
      const response = await authApi.getMe();
      setUser(response.data.data);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => { hydrateSession(); }, [hydrateSession]);

  const startSession = useCallback((payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    setUser(payload.user);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: startSession,
    logout: clearSession,
    refreshUser: hydrateSession,
    setUser,
  }), [user, loading, startSession, clearSession, hydrateSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
