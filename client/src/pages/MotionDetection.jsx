import React, { useState, useEffect } from 'react';
import PoseDetector from '../components/Detector/PoseDetector';
import PoseAnalyzer from '../components/Detector/PoseAnalyzer';
import { useDeviceDetection } from "../hooks/useDeviceDetection";

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
    const { isMobile } = useDeviceDetection();
    
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
        {/* 主要內容區域 - 滿版設計 */}
        <main style={{ 
            position: 'relative',
            zIndex: 1,
            flex: 1,
            width: '100%',
            padding: 0,
            margin: 0,
            marginLeft: isMobile ? '0px' : '70px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {currentMode === 'detector' && <PoseDetector />}
            {currentMode === 'analyzer' && <PoseAnalyzer />}
        </main>
        </div>
    );
}

export default PostDetection