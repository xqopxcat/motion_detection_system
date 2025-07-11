/**
 * 立體視覺標定和三維重建工具
 * 提供攝像頭標定、立體匹配和三維座標計算功能
 */

export class StereoCalibration {
    constructor() {
        this.leftCameraMatrix = null;
        this.rightCameraMatrix = null;
        this.leftDistCoeffs = null;
        this.rightDistCoeffs = null;
        this.rotationMatrix = null;
        this.translationVector = null;
        this.fundamentalMatrix = null;
        this.essentialMatrix = null;
        
        // 預設標定參數（需要根據實際攝像頭調整）
        this.defaultCalibration = {
            // 左攝像頭內參矩陣 (3x3)
            leftCameraMatrix: [
                [640, 0, 320],    // fx, 0, cx
                [0, 640, 240],    // 0, fy, cy  
                [0, 0, 1]         // 0, 0, 1
            ],
            // 右攝像頭內參矩陣 (3x3)
            rightCameraMatrix: [
                [640, 0, 320],
                [0, 640, 240],
                [0, 0, 1]
            ],
            // 左攝像頭畸變係數
            leftDistCoeffs: [0.1, -0.2, 0, 0, 0],
            // 右攝像頭畸變係數  
            rightDistCoeffs: [0.1, -0.2, 0, 0, 0],
            // 旋轉矩陣 (右攝像頭相對於左攝像頭)
            rotationMatrix: [
                [0.999, -0.001, 0.001],
                [0.001, 0.999, -0.001], 
                [-0.001, 0.001, 0.999]
            ],
            // 平移向量 (右攝像頭相對於左攝像頭, 單位: mm)
            translationVector: [100, 0, 0], // 假設兩攝像頭相距10cm
            // 攝像頭基線距離 (mm)
            baseline: 100
        };
        
        this.loadDefaultCalibration();
    }

    /**
     * 載入預設標定參數
     */
    loadDefaultCalibration() {
        const cal = this.defaultCalibration;
        this.leftCameraMatrix = cal.leftCameraMatrix;
        this.rightCameraMatrix = cal.rightCameraMatrix;
        this.leftDistCoeffs = cal.leftDistCoeffs;
        this.rightDistCoeffs = cal.rightDistCoeffs;
        this.rotationMatrix = cal.rotationMatrix;
        this.translationVector = cal.translationVector;
        this.baseline = cal.baseline;
    }

    /**
     * 簡化的立體匹配 - 通過關鍵點索引匹配
     * @param {Array} leftLandmarks - 左攝像頭關鍵點
     * @param {Array} rightLandmarks - 右攝像頭關鍵點
     * @returns {Array} 匹配的關鍵點對
     */
    matchKeypoints(leftLandmarks, rightLandmarks) {
        const matches = [];
        
        if (!leftLandmarks || !rightLandmarks) return matches;
        
        // MediaPipe 提供相同索引的關鍵點，直接配對
        const minLength = Math.min(leftLandmarks.length, rightLandmarks.length);
        
        for (let i = 0; i < minLength; i++) {
            const leftPoint = leftLandmarks[i];
            const rightPoint = rightLandmarks[i];
            
            // 檢查關鍵點可見性（visibility > 0.5）
            if (leftPoint.visibility > 0.5 && rightPoint.visibility > 0.5) {
                matches.push({
                    leftPoint: {
                        x: leftPoint.x,
                        y: leftPoint.y,
                        z: leftPoint.z || 0
                    },
                    rightPoint: {
                        x: rightPoint.x,
                        y: rightPoint.y,
                        z: rightPoint.z || 0
                    },
                    keypointIndex: i,
                    confidence: Math.min(leftPoint.visibility, rightPoint.visibility)
                });
            }
        }
        
        return matches;
    }

    /**
     * 計算三維座標
     * @param {Array} matches - 匹配的關鍵點對
     * @param {number} imageWidth - 圖像寬度
     * @param {number} imageHeight - 圖像高度
     * @returns {Array} 三維座標點
     */
    triangulate3D(matches, imageWidth = 640, imageHeight = 480) {
        const points3D = [];
        
        if (!matches || matches.length === 0) return points3D;
        
        matches.forEach((match, index) => {
            try {
                // 將歸一化座標轉換為像素座標
                const leftPixel = {
                    x: match.leftPoint.x * imageWidth,
                    y: match.leftPoint.y * imageHeight
                };
                
                const rightPixel = {
                    x: match.rightPoint.x * imageWidth,
                    y: match.rightPoint.y * imageHeight
                };
                
                // 計算視差 (disparity)
                const disparity = leftPixel.x - rightPixel.x;
                
                // 避免除零錯誤
                if (Math.abs(disparity) < 1) {
                    console.warn(`關鍵點 ${match.keypointIndex} 視差過小，跳過三維重建`);
                    return;
                }
                
                // 簡化的三維重建公式
                const fx = this.leftCameraMatrix[0][0]; // 焦距
                const fy = this.leftCameraMatrix[1][1];
                const cx = this.leftCameraMatrix[0][2]; // 主點
                const cy = this.leftCameraMatrix[1][2];
                
                // 三維座標計算
                const Z = (fx * this.baseline) / disparity; // 深度
                const X = (leftPixel.x - cx) * Z / fx;       // X座標
                const Y = (leftPixel.y - cy) * Z / fy;       // Y座標
                
                // 確保深度值合理 (1cm 到 5m)
                if (Z > 10 && Z < 5000) {
                    points3D.push({
                        x: X,
                        y: Y,
                        z: Z,
                        keypointIndex: match.keypointIndex,
                        confidence: match.confidence,
                        disparity: disparity,
                        leftPixel: leftPixel,
                        rightPixel: rightPixel
                    });
                }
            } catch (error) {
                console.warn(`關鍵點 ${match.keypointIndex} 三維重建失敗:`, error);
            }
        });
        
        return points3D;
    }

