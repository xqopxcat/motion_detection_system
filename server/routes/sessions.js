const express = require('express');
const router = express.Router();
const { MotionSession } = require('../mongodb/models');
const { upload, uploadToGridFS } = require('../config/upload');
const { auth, optionalAuth } = require('../middleware/auth');
const { validateMotionSession } = require('../middleware/validation');
const { v4: uuidv4 } = require('uuid');

// GET /api/sessions - 獲取動作會話列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 構建查詢條件
    const query = {};
    
    // 如果有用戶登入，顯示該用戶的會話 + 公開會話
    if (req.user) {
      query.$or = [
        { userId: req.user.id },
        { isPublic: true }
      ];
    } else {
      // 未登入只顯示公開會話
      query.isPublic = true;
    }

    // 狀態過濾
    if (req.query.status) {
      query.status = req.query.status;
    }

    // 標籤過濾
    if (req.query.tags) {
      const tags = req.query.tags.split(',');
      query.tags = { $in: tags };
    }

    // 動作類型過濾
    if (req.query.actionType) {
      query['analysis.detectedActions.actionType'] = req.query.actionType;
    }

    const sessions = await MotionSession.find(query)
      .populate('userId', 'username profile.firstName profile.lastName')
      .select('-frameData') // 列表時不返回詳細的幀數據
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MotionSession.countDocuments(query);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: '獲取會話列表失敗',
      error: error.message
    });
  }
});

// GET /api/sessions/:id - 獲取特定動作會話詳情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const session = await MotionSession.findOne({
      $or: [
        { _id: req.params.id },
        { sessionId: req.params.id }
      ]
    }).populate('userId', 'username profile.firstName profile.lastName');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '會話不存在'
      });
    }

    // 檢查訪問權限
    if (!session.isPublic && (!req.user || session.userId?.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '無權限訪問此會話'
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: '獲取會話詳情失敗',
      error: error.message
    });
  }
});

// POST /api/sessions - 創建新的動作會話
router.post('/', 
  optionalAuth, 
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'landmarks', maxCount: 1 }
  ]), 
  validateMotionSession,
  async (req, res) => {
    try {
      const { title, description, tags, isPublic } = req.body;
      
      if (!req.files?.video || !req.files?.landmarks) {
        return res.status(400).json({
          success: false,
          message: '缺少必要檔案（影片或姿勢數據）'
        });
      }

      const videoFile = req.files.video[0];
      const landmarksFile = req.files.landmarks[0];

      // 解析姿勢數據
      let frameData;
      try {
        frameData = JSON.parse(landmarksFile.buffer.toString());
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: '姿勢數據格式錯誤'
        });
      }

      // 上傳影片到 GridFS
      const sessionId = uuidv4();
      const videoUploadResult = await uploadToGridFS(
        videoFile.buffer,
        `${sessionId}_${videoFile.originalname}`,
        videoFile.mimetype,
        {
          sessionId,
          type: 'video',
          userId: req.user?.id
        }
      );

      // 創建會話記錄
      const motionSession = new MotionSession({
        sessionId,
        userId: req.user?.id,
        title,
        description,
        videoFileName: videoFile.originalname,
        videoFileId: videoUploadResult._id,
        videoDuration: parseFloat(req.body.videoDuration) || 0,
        videoSize: videoFile.size,
        frameData,
        metadata: {
          totalFrames: frameData.length,
          fps: parseFloat(req.body.fps) || 30,
          resolution: {
            width: parseInt(req.body.width) || 0,
            height: parseInt(req.body.height) || 0
          },
          deviceInfo: {
            userAgent: req.headers['user-agent'],
            platform: req.body.platform,
            camera: req.body.camera
          }
        },
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: isPublic === 'true',
        analysis: {
          averageConfidence: 0,
          detectedActions: [],
          qualityScore: 0
        }
      });

      await motionSession.save();

      res.status(201).json({
        success: true,
        message: '動作會話創建成功',
        data: {
          sessionId: motionSession.sessionId,
          id: motionSession._id
        }
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        message: '創建會話失敗',
        error: error.message
      });
    }
  }
);

// PUT /api/sessions/:id - 更新動作會話
router.put('/:id', auth, async (req, res) => {
  try {
    const session = await MotionSession.findOne({
      $or: [
        { _id: req.params.id },
        { sessionId: req.params.id }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '會話不存在'
      });
    }

    // 檢查權限（只有創建者可以修改）
    if (session.userId?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '無權限修改此會話'
      });
    }

    const allowedUpdates = ['title', 'description', 'tags', 'isPublic', 'analysis'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    Object.assign(session, updates);
    await session.save();

    res.json({
      success: true,
      message: '會話更新成功',
      data: session
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      message: '更新會話失敗',
      error: error.message
    });
  }
});

// DELETE /api/sessions/:id - 刪除動作會話
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await MotionSession.findOne({
      $or: [
        { _id: req.params.id },
        { sessionId: req.params.id }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '會話不存在'
      });
    }

    // 檢查權限（只有創建者或管理員可以刪除）
    if (session.userId?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '無權限刪除此會話'
      });
    }

    // 刪除關聯的影片檔案
    try {
      const { deleteFileFromGridFS } = require('../config/upload');
      await deleteFileFromGridFS(session.videoFileId);
    } catch (error) {
      console.error('Error deleting video file:', error);
    }

    await session.deleteOne();

    res.json({
      success: true,
      message: '會話刪除成功'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: '刪除會話失敗',
      error: error.message
    });
  }
});

// GET /api/sessions/:id/frames - 獲取特定時間範圍的幀數據
router.get('/:id/frames', optionalAuth, async (req, res) => {
  try {
    const { startTime, endTime, startFrame, endFrame } = req.query;
    
    const session = await MotionSession.findOne({
      $or: [
        { _id: req.params.id },
        { sessionId: req.params.id }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '會話不存在'
      });
    }

    // 檢查訪問權限
    if (!session.isPublic && (!req.user || session.userId?.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: '無權限訪問此會話'
      });
    }

    let frames = session.frameData;

    // 按時間範圍過濾
    if (startTime !== undefined && endTime !== undefined) {
      frames = session.getFramesInTimeRange(
        parseFloat(startTime), 
        parseFloat(endTime)
      );
    }

    // 按幀號範圍過濾
    if (startFrame !== undefined && endFrame !== undefined) {
      const start = parseInt(startFrame);
      const end = parseInt(endFrame);
      frames = frames.filter(frame => 
        frame.frameNumber >= start && frame.frameNumber <= end
      );
    }

    res.json({
      success: true,
      data: frames,
      total: frames.length
    });
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({
      success: false,
      message: '獲取幀數據失敗',
      error: error.message
    });
  }
});

module.exports = router;
