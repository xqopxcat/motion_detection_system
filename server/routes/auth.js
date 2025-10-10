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

// POST /api/auth/register - 用戶註冊 (保留原有功能)
router.post('/register', validateUser, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // 檢查用戶是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? '此 Email 已被註冊' : '此用戶名已被使用'
      });
    }

    // 加密密碼
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 創建新用戶
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profile: {
        firstName,
        lastName
      },
      createdAt: new Date()
    });

    await newUser.save();

    // 生成 JWT token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          profile: newUser.profile,
          createdAt: newUser.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: '註冊失敗',
      error: error.message
    });
  }
});

// POST /api/auth/login - 用戶登入 (保留原有功能)
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用戶
    const user = await User.findOne({
      $or: [{ email: username }, { username }]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 檢查密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '密碼錯誤'
      });
    }

    // 生成 JWT token
    const token = generateToken(user);

    res.json({
      success: true,
      message: '登入成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profile: user.profile,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: '登入失敗',
      error: error.message
    });
  }
});

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