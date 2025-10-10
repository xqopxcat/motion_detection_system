import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // 檢查 URL 中的 Google Auth 回調參數
    checkAuthCallback();
    
    // 檢查是否有保存的 token
    if (token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, []);

  // 檢查 Google Auth 回調
  const checkAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const errorParam = urlParams.get('error');

    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        login(userData, token);
        
        // 清除 URL 參數
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 可以觸發成功通知
        console.log('Google 認證成功:', userData);
      } catch (error) {
        console.error('處理 Google 認證回調失敗:', error);
      }
    } else if (errorParam) {
      console.error('Google 認證失敗:', decodeURIComponent(errorParam));
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const validateToken = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token validation error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    setLoading(false);
  };

  const value = {
    user,
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};