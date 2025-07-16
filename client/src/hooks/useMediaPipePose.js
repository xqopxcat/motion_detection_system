import { useEffect, useState, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// 原有的 usePoseLandmark hook
export const usePoseLandmark = (videoRef, setLandmarks, delay = 0) => {
    useEffect(() => {
        let landmarker;
        let running = true;
        let animationId;

        const initPose = async () => {
            try {
                // 等待視頻元素完全準備就緒
                await new Promise((resolve) => {
                    const checkVideo = () => {
                        if (videoRef.current && 
                            videoRef.current.readyState >= 3 && // HAVE_FUTURE_DATA 或更高
                            videoRef.current.videoWidth > 0 && 
                            videoRef.current.videoHeight > 0) {
                            resolve();
                        } else {
                            setTimeout(checkVideo, 100);
                        }
                    };
                    checkVideo();
                });

                // 為多攝像頭添加延遲，避免資源衝突
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // 初始化 MediaPipe 視覺任務
                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );
                
                // 創建姿態檢測器
                landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                        delegate: 'CPU', // 使用 CPU 而非 GPU 以避免衝突
                    },
                    runningMode: 'VIDEO',
                    outputSegmentationMasks: false,
                });

                // 姿態檢測函數
                const detect = async () => {
                    if (!running || !videoRef.current || !landmarker) return;
                    
                    // 確保視頻有有效的尺寸
                    const video = videoRef.current;
                    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 3) {
                        if (running) {
                            // 使用 setTimeout 而不是 requestAnimationFrame 來減少延遲
                            setTimeout(detect, 16); // 約 60fps
                        }
                        return;
                    }
                    
                    try {
                        // 使用 video.currentTime 作為時間戳以獲得更好的同步
                        const timestamp = video.currentTime * 1000;
                        const results = await landmarker.detectForVideo(video, timestamp);
                        if (results.landmarks && results.landmarks.length > 0) {
                            setLandmarks(results.landmarks[0]); // 檢測到單人姿態
                        } else {
                            // 如果沒有檢測到姿態，清除之前的標記點
                            setLandmarks([]);
                        }
                    } catch (error) {
                        console.warn('姿態檢測錯誤:', error);
                        // 在錯誤情況下，清除標記點
                        setLandmarks([]);
                    }
                    
                    if (running) {
                        // 使用 setTimeout 來確保更一致的幀率
                        setTimeout(detect, 16); // 約 60fps，比 requestAnimationFrame 更穩定
                    }
                };

                detect();
            } catch (error) {
                console.error('初始化姿態檢測器失敗:', error);
            }
        };

        initPose();
        
        // 清理函數
        return () => {
            running = false;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (landmarker) {
                landmarker.close();
            }
        };
    }, [videoRef, setLandmarks, delay]); // 依賴項包含視頻引用、設置標記點函數和延遲時間
};

// 新的 useMediaPipePose hook，提供更完整的 API
export const useMediaPipePose = () => {
    const [results, setResults] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const landmarkerRef = useRef(null);
    const runningRef = useRef(false);

    /**
     * 初始化 MediaPipe 姿態檢測器
     */
    const initializePose = useCallback(async () => {
        try {
            if (landmarkerRef.current) {
                console.log('姿態檢測器已經初始化');
                setIsInitialized(true);
                return;
            }

            console.log('正在初始化 MediaPipe 姿態檢測器...');
            
            // 初始化 MediaPipe 視覺任務
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            
            // 創建姿態檢測器
            landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
                    delegate: 'CPU',
                },
                runningMode: 'VIDEO',
                outputSegmentationMasks: false,
            });

            setIsInitialized(true);
            console.log('MediaPipe 姿態檢測器初始化完成');
        } catch (error) {
            console.error('初始化姿態檢測器失敗:', error);
            setIsInitialized(false);
            throw error;
        }
    }, []);

    /**
     * 處理單幀姿態檢測
     */
    const processPose = useCallback(async (videoElement) => {
        if (!landmarkerRef.current || !videoElement) {
            console.warn('姿態檢測器未初始化或視頻元素無效');
            return;
        }

        // 確保視頻有有效的尺寸
        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0 || videoElement.readyState < 3) {
            return;
        }

        try {
            // 使用 video.currentTime 作為時間戳
            const timestamp = videoElement.currentTime * 1000;
            const detectionResults = await landmarkerRef.current.detectForVideo(videoElement, timestamp);
            
            setResults({
                poseLandmarks: detectionResults.landmarks && detectionResults.landmarks.length > 0 
                    ? detectionResults.landmarks[0] 
                    : null,
                worldLandmarks: detectionResults.worldLandmarks && detectionResults.worldLandmarks.length > 0 
                    ? detectionResults.worldLandmarks[0] 
                    : null,
                segmentationMasks: detectionResults.segmentationMasks || null,
                timestamp: timestamp
            });
        } catch (error) {
            console.warn('姿態檢測錯誤:', error);
            setResults({
                poseLandmarks: null,
                worldLandmarks: null,
                segmentationMasks: null,
                timestamp: Date.now()
            });
        }
    }, []);

    /**
     * 清理資源
     */
    const cleanup = useCallback(() => {
        console.log('清理姿態檢測器資源');
        runningRef.current = false;
        if (landmarkerRef.current) {
            try {
                landmarkerRef.current.close();
            } catch (error) {
                console.warn('清理姿態檢測器時出錯:', error);
            }
            landmarkerRef.current = null;
        }
        setIsInitialized(false);
        setResults(null);
    }, []);

    // 組件卸載時自動清理
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return {
        results,
        isInitialized,
        initializePose,
        processPose,
        cleanup
    };
};
