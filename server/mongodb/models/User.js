const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // 原有欄位
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  
  // Google OAuth 欄位
  googleId: {
    type: String,
    sparse: true // 允許多個 null 值，但不允許重複的非 null 值
  },
  
  profile: {
    firstName: String,
    lastName: String,
    avatar: String,
    bio: String
  },
  
  // 其他欄位
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 索引
userSchema.index({ googleId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// 生成 JWT 用的數據
userSchema.methods.toJWT = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email
  };
};

// 更新 updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);