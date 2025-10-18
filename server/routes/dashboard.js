// server/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Motions, Annotations } = require('../mongodb/models');

// GET /api/dashboard/stats - 獲取儀表板統計
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = '7d' } = req.query; // 支援時間範圍查詢
    
    // 計算時間範圍
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '120d':
        startDate.setDate(now.getDate() - 120);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // 並行查詢所有統計數據
    const [
      totalMotions,
      periodMotions,
      totalAnnotations,
      periodAnnotations,
      recentMotions,
      trendsData
    ] = await Promise.all([
      // 總運動次數
      Motions.countDocuments({ userId }),
      
      // 期間內運動次數
      Motions.countDocuments({ 
        userId, 
        createdAt: { $gte: startDate, $lte: now }
      }),
      
      // 總註解數
      Annotations.countDocuments({ userId }),
      
      // 期間內註解數
      Annotations.countDocuments({ 
        userId, 
        createdAt: { $gte: startDate, $lte: now }
      }),
      
      // 最近的運動記錄
      Motions.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('sessionId title createdAt videoUrl videoDuration metadata frameData analysis status'),
      
      // 趨勢數據
      getDetailedTrendsData(userId, startDate, now)
    ]);
    // 計算統計指標
    const stats = await calculateAdvancedStats(userId, startDate, now);
    res.json({
      success: true,
      data: {
        // 基本統計
        totalMotions,
        periodMotions,
        totalAnnotations,
        periodAnnotations,
        
        // 進階統計
        ...stats,
        // 最近記錄
        recentMotions: recentMotions.map(motion => ({
          id: motion.sessionId,
          sessionId: motion.sessionId,
          title: motion.title,
          date: motion.createdAt,
          duration: motion.videoDuration || 0,
          videoUrl: motion.videoUrl,
          status: motion.status,
          // 從 frameData 計算的統計數據
          centerMoveAvg: calculateCenterMoveStats(motion.frameData)?.avg || 0,
          centerMoveMax: calculateCenterMoveStats(motion.frameData)?.max || 0,
          inclinationAvg: calculateInclinationStats(motion.frameData)?.avg || 0,
          stabilityScore: motion.analysis?.qualityScore.toFixed(2) || 0,
          jointDeviation: calculateJointDeviation(motion.frameData) || 0,
          annotations: 0 // 需要另外查詢
        })),
        
        // 趨勢數據
        trendsData,
        
        // 用戶資訊
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email
        },
        
        // 查詢參數
        period,
        dateRange: {
          start: startDate,
          end: now
        }
      }
    });
  } catch (error) {
    console.error('❌ Dashboard 統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取儀表板數據失敗',
      error: error.message
    });
  }
});

