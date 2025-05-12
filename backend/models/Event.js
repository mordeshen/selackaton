const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['workshop', 'support', 'lecture', 'social', 'outdoor', 'community', 'other'],
    required: true
  },
  location: {
    name: {
      type: String,
      required: true
    },
    address: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    meetingLink: String
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  timezone: {
    type: String,
    default: 'Asia/Jerusalem'
  },
  recurrence: {
    type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
  },
  recurrenceEndDate: Date,
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetGroups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['registered', 'confirmed', 'attended', 'canceled'],
      default: 'registered'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    }
  }],
  maxParticipants: {
    type: Number,
    default: 0 // 0 = ללא הגבלה
  },
  externalLink: String,
  externalSource: String,
  tags: [String],
  imageUrl: String,
  status: {
    type: String,
    enum: ['scheduled', 'canceled', 'completed', 'postponed'],
    default: 'scheduled'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// אינדקסים לשיפור ביצועים
EventSchema.index({ startDate: 1 });
EventSchema.index({ 'location.city': 1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ targetGroups: 1 });

// וירטואלים
EventSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date();
});

EventSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// מתודות סטטיות
EventSchema.statics.findUpcoming = function(limit = 10) {
  const now = new Date();
  return this.find({ 
    startDate: { $gt: now },
    status: 'scheduled'
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

EventSchema.statics.findByCity = function(city, limit = 10) {
  const now = new Date();
  return this.find({ 
    'location.city': city,
    startDate: { $gt: now },
    status: 'scheduled'
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

EventSchema.statics.findRecommendedForUser = async function(userId, limit = 5) {
  const user = await mongoose.model('User').findById(userId);
  if (!user) return [];
  
  // מציאת אירועים לפי העדפות משתמש
  return this.find({
    startDate: { $gt: new Date() },
    status: 'scheduled',
    $or: [
      { tags: { $in: user.interests || [] } },
      { 'location.city': user.city },
      { targetGroups: { $in: user.groups || [] } }
    ]
  })
  .sort({ startDate: 1 })
  .limit(limit);
};

// מתודות מסמך
EventSchema.methods.registerParticipant = async function(userId) {
  if (this.maxParticipants > 0 && this.participants.length >= this.maxParticipants) {
    throw new Error('האירוע מלא');
  }
  
  if (!this.participants.some(p => p.userId.equals(userId))) {
    this.participants.push({
      userId,
      status: 'registered',
      registrationDate: new Date()
    });
    await this.save();
  }
  
  return this;
};

EventSchema.methods.cancelRegistration = async function(userId) {
  const participantIndex = this.participants.findIndex(p => p.userId.equals(userId));
  
  if (participantIndex > -1) {
    this.participants[participantIndex].status = 'canceled';
    await this.save();
  }
  
  return this;
};

EventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Event', EventSchema);