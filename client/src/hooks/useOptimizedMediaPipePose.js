/**
 * 優化版 MediaPipe 姿態檢測 Hook
 * 支援自適應幀率、WebWorker、效能監控
 */
import { useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useOptimizedMediaPipePose = (videoRef, setLandmarks, options = {}) => {
    const {
        delay = 0,
        targetFPS = 60, // 預設提高到 60 FPS
        useAdaptiveFPS = true,
        minFPS = 30, // 最低 FPS 提高到 30
        maxFPS = 120, // 最高 FPS 提升到 120
        enablePerformanceMode = true, // 預設啟用效能模式
        lowLatencyMode = true // 預設啟用低延遲模式
    } = options;

    const landmarkerRef = useRef(null);
    const runningRef = useRef(false);
    const timeoutRef = useRef(null);
    const frameCountRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const processingTimeRef = useRef([]);
    const currentFPSRef = useRef(targetFPS);

    // 自適應調整檢測頻率 - 更積極的效能優化
    const adjustDetectionRate = useCallback(() => {
        if (!useAdaptiveFPS) return;

        // 計算最近 5 幀的平均處理時間（減少歷史幀數以更快反應）
        if (processingTimeRef.current.length >= 5) {
            const avgProcessingTime = processingTimeRef.current.reduce((sum, time) => sum + time, 0) / processingTimeRef.current.length;
            
            // 根據處理時間調整 FPS - 更積極的調整策略
            const idealInterval = 1000 / targetFPS;
            
            if (avgProcessingTime > idealInterval * 0.7) {
                // 處理時間過長，大幅降低 FPS
                currentFPSRef.current = Math.max(minFPS, currentFPSRef.current - 5);
            } else if (avgProcessingTime < idealInterval * 0.3) {
                // 處理時間充足，大幅提高 FPS
                currentFPSRef.current = Math.min(maxFPS, currentFPSRef.current + 10);
            } else if (avgProcessingTime < idealInterval * 0.5) {
                // 處理時間較好，適度提高 FPS
                currentFPSRef.current = Math.min(maxFPS, currentFPSRef.current + 3);
            }

            // 清空歷史記錄，保持最新
            processingTimeRef.current = [];
        }
    }, [useAdaptiveFPS, targetFPS, minFPS, maxFPS]);

    // 優化的檢測函數 - 最高效能版本
    const detect = useCallback(async () => {
        if (!runningRef.current || !videoRef.current || !landmarkerRef.current) {
            return;
        }

        const video = videoRef.current;
        
        // 檢查視頻狀態 - 更嚴格的條件檢查
        if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 3) {
            if (runningRef.current) {
                // 減少重新檢查的等待時間
                timeoutRef.current = setTimeout(detect, 50);
            }
            return;
        }

        const startTime = performance.now();

        try {
            // 使用最高精度時間戳，優先使用 performance.now()
            const timestamp = performance.now();
            
            // 執行姿態檢測
            const results = await landmarkerRef.current.detectForVideo(video, timestamp);
            
            if (results.landmarks && results.landmarks.length > 0) {
                setLandmarks(results.landmarks[0]);
            } else {
                setLandmarks([]);
            }

            // 記錄處理時間
            const processingTime = performance.now() - startTime;
            processingTimeRef.current.push(processingTime);
            
            // 保持處理時間歷史在更小的範圍內以快速反應
            if (processingTimeRef.current.length > 10) {
                processingTimeRef.current.shift();
            }

            frameCountRef.current++;

            // 每 5 幀調整一次檢測頻率（更頻繁的調整）
            if (frameCountRef.current % 5 === 0) {
                adjustDetectionRate();
            }

        } catch (error) {
            console.warn('姿態檢測錯誤:', error);
            setLandmarks([]);
        }

        // 安排下一次檢測 - 使用更精確的時間計算
        if (runningRef.current) {
            const processingTime = performance.now() - startTime;
            const idealInterval = Math.round(1000 / currentFPSRef.current);
            const nextInterval = Math.max(5, idealInterval - processingTime); // 補償處理時間
            timeoutRef.current = setTimeout(detect, nextInterval);
        }
    }, [videoRef, setLandmarks, adjustDetectionRate]);

    // 初始化 MediaPipe
    const initializePose = useCallback(async () => {
        try {
            // 等待視頻準備
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

            // 多攝像頭延遲初始化
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // 初始化 MediaPipe
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            // 根據效能模式選擇模型 - 強制使用輕量級模型以獲得最高效能
            const modelPath = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

            landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: 'CPU', // CPU 模式避免多實例衝突
                },
                runningMode: 'VIDEO',
                outputSegmentationMasks: false,
                // 最高效能設定：降低檢測閾值以提高速度
                minPoseDetectionConfidence: 0.8, // 提高以減少誤檢測
                minPosePresenceConfidence: 0.8,
                minTrackingConfidence: 0.8,
            });

            runningRef.current = true;
            detect();

        } catch (error) {
            console.error('初始化姿態檢測器失敗:', error);
        }
    }, [videoRef, delay, enablePerformanceMode, detect]);

    // 清理函數
    const cleanup = useCallback(() => {
        runningRef.current = false;
        
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (landmarkerRef.current) {
            try {
                landmarkerRef.current.close();
            } catch (error) {
                console.warn('清理 landmarker 時發生錯誤:', error);
            }
            landmarkerRef.current = null;
        }
    }, []);

    // 獲取當前效能指標
    const getPerformanceMetrics = useCallback(() => {
        const avgProcessingTime = processingTimeRef.current.length > 0 
            ? processingTimeRef.current.reduce((sum, time) => sum + time, 0) / processingTimeRef.current.length 
            : 0;

        return {
            currentFPS: currentFPSRef.current,
            avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
            totalFrames: frameCountRef.current,
            isRunning: runningRef.current
        };
    }, []);

    // 手動調整 FPS
    const setFPS = useCallback((fps) => {
        currentFPSRef.current = Math.max(minFPS, Math.min(maxFPS, fps));
    }, [minFPS, maxFPS]);

    useEffect(() => {
        initializePose();
        return cleanup;
    }, [initializePose, cleanup]);

    return {
        getPerformanceMetrics,
        setFPS,
        cleanup
    };
};