    /**
     * 過濾和平滑三維點
     * @param {Array} points3D - 原始三維點
     * @returns {Array} 過濾後的三維點
     */
    filterAndSmooth3D(points3D) {
        if (!points3D || points3D.length === 0) return [];
        
        // 1. 按信心度過濾
        const highConfidencePoints = points3D.filter(point => point.confidence > 0.7);
        
        // 2. 深度值合理性檢查
        const validDepthPoints = highConfidencePoints.filter(point => {
            return point.z > 50 && point.z < 3000; // 5cm 到 3m
        });
        
        // 3. 去除異常值 (使用四分位數方法)
        if (validDepthPoints.length > 4) {
            const depths = validDepthPoints.map(p => p.z).sort((a, b) => a - b);
            const q1 = depths[Math.floor(depths.length * 0.25)];
            const q3 = depths[Math.floor(depths.length * 0.75)];
            const iqr = q3 - q1;
            const lowerBound = q1 - 1.5 * iqr;
            const upperBound = q3 + 1.5 * iqr;
            
            return validDepthPoints.filter(point => 
                point.z >= lowerBound && point.z <= upperBound
            );
        }
        
        return validDepthPoints;
    }

    /**
     * 完整的三維重建流程
     * @param {Array} leftLandmarks - 左攝像頭關鍵點
     * @param {Array} rightLandmarks - 右攝像頭關鍵點
     * @param {number} imageWidth - 圖像寬度
     * @param {number} imageHeight - 圖像高度
     * @returns {Object} 三維重建結果
     */
    reconstruct3D(leftLandmarks, rightLandmarks, imageWidth = 640, imageHeight = 480) {
        // 1. 關鍵點匹配
        const matches = this.matchKeypoints(leftLandmarks, rightLandmarks);
        
        // 2. 三維重建
        const rawPoints3D = this.triangulate3D(matches, imageWidth, imageHeight);
        
        // 3. 過濾和平滑
        const filteredPoints3D = this.filterAndSmooth3D(rawPoints3D);
        
        // 4. 計算統計信息
        const stats = this.calculateStats(filteredPoints3D);
        
        return {
            points3D: filteredPoints3D,
            matches: matches,
            rawPoints: rawPoints3D,
            statistics: stats,
            timestamp: Date.now()
        };
    }

    /**
     * 計算三維重建統計信息
     * @param {Array} points3D - 三維點
     * @returns {Object} 統計信息
     */
    calculateStats(points3D) {
        if (!points3D || points3D.length === 0) {
            return {
                totalPoints: 0,
                avgDepth: 0,
                minDepth: 0,
                maxDepth: 0,
                avgConfidence: 0,
                validPoints: 0
            };
        }

        const depths = points3D.map(p => p.z);
        const confidences = points3D.map(p => p.confidence);
        
        return {
            totalPoints: points3D.length,
            avgDepth: depths.reduce((sum, d) => sum + d, 0) / depths.length,
            minDepth: Math.min(...depths),
            maxDepth: Math.max(...depths),
            avgConfidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
            validPoints: points3D.filter(p => p.confidence > 0.8).length
        };
    }

    /**
     * 設置自定義標定參數
     * @param {Object} calibrationData - 標定數據
     */
    setCalibration(calibrationData) {
        if (calibrationData.leftCameraMatrix) {
            this.leftCameraMatrix = calibrationData.leftCameraMatrix;
        }
        if (calibrationData.rightCameraMatrix) {
            this.rightCameraMatrix = calibrationData.rightCameraMatrix;
        }
        if (calibrationData.baseline) {
            this.baseline = calibrationData.baseline;
        }
        // 可以擴展更多參數...
    }
}

// 單例模式
let stereoCalibrationInstance = null;

export const getStereoCalibration = () => {
    if (!stereoCalibrationInstance) {
        stereoCalibrationInstance = new StereoCalibration();
    }
    return stereoCalibrationInstance;
};
