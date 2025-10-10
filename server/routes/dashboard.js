const express = require('express');
const router = express.Router();
const { Motion } = require('../mongodb/models');
const { auth } = require('../middleware/auth');

// 運動分析工具函數（直接放在這裡，不需要 services 資料夾）
class MotionAnalysis {
  static analyzeMotionData(motionData) {
    if (!motionData.frameData || motionData.frameData.length === 0) {
      throw new Error('無有效的幀數據');
    }

    const frameData = motionData.frameData;
    return {
      id: motionData._id,
      name: motionData.name,
      date: motionData.createdAt,
      duration: this.calculateDuration(frameData),
      frameCount: frameData.length,
      
      // 重心移動分析
      centerMovement: this.analyzeCenterMovement(frameData),
      
      // 姿態傾斜分析
      inclinationAnalysis: this.analyzeInclination(frameData),
      
      // 姿態穩定性分析
      stabilityAnalysis: this.analyzeStability(frameData),
      
      // 關節角度偏差分析
      jointAnalysis: this.analyzeJointDeviation(frameData)
    };
  }

  static calculateDuration(frameData) {
    if (frameData.length < 2) return 0;
    const firstFrame = frameData[0];
    const lastFrame = frameData[frameData.length - 1];
    
    if (firstFrame.timestamp && lastFrame.timestamp) {
      return (lastFrame.timestamp - firstFrame.timestamp) / 1000;
    }
    return frameData.length / 30; // 假設 30 FPS
  }

  static analyzeCenterMovement(frameData) {
    const centers = frameData.map(frame => this.calculateCenterOfMass(frame.landmarks));
    const movements = [];
    
    for (let i = 1; i < centers.length; i++) {
      const distance = this.calculateDistance3D(centers[i-1], centers[i]);
      movements.push(distance);
    }

    return {
      avgMovement: this.average(movements),
      maxMovement: Math.max(...movements),
      totalMovement: movements.reduce((sum, val) => sum + val, 0),
      variance: this.calculateVariance(movements)
    };
  }

  static calculateCenterOfMass(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    const sum = landmarks.reduce((acc, landmark) => ({
      x: acc.x + landmark.x,
      y: acc.y + landmark.y,
      z: acc.z + (landmark.z || 0)
    }), { x: 0, y: 0, z: 0 });

    return {
      x: sum.x / landmarks.length,
      y: sum.y / landmarks.length,
      z: sum.z / landmarks.length
    };
  }

  static analyzeInclination(frameData) {
    const inclinations = frameData.map(frame => this.calculateBodyInclination(frame.landmarks));
    
    return {
      avgInclination: this.average(inclinations),
      maxInclination: Math.max(...inclinations),
      inclinationVariance: this.calculateVariance(inclinations)
    };
  }

  static calculateBodyInclination(landmarks) {
    if (!landmarks || landmarks.length < 4) return 0;

    // 使用前幾個關鍵點來計算身體傾斜
    const shoulder = landmarks[1] || landmarks[0];
    const hip = landmarks[2] || landmarks[1];

    if (!shoulder || !hip) return 0;

    const bodyVector = {
      x: shoulder.x - hip.x,
      y: shoulder.y - hip.y,
      z: (shoulder.z || 0) - (hip.z || 0)
    };

    const verticalVector = { x: 0, y: 1, z: 0 };
    return this.calculateAngleBetweenVectors(bodyVector, verticalVector);
  }

  static analyzeStability(frameData) {
    const stabilityScores = [];
    const windowSize = Math.min(10, frameData.length);

    for (let i = windowSize; i < frameData.length; i++) {
      const window = frameData.slice(i - windowSize, i);
      const stability = this.calculateStabilityInWindow(window);
      stabilityScores.push(stability);
    }

    const avgStability = this.average(stabilityScores);
    
    return {
      avgStability: avgStability,
      stabilityScore: Math.max(0, 100 - avgStability * 100),
      stabilityVariance: this.calculateVariance(stabilityScores)
    };
  }

