/**
 * 單攝像頭增強工具
 * 使用AI和算法來改善單攝像頭的深度估計和遮蔽處理
 */

export class SingleCameraEnhancer {
    constructor() {
        this.previousFrames = [];
        this.maxFrameHistory = 5;
        this.bodyModelCache = new Map();
        this.depthEstimationModel = null;
        
        // 人體模型參數
        this.humanBodyModel = {
            // 典型人體比例（頭部為1單位）
            headHeight: 1.0,
            shoulderWidth: 1.5,
            armLength: 2.5,
            torsoLength: 2.0,
            legLength: 3.5,
            
            // 關鍵點連接關係
            connections: [
                // 頭部和軀幹
                [0, 1], [1, 2], [2, 3], [3, 7],
                // 左臂
                [7, 8], [8, 9], [9, 10],
                // 右臂  
                [7, 11], [11, 12], [12, 13],
                // 軀幹
                [7, 14], [14, 15],
                // 左腿
                [14, 16], [16, 17], [17, 18],
                // 右腿
                [15, 19], [19, 20], [20, 21]
            ]
        };
    }

    /**
     * 增強單攝像頭的姿態檢測
     */
    enhanceLandmarks(landmarks, videoWidth, videoHeight) {
        if (!landmarks || landmarks.length === 0) return landmarks;

        // 1. 運動連續性分析
        const motionSmoothed = this.applyMotionSmoothing(landmarks);
        
        // 2. 深度估計
        const withDepth = this.estimateDepth(motionSmoothed, videoWidth, videoHeight);
        
        // 3. 遮蔽修復
        const occlusionFixed = this.fixOcclusion(withDepth);
        
        // 4. 人體模型約束
        const modelConstrained = this.applyBodyModelConstraints(occlusionFixed);
        
        // 5. 更新歷史記錄
        this.updateFrameHistory(modelConstrained);
        
        return modelConstrained;
    }

    /**
     * 運動平滑處理
     */
    applyMotionSmoothing(landmarks) {
        if (this.previousFrames.length === 0) {
            return landmarks;
        }

        const smoothed = landmarks.map((landmark, index) => {
            // 計算過去幾幀的平均位置
            const history = this.previousFrames.map(frame => frame[index]).filter(Boolean);
            
            if (history.length === 0) return landmark;

            // 使用加權平均，最近的幀權重更高
            const weights = history.map((_, i) => Math.pow(0.8, history.length - i - 1));
            const totalWeight = weights.reduce((sum, w) => sum + w, 0) + 1; // +1 for current frame

            const smoothedX = (landmark.x + history.reduce((sum, h, i) => sum + h.x * weights[i], 0)) / totalWeight;
            const smoothedY = (landmark.y + history.reduce((sum, h, i) => sum + h.y * weights[i], 0)) / totalWeight;

            return {
                ...landmark,
                x: smoothedX,
                y: smoothedY,
                smoothed: true
            };
        });

        return smoothed;
    }

    /**
     * 深度估計
     */
    estimateDepth(landmarks, videoWidth, videoHeight) {
        return landmarks.map((landmark, index) => {
            // 基於人體模型的深度估計
            const relativeDepth = this.estimateRelativeDepth(landmark, index, landmarks, videoWidth, videoHeight);
            
            return {
                ...landmark,
                z: relativeDepth,
                confidence: landmark.confidence || 0.8
            };
        });
    }

    /**
     * 估計相對深度
     */
    estimateRelativeDepth(landmark, index, allLandmarks, videoWidth, videoHeight) {
        // 基於關鍵點的相對位置來估計深度
        
        // 1. 基於人體中心的距離
        const centerX = videoWidth / 2;
        const centerY = videoHeight / 2;
        const distanceFromCenter = Math.sqrt(
            Math.pow(landmark.x * videoWidth - centerX, 2) + 
            Math.pow(landmark.y * videoHeight - centerY, 2)
        );
        
        // 2. 基於關鍵點類型的典型深度
        const typicalDepth = this.getTypicalDepth(index);
        
        // 3. 基於相鄰關鍵點的深度一致性
        const neighborDepth = this.estimateNeighborDepth(index, allLandmarks);
        
        // 4. 基於人體姿態的深度調整
        const postureAdjustment = this.getPostureDepthAdjustment(landmark, index, allLandmarks);
        
        // 綜合計算
        const baseDepth = 1000; // 基準深度 (mm)
        const depthVariation = (distanceFromCenter / Math.max(videoWidth, videoHeight)) * 200;
        
        return baseDepth + typicalDepth + neighborDepth + postureAdjustment + depthVariation;
    }

