// services/notification.js
const admin = require('firebase-admin');
const User = require('../models/User');
const WhatsAppService = require('./whatsapp');
const config = require('../config');

class NotificationService {
  constructor() {
    // אתחול Firebase רק אם יש מידע חשבון שירות תקף
    if (!admin.apps.length && config.firebase.serviceAccount && config.firebase.serviceAccount.project_id) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(config.firebase.serviceAccount),
          databaseURL: config.firebase.databaseURL
        });
        console.log('Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error('Error initializing Firebase admin:', error);
        console.log('Continuing without Firebase notifications');
      }
    } else {
      console.log('Firebase initialization skipped - running in development mode or missing valid service account');
    }
  }

  async notifyAdmins(notification) {
    try {
      // שליחת התראה לכל מנהלי המערכת
      const admins = await User.find({ role: 'admin' });
      
      const promises = admins.map(admin => 
        this.sendNotification(admin._id, notification)
      );
      
      return Promise.all(promises);
    } catch (error) {
      console.error('Error notifying admins:', error);
      throw error;
    }
  }

  async notifyVolunteers(notification) {
    try {
      // שליחת התראה לכל המתנדבים
      const volunteers = await User.find({ role: 'volunteer' });
      
      const promises = volunteers.map(volunteer => 
        this.sendNotification(volunteer._id, notification)
      );
      
      return Promise.all(promises);
    } catch (error) {
      console.error('Error notifying volunteers:', error);
      throw error;
    }
  }

  async notifyVolunteer(notification) {
    try {
      // שליחת התראה למתנדב בודד זמין
      const availableVolunteers = await User.find({ 
        role: 'volunteer',
        isAvailable: true
      });
      
      if (availableVolunteers.length === 0) {
        // אם אין מתנדבים זמינים, שליחה לכל המתנדבים
        return this.notifyVolunteers(notification);
      }
      
      // בחירת מתנדב זמין (ניתן להוסיף לוגיקה מתקדמת יותר לבחירה)
      const selectedVolunteer = availableVolunteers[0];
      
      return this.sendNotification(selectedVolunteer._id, notification);
    } catch (error) {
      console.error('Error notifying volunteer:', error);
      throw error;
    }
  }

  async sendNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // שליחת התראה ב-WhatsApp
      if (user.phoneNumber) {
        try {
          await WhatsAppService.sendMessage(
            user.phoneNumber,
            `*${notification.title}*\n\n${notification.message}`
          );
        } catch (whatsappError) {
          console.error('WhatsApp message error:', whatsappError);
        }
      }
      
      // שליחת התראת Push למכשירים מחוברים
      if (user.deviceTokens && user.deviceTokens.length > 0 && admin.apps.length > 0) {
        const message = {
          notification: {
            title: notification.title,
            body: notification.message
          },
          data: {
            ...notification.data,
            type: notification.priority || 'normal',
            requiresAction: notification.requiresAction ? 'true' : 'false'
          },
          tokens: user.deviceTokens
        };
        
        try {
          await admin.messaging().sendMulticast(message);
        } catch (firebaseError) {
          console.error('Firebase messaging error:', firebaseError);
          // המשך התהליך גם אם שליחת ההתראה נכשלה
        }
      }
      
      // שמירת ההתראה בהיסטוריית ההתראות של המשתמש
      await User.findByIdAndUpdate(userId, {
        $push: {
          notifications: {
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            priority: notification.priority || 'normal',
            requiresAction: notification.requiresAction || false,
            read: false,
            timestamp: new Date()
          }
        }
      });
      
      return {
        success: true,
        userId,
        notificationType: notification.title
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendBulkNotification(userIds, notification) {
    try {
      // שליחת התראה למספר משתמשים
      const promises = userIds.map(userId => 
        this.sendNotification(userId, notification)
      );
      
      return Promise.all(promises);
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  async sendGroupNotification(groupId, notification) {
    try {
      // שליחת התראה לכל חברי הקבוצה
      const Group = require('../models/Group'); // דינמי כדי למנוע בעיות של הפניות מעגליות
      const group = await Group.findById(groupId);
      
      if (!group) {
        throw new Error('Group not found');
      }
      
      const userIds = group.members.map(member => member.userId);
      
      return this.sendBulkNotification(userIds, notification);
    } catch (error) {
      console.error('Error sending group notification:', error);
      throw error;
    }
  }

  async registerDeviceToken(userId, token) {
    try {
      // רישום token של מכשיר להתראות Push
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // בדיקה האם ה-token כבר קיים
      if (!user.deviceTokens) {
        user.deviceTokens = [];
      }
      
      if (!user.deviceTokens.includes(token)) {
        // הוספת ה-token אם הוא לא קיים
        await User.findByIdAndUpdate(userId, {
          $push: { deviceTokens: token }
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  async unregisterDeviceToken(userId, token) {
    try {
      // הסרת token של מכשיר מהתראות Push
      await User.findByIdAndUpdate(userId, {
        $pull: { deviceTokens: token }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error unregistering device token:', error);
      throw error;
    }
  }

  async markNotificationAsRead(userId, notificationId) {
    try {
      // סימון התראה כנקראה
      await User.updateOne(
        { _id: userId, 'notifications._id': notificationId },
        { $set: { 'notifications.$.read': true } }
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, includeRead = false) {
    try {
      // שליפת התראות למשתמש
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      let notifications = user.notifications || [];
      
      if (!includeRead) {
        // סינון התראות שכבר נקראו
        notifications = notifications.filter(notification => !notification.read);
      }
      
      // מיון לפי זמן (חדש לישן)
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();