/**
 * GroupFacilitatorService.js
 * 
 * שירות זה מנהל את היבט הנחיית הקבוצות בפרויקט "שחרור". הוא אחראי על:
 * - ניתוח והגבה להודעות בקבוצות WhatsApp
 * - זיהוי דפוסי שיחה וצרכים של המשתתפים
 * - תמיכה בדיונים ויצירת אווירה בטוחה בקבוצה
 * - התערבות במצבי מצוקה או קונפליקט
 * - עידוד אינטראקציה ותמיכה בין חברי הקבוצה
 * - הצעת פעילויות ונושאי שיחה
 */

const mongoose = require('mongoose');
const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const Alert = require('../models/Alert');
const Event = require('../models/Event');

const aiService = require('./ai');
const whatsappService = require('./whatsapp');
const monitoringService = require('./monitoring');
const notificationService = require('./notification');
const loggingService = require('./logging');
const securityService = require('./security');
const eventCrawlerService = require('./eventCrawler');

class GroupFacilitatorService {
  constructor() {
    // מפה לשמירת שיחות פעילות - מפתח הוא ID של קבוצה, ערך הוא אובייקט המייצג את מצב השיחה
    this.activeConversations = new Map();
    
    // סף לאינטראקציה אוטומטית - כמה הודעות יכולות לעבור ללא התערבות המנחה
    this.interactionThreshold = 3;
    
    // מפה לשמירת נושאי דיון אחרונים בכל קבוצה
    this.recentTopics = new Map();
    
    // טיימרים לפעילויות מתוזמנות בקבוצות
    this.groupTimers = new Map();
    
    // דפוסי התערבות מוגדרים מראש
    this.interventionPatterns = {
      support: [
        'שאלה פתוחה לקבוצה',
        'סיכום נקודות מרכזיות בדיון',
        'הזמנה לשיתוף אישי',
        'חיזוק חיובי למשתתף שחלק',
        'הצעת נקודת מבט אלטרנטיבית',
        'הפניה למשאבים רלוונטיים'
      ],
      activity: [
        'הצעת פעילות קבוצתית',
        'תזכורת לגבי אירוע מתוכנן',
        'משוב על פעילות קודמת',
        'בקשת רעיונות לפעילויות עתידיות'
      ],
      crisis: [
        'התייחסות מיידית להודעת מצוקה',
        'הפניה לגורמי סיוע מקצועיים',
        'מעבר לשיחה פרטית עם המשתתף',
        'הזמנת תמיכה מחברי הקבוצה'
      ]
    };
    
    // מילות מפתח לזיהוי מצבי מצוקה
    this.distressKeywords = [
      'עזרה', 'פחד', 'אלימות', 'סכנה', 'מפחיד', 'מאיים',
      'לא יודעת מה לעשות', 'אני בבעיה', 'משטרה', 'תקיפה',
      'פגיעה', 'איום', 'חרדה', 'לחץ', 'דיכאון', 'אובדני'
    ];
    
    // דפוסי תגובה אוטומטיים למצבי מצוקה
    this.emergencyResponses = {
      immediate: [
        'אני רואה שאת/ה מביע/ה מצוקה. האם את/ה במקום בטוח כרגע?',
        'אני כאן איתך. מה אני יכול/ה לעשות כדי לעזור?',
        'רוצה שנעבור לשיחה פרטית?'
      ],
      resources: [
        'קו החירום לנפגעות ונפגעי אלימות במשפחה: 1202/1',
        'משטרת ישראל: 100',
        'מוקד רווחה עירוני: 106'
      ]
    };
    
    this.initScheduledTasks();
  }

  /**
   * אתחול משימות מתוזמנות של המנחה בכל הקבוצות
   */
  async initScheduledTasks() {
    try {
      // שליפת כל הקבוצות הפעילות
      const groups = await Group.find({ active: true });
      
      for (const group of groups) {
        // הגדרת משימות מחזוריות עבור כל קבוצה
        this.scheduleGroupTasks(group._id);
      }
      
      // הגדרת משימה יומית לסריקת אירועים חדשים
      this.scheduleDailyEventScan();
      
      loggingService.log('info', 'GroupFacilitator scheduled tasks initialized', { groupCount: groups.length });
    } catch (error) {
      loggingService.log('error', 'Failed to initialize scheduled tasks', { error: error.message });
    }
  }

  /**
   * הגדרת משימות מתוזמנות עבור קבוצה ספציפית
   * @param {String} groupId - מזהה הקבוצה
   */
  scheduleGroupTasks(groupId) {
    // מניעת כפילות טיימרים
    if (this.groupTimers.has(groupId)) {
      clearInterval(this.groupTimers.get(groupId));
    }
    
    // הגדרת טיימר לפעילויות מחזוריות
    const timer = setInterval(async () => {
      try {
        await this.performScheduledInteraction(groupId);
      } catch (error) {
        loggingService.log('error', 'Error in scheduled interaction', { groupId, error: error.message });
      }
    }, 12 * 60 * 60 * 1000); // אחת ל-12 שעות
    
    this.groupTimers.set(groupId, timer);
  }

  /**
   * הגדרת סריקה יומית לאירועים ופעילויות חדשות
   */
  scheduleDailyEventScan() {
    // הגדרת משימה יומית בשעה 4 בבוקר
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // מחר
      4, 0, 0 // 04:00:00
    );
    
    const timeToNextScan = scheduledTime.getTime() - now.getTime();
    
