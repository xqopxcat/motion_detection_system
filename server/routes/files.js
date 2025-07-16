const express = require('express');
const router = express.Router();
const { createDownloadStream, getFileFromGridFS } = require('../config/upload');
const { auth, optionalAuth } = require('../middleware/auth');
const { MotionSession } = require('../mongodb/models');

// GET /api/files/:fileId - 下載檔案
router.get('/:fileId', optionalAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // 獲取檔案信息
    const file = await getFileFromGridFS(fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '檔案不存在'
      });
    }

    // 檢查檔案權限
    const sessionId = file.metadata?.sessionId;
    if (sessionId) {
      const session = await MotionSession.findOne({ sessionId });
      
      if (session && !session.isPublic) {
        if (!req.user || session.userId?.toString() !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: '無權限下載此檔案'
          });
        }
      }
    }

    // 設置響應頭
    res.set({
      'Content-Type': file.contentType || 'application/octet-stream',
      'Content-Length': file.length,
      'Content-Disposition': `inline; filename="${file.filename}"`,
      'Cache-Control': 'public, max-age=31536000', // 1年緩存
      'ETag': file._id.toString()
    });

    // 檢查 ETag
    if (req.headers['if-none-match'] === file._id.toString()) {
      return res.status(304).end();
    }

    // 創建下載流
    const downloadStream = createDownloadStream(file._id);
    
    downloadStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '檔案下載失敗'
        });
      }
    });

    downloadStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: '檔案下載失敗',
      error: error.message
    });
  }
});

// GET /api/files/:fileId/info - 獲取檔案信息
router.get('/:fileId/info', optionalAuth, async (req, res) => {
  try {
    const file = await getFileFromGridFS(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '檔案不存在'
      });
    }

    // 檢查權限（與下載相同的邏輯）
    const sessionId = file.metadata?.sessionId;
    if (sessionId) {
      const session = await MotionSession.findOne({ sessionId });
      
      if (session && !session.isPublic) {
        if (!req.user || session.userId?.toString() !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: '無權限訪問此檔案信息'
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        id: file._id,
        filename: file.filename,
        contentType: file.contentType,
        length: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    });
  } catch (error) {
    console.error('Error fetching file info:', error);
    res.status(500).json({
      success: false,
      message: '獲取檔案信息失敗',
      error: error.message
    });
  }
});

module.exports = router;