  static calculateStabilityInWindow(window) {
    const centers = window.map(frame => this.calculateCenterOfMass(frame.landmarks));
    const movements = [];

    for (let i = 1; i < centers.length; i++) {
      movements.push(this.calculateDistance3D(centers[i-1], centers[i]));
    }

    return this.average(movements);
  }

  static analyzeJointDeviation(frameData) {
    // 簡化的關節角度分析
    const deviations = frameData.map(frame => {
      const landmarks = frame.landmarks;
      if (!landmarks || landmarks.length < 3) return 0;
      
      // 計算相鄰關鍵點間的角度變化
      let totalDeviation = 0;
      for (let i = 2; i < Math.min(landmarks.length, 10); i++) {
        const angle = this.calculateJointAngle(landmarks[i-2], landmarks[i-1], landmarks[i]);
        totalDeviation += Math.abs(angle - 90); // 與直角的偏差
      }
      
      return totalDeviation / Math.min(landmarks.length - 2, 8);
    });

    return {
      avgDeviation: this.average(deviations),
      maxDeviation: Math.max(...deviations),
      deviationVariance: this.calculateVariance(deviations)
    };
  }

  static calculateJointAngle(point1, point2, point3) {
    if (!point1 || !point2 || !point3) return 0;

    const vector1 = {
      x: point1.x - point2.x,
      y: point1.y - point2.y,
      z: (point1.z || 0) - (point2.z || 0)
    };

    const vector2 = {
      x: point3.x - point2.x,
      y: point3.y - point2.y,
      z: (point3.z || 0) - (point2.z || 0)
    };

    return this.calculateAngleBetweenVectors(vector1, vector2);
  }

  // 工具函數
  static calculateDistance3D(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static calculateAngleBetweenVectors(v1, v2) {
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  static average(array) {
    return array.length > 0 ? array.reduce((sum, val) => sum + val, 0) / array.length : 0;
  }

  static calculateVariance(array) {
    if (array.length === 0) return 0;
    const mean = this.average(array);
    const squaredDiffs = array.map(val => Math.pow(val - mean, 2));
    return this.average(squaredDiffs);
  }
}

// API 路由
// GET /api/dashboard/overview - 獲取訓練概覽數據
router.get('/overview', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const motions = await Motion.find({
      userId: req.user?._id,
      createdAt: { $gte: startDate },
      frameData: { $exists: true, $ne: [] }
    }).sort({ createdAt: -1 });

    if (motions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalTrainings: 0,
          avgStats: {
            avgCenterMove: '0.0',
            maxCenterMove: '0.0',
            avgInclination: '0.0',
            avgStability: 0,
            avgJointDeviation: '0.0',
            centerMoveVariance: '0.00'
          },
          trends: {},
          message: '暫無訓練數據'
        }
      });
    }

    // 分析每個運動數據
    const analysisResults = motions.map(motion => {
      try {
        return MotionAnalysis.analyzeMotionData(motion);
      } catch (error) {
        console.error(`分析運動數據 ${motion._id} 失敗:`, error.message);
        return null;
      }
    }).filter(result => result !== null);

    // 計算統計數據
    const centerMoves = analysisResults.map(r => r.centerMovement.avgMovement);
    const inclinations = analysisResults.map(r => r.inclinationAnalysis.avgInclination);
    const stabilities = analysisResults.map(r => r.stabilityAnalysis.stabilityScore);
    const jointDeviations = analysisResults.map(r => r.jointAnalysis.avgDeviation);

    const avgStats = {
      avgCenterMove: MotionAnalysis.average(centerMoves).toFixed(3),
      maxCenterMove: Math.max(...analysisResults.map(r => r.centerMovement.maxMovement)).toFixed(3),
      centerMoveVariance: MotionAnalysis.calculateVariance(centerMoves).toFixed(4),
      avgInclination: MotionAnalysis.average(inclinations).toFixed(1),
      avgStability: Math.round(MotionAnalysis.average(stabilities)),
      avgJointDeviation: MotionAnalysis.average(jointDeviations).toFixed(1)
    };

    // 計算趨勢
    const trends = {};
    if (analysisResults.length > 1) {
      const midPoint = Math.floor(analysisResults.length / 2);
      const firstHalf = analysisResults.slice(0, midPoint);
      const secondHalf = analysisResults.slice(midPoint);

      if (firstHalf.length > 0 && secondHalf.length > 0) {
        const firstStability = MotionAnalysis.average(firstHalf.map(r => r.stabilityAnalysis.stabilityScore));
        const secondStability = MotionAnalysis.average(secondHalf.map(r => r.stabilityAnalysis.stabilityScore));
        
        trends.stabilityTrend = firstStability > 0 ? ((secondStability - firstStability) / firstStability) * 100 : 0;
      }
    }

    res.json({
      success: true,
      data: {
        totalTrainings: analysisResults.length,
        period: period,
        avgStats,
        trends,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: '獲取概覽數據失敗',
      error: error.message
    });
  }
});

