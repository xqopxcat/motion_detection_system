const express = require('express');
const router = express.Router();
const { MotionSession } = require('../mongodb/models');
const { auth, optionalAuth } = require('../middleware/auth');

// GET /api/analytics/overview - 獲取系統總覽統計
router.get('/overview', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // 構建查詢條件
    const userQuery = userId ? { userId } : {};
    const publicQuery = { isPublic: true };
    
    // 總會話數
    const totalSessions = await MotionSession.countDocuments(
      userId ? userQuery : publicQuery
    );
    
    // 總錄製時間（秒）
    const sessions = await MotionSession.find(
      userId ? userQuery : publicQuery,
      'frameData metadata.totalFrames metadata.fps'
    );
    
    let totalRecordingTime = 0;
    let totalFrames = 0;
    
    sessions.forEach(session => {
      if (session.frameData && session.frameData.length > 0) {
        const firstFrame = session.frameData[0];
        const lastFrame = session.frameData[session.frameData.length - 1];
        totalRecordingTime += (lastFrame.timestamp - firstFrame.timestamp) / 1000;
      }
      totalFrames += session.metadata?.totalFrames || 0;
    });

    // 動作類型統計
    const actionTypeStats = await MotionSession.aggregate([
      { $match: userId ? userQuery : publicQuery },
      { $unwind: '$analysis.detectedActions' },
      {
        $group: {
          _id: '$analysis.detectedActions.actionType',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$analysis.detectedActions.confidence' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 最近活動
    const recentSessions = await MotionSession.find(
      userId ? userQuery : publicQuery
    )
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt metadata.totalFrames analysis.averageConfidence');

    res.json({
      success: true,
      data: {
        totalSessions,
        totalRecordingTime: Math.round(totalRecordingTime),
        totalFrames,
        actionTypeStats,
        recentSessions
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({
      success: false,
      message: '獲取統計數據失敗',
      error: error.message
    });
  }
});

// GET /api/analytics/sessions/trends - 獲取會話趨勢數據
router.get('/sessions/trends', optionalAuth, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const userId = req.user?.id;
    
    // 計算日期範圍
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const query = {
      createdAt: { $gte: startDate },
      ...(userId ? { userId } : { isPublic: true })
    };

    const trends = await MotionSession.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: period === '24h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          avgQuality: { $avg: '$analysis.qualityScore' },
          avgConfidence: { $avg: '$analysis.averageConfidence' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching session trends:', error);
    res.status(500).json({
      success: false,
      message: '獲取趨勢數據失敗',
      error: error.message
    });
  }
});

// GET /api/analytics/quality/distribution - 獲取品質分佈
router.get('/quality/distribution', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const query = userId ? { userId } : { isPublic: true };

    const distribution = await MotionSession.aggregate([
      { $match: query },
      {
        $bucket: {
          groupBy: '$analysis.qualityScore',
          boundaries: [0, 20, 40, 60, 80, 100],
          default: 'Unknown',
          output: {
            count: { $sum: 1 },
            avgConfidence: { $avg: '$analysis.averageConfidence' }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('Error fetching quality distribution:', error);
    res.status(500).json({
      success: false,
      message: '獲取品質分佈失敗',
      error: error.message
    });
  }
});

// GET /api/analytics/landmarks/usage - 獲取關鍵點使用統計
router.get('/landmarks/usage', auth, async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: '請提供會話 ID'
      });
    }

    const session = await MotionSession.findOne({
      $or: [
        { _id: sessionId },
        { sessionId }
      ],
      userId: req.user.id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '會話不存在或無權限訪問'
      });
    }

    // 計算每個關鍵點的統計數據
    const landmarkStats = [];
    
    for (let i = 0; i < 33; i++) { // MediaPipe 有 33 個關鍵點
      let totalVisibility = 0;
      let validFrames = 0;
      
      session.frameData.forEach(frame => {
        if (frame.landmarks3D[i]) {
          totalVisibility += frame.landmarks3D[i].visibility;
          validFrames++;
        }
      });
      
      landmarkStats.push({
        landmarkIndex: i,
        averageVisibility: validFrames > 0 ? totalVisibility / validFrames : 0,
        detectionRate: validFrames / session.frameData.length,
        totalFrames: validFrames
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        totalFrames: session.frameData.length,
        landmarkStats
      }
    });
  } catch (error) {
    console.error('Error fetching landmark usage:', error);
    res.status(500).json({
      success: false,
      message: '獲取關鍵點統計失敗',
      error: error.message
    });
  }
});

module.exports = router;
