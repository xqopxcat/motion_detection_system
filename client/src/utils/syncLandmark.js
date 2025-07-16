/**
 * 雙攝像頭姿態同步工具
 * 用於處理多攝像頭間的時間同步和數據對齊
 */

/**
 * 計算兩個時間戳之間的差異
 * @param {number} timestamp1 - 第一個時間戳
 * @param {number} timestamp2 - 第二個時間戳
 * @returns {number} 時間差（毫秒）
 */
export const calculateTimeDifference = (timestamp1, timestamp2) => {
    return Math.abs(timestamp1 - timestamp2);
};

/**
 * 檢查兩組姿態數據是否同步
 * @param {Object} data1 - 第一個攝像頭的數據
 * @param {Object} data2 - 第二個攝像頭的數據
 * @param {number} tolerance - 同步容忍度（毫秒），默認100ms
 * @returns {boolean} 是否同步
 */
export const isSynchronized = (data1, data2, tolerance = 100) => {
    if (!data1 || !data2 || !data1.timestamp || !data2.timestamp) {
        return false;
    }
    return calculateTimeDifference(data1.timestamp, data2.timestamp) <= tolerance;
};

/**
 * 同步兩組姿態數據
 * @param {Array} landmarks1 - 第一個攝像頭的關鍵點
 * @param {Array} landmarks2 - 第二個攝像頭的關鍵點
 * @param {number} timestamp - 時間戳
 * @returns {Object} 同步後的數據
 */
export const syncLandmarkData = (landmarks1, landmarks2, timestamp = Date.now()) => {
    return {
        timestamp,
        camera1: {
            landmarks: landmarks1,
            pointCount: landmarks1.length,
            isValid: landmarks1.length > 0
        },
        camera2: {
            landmarks: landmarks2,
            pointCount: landmarks2.length,
            isValid: landmarks2.length > 0
        },
        sync: {
            bothCamerasActive: landmarks1.length > 0 && landmarks2.length > 0,
            totalPoints: landmarks1.length + landmarks2.length,
            quality: calculateSyncQuality(landmarks1, landmarks2)
        }
    };
};

/**
 * 計算同步品質分數
 * @param {Array} landmarks1 - 第一個攝像頭的關鍵點
 * @param {Array} landmarks2 - 第二個攝像頭的關鍵點
 * @returns {number} 品質分數 (0-1)
 */
export const calculateSyncQuality = (landmarks1, landmarks2) => {
    if (!landmarks1.length || !landmarks2.length) {
        return 0;
    }

    // 基於檢測到的關鍵點數量計算品質
    const expectedPoints = 33; // MediaPipe 姿態模型的標準關鍵點數
    const cam1Quality = Math.min(landmarks1.length / expectedPoints, 1);
    const cam2Quality = Math.min(landmarks2.length / expectedPoints, 1);
    
    // 計算平均品質
    return (cam1Quality + cam2Quality) / 2;
};

/**
 * 分析姿態對稱性
 * @param {Array} landmarks - 姿態關鍵點
 * @returns {Object} 對稱性分析結果
 */
export const analyzeSymmetry = (landmarks) => {
    if (!landmarks || landmarks.length < 33) {
        return { isValid: false };
    }

    // MediaPipe 姿態關鍵點索引
    const LEFT_SHOULDER = 11;
    const RIGHT_SHOULDER = 12;
    const LEFT_ELBOW = 13;
    const RIGHT_ELBOW = 14;
    const LEFT_WRIST = 15;
    const RIGHT_WRIST = 16;
    const LEFT_HIP = 23;
    const RIGHT_HIP = 24;

    try {
        // 計算肩膀高度差異
        const shoulderHeightDiff = Math.abs(
            landmarks[LEFT_SHOULDER].y - landmarks[RIGHT_SHOULDER].y
        );

        // 計算髖部高度差異
        const hipHeightDiff = Math.abs(
            landmarks[LEFT_HIP].y - landmarks[RIGHT_HIP].y
        );

        // 計算手臂對稱性
        const leftArmSpread = Math.abs(landmarks[LEFT_WRIST].x - landmarks[LEFT_SHOULDER].x);
        const rightArmSpread = Math.abs(landmarks[RIGHT_WRIST].x - landmarks[RIGHT_SHOULDER].x);
        const armSymmetry = 1 - Math.abs(leftArmSpread - rightArmSpread);

        return {
            isValid: true,
            shoulderBalance: 1 - shoulderHeightDiff,
            hipBalance: 1 - hipHeightDiff,
            armSymmetry: Math.max(0, armSymmetry),
            overallSymmetry: (
                (1 - shoulderHeightDiff) + 
                (1 - hipHeightDiff) + 
                Math.max(0, armSymmetry)
            ) / 3
        };
    } catch (error) {
        console.warn('對稱性分析錯誤:', error);
        return { isValid: false };
    }
};

/**
 * 比較兩個攝像頭的姿態差異
 * @param {Array} landmarks1 - 第一個攝像頭的關鍵點
 * @param {Array} landmarks2 - 第二個攝像頭的關鍵點
 * @returns {Object} 差異分析結果
 */
export const comparePoses = (landmarks1, landmarks2) => {
    if (!landmarks1.length || !landmarks2.length) {
        return { isValid: false };
    }

    const minLength = Math.min(landmarks1.length, landmarks2.length);
    let totalDifference = 0;
    let validComparisons = 0;

    for (let i = 0; i < minLength; i++) {
        const point1 = landmarks1[i];
        const point2 = landmarks2[i];

        if (point1 && point2) {
            const distance = Math.sqrt(
                Math.pow(point1.x - point2.x, 2) + 
                Math.pow(point1.y - point2.y, 2)
            );
            totalDifference += distance;
            validComparisons++;
        }
    }

    const avgDifference = validComparisons > 0 ? totalDifference / validComparisons : 1;
    const similarity = Math.max(0, 1 - avgDifference);

    return {
        isValid: true,
        averageDifference: avgDifference,
        similarity: similarity,
        validComparisons: validComparisons,
        recommendation: similarity > 0.8 ? '姿態高度相似' : 
                      similarity > 0.5 ? '姿態部分相似' : '姿態差異較大'
    };
};

