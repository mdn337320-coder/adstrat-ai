import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<boolean>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setRefreshToken(savedRefreshToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const refresh = async () => {
    const currentRefreshToken = refreshToken || localStorage.getItem('refreshToken');
    if (!currentRefreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (e) {
      console.error("Refresh failed", e);
      return false;
    }
  };

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const currentToken = token || localStorage.getItem('token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`
    };

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const success = await refresh();
      if (success) {
        const newToken = localStorage.getItem('token');
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        };
        res = await fetch(url, { ...options, headers: newHeaders });
      }
    }

    return res;
  };

  // Auto-refresh every 45 minutes if token exists
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refresh();
    }, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshToken]);

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout, refresh, fetchWithAuth, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
