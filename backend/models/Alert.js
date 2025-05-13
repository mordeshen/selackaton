const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  alertType: {
    type: String,
    enum: ['distress', 'inactivity', 'toxic', 'mention', 'groupChange', 'security', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  sourceType: {
    type: String,
    enum: ['message', 'group', 'user', 'system', 'event'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'sourceType',
    required: true
  },
  affectedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  affectedGroupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  detectMethod: {
    type: String,
    enum: ['ai', 'keyword', 'pattern', 'manual', 'threshold'],
    default: 'ai'
  },
  detectionScore: {
    type: Number,
    min: 0,
    max: 1
  },
  status: {
    type: String,
    enum: ['new', 'assigned', 'inProgress', 'resolved', 'falsePositive', 'ignored'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    resolutionType: {
      type: String,
      enum: ['support', 'intervention', 'monitoring', 'falseAlarm', 'other']
    },
    notes: String
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: Date,
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
AlertSchema.index({ alertType: 1, createdAt: -1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ status: 1 });
AlertSchema.index({ affectedUserId: 1 });
AlertSchema.index({ affectedGroupId: 1 });

// מתודות סטטיות
AlertSchema.statics.findActive = function(limit = 20) {
  return this.find({
    status: { $in: ['new', 'assigned', 'inProgress'] }
  })
  .sort({ severity: -1, createdAt: -1 })
  .limit(limit)
  .populate('affectedUserId', 'name phone')
  .populate('affectedGroupId', 'name');
};

AlertSchema.statics.findByUser = function(userId, limit = 10) {
  return this.find({ affectedUserId: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

AlertSchema.statics.findHighPriority = function(limit = 10) {
  return this.find({
    severity: { $in: ['high', 'critical'] },
    status: { $in: ['new', 'assigned', 'inProgress'] }
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// מתודות מסמך
AlertSchema.methods.assignTo = async function(userId) {
  this.assignedTo = userId;
  this.status = 'assigned';
  this.updatedAt = new Date();
  return await this.save();
};

AlertSchema.methods.resolveAlert = async function(resolvedBy, resolutionType, notes) {
  this.status = 'resolved';
  this.resolution = {
    resolvedBy,
    resolvedAt: new Date(),
    resolutionType,
    notes
  };
  this.updatedAt = new Date();
  return await this.save();
};

AlertSchema.methods.markAsFalsePositive = async function(resolvedBy, notes) {
  this.status = 'falsePositive';
  this.resolution = {
    resolvedBy,
    resolvedAt: new Date(),
    resolutionType: 'falseAlarm',
    notes
  };
  this.updatedAt = new Date();
  return await this.save();
};

AlertSchema.methods.sendNotification = async function() {
  // כאן תהיה לוגיקת שליחת ההתראה
  this.notificationSent = true;
  this.notificationSentAt = new Date();
  return await this.save();
};

AlertSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Alert', AlertSchema);