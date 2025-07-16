const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema - 用戶管理
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minLength: 3,
    maxLength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxLength: 50
    },
    lastName: {
      type: String,
      trim: true,
      maxLength: 50
    },
    avatar: String, // 頭像 URL 或 GridFS ID
    bio: {
      type: String,
      maxLength: 500
    },
    dateOfBirth: Date,
    preferences: {
      language: {
        type: String,
        default: 'zh-TW'
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        analysis: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'researcher'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  collection: 'users'
});

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// 虛擬屬性：全名
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

// 預處理中間件：密碼加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 實例方法：驗證密碼
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 實例方法：生成 JWT payload
userSchema.methods.toJWT = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role
  };
};

// 移除敏感信息
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);