    /**
     * 獲取關鍵點的典型深度
     */
    getTypicalDepth(keypointIndex) {
        // MediaPipe 關鍵點的典型深度偏移
        const depthMap = {
            0: 0,    // 鼻子
            1: -20,  // 左眼內角
            2: -20,  // 左眼
            3: -20,  // 左眼外角
            4: -20,  // 右眼內角
            5: -20,  // 右眼
            6: -20,  // 右眼外角
            7: -10,  // 左耳
            8: -10,  // 右耳
            9: 10,   // 嘴左
            10: 10,  // 嘴右
            11: 50,  // 左肩
            12: 50,  // 右肩
            13: 30,  // 左肘
            14: 30,  // 右肘
            15: 40,  // 左手腕
            16: 40,  // 右手腕
            17: 60,  // 左手
            18: 60,  // 右手
            19: 80,  // 左髖
            20: 80,  // 右髖
            21: 70,  // 左膝
            22: 70,  // 右膝
            23: 90,  // 左腳踝
            24: 90,  // 右腳踝
            25: 100, // 左腳
            26: 100, // 右腳
            27: 20,  // 左手指
            28: 20,  // 右手指
            29: 30,  // 左拇指
            30: 30,  // 右拇指
            31: 110, // 左腳趾
            32: 110  // 右腳趾
        };
        
        return depthMap[keypointIndex] || 0;
    }

    /**
     * 估計鄰近關鍵點的深度
     */
    estimateNeighborDepth(index, landmarks) {
        const connections = this.humanBodyModel.connections;
        const connectedIndices = connections
            .filter(conn => conn[0] === index || conn[1] === index)
            .map(conn => conn[0] === index ? conn[1] : conn[0]);
        
        if (connectedIndices.length === 0) return 0;
        
        // 計算連接關鍵點的平均深度影響
        const neighborDepths = connectedIndices
            .map(idx => landmarks[idx])
            .filter(landmark => landmark && landmark.z !== undefined)
            .map(landmark => landmark.z);
        
        if (neighborDepths.length === 0) return 0;
        
        const avgNeighborDepth = neighborDepths.reduce((sum, depth) => sum + depth, 0) / neighborDepths.length;
        return avgNeighborDepth * 0.1; // 10% 的鄰近影響
    }

    /**
     * 基於姿態的深度調整
     */
    getPostureDepthAdjustment(landmark, index, allLandmarks) {
        // 基於整體姿態來調整深度
        // 例如：如果人體向前傾，前方的關鍵點深度應該更小
        
        // 簡化實現：基於頭部和軀幹的關係
        const nose = allLandmarks[0];
        const leftShoulder = allLandmarks[11];
        const rightShoulder = allLandmarks[12];
        
        if (!nose || !leftShoulder || !rightShoulder) return 0;
        
        // 計算軀幹傾斜角度
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        
        const bodyLean = nose.y - shoulderCenter.y;
        const leanFactor = bodyLean * 100; // 轉換為深度調整
        
        // 根據關鍵點位置調整
        if (index <= 10) { // 頭部和面部
            return -leanFactor;
        } else if (index >= 19) { // 下半身
            return leanFactor;
        }
        
        return 0;
    }

    /**
     * 遮蔽修復
     */
    fixOcclusion(landmarks) {
        return landmarks.map((landmark, index) => {
            if (!landmark || landmark.confidence < 0.5) {
                // 嘗試從歷史數據和人體模型推斷
                const predicted = this.predictOccludedLandmark(index, landmarks);
                
                if (predicted) {
                    return {
                        ...predicted,
                        confidence: 0.6,
                        predicted: true
                    };
                }
            }
            
            return landmark;
        });
    }

    /**
     * 預測被遮蔽的關鍵點
     */
    predictOccludedLandmark(index, landmarks) {
        // 1. 從歷史數據預測
        const fromHistory = this.predictFromHistory(index);
        
        // 2. 從人體模型預測
        const fromModel = this.predictFromBodyModel(index, landmarks);
        
        // 3. 結合預測結果
        if (fromHistory && fromModel) {
            return {
                x: (fromHistory.x + fromModel.x) / 2,
                y: (fromHistory.y + fromModel.y) / 2,
                z: (fromHistory.z + fromModel.z) / 2,
                confidence: 0.6
            };
        }
        
        return fromHistory || fromModel;
    }

