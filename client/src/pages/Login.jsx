import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import GoogleAuthButton from '../components/Auth/GoogleAuthButton';

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { isMobile } = useDeviceDetection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 如果已經登入，重定向到 dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // 處理 Google OAuth 回調
  useEffect(() => {
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
        
        navigate('/dashboard');
      } catch (error) {
        console.error('Login callback error:', error);
        setError('登入過程中發生錯誤');
      }
    } else if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    setLoading(false);
  }, [login, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(26, 26, 46, 0.95) 50%, rgba(22, 33, 62, 0.9) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '20px' : '40px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(15px)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        padding: isMobile ? '30px 20px' : '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: isMobile ? '36px' : '48px',
            marginBottom: '10px'
          }}>
            🏃‍♂️
          </div>
          <h1 style={{
            fontSize: isMobile ? '24px' : '28px',
            color: '#00ffff',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            margin: '0 0 8px 0',
            letterSpacing: '1px'
          }}>
            歡迎回來
          </h1>
          <p style={{
            color: '#cccccc',
            fontSize: isMobile ? '14px' : '16px',
            margin: '0'
          }}>
            登入您的帳戶開始分析運動表現
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#ff6b6b',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Google Login Button */}
        <GoogleAuthButton 
          mode="login" 
          onLoading={setLoading}
        />

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '20px 0',
          color: '#666'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0, 255, 255, 0.2)' }}></div>
          <span style={{ margin: '0 15px', fontSize: '14px' }}>或</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(0, 255, 255, 0.2)' }}></div>
        </div>

        {/* Register Link */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <p style={{ 
            color: '#cccccc', 
            fontSize: '14px',
            margin: '0 0 10px 0'
          }}>
            還沒有帳戶？
          </p>
          <Link 
            to="/register"
            style={{
              color: '#00ffff',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              padding: '8px 16px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              display: 'inline-block',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            立即註冊
          </Link>
        </div>

        {/* Demo Access */}
        <div style={{
          padding: '15px',
          background: 'rgba(0, 255, 255, 0.05)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#00ffff',
            fontSize: '13px',
            margin: '0 0 8px 0',
            fontWeight: '500'
          }}>
            🎯 想先體驗功能？
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '6px',
              color: '#00ffff',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(0, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(0, 255, 255, 0.1)';
            }}
          >
            訪客模式體驗
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;