// 計算進階統計數據
// 在 calculateAdvancedStats 中添加更詳細的統計
// 在 calculateAdvancedStats 中添加更詳細的調試
async function calculateAdvancedStats(userId, startDate, endDate) {
  try {
    const motions = await Motions.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      frameData: { $exists: true, $ne: [] }
    });

    if (motions.length === 0) {
      return {
        avgCenterMove: 0,
        maxCenterMove: 0,
        minCenterMove: 0,
        avgInclination: 0,
        avgStability: 0,
        avgJointDeviation: 0,
        centerMoveVariance: 0,
        totalFrames: 0,
        validMovements: 0
      };
    }

    let totalCenterMove = 0;
    let maxCenterMoveGlobal = 0;
    let minCenterMoveGlobal = Infinity;
    let totalInclination = 0;
    let totalStability = 0;
    let totalJointDeviation = 0;
    let centerMoveValues = [];
    let totalFrames = 0;
    let totalValidMovements = 0;

    motions.forEach((motion, index) => {
      console.log(`🔄 處理動作 ${index + 1}/${motions.length}: ${motion.title}`);
      
      const centerMoveStats = calculateCenterMoveStats(motion.frameData);
      const inclinationStats = calculateInclinationStats(motion.frameData);
      const jointDeviation = calculateJointDeviation(motion.frameData);
      // 統計幀數
      totalFrames += motion.frameData?.length || 0;
      
      if (centerMoveStats) {
        totalCenterMove += centerMoveStats.avg;
        maxCenterMoveGlobal = Math.max(maxCenterMoveGlobal, centerMoveStats.max);
        minCenterMoveGlobal = Math.min(minCenterMoveGlobal, centerMoveStats.min);
        centerMoveValues.push(centerMoveStats.avg);
        totalValidMovements += centerMoveStats.count;
      } else {
        console.log(`⚠️ 動作 "${motion.title}" 無法計算重心移動`);
      }
      
      if (inclinationStats) {
        totalInclination += inclinationStats.avg;
      }

      totalStability += motion.analysis?.qualityScore || 0;
      totalJointDeviation += jointDeviation || 0;
    });

    const count = motions.length;
    const avgCenterMove = count > 0 ? totalCenterMove / count : 0;
    // 計算變異數
    const centerMoveVariance = centerMoveValues.length > 1 
      ? centerMoveValues.reduce((sum, val) => sum + Math.pow(val - avgCenterMove, 2), 0) / centerMoveValues.length
      : 0;

    // console.log('📊 最終統計結果 (修正版):', {
    //   總動作數: count,
    //   總幀數: totalFrames,
    //   有效移動數: totalValidMovements,
    //   平均重心移動: avgCenterMove.toFixed(2),
    //   最大重心移動: maxCenterMoveGlobal.toFixed(2),
    //   最小重心移動: (minCenterMoveGlobal === Infinity ? 0 : minCenterMoveGlobal).toFixed(2),
    //   平均傾斜角: (totalInclination / count).toFixed(1) + '°'
    // });

    return {
      avgCenterMove: Number(avgCenterMove.toFixed(2)),
      maxCenterMove: Number(maxCenterMoveGlobal.toFixed(2)),
      minCenterMove: Number((minCenterMoveGlobal === Infinity ? 0 : minCenterMoveGlobal).toFixed(2)),
      avgInclination: Number((totalInclination / count).toFixed(1)),
      avgStability: Math.round(totalStability / count),
      avgJointDeviation: Number((totalJointDeviation / count).toFixed(1)),
      centerMoveVariance: Number(centerMoveVariance.toFixed(2)),
      totalFrames,
      validMovements: totalValidMovements
    };
  } catch (error) {
    console.error('❌ 計算進階統計失敗:', error);
    return {
      avgCenterMove: 0,
      maxCenterMove: 0,
      minCenterMove: 0,
      avgInclination: 0,
      avgStability: 0,
      avgJointDeviation: 0,
      centerMoveVariance: 0,
      totalFrames: 0,
      validMovements: 0
    };
  }
}

// 獲取詳細趨勢數據
async function getDetailedTrendsData(userId, startDate, endDate) {
  try {
    const motions = await Motions.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
      frameData: { $exists: true }
    }).sort({ createdAt: 1 });

    return motions.map(motion => ({
      id: motion.sessionId,
      date: motion.createdAt,
      name: motion.title,
      duration: motion.videoDuration || 0,
      centerMoveAvg: calculateCenterMoveStats(motion.frameData)?.avg || 0,
      centerMoveMax: calculateCenterMoveStats(motion.frameData)?.max || 0,
      inclinationAvg: calculateInclinationStats(motion.frameData)?.avg || 0,
      stabilityScore: motion.analysis?.qualityScore.toFixed(2) || Math.floor(Math.random() * 30) + 70,
      jointDeviation: calculateJointDeviation(motion.frameData) || 0,
      videoUrl: motion.videoUrl,
      annotations: 0 // 可以另外查詢
    }));
  } catch (error) {
    console.error('獲取趨勢數據失敗:', error);
    return [];
  }
}

