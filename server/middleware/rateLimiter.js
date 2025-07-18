const rateLimit = require('express-rate-limit');

// 一般 API 限制
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 分鐘
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每個 IP 100 次請求
  message: {
    success: false,
    message: '請求過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 檔案上傳限制
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 10, // 限制每個 IP 10 次上傳
  message: {
    success: false,
    message: '上傳請求過於頻繁，請稍後再試'
  }
});

// 認證相關限制（更嚴格）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 限制每個 IP 5 次認證請求
  message: {
    success: false,
    message: '認證請求過於頻繁，請稍後再試'
  },
  skipSuccessfulRequests: true // 成功的請求不計入限制
});

// 分析 API 限制
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: 30, // 限制每個 IP 30 次分析請求
  message: {
    success: false,
    message: '分析請求過於頻繁，請稍後再試'
  }
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  authLimiter,
  analyticsLimiter
};
