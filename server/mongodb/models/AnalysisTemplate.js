const mongoose = require('mongoose');

// Analysis Template Schema - 分析模板和算法配置
const analysisTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['sports', 'medical', 'fitness', 'dance', 'general'],
    required: true
  },
  algorithm: {
    type: String,
    enum: ['pose_classification', 'action_recognition', 'biomechanics', 'custom'],
    required: true
  },
  parameters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  keyLandmarks: [{
    type: Number,
    min: 0,
    max: 33 // MediaPipe Pose landmarks 索引
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'analysis_templates'
});

module.exports = mongoose.model('AnalysisTemplate', analysisTemplateSchema);