    setTimeout(async () => {
      try {
        await this.scanAndDistributeEvents();
        // הגדרה מחדש לאחר ביצוע המשימה
        this.scheduleDailyEventScan();
      } catch (error) {
        loggingService.log('error', 'Error in daily event scan', { error: error.message });
        // הגדרה מחדש גם במקרה של שגיאה
        this.scheduleDailyEventScan();
      }
    }, timeToNextScan);
  }

  /**
   * סריקת אירועים חדשים והפצתם לקבוצות רלוונטיות
   */
  async scanAndDistributeEvents() {
    try {
      // קבלת אירועים חדשים באמצעות שירות איסוף האירועים
      const newEvents = await eventCrawlerService.fetchNewEvents();
      
      if (newEvents.length === 0) {
        return;
      }
      
      // שליפת כל הקבוצות הפעילות
      const groups = await Group.find({ active: true });
      
      for (const group of groups) {
        // סינון אירועים רלוונטיים לקבוצה
        const relevantEvents = this.filterRelevantEvents(newEvents, group);
        
        if (relevantEvents.length > 0) {
          // הכנת הודעה עם האירועים הרלוונטיים
          const message = this.formatEventsMessage(relevantEvents);
          
          // שליחת ההודעה לקבוצה
          await whatsappService.sendGroupMessage(group.whatsappId, message);
          
          // תיעוד האירוע
          loggingService.log('info', 'Events distributed to group', { 
            groupId: group._id, 
            groupName: group.name,
            eventCount: relevantEvents.length 
          });
        }
      }
    } catch (error) {
      loggingService.log('error', 'Failed to scan and distribute events', { error: error.message });
    }
  }

  /**
   * סינון אירועים רלוונטיים לקבוצה ספציפית
   * @param {Array} events - רשימת אירועים
   * @param {Object} group - אובייקט הקבוצה
   * @returns {Array} אירועים רלוונטיים
   */
  filterRelevantEvents(events, group) {
    // אם הקבוצה היא קבוצת פעילויות, כל האירועים רלוונטיים
    if (group.type === 'activity') {
      return events;
    }
    
    // בסיסי - אפשר להרחיב בהמשך עם לוגיקה מתקדמת יותר
    return events.filter(event => {
      // התאמה לפי מיקום
      if (group.location && event.location) {
        return event.location.includes(group.location);
      }
      
      // התאמה לפי תגיות עניין
      if (group.interestTags && event.tags) {
        return group.interestTags.some(tag => event.tags.includes(tag));
      }
      
      return false;
    });
  }

  /**
   * פורמט הודעה עם רשימת אירועים
   * @param {Array} events - רשימת אירועים
   * @returns {String} הודעה מפורמטת
   */
  formatEventsMessage(events) {
    let message = '🌟 *אירועים ופעילויות חדשים* 🌟\n\n';
    
    events.forEach((event, index) => {
      message += `*${index + 1}. ${event.title}*\n`;
      message += `📅 תאריך: ${event.date}\n`;
      message += `🕒 שעה: ${event.time}\n`;
      message += `📍 מיקום: ${event.location}\n`;
      
      if (event.description) {
        message += `📝 ${event.description}\n`;
      }
      
      if (event.link) {
        message += `🔗 קישור: ${event.link}\n`;
      }
      
      message += '\n';
    });
    
    message += 'למידע נוסף או לשיתוף אירועים נוספים, אשמח לסייע! 🤗';
    
    return message;
  }

  /**
   * ביצוע אינטראקציה מתוזמנת בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   */
  async performScheduledInteraction(groupId) {
    try {
      const group = await Group.findById(groupId);
      if (!group || !group.active) {
        return;
      }
      
      // בדיקת פעילות אחרונה בקבוצה
      const lastActivity = await this.getGroupLastActivity(groupId);
      const now = new Date();
      const hoursSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60);
      
      // רק אם עברו לפחות 6 שעות מהפעילות האחרונה
      if (hoursSinceLastActivity >= 6) {
        // בחירת סוג האינטראקציה בהתאם לסוג הקבוצה
        let interactionType;
        let content;
        
        switch (group.type) {
          case 'support':
            interactionType = 'supportPrompt';
            content = await this.generateSupportPrompt(group);
            break;
          case 'activity':
            interactionType = 'activitySuggestion';
            content = await this.generateActivitySuggestion(group);
            break;
          case 'interest':
            interactionType = 'interestDiscussion';
            content = await this.generateInterestTopic(group);
            break;
          case 'location':
            interactionType = 'localEvent';
            content = await this.generateLocalEventReminder(group);
            break;
          default:
            interactionType = 'generalPrompt';
            content = 'מה שלומכם? מקווה שאתם נהנים מהקבוצה. מישהו רוצה לשתף איך עבר עליו היום?';
        }
        
        // שליחת ההודעה לקבוצה
        await whatsappService.sendGroupMessage(group.whatsappId, content);
        
        // תיעוד האינטראקציה
        loggingService.log('info', 'Scheduled interaction sent', { 
          groupId: group._id,
          groupName: group.name,
          interactionType 
        });
        
        // עדכון זמן האינטראקציה האחרונה
        await Group.findByIdAndUpdate(groupId, { 
          $set: { lastFacilitatorInteraction: new Date() } 
        });
      }
    } catch (error) {
      loggingService.log('error', 'Failed to perform scheduled interaction', { 
        groupId, 
        error: error.message 
      });
    }
  }

  /**
   * קבלת זמן פעילות אחרון בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @returns {Date} תאריך הפעילות האחרונה
   */
  async getGroupLastActivity(groupId) {
    try {
      // בדיקת הודעה אחרונה בקבוצה
      const lastMessage = await Message.findOne({ groupId })
        .sort({ timestamp: -1 })
        .limit(1);
      
      // בדיקת זמן אינטראקציה אחרון של המנחה
      const group = await Group.findById(groupId);
      const lastFacilitatorInteraction = group.lastFacilitatorInteraction || new Date(0);
      
      // החזרת הזמן המאוחר יותר
      if (lastMessage && lastMessage.timestamp) {
        return new Date(Math.max(lastMessage.timestamp, lastFacilitatorInteraction));
      }
      
      return lastFacilitatorInteraction;
    } catch (error) {
      loggingService.log('error', 'Error getting group last activity', { 
        groupId, 
        error: error.message 
      });
      return new Date(0); // ברירת מחדל - תאריך ישן מאוד
    }
  }

  /**
   * יצירת נושא תמיכה לקבוצת תמיכה
   * @param {Object} group - אובייקט הקבוצה
   * @returns {String} הודעה לשליחה
   */
  async generateSupportPrompt(group) {
    try {
      // בדיקת נושאים אחרונים כדי למנוע חזרות
      const recentTopics = this.recentTopics.get(group._id) || [];
      
      // קבלת נושא תמיכה מותאם באמצעות AI
      const prompt = `צור נושא לדיון בקבוצת תמיכה למניעת אלימות במשפחה. הקבוצה היא ${group.name} והיא מתמקדת ב${group.description || 'תמיכה כללית'}. הנושאים האחרונים שהועלו הם: ${recentTopics.join(', ')}. צור נושא חדש שיעודד שיתוף ותמיכה הדדית.`;
      
      const topicSuggestion = await aiService.getCompletion(prompt);
      
      // עדכון מאגר הנושאים האחרונים
      if (recentTopics.length >= 5) {
        recentTopics.shift(); // הסרת הנושא הישן ביותר
      }
      recentTopics.push(topicSuggestion.substring(0, 30) + '...'); // שמירת תקציר הנושא החדש
      this.recentTopics.set(group._id, recentTopics);
      
      return topicSuggestion;
    } catch (error) {
      loggingService.log('error', 'Error generating support prompt', { 
        groupId: group._id, 
        error: error.message 
      });
      
      // במקרה של שגיאה, החזרת הודעת ברירת מחדל
      return 'שלום לכולם! מה שלומכם היום? אשמח אם תשתפו בחוויה חיובית אחת שחוויתם השבוע או משהו שאתם מצפים לו.';
    }
  }

  /**
   * יצירת הצעת פעילות לקבוצת פעילויות
   * @param {Object} group - אובייקט הקבוצה
   * @returns {String} הודעה לשליחה
   */
  async generateActivitySuggestion(group) {
    try {
      // בדיקה אם יש אירועים מתוכננים בימים הקרובים
      const upcomingEvents = await Event.find({
        date: { $gte: new Date() },
        $or: [
          { relevantGroups: group._id },
          { location: group.location }
        ]
      }).sort({ date: 1 }).limit(3);
      
      if (upcomingEvents.length > 0) {
        // אם יש אירועים מתוכננים, יצירת תזכורת לגביהם
        return this.formatUpcomingEventsMessage(upcomingEvents);
      }
      
      // אם אין אירועים מתוכננים, יצירת הצעת פעילות חדשה
      const prompt = `הצע פעילות קבוצתית מהנה עבור קבוצה בשם "${group.name}" שמתמקדת ב${group.description || 'פעילויות חברתיות'}. הפעילות צריכה להיות מתאימה לאנשים שחווים או חוו אלימות במשפחה ותורמת לבניית ביטחון עצמי וקשרים חברתיים.`;
      
      const activitySuggestion = await aiService.getCompletion(prompt);
      
      return activitySuggestion;
    } catch (error) {
      loggingService.log('error', 'Error generating activity suggestion', { 
        groupId: group._id, 
        error: error.message 
      });
      
      // במקרה של שגיאה, החזרת הודעת ברירת מחדל
      return 'שלום לכולם! מה דעתכם על מפגש משותף בפארק הקרוב לפיקניק? זו הזדמנות נהדרת להכיר אחד את השני בסביבה נעימה ולהנות מהאוויר הפתוח. מי מעוניין להצטרף?';
    }
  }

  /**
   * יצירת נושא לדיון בקבוצת עניין
   * @param {Object} group - אובייקט הקבוצה
   * @returns {String} הודעה לשליחה
   */
  async generateInterestTopic(group) {
    try {
      const interestTags = group.interestTags || [];
      
      const prompt = `צור נושא לדיון בקבוצת עניין שמתמקדת ב${interestTags.join(', ')}. הקבוצה היא "${group.name}" והיא מורכבת מאנשים שמתמודדים או התמודדו עם אלימות במשפחה. הנושא צריך לעודד שיתוף חיובי ולהתמקד בתחומי העניין של הקבוצה ולא בטראומה.`;
      
      const topicSuggestion = await aiService.getCompletion(prompt);
      
      return topicSuggestion;
    } catch (error) {
      loggingService.log('error', 'Error generating interest topic', { 
        groupId: group._id, 
        error: error.message 
      });
      
      // במקרה של שגיאה, החזרת הודעת ברירת מחדל
      return 'שלום לכולם! יש לכם המלצות על ספרים/סרטים/פודקאסטים מעניינים שנהניתם מהם לאחרונה? אשמח לשמוע את ההמלצות שלכם ולהרחיב את האופקים!';
    }
  }

  /**
   * יצירת תזכורת לאירוע מקומי בקבוצת מיקום
   * @param {Object} group - אובייקט הקבוצה
   * @returns {String} הודעה לשליחה
   */
  async generateLocalEventReminder(group) {
    try {
      const location = group.location || '';
      
      // חיפוש אירועים באזור הרלוונטי
      const localEvents = await Event.find({
        location: { $regex: location, $options: 'i' },
        date: { $gte: new Date() }
      }).sort({ date: 1 }).limit(3);
      
      if (localEvents.length > 0) {
        return this.formatUpcomingEventsMessage(localEvents);
      }
      
      // אם אין אירועים, יצירת הודעה כללית על האזור
      const prompt = `כתוב הודעה קצרה לקבוצה שמתמקדת באזור ${location}. ההודעה צריכה להזכיר מקומות מעניינים באזור או לעודד שיתוף של חוויות מקומיות. הקבוצה מורכבת מאנשים שמתמודדים או התמודדו עם אלימות במשפחה.`;
      
      const message = await aiService.getCompletion(prompt);
      
      return message;
    } catch (error) {
      loggingService.log('error', 'Error generating local event reminder', { 
        groupId: group._id, 
        error: error.message 
      });
      
      // במקרה של שגיאה, החזרת הודעת ברירת מחדל
      const location = group.location || 'האזור שלנו';
      return `שלום לכולם! יש מקומות מעניינים ב${location} שאתם ממליצים לבקר בהם? מסעדות טובות, פארקים, מוזיאונים או כל דבר אחר שמתאים לבילוי בימים אלה?`;
    }
  }

  /**
   * פורמט הודעה עם רשימת אירועים קרובים
   * @param {Array} events - רשימת אירועים
   * @returns {String} הודעה מפורמטת
   */
  formatUpcomingEventsMessage(events) {
    let message = '🗓️ *אירועים קרובים* 🗓️\n\n';
    
    events.forEach((event, index) => {
      // פורמט תאריך ידידותי למשתמש
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('he-IL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      message += `*${index + 1}. ${event.title}*\n`;
      message += `📅 תאריך: ${formattedDate}\n`;
      message += `🕒 שעה: ${event.time || 'לא צוין'}\n`;
      message += `📍 מיקום: ${event.location}\n`;
      
      if (event.description) {
        message += `📝 ${event.description}\n`;
      }
      
      if (event.link) {
        message += `🔗 קישור: ${event.link}\n`;
      }
      
      message += '\n';
    });
    
    message += 'האם מישהו מעוניין להצטרף לאחד האירועים? או אולי יש לכם רעיונות לפעילויות נוספות? 😊';
    
    return message;
  }

  /**
   * עיבוד הודעה שהתקבלה בקבוצה
   * @param {String} groupId - מזהה הקבוצה ב-WhatsApp
   * @param {Object} message - אובייקט ההודעה
   * @returns {Promise<void>}
   */
  async processGroupMessage(groupId, message) {
    try {
      // שליפת נתוני הקבוצה והמשתמש
      const group = await Group.findOne({ whatsappId: groupId }).populate('members.userId');
      if (!group) {
        throw new Error('Group not found');
      }
      
      // חיפוש המשתמש השולח בקבוצה
      const user = await User.findOne({ whatsappId: message.sender });
      if (!user) {
        loggingService.log('warning', 'Unknown user sent message to group', { 
          groupId: group._id,
          whatsappGroupId: groupId,
          senderWhatsappId: message.sender
        });
        // במקרה של משתמש לא רשום, אפשר להוסיף אותו למערכת בשלב מאוחר יותר
      }
      
      // שמירת ההודעה במסד הנתונים
      const msgDoc = new Message({
        groupId: group._id,
        senderId: user ? user._id : null,
        senderWhatsappId: message.sender,
        content: message.text,
        timestamp: new Date(),
        metadata: {
          type: message.type || 'text',
          mediaUrl: message.mediaUrl || null
        }
      });
      await msgDoc.save();
      
      // עדכון ניקוד פעילות המשתמש בקבוצה
      if (user) {
        await this.updateUserActivityScore(group._id, user._id);
      }
      
      // בדיקת מצוקה בהודעה
      const distressLevel = await this.checkMessageForDistress(message.text);
      if (distressLevel >= 0.7) { // 0.7 הוא סף לזיהוי מצוקה משמעותית
        await this.handleDistressMessage(group, user || { whatsappId: message.sender }, message, distressLevel);
      }
      
      // עדכון מצב השיחה בקבוצה ובדיקת הצורך בהתערבות
      await this.updateConversationState(group._id, message);
      
      // בדיקה אם נדרשת התערבות של המנחה
      const shouldIntervene = await this.shouldFacilitatorIntervene(group._id);
      if (shouldIntervene) {
        await this.generateAndSendIntervention(group, message);
      }
    } catch (error) {
      loggingService.log('error', 'Error processing group message', { 
        groupId,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * עדכון מצב השיחה בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @param {Object} message - הודעה שהתקבלה
   * @returns {Promise<void>}
   */
  async updateConversationState(groupId, message) {
    // בדיקה אם קיים מצב שיחה קיים לקבוצה
    if (!this.activeConversations.has(groupId)) {
      // יצירת מצב שיחה חדש
      this.activeConversations.set(groupId, {
        messageCount: 0,
        lastMessageTime: new Date(),
        participants: new Set(),
        recentMessages: [],
        detectedTopics: [],
        sentimentScore: 0,
        consecutiveNegativeMessages: 0,
        lastFacilitatorIntervention: null
      });
    }
    
    const conversation = this.activeConversations.get(groupId);
    
    // עדכון מצב השיחה
    conversation.messageCount++;
    conversation.lastMessageTime = new Date();
    conversation.participants.add(message.sender);
    
    // שמירת הודעות אחרונות (עד 10)
    conversation.recentMessages.push({
      sender: message.sender,
      text: message.text,
      timestamp: new Date()
    });
    
    if (conversation.recentMessages.length > 10) {
      conversation.recentMessages.shift(); // הסרת ההודעה הישנה ביותר
    }
    
    // ניתוח רגשות בהודעה
    try {
      const sentiment = await aiService.analyzeSentiment(message.text);
      conversation.sentimentScore = (conversation.sentimentScore * 0.7) + (sentiment * 0.3); // עדכון ממוצע נע
      
      // מעקב אחר רצף הודעות שליליות
      if (sentiment < -0.3) {
        conversation.consecutiveNegativeMessages++;
      } else {
        conversation.consecutiveNegativeMessages = 0;
      }
    } catch (error) {
      loggingService.log('error', 'Error analyzing sentiment', { 
        groupId,
        error: error.message
      });
    }
    
    // זיהוי נושאים בשיחה (אם יש מספיק הודעות חדשות)
    if (conversation.messageCount % 5 === 0) {
      try {
        const recentTexts = conversation.recentMessages.map(msg => msg.text).join(' ');
        const topics = await aiService.detectTopics(recentTexts);
        conversation.detectedTopics = topics;
      } catch (error) {
        loggingService.log('error', 'Error detecting topics', { 
          groupId,
          error: error.message
        });
      }
    }
    
    // עדכון הקבוצה במסד הנתונים
    await Group.findByIdAndUpdate(groupId, {
      $set: {
        lastActivity: new Date(),
        activeParticipantsCount: conversation.participants.size
      }
    });
  }

  /**
   * בדיקה אם נדרשת התערבות של המנחה
   * @param {String} groupId - מזהה הקבוצה
   * @returns {Promise<boolean>} האם נדרשת התערבות
   */
  async shouldFacilitatorIntervene(groupId) {
    const conversation = this.activeConversations.get(groupId);
    if (!conversation) {
      return false;
    }
    
    // בדיקת זמן מאז ההתערבות האחרונה
    if (conversation.lastFacilitatorIntervention) {
      const timeSinceLastIntervention = new Date() - conversation.lastFacilitatorIntervention;
      // לא להתערב יותר מפעם בשעה
      if (timeSinceLastIntervention < 60 * 60 * 1000) {
        return false;
      }
    }
    
    // בדיקת מספר הודעות מאז ההתערבות האחרונה
    if (conversation.messageCount - (conversation.lastInterventionMessageCount || 0) < this.interactionThreshold) {
      return false;
    }
    
    // התערבות במקרה של רגשות שליליים רצופים
    if (conversation.consecutiveNegativeMessages >= 3) {
      return true;
    }
    
    // התערבות במקרה של חוסר פעילות ממושך
    const group = await Group.findById(groupId);
    if (group && group.type === 'support') {
      // בקבוצות תמיכה, התערבות אם אין תגובות להודעה
      const uniqueParticipants = conversation.recentMessages
        .map(msg => msg.sender)
        .filter((sender, index, self) => self.indexOf(sender) === index);
      
      if (uniqueParticipants.length === 1 && conversation.recentMessages.length >= 2) {
        // אם יש רק משתתף אחד שמדבר לאחרונה
        return true;
      }
    }
    
    // החלטה אקראית בהתאם לסוג הקבוצה
    const group = await Group.findById(groupId);
    let interventionProbability = 0.1; // ברירת מחדל
    
    if (group) {
      switch (group.type) {
        case 'support':
          interventionProbability = 0.3; // סיכוי גבוה יותר בקבוצות תמיכה
          break;
        case 'activity':
          interventionProbability = 0.2;
          break;
        case 'interest':
          interventionProbability = 0.1;
          break;
        case 'location':
          interventionProbability = 0.15;
          break;
      }
    }
    
    return Math.random() < interventionProbability;
  }

  /**
   * יצירת התערבות ושליחתה לקבוצה
   * @param {Object} group - אובייקט הקבוצה
   * @param {Object} triggeringMessage - ההודעה שהובילה להתערבות
   * @returns {Promise<void>}
   */
  async generateAndSendIntervention(group, triggeringMessage) {
    try {
      const conversation = this.activeConversations.get(group._id);
      if (!conversation) {
        return;
      }
      
      // עדכון מונים של התערבות
      conversation.lastFacilitatorIntervention = new Date();
      conversation.lastInterventionMessageCount = conversation.messageCount;
      
      // בחירת סוג התערבות בהתאם למצב השיחה
      let interventionType;
      let interventionText;
      
      if (conversation.consecutiveNegativeMessages >= 3) {
        // התערבות במקרי מצוקה או רגשות שליליים
        interventionType = 'support';
        interventionText = await this.generateSupportiveIntervention(group, conversation);
      } else if (conversation.recentMessages.length >= 2 && 
                 new Set(conversation.recentMessages.map(msg => msg.sender)).size === 1) {
        // התערבות כאשר רק משתמש אחד משתתף בשיחה
        interventionType = 'engagement';
        interventionText = await this.generateEngagementIntervention(group, conversation);
      } else {
        // התערבות רגילה בהתאם לסוג הקבוצה
        interventionType = group.type;
        
        switch (group.type) {
          case 'support':
            interventionText = this.getRandomIntervention(this.interventionPatterns.support);
            break;
          case 'activity':
            interventionText = this.getRandomIntervention(this.interventionPatterns.activity);
            break;
          default:
            // בחירת התערבות אקראית מתוך כל הסוגים
            const allPatterns = [
              ...this.interventionPatterns.support,
              ...this.interventionPatterns.activity
            ];
            interventionText = this.getRandomIntervention(allPatterns);
        }
        
        // שימוש ב-AI להתאמת ההתערבות לתוכן השיחה הנוכחית
        interventionText = await this.customizeInterventionWithAI(interventionText, group, conversation);
      }
      
      // שליחת ההודעה לקבוצה
      await whatsappService.sendGroupMessage(group.whatsappId, interventionText);
      
      // תיעוד ההתערבות
      loggingService.log('info', 'Facilitator intervention sent', { 
        groupId: group._id,
        groupName: group.name,
        interventionType
      });
      
      // שמירת ההודעה במסד הנתונים
      const msgDoc = new Message({
        groupId: group._id,
        senderId: null, // מנחה וירטואלי
        senderWhatsappId: process.env.BOT_WHATSAPP_ID || 'bot',
        content: interventionText,
        timestamp: new Date(),
        metadata: {
          type: 'text',
          isFacilitator: true,
          interventionType
        }
      });
      await msgDoc.save();
    } catch (error) {
      loggingService.log('error', 'Error generating or sending intervention', { 
        groupId: group._id,
        error: error.message
      });
    }
  }

  /**
   * בחירה אקראית של התערבות מתוך רשימה
   * @param {Array} interventions - רשימת התערבויות אפשריות
   * @returns {String} התערבות שנבחרה
   */
  getRandomIntervention(interventions) {
    const index = Math.floor(Math.random() * interventions.length);
    return interventions[index];
  }

  /**
   * התאמת התערבות לשיחה הנוכחית באמצעות AI
   * @param {String} baseIntervention - התערבות בסיסית
   * @param {Object} group - אובייקט הקבוצה
   * @param {Object} conversation - מצב השיחה
   * @returns {Promise<String>} התערבות מותאמת
   */
  async customizeInterventionWithAI(baseIntervention, group, conversation) {
    try {
      // בניית פרומפט לAI עם הקשר השיחה
      const recentMessages = conversation.recentMessages
        .map(msg => `משתמש: ${msg.text}`)
        .join('\n');
      
      const detectedTopics = conversation.detectedTopics.join(', ') || 'לא זוהו נושאים';
      
      const prompt = `הנה שיחה אחרונה בקבוצת "${group.name}" (סוג: ${group.type}):\n\n${recentMessages}\n\nהנושאים שזוהו: ${detectedTopics}\n\nאני רוצה להתערב בשיחה כמנחה וירטואלי עם התערבות בסגנון: "${baseIntervention}"\n\nאנא כתוב הודעה מותאמת שמתייחסת לתוכן השיחה הנוכחית ולנושאים שזוהו. ההודעה צריכה להיות קצרה ותומכת.`;
      
      const customizedIntervention = await aiService.getCompletion(prompt);
      
      return customizedIntervention;
    } catch (error) {
      loggingService.log('error', 'Error customizing intervention with AI', { 
        groupId: group._id,
        error: error.message
      });
      
      // במקרה של שגיאה, החזרת ההתערבות הבסיסית
      return baseIntervention;
    }
  }

  /**
   * יצירת התערבות תומכת במקרי מצוקה
   * @param {Object} group - אובייקט הקבוצה
   * @param {Object} conversation - מצב השיחה
   * @returns {Promise<String>} התערבות תומכת
   */
  async generateSupportiveIntervention(group, conversation) {
    try {
      const recentMessages = conversation.recentMessages
        .map(msg => `משתמש: ${msg.text}`)
        .join('\n');
      
      const prompt = `הנה שיחה אחרונה בקבוצת תמיכה "${group.name}":\n\n${recentMessages}\n\nזיהיתי רגשות שליליים או מצוקה בשיחה. אנא כתוב הודעה תומכת ומחזקת כמנחה וירטואלי. ההודעה צריכה להיות אמפתית, להכיר ברגשות שעולים ולהציע תמיכה או נקודת מבט חיובית. אל תתעלם מהקושי אבל נסה להציע דרך קדימה. ההודעה צריכה להיות קצרה.`;
      
      const supportiveIntervention = await aiService.getCompletion(prompt);
      
      return supportiveIntervention;
    } catch (error) {
      loggingService.log('error', 'Error generating supportive intervention', { 
        groupId: group._id,
        error: error.message
      });
      
      // במקרה של שגיאה, החזרת התערבות מוכנה מראש
      return this.getRandomIntervention(this.interventionPatterns.support);
    }
  }

  /**
   * יצירת התערבות לעידוד השתתפות
   * @param {Object} group - אובייקט הקבוצה
   * @param {Object} conversation - מצב השיחה
   * @returns {Promise<String>} התערבות לעידוד השתתפות
   */
  async generateEngagementIntervention(group, conversation) {
    try {
      const recentMessages = conversation.recentMessages
        .map(msg => `משתמש: ${msg.text}`)
        .join('\n');
      
      const prompt = `הנה שיחה אחרונה בקבוצת "${group.name}":\n\n${recentMessages}\n\nרק משתמש אחד משתתף בשיחה. אנא כתוב הודעה קצרה כמנחה וירטואלי שמתייחסת לתוכן השיחה ומעודדת משתתפים נוספים להצטרף. ההודעה צריכה להיות מזמינה ולא לחוצה, ולהציע נקודת כניסה קלה לשיחה.`;
      
      const engagementIntervention = await aiService.getCompletion(prompt);
      
      return engagementIntervention;
    } catch (error) {
      loggingService.log('error', 'Error generating engagement intervention', { 
        groupId: group._id,
        error: error.message
      });
      
      // במקרה של שגיאה, החזרת התערבות מוכנה מראש
      return "מה דעת שאר חברי הקבוצה? אשמח לשמוע גם את הדעות שלכם בנושא.";
    }
  }

  /**
   * בדיקת הודעה לסימני מצוקה
   * @param {String} messageText - טקסט ההודעה
   * @returns {Promise<number>} ציון מצוקה (0-1)
   */
  async checkMessageForDistress(messageText) {
    try {
      // בדיקה בסיסית למילות מפתח
      const lowercaseMessage = messageText.toLowerCase();
      
      for (const keyword of this.distressKeywords) {
        if (lowercaseMessage.includes(keyword.toLowerCase())) {
          // אם יש מילת מפתח, שליחה לניתוח מעמיק יותר
          return await this.analyzeDistressLevel(messageText);
        }
      }
      
      // ניתוח רנדומלי של ~10% מההודעות גם אם אין מילות מפתח
      if (Math.random() < 0.1) {
        return await this.analyzeDistressLevel(messageText);
      }
      
      return 0; // ברירת מחדל - אין מצוקה
    } catch (error) {
      loggingService.log('error', 'Error checking message for distress', { 
        error: error.message
      });
      return 0;
    }
  }

  /**
   * ניתוח רמת מצוקה בהודעה באמצעות AI
   * @param {String} messageText - טקסט ההודעה
   * @returns {Promise<number>} ציון מצוקה (0-1)
   */
  async analyzeDistressLevel(messageText) {
    try {
      const prompt = `ההודעה הבאה נשלחה בקבוצת תמיכה למניעת אלימות במשפחה. אנא נתח האם ההודעה מביעה מצוקה, חרדה, פחד, דיכאון או סכנה מיידית. דרג את רמת המצוקה בסולם של 0 עד 1, כאשר 0 אין מצוקה כלל ו-1 הוא מצוקה קיצונית או סכנה מיידית.\n\nהודעה: "${messageText}"\n\nציון מצוקה (0-1):`;
      
      const response = await aiService.getCompletion(prompt);
      
      // ניסיון לחלץ מספר מהתשובה
      const match = response.match(/\d+(\.\d+)?/);
      if (match) {
        const score = parseFloat(match[0]);
        return Math.min(Math.max(score, 0), 1); // ודא שהציון בטווח 0-1
      }
      
      return 0.3; // ברירת מחדל במקרה של שגיאה בפרסור
    } catch (error) {
      loggingService.log('error', 'Error analyzing distress level', { 
        error: error.message
      });
      return 0.3; // ברירת מחדל במקרה של שגיאה
    }
  }

  /**
   * טיפול בהודעת מצוקה
   * @param {Object} group - אובייקט הקבוצה
   * @param {Object} user - אובייקט המשתמש (או אובייקט עם whatsappId בלבד)
   * @param {Object} message - אובייקט ההודעה
   * @param {Number} distressLevel - רמת המצוקה שזוהתה
   * @returns {Promise<void>}
   */
  async handleDistressMessage(group, user, message, distressLevel) {
    try {
      // יצירת התראה במערכת
      const alert = new Alert({
        userId: user._id || null,
        userWhatsappId: user.whatsappId,
        groupId: group._id,
        messageId: message._id,
        type: distressLevel >= 0.8 ? 'emergency' : 'distress',
        content: message.text,
        timestamp: new Date(),
        status: 'new',
        distressLevel
      });
      await alert.save();
      
      // תיעוד האירוע
      loggingService.log('warning', 'Distress message detected', { 
        groupId: group._id,
        groupName: group.name,
        userWhatsappId: user.whatsappId,
        distressLevel
      });
      
      // התערבות מיידית בקבוצה
      let responseMessage;
      
      if (distressLevel >= 0.9) {
        // מצב חירום - תגובה מיידית בקבוצה והתראה למנהלים
        responseMessage = this.getRandomIntervention(this.emergencyResponses.immediate);
        
        // הוספת משאבי סיוע
        responseMessage += '\n\n' + this.getRandomIntervention(this.emergencyResponses.resources);
        
        // שליחת התראה למנהלי המערכת
        await notificationService.sendAdminAlert({
          type: 'emergency',
          groupId: group._id,
          groupName: group.name,
          userWhatsappId: user.whatsappId,
          messageContent: message.text,
          timestamp: new Date()
        });
      } else if (distressLevel >= 0.7) {
        // מצוקה גבוהה - תגובה בקבוצה
        const prompt = `הנה הודעה שהתקבלה בקבוצת תמיכה למניעת אלימות במשפחה: "${message.text}"\n\nזיהיתי בהודעה סימני מצוקה. אנא כתוב תגובה קצרה, תומכת ואמפתית שמכירה במצוקה ומציעה תמיכה. התגובה צריכה להיות מרגיעה ולא להעמיק את המצוקה או לגרום לחרדה נוספת.`;
        
        responseMessage = await aiService.getCompletion(prompt);
      } else {
        // מצוקה בינונית - לא תמיד נגיב ישירות
        return;
      }
      
      // שליחת תגובה לקבוצה
      await whatsappService.sendGroupMessage(group.whatsappId, responseMessage);
      
      // שמירת ההודעה במסד הנתונים
      const responseDoc = new Message({
        groupId: group._id,
        senderId: null, // מנחה וירטואלי
        senderWhatsappId: process.env.BOT_WHATSAPP_ID || 'bot',
        content: responseMessage,
        timestamp: new Date(),
        metadata: {
          type: 'text',
          isFacilitator: true,
          interventionType: 'distress',
          distressLevel
        }
      });
      await responseDoc.save();
      
      // במקרה של מצוקה גבוהה, שליחת הודעה פרטית למשתמש
      if (distressLevel >= 0.8) {
        const privateMessage = 'שלום, אני המנחה הוירטואלי של הקבוצה. שמתי לב שאת/ה אולי חווה קושי. אני כאן כדי לסייע. האם תרצה/י לשוחח באופן פרטי או שאחבר אותך לגורם תמיכה אנושי?';
        
        await whatsappService.sendPrivateMessage(user.whatsappId, privateMessage);
      }
    } catch (error) {
      loggingService.log('error', 'Error handling distress message', { 
        groupId: group._id,
        error: error.message
      });
    }
  }

  /**
   * עדכון ניקוד פעילות המשתמש בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @param {String} userId - מזהה המשתמש
   * @returns {Promise<void>}
   */
  async updateUserActivityScore(groupId, userId) {
    try {
      // מציאת הקבוצה ועדכון ניקוד הפעילות של המשתמש
      const group = await Group.findById(groupId);
      if (!group) {
        return;
      }
      
      // חיפוש המשתמש בתוך רשימת החברים בקבוצה
      const memberIndex = group.members.findIndex(
        member => member.userId.toString() === userId.toString()
      );
      
      if (memberIndex !== -1) {
        // עדכון ניקוד הפעילות
        group.members[memberIndex].activityScore += 1;
        
        // שמירת השינויים
        await group.save();
      }
    } catch (error) {
      loggingService.log('error', 'Error updating user activity score', { 
        groupId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * קבלת מידע על פעילות בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @returns {Promise<Object>} נתוני פעילות
   */
  async getGroupActivityStats(groupId) {
    try {
      // שליפת הקבוצה עם חברים
      const group = await Group.findById(groupId).populate('members.userId', 'name whatsappId');
      if (!group) {
        throw new Error('Group not found');
      }
      
      // שליפת הודעות אחרונות בקבוצה
      const recentMessages = await Message.find({ groupId })
        .sort({ timestamp: -1 })
        .limit(100);
      
      // ספירת הודעות לפי משתמש
      const messageCountByUser = {};
      recentMessages.forEach(message => {
        const senderId = message.senderId ? message.senderId.toString() : 'facilitator';
        
        if (!messageCountByUser[senderId]) {
          messageCountByUser[senderId] = 0;
        }
        
        messageCountByUser[senderId]++;
      });
      
      // חישוב סטטיסטיקות נוספות
      const totalMessages = recentMessages.length;
      const uniqueParticipants = Object.keys(messageCountByUser).length;
      const facilitatorMessages = messageCountByUser['facilitator'] || 0;
      const userMessages = totalMessages - facilitatorMessages;
      
      // חישוב ממוצע הודעות למשתמש
      const avgMessagesPerUser = userMessages / (uniqueParticipants - 1 || 1); // פחות המנחה
      
      // הכנת רשימת המשתמשים הפעילים ביותר
      const activeMembers = group.members
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, 5)
        .map(member => ({
          userId: member.userId._id,
          name: member.userId.name,
          activityScore: member.activityScore,
          messageCount: messageCountByUser[member.userId._id.toString()] || 0
        }));
      
      // בדיקת זמן פעילות אחרון
      const lastMessageDate = recentMessages.length > 0 ? recentMessages[0].timestamp : group.createdAt;
      const daysSinceLastActivity = Math.floor((new Date() - lastMessageDate) / (1000 * 60 * 60 * 24));
      
      return {
        groupId: group._id,
        groupName: group.name,
        groupType: group.type,
        memberCount: group.members.length,
        activeParticipants: uniqueParticipants,
        totalMessages,
        facilitatorMessages,
        userMessages,
        avgMessagesPerUser,
        activeMembers,
        daysSinceLastActivity,
        activityLevel: this.calculateActivityLevel(totalMessages, uniqueParticipants, daysSinceLastActivity)
      };
    } catch (error) {
      loggingService.log('error', 'Error getting group activity stats', { 
        groupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * חישוב רמת פעילות הקבוצה
   * @param {Number} totalMessages - סך כל ההודעות
   * @param {Number} uniqueParticipants - מספר משתתפים ייחודיים
   * @param {Number} daysSinceLastActivity - ימים מאז פעילות אחרונה
   * @returns {String} רמת פעילות (high, medium, low, inactive)
   */
  calculateActivityLevel(totalMessages, uniqueParticipants, daysSinceLastActivity) {
    // חישוב פשוט של רמת פעילות
    if (daysSinceLastActivity > 14) {
      return 'inactive'; // לא פעיל אם אין פעילות יותר משבועיים
    }
    
    if (uniqueParticipants < 3) {
      return 'low'; // פעילות נמוכה אם יש מעט משתתפים
    }
    
    if (totalMessages > 50 && uniqueParticipants > 5) {
      return 'high'; // פעילות גבוהה
    }
    
    return 'medium'; // פעילות בינונית כברירת מחדל
  }

  /**
   * הכנת והוספת משתמש חדש לקבוצה
   * @param {String} userId - מזהה המשתמש
   * @param {String} groupId - מזהה הקבוצה
   * @returns {Promise<Object>} התוצאה
   */
  async addUserToGroup(userId, groupId) {
    try {
      // בדיקה שהמשתמש והקבוצה קיימים
      const user = await User.findById(userId);
      const group = await Group.findById(groupId);
      
      if (!user || !group) {
        throw new Error('User or group not found');
      }
      
      // בדיקה שהמשתמש לא נמצא כבר בקבוצה
      const isAlreadyMember = group.members.some(
        member => member.userId.toString() === userId
      );
      
      if (isAlreadyMember) {
        return {
          success: false,
          message: 'User is already a member of this group'
        };
      }
      
      // הוספת המשתמש לקבוצה
      group.members.push({
        userId,
        joinDate: new Date(),
        role: 'member',
        activityScore: 0
      });
      
      await group.save();
      
      // הוספת המשתמש לקבוצת WhatsApp
      await whatsappService.addUserToGroup(user.whatsappId, group.whatsappId);
      
      // שליחת הודעת ברוכים הבאים
      const welcomeMessage = await this.generateWelcomeMessage(user, group);
      await whatsappService.sendGroupMessage(group.whatsappId, welcomeMessage);
      
      // תיעוד
      loggingService.log('info', 'User added to group', { 
        userId,
        userName: user.name,
        groupId,
        groupName: group.name
      });
      
      return {
        success: true,
        message: 'User added to group successfully'
      };
    } catch (error) {
      loggingService.log('error', 'Error adding user to group', { 
        userId,
        groupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * יצירת הודעת ברוכים הבאים למשתמש חדש
   * @param {Object} user - אובייקט המשתמש
   * @param {Object} group - אובייקט הקבוצה
   * @returns {Promise<String>} הודעת ברוכים הבאים
   */
  async generateWelcomeMessage(user, group) {
    try {
      // ניסיון לקבל הודעה מותאמת אישית מה-AI
      const prompt = `כתוב הודעת ברוכים הבאים קצרה וחמימה למשתמש/ת בשם ${user.name} שהצטרף/ה לקבוצת "${group.name}" (סוג: ${group.type}). הקבוצה עוסקת ב${group.description || group.type}. ההודעה צריכה להיות מזמינה ותומכת.`;
      
      const welcomeMessage = await aiService.getCompletion(prompt);
      
      return welcomeMessage;
    } catch (error) {
      loggingService.log('error', 'Error generating welcome message', { 
        userId: user._id,
        groupId: group._id,
        error: error.message
      });
      
      // במקרה של שגיאה, החזרת הודעת ברוכים הבאים סטנדרטית
      return `ברוכים הבאים, ${user.name}! שמחים שהצטרפת לקבוצת "${group.name}". 🌟 אנו מקווים שתמצא/י כאן קהילה תומכת ומחזקת. אל תהסס/י לשתף ולהשתתף בשיחות. אנחנו כאן בשבילך!`;
    }
  }

  /**
   * הסרת משתמש מקבוצה
   * @param {String} userId - מזהה המשתמש
   * @param {String} groupId - מזהה הקבוצה
   * @param {String} reason - סיבת ההסרה (אופציונלי)
   * @returns {Promise<Object>} התוצאה
   */
  async removeUserFromGroup(userId, groupId, reason = '') {
    try {
      // בדיקה שהמשתמש והקבוצה קיימים
      const user = await User.findById(userId);
      const group = await Group.findById(groupId);
      
      if (!user || !group) {
        throw new Error('User or group not found');
      }
      
      // בדיקה שהמשתמש אכן חבר בקבוצה
      const memberIndex = group.members.findIndex(
        member => member.userId.toString() === userId
      );
      
      if (memberIndex === -1) {
        return {
          success: false,
          message: 'User is not a member of this group'
        };
      }
      
      // הסרת המשתמש מהקבוצה במסד הנתונים
      group.members.splice(memberIndex, 1);
      await group.save();
      
      // הסרת המשתמש מקבוצת WhatsApp
      await whatsappService.removeUserFromGroup(user.whatsappId, group.whatsappId);
      
      // תיעוד
      loggingService.log('info', 'User removed from group', { 
        userId,
        userName: user.name,
        groupId,
        groupName: group.name,
        reason
      });
      
      return {
        success: true,
        message: 'User removed from group successfully'
      };
    } catch (error) {
      loggingService.log('error', 'Error removing user from group', { 
        userId,
        groupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * יצירת קבוצה חדשה עם מנחה וירטואלי
   * @param {Object} groupData - נתוני הקבוצה
   * @param {Array} initialMembers - רשימת משתמשים ראשונית
   * @returns {Promise<Object>} הקבוצה שנוצרה
   */
  async createGroupWithFacilitator(groupData, initialMembers = []) {
    try {
      // יצירת קבוצת WhatsApp חדשה
      const whatsappGroupId = await whatsappService.createGroup(
        groupData.name,
        initialMembers.map(user => user.whatsappId)
      );
      
      // יצירת הקבוצה במסד הנתונים
      const group = new Group({
        name: groupData.name,
        whatsappId: whatsappGroupId,
        description: groupData.description || '',
        type: groupData.type,
        location: groupData.location || '',
        interestTags: groupData.interestTags || [],
        active: true,
        createdAt: new Date(),
        members: initialMembers.map(user => ({
          userId: user._id,
          joinDate: new Date(),
          role: 'member',
          activityScore: 0
        }))
      });
      
      // הוספת מנהל הקבוצה אם יש
      if (groupData.adminId) {
        const adminIndex = group.members.findIndex(
          member => member.userId.toString() === groupData.adminId
        );
        
        if (adminIndex !== -1) {
          group.members[adminIndex].role = 'admin';
        } else {
          const admin = await User.findById(groupData.adminId);
          if (admin) {
            group.members.push({
              userId: admin._id,
              joinDate: new Date(),
              role: 'admin',
              activityScore: 0
            });
            
            // הוספת המנהל לקבוצת WhatsApp אם הוא לא כבר שם
            await whatsappService.addUserToGroup(admin.whatsappId, whatsappGroupId);
          }
        }
      }
      
      await group.save();
      
      // הגדרת משימות מתוזמנות לקבוצה
      this.scheduleGroupTasks(group._id);
      
      // שליחת הודעת פתיחה
      const introMessage = await this.generateGroupIntroduction(group);
      await whatsappService.sendGroupMessage(whatsappGroupId, introMessage);
      
      // תיעוד
      loggingService.log('info', 'New group created with facilitator', { 
        groupId: group._id,
        groupName: group.name,
        groupType: group.type,
        initialMembersCount: initialMembers.length
      });
      
      return group;
    } catch (error) {
      loggingService.log('error', 'Error creating group with facilitator', { 
        groupName: groupData.name,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * יצירת הודעת פתיחה לקבוצה חדשה
   * @param {Object} group - אובייקט הקבוצה
   * @returns {Promise<String>} הודעת פתיחה
   */
  async generateGroupIntroduction(group) {
    try {
      // יצירת הודעת פתיחה באמצעות AI
      const prompt = `כתוב הודעת פתיחה לקבוצת WhatsApp חדשה בשם "${group.name}" מסוג ${group.type}. ${group.description ? `הקבוצה מתמקדת ב${group.description}.` : ''}
      
      ההודעה צריכה לכלול:
      1. ברכת פתיחה חמה
      2. הסבר קצר על מטרת הקבוצה וכיצד היא יכולה לסייע למשתתפים
      3. הסבר קצר שאני מנחה וירטואלי שנמצא כאן כדי לסייע ולתמוך
      4. עידוד למשתתפים להציג את עצמם ולהשתתף בקבוצה
      5. כמה כללי בסיס לתקשורת מכבדת
      
      ההודעה צריכה להיות תומכת ומזמינה, אך גם להדגיש את החשיבות של שמירה על סביבה בטוחה ואמינה. ההודעה צריכה להיות קצרה וקלה לקריאה.`;
      
      const introMessage = await aiService.getCompletion(prompt);
      
      return introMessage;
    } catch (error) {
      loggingService.log('error', 'Error generating group introduction', { 
        groupId: group._id,
        error: error.message
      });
      
      // במקרה של שגיאה, החזרת הודעת פתיחה סטנדרטית
      return `
      👋 ברוכים הבאים לקבוצת "${group.name}"! 👋
      
      אני שמח לפתוח את הקבוצה הזו ולקבל את פניכם. אני המנחה הוירטואלי של הקבוצה, וכאן כדי לסייע ולתמוך בכם.
      
      🌟 מטרת הקבוצה הזו היא ליצור מרחב בטוח עבורכם לשיתוף, תמיכה וגדילה משותפת.
      
      כמה כללים פשוטים לקבוצה:
      - נשמור על כבוד הדדי
      - נכבד את הפרטיות של כל המשתתפים
      - ננסה להקשיב באמת אחד לשני
      - נהיה סבלניים ומקבלים
      
      אשמח אם תציגו את עצמכם בקצרה כדי שנוכל להכיר! 😊
      
      לכל שאלה או בקשה, אני כאן!
      `;
    }
  }

  /**
   * קבלת היסטוריית השיחה בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @param {Number} limit - מספר הודעות מקסימלי
   * @param {Number} skip - כמה הודעות לדלג
   * @returns {Promise<Array>} היסטוריית הודעות
   */
  async getGroupChatHistory(groupId, limit = 50, skip = 0) {
    try {
      // שליפת הקבוצה
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      
      // שליפת ההודעות עם מידע על השולח
      const messages = await Message.find({ groupId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name')
        .lean();
      
      // הפיכת הסדר כדי שההודעות יהיו מהישנה לחדשה
      return messages.reverse();
    } catch (error) {
      loggingService.log('error', 'Error getting group chat history', { 
        groupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * ניתוח אינטראקציה בקבוצה
   * @param {String} groupId - מזהה הקבוצה
   * @returns {Promise<Object>} ניתוח האינטראקציה
   */
  async analyzeGroupInteraction(groupId) {
    try {
      // שליפת היסטוריית השיחה
      const messages = await this.getGroupChatHistory(groupId, 100);
      
      if (messages.length === 0) {
        return {
          interactionLevel: 'none',
          sentimentScore: 0,
          activeUsers: 0,
          responseRate: 0,
          facilitatorEffectiveness: 0
        };
      }
      
      // חישוב מדדים בסיסיים
      const uniqueUsers = new Set(messages.map(msg => 
        msg.senderId ? msg.senderId._id.toString() : 'facilitator'
      )).size;
      
      // ספירת הודעות המנחה
      const facilitatorMessages = messages.filter(
        msg => !msg.senderId || msg.metadata?.isFacilitator
      ).length;
      
      // חישוב שרשראות תגובה
      const responseChains = this.calculateResponseChains(messages);
      
      // ניתוח רגשות ממוצע
      let totalSentiment = 0;
      let sentimentCount = 0;
      
      for (const message of messages) {
        if (message.metadata?.sentimentScore !== undefined) {
          totalSentiment += message.metadata.sentimentScore;
          sentimentCount++;
        }
      }
      
      const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
      
      // יעילות המנחה - אחוז התגובות להתערבויות המנחה
      let facilitatorEffectiveness = 0;
      
      if (facilitatorMessages > 0) {
        const responseToFacilitator = this.countResponsesToFacilitator(messages);
        facilitatorEffectiveness = responseToFacilitator / facilitatorMessages;
      }
      
      return {
        interactionLevel: this.determineInteractionLevel(messages.length, uniqueUsers, responseChains),
        sentimentScore: avgSentiment,
        activeUsers: uniqueUsers,
        messageCount: messages.length,
        userMessages: messages.length - facilitatorMessages,
        facilitatorMessages,
        responseRate: responseChains / Math.max(1, messages.length - 1),
        facilitatorEffectiveness
      };
    } catch (error) {
      loggingService.log('error', 'Error analyzing group interaction', { 
        groupId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * חישוב שרשראות תגובה בשיחה
   * @param {Array} messages - רשימת הודעות
   * @returns {Number} מספר שרשראות התגובה
   */
  calculateResponseChains(messages) {
    let chains = 0;
    let lastSenderId = null;
    
    for (const message of messages) {
      const currentSenderId = message.senderId 
        ? message.senderId._id.toString() 
        : 'facilitator';
      
      if (lastSenderId && currentSenderId !== lastSenderId) {
        chains++;
      }
      
      lastSenderId = currentSenderId;
    }
    
    return chains;
  }

  /**
   * ספירת תגובות להתערבויות המנחה
   * @param {Array} messages - רשימת הודעות
   * @returns {Number} מספר התגובות
   */
  countResponsesToFacilitator(messages) {
    let responses = 0;
    
    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];
      
      if ((!current.senderId || current.metadata?.isFacilitator) && 
          next.senderId && !next.metadata?.isFacilitator) {
        responses++;
      }
    }
    
    return responses;
  }

  /**
   * קביעת רמת האינטראקציה בקבוצה
   * @param {Number} messageCount - מספר הודעות
   * @param {Number} uniqueUsers - מספר משתמשים ייחודיים
   * @param {Number} responseChains - מספר שרשראות תגובה
   * @returns {String} רמת האינטראקציה
   */
  determineInteractionLevel(messageCount, uniqueUsers, responseChains) {
    if (messageCount < 5) {
      return 'very_low';
    }
    
    if (uniqueUsers < 3) {
      return 'low';
    }
    
    if (responseChains > messageCount * 0.7 && uniqueUsers > 4) {
      return 'very_high';
    }
    
    if (responseChains > messageCount * 0.5) {
      return 'high';
    }
    
    return 'medium';
  }

  /**
   * איתור קבוצות לא פעילות
   * @param {Number} daysThreshold - סף ימים ללא פעילות
   * @returns {Promise<Array>} רשימת קבוצות לא פעילות
   */
  async findInactiveGroups(daysThreshold = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
      
      // מציאת קבוצות שלא היתה בהן פעילות אחרי התאריך שנקבע
      const inactiveGroups = await Group.find({
        active: true,
        lastActivity: { $lt: cutoffDate }
      }).select('_id name type description lastActivity');
      
      return inactiveGroups;
    } catch (error) {
      loggingService.log('error', 'Error finding inactive groups', { 
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * יצירת התערבות לעידוד פעילות בקבוצות לא פעילות
   * @returns {Promise<Number>} מספר הקבוצות שטופלו
   */
  async reactivateInactiveGroups() {
    try {
      // איתור קבוצות לא פעילות
      const inactiveGroups = await this.findInactiveGroups();
      
      if (inactiveGroups.length === 0) {
        return 0;
      }
      
      let reactivatedCount = 0;
      
      for (const group of inactiveGroups) {
        try {
          // יצירת הודעת עידוד מותאמת לכל קבוצה
          const prompt = `הקבוצה "${group.name}" (סוג: ${group.type}) לא הייתה פעילה במשך יותר משבוע. ${group.description ? `הקבוצה עוסקת ב${group.description}.` : ''} כתוב הודעה קצרה ומעודדת כדי לעורר מחדש את הפעילות בקבוצה. ההודעה צריכה להיות חיובית, לא שיפוטית ולכלול שאלה או נושא לדיון שיכול לעורר תגובות.`;
          
          const reactivationMessage = await aiService.getCompletion(prompt);
          
          // שליחת ההודעה לקבוצה
          const groupObj = await Group.findById(group._id);
          await whatsappService.sendGroupMessage(groupObj.whatsappId, reactivationMessage);
          
          // עדכון זמן האינטראקציה האחרונה
          await Group.findByIdAndUpdate(group._id, { 
            $set: { lastFacilitatorInteraction: new Date() } 
          });
          
          // תיעוד
          loggingService.log('info', 'Reactivation message sent to inactive group', { 
            groupId: group._id,
            groupName: group.name
          });
          
          reactivatedCount++;
        } catch (error) {
          loggingService.log('error', 'Error reactivating group', { 
            groupId: group._id,
            error: error.message
          });
        }
      }
      
      return reactivatedCount;
    } catch (error) {
      loggingService.log('error', 'Error in reactivateInactiveGroups', { 
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * סיכום פעילות יומית
   * @returns {Promise<Object>} סיכום הפעילות
   */
  async generateDailySummary() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // ספירת הודעות מהיממה האחרונה
      const messageCount = await Message.countDocuments({
        timestamp: { $gte: yesterday, $lt: today }
      });
      
      // ספירת משתמשים פעילים
      const activeUsers = await Message.distinct('senderId', {
        timestamp: { $gte: yesterday, $lt: today },
        senderId: { $ne: null }
      });
      
      // ספירת קבוצות פעילות
      const activeGroups = await Message.distinct('groupId', {
        timestamp: { $gte: yesterday, $lt: today }
      });
      
      // ספירת התערבויות של המנחה
      const facilitatorInterventions = await Message.countDocuments({
        timestamp: { $gte: yesterday, $lt: today },
        senderId: null,
        'metadata.isFacilitator': true
      });
      
      // ספירת התראות מצוקה
      const distressAlerts = await Alert.countDocuments({
        timestamp: { $gte: yesterday, $lt: today },
        type: { $in: ['distress', 'emergency'] }
      });
      
      return {
        date: yesterday,
        messageCount,
        activeUsersCount: activeUsers.length,
        activeGroupsCount: activeGroups.length,
        facilitatorInterventions,
        distressAlerts,
        averageMessagesPerActiveGroup: activeGroups.length > 0 
          ? messageCount / activeGroups.length 
          : 0,
        averageMessagesPerActiveUser: activeUsers.length > 0 
          ? messageCount / activeUsers.length 
          : 0
      };
    } catch (error) {
      loggingService.log('error', 'Error generating daily summary', { 
        error: error.message
      });
      
      throw error;
    }
  }
}

module.exports = new GroupFacilitatorService();