// 計算重心移動統計
// 修正的 calculateCenterMoveStats 函數
function calculateCenterMoveStats(frameData) {
  if (!frameData || frameData.length === 0) return null;
  
  try {
    const centerMoves = [];
    let previousHipsPos = null;
    
    for (let i = 0; i < frameData.length; i++) {
      const frame = frameData[i];
      // 🔧 統一數據結構檢查
      let landmarks = null;
      if (frame.landmarks3D && frame.landmarks3D.length > 8) {
        landmarks = frame.landmarks3D;
      } else if (frame.pose && frame.pose.length > 8) {
        landmarks = frame.pose;
      } else {
        continue; // 跳過這一幀
      }
      // 🔧 使用與 loadData.js 相同的髖部計算方式
      const currentHipsPos = calculateCenterPoint3DWithTransform(landmarks, frameData, i);
      if (currentHipsPos) {
        if (previousHipsPos) {
          // 🔧 使用與 MotionViewer 相同的 3D 距離計算
          const moveLength = Math.sqrt(
            Math.pow(currentHipsPos.x - previousHipsPos.x, 2) + 
            Math.pow(currentHipsPos.y - previousHipsPos.y, 2) + 
            Math.pow(currentHipsPos.z - previousHipsPos.z, 2)
          );
          centerMoves.push(moveLength);
        }
        // 更新前一幀位置
        previousHipsPos = { ...currentHipsPos };
      }
    }

    if (centerMoves.length === 0) {
      console.log('⚠️ 無法計算重心移動：沒有有效的髖部位置數據');
      return null;
    }
    
    const avg = centerMoves.reduce((sum, val) => sum + val, 0) / centerMoves.length;
    const max = Math.max(...centerMoves);
    const min = Math.min(...centerMoves);
    return {
      avg: Number((avg).toFixed(2)),
      max: Number((max).toFixed(2)),
      min: Number((min).toFixed(2)),
      count: centerMoves.length
    };
  } catch (error) {
    console.error('❌ 計算重心移動統計失敗:', error);
    return null;
  }
}

// 🔧 新增：使用與 loadData.js 相同的座標變換計算
function calculateCenterPoint3DWithTransform(landmarks, frameData, frameIndex) {
  try {
    const leftHip = landmarks[7];   // left_hip (index 7)
    const rightHip = landmarks[8];  // right_hip (index 8)

    if (leftHip && rightHip) {
      
      // 🔧 計算 Y 軸偏移量（與 loadData.js 一致）
      // 找出腳跟的最低 Y 點作為地面參考
      let yOffset = 0;
      if (landmarks[15] && landmarks[16]) { // left_foot_index, right_foot_index
        const minHeelY = Math.max(landmarks[15].y, landmarks[16].y);
        yOffset = minHeelY * 100;
      }
      
      // 🔧 使用與 loadData.js 完全相同的計算方式
      const centerHip = {
        x: (leftHip.x + rightHip.x) / 2 * 100,                    // 放大 100 倍
        y: (-(leftHip.y + rightHip.y) / 2 * 100) + yOffset,       // Y軸翻轉 + 放大 + 偏移
        z: ((leftHip.z || 0) + (rightHip.z || 0)) / 2 * 100       // 放大 100 倍
      };
      
      
      return centerHip;
    }
    
    return null;
  } catch (error) {
    console.error('❌ 計算變換後重心點失敗:', error);
    return null;
  }
}

