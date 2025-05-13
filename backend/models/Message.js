const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  whatsappMessageId: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'document', 'location', 'contact'],
    default: 'text'
  },
  mediaUrl: String,
  sentAt: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    default: 0
  },
  keywords: [String],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// אינדקסים לשיפור ביצועים
MessageSchema.index({ groupId: 1, sentAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ whatsappMessageId: 1 });
MessageSchema.index({ sentimentScore: 1 });

// וירטואלים
MessageSchema.virtual('timeSinceCreation').get(function() {
  return Math.floor((Date.now() - this.sentAt) / 1000);
});

// מתודות סטטיות
MessageSchema.statics.findByGroup = function(groupId, limit = 50, skip = 0) {
  return this.find({ groupId, isDeleted: false })
    .sort({ sentAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name phone profilePic')
    .populate('replyTo');
};

MessageSchema.statics.findRecentByUser = function(userId, limit = 20) {
  return this.find({ senderId: userId, isDeleted: false })
    .sort({ sentAt: -1 })
    .limit(limit)
    .populate('groupId', 'name whatsappId');
};

// מתודות מסמך
MessageSchema.methods.markAsRead = async function(userId) {
  if (!this.readBy.some(read => read.userId.equals(userId))) {
    this.readBy.push({
      userId,
      readAt: new Date()
    });
    await this.save();
  }
  return this;
};

MessageSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return await this.save();
};

module.exports = mongoose.model('Message', MessageSchema);