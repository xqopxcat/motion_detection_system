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

// 優化的樣式系統
const styles = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .pose-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  .video-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
  }
  
  .video-container video,
  .video-container canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .floating-panel {
    position: absolute;
    background: rgba(13, 17, 31, 0.85);
    border: 1px solid rgba(0, 255, 255, 0.2);
    backdrop-filter: blur(15px);
    border-radius: 12px;
    padding: 12px;
    animation: fadeIn 0.3s ease-out;
    z-index: 10;
  }
  
  .compact-btn {
    background: linear-gradient(145deg, rgba(0, 123, 255, 0.8), rgba(0, 86, 179, 0.9));
    border: 1px solid rgba(0, 255, 255, 0.3);
    color: white;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    touch-action: manipulation;
    user-select: none;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  
  .compact-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
  }
  
  .compact-btn:active {
    transform: translateY(0);
  }
  
  .compact-btn.recording {
    background: linear-gradient(145deg, rgba(220, 53, 69, 0.8), rgba(255, 71, 87, 0.9));
    border-color: rgba(255, 71, 87, 0.4);
  }
  
  .compact-btn.success {
    background: linear-gradient(145deg, rgba(40, 167, 69, 0.8), rgba(46, 213, 115, 0.9));
    border-color: rgba(46, 213, 115, 0.3);
  }
  
  .compact-btn.danger {
    background: linear-gradient(145deg, rgba(220, 53, 69, 0.8), rgba(255, 71, 87, 0.9));
    border-color: rgba(255, 71, 87, 0.3);
  }
  
  .compact-btn.info {
    background: linear-gradient(145deg, rgba(23, 162, 184, 0.8), rgba(32, 201, 151, 0.9));
    border-color: rgba(23, 162, 184, 0.3);
  }
  
  .compact-btn.warning {
    background: linear-gradient(145deg, rgba(255, 152, 0, 0.8), rgba(255, 193, 7, 0.9));
    border-color: rgba(255, 152, 0, 0.3);
  }
  
  .compact-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  .status-text {
    color: #00ffff;
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.5px;
  }
  
  .recording-indicator {
    background: rgba(220, 53, 69, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: pulse 1.5s infinite;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    .pose-container {
      width: 100vw;
    }
    .floating-panel {
      padding: 10px;
    }
    
    .compact-btn {
      padding: 12px 16px;
      font-size: 12px;
      min-height: 44px;
    }
    
    .status-text {
      font-size: 11px;
    }
  }
`;

// 插入樣式
if (typeof document !== 'undefined' && !document.getElementById('optimized-pose-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'optimized-pose-styles';
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
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedFrames, setRecordedFrames] = useState(0);
  const [hasRecordedData, setHasRecordedData] = useState(false);

  // 添加上傳狀態
  const [isUploading, setIsUploading] = useState(false);
  const [createMotion] = useCreateMotionMutation();
  
  const { isMobile, platform } = useDeviceDetection();

  // ... 保持所有原有的函數邏輯不變 ...
  const startRecording = async () => {
    if (!videoRef.current || isRecordingRef.current) return;
    
    try {
      motionDataRef.current = [];
      recordedChunksRef.current = [];
      
      const canvas = canvasRef.current;
      const targetFPS = isMobile ? 30 : 60;
      const combinedStream = canvas.captureStream(targetFPS);
      
      const videoTrack = combinedStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('錄製解析度:', settings.width, 'x', settings.height, '@', settings.frameRate + 'fps');
      }
      
      let mediaRecorderOptions;
      
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: isMobile ? 2500000 : 5000000
        };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=h264',
          videoBitsPerSecond: isMobile ? 2000000 : 4000000
        };
      } else {
        mediaRecorderOptions = {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: isMobile ? 1500000 : 3000000
        };
      }
      
      mediaRecorderRef.current = new MediaRecorder(combinedStream, mediaRecorderOptions);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start(100);
      
      setIsRecording(true);
      isRecordingRef.current = true;
      const now = Date.now();
      recordingStartTimeRef.current = now;
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      setIsRecording(false);
      isRecordingRef.current = false;
      recordingStartTimeRef.current = null;
      setHasRecordedData(motionDataRef.current.length > 0);
      
      console.log(`錄製完成: ${motionDataRef.current.length} 幀, 持續時間: ${recordingDuration.toFixed(2)}s`);
    } catch (error) {
      console.error('停止錄製失敗:', error);
      setError('停止錄製失敗: ' + error.message);
    }
  };

  const downloadVideo = async () => {
    if (recordedChunksRef.current.length === 0) return;
    
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
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`影片下載完成 (${mimeType}, 檔案大小: ${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
  };

  const clearRecordedData = () => {
    motionDataRef.current = [];
    recordedChunksRef.current = [];
    recordingStartTimeRef.current = null;
    setHasRecordedData(false);
    setRecordedFrames(0);
    setRecordingDuration(0);
    console.log('已清除錄製數據');
  };

  const uploadToServer = async (videoBlob, motionData) => {
    try {
      const formData = new FormData();
      
      formData.append('video', videoBlob, `motion_${Date.now()}.webm`);
      
      const jsonBlob = new Blob([JSON.stringify(motionData, null, 2)], {
        type: 'application/json'
      });
      formData.append('landmarks', jsonBlob, `landmarks_${Date.now()}.json`);
      
      formData.append('title', `動作記錄 ${new Date().toLocaleDateString()}`);
      formData.append('description', '來自 AI Pose Detector 的動作記錄');
      formData.append('isPublic', 'false');
      formData.append('fps', isMobile ? '30' : '60');
      formData.append('platform', platform);
      formData.append('videoDuration', recordingDuration.toString());
      formData.append('width', videoRef.current?.videoWidth?.toString() || '640');
      formData.append('height', videoRef.current?.videoHeight?.toString() || '480');
      
      const response = await createMotion(formData);
      console.log(response);
      
      return response;
    } catch (error) {
      console.error('上傳到伺服器失敗:', error);
      throw error;
    }
  };
  
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
      clearRecordedData();
    } catch (error) {
      alert('上傳失敗: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ... 保持原有的 useEffect 和 detectPose 邏輯不變 ...
  useEffect(() => {
    let animationId;
    let isComponentMounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        
        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          outputSegmentationMasks: false
        });

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
          
          bvhExporterRef.current = new BVHExporter();
          
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
        const timestamp = performance.now();
        const results = await landmarkerRef.current.detectForVideo(video, timestamp);
        const filteredLandmarks = results.landmarks[0].filter((_, i) => allowedIndices.includes(i));
        const filteredWorldLandmarks = results.worldLandmarks[0].filter((_, i) => allowedIndices.includes(i));
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        if (results.landmarks && results.landmarks.length > 0) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            
            initMarkers(filteredLandmarks, canvas, ctx);
            initrConnections(filteredLandmarks, filteredConnections, canvas, ctx);
            
            ctx.restore();
            
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
        }
      } catch (err) {
        console.warn('姿態檢測錯誤:', err);
      }

      if (isComponentMounted) {
        animationId = requestAnimationFrame(detectPose);
      }
    };

    init();

    return () => {
      isComponentMounted = false;
      setIsDetecting(false);
      
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
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
        video.pause();
        
        if (video.srcObject) {
          const stream = video.srcObject;
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          video.srcObject = null;
        }
        video.load();
      }
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      recordedChunksRef.current = [];
      motionDataRef.current = [];
      recordingStartTimeRef.current = null;
    };
  }, []);

  return (
    <div className="pose-container" style={{
      width: isMobile ? '100vw' : 'calc(100vw - 80px)'
    }}>
      {/* 🔧 最大化視頻容器 - 全螢幕 */}
      <div className="video-container" style={{
        left: 0, // 為 Navigation 預留空間
        width: '100%'
      }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            transform: 'scaleX(-1)',
            background: 'linear-gradient(45deg, #000, #1a1a2e)'
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* 🔧 系統狀態 - 左上角 */}
      <div className="floating-panel" style={{
        top: isMobile ? '70px' : '20px', // 避開手機版 Navigation
        left: isMobile ? '15px' : '80px',
        minWidth: isMobile ? '120px' : '140px'
      }}>
        {isLoading && (
          <div className="status-text" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px' 
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid rgba(0, 255, 255, 0.3)',
              borderTop: '2px solid #00ffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            初始化中...
          </div>
        )}
        
        {error && (
          <div className="status-text" style={{ color: '#ff4757' }}>
            ⚠️ 系統錯誤
          </div>
        )}
        
        {isDetecting && !isLoading && !error && (
          <div className="status-text" style={{ color: '#2ed573' }}>
            ✓ AI 檢測中
          </div>
        )}
      </div>

      {/* 🔧 錄製狀態顯示 - 正中上方 */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15
        }}>
          <div className="recording-indicator">
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
            }}></div>
            REC {recordingDuration.toFixed(0)}s • {recordedFrames}幀
          </div>
        </div>
      )}

      {/* 🔧 主要錄製控制 - 右上角 */}
      <div className="floating-panel" style={{
        top: '20px',
        right: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minWidth: isMobile ? '100px' : '120px'
      }}>
        <button
          className={`compact-btn ${isRecording ? 'recording' : 'success'}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isDetecting}
        >
          {isRecording ? (
            <>⏹ 停止</>
          ) : (
            <>🎬 錄製</>
          )}
        </button>
      </div>

      {/* 🔧 數據統計 - 左下角 */}
      {(isRecording || hasRecordedData) && (
        <div className="floating-panel" style={{
          bottom: '20px',
          left: isMobile ? '15px' : '80px'
        }}>
          <div className="status-text" style={{ fontSize: '11px', opacity: 0.8 }}>
            {recordedFrames > 0 && (
              <div>📊 {recordedFrames} 幀 • {recordingDuration.toFixed(1)}s</div>
            )}
            {hasRecordedData && !isRecording && (
              <div>✅ 數據已就緒</div>
            )}
          </div>
        </div>
      )}

      {/* 🔧 功能按鈕群 - 右下角 */}
      {hasRecordedData && (
        <div className="floating-panel" style={{
          bottom: '20px',
          right: '15px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '8px',
          alignItems: 'stretch'
        }}>
          {/* <button
            className="compact-btn info"
            onClick={downloadVideo}
          >
            📄 影片
          </button>
          
          <button
            className="compact-btn warning"
            onClick={() => exportJSON(motionDataRef)}
          >
            📥 JSON
          </button> */}
          
          <button
            className="compact-btn success"
            onClick={uploadToCloud}
            disabled={isUploading}
          >
            {isUploading ? '⏳' : '☁️'} 上傳
          </button>
          
          <button
            className="compact-btn danger"
            disabled={isUploading}
            onClick={clearRecordedData}
          >
            🗑 清除
          </button>
        </div>
      )}
    </div>
  );
};

export default PoseDetector;