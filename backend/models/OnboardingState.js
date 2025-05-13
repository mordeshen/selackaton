// backend/models/OnboardingState.js
const mongoose = require('mongoose');

const OnboardingStateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  stage: {
    type: String,
    enum: ['initial', 'needs_assessment', 'interests', 'preferences', 'recommendations', 'completed'],
    default: 'initial'
  },
  currentQuestion: {
    type: Number,
    default: 0
  },
  responses: [{
    questionId: String,
    question: String,
    answer: String,
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  recommendations: [{
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    score: Number,
    reason: String
  }],
  selectedGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

OnboardingStateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('OnboardingState', OnboardingStateSchema);