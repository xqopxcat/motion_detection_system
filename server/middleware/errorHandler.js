// 全局錯誤處理中間件
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Mongoose 驗證錯誤
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({
      success: false,
      message: '數據驗證失敗',
      errors: message
    });
  }

  // Mongoose 重複鍵錯誤
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} 已存在`;
    return res.status(400).json({
      success: false,
      message
    });
  }

  // Mongoose 格式錯誤
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: '資源不存在'
    });
  }

  // JWT 錯誤
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '令牌無效'
    });
  }

  // JWT 過期錯誤
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: '令牌已過期'
    });
  }

  // Multer 錯誤
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '檔案大小超過限制'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: '檔案數量超過限制'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: '意外的檔案欄位'
    });
  }

  // 預設伺服器錯誤
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '伺服器內部錯誤'
  });
};

// 404 處理中間件
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `找不到路由: ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