// GET /api/dashboard/training-records - 獲取訓練記錄列表
router.get('/training-records', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      period = '30d',
      sortBy = 'createdAt',
      order = 'desc' 
    } = req.query;

    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const motions = await Motion.find({
      userId: req.user?._id,
      createdAt: { $gte: startDate },
      frameData: { $exists: true, $ne: [] }
    })
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Motion.countDocuments({
      userId: req.user?._id,
      createdAt: { $gte: startDate },
      frameData: { $exists: true, $ne: [] }
    });

    // 分析每個記錄
    const records = motions.map(motion => {
      try {
        const analysis = MotionAnalysis.analyzeMotionData(motion);
        return {
          id: motion._id,
          name: motion.name,
          date: motion.createdAt,
          duration: analysis.duration,
          centerMoveAvg: analysis.centerMovement.avgMovement.toFixed(3),
          centerMoveMax: analysis.centerMovement.maxMovement.toFixed(3),
          inclinationAvg: analysis.inclinationAnalysis.avgInclination.toFixed(1),
          stabilityScore: Math.round(analysis.stabilityAnalysis.stabilityScore),
          jointDeviation: analysis.jointAnalysis.avgDeviation.toFixed(1),
          frameCount: analysis.frameCount,
          videoUrl: motion.videoUrl,
          annotations: motion.annotations ? motion.annotations.length : 0
        };
      } catch (error) {
        console.error(`分析記錄 ${motion._id} 失敗:`, error.message);
        return {
          id: motion._id,
          name: motion.name,
          date: motion.createdAt,
          error: '數據分析失敗'
        };
      }
    });

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get training records error:', error);
    res.status(500).json({
      success: false,
      message: '獲取訓練記錄失敗',
      error: error.message
    });
  }
});

// GET /api/dashboard/trends - 獲取趨勢數據
router.get('/trends', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const motions = await Motion.find({
      userId: req.user?._id,
      createdAt: { $gte: startDate },
      frameData: { $exists: true, $ne: [] }
    }).sort({ createdAt: 1 });

    const trendsData = motions.map(motion => {
      try {
        const analysis = MotionAnalysis.analyzeMotionData(motion);
        return {
          date: motion.createdAt,
          centerMoveAvg: analysis.centerMovement.avgMovement,
          inclinationAvg: analysis.inclinationAnalysis.avgInclination,
          stabilityScore: analysis.stabilityAnalysis.stabilityScore,
          jointDeviation: analysis.jointAnalysis.avgDeviation
        };
      } catch (error) {
        console.error(`趨勢分析失敗 ${motion._id}:`, error.message);
        return null;
      }
    }).filter(data => data !== null);

    res.json({
      success: true,
      data: {
        trends: trendsData,
        period: period,
        totalPoints: trendsData.length
      }
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: '獲取趨勢數據失敗',
      error: error.message
    });
  }
});

module.exports = router;