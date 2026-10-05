import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('dailylog_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((token, u) => {
    localStorage.setItem('dailylog_token', token);
    localStorage.setItem('dailylog_user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dailylog_token');
    localStorage.removeItem('dailylog_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((u) => {
    localStorage.setItem('dailylog_user', JSON.stringify(u));
    setUser(u);
  }, []);

  useEffect(() => {
    const onStorage = () => {
      const raw = localStorage.getItem('dailylog_user');
      setUser(raw ? JSON.parse(raw) : null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
