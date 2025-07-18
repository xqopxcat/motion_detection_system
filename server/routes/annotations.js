// server/routes/annotations.js
const express = require('express');
const router = express.Router();
const Annotations = require('../mongodb/models/Annotations');

// 創建標注
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      frameNumber,
      jointName,
      position,
      text,
      category,
      color
    } = req.body;

    // 驗證必要字段
    if (!sessionId || frameNumber === undefined || !jointName || !position || !text) {
      return res.status(400).json({
        success: false,
        message: '缺少必要字段'
      });
    }

    const annotation = new Annotations({
      sessionId,
      frameNumber,
      jointName,
      position,
      text,
      category: category || 'general',
      color: color || '#00ff00',
      userId: req.user?.id || null
    });

    await annotation.save();

    res.status(201).json({
      success: true,
      message: '標注創建成功',
      data: annotation
    });

  } catch (error) {
    console.error('創建標注失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建標注失敗',
      error: error.message
    });
  }
});

// 獲取指定的所有標注
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { frameNumber, jointName } = req.query;

    let query = { sessionId, isVisible: true };
    
    if (frameNumber !== undefined) {
      query.frameNumber = parseInt(frameNumber);
    }
    
    if (jointName) {
      query.jointName = jointName;
    }

    const annotations = await Annotations.find(query)
      .sort({ frameNumber: 1, createdAt: 1 });

    res.json({
      success: true,
      data: annotations
    });

  } catch (error) {
    console.error('獲取標注失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取標注失敗',
      error: error.message
    });
  }
});

// 更新標注
router.put('/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;
    const { text, category, color, isVisible } = req.body;

    const annotation = await Annotations.findById(annotationId);
    
    if (!annotation) {
      return res.status(404).json({
        success: false,
        message: '標注不存在'
      });
    }

    // 更新字段
    if (text !== undefined) annotation.text = text;
    if (category !== undefined) annotation.category = category;
    if (color !== undefined) annotation.color = color;
    if (isVisible !== undefined) annotation.isVisible = isVisible;

    await annotation.save();

    res.json({
      success: true,
      message: '標注更新成功',
      data: annotation
    });

  } catch (error) {
    console.error('更新標注失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新標注失敗',
      error: error.message
    });
  }
});

// 刪除標注
router.delete('/:annotationId', async (req, res) => {
  try {
    const { annotationId } = req.params;

    const annotation = await Annotations.findById(annotationId);
    
    if (!annotation) {
      return res.status(404).json({
        success: false,
        message: '標注不存在'
      });
    }

    await Annotations.findByIdAndDelete(annotationId);

    res.json({
      success: true,
      message: '標注刪除成功'
    });

  } catch (error) {
    console.error('刪除標注失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除標注失敗',
      error: error.message
    });
  }
});

// 批量刪除標注
router.delete('/:sessionId/batch', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { annotationIds } = req.body;

    if (!annotationIds || !Array.isArray(annotationIds)) {
      return res.status(400).json({
        success: false,
        message: '請提供要刪除的標注ID列表'
      });
    }

    const result = await Annotations.deleteMany({
      _id: { $in: annotationIds },
      sessionId
    });

    res.json({
      success: true,
      message: `成功刪除 ${result.deletedCount} 個標注`
    });

  } catch (error) {
    console.error('批量刪除標注失敗:', error);
    res.status(500).json({
      success: false,
      message: '批量刪除標注失敗',
      error: error.message
    });
  }
});

module.exports = router;