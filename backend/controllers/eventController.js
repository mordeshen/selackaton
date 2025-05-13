const Event = require('../models/Event');
const User = require('../models/User');
const Group = require('../models/Group');
const Alert = require('../models/Alert');
const notificationService = require('../services/notification');
const loggingService = require('../services/logging');
const eventCrawlerService = require('../services/eventCrawler');

/**
 * בקר לניהול אירועים ופעילויות במערכת
 */
class EventController {
  /**
   * יצירת אירוע חדש
   */
  async createEvent(req, res) {
    try {
      const {
        title,
        description,
        eventType,
        location,
        startDate,
        endDate,
        recurrence,
        targetGroups,
        maxParticipants,
        tags
      } = req.body;

      // בדיקת שדות חובה
      if (!title || !description || !eventType || !location || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'נא למלא את כל שדות החובה'
        });
      }

      // וידוא שתאריך התחלה הוא לפני תאריך סיום
      if (new Date(startDate) >= new Date(endDate)) {
        return res.status(400).json({
          success: false,
          message: 'תאריך התחלה חייב להיות לפני תאריך סיום'
        });
      }

      // וידוא שהקבוצות המיועדות קיימות
      if (targetGroups && targetGroups.length > 0) {
        const groupCount = await Group.countDocuments({
          _id: { $in: targetGroups }
        });

        if (groupCount !== targetGroups.length) {
          return res.status(400).json({
            success: false,
            message: 'אחת או יותר מהקבוצות המיועדות אינה קיימת'
          });
        }
      }

      // יצירת האירוע
      const newEvent = new Event({
        title,
        description,
        eventType,
        location,
        startDate,
        endDate,
        recurrence: recurrence || 'none',
        targetGroups: targetGroups || [],
        maxParticipants: maxParticipants || 0,
        organizer: req.user._id,
        tags: tags || [],
        createdBy: req.user._id,
        isVerified: req.user.role === 'admin' ? true : false
      });

      await newEvent.save();
      
      // רישום לוג
      loggingService.logActivity('EVENT_CREATED', {
        eventId: newEvent._id,
        title: newEvent.title,
        createdBy: req.user._id
      });

      // שליחת התראות לקבוצות היעד
      if (targetGroups && targetGroups.length > 0 && newEvent.isVerified) {
        for (const groupId of targetGroups) {
          await notificationService.sendEventNotification(newEvent._id, groupId);
        }
      }