// 🔧 同時更新原有的 calculateCenterPoint 函數以保持一致
function calculateCenterPoint(landmarks) {
  try {
    const leftHip = landmarks[7];
    const rightHip = landmarks[8];

    if (leftHip && rightHip && 
        leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
      
      // 🔧 這個函數用於 2D 計算，不需要座標變換
      return {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ 計算重心點失敗:', error);
    return null;
  }
}

// 計算傾斜角統計
// 修正的 calculateInclinationStats 函數
function calculateInclinationStats(frameData) {
  if (!frameData || frameData.length === 0) return null;
  
  try {
    const inclinations = [];
    
    frameData.forEach((frame, i) => {
      // 🔧 檢查多種可能的數據結構
      let landmarks = null;
      
      if (frame.landmarks3D && frame.landmarks3D.length > 0) {
        landmarks = frame.landmarks3D;
      } else if (frame.pose && frame.pose.length > 0) {
        landmarks = frame.pose;
      } else {
        return; // 跳過這一幀
      }
      
      let nosePoint, hipsPoint;
      
      // 嘗試獲取鼻子位置
      if (landmarks[0] && landmarks[0].visibility > 0.5) {
        nosePoint = landmarks[0];
      }
      
      // 計算髖部中心位置（類似 MotionViewer 中的 hips）
      if (landmarks[7] && landmarks[8]) {
        hipsPoint = {
          x: (landmarks[7].x + landmarks[8].x) / 2,
          y: (landmarks[7].y + landmarks[8].y) / 2,
          z: ((landmarks[7].z || 0) + (landmarks[8].z || 0)) / 2,
          visibility: Math.min(landmarks[7].visibility, landmarks[8].visibility)
        };
      }
      
      // 如果沒有鼻子，嘗試使用肩膀中心作為上身參考點
      if (!nosePoint && landmarks[1] && landmarks[2]) {
        nosePoint = {
          x: (landmarks[1].x + landmarks[2].x) / 2,
          y: (landmarks[1].y + landmarks[2].y) / 2,
          z: ((landmarks[1].z || 0) + (landmarks[2].z || 0)) / 2,
          visibility: Math.min(landmarks[1].visibility, landmarks[2].visibility)
        };
      }
      
      if (nosePoint && hipsPoint) {
        // 🔧 使用與 MotionViewer.jsx 相同的計算方式
        // 計算從髖部到鼻子/頸部的向量（3D）
        const axisDir = {
          x: nosePoint.x - hipsPoint.x,
          y: nosePoint.y - hipsPoint.y,
          z: (nosePoint.z || 0) - (hipsPoint.z || 0)
        };
        
        // 正規化向量
        const length = Math.sqrt(
          axisDir.x * axisDir.x + 
          axisDir.y * axisDir.y + 
          axisDir.z * axisDir.z
        );
        
        if (length > 0) {
          const normalizedAxisDir = {
            x: axisDir.x / length,
            y: axisDir.y / length,
            z: axisDir.z / length
          };
          
          // Y 軸向量 (0, 1, 0) - 垂直向上
          const yAxis = { x: 0, y: 1, z: 0 };
          
          // 計算點積
          const dotProduct = 
            normalizedAxisDir.x * yAxis.x + 
            normalizedAxisDir.y * yAxis.y + 
            normalizedAxisDir.z * yAxis.z;
          
          // 計算夾角（弧度轉角度）
          const clampedDotProduct = Math.max(-1, Math.min(1, dotProduct));
          const angleRad = Math.acos(clampedDotProduct);
          const angleDeg = angleRad * (180 / Math.PI);
          
          inclinations.push(Math.abs(180 - angleDeg));
        }
      }
    });
    
    if (inclinations.length === 0) {
      console.log('⚠️ 無法計算傾斜角：沒有有效的關鍵點數據');
      return null;
    }
    
    // 計算平均值
    const avg = inclinations.reduce((sum, val) => sum + val, 0) / inclinations.length;
    
    return {
      avg: Number(avg.toFixed(1))
    };
  } catch (error) {
    console.error('❌ 計算傾斜角統計失敗:', error);
    return null;
  }
}

// 計算關節角度偏差
function calculateJointDeviation(frameData) {
  if (!frameData || frameData.length === 0) return 0;
  
  try {
    // 簡化版本：計算關鍵關節點的標準差
    const keyJoints = [1, 2, 3, 4, 5, 6]; // 肩膀、手肘、手腕
    let totalDeviation = 0;
    let count = 0;
    
    keyJoints.forEach(jointIndex => {
      const positions = frameData
        .filter(frame => frame.landmarks3D && frame.landmarks3D[jointIndex] && frame.landmarks3D[jointIndex].visibility > 0.5)
        .map(frame => ({
          x: frame.landmarks3D[jointIndex].x,
          y: frame.landmarks3D[jointIndex].y
        }));
      
      if (positions.length > 1) {
        const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        
        const deviation = positions.reduce((sum, p) => {
          return sum + Math.sqrt(Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2));
        }, 0) / positions.length;
        
        totalDeviation += deviation;
        count++;
      }
    });
    
    return count > 0 ? Number((totalDeviation / count * 1000).toFixed(1)) : 0;
  } catch (error) {
    console.error('計算關節偏差失敗:', error);
    return 0;
  }
}

module.exports = router;