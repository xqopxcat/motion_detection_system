/**
 * 攝像頭管理器
 * 專門處理攝像頭的初始化、錯誤恢復和資源管理
 */

import { safePlayVideo, stopVideoSafely, waitForVideoReady } from './videoUtils';

class CameraManager {
    constructor() {
        this.cameras = new Map();
        this.initializingCameras = new Set();
        this.retryDelays = [500, 1000, 2000, 3000]; // 重試延遲序列
    }

    /**
     * 初始化攝像頭
     * @param {string} cameraId - 攝像頭ID
     * @param {HTMLVideoElement} videoElement - 視頻元素
     * @param {Object} constraints - 媒體約束
     * @param {string} label - 攝像頭標籤
     * @returns {Promise<MediaStream>} 媒體流
     */
    async initializeCamera(cameraId, videoElement, constraints, label = '攝像頭') {
        if (this.initializingCameras.has(cameraId)) {
            throw new Error(`${label} 正在初始化中`);
        }

        try {
            this.initializingCameras.add(cameraId);
            
            // 清理現有的攝像頭
            await this.cleanupCamera(cameraId);

            console.log(`${label}: 開始初始化，約束:`, constraints);

            // 獲取媒體流
            const stream = await this.getMediaStreamWithRetry(constraints, label);
            
            // 設置視頻元素
            await this.setupVideoElement(videoElement, stream, label);
            
            // 存儲攝像頭信息
            this.cameras.set(cameraId, {
                stream,
                videoElement,
                label,
                constraints,
                isActive: true
            });

            console.log(`${label}: 初始化完成`);
            return stream;

        } catch (error) {
            console.error(`${label}: 初始化失敗:`, error);
            throw error;
        } finally {
            this.initializingCameras.delete(cameraId);
        }
    }

