import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import GoogleAuthButton from '../components/Auth/GoogleAuthButton';

const Register = () => {
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
        console.error('Register callback error:', error);
        setError('註冊過程中發生錯誤');
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
            開始您的運動之旅
          </h1>
          <p style={{
            color: '#cccccc',
            fontSize: isMobile ? '14px' : '16px',
            margin: '0'
          }}>
            建立帳戶，追蹤您的運動表現進步
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

        {/* Google Register Button */}
        <GoogleAuthButton 
          mode="register" 
          onLoading={setLoading}
        />

        {/* Benefits */}
        <div style={{
          background: 'rgba(0, 255, 255, 0.05)',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <p style={{
            color: '#00ffff',
            fontSize: '14px',
            fontWeight: '500',
            margin: '0 0 10px 0',
            textAlign: 'center'
          }}>
            ✨ 註冊後您可以享受
          </p>
          <ul style={{
            color: '#cccccc',
            fontSize: '12px',
            margin: '0',
            paddingLeft: '20px',
            lineHeight: '1.6'
          }}>
            <li>保存您的運動分析記錄</li>
            <li>追蹤長期運動表現趨勢</li>
            <li>個人化運動建議與改進</li>
            <li>多設備同步您的數據</li>
          </ul>
        </div>

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

        {/* Login Link */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <p style={{ 
            color: '#cccccc', 
            fontSize: '14px',
            margin: '0 0 10px 0'
          }}>
            已經有帳戶了？
          </p>
          <Link 
            to="/login"
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
            立即登入
          </Link>
        </div>

        {/* Privacy Notice */}
        <div style={{
          fontSize: '11px',
          color: '#888',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          註冊即表示您同意我們的服務條款與隱私政策。<br/>
          我們承諾保護您的個人資料安全。
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

export default Register;