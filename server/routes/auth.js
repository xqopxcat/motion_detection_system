const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// POST /api/auth/register - 用戶註冊
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
        message: existingUser.email === email ? '電子郵件已被使用' : '用戶名已被使用'
      });
    }

    // 創建新用戶
    const user = new User({
      username,
      email,
      password,
      profile: {
        firstName,
        lastName
      }
    });

    await user.save();

    // 生成 Token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: '註冊失敗',
      error: error.message
    });
  }
});

// POST /api/auth/login - 用戶登入
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用戶
    const user = await User.findOne({ 
      $or: [{ email }, { username: email }],
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '電子郵件或密碼錯誤'
      });
    }

    // 驗證密碼
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '電子郵件或密碼錯誤'
      });
    }

    // 更新最後登入時間
    user.lastLogin = new Date();
    await user.save();

    // 生成 Token
    const token = generateToken(user);

    res.json({
      success: true,
      message: '登入成功',
      data: {
        user: user.toJSON(),
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
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: '獲取用戶信息失敗',
      error: error.message
    });
  }
});

// PUT /api/auth/me - 更新當前用戶信息
router.put('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 允許更新的欄位
    const allowedUpdates = [
      'profile.firstName',
      'profile.lastName',
      'profile.bio',
      'profile.dateOfBirth',
      'profile.preferences'
    ];

    // 更新用戶信息
    if (req.body.profile) {
      if (req.body.profile.firstName !== undefined) {
        user.profile.firstName = req.body.profile.firstName;
      }
      if (req.body.profile.lastName !== undefined) {
        user.profile.lastName = req.body.profile.lastName;
      }
      if (req.body.profile.bio !== undefined) {
        user.profile.bio = req.body.profile.bio;
      }
      if (req.body.profile.dateOfBirth !== undefined) {
        user.profile.dateOfBirth = req.body.profile.dateOfBirth;
      }
      if (req.body.profile.preferences !== undefined) {
        user.profile.preferences = {
          ...user.profile.preferences,
          ...req.body.profile.preferences
        };
      }
    }

    await user.save();

    res.json({
      success: true,
      message: '用戶信息更新成功',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: '更新用戶信息失敗',
      error: error.message
    });
  }
});

// POST /api/auth/change-password - 修改密碼
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '請提供當前密碼和新密碼'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密碼長度至少為 6 個字符'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 驗證當前密碼
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '當前密碼錯誤'
      });
    }

    // 更新密碼
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密碼修改成功'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: '密碼修改失敗',
      error: error.message
    });
  }
});

// POST /api/auth/logout - 登出（客戶端處理，伺服器端可以加入黑名單機制）
router.post('/logout', auth, async (req, res) => {
  try {
    // 這裡可以實現 Token 黑名單機制
    // 目前只是返回成功響應，實際的登出由客戶端處理（刪除 Token）
    
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
