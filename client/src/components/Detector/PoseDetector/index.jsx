// src/components/PoseDetector.jsx
import React, { useRef, useEffect, useState } from 'react';
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';
import { allowedIndices, createFilteredConnections } from "../../../constants";
import { initMarkers, initrConnections } from "../../../utils/initMarkerConnections";
import { BVHExporter } from "../../../utils/bvhExporter";
import { exportJSON } from '../../../utils/exportFunction';
import './PoseDetector.scss';
import { useCreateMotionMutation } from "../../../redux/services/motionCoreAPI";
import { useDeviceDetection } from "../../../hooks/useDeviceDetection";

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
  
  .mobile-optimized * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .mobile-optimized button {
    animation: fadeIn 0.4s ease-out;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .mobile-optimized button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
  
  .tech-panel {
    background: linear-gradient(145deg, rgba(13, 17, 31, 0.95), rgba(25, 39, 67, 0.9));
    border: 1px solid rgba(0, 255, 255, 0.2);
    backdrop-filter: blur(15px);
    position: relative;
    overflow: hidden;
  }
  
  .tech-panel::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    animation: dataFlow 3s infinite;
  }
  
  .status-indicator {
    position: relative;
    overflow: hidden;
  }
  
  .status-indicator::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.8), transparent);
    animation: scanLine 2s infinite linear;
  }
  
  .loading-spinner {
    animation: spin 1s linear infinite !important;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .recording-pulse {
    animation: pulse 1.5s infinite ease-in-out;
  }
  
  @media (max-width: 768px) {
    .mobile-optimized {
      padding: 8px !important;
    }
  }
`;

// 插入樣式到頁面
if (typeof document !== 'undefined' && !document.getElementById('mobile-pose-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'mobile-pose-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const filteredConnections = createFilteredConnections(allowedIndices);

export const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
export const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

const PoseDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const bvhExporterRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const motionDataRef = useRef([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // 錄製相關狀態
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // 添加 ref 來立即反映錄製狀態
  const recordingStartTimeRef = useRef(null); // 使用 ref 來立即反映錄製開始時間
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedFrames, setRecordedFrames] = useState(0);
  const [hasRecordedData, setHasRecordedData] = useState(false);

  // 添加上傳狀態
  const [isUploading, setIsUploading] = useState(false);
  const [createMotion] = useCreateMotionMutation();
  
  const { isMobile, platform } = useDeviceDetection();

  // 錄製控制函數
  const startRecording = async () => {
    if (!videoRef.current || isRecordingRef.current) return;
    
    try {
      // 清空之前的數據
      motionDataRef.current = [];
      recordedChunksRef.current = [];
      
      // 開始錄製影片
      const canvas = canvasRef.current;
      
      // 提高Canvas捕獲品質 - 使用動態幀率並提高解析度
      const targetFPS = isMobile ? 30 : 60; // 調整為實際可達到的幀率
      const combinedStream = canvas.captureStream(targetFPS);
      
      // 設定更好的視頻軌道參數
      const videoTrack = combinedStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('錄製解析度:', settings.width, 'x', settings.height, '@', settings.frameRate + 'fps');
      }
      
      // 優化MediaRecorder設定 - 嘗試使用更好的編碼器和品質
      let mediaRecorderOptions;
      
      // 嘗試不同的編碼器，優先使用高品質選項
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: isMobile ? 2500000 : 5000000 // 2.5Mbps (手機) / 5Mbps (桌面)
        };
        console.log('使用 VP9 編碼器，高品質模式');
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=h264',
          videoBitsPerSecond: isMobile ? 2000000 : 4000000 // 2Mbps (手機) / 4Mbps (桌面)
        };
        console.log('使用 H264 編碼器');
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mediaRecorderOptions = {
          mimeType: 'video/mp4',
          videoBitsPerSecond: isMobile ? 2000000 : 4000000
        };
        console.log('使用 MP4 格式');
      } else {
        // 退回到原始設定，但提高品質
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: isMobile ? 1500000 : 3000000 // 1.5Mbps (手機) / 3Mbps (桌面)
        };
        console.log('使用 VP8 編碼器 (高品質)');
      }
      
      mediaRecorderRef.current = new MediaRecorder(combinedStream, mediaRecorderOptions);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // 設定更頻繁的數據收集，減少延遲
      mediaRecorderRef.current.start(100); // 每100ms收集一次數據，提高流暢度
      
      // 設置錄製狀態
      setIsRecording(true);
      isRecordingRef.current = true; // 立即更新 ref
      const now = Date.now();
      recordingStartTimeRef.current = now; // 立即設置錄製開始時間
      setRecordedFrames(0);
      setRecordingDuration(0);
      
      console.log('開始錄製影片和動作數據...');
    } catch (error) {
      console.error('開始錄製失敗:', error);
      setError('錄製失敗: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    
    try {
      // 停止影片錄製
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      setIsRecording(false);
      isRecordingRef.current = false; // 立即更新 ref
      recordingStartTimeRef.current = null; // 清理錄製開始時間 ref
      setHasRecordedData(motionDataRef.current.length > 0);
      
      console.log(`錄製完成: ${motionDataRef.current.length} 幀, 持續時間: ${recordingDuration.toFixed(2)}s`);
    } catch (error) {
      console.error('停止錄製失敗:', error);
      setError('停止錄製失敗: ' + error.message);
    }
  };

  const downloadVideo = async () => {
    if (recordedChunksRef.current.length === 0) return;
    
    // 檢測錄製的MIME類型
    const firstChunk = recordedChunksRef.current[0];
    let mimeType = 'video/webm';
    let fileExtension = '.webm';
    
    if (firstChunk.type) {
      mimeType = firstChunk.type;
      if (mimeType.includes('mp4')) {
        fileExtension = '.mp4';
      } else if (mimeType.includes('webm')) {
        fileExtension = '.webm';
      }
    }
    
    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pose_detection_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}${fileExtension}`;
    
    // 強制下載
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`影片下載完成 (${mimeType}, 檔案大小: ${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
  };


  const clearRecordedData = () => {
    motionDataRef.current = [];
    recordedChunksRef.current = [];
    recordingStartTimeRef.current = null; // 清理錄製開始時間 ref
    setHasRecordedData(false);
    setRecordedFrames(0);
    setRecordingDuration(0);
    console.log('已清除錄製數據');
  };

  useEffect(() => {
    let animationId;
    let isComponentMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        
        // 初始化 MediaPipe 視覺任務
        const vision = await FilesetResolver.forVisionTasks(
          MEDIAPIPE_WASM_URL
        );

        // 創建姿態檢測器
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              MODEL_URL,
            delegate: 'CPU' // 使用 CPU 避免 GPU 資源衝突
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: false
        });

        // 啟動攝影機 - 根據設備類型優化，修正長寬比
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: isMobile ? 720 : 1280 }, // 提高解析度：720p (手機) / 1280p (桌面)
            height: { ideal: isMobile ? 960 : 720 }, // 修正比例：手機 3:4 (720:960)，桌面 16:9 (1280:720)
            frameRate: { ideal: isMobile ? 30 : 60, min: 24 }, // 調整幀率為實際可達到的值
            facingMode: 'user' // 使用前置攝像頭
          },
          audio: false // 明確指定不需要音頻
        });

        if (videoRef.current && isComponentMounted) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // 初始化 BVH 導出器
          bvhExporterRef.current = new BVHExporter();
          
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
          setIsDetecting(true);
          
          // 開始姿態檢測
          detectPose();
        }
      } catch (err) {
        console.error('初始化錯誤:', err);
        setError('無法初始化姿態檢測器或攝影機');
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
        const filteredLandmarks = results.landmarks[0].filter((_, i) => allowedIndices.includes(i));
        const filteredWorldLandmarks = results.worldLandmarks[0].filter((_, i) => allowedIndices.includes(i));
        
        // 設置畫布尺寸
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 先繪製原始影像到 canvas 上
        ctx.save();
        ctx.scale(-1, 1); // 鏡像翻轉
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // 如果檢測到姿態，繪製關鍵點和連線
        if (results.landmarks && results.landmarks.length > 0) {
            // 應用鏡像翻轉來匹配影像
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            
            initMarkers(filteredLandmarks, canvas, ctx);
            initrConnections(filteredLandmarks, filteredConnections, canvas, ctx);
            
            ctx.restore();
            
            // 如果正在錄製，保存動作數據
            if (isRecordingRef.current && filteredWorldLandmarks && filteredWorldLandmarks.length > 0) {
              const currentTime = Date.now();
              const frameTime = recordingStartTimeRef.current ? (currentTime - recordingStartTimeRef.current) / 1000 : 0;
              const frameData = {
                timestamp: currentTime,
                frameTime: frameTime,
                frameNumber: motionDataRef.current.length,
                landmarks2D: filteredLandmarks,
                landmarks3D: filteredWorldLandmarks,
                confidence: results.landmarks[0].map(landmark => landmark.visibility || 0.8)
              };
              
              motionDataRef.current.push(frameData);
              setRecordedFrames(motionDataRef.current.length);
              setRecordingDuration(frameTime);
            }
            
            // 可選：顯示世界座標（3D座標）
            if (filteredWorldLandmarks && filteredWorldLandmarks.length > 0) {
                // 在控制台輸出 3D 座標資訊
                // console.log('3D 世界座標:', filteredWorldLandmarks);
            }
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
      setIsDetecting(false);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      // 停止錄製（如果正在進行）
      if (isRecordingRef.current) {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
      
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
          landmarkerRef.current = null;
        } catch (error) {
          console.warn('關閉 landmarker 時發生錯誤:', error);
        }
      }
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // 暫停視頻
        video.pause();
        
        // 獲取並停止所有軌道
        if (video.srcObject) {
          const stream = video.srcObject;
          console.log('正在停止攝影機軌道...', stream.getTracks().length);
          
          stream.getTracks().forEach((track, index) => {
            console.log(`停止軌道 ${index}:`, track.kind, track.readyState);
            track.stop();
            
            // 確保軌道完全停止
            setTimeout(() => {
              if (track.readyState !== 'ended') {
                console.warn(`軌道 ${index} 未正確停止，強制停止`);
                track.stop();
              }
            }, 100);
          });
          
          // 清空 srcObject
          video.srcObject = null;
        }
        
        // 清空 video 元素
        video.load();
      }
      // 清理 Canvas
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // 清理 refs
      recordedChunksRef.current = [];
      motionDataRef.current = [];
      recordingStartTimeRef.current = null;
    };
  }, []);
  
  // 添加 API 請求函數
  const uploadToServer = async (videoBlob, motionData) => {
    try {
      const formData = new FormData();
      
      // 添加影片檔案
      formData.append('video', videoBlob, `motion_${Date.now()}.webm`);
      
      // 添加姿勢數據（轉換為 JSON 檔案）
      const jsonBlob = new Blob([JSON.stringify(motionData, null, 2)], {
        type: 'application/json'
      });
      formData.append('landmarks', jsonBlob, `landmarks_${Date.now()}.json`);
      
      // 添加其他元數據
      formData.append('title', `動作記錄 ${new Date().toLocaleDateString()}`);
      formData.append('description', '來自 AI Pose Detector 的動作記錄');
      formData.append('isPublic', 'false');
      formData.append('fps', isMobile ? '30' : '60');
      formData.append('platform', platform);
      formData.append('videoDuration', recordingDuration.toString());
      formData.append('width', videoRef.current?.videoWidth?.toString() || '640');
      formData.append('height', videoRef.current?.videoHeight?.toString() || '480');
      // 發送到後端 API
      const response = await createMotion(formData);
      console.log(response);
      
      return response;
    } catch (error) {
      console.error('上傳到伺服器失敗:', error);
      throw error;
    }
  };
  
  // 新增：一鍵上傳功能
  const uploadToCloud = async () => {
    if (recordedChunksRef.current.length === 0 || motionDataRef.current.length === 0) {
      alert('沒有可上傳的數據');
      return;
    }
    
    try {
      setIsUploading(true);
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const result = await uploadToServer(blob, motionDataRef.current);
      console.log(result);
    } catch (error) {
      alert('上傳失敗: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mobile-optimized mobile-pose-detector" style={{ 
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
          🤖 AI POSE DETECTOR
        </h1>
        <div style={{
          marginTop: '6px',
          fontSize: 'clamp(0.7rem, 2.5vw, 0.85rem)',
          color: 'rgba(0, 255, 255, 0.7)',
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          REAL-TIME MOTION CAPTURE SYSTEM
        </div>
      </div>
      
      {/* 狀態指示器 - 科技面板風格 */}
      <div className="status-indicator" style={{ 
        marginBottom: '16px',
        width: '100%',
        maxWidth: 'min(380px, 92vw)',
        position: 'relative',
        zIndex: 1
      }}>
        {isLoading && (
          <div className="tech-panel" style={{ 
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
            <div className="loading-spinner" style={{
              width: '18px',
              height: '18px',
              border: '2px solid rgba(0, 255, 255, 0.2)',
              borderTop: '2px solid #00ffff',
              borderRadius: '50%'
            }}></div>
            INITIALIZING AI SYSTEM...
          </div>
        )}
        {error && (
          <div className="tech-panel" style={{ 
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
        {isDetecting && (
          <div className="tech-panel" style={{ 
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
            ✓ AI DETECTION ACTIVE
          </div>
        )}
      </div>

      {/* 錄製控制面板 - 科技感設計 */}
      <div className="tech-panel" style={{ 
        marginBottom: '20px',
        padding: '20px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: 'min(380px, 92vw)',
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
          📹 MOTION CAPTURE
        </h3>
        
        {/* 錄製狀態顯示 - 科技感 */}
        {isRecording && (
          <div className="recording-pulse" style={{ 
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'linear-gradient(145deg, rgba(31, 17, 13, 0.95), rgba(67, 39, 25, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(255, 193, 7, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              color: '#ffc107', 
              fontWeight: '700',
              fontSize: 'clamp(0.85rem, 3vw, 1rem)',
              textAlign: 'center',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ff4757',
                boxShadow: '0 0 10px #ff4757',
                animation: 'pulse 1s infinite'
              }}></div>
              RECORDING {recordingDuration.toFixed(1)}s • {recordedFrames} FRAMES
            </div>
          </div>
        )}
        
        {/* 控制按鈕組 - 現代化設計 */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%'
        }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isDetecting}
            style={{
              padding: '16px 24px',
              background: isRecording 
                ? 'linear-gradient(145deg, #ff4757, #ff3838)' 
                : 'linear-gradient(145deg, #2ed573, #26d463)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: isDetecting ? 'pointer' : 'not-allowed',
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
              textTransform: 'uppercase',
              position: 'relative',
              overflow: 'hidden'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'translateY(2px) scale(0.98)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
            }}
          >
            {isRecording ? '⏹ STOP RECORDING' : '🎬 START RECORDING'}
          </button>
          
          {hasRecordedData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              width: '100%'
            }}>
              <button
                onClick={downloadVideo}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(145deg, #17a2b8, #138496)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  touchAction: 'manipulation',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
              >
                📄 VIDEO
              </button>
              
              <button
                onClick={ () => exportJSON(motionDataRef) }
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(145deg, #ff9800, #f57c00)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  touchAction: 'manipulation',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
              >
                📥 JSON
              </button>
              
              {/* 新增：上傳到雲端按鈕 */}
              <button
                onClick={uploadToCloud}
                disabled={isUploading}
                style={{
                  padding: '12px 16px',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  touchAction: 'manipulation',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(23, 162, 184, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease',
                  background: isUploading 
                    ? 'linear-gradient(145deg, #6c757d, #5a6268)' 
                    : 'linear-gradient(145deg, #28a745, #20c997)',
                  gridColumn: '1 / -1'
                }}
              >
                {isUploading ? '☁️ UPLOADING...' : '☁️ UPLOAD TO CLOUD'}
              </button>
              
              <button
                onClick={clearRecordedData}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(145deg, #dc3545, #c82333)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                  minHeight: '48px',
                  gridColumn: '1 / -1',
                  touchAction: 'manipulation',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
              >
                🗑 CLEAR DATA
              </button>
            </div>
          )}
        </div>
        
        {/* 功能說明 - 簡化 */}
        <div style={{ 
          marginTop: '16px',
          fontSize: 'clamp(0.7rem, 2.2vw, 0.8rem)',
          color: 'rgba(0, 255, 255, 0.6)',
          textAlign: 'center',
          lineHeight: '1.4',
          letterSpacing: '0.3px'
        }}>
          💡 SYNCHRONIZED VIDEO & 3D MOTION DATA CAPTURE
        </div>
      </div>

      {/* 視頻容器 - 科技感邊框和效果，修正長寬比 */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          maxWidth: isMobile ? '100vw' : 'min(400px, 92vw)',
          height: isMobile ? 'calc(100vw * 4 / 3)' : undefined, // 手機維持 3:4 比例
          aspectRatio: isMobile ? '3/4' : '16/9', // 桌面改為 16:9 比例
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
        {/* 科技感邊框動效 */}
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
            width: '100vw',
            maxWidth: isMobile ? '100vw' : '100%',
            height: isMobile ? 'calc(100vw * 4 / 3)' : '100%',
            maxHeight: isMobile ? '100vh' : '100%',
            display: 'block',
            objectFit: 'cover', // 使用 cover 保持比例，避免拉伸
            background: 'linear-gradient(45deg, #000, #1a1a2e)',
            transform: 'scaleX(-1)',
            borderRadius: isMobile ? '0' : '22px',
            margin: 0,
            padding: 0,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            maxWidth: isMobile ? '100vw' : '100%',
            height: isMobile ? 'calc(100vw * 4 / 3)' : '100%',
            maxHeight: isMobile ? '100vh' : '100%',
            pointerEvents: 'none',
            borderRadius: isMobile ? '0' : '22px',
            objectFit: 'cover', // 同樣設定 cover
          }}
        />
        
        {/* 錄製狀態指示器 - 增強科技感 */}
        {isRecording && (
          <div
            className="recording-indicator"
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
            REC {recordingDuration.toFixed(0)}s
          </div>
        )}
      </div>
    </div>
  );
};

export default PoseDetector;
