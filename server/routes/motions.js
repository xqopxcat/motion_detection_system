const express = require('express');
const router = express.Router();
const { Motions } = require('../mongodb/models');
const cloudinary = require('../config/cloudinary');
const { uploadMotionFiles } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

// router.get('/', (req, res) => {
//     res.send('Hello World from the motions route!');
// });

// GET /api/motions - 獲取動作列表
router.get('/', async (req, res) => {
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

router.get('/:id', async (req, res) => {
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

router.post('/', uploadMotionFiles, async (req, res) => {
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
    try {
      const base64Data = videoFile.buffer.toString('base64');
      const dataURI = `data:${videoFile.mimetype};base64,${base64Data}`;

      const videoUploadResult = await cloudinary.uploader.upload(dataURI, {
        resource_type: 'video',
        folder: process.env.CLOUDINARY_FOLDER || 'motion_detection_videos',
        public_id: sessionId,
      });
      // 創建新的動作會話
      const motions = new Motions({
        sessionId,
        userId: req.user?.id || null,
        title: title || `動作記錄 ${new Date().toLocaleDateString()}`,
        description: description || '',
        videoFileName: videoFile.originalname,
        videoUrl: videoUploadResult.secure_url,
        videoPublicId: videoUploadResult.public_id,
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
          },
          cloudinary: {
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
        },
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: isPublic === 'true',
        analysis: {
          averageConfidence: 0,
          detectedActions: [],
          qualityScore: 0
        }
      });
      
      await motions.save();
      res.status(201).json({
        success: true,
        message: '創建成功',
        data: {
            sessionId: motions.sessionId,
            id: motions._id,
            videoUrl: videoUploadResult.secure_url,
            thumbnailUrl: cloudinary.url(videoUploadResult.public_id, {
                resource_type: 'video',
                format: 'jpg',
                transformation: [
                    { width: 300, height: 200, crop: 'fill' },
                    { quality: 'auto' }
                ]
            })
        }
    });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: '創建失敗',
        error: error.message
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

// 其他路由和中間件可以在這裡添加
module.exports = router;