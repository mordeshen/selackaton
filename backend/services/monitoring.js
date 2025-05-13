// services/monitoring.js
const Group = require('../models/Group');
const User = require('../models/User');
const NotificationService = require('./notification');
const SecurityService = require('./security');
const LogService = require('./logging');
const TokenBucket = require('../utils/tokenBucket');


class MonitoringService {
  constructor() {
    // הגדרת סף להתראות
    this.thresholds = {
      riskContent: 0.7,       // סף זיהוי תוכן מסוכן
      inactivity: 72,         // שעות ללא פעילות
      lowPositivity: 0.3,     // ציון חיוביות נמוך
      suddenMoodChange: 0.4   // שינוי פתאומי במצב רוח
    };
    
    // סוגי ניטור
    this.monitoringTypes = [
      'contentSafety',
      'groupActivity',
      'userEngagement',
      'moodTracking'
    ];

     // הגבלת קצב לפעולות ניטור
     this.analyzeBucket = new TokenBucket({
      capacity: 50,      // ניתוח של 50 קבוצות במקביל מקסימום
      fillRate: 5,       // תוספת של 5 ניתוחים כל שנייה
      fillInterval: 1000
    });
    
    // הגבלת קצב התראות לכל קבוצה
    this.groupAlertBuckets = new Map();
  }

  async monitorAll() {
    // הפעלת כל סוגי הניטור
    try {
      await this.monitorContentSafety();
      await this.monitorGroupActivity();
      await this.monitorUserEngagement();
      await this.monitorMoodChanges();
      
      LogService.log('monitoring', 'All monitoring processes completed successfully');
    } catch (error) {
      console.error('Error in monitoring processes:', error);
      LogService.error('monitoring', 'Failed to complete monitoring processes', error);
    }
  }