/**
 * 創建同步數據緩衝區
 */
export class SyncBuffer {
    constructor(maxSize = 30) { // 保存最近30幀的數據
        this.buffer = [];
        this.maxSize = maxSize;
    }

    /**
     * 添加新的同步數據
     * @param {Object} syncData - 同步數據
     */
    add(syncData) {
        this.buffer.push({
            ...syncData,
            addedAt: Date.now()
        });

        // 保持緩衝區大小
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }

    /**
     * 獲取最近的數據
     * @param {number} count - 獲取的數據數量
     * @returns {Array} 最近的數據
     */
    getRecent(count = 10) {
        return this.buffer.slice(-count);
    }

    /**
     * 計算平均同步品質
     * @returns {number} 平均品質分數
     */
    getAverageQuality() {
        if (this.buffer.length === 0) return 0;

        const totalQuality = this.buffer.reduce((sum, data) => {
            return sum + (data.sync?.quality || 0);
        }, 0);

        return totalQuality / this.buffer.length;
    }

    /**
     * 清空緩衝區
     */
    clear() {
        this.buffer = [];
    }

    /**
     * 獲取同步統計信息
     * @returns {Object} 統計信息
     */
    getStats() {
        if (this.buffer.length === 0) {
            return { isValid: false };
        }

        const qualities = this.buffer.map(data => data.sync?.quality || 0);
        const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
        const maxQuality = Math.max(...qualities);
        const minQuality = Math.min(...qualities);

        const bothCamerasActiveCount = this.buffer.filter(
            data => data.sync?.bothCamerasActive
        ).length;

        return {
            isValid: true,
            totalFrames: this.buffer.length,
            averageQuality: avgQuality,
            maxQuality: maxQuality,
            minQuality: minQuality,
            bothCamerasActiveRate: bothCamerasActiveCount / this.buffer.length,
            timespan: this.buffer.length > 0 ? 
                this.buffer[this.buffer.length - 1].addedAt - this.buffer[0].addedAt : 0
        };
    }
}

// 保留原有的函數以維持向後相容性
export function syncLandmarksByTimestamp(cam1Data, cam2Data) {
  // 可考慮時間戳比對或手動校準 (如 clap 手動同步)
  const syncData = [];

  for (let i = 0; i < Math.min(cam1Data.length, cam2Data.length); i++) {
    const merged = {
      cam1: cam1Data[i],
      cam2: cam2Data[i],
      time: cam1Data[i].timestamp, // 假設已加入 timestamp
    };
    syncData.push(merged);
  }

  return syncData;
}

/**
 * 驗證視頻元素是否準備就緒進行姿態檢測
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @returns {boolean} 是否準備就緒
 */
export const isVideoReady = (videoElement) => {
    if (!videoElement) return false;
    
    return (
        videoElement.readyState >= 3 && // HAVE_FUTURE_DATA 或更高
        videoElement.videoWidth > 0 && 
        videoElement.videoHeight > 0 &&
        !videoElement.paused &&
        !videoElement.ended
    );
};

/**
 * 等待視頻元素準備就緒
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @param {number} timeout - 超時時間（毫秒），默認10秒
 * @returns {Promise<boolean>} 是否成功準備就緒
 */
export const waitForVideoReady = (videoElement, timeout = 10000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkReady = () => {
            if (isVideoReady(videoElement)) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                console.warn('視頻準備超時');
                resolve(false);
            } else {
                setTimeout(checkReady, 100);
            }
        };
        
        checkReady();
    });
};

/**
 * 驗證視頻流的有效性
 * @param {MediaStream} stream - 媒體流
 * @returns {boolean} 流是否有效
 */
export const validateVideoStream = (stream) => {
    if (!stream) return false;
    
    const videoTracks = stream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].readyState === 'live';
};

/**
 * 獲取視頻元素的詳細信息
 * @param {HTMLVideoElement} videoElement - 視頻元素
 * @returns {Object} 視頻信息
 */
export const getVideoInfo = (videoElement) => {
    if (!videoElement) {
        return { isValid: false };
    }
    
    return {
        isValid: true,
        readyState: videoElement.readyState,
        readyStateText: getReadyStateText(videoElement.readyState),
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
        duration: videoElement.duration,
        currentTime: videoElement.currentTime,
        paused: videoElement.paused,
        ended: videoElement.ended,
        hasVideoTrack: videoElement.srcObject ? 
            videoElement.srcObject.getVideoTracks().length > 0 : false
    };
};

/**
 * 轉換 readyState 數值為文字描述
 * @param {number} readyState - 視頻準備狀態
 * @returns {string} 狀態描述
 */
const getReadyStateText = (readyState) => {
    switch (readyState) {
        case 0: return 'HAVE_NOTHING - 無數據';
        case 1: return 'HAVE_METADATA - 已載入元數據';
        case 2: return 'HAVE_CURRENT_DATA - 已載入當前幀';
        case 3: return 'HAVE_FUTURE_DATA - 已載入足夠數據';
        case 4: return 'HAVE_ENOUGH_DATA - 已載入全部數據';
        default: return `未知狀態 (${readyState})`;
    }
};
