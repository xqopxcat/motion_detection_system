const mongoose = require('mongoose');

// Pose Landmark Schema - 表示單個姿勢關鍵點
const poseLandmarkSchema = new mongoose.Schema({
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  z: {
    type: Number,
    required: true
  },
  visibility: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  }
}, { _id: false });

// Frame Data Schema - 表示單個時間幀的姿勢數據
const frameDataSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    required: true
  },
  frameTime: {
    type: Number,
    required: true
  },
  frameNumber: {
    type: Number,
    required: true,
    min: 0
  },
  landmarks3D: {
    type: [poseLandmarkSchema],
    required: true,
    validate: {
      validator: function(landmarks) {
        return landmarks.length === 17; // MediaPipe Pose 有 33 個關鍵點, 但我只抓17個關鍵點
      },
      message: 'Must have exactly 17 pose landmarks'
    }
  },
  landmarks2D: {
    type: [poseLandmarkSchema],
    required: true,
    validate: {
      validator: function(landmarks) {
        return landmarks.length === 17; // MediaPipe Pose 有 33 個關鍵點, 但我只抓17個關鍵點
      },
      message: 'Must have exactly 17 pose landmarks'
    }
  },
  confidenceValues: {
    type: [Number],
    default: []
  }
}, { _id: false });

// Motion Session Schema - 表示一次完整的動作檢測會話
const motionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 允許匿名使用
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  videoFileName: {
    type: String,
    required: true
  },
  videoPublicId: {
    type: String,
    required: true,
    trim: true,
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },
  videoDuration: {
    type: Number, // 影片長度（秒）
    required: true,
    min: 0
  },
  videoSize: {
    type: Number, // 檔案大小（bytes）
    required: true,
    min: 0
  },
  frameData: {
    type: [frameDataSchema],
    required: true,
    validate: {
      validator: function(frames) {
        return frames.length > 0;
      },
      message: 'Must have at least one frame'
    }
  },
  metadata: {
    totalFrames: {
      type: Number,
      required: true,
      min: 0
    },
    fps: {
      type: Number,
      default: 30
    },
    resolution: {
      width: Number,
      height: Number
    },
    deviceInfo: {
      userAgent: String,
      platform: String,
      camera: String
    },
    cloudinary: {
      publicId: String,
      format: String,
      duration: Number, // 影片在 Cloudinary 的實際時長
      bytes: Number, // 影片大小（bytes）
      thumbnail: String
    }
  },
  analysis: {
    averageConfidence: {
      type: Number,
      min: 0,
      max: 1
    },
    detectedActions: [{
      actionType: String,
      confidence: Number,
      startFrame: Number,
      endFrame: Number,
      duration: Number
    }],
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'archived'],
    default: 'completed'
  }
}, {
  timestamps: true, // 自動添加 createdAt 和 updatedAt
  collection: 'motions'
});

// 複合索引優化查詢性能
motionSchema.index({ userId: 1, createdAt: -1 });
motionSchema.index({ status: 1, createdAt: -1 });
motionSchema.index({ tags: 1 });
motionSchema.index({ 'metadata.totalFrames': 1 });
motionSchema.index({ 'analysis.qualityScore': -1 });
motionSchema.index({ videoPublicId: 1 });

// 虛擬屬性：計算會話的總時長
motionSchema.virtual('duration').get(function() {
  if (this.frameData && this.frameData.length > 0) {
    const firstFrame = this.frameData[0];
    const lastFrame = this.frameData[this.frameData.length - 1];
    return (lastFrame.timestamp - firstFrame.timestamp) / 1000; // 轉換為秒
  }
  return 0;
});

// 實例方法：獲取特定時間範圍的幀數據
motionSchema.methods.getFramesInTimeRange = function(startTime, endTime) {
  return this.frameData.filter(frame => 
    frame.frameTime >= startTime && frame.frameTime <= endTime
  );
};

// 實例方法：計算平均置信度
motionSchema.methods.calculateAverageConfidence = function() {
  if (!this.frameData || this.frameData.length === 0) return 0;
  
  let totalConfidence = 0;
  let totalLandmarks = 0;
  
  this.frameData.forEach(frame => {
    frame.landmarks3D.forEach(landmark => {
      totalConfidence += landmark.visibility;
      totalLandmarks++;
    });
  });
  
  return totalLandmarks > 0 ? totalConfidence / totalLandmarks : 0;
};

// 靜態方法：根據動作類型查找會話
motionSchema.statics.findByActionType = function(actionType) {
  return this.find({ 'analysis.detectedActions.actionType': actionType });
};

// 預處理中間件：保存前自動計算分析數據
motionSchema.pre('save', function(next) {
  if (this.isModified('frameData')) {
    // 自動計算平均置信度
    this.analysis.averageConfidence = this.calculateAverageConfidence();
    
    // 更新總幀數
    this.metadata.totalFrames = this.frameData.length;
  }
  next();
});

module.exports = mongoose.model('Motions', motionSchema);
