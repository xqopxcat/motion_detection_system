const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../mongodb/models');
const jwt = require('jsonwebtoken');

// Google OAuth 策略配置
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google Profile:', profile);
    
    // 檢查用戶是否已存在
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      // 用戶已存在，更新 Google ID 如果尚未設定
      if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }
      return done(null, user);
    }

    // 創建新用戶
    const newUser = new User({
      googleId: profile.id,
      username: profile.emails[0].value.split('@')[0], // 使用 email 前綴作為用戶名
      email: profile.emails[0].value,
      profile: {
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        avatar: profile.photos[0]?.value
      },
      isEmailVerified: true, // Google 帳戶預設已驗證
      createdAt: new Date()
    });

    await newUser.save();
    console.log('新用戶已創建:', newUser);
    
    return done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// 序列化用戶
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// 反序列化用戶
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;