    /**
     * 帶重試機制的媒體流獲取
     * @param {Object} constraints - 媒體約束
     * @param {string} label - 攝像頭標籤
     * @param {number} maxRetries - 最大重試次數
     * @returns {Promise<MediaStream>} 媒體流
     */
    async getMediaStreamWithRetry(constraints, label, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                console.log(`${label}: 嘗試獲取媒體流 (第 ${attempt + 1} 次)`);
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                // 驗證流的有效性
                if (!stream || stream.getTracks().length === 0) {
                    throw new Error('獲取的媒體流無效');
                }

                const videoTracks = stream.getVideoTracks();
                if (videoTracks.length === 0) {
                    throw new Error('媒體流中沒有視頻軌道');
                }

                console.log(`${label}: 媒體流獲取成功，視頻軌道:`, videoTracks[0].label);
                return stream;

            } catch (error) {
                lastError = error;
                console.warn(`${label}: 第 ${attempt + 1} 次嘗試失敗:`, error.message);

                if (attempt < maxRetries) {
                    const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)];
                    console.log(`${label}: ${delay}ms 後重試...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // 對於某些錯誤，調整約束重試
                    if (error.name === 'OverconstrainedError' || error.name === 'NotFoundError') {
                        constraints = this.relaxConstraints(constraints, attempt);
                        console.log(`${label}: 調整約束後重試:`, constraints);
                    }
                } else {
                    break;
                }
            }
        }

        throw new Error(`${label} 獲取媒體流失敗 (重試 ${maxRetries} 次): ${lastError?.message || '未知錯誤'}`);
    }

    /**
     * 設置視頻元素
     * @param {HTMLVideoElement} videoElement - 視頻元素
     * @param {MediaStream} stream - 媒體流
     * @param {string} label - 攝像頭標籤
     */
    async setupVideoElement(videoElement, stream, label) {
        if (!videoElement) {
            throw new Error(`${label} 視頻元素不存在`);
        }

        if (!videoElement.isConnected) {
            throw new Error(`${label} 視頻元素未連接到 DOM`);
        }

        try {
            // 使用安全播放函數
            await safePlayVideo(videoElement, stream, label);
            
            // 等待視頻準備就緒
            await waitForVideoReady(videoElement, label, 20000);
            
            console.log(`${label}: 視頻元素設置完成`, {
                videoWidth: videoElement.videoWidth,
                videoHeight: videoElement.videoHeight,
                readyState: videoElement.readyState
            });

        } catch (error) {
            // 清理失敗的流
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            throw error;
        }
    }

    /**
     * 清理攝像頭資源
     * @param {string} cameraId - 攝像頭ID
     */
    async cleanupCamera(cameraId) {
        const camera = this.cameras.get(cameraId);
        if (!camera) return;

        try {
            console.log(`${camera.label}: 清理攝像頭資源`);
            
            // 停止視頻流
            if (camera.videoElement) {
                await stopVideoSafely(camera.videoElement, camera.label);
            }

            // 標記為非活動狀態
            camera.isActive = false;
            
            this.cameras.delete(cameraId);
            console.log(`${camera.label}: 清理完成`);
            
        } catch (error) {
            console.error(`${camera.label}: 清理時發生錯誤:`, error);
        }
    }

    /**
     * 清理所有攝像頭資源
     */
    async cleanupAllCameras() {
        const cleanupPromises = Array.from(this.cameras.keys()).map(cameraId => 
            this.cleanupCamera(cameraId)
        );
        
        await Promise.allSettled(cleanupPromises);
        console.log('所有攝像頭資源已清理');
    }

    /**
     * 檢查攝像頭是否處於活動狀態
     * @param {string} cameraId - 攝像頭ID
     * @returns {boolean} 是否活動
     */
    isCameraActive(cameraId) {
        const camera = this.cameras.get(cameraId);
        return camera && camera.isActive && camera.stream && 
               camera.stream.getTracks().some(track => track.readyState === 'live');
    }

    /**
     * 獲取攝像頭信息
     * @param {string} cameraId - 攝像頭ID
     * @returns {Object|null} 攝像頭信息
     */
    getCameraInfo(cameraId) {
        return this.cameras.get(cameraId) || null;
    }

    /**
     * 放寬媒體約束（用於重試）
     * @param {Object} constraints - 原始約束
     * @param {number} attempt - 嘗試次數
     * @returns {Object} 調整後的約束
     */
    relaxConstraints(constraints, attempt) {
        const relaxed = JSON.parse(JSON.stringify(constraints));
        
        if (relaxed.video) {
            switch (attempt) {
                case 1:
                    // 第一次重試：降低解析度
                    if (relaxed.video.width?.ideal) relaxed.video.width.ideal = 640;
                    if (relaxed.video.height?.ideal) relaxed.video.height.ideal = 480;
                    break;
                case 2:
                    // 第二次重試：進一步降低並移除幀率限制
                    if (relaxed.video.width?.ideal) relaxed.video.width.ideal = 320;
                    if (relaxed.video.height?.ideal) relaxed.video.height.ideal = 240;
                    delete relaxed.video.frameRate;
                    break;
                case 3:
                    // 第三次重試：使用最基本的約束
                    relaxed.video = {
                        deviceId: relaxed.video.deviceId,
                        facingMode: relaxed.video.facingMode
                    };
                    break;
                default:
                    // 最後嘗試：只保留設備 ID
                    relaxed.video = relaxed.video.deviceId ? 
                        { deviceId: relaxed.video.deviceId } : true;
                    break;
            }
        }

        return relaxed;
    }

    /**
     * 獲取所有活動攝像頭的狀態
     * @returns {Object} 狀態報告
     */
    getStatus() {
        const status = {
            totalCameras: this.cameras.size,
            activeCameras: 0,
            initializingCameras: this.initializingCameras.size,
            cameras: {}
        };

        for (const [cameraId, camera] of this.cameras.entries()) {
            const isActive = this.isCameraActive(cameraId);
            if (isActive) status.activeCameras++;

            status.cameras[cameraId] = {
                label: camera.label,
                isActive,
                videoSize: camera.videoElement ? {
                    width: camera.videoElement.videoWidth,
                    height: camera.videoElement.videoHeight
                } : null,
                tracks: camera.stream ? camera.stream.getTracks().length : 0
            };
        }

        return status;
    }
}

// 單例實例
let cameraManagerInstance = null;

export const getCameraManager = () => {
    if (!cameraManagerInstance) {
        cameraManagerInstance = new CameraManager();
    }
    return cameraManagerInstance;
};

export default CameraManager;
