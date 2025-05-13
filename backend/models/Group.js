// models/Group.js
const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  whatsappId: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  type: {
    type: String,
    enum: ['support', 'activity', 'interest', 'location'],
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'admin'],
      default: 'member'
    },
    activityScore: {
      type: Number,
      default: 0
    }
  }],
  characteristics: {
    type: Map,
    of: Number
  },
  metrics: {
    activityLevel: {
      type: Number,
      default: 0
    },
    messageCount: {
      type: Number,
      default: 0
    },
    positivityScore: {
      type: Number,
      default: 0
    },
    lastMessage: Date
  },
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Group', GroupSchema);