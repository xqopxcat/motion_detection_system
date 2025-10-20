import React, { useState } from 'react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

const GoogleAuthButton = ({ mode = 'login', onLoading, onError }) => {
  const { isMobile } = useDeviceDetection();
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = () => {
    setLoading(true);
    onLoading?.(true);
    
    try {
      const authType = mode === 'register' ? 'register' : 'login';
      
      // 使用完整的 API URL
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const authUrl = `${backendUrl}/api/auth/google?type=${authType}`;

      console.log('開始 Google 認證:', authUrl);
      
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Google Auth 啟動失敗:', error);
      setLoading(false);
      onLoading?.(false);
      onError?.('無法啟動 Google 認證，請稍後再試');
    }
  };

  return (
    <button
      onClick={handleGoogleAuth}
      disabled={loading}
      style={{
        width: '100%',
        padding: isMobile ? '14px' : '16px',
        background: loading 
          ? 'rgba(128, 128, 128, 0.3)'
          : 'linear-gradient(145deg, rgba(66, 133, 244, 0.8), rgba(52, 168, 83, 0.8))',
        border: '1px solid rgba(66, 133, 244, 0.5)',
        borderRadius: '8px',
        color: '#ffffff',
        fontSize: isMobile ? '14px' : '16px',
        fontWeight: '500',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '20px'
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.target.style.transform = 'translateY(-1px)';
          e.target.style.boxShadow = '0 4px 20px rgba(66, 133, 244, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }
      }}
    >
      {loading ? (
        <div style={{
          width: '20px',
          height: '20px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTop: '2px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {mode === 'register' ? '使用 Google 註冊' : '使用 Google 登入'}
        </>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};

export default GoogleAuthButton;