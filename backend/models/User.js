// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  profile: {
    age: Number,
    gender: String,
    location: {
      city: String,
      coordinates: {
        lat: Number,
        long: Number
      }
    },
    interests: [String],
    personalityTraits: {
      type: Map,
      of: Number
    }
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  riskAssessment: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    factors: [String],
    lastUpdated: Date
  },
  // מידע נוסף מהנתונים שנאספים במהלך השיחות
  conversationData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('User', UserSchema);