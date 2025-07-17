import React, { useState, useEffect } from 'react';
import PoseDetector from '../components/Detector/PoseDetector';
import PoseAnalyzer from '../components/Detector/PoseAnalyzer';

// 科技感樣式
const techStyles = `
  @keyframes techGlow {
    0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
    50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.4); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes dataStream {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }
  
  .tech-app * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .tech-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .tech-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    animation: dataStream 3s infinite;
  }
  
  .tech-button:hover {
    transform: translateY(-2px);
  }
  
  .tech-button:active {
    transform: translateY(0) scale(0.98);
  }
`;

// 插入樣式
if (typeof document !== 'undefined' && !document.getElementById('tech-app-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'tech-app-styles';
  styleSheet.textContent = techStyles;
  document.head.appendChild(styleSheet);
}


const PostDetection = () => {
    const [currentMode, setCurrentMode] = useState('detector'); // 'detector', 'analyzer', 'dual', 'motion'
    const [isMobile, setIsMobile] = useState(false);

    // 檢測行動裝置
    useEffect(() => {
        const checkMobile = () => {
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const isSmallScreen = window.innerWidth <= 768;
          setIsMobile(isMobileDevice || isSmallScreen);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="tech-app" style={{ 
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        padding: 0,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #16213e 70%, #0f3460 100%)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
        }}>
        {/* 科技感背景效果 */}
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
            radial-gradient(circle at 30% 40%, rgba(0, 255, 255, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(0, 255, 255, 0.03) 0%, transparent 50%)
            `,
            pointerEvents: 'none',
            zIndex: 0
        }} />

        {/* Header 導航 - 科技感設計 */}
        <header style={{ 
            position: 'relative',
            zIndex: 1,
            width: 'calc(100% - 32px)',
            marginLeft: '70px', // 避開 Navigation sidebar
            background: 'linear-gradient(145deg, rgba(13, 17, 31, 0.95), rgba(25, 39, 67, 0.9))',
            backdropFilter: 'blur(15px)',
            borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
            padding: isMobile ? '12px 16px' : '16px 24px'
        }}>
            {/* 背景動效線 */}
            <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
            animation: 'dataStream 4s infinite'
            }} />
            
            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%'
            }}>
            {/* Logo/標題區域 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <h1 style={{
                margin: 0,
                background: 'linear-gradient(45deg, #00ffff, #0080ff)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                fontSize: isMobile ? 'clamp(1rem, 4vw, 1.2rem)' : '1.5rem',
                fontWeight: '700',
                letterSpacing: '1px'
                }}>
                🤖 AI POSE DETECTOR
                </h1>
                {!isMobile && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(0, 255, 255, 0.6)',
                    fontWeight: '500',
                    letterSpacing: '0.5px'
                }}>
                    MOTION CAPTURE SYSTEM
                </div>
                )}
            </div>

            {/* 導航按鈕區域 */}
            <nav style={{
                display: 'flex',
                gap: isMobile ? '8px' : '12px',
                alignItems: 'center'
            }}>
                <button
                onClick={() => setCurrentMode('detector')}
                className="tech-button"
                style={{
                    padding: isMobile ? '10px 14px' : '12px 20px',
                    background: currentMode === 'detector' 
                    ? 'linear-gradient(145deg, #00ffff, #0080ff)' 
                    : 'linear-gradient(145deg, rgba(108, 117, 125, 0.8), rgba(73, 80, 87, 0.9))',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: isMobile ? 'clamp(0.7rem, 2.5vw, 0.8rem)' : '0.9rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    boxShadow: currentMode === 'detector' 
                    ? '0 4px 15px rgba(0, 255, 255, 0.4)' 
                    : '0 2px 10px rgba(0, 0, 0, 0.3)',
                    minWidth: isMobile ? '80px' : '100px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                >
                {isMobile ? '🤖 檢測' : '🤖 AI檢測器'}
                </button>
                
                <button
                onClick={() => setCurrentMode('analyzer')}
                className="tech-button"
                style={{
                    padding: isMobile ? '10px 14px' : '12px 20px',
                    background: currentMode === 'analyzer' 
                    ? 'linear-gradient(145deg, #00ffff, #0080ff)' 
                    : 'linear-gradient(145deg, rgba(108, 117, 125, 0.8), rgba(73, 80, 87, 0.9))',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: isMobile ? 'clamp(0.7rem, 2.5vw, 0.8rem)' : '0.9rem',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    boxShadow: currentMode === 'analyzer' 
                    ? '0 4px 15px rgba(0, 255, 255, 0.4)' 
                    : '0 2px 10px rgba(0, 0, 0, 0.3)',
                    minWidth: isMobile ? '80px' : '100px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                >
                {isMobile ? '📊 分析' : '📊 姿態分析'}
                </button>
            </nav>
            </div>
        </header>

        {/* 主要內容區域 - 滿版設計 */}
        <main style={{ 
            position: 'relative',
            zIndex: 1,
            flex: 1,
            width: '100%',
            padding: 0,
            margin: 0,
            marginLeft: '70px', // 避開 Navigation sidebar
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {currentMode === 'detector' && <PoseDetector />}
            {currentMode === 'analyzer' && <PoseAnalyzer />}
        </main>

        {/* 功能說明面板 - 科技感設計，手機端隱藏或最小化 */}
        {!isMobile && (
            <div style={{ 
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            maxWidth: '300px',
            background: 'linear-gradient(145deg, rgba(13, 17, 31, 0.95), rgba(25, 39, 67, 0.9))',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(15px)',
            boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
            zIndex: 1000,
            animation: 'slideIn 0.5s ease-out'
            }}>
            <h4 style={{ 
                color: '#00ffff', 
                marginTop: 0, 
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
            }}>
                💡 SYSTEM INFO
            </h4>
            <div style={{ 
                fontSize: '12px', 
                lineHeight: '1.5',
                color: 'rgba(0, 255, 255, 0.8)'
            }}>
                <p style={{ margin: '0 0 8px 0' }}>
                <strong style={{ color: '#00ffff' }}>🤖 AI檢測器：</strong>
                即時姿態檢測與動作錄製
                </p>
                <p style={{ margin: '0' }}>
                <strong style={{ color: '#00ffff' }}>📊 姿態分析：</strong>
                深度角度分析與動作評估
                </p>
            </div>
            </div>
        )}

        {/* 手機端簡化資訊 */}
        {isMobile && (
            <div style={{
            position: 'fixed',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '8px 16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000
            }}>
            <div style={{
                fontSize: '10px',
                color: 'rgba(0, 255, 255, 0.8)',
                textAlign: 'center',
                letterSpacing: '0.3px'
            }}>
                {currentMode === 'detector' ? '🤖 AI POSE DETECTION' : '📊 POSE ANALYSIS'}
            </div>
            </div>
        )}
        </div>
    );
}

export default PostDetection