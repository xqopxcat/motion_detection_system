// server/mongodb/models/Annotations.js
const mongoose = require('mongoose');

const annotationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  frameNumber: {
    type: Number,
    required: true,
    min: 0
  },
  jointName: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 允許匿名標注
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#00ff00'
  },
  category: {
    type: String,
    enum: ['general', 'error', 'improvement', 'note'],
    default: 'general'
  }
}, {
  timestamps: true,
  collection: 'annotations'
});

// 複合索引
annotationSchema.index({ sessionId: 1, frameNumber: 1 });
annotationSchema.index({ sessionId: 1, jointName: 1 });

module.exports = mongoose.model('Annotations', annotationSchema);