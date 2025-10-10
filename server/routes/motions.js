const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Motions } = require('../mongodb/models');
const cloudinary = require('../config/cloudinary');
const { uploadMotionFiles } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

// 添加健康檢查路由
router.get('/health/check', async (req, res) => {
  try {
    const start = Date.now();
    
    // 檢查連接狀態
    const connectionState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };

    if (connectionState !== 1) {
      return res.status(503).json({
        success: false,
        database: {
          status: states[connectionState],
          state: connectionState
        },
        timestamp: new Date().toISOString()
      });
    }

    // 執行簡單的資料庫查詢測試
    await mongoose.connection.db.admin().ping();
    
    // 測試 motions collection
    const count = await Motions.countDocuments().maxTimeMS(5000);
    const responseTime = Date.now() - start;
    
    res.json({
      success: true,
      database: {
        status: states[connectionState],
        state: connectionState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        motionsCount: count,
        responseTime: `${responseTime}ms`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 健康檢查失敗:', error);
    res.status(503).json({
      success: false,
      message: '資料庫健康檢查失敗',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
// router.get('/', (req, res) => {
//     res.send('Hello World from the motions route!');
// });

// GET /api/motions - 獲取動作列表
router.get('/', auth, async (req, res) => {
    try {
        const motions = await Motions.find({});
        console.log('Motions fetched:', motions.length);
        res.status(200).json({
            success: true,
            data: motions
        });
    } catch (error) {
        console.error('Error fetching motions:', error);
        res.status(500).json({
            success: false,
            message: '獲取動作列表失敗',
            error: error.message
        });
    }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const details = await Motions.findOne({
      sessionId: req.params.id
    });

    if (!details) {
      return res.status(404).json({
        success: false,
        message: '不存在'
      });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error fetching details:', error);
    res.status(500).json({
      success: false,
      message: '失敗',
      error: error.message
    });
  }
});

router.post('/', auth, uploadMotionFiles, async (req, res) => {
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
    
    const sessionId = uuidv4();
    const motions = new Motions({
      sessionId,
      userId: req.user?.id || null,
      title: title || `動作記錄 ${new Date().toLocaleDateString()}`,
      description: description || '',
      videoFileName: videoFile.originalname,
      videoUrl: '', // 暫時為空
      videoPublicId: '', // 暫時為空
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
          platform: req.body.platform || 'unknown',
          camera: req.body.camera || 'default'
        }
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublic: isPublic === 'true',
      status: 'processing',
      analysis: {
        averageConfidence: 0,
        detectedActions: [],
        qualityScore: 0
      }
    });
    
    await motions.save();
    console.log('✅ 資料庫記錄創建成功，sessionId:', sessionId);
    
    try {
      const base64Data = videoFile.buffer.toString('base64');
      const dataURI = `data:${videoFile.mimetype};base64,${base64Data}`;

      const videoUploadResult = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'video',
        folder: process.env.CLOUDINARY_FOLDER || 'motion_detection_videos',
        public_id: sessionId,
      });

      console.log('✅ Cloudinary 上傳成功');

      // 🔧 使用 updateOne 而不是修改對象後 save
      await Motions.updateOne(
        { sessionId },
        {
          $set: {
            videoUrl: videoUploadResult.secure_url,
            videoPublicId: videoUploadResult.public_id,
            status: 'completed',
            'metadata.cloudinary': {
              publicId: videoUploadResult.public_id,
              format: videoUploadResult.format,
              duration: videoUploadResult.duration,
              bytes: videoUploadResult.bytes,
              thumbnail: cloudinary.url(videoUploadResult.public_id, {
                resource_type: 'video',
                format: 'jpg',
                transformation: [
                  { width: 300, height: 200, crop: 'fill' },
                  { quality: 'auto' }
                ]
              })
            }
          }
        }
      );

      console.log('✅ 資料庫更新成功');

      res.status(201).json({
        success: true,
        message: '創建成功',
        data: {
            sessionId: motions.sessionId,
            id: motions._id,
            videoUrl: videoUploadResult.secure_url,
        }
    });
    } catch (cloudinaryError) {
      console.error(cloudinaryError);
      try {
        await Motions.updateOne(
          { sessionId },
          {
            $set: {
              status: 'failed',
              'analysis.notes': `Cloudinary 上傳失敗: ${cloudinaryError.message}`
            }
          }
        );
        console.log('💾 已更新失敗狀態');
      } catch (updateError) {
        console.error('❌ 更新失敗狀態也失敗:', updateError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Cloudinary 上傳失敗',
        error: cloudinaryError.message,
        sessionId: motions.sessionId, // 返回 sessionId 以便後續重試
        canRetry: true
      });
    }
  } catch (error) {
    console.error('Error creating motion:', error);
    res.status(500).json({
      success: false,
      message: '創建動作失敗',
      error: error.message
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const motion = await Motions.findOneAndDelete({ sessionId: req.params.id });

    if (!motion) {
      return res.status(404).json({
        success: false,
        message: '動作不存在'
      });
    }

    // 如果有 Cloudinary 上傳的影片，則刪除
    if (motion.videoPublicId) {
      await cloudinary.uploader.destroy(motion.videoPublicId, { resource_type: 'video' });
      console.log('✅ Cloudinary 上傳的影片已刪除');
    }

    res.json({
      success: true,
      message: '動作已刪除'
    });
  } catch (error) {
    console.error('Error deleting motion:', error);
    res.status(500).json({
      success: false,
      message: '刪除動作失敗',
      error: error.message
    });
  }
});

module.exports = router;