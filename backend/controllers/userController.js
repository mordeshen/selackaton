const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const Alert = require('../models/Alert');
const Chat = require('../models/Chat');
const OnboardingState = require('../models/OnboardingState');
const securityService = require('../services/security');
const matchingService = require('../services/matching');
const notificationService = require('../services/notification');
const loggingService = require('../services/logging');
const Invitation = require('../models/Invitation');


/**
 * בקר לניהול משתמשים במערכת
 */
class UserController {
  /**
   * יצירת משתמש חדש
   */
  async createUser(req, res) {
    try {
      const { name, phone, email, password, birthYear, gender, city, interests, needsSupport } = req.body;
      
      // בדיקה אם המשתמש כבר קיים
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'משתמש עם מספר טלפון זה כבר קיים במערכת'
        });
      }

      // הצפנת סיסמה
      const hashedPassword = await securityService.hashPassword(password);
      
      // יצירת משתמש חדש
      const newUser = new User({
        name,
        phone,
        email,
        password: hashedPassword,
        birthYear,
        gender,
        city,
        interests,
        needsSupport
      });

      await newUser.save();
      
      // רישום לוג
      loggingService.logActivity('USER_CREATED', {
        userId: newUser._id,
        phone: newUser.phone
      });

      // המלצה על קבוצות מתאימות
      const recommendedGroups = await matchingService.findGroupsForUser(newUser._id);
      
      // שליחת התראה על הצטרפות למערכת
      await notificationService.sendWelcomeMessage(newUser._id);

      return res.status(201).json({
        success: true,
        data: {
          user: {
            _id: newUser._id,
            name: newUser.name,
            phone: newUser.phone,
            email: newUser.email
          },
          recommendedGroups
        },
        message: 'המשתמש נוצר בהצלחה'
      });
    } catch (error) {
      loggingService.logError('USER_CREATION_FAILED', {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה ביצירת המשתמש',
        error: error.message
      });
    }
  }

  /**
   * אימות משתמש והחזרת טוקן
   */
  async loginUser(req, res) {
    try {
      const { phone, password } = req.body;
      
      // מציאת המשתמש
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'אחד מפרטי ההתחברות שגוי'
        });
      }

      // בדיקת סיסמה
      const isPasswordValid = await securityService.validatePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'אחד מפרטי ההתחברות שגוי'
        });
      }

      // יצירת טוקן
      const token = securityService.generateAuthToken(user._id);
      
      // עדכון זמן התחברות אחרון
      user.lastLogin = new Date();
      await user.save();
      
      // רישום לוג
      loggingService.logActivity('USER_LOGIN', {
        userId: user._id,
        phone: user.phone
      });

      return res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            _id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role
          }
        },
        message: 'התחברות בוצעה בהצלחה'
      });
    } catch (error) {
      loggingService.logError('USER_LOGIN_FAILED', {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בהתחברות',
        error: error.message
      });
    }
  }

  /**
   * קבלת פרטי משתמש
   */
  async getUserProfile(req, res) {
    try {
      const userId = req.params.id || req.user._id;
      
      const user = await User.findById(userId).select('-password -__v');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // משיכת קבוצות המשתמש
      const userGroups = await Group.find({ 'members.userId': userId })
        .select('name description type');
      
      // משיכת סטטיסטיקות הודעות
      const messageStats = {
        total: await Message.countDocuments({ senderId: userId }),
        lastWeek: await Message.countDocuments({
          senderId: userId,
          sentAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
      };

      return res.status(200).json({
        success: true,
        data: {
          user,
          groups: userGroups,
          messageStats
        }
      });
    } catch (error) {
      loggingService.logError('GET_USER_PROFILE_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת פרטי המשתמש',
        error: error.message
      });
    }
  }

  /**
   * עדכון פרטי משתמש
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.params.id || req.user._id;
      
      // וידוא הרשאות - רק המשתמש עצמו או מנהל יכולים לעדכן
      if (req.user.role !== 'admin' && req.user._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לעדכן פרטים של משתמש זה'
        });
      }

      const updateData = {};
      const allowedUpdates = ['name', 'email', 'city', 'interests', 'profilePic', 'bio', 'needsSupport'];
      
      // שליפת שדות מותרים לעדכון
      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updateData[key] = req.body[key];
        }
      });

      // עדכון סיסמה אם נשלחה
      if (req.body.password) {
        updateData.password = await securityService.hashPassword(req.body.password);
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // רישום לוג
      loggingService.logActivity('USER_UPDATED', {
        userId: updatedUser._id,
        updatedFields: Object.keys(updateData)
      });

      // בדיקה אם הצרכים השתנו - התאמת קבוצות חדשות
      if (req.body.needsSupport || req.body.interests) {
        // הרצת שירות התאמה כדי למצוא קבוצות רלוונטיות חדשות
        matchingService.findGroupsForUser(updatedUser._id);
      }

      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'פרטי המשתמש עודכנו בהצלחה'
      });
    } catch (error) {
      loggingService.logError('UPDATE_USER_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בעדכון פרטי המשתמש',
        error: error.message
      });
    }
  }

  /**
   * קבלת הקבוצות של המשתמש
   */
  async getUserGroups(req, res) {
    try {
      const userId = req.params.id || req.user._id;
      
      const groups = await Group.find({ 'members.userId': userId })
        .select('name description type whatsappId members');
      
      // הוספת מידע על כמות הודעות בכל קבוצה
      const groupsWithMessageCount = await Promise.all(groups.map(async group => {
        const messageCount = await Message.countDocuments({
          groupId: group._id,
          sentAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        
        return {
          ...group.toObject(),
          lastMonthMessages: messageCount,
          memberCount: group.members.length
        };
      }));

      return res.status(200).json({
        success: true,
        data: groupsWithMessageCount
      });
    } catch (error) {
      loggingService.logError('GET_USER_GROUPS_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת הקבוצות של המשתמש',
        error: error.message
      });
    }
  }

  /**
   * הצטרפות לקבוצה
   */
  async joinGroup(req, res) {
    try {
      const userId = req.user._id;
      const { groupId } = req.body;
      
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'הקבוצה לא נמצאה'
        });
      }

      // בדיקה אם המשתמש כבר חבר בקבוצה
      const isMember = group.members.some(member => 
        member.userId.toString() === userId.toString()
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: 'המשתמש כבר חבר בקבוצה זו'
        });
      }

      // הוספת המשתמש לקבוצה
      group.members.push({
        userId,
        joinDate: new Date(),
        role: 'member',
        activityScore: 0
      });

      await group.save();
      
      // רישום לוג
      loggingService.logActivity('USER_JOINED_GROUP', {
        userId,
        groupId: group._id,
        groupName: group.name
      });

      // שליחת הודעת ברוכים הבאים לקבוצה
      await notificationService.sendGroupWelcomeMessage(userId, groupId);

      return res.status(200).json({
        success: true,
        message: 'המשתמש צורף לקבוצה בהצלחה',
        data: {
          group: {
            _id: group._id,
            name: group.name,
            type: group.type
          }
        }
      });
    } catch (error) {
      loggingService.logError('JOIN_GROUP_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        groupId: req.body.groupId
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בצירוף לקבוצה',
        error: error.message
      });
    }
  }

  /**
   * עזיבת קבוצה
   */
  async leaveGroup(req, res) {
    try {
      const userId = req.user._id;
      const { groupId } = req.params;
      
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'הקבוצה לא נמצאה'
        });
      }

      // הסרת המשתמש מהקבוצה
      group.members = group.members.filter(member => 
        member.userId.toString() !== userId.toString()
      );

      await group.save();
      
      // רישום לוג
      loggingService.logActivity('USER_LEFT_GROUP', {
        userId,
        groupId: group._id,
        groupName: group.name
      });

      return res.status(200).json({
        success: true,
        message: 'המשתמש הוסר מהקבוצה בהצלחה'
      });
    } catch (error) {
      loggingService.logError('LEAVE_GROUP_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.user._id,
        groupId: req.params.groupId
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בעזיבת הקבוצה',
        error: error.message
      });
    }
  }

  /**
   * קבלת התראות למשתמש
   */
  async getUserAlerts(req, res) {
    try {
      const userId = req.params.id || req.user._id;
      
      // וידוא הרשאות - רק המשתמש עצמו או מנהל יכולים לראות התראות
      if (req.user.role !== 'admin' && req.user._id.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לצפות בהתראות של משתמש זה'
        });
      }
  
      const alerts = await Alert.find({ affectedUserId: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('sourceId')
        .populate('affectedGroupId');
  
      return res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      loggingService.logError('GET_USER_ALERTS_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת התראות המשתמש',
        error: error.message
      });
    }
  }

  /**
   * מחיקת משתמש
   */
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;
      
      // בדיקת הרשאות - רק מנהל מערכת יכול למחוק משתמש
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה למחוק משתמשים'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // מחיקת המשתמש מכל הקבוצות
      await Group.updateMany(
        { 'members.userId': userId },
        { $pull: { members: { userId } } }
      );

      // מחיקת המשתמש
      await User.findByIdAndDelete(userId);
      
      // רישום לוג
      loggingService.logActivity('USER_DELETED', {
        userId,
        deletedBy: req.user._id
      });

      return res.status(200).json({
        success: true,
        message: 'המשתמש נמחק בהצלחה'
      });
    } catch (error) {
      loggingService.logError('DELETE_USER_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה במחיקת המשתמש',
        error: error.message
      });
    }
  }

  /**
   * קבלת משתמשים פעילים במערכת
   */
  async getActiveUsers(req, res) {
    try {
      // בדיקת הרשאות - רק מנהל
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לצפות ברשימת המשתמשים'
        });
      }

      const { page = 1, limit = 20, sortBy = 'lastActivity', order = 'desc' } = req.query;
      
      const sortOptions = {};
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;

      const users = await User.find()
        .select('name phone email role lastLogin lastActivity status')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const totalUsers = await User.countDocuments();

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total: totalUsers,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(totalUsers / limit)
          }
        }
      });
    } catch (error) {
      loggingService.logError('GET_ACTIVE_USERS_FAILED', {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליפת רשימת המשתמשים',
        error: error.message
      });
    }
  }

  /**
   * חיפוש משתמשים
   */
  async searchUsers(req, res) {
    try {
      // בדיקת הרשאות - רק מנהל
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לחפש משתמשים'
        });
      }

      const { query, page = 1, limit = 20 } = req.query;
      
      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'ביטוי החיפוש חייב להכיל לפחות 2 תווים'
        });
      }

      const searchRegex = new RegExp(query, 'i');
      
      const users = await User.find({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { city: searchRegex }
        ]
      })
      .select('name phone email role lastLogin status')
      .skip((page - 1) * limit)
      .limit(Number(limit));

      const totalUsers = await User.countDocuments({
        $or: [
          { name: searchRegex },
          { phone: searchRegex },
          { email: searchRegex },
          { city: searchRegex }
        ]
      });

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            total: totalUsers,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(totalUsers / limit)
          }
        }
      });
    } catch (error) {
      loggingService.logError('SEARCH_USERS_FAILED', {
        error: error.message,
        stack: error.stack,
        query: req.query.query
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בחיפוש משתמשים',
        error: error.message
      });
    }
  }

  /**
   * רישום באמצעות קוד הזמנה
   */
  async registerWithInvitation(req, res) {
    try {
      const { name, phone, email, password, inviteCode } = req.body;
      
      // בדיקת קוד הזמנה
      const invitation = await Invitation.findOne({ 
        code: inviteCode,
        active: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: 'קוד הזמנה לא תקף או פג תוקף'
        });
      }
      
      // בדיקה אם המשתמש כבר קיים
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'משתמש עם מספר טלפון זה כבר קיים במערכת'
        });
      }
      
      // ולידציה של קלט המשתמש
      // ...קוד הולידציה כאן...
      
      // הצפנת סיסמה
      const hashedPassword = await securityService.hashPassword(password);
      
      // יצירת משתמש חדש
      const newUser = new User({
        name,
        phone,
        email,
        password: hashedPassword,
        status: 'active',
        invitedBy: invitation.createdBy
      });
      
      await newUser.save();
      
      // עדכון ההזמנה
      invitation.usedBy.push({
        userId: newUser._id,
        joinedAt: new Date()
      });
      await invitation.save();
      
      // התחלת תהליך בוט אישי לשיוך לקבוצה מתאימה
      await this.startPersonalBotOnboarding(newUser._id);
      
      // יצירת טוקן
      const token = securityService.generateAuthToken(newUser._id);
      
      // רישום לוג
      loggingService.logActivity('USER_REGISTERED_WITH_INVITATION', {
        userId: newUser._id,
        invitationCode: inviteCode
      });
      
      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            _id: newUser._id,
            name: newUser.name,
            phone: newUser.phone
          }
        },
        message: 'המשתמש נרשם בהצלחה, תהליך הצטרפות לקבוצה החל'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בתהליך הרישום',
        error: error.message
      });
    }
  }

  /**
   * התחלת תהליך בוט אישי
   * פונקציה פנימית להתחלת תהליך איפיון והתאמה אוטומטית
   */
  async startPersonalBotOnboarding(userId) {
    try {
      // יצירת צ'אט חדש עם הבוט האישי
      const chat = new Chat({
        userId,
        type: 'onboarding',
        status: 'active'
      });
      
      await chat.save();
      
      // שליחת הודעת פתיחה
      await notificationService.sendPersonalBotMessage(
        userId,
        'שלום וברוכים הבאים למערכת שחרור! אני הבוט האישי שלך ואעזור לך למצוא את הקבוצה המתאימה לך. נתחיל בכמה שאלות?'
      );
      
      // שמירת המצב של תהליך האיפיון
      const onboardingState = new OnboardingState({
        userId,
        chatId: chat._id,
        stage: 'initial',
        responses: []
      });
      
      await onboardingState.save();
      
      return true;
    } catch (error) {
      console.error('Error starting personal bot onboarding:', error);
      throw error;
    }
  }

  /**
   * עדכון סטטוס משתמש
   */
  async updateUserStatus(req, res) {
    try {
      const userId = req.params.id;
      const { status } = req.body;
      
      // בדיקת הרשאות - רק מנהל מערכת יכול לעדכן סטטוס
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'אין לך הרשאה לעדכן סטטוס משתמש'
        });
      }

      // וידוא שמנהל לא מעדכן את עצמו
      if (userId.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'לא ניתן לעדכן את הסטטוס של המשתמש הנוכחי'
        });
      }

      // וידוא שהסטטוס תקין
      const validStatuses = ['active', 'inactive', 'blocked'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'סטטוס לא חוקי'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'משתמש לא נמצא'
        });
      }

      // עדכון הסטטוס
      user.status = status;
      await user.save();
      
      // רישום לוג
      loggingService.logActivity('USER_STATUS_UPDATED', {
        userId,
        updatedBy: req.user._id,
        newStatus: status,
        previousStatus: user.status
      });

      return res.status(200).json({
        success: true,
        message: `סטטוס המשתמש עודכן ל-${status} בהצלחה`
      });
    } catch (error) {
      loggingService.logError('UPDATE_USER_STATUS_FAILED', {
        error: error.message,
        stack: error.stack,
        userId: req.params.id
      });
      
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בעדכון סטטוס המשתמש',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();
