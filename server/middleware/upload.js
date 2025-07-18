const multer = require('multer');

// 使用記憶體儲存
const storage = multer.memoryStorage();

// 檔案過濾器
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    // 影片檔案驗證
    const allowedVideoTypes = [
      'video/mp4', 
      'video/webm', 
      'video/avi', 
      'video/quicktime',
      'video/x-msvideo'
    ];
    
    if (allowedVideoTypes.includes(file.mimetype)) {
      console.log('✅ 影片檔案通過驗證');
      cb(null, true);
    } else {
      console.log('❌ 影片檔案格式不支援:', file.mimetype);
      cb(new Error('不支援的影片格式'), false);
    }
  } else if (file.fieldname === 'landmarks') {
    // JSON 檔案驗證
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      console.log('✅ JSON 檔案通過驗證');
      cb(null, true);
    } else {
      console.log('❌ JSON 檔案格式不支援:', file.mimetype);
      cb(new Error('姿勢數據必須是 JSON 格式'), false);
    }
  } else {
    console.log('❌ 不支援的欄位名稱:', file.fieldname);
    cb(new Error('不支援的檔案類型'), false);
  }
};

// 配置 multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 2, // 最多2個檔案
  },
});

// 多檔案上傳中間件
const uploadMotionFiles = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'landmarks', maxCount: 1 }
]);

module.exports = {
  uploadMotionFiles
};