      return res.status(201).json({
        success: true,
        data: newEvent,
        message: 'האירוע נוצר בהצלחה'
      });
    } catch (error) {
      loggingService.logError('EVENT_CREATION_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה ביצירת האירוע',
        error: error.message
      });
    }
  }

  /**
   * עדכון אירוע קיים
   */
  async updateEvent(req, res) {
    try {
      const eventId = req.params.id;
      
      // מציאת האירוע
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'האירוע לא נמצא'
        });
      }

      // בדיקת הרשאות - רק יוצר האירוע או מנהל יכולים לעדכן
      if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לעדכן אירוע זה'
        });
      }

      const updateFields = {};
      const allowedUpdates = [
        'title', 'description', 'eventType', 'location', 'startDate', 'endDate',
        'recurrence', 'recurrenceEndDate', 'targetGroups', 'maxParticipants',
        'tags', 'imageUrl', 'status', 'externalLink'
      ];
      
      // שליפת שדות מותרים לעדכון
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updateFields[key] = req.body[key];
        }
      });

      // עדכון אירוע
      const wasVerified = event.isVerified;
      
      // אם מדובר במנהל ויש שינוי בסטטוס אימות
      if (req.user.role === 'admin' && req.body.isVerified !== undefined) {
        updateFields.isVerified = req.body.isVerified;
      }
      
      updateFields.updatedAt = new Date();
      
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      // רישום לוג
      loggingService.logActivity('EVENT_UPDATED', {
        eventId: updatedEvent._id,
        title: updatedEvent.title,
        updatedBy: req.user._id,
        updatedFields: Object.keys(updateFields)
      });

      // אם האירוע אומת עכשיו, שליחת התראות לקבוצות היעד
      if (!wasVerified && updatedEvent.isVerified && updatedEvent.targetGroups.length > 0) {
        for (const groupId of updatedEvent.targetGroups) {
          await notificationService.sendEventNotification(updatedEvent._id, groupId);
        }
      }

      return res.status(200).json({
        success: true,
        data: updatedEvent,
        message: 'האירוע עודכן בהצלחה'
      });
    } catch (error) {
      loggingService.logError('EVENT_UPDATE_FAILED', {
        error: error.message,
        stack: error.stack,
        eventId: req.params.id,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בעדכון האירוע',
        error: error.message
      });
    }
  }

  /**
   * קבלת פרטי אירוע
   */
  async getEventDetails(req, res) {
    try {
      const eventId = req.params.id;
      
      const event = await Event.findById(eventId)
        .populate('organizer', 'name phone')
        .populate('targetGroups', 'name description')
        .populate('participants.userId', 'name');
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'האירוע לא נמצא'
        });
      }

      // בדיקה אם המשתמש רשום לאירוע
      let isRegistered = false;
      if (req.user) {
        isRegistered = event.participants.some(p => 
          p.userId && p.userId._id && p.userId._id.toString() === req.user._id.toString()
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          event,
          isRegistered
        }
      });
    } catch (error) {
      loggingService.logError('GET_EVENT_DETAILS_FAILED', {
        error: error.message,
        stack: error.stack,
        eventId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת פרטי האירוע',
        error: error.message
      });
    }
  }

  /**
   * קבלת רשימת אירועים
   */
  async getEvents(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        city,
        upcoming = 'true',
        startDate,
        endDate,
        sortBy = 'startDate',
        order = 'asc'
      } = req.query;

      const query = { isVerified: true };
      
      // סינון לפי סוג אירוע
      if (type) {
        query.eventType = type;
      }
      
      // סינון לפי עיר
      if (city) {
        query['location.city'] = city;
      }
      
      // סינון אירועים עתידיים
      if (upcoming === 'true') {
        query.startDate = { $gte: new Date() };
      }
      
      // סינון לפי טווח תאריכים
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate) };
        query.endDate = { $lte: new Date(endDate) };
      } else if (startDate) {
        query.startDate = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.endDate = { $lte: new Date(endDate) };
      }

      // אפשרויות מיון
      const sortOptions = {};
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;

      const events = await Event.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('organizer', 'name');

      const totalEvents = await Event.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: {
          events,
          pagination: {
            total: totalEvents,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(totalEvents / limit)
          }
        }
      });
    } catch (error) {
      loggingService.logError('GET_EVENTS_FAILED', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת רשימת האירועים',
        error: error.message
      });
    }
  }

  /**
   * רישום לאירוע
   */
  async registerForEvent(req, res) {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'האירוע לא נמצא'
        });
      }

      // בדיקה אם האירוע כבר מלא
      if (event.maxParticipants > 0 && event.participants.length >= event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: 'האירוע מלא, לא ניתן להירשם'
        });
      }

      // בדיקה אם המשתמש כבר רשום
      const isRegistered = event.participants.some(p => 
        p.userId.toString() === userId.toString() && p.status !== 'canceled'
      );

      if (isRegistered) {
        return res.status(400).json({
          success: false,
          message: 'המשתמש כבר רשום לאירוע זה'
        });
      }

      // רישום המשתמש
      await event.registerParticipant(userId);
      
      // רישום לוג
      loggingService.logActivity('USER_REGISTERED_TO_EVENT', {
        userId,
        eventId: event._id,
        eventTitle: event.title
      });

      // שליחת אישור הרשמה למשתמש
      await notificationService.sendEventRegistrationConfirmation(userId, eventId);

      return res.status(200).json({
        success: true,
        message: 'ההרשמה לאירוע בוצעה בהצלחה',
        data: {
          event: {
            _id: event._id,
            title: event.title,
            startDate: event.startDate
          }
        }
      });
    } catch (error) {
      loggingService.logError('EVENT_REGISTRATION_FAILED', {
        error: error.message,
        stack: error.stack,
        eventId: req.params.id,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בהרשמה לאירוע',
        error: error.message
      });
    }
  }

  /**
   * ביטול רישום לאירוע
   */
  async cancelRegistration(req, res) {
    try {
      const eventId = req.params.id;
      const userId = req.user._id;
      
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'האירוע לא נמצא'
        });
      }

      // בדיקה אם המשתמש רשום
      const isRegistered = event.participants.some(p => 
        p.userId.toString() === userId.toString() && p.status !== 'canceled'
      );

      if (!isRegistered) {
        return res.status(400).json({
          success: false,
          message: 'המשתמש אינו רשום לאירוע זה'
        });
      }

      // ביטול הרישום
      await event.cancelRegistration(userId);
      
      // רישום לוג
      loggingService.logActivity('USER_CANCELED_EVENT_REGISTRATION', {
        userId,
        eventId: event._id,
        eventTitle: event.title
      });

      return res.status(200).json({
        success: true,
        message: 'ביטול ההרשמה לאירוע בוצע בהצלחה'
      });
    } catch (error) {
      loggingService.logError('EVENT_CANCEL_REGISTRATION_FAILED', {
        error: error.message,
        stack: error.stack,
        eventId: req.params.id,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בביטול ההרשמה לאירוע',
        error: error.message
      });
    }
  }

  /**
   * מחיקת אירוע
   */
  async deleteEvent(req, res) {
    try {
      const eventId = req.params.id;
      
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'האירוע לא נמצא'
        });
      }

      // בדיקת הרשאות - רק יוצר האירוע או מנהל יכולים למחוק
      if (req.user.role !== 'admin' && event.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה למחוק אירוע זה'
        });
      }

      // מחיקת האירוע
      await Event.findByIdAndDelete(eventId);
      
      // רישום לוג
      loggingService.logActivity('EVENT_DELETED', {
        eventId,
        title: event.title,
        deletedBy: req.user._id
      });

      // שליחת התראה לכל הנרשמים על ביטול האירוע
      for (const participant of event.participants) {
        if (participant.status !== 'canceled') {
          await notificationService.sendEventCancellationNotification(
            participant.userId, 
            {
              eventTitle: event.title,
              eventDate: event.startDate
            }
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: 'האירוע נמחק בהצלחה'
      });
    } catch (error) {
      loggingService.logError('EVENT_DELETION_FAILED', {
        error: error.message,
        stack: error.stack,
        eventId: req.params.id,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה במחיקת האירוע',
        error: error.message
      });
    }
  }

  /**
   * קבלת אירועים מומלצים למשתמש
   */
  async getRecommendedEvents(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 5 } = req.query;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'המשתמש לא נמצא'
        });
      }

      // מציאת אירועים מומלצים
      const recommendedEvents = await Event.findRecommendedForUser(userId, parseInt(limit));
      
      return res.status(200).json({
        success: true,
        data: recommendedEvents
      });
    } catch (error) {
      loggingService.logError('GET_RECOMMENDED_EVENTS_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת האירועים המומלצים',
        error: error.message
      });
    }
  }

  /**
   * עדכון אירועים חיצוניים באמצעות הזחלן
   */
  async refreshExternalEvents(req, res) {
    try {
      // בדיקת הרשאות - רק מנהל יכול להפעיל את הזחלן
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה להפעיל את הזחלן לאיסוף אירועים'
        });
      }

      // הפעלת הזחלן
      const result = await eventCrawlerService.crawlEvents();
      
      // רישום לוג
      loggingService.logActivity('EXTERNAL_EVENTS_CRAWLED', {
        userId: req.user._id,
        eventsAdded: result.added,
        eventsUpdated: result.updated
      });

      return res.status(200).json({
        success: true,
        message: 'איסוף האירועים הושלם בהצלחה',
        data: {
          added: result.added,
          updated: result.updated,
          failed: result.failed,
          sources: result.sources
        }
      });
    } catch (error) {
      loggingService.logError('EVENTS_CRAWLER_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בהפעלת איסוף האירועים',
        error: error.message
      });
    }
  }
}

module.exports = new EventController();