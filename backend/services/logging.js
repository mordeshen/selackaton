// services/logging.js
const winston = require('winston');
const mongoose = require('mongoose');
const config = require('../config');

// סכמה למסד נתונים
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, required: true },
  category: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
});

// מודל מסד נתונים
const LogModel = mongoose.model('Log', logSchema);

class LoggingService {
  constructor() {
    // הגדרת winston logger
    this.logger = winston.createLogger({
      level: config.logging.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'shichrur-app' },
      transports: [
        // לוגים לקונסול
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // לוגים לקובץ
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log' 
        })
      ]
    });
  }

  async log(category, message, metadata = {}) {
    try {
      // שמירת לוג במסד הנתונים
      const logEntry = new LogModel({
        level: 'info',
        category,
        message,
        metadata,
        userId: metadata.userId,
        groupId: metadata.groupId
      });
      
      await logEntry.save();
      
      // שליחת לוג למערכת הלוגים
      this.logger.info(message, {
        category,
        ...metadata
      });
      
      return logEntry;
    } catch (error) {
      console.error('Error saving log:', error);
      // שליחת לוג שגיאה למערכת הלוגים בלבד, ללא שמירה במסד נתונים
      this.logger.error('Failed to save log entry', {
        category,
        message,
        error: error.message
      });
    }
  }

  async error(category, message, error, metadata = {}) {
    try {
      // שמירת לוג שגיאה במסד הנתונים
      const logEntry = new LogModel({
        level: 'error',
        category,
        message,
        metadata: {
          ...metadata,
          error: error.message,
          stack: error.stack
        },
        userId: metadata.userId,
        groupId: metadata.groupId
      });
      
      await logEntry.save();
      
      // שליחת לוג שגיאה למערכת הלוגים
      this.logger.error(message, {
        category,
        error: error.message,
        stack: error.stack,
        ...metadata
      });
      
      return logEntry;
    } catch (saveError) {
      console.error('Error saving error log:', saveError);
      // שליחת לוג שגיאה למערכת הלוגים בלבד, ללא שמירה במסד נתונים
      this.logger.error('Failed to save error log entry', {
        category,
        message,
        error: error.message,
        saveError: saveError.message
      });
    }
  }

  async warn(category, message, metadata = {}) {
    try {
      // שמירת לוג אזהרה במסד הנתונים
      const logEntry = new LogModel({
        level: 'warn',
        category,
        message,
        metadata,
        userId: metadata.userId,
        groupId: metadata.groupId
      });
      
      await logEntry.save();
      
      // שליחת לוג אזהרה למערכת הלוגים
      this.logger.warn(message, {
        category,
        ...metadata
      });
      
      return logEntry;
    } catch (error) {
      console.error('Error saving warning log:', error);
      // שליחת לוג שגיאה למערכת הלוגים בלבד, ללא שמירה במסד נתונים
      this.logger.error('Failed to save warning log entry', {
        category,
        message,
        error: error.message
      });
    }
  }

  async getLogsByCategory(category, startDate, endDate, limit = 100) {
    try {
      // שליפת לוגים לפי קטגוריה וטווח תאריכים
      const query = { category };
      
      if (startDate || endDate) {
        query.timestamp = {};
        
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }
      
      const logs = await LogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting logs by category:', error);
      throw error;
    }
  }

  async getLogsByUser(userId, startDate, endDate, limit = 100) {
    try {
      // שליפת לוגים לפי משתמש וטווח תאריכים
      const query = { userId };
      
      if (startDate || endDate) {
        query.timestamp = {};
        
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }
      
      const logs = await LogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting logs by user:', error);
      throw error;
    }
  }

  async getLogsByGroup(groupId, startDate, endDate, limit = 100) {
    try {
      // שליפת לוגים לפי קבוצה וטווח תאריכים
      const query = { groupId };
      
      if (startDate || endDate) {
        query.timestamp = {};
        
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }
      
      const logs = await LogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting logs by group:', error);
      throw error;
    }
  }
// services/logging.js (המשך)
async getErrorLogs(startDate, endDate, limit = 100) {
    try {
      // שליפת לוגי שגיאות בלבד לפי טווח תאריכים
      const query = { level: 'error' };
      
      if (startDate || endDate) {
        query.timestamp = {};
        
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }
      
      const logs = await LogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      
      return logs;
    } catch (error) {
      console.error('Error getting error logs:', error);
      throw error;
    }
  }

  async getSystemStats() {
    try {
      // שליפת סטטיסטיקות על לוגים במערכת
      const stats = {
        total: await LogModel.countDocuments(),
        byLevel: {
          info: await LogModel.countDocuments({ level: 'info' }),
          warn: await LogModel.countDocuments({ level: 'warn' }),
          error: await LogModel.countDocuments({ level: 'error' })
        },
        byCategory: {},
        last24Hours: await LogModel.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      };
      
      // שליפת מספר לוגים לפי קטגוריה
      const categories = await LogModel.distinct('category');
      
      for (const category of categories) {
        stats.byCategory[category] = await LogModel.countDocuments({ category });
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  async deleteOldLogs(olderThan) {
    try {
      // מחיקת לוגים ישנים
      const cutoffDate = new Date(Date.now() - olderThan);
      
      const result = await LogModel.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      return {
        success: true,
        deleted: result.deletedCount
      };
    } catch (error) {
      console.error('Error deleting old logs:', error);
      throw error;
    }
  }
}

module.exports = new LoggingService();