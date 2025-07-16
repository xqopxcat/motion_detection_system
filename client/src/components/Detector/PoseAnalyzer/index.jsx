// src/components/PoseAnalyzer.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';
import BVHExporter from '../../../utils/bvhExporter';

// 科技感優化樣式
const styles = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(0, 255, 255, 0.3); }
    50% { box-shadow: 0 0 15px rgba(0, 255, 255, 0.6), 0 0 25px rgba(0, 255, 255, 0.4); }
  }
  
  @keyframes scanLine {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  
  @keyframes dataFlow {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100%); opacity: 0; }
  }
  
  .analyzer-optimized * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .analyzer-optimized button {
    animation: fadeIn 0.4s ease-out;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .analyzer-optimized button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
  
  .analyzer-tech-panel {
    background: linear-gradient(145deg, rgba(13, 17, 31, 0.95), rgba(25, 39, 67, 0.9));
    border: 1px solid rgba(0, 255, 255, 0.2);
    backdrop-filter: blur(15px);
    position: relative;
    overflow: hidden;
  }
  
  .analyzer-tech-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    animation: dataFlow 3s infinite;
  }
  
  .analyzer-status-indicator {
    position: relative;
    overflow: hidden;
  }
  
  .analyzer-status-indicator::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), transparent);
    animation: scanLine 2s infinite linear;
  }
  
  .analyzer-loading-spinner {
    animation: spin 1s linear infinite !important;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .analyzer-recording-pulse {
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  @media (max-width: 768px) {
    .analyzer-optimized {
      padding: 8px !important;
    }
  }
`;

// 插入樣式到頁面
if (typeof document !== 'undefined' && !document.getElementById('analyzer-pose-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'analyzer-pose-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const PoseAnalyzer = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const bvhExporterRef = useRef(new BVHExporter());
  const isRecordingRef = useRef(false); // 使用 ref 確保錄製狀態同步
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [poseData, setPoseData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedPoses, setRecordedPoses] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // 檢測設備類型
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
  
    // 計算兩點之間的距離
    const calculateDistance = useCallback((point1, point2) => {
      return Math.sqrt(
        Math.pow(point1.x - point2.x, 2) + 
        Math.pow(point1.y - point2.y, 2)
      );
    }, []);
    
    // 計算角度
    const calculateAngle = useCallback((point1, point2, point3) => {
    const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - 
                    Math.atan2(point1.y - point2.y, point1.x - point2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
        angle = 360 - angle;
    }
    return angle;
    }, []);
    
      // 分析姿態
      const analyzePose = useCallback((landmarks) => {
        if (!landmarks || landmarks.length < 33) return null;
    
        // MediaPipe 姿態關鍵點索引
        const LEFT_SHOULDER = 11;
        const RIGHT_SHOULDER = 12;
        const LEFT_ELBOW = 13;
        const RIGHT_ELBOW = 14;
        const LEFT_WRIST = 15;
        const RIGHT_WRIST = 16;
        const LEFT_HIP = 23;
        const RIGHT_HIP = 24;
        const LEFT_KNEE = 25;
        const RIGHT_KNEE = 26;
        const LEFT_ANKLE = 27;
        const RIGHT_ANKLE = 28;
    
        try {
          // 計算肩膀寬度
          const shoulderWidth = calculateDistance(
            landmarks[LEFT_SHOULDER], 
            landmarks[RIGHT_SHOULDER]
          );
    
          // 計算手臂角度
          const leftArmAngle = calculateAngle(
            landmarks[LEFT_SHOULDER],
            landmarks[LEFT_ELBOW],
            landmarks[LEFT_WRIST]
          );
    
          const rightArmAngle = calculateAngle(
            landmarks[RIGHT_SHOULDER],
            landmarks[RIGHT_ELBOW],
            landmarks[RIGHT_WRIST]
          );
    
          // 計算腿部角度
          const leftLegAngle = calculateAngle(
            landmarks[LEFT_HIP],
            landmarks[LEFT_KNEE],
            landmarks[LEFT_ANKLE]
          );
    
          const rightLegAngle = calculateAngle(
            landmarks[RIGHT_HIP],
            landmarks[RIGHT_KNEE],
            landmarks[RIGHT_ANKLE]
          );
    
          // 檢測姿勢
          let detectedPose = '未知姿勢';
          if (leftArmAngle > 160 && rightArmAngle > 160) {
            detectedPose = '舉手姿勢';
          } else if (leftLegAngle < 120 || rightLegAngle < 120) {
            detectedPose = '蹲下姿勢';
          } else if (landmarks[LEFT_WRIST].y < landmarks[LEFT_SHOULDER].y && 
                     landmarks[RIGHT_WRIST].y < landmarks[RIGHT_SHOULDER].y) {
            detectedPose = '雙手上舉';
          } else {
            detectedPose = '站立姿勢';
          }
    
          return {
            shoulderWidth: shoulderWidth.toFixed(3),
            leftArmAngle: leftArmAngle.toFixed(1),
            rightArmAngle: rightArmAngle.toFixed(1),
            leftLegAngle: leftLegAngle.toFixed(1),
            rightLegAngle: rightLegAngle.toFixed(1),
            detectedPose,
            timestamp: Date.now()
          };
        } catch (error) {
          console.warn('姿態分析錯誤:', error);
          return null;
        }
      }, [calculateDistance, calculateAngle]);
    
  useEffect(() => {
    let animationId;
    let isComponentMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        
        // 初始化 MediaPipe 視覺任務
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // 創建姿態檢測器
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'CPU' // 使用 CPU 避免 GPU 資源衝突
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: false,
          outputPoseWorldLandmarks: true // 啟用世界坐標輸出
        });

        // 啟動攝影機 - 根據設備類型優化
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: isMobile ? 720 : 1280 },
            height: { ideal: isMobile ? 960 : 720 },
            frameRate: { ideal: isMobile ? 30 : 60, min: 24 },
            facingMode: 'user'
          },
          audio: false
        });

        if (videoRef.current && isComponentMounted) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // 等待視頻準備就緒
          await new Promise((resolve) => {
            const checkVideo = () => {
              if (videoRef.current && 
                  videoRef.current.readyState >= 3 &&
                  videoRef.current.videoWidth > 0 && 
                  videoRef.current.videoHeight > 0) {
                resolve();
              } else {
                setTimeout(checkVideo, 100);
              }
            };
            checkVideo();
          });

          setIsLoading(false);
        //   setIsDetecting(true);
          
          // 開始姿態檢測
          detectPose();
        }
      } catch (err) {
        console.error('初始化錯誤:', err);
        setError('無法初始化姿態分析器');
        setIsLoading(false);
      }
    };

    const detectPose = async () => {
      if (!isComponentMounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || !landmarkerRef.current || 
          video.readyState < 3 || 
          video.videoWidth === 0 || 
          video.videoHeight === 0) {
        animationId = requestAnimationFrame(detectPose);
        return;
      }

      try {
        // 執行姿態檢測
        const timestamp = performance.now();
        const results = await landmarkerRef.current.detectForVideo(video, timestamp);
        
        // 設置畫布尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 如果檢測到姿態，繪製關鍵點和連線
        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            
            // 繪製關鍵點和連線
            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawLandmarks(landmarks, {
                color: '#FF6B6B',
                lineWidth: 2
            });
            drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
                color: '#4ECDC4',
                lineWidth: 3
            });

            // 分析姿態
            const analysis = analyzePose(landmarks);
            if (analysis) {
                setPoseData(analysis);
            
                // 如果正在錄製，保存數據（包含原始 landmarks 和分析結果）
                if (isRecordingRef.current) {
                    // 調試：檢查世界坐標數據
                    if (results.worldLandmarks && results.worldLandmarks[0]) {
                        console.log('世界坐標數據樣本:', results.worldLandmarks[0].slice(0, 3));
                    } else {
                        console.warn('沒有世界坐標數據');
                    }
                    
                    const recordData = {
                        landmarks: landmarks.map(landmark => ({
                            x: landmark.x,
                            y: landmark.y,
                            z: landmark.z || 0,
                            visibility: landmark.visibility || 1
                        })),
                        worldLandmarks: results.worldLandmarks && results.worldLandmarks[0] ? 
                            results.worldLandmarks[0].map(landmark => ({
                                x: landmark.x || 0,
                                y: landmark.y || 0,
                                z: landmark.z || 0,
                                visibility: landmark.visibility || 1
                            })) : [],
                        analysis: analysis,
                        timestamp: Date.now()
                    };
                    setRecordedPoses(prev => [...prev, recordData]);
                }
            }
        } else {
            // 如果沒有檢測到姿態，清除分析數據
            setPoseData(null);
        }
      } catch (err) {
        console.warn('姿態檢測錯誤:', err);
      }

      // 繼續下一幀檢測
      if (isComponentMounted) {
        animationId = requestAnimationFrame(detectPose);
      }
    };

    init();

    // 清理函數
    return () => {
      isComponentMounted = false;
    //   setIsDetecting(false);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [analyzePose, isMobile]); // 加入 isMobile 依賴，因為攝影機設定需要它
  
  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    isRecordingRef.current = newRecordingState; // 同步更新 ref
    
    if (newRecordingState) {
      setRecordedPoses([]); // 開始新的錄製
    }
  };
  
  const exportData = () => {
    const dataStr = JSON.stringify(recordedPoses, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pose_data_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
  };

  const exportBVH = async () => {
    if (recordedPoses.length === 0) {
      alert('沒有可匯出的動作數據');
      return;
    }

    try {
      console.log('原始錄製數據樣本:', recordedPoses.slice(0, 2));
      
      // 轉換數據格式為 BVH 所需的格式
      const motionData = recordedPoses.map((record, frameIndex) => {
        // 優先使用世界坐標，如果沒有則使用標準化坐標並添加深度
        let landmarks = record.worldLandmarks && record.worldLandmarks.length > 0 
          ? record.worldLandmarks 
          : record.landmarks;
        
        // 如果只有 2D 坐標，需要估算 Z 值
        if (landmarks.length > 0 && (landmarks[0].z === undefined || landmarks[0].z === 0)) {
          console.log(`幀 ${frameIndex}: 使用 2D 坐標，估算深度值`);
          landmarks = landmarks.map((landmark, index) => ({
            x: (landmark.x - 0.5) * 2, // 轉換到 [-1, 1] 範圍
            y: (landmark.y - 0.5) * 2,
            z: Math.sin(frameIndex * 0.1 + index * 0.01) * 0.1, // 添加輕微的深度變化
            visibility: landmark.visibility || 1
          }));
        }
        
        // 轉換為 BVHExporter 期望的 points3D 格式
        const points3D = landmarks.map((landmark, index) => ({
          keypointIndex: index,
          x: landmark.x || 0,
          y: landmark.y || 0,
          z: landmark.z || 0,
          visibility: landmark.visibility || 1
        }));

        return {
          points3D: points3D,
          timestamp: record.timestamp
        };
      });

      console.log('轉換後的動作數據樣本:', motionData.slice(0, 2));
      console.log('第一幀點數據樣本:', motionData[0]?.points3D?.slice(0, 5));

      // 使用 BVHExporter 生成 BVH 文件
      const bvhData = await bvhExporterRef.current.exportMotionData(motionData, {
        fps: 30,
        skeletonType: 'mediapipe',
        quality: 'high',
        scale: 100 // 增加縮放比例
      });

      console.log('生成的 BVH 數據前 500 字符:', bvhData.substring(0, 500));

      // 下載 BVH 文件
      const bvhBlob = new Blob([bvhData], { type: 'text/plain' });
      const url = URL.createObjectURL(bvhBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pose_motion_${new Date().toISOString().slice(0,10)}.bvh`;
      link.click();
      URL.revokeObjectURL(url);

      console.log('BVH 匯出成功');
    } catch (error) {
      console.error('BVH 匯出失敗:', error);
      alert(`BVH 匯出失敗: ${error.message}`);
    }
  };

  return (
    <div className="analyzer-optimized mobile-pose-analyzer" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '12px',
      maxWidth: '100%',
      margin: '0 auto',
      minHeight: '100vh',
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #16213e 70%, #0f3460 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 科技感背景動效 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
          linear-gradient(45deg, transparent 30%, rgba(0, 255, 255, 0.02) 50%, transparent 70%)
        `,
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {/* 主標題 - 科技感設計 */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        marginBottom: '20px',
        textAlign: 'center',
        padding: '16px 24px',
        background: 'linear-gradient(145deg, rgba(13, 17, 31, 0.9), rgba(25, 39, 67, 0.8))',
        borderRadius: '20px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        backdropFilter: 'blur(15px)',
        boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
        maxWidth: 'min(380px, 92vw)'
      }}>
        <h1 style={{ 
          margin: '0',
          background: 'linear-gradient(45deg, #00ffff, #0080ff, #00ffff)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          fontSize: 'clamp(1.4rem, 5vw, 1.8rem)',
          fontWeight: '700',
          letterSpacing: '1px',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
        }}>
          🔬 AI POSE ANALYZER
        </h1>
        <div style={{
          marginTop: '6px',
          fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)',
          color: 'rgba(0, 255, 255, 0.7)',
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          REAL-TIME BIOMECHANICAL ANALYSIS
        </div>
      </div>
      
      {/* 狀態指示器 - 科技面板風格 */}
      <div className="analyzer-status-indicator" style={{ 
        marginBottom: '16px',
        width: '100%',
        maxWidth: 'min(380px, 92vw)',
        position: 'relative',
        zIndex: 1
      }}>
        {isLoading && (
          <div className="analyzer-tech-panel" style={{ 
            color: '#00ffff',
            fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
            padding: '12px 16px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontWeight: '600',
            letterSpacing: '0.5px'
          }}>
            <div className="analyzer-loading-spinner" style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(0, 255, 255, 0.2)',
              borderTop: '2px solid #00ffff',
              borderRadius: '50%'
            }}></div>
            INITIALIZING ANALYSIS ENGINE...
          </div>
        )}
        {error && (
          <div className="analyzer-tech-panel" style={{ 
            color: '#ff4757', 
            background: 'linear-gradient(145deg, rgba(31, 13, 17, 0.95), rgba(67, 25, 39, 0.9))',
            border: '1px solid rgba(255, 71, 87, 0.3)',
            padding: '12px 16px', 
            borderRadius: '16px',
            fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textAlign: 'center'
          }}>
            ⚠️ SYSTEM ERROR: {error}
          </div>
        )}
        {!isLoading && !error && (
          <div className="analyzer-tech-panel" style={{ 
            color: '#2ed573',
            background: 'linear-gradient(145deg, rgba(13, 31, 17, 0.95), rgba(25, 67, 39, 0.9))',
            border: '1px solid rgba(46, 213, 115, 0.3)',
            fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
            padding: '12px 16px',
            borderRadius: '16px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(46, 213, 115, 0.1)'
          }}>
            ✓ ANALYSIS ENGINE ACTIVE
          </div>
        )}
      </div>

      {/* 視頻容器 - 科技感邊框和效果，適應移動設備 */}
      <div
        style={{
          position: 'relative',
          width: isMobile ? '100vw' : '100%',
          maxWidth: isMobile ? '100vw' : 'min(600px, 92vw)',
          height: isMobile ? 'calc(100vw * 4 / 3)' : undefined,
          aspectRatio: isMobile ? '3/4' : '4/3',
          backgroundColor: '#000',
          borderRadius: isMobile ? '0' : '24px',
          overflow: 'hidden',
          boxShadow: isMobile 
            ? 'none' 
            : '0 20px 60px rgba(0, 255, 255, 0.2), inset 0 0 0 2px rgba(0, 255, 255, 0.3)',
          marginBottom: '20px',
          border: isMobile ? 'none' : '2px solid rgba(0, 255, 255, 0.4)',
          zIndex: 1,
        }}
      >
        {/* 科技感邊框動效 - 僅桌面版 */}
        {!isMobile && (
          <>
            <div style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              right: '-2px',
              bottom: '-2px',
              background: 'linear-gradient(45deg, transparent, #00ffff, transparent, #0080ff, transparent)',
              borderRadius: '26px',
              zIndex: -1,
              animation: 'glow 3s infinite alternate'
            }} />
            
            {/* 角落科技元素 */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '20px',
              height: '20px',
              border: '2px solid #00ffff',
              borderRight: 'none',
              borderBottom: 'none',
              borderRadius: '4px 0 0 0',
              zIndex: 2
            }} />
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '20px',
              height: '20px',
              border: '2px solid #00ffff',
              borderLeft: 'none',
              borderBottom: 'none',
              borderRadius: '0 4px 0 0',
              zIndex: 2
            }} />
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              width: '20px',
              height: '20px',
              border: '2px solid #00ffff',
              borderRight: 'none',
              borderTop: 'none',
              borderRadius: '0 0 0 4px',
              zIndex: 2
            }} />
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              width: '20px',
              height: '20px',
              border: '2px solid #00ffff',
              borderLeft: 'none',
              borderTop: 'none',
              borderRadius: '0 0 4px 0',
              zIndex: 2
            }} />
          </>
        )}
        
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          style={{ 
            width: isMobile ? '100vw' : '100%',
            maxWidth: isMobile ? '100vw' : '100%',
            height: isMobile ? 'calc(100vw * 4 / 3)' : '100%',
            maxHeight: isMobile ? '100vh' : '100%',
            display: 'block',
            objectFit: 'cover',
            background: 'linear-gradient(45deg, #000, #1a1a2e)',
            borderRadius: isMobile ? '0' : '22px',
            margin: 0,
            padding: 0
          }}
        />
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: isMobile ? '100vw' : '100%',
            maxWidth: isMobile ? '100vw' : '100%',
            height: isMobile ? 'calc(100vw * 4 / 3)' : '100%',
            maxHeight: isMobile ? '100vh' : '100%',
            pointerEvents: 'none',
            borderRadius: isMobile ? '0' : '22px',
            objectFit: 'cover'
          }}
        />
        
        {/* 錄製狀態指示器 */}
        {isRecording && (
          <div
            className="analyzer-recording-indicator"
            style={{
              position: 'absolute',
              top: isMobile ? '6vw' : '16px',
              right: isMobile ? '6vw' : '16px',
              background: 'linear-gradient(145deg, rgba(220, 53, 69, 0.95), rgba(255, 71, 87, 0.9))',
              color: 'white',
              padding: isMobile ? '4vw 5vw' : '10px 16px',
              borderRadius: '25px',
              fontSize: isMobile ? '1rem' : 'clamp(0.75rem, 2.5vw, 0.85rem)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '3vw' : '8px',
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 20px rgba(220, 53, 69, 0.4)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              zIndex: 3
            }}
          >
            <div
              style={{
                width: isMobile ? '3vw' : '10px',
                height: isMobile ? '3vw' : '10px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
                animation: 'pulse 1s infinite'
              }}
            ></div>
            ANALYZING {recordedPoses.length} FRAMES
          </div>
        )}
      </div>

      {/* 錄製控制面板 - 科技感設計 */}
      <div className="analyzer-tech-panel" style={{ 
        marginBottom: '20px',
        padding: '20px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: 'min(600px, 92vw)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 10px 40px rgba(0, 255, 255, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#00ffff',
          fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
          textAlign: 'center',
          fontWeight: '700',
          letterSpacing: '1px',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
        }}>
          🔬 MOTION ANALYSIS
        </h3>
        
        {/* 控制按鈕組 */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%'
        }}>
          <button
            onClick={toggleRecording}
            style={{
              padding: '16px 24px',
              background: isRecording 
                ? 'linear-gradient(145deg, #ff4757, #ff3838)' 
                : 'linear-gradient(145deg, #2ed573, #26d463)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: 'clamp(0.9rem, 3.5vw, 1.1rem)',
              fontWeight: '700',
              width: '100%',
              minHeight: '56px',
              touchAction: 'manipulation',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isRecording 
                ? '0 6px 20px rgba(255, 71, 87, 0.4)' 
                : '0 6px 20px rgba(46, 213, 115, 0.4)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
          >
            {isRecording ? '⏹ STOP ANALYSIS' : '🔬 START ANALYSIS'}
          </button>
          
          {recordedPoses.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%'
            }}>
              <button
                onClick={exportData}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(145deg, #17a2b8, #138496)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
              >
                📄 JSON ({recordedPoses.length})
              </button>
              
              <button
                onClick={exportBVH}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(145deg, #ff9800, #f57c00)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
              >
                🎬 BVH ({recordedPoses.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 即時分析數據面板 - 科技感設計 */}
      <div className="analyzer-tech-panel" style={{ 
        padding: '20px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: 'min(600px, 92vw)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 10px 40px rgba(0, 255, 255, 0.1)'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#00ffff',
          fontSize: 'clamp(1rem, 3.5vw, 1.2rem)',
          textAlign: 'center',
          fontWeight: '700',
          letterSpacing: '1px',
          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
        }}>
          📊 REAL-TIME ANALYSIS
        </h3>
        
        {poseData ? (
          <div style={{ 
            fontSize: 'clamp(0.8rem, 3vw, 0.95rem)', 
            lineHeight: '1.8',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            <div style={{ 
              background: 'linear-gradient(145deg, rgba(46, 213, 115, 0.2), rgba(46, 213, 115, 0.1))',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '16px',
              fontWeight: '700',
              color: '#2ed573',
              border: '1px solid rgba(46, 213, 115, 0.3)',
              textAlign: 'center',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              🎯 {poseData.detectedPose}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)'
            }}>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                <strong style={{ color: '#00ffff' }}>肩寬:</strong><br/>
                {poseData.shoulderWidth}
              </div>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                <strong style={{ color: '#00ffff' }}>左臂:</strong><br/>
                {poseData.leftArmAngle}°
              </div>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                <strong style={{ color: '#00ffff' }}>右臂:</strong><br/>
                {poseData.rightArmAngle}°
              </div>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.2)'
              }}>
                <strong style={{ color: '#00ffff' }}>左腿:</strong><br/>
                {poseData.leftLegAngle}°
              </div>
              <div style={{ 
                background: 'rgba(0, 255, 255, 0.1)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.2)',
                gridColumn: '1 / -1'
              }}>
                <strong style={{ color: '#00ffff' }}>右腿:</strong> {poseData.rightLegAngle}°
              </div>
            </div>
            
            {isRecording && (
              <div style={{ 
                marginTop: '16px',
                color: '#ff4757',
                fontWeight: '700',
                textAlign: 'center',
                fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                🔴 RECORDING... ({recordedPoses.length} SAMPLES)
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            color: 'rgba(0, 255, 255, 0.6)',
            textAlign: 'center',
            fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
            letterSpacing: '0.5px',
            padding: '20px'
          }}>
            WAITING FOR POSE DETECTION...
          </div>
        )}
        
        {/* 功能說明 - 簡化科技感 */}
        <div style={{ 
          marginTop: '20px', 
          fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
          color: 'rgba(0, 255, 255, 0.6)',
          textAlign: 'center',
          lineHeight: '1.5',
          letterSpacing: '0.3px',
          padding: '12px',
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 255, 0.1)'
        }}>
          💡 BIOMECHANICAL ANALYSIS • MOTION TRACKING • POSTURE DETECTION
        </div>
      </div>
    </div>
  );
};

export default PoseAnalyzer;