  async monitorContentSafety() {
    try {
      // בדיקת תוכן הודעות אחרונות בכל הקבוצות
      const recentMessages = await this.getRecentMessages(24); // הודעות מ-24 שעות אחרונות
      
      const flaggedMessages = [];
      
      for (const message of recentMessages) {
        // סריקת תוכן ההודעה
        const scanResult = await SecurityService.scanMessageContent(message.text);
        
        if (scanResult.hasSensitiveContent && scanResult.riskLevel === 'high') {
          flaggedMessages.push({
            message,
            scanResult
          });
          
          // יצירת התראה
          await this.createAlert({
            type: 'content_safety',
            level: 'high',
            title: 'זוהה תוכן רגיש',
            description: `תוכן רגיש זוהה בקבוצה "${message.groupName}"`,
            details: {
              messageId: message._id,
              groupId: message.groupId,
              senderId: message.senderId,
              riskLevel: scanResult.riskLevel,
              reason: scanResult.reason
            }
          });
          
          // התראה למתנדבים במקרה של תוכן מסוכן ברמה גבוהה
          if (scanResult.riskLevel === 'high') {
            await NotificationService.notifyVolunteers({
              title: 'התראת תוכן מסוכן',
              message: `זוהה תוכן מסוכן בקבוצה "${message.groupName}"`,
              data: {
                groupId: message.groupId,
                messageId: message._id
              },
              priority: 'high'
            });
          }
        }
      }
      
      return {
        processed: recentMessages.length,
        flagged: flaggedMessages.length,
        details: flaggedMessages
      };
    } catch (error) {
      console.error('Error monitoring content safety:', error);
      LogService.error('monitoring', 'Failed to monitor content safety', error);
      throw error;
    }
  }


// services/monitoring.js (המשך)
async monitorGroupActivity() {
    try {
      // בדיקת רמת פעילות בקבוצות
      const groups = await Group.find({});
      const inactiveGroups = [];
      const now = new Date();
      
      for (const group of groups) {
        const lastActivity = group.metrics.lastMessage || group.createdAt;
        const hoursSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60);
        
        // זיהוי קבוצות לא פעילות
        if (hoursSinceLastActivity > this.thresholds.inactivity) {
          inactiveGroups.push({
            groupId: group._id,
            groupName: group.name,
            hoursSinceLastActivity,
            memberCount: group.members.length
          });
          
          // יצירת התראה רק אם יש מספיק חברים בקבוצה
          if (group.members.length >= 3) {
            await this.createAlert({
              type: 'group_inactivity',
              level: 'medium',
              title: 'קבוצה לא פעילה',
              description: `הקבוצה "${group.name}" לא הייתה פעילה במשך ${Math.floor(hoursSinceLastActivity)} שעות`,
              details: {
                groupId: group._id,
                lastActivity,
                memberCount: group.members.length
              }
            });
            
            // ניסיון להחייאת הקבוצה
            await this.triggerGroupReactivation(group._id);
          }
        }
      }
      
      return {
        processed: groups.length,
        inactive: inactiveGroups.length,
        details: inactiveGroups
      };
    } catch (error) {
      console.error('Error monitoring group activity:', error);
      LogService.error('monitoring', 'Failed to monitor group activity', error);
      throw error;
    }
  }

  async monitorUserEngagement() {
    try {
      // ניטור מעורבות משתמשים
      const users = await User.find({ lastActive: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
      const disengagedUsers = [];
      
      for (const user of users) {
        // בדיקה האם המשתמש חבר בקבוצות פעילות
        const userGroups = await Group.find({ 'members.userId': user._id });
        
        if (userGroups.length > 0) {
          disengagedUsers.push({
            userId: user._id,
            phoneNumber: user.phoneNumber,
            daysSinceLastActivity: Math.floor((Date.now() - user.lastActive) / (1000 * 60 * 60 * 24)),
            groupCount: userGroups.length
          });
          
          // יצירת התראה על משתמש לא פעיל
          await this.createAlert({
            type: 'user_disengagement',
            level: 'low',
            title: 'משתמש לא פעיל',
            description: `המשתמש לא היה פעיל במשך ${Math.floor((Date.now() - user.lastActive) / (1000 * 60 * 60 * 24))} ימים`,
            details: {
              userId: user._id,
              lastActive: user.lastActive,
              groupIds: userGroups.map(g => g._id)
            }
          });
          
          // שליחת הודעת מעורבות למשתמש
          await this.sendReengagementMessage(user._id);
        }
      }
      
      return {
        processed: users.length,
        disengaged: disengagedUsers.length,
        details: disengagedUsers
      };
    } catch (error) {
      console.error('Error monitoring user engagement:', error);
      LogService.error('monitoring', 'Failed to monitor user engagement', error);
      throw error;
    }
  }

  async monitorMoodChanges() {
    try {
      // ניטור שינויים במצב רוח של משתמשים
      const users = await User.find({});
      const moodChanges = [];
      
      for (const user of users) {
        if (!user.moodTracking || user.moodTracking.length < 2) {
          continue; // אין מספיק נתונים למעקב
        }
        
        // בדיקת השינוי במצב הרוח
        const latestMoods = user.moodTracking.slice(-2);
        const moodDifference = Math.abs(latestMoods[1].score - latestMoods[0].score);
        
        if (moodDifference > this.thresholds.suddenMoodChange) {
          const isMoodWorse = latestMoods[1].score < latestMoods[0].score;
          
          moodChanges.push({
            userId: user._id,
            moodDifference,
            direction: isMoodWorse ? 'negative' : 'positive',
            latestMood: latestMoods[1].score
          });
          
          // יצירת התראה על שינוי במצב רוח
          if (isMoodWorse && latestMoods[1].score < 0.4) {
            await this.createAlert({
              type: 'mood_decline',
              level: isMoodWorse && latestMoods[1].score < 0.3 ? 'high' : 'medium',
              title: 'ירידה במצב רוח',
              description: `זוהתה ירידה משמעותית במצב הרוח של המשתמש`,
              details: {
                userId: user._id,
                previousMood: latestMoods[0],
                currentMood: latestMoods[1],
                moodDifference
              }
            });
            
            // התערבות במקרה של ירידה חדה
            if (isMoodWorse && latestMoods[1].score < 0.3) {
              await this.triggerUserWellbeingIntervention(user._id);
            }
          }
        }
      }
      
      return {
        processed: users.length,
        moodChanges: moodChanges.length,
        details: moodChanges
      };
    } catch (error) {
      console.error('Error monitoring mood changes:', error);
      LogService.error('monitoring', 'Failed to monitor mood changes', error);
      throw error;
    }
  }

  async createAlert(alertData) {
    try {
      // יצירת התראה במערכת
      const alert = new Alert({
        type: alertData.type,
        level: alertData.level,
        title: alertData.title,
        description: alertData.description,
        details: alertData.details,
        status: 'new',
        created: new Date()
      });
      
      await alert.save();
      
      // שליחת התראה למשתמשים רלוונטיים לפי רמת ההתראה
      if (alertData.level === 'high') {
        await NotificationService.notifyAdmins({
          title: `התראה דחופה: ${alertData.title}`,
          message: alertData.description,
          data: { alertId: alert._id },
          priority: 'high'
        });
      } else if (alertData.level === 'medium') {
        await NotificationService.notifyVolunteers({
          title: `התראה: ${alertData.title}`,
          message: alertData.description,
          data: { alertId: alert._id },
          priority: 'medium'
        });
      }
      
      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      LogService.error('monitoring', 'Failed to create alert', error);
      throw error;
    }
  }

  async triggerGroupReactivation(groupId) {
    try {
      // הפעלת תהליך החייאת קבוצה
      const group = await Group.findById(groupId).populate('members.userId');
      
      if (!group) {
        throw new Error('Group not found');
      }
      
      // בדיקת תחומי עניין של הקבוצה
      const groupInterests = group.characteristics.get('interests') || [];
      
      // מציאת פעילות מתאימה להצעה
      const suggestedActivity = await EventService.findRelevantEvent(groupId, groupInterests);
      
      // יצירת הודעה לקבוצה
      let message;
      
      if (suggestedActivity) {
        message = `היי חברים! ראיתי שלא הייתה פעילות בקבוצה זמן מה. אולי תהיו מעוניינים באירוע הזה:\n\n*${suggestedActivity.title}*\n${suggestedActivity.description}\n\nמתי: ${suggestedActivity.formattedDate}\nאיפה: ${suggestedActivity.location}\n\nמי מעוניין להצטרף? 😊`;
      } else {
        // יצירת הצעה כללית
        message = `היי חברים! ראיתי שלא הייתה פעילות בקבוצה בזמן האחרון. מה שלומכם? יש לכם רעיונות לפעילות משותפת שהייתם רוצים לעשות ביחד?`;
      }
      
      // שליחת ההודעה לקבוצה
      await WhatsAppService.sendGroupMessage(group.whatsappId, message);
      
      // רישום הפעולה
      LogService.log('groupReactivation', `Sent reactivation message to group ${group.name}`);
      
      return {
        success: true,
        groupId: group._id,
        message
      };
    } catch (error) {
      console.error('Error triggering group reactivation:', error);
      LogService.error('monitoring', 'Failed to trigger group reactivation', error);
      throw error;
    }
  }

  async sendReengagementMessage(userId) {
    try {
      // שליחת הודעת מעורבות למשתמש לא פעיל
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // בדיקת הקבוצות של המשתמש
      const userGroups = await Group.find({ 'members.userId': user._id });
      
      // בניית הודעה מותאמת אישית
      let message;
      
      if (userGroups.length > 0) {
        const mostActiveGroup = userGroups.sort((a, b) => 
          b.metrics.activityLevel - a.metrics.activityLevel
        )[0];
        
        message = `היי ${user.name}! לא ראינו אותך לאחרונה בקבוצות שלנו. קבוצת "${mostActiveGroup.name}" פעילה מאוד בימים אלה, ואנחנו בטוחים שחברי הקבוצה ישמחו לשמוע ממך. יש לך דקה לחזור ולהתחבר? 😊`;
      } else {
        message = `היי ${user.name}! לא ראינו אותך לאחרונה. איך אתה מרגיש? אשמח לשמוע ממך ולעזור לך למצוא קבוצה או פעילות שתתאים לך. 😊`;
      }
      
      // שליחת ההודעה למשתמש
      await WhatsAppService.sendMessage(user.phoneNumber, message);
      
      // רישום הפעולה
      LogService.log('userReengagement', `Sent reengagement message to user ${user.name}`);
      
      return {
        success: true,
        userId: user._id,
        message
      };
    } catch (error) {
      console.error('Error sending reengagement message:', error);
      LogService.error('monitoring', 'Failed to send reengagement message', error);
      throw error;
    }
  }

  async triggerUserWellbeingIntervention(userId) {
    try {
      // התערבות במקרה של ירידה חדה במצב רוח
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // שליחת הודעה אישית למשתמש
      const message = `היי ${user.name}, שמתי לב שאולי אתה עובר תקופה לא פשוטה לאחרונה. אני כאן בשבילך אם תרצה לשתף או לדבר. האם אתה מרגיש שהיית רוצה לשוחח עם מישהו?`;
      
      await WhatsAppService.sendMessage(user.phoneNumber, message);
      
      // יידוע מתנדב אנושי
      await NotificationService.notifyVolunteer({
        title: 'התערבות רווחה נפשית',
        message: `המשתמש ${user.name} מראה סימנים של מצוקה. נשלחה הודעת תמיכה ראשונית.`,
        data: { userId: user._id },
        priority: 'high',
        requiresAction: true
      });
      
      // רישום הפעולה
      LogService.log('wellbeingIntervention', `Initiated wellbeing intervention for user ${user.name}`);
      
      return {
        success: true,
        userId: user._id,
        message
      };
    } catch (error) {
      console.error('Error triggering wellbeing intervention:', error);
      LogService.error('monitoring', 'Failed to trigger wellbeing intervention', error);
      throw error;
    }
  }

   /**
   * ניטור הודעות קבוצת WhatsApp עם בקרת קצב
   */
   async monitorGroupMessages(groupId, timeWindow = 60) {
    try {
      // בדיקת מגבלת ניתוח כללית
      if (!this.analyzeBucket.consume(1)) {
        const retryTime = this.analyzeBucket.getRefillTimeMs(1);
        logger.warn(`Rate limit exceeded for analysis. Try again in ${retryTime}ms`);
        return {
          success: false,
          rateLimitExceeded: true,
          retryAfter: Math.ceil(retryTime / 1000) // המרה לשניות
        };
      }
      
      // בדיקת מגבלת התראות לקבוצה ספציפית
      if (!this.groupAlertBuckets.has(groupId)) {
        this.groupAlertBuckets.set(groupId, new TokenBucket({
          capacity: 5,       // מקסימום 5 התראות בו-זמנית לקבוצה
          fillRate: 0.05,    // אסימון חדש כל 20 שניות (0.05 * 1000ms)
          fillInterval: 1000
        }));
      }
      
      // הקוד הקיים...
      // בסוף הקוד, לפני החזרת התוצאות:
      
      // אם נמצאו התראות, צורך אסימונים מהדלי
      if (alerts && alerts.length > 0) {
        const groupBucket = this.groupAlertBuckets.get(groupId);
        if (!groupBucket.consume(alerts.length)) {
          // אם חרגנו מהמגבלה, נחזיר רק התראות קריטיות
          const criticalAlerts = alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical');
          
          return {
            success: true,
            alerts: criticalAlerts,
            limited: true,
            message: 'רק התראות חשובות מוצגות בשל חריגה ממגבלת קצב',
            groupId,
            timeWindow
          };
        }
      }
      
      // המשך הקוד הקיים...
      
    } catch (error) {
      logger.error('Error monitoring group messages', error);
      throw error;
    }
  }


  async getRecentMessages(hours) {
    // שליפת הודעות אחרונות מכל הקבוצות
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const groups = await Group.find({});
      const allMessages = [];
      
      for (const group of groups) {
        const messages = await WhatsAppService.getGroupMessages(
          group.whatsappId, 
          cutoffTime
        );
        
        // הוספת פרטי קבוצה להודעות
        const messagesWithGroup = messages.map(msg => ({
          ...msg,
          groupId: group._id,
          groupName: group.name
        }));
        
        allMessages.push(...messagesWithGroup);
      }
      
      return allMessages;
    } catch (error) {
      console.error('Error getting recent messages:', error);
      throw error;
    }
  }

  
}

module.exports = new MonitoringService();