    /**
     * 從歷史數據預測
     */
    predictFromHistory(index) {
        if (this.previousFrames.length < 2) return null;
        
        const recentFrames = this.previousFrames.slice(-3);
        const validLandmarks = recentFrames
            .map(frame => frame[index])
            .filter(landmark => landmark && landmark.confidence > 0.5);
        
        if (validLandmarks.length === 0) return null;
        
        // 使用線性外推法
        if (validLandmarks.length >= 2) {
            const last = validLandmarks[validLandmarks.length - 1];
            const secondLast = validLandmarks[validLandmarks.length - 2];
            
            return {
                x: last.x + (last.x - secondLast.x),
                y: last.y + (last.y - secondLast.y),
                z: last.z + (last.z - secondLast.z),
                confidence: 0.5
            };
        }
        
        return validLandmarks[0];
    }

    /**
     * 從人體模型預測
     */
    predictFromBodyModel(index, landmarks) {
        // 基於人體模型的幾何約束來預測位置
        const connections = this.humanBodyModel.connections;
        const connectedIndices = connections
            .filter(conn => conn[0] === index || conn[1] === index)
            .map(conn => conn[0] === index ? conn[1] : conn[0]);
        
        const validConnections = connectedIndices
            .map(idx => landmarks[idx])
            .filter(landmark => landmark && landmark.confidence > 0.7);
        
        if (validConnections.length === 0) return null;
        
        // 基於連接點的平均位置和典型骨骼長度
        const avgPosition = validConnections.reduce((sum, landmark) => ({
            x: sum.x + landmark.x,
            y: sum.y + landmark.y,
            z: sum.z + landmark.z
        }), { x: 0, y: 0, z: 0 });
        
        avgPosition.x /= validConnections.length;
        avgPosition.y /= validConnections.length;
        avgPosition.z /= validConnections.length;
        
        return {
            ...avgPosition,
            confidence: 0.5
        };
    }

    /**
     * 應用人體模型約束
     */
    applyBodyModelConstraints(landmarks) {
        // 確保關鍵點位置符合人體解剖學約束
        return landmarks.map((landmark, index) => {
            if (!landmark) return landmark;
            
            const constrained = this.constrainLandmark(landmark, index, landmarks);
            return constrained;
        });
    }

    /**
     * 約束單個關鍵點
     */
    constrainLandmark(landmark, index, allLandmarks) {
        // 基於人體模型的約束
        const connections = this.humanBodyModel.connections;
        const connectedIndices = connections
            .filter(conn => conn[0] === index || conn[1] === index)
            .map(conn => conn[0] === index ? conn[1] : conn[0]);
        
        // 檢查骨骼長度約束
        let constrainedLandmark = { ...landmark };
        
        connectedIndices.forEach(connectedIndex => {
            const connectedLandmark = allLandmarks[connectedIndex];
            if (!connectedLandmark || connectedLandmark.confidence < 0.5) return;
            
            // 計算距離
            const distance = Math.sqrt(
                Math.pow(landmark.x - connectedLandmark.x, 2) +
                Math.pow(landmark.y - connectedLandmark.y, 2) +
                Math.pow(landmark.z - connectedLandmark.z, 2)
            );
            
            // 獲取期望的骨骼長度
            const expectedLength = this.getExpectedBoneLength(index, connectedIndex);
            
            // 如果距離過大，進行調整
            if (distance > expectedLength * 1.5) {
                const scale = expectedLength / distance;
                constrainedLandmark.x = connectedLandmark.x + (landmark.x - connectedLandmark.x) * scale;
                constrainedLandmark.y = connectedLandmark.y + (landmark.y - connectedLandmark.y) * scale;
                constrainedLandmark.z = connectedLandmark.z + (landmark.z - connectedLandmark.z) * scale;
            }
        });
        
        return constrainedLandmark;
    }

    /**
     * 獲取期望的骨骼長度
     */
    getExpectedBoneLength(index1, index2) {
        // 基於人體比例的典型骨骼長度
        const boneLengths = {
            '0-1': 0.1,   // 鼻子到眼睛
            '11-12': 0.3, // 肩膀間距
            '11-13': 0.25, // 肩膀到肘部
            '13-15': 0.25, // 肘部到手腕
            '19-21': 0.4,  // 髖部到膝蓋
            '21-23': 0.4,  // 膝蓋到腳踝
        };
        
        const key = `${Math.min(index1, index2)}-${Math.max(index1, index2)}`;
        return boneLengths[key] || 0.2; // 默認長度
    }

    /**
     * 更新幀歷史
     */
    updateFrameHistory(landmarks) {
        this.previousFrames.push(landmarks);
        
        if (this.previousFrames.length > this.maxFrameHistory) {
            this.previousFrames.shift();
        }
    }

    /**
     * 清理歷史數據
     */
    clearHistory() {
        this.previousFrames = [];
    }
}

// 單例實現
let enhancerInstance = null;

export const getSingleCameraEnhancer = () => {
    if (!enhancerInstance) {
        enhancerInstance = new SingleCameraEnhancer();
    }
    return enhancerInstance;
};
