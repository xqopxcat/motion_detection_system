const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport'); // 引入 passport 配置
const { User } = require('../mongodb/models');
const { auth } = require('../middleware/auth');
const { validateUser, validateLogin } = require('../middleware/validation');

// 生成 JWT Token
const generateToken = (user) => {
  return jwt.sign(
    user.toJWT(),
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Google OAuth 路由
// GET /api/auth/google - 開始 Google OAuth 流程
router.get('/google', (req, res, next) => {
  const { type } = req.query; // 'login' 或 'register'
  
  // 將類型保存到 session 中
  req.session.authType = type || 'login';
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// GET /api/auth/google/callback - Google OAuth 回調
router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;
      const authType = req.session.authType || 'login';
      
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=認證失敗`);
      }

      // 生成 JWT token
      const token = generateToken(user);
      
      // 準備用戶數據
      const userData = {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        createdAt: user.createdAt
      };

      // 重定向到前端，附帶 token 和用戶資料
      const redirectUrl = authType === 'register' ? '/register' : '/login';
      const params = new URLSearchParams({
        token: token,
        user: encodeURIComponent(JSON.stringify(userData))
      });

      res.redirect(`${process.env.CLIENT_URL}${redirectUrl}?${params.toString()}`);

    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=登入過程中發生錯誤`);
    }
  }
);

// GET /api/auth/me - 獲取當前用戶信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶信息失敗',
      error: error.message
    });
  }
});

// POST /api/auth/logout - 登出
router.post('/logout', auth, async (req, res) => {
  try {
    // 這裡可以加入 token 黑名單邏輯
    // 目前只是簡單回應，實際的登出由前端處理（刪除 localStorage 中的 token）
    
    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: '登出失敗',
      error: error.message
    });
  }
});

module.exports = router;