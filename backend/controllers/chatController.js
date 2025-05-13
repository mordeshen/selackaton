// backend/controllers/chatController.js
const Chat = require('../models/Chat');
const User = require('../models/User');
const OnboardingState = require('../models/OnboardingState');
const Group = require('../models/Group');
const aiService = require('../services/ai');
const loggingService = require('../services/logging');

class ChatController {
  /**
   * קבלת הצ'אט האישי של המשתמש
   */
  async getPersonalChat(req, res) {
    try {
      const userId = req.user._id;
      
      let chat = await Chat.findOne({ 
        userId, 
        type: 'onboarding',
        status: { $in: ['active', 'completed'] }
      }).sort({ createdAt: -1 });
      
      if (!chat) {
        // יצירת צ'אט חדש אם אין
        chat = new Chat({
          userId,
          type: 'onboarding',
          status: 'active',
          messages: [{
            sender: 'bot',
            content: 'שלום! אני הבוט האישי שלך במערכת שחרור. אני כאן כדי לעזור לך למצוא את הקבוצה המתאימה עבורך. נתחיל?',
            sentAt: new Date()
          }]
        });
        
        await chat.save();
        
        // יצירת מצב אונבורדינג חדש
        const onboardingState = new OnboardingState({
          userId,
          chatId: chat._id,
          stage: 'initial'
        });
        
        await onboardingState.save();
      }
      
      // סימון כל ההודעות כנקראו
      if (chat.messages && chat.messages.length > 0) {
        chat.messages.forEach(message => {
          if (message.sender !== 'user') {
            message.read = true;
          }
        });
        await chat.save();
      }
      
      return res.status(200).json({
        success: true,
        data: chat
      });
    } catch (error) {
      console.error('Error fetching personal chat:', error);
      return res.status(500).json({
        success: false,
        message: "אירעה שגיאה בקבלת הצאט האישי",
        error: error.message
      });
    }
  }
  
  /**
   * שליחת הודעה לצ'אט האישי
   */
  async sendPersonalMessage(req, res) {
    try {
      const userId = req.user._id;
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'תוכן ההודעה לא יכול להיות ריק'
        });
      }
      
      // מציאת הצ'אט הפעיל
      let chat = await Chat.findOne({ 
        userId, 
        type: 'onboarding',
        status: 'active'
      }).sort({ createdAt: -1 });
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "צ'אט לא פעיל"
        });
      }
      
      // הוספת ההודעה של המשתמש
      chat.messages.push({
        sender: 'user',
        content,
        sentAt: new Date()
      });
      
      await chat.save();
      
      // קבלת מצב האיפיון הנוכחי
      let onboardingState = await OnboardingState.findOne({ 
        userId,
        chatId: chat._id
      }).populate('recommendations.groupId');
      
      if (!onboardingState) {
        return res.status(404).json({
          success: false,
          message: 'לא נמצא תהליך איפיון פעיל'
        });
      }
      
      // עיבוד התשובה באמצעות AI
      const botResponse = await this._processBotResponse(onboardingState, content, req.user);
      
      // הוספת תשובת הבוט
      chat.messages.push({
        sender: 'bot',
        content: botResponse.message,
        sentAt: new Date()
      });
      
      await chat.save();
      
      // עדכון מצב האיפיון
      onboardingState.stage = botResponse.newStage || onboardingState.stage;
      onboardingState.currentQuestion = botResponse.nextQuestion || onboardingState.currentQuestion;
      
      // הוספת התשובה לרשימת התשובות אם זו תשובה לשאלה
      if (botResponse.questionData) {
        onboardingState.responses.push({
          questionId: botResponse.questionData.id,
          question: botResponse.questionData.question,
          answer: content,
          sentAt: new Date()
        });
      }
      
      // הוספת המלצות אם יש
      if (botResponse.recommendations && botResponse.recommendations.length > 0) {
        onboardingState.recommendations = botResponse.recommendations;
      }
      
      // אם המשתמש בחר קבוצה
      if (botResponse.selectedGroup) {
        onboardingState.selectedGroup = botResponse.selectedGroup;
        onboardingState.completedAt = new Date();
        
        // הצטרפות לקבוצה
        if (botResponse.joinGroup) {
          const group = await Group.findById(botResponse.selectedGroup);
          if (group) {
            const isMember = group.members.some(member => member.userId.toString() === userId.toString());
            
            if (!isMember) {
              group.members.push({
                userId,
                joinDate: new Date(),
                role: 'member',
                activityScore: 0
              });
              
              await group.save();
              
              // רישום לוג
              loggingService.logActivity('USER_JOINED_GROUP_VIA_BOT', {
                userId,
                groupId: group._id,
                groupName: group.name
              });
            }
          }
        }
      }
      
      await onboardingState.save();
      
      return res.status(200).json({
        success: true,
        data: {
          message: {
            sender: 'bot',
            content: botResponse.message,
            sentAt: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error sending personal message:', error);
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בשליחת ההודעה',
        error: error.message
      });
    }
  }
  
  /**
   * עיבוד תשובת הבוט באמצעות AI
   * @private
   */
  async _processBotResponse(onboardingState, userMessage, user) {
    try {
      // לוגיקה פנימית של הבוט, תוך שימוש ב-AI
      const stage = onboardingState.stage;
      
      // בשלב ראשוני, התחלת תהליך השאלות
      if (stage === 'initial') {
        return {
          message: 'נעים מאוד להכיר! כדי לעזור לי למצוא את הקבוצה המתאימה ביותר עבורך, אשאל אותך כמה שאלות קצרות. האם את/ה מחפש/ת קבוצת תמיכה, קבוצת פעילות חברתית, או קבוצת תחומי עניין?',
          newStage: 'needs_assessment',
          nextQuestion: 1,
          questionData: {
            id: 'group_type',
            question: 'סוג הקבוצה המבוקשת'
          }
        };
      }
      
      // שלב הערכת צרכים
      if (stage === 'needs_assessment') {
        // ניתוח הטקסט והבנת תשובת המשתמש באמצעות AI
        const groupType = await aiService.analyzeGroupTypePreference(userMessage);
        
        return {
          message: `תודה! ${getGroupTypeResponse(groupType)}\n\nכעת, האם תוכל/י לספר לי באיזור גיאוגרפי את/ה נמצא/ת? זה יעזור לי למצוא קבוצות קרובות אליך.`,
          newStage: 'interests',
          nextQuestion: 2,
          questionData: {
            id: 'location',
            question: 'אזור גיאוגרפי'
          }
        };
      }
      
      // שלב תחומי עניין
      if (stage === 'interests') {
        // שאלה ראשונה בשלב זה - מיקום
        if (onboardingState.currentQuestion === 2) {
          // ניתוח המיקום באמצעות AI
          const location = await aiService.analyzeLocation(userMessage);
          
          return {
            message: `מצוין! אני אחפש קבוצות באזור ${location}.\n\nספר/י לי על תחומי העניין שלך או נושאים שהיית רוצה לדבר עליהם בקבוצה?`,
            nextQuestion: 3,
            questionData: {
              id: 'interests',
              question: 'תחומי עניין'
            }
          };
        }
        
        // שאלה שנייה בשלב זה - תחומי עניין
        if (onboardingState.currentQuestion === 3) {
          // ניתוח תחומי העניין באמצעות AI
          const interests = await aiService.analyzeInterests(userMessage);
          
          return {
            message: `תודה על השיתוף! אני מבין שאת/ה מתעניין/ת ב${interests.join(', ')}.\n\nהאם היית מעדיף/ה קבוצה קטנה ואינטימית או קבוצה גדולה יותר?`,
            newStage: 'preferences',
            nextQuestion: 4,
            questionData: {
              id: 'group_size',
              question: 'העדפת גודל קבוצה'
            }
          };
        }
      }
      
      // שלב העדפות נוספות
      if (stage === 'preferences') {
        // ניתוח העדפת גודל הקבוצה
        const sizePreference = await aiService.analyzeGroupSizePreference(userMessage);
        
        // קבלת המלצות קבוצות מותאמות אישית
        const recommendedGroups = await this._getRecommendedGroups(
          onboardingState.responses, 
          sizePreference,
          user
        );
        
        // הכנת הודעת המלצה
        let recommendationMessage = 'בהתבסס על המידע שסיפקת, הנה הקבוצות שעשויות להתאים לך:\n\n';
        
        const recommendations = recommendedGroups.map((group, index) => {
          recommendationMessage += `${index + 1}. **${group.name}** - ${group.description}\n`;
          return {
            groupId: group._id,
            score: group.matchScore,
            reason: group.matchReason
          };
        });
        
        recommendationMessage += '\nהאם אחת מהקבוצות האלה נשמעת מתאימה? אם כן, אנא ציין/י את המספר שלה. אם לא, אשמח להציע לך אפשרויות נוספות.';
        
        return {
          message: recommendationMessage,
          newStage: 'recommendations',
          nextQuestion: 5,
          questionData: {
            id: 'group_selection',
            question: 'בחירת קבוצה'
          },
          recommendations
        };
      }
      
      // שלב בחירת קבוצה מומלצת
      if (stage === 'recommendations') {
        // ניתוח בחירת הקבוצה של המשתמש
        const selectedGroupIndex = await aiService.analyzeGroupSelection(
          userMessage, 
          onboardingState.recommendations.length
        );
        
        if (selectedGroupIndex >= 0 && selectedGroupIndex < onboardingState.recommendations.length) {
          const selectedGroup = onboardingState.recommendations[selectedGroupIndex].groupId;
          
          return {
            message: `מצוין! נרשמת לקבוצה "${selectedGroup.name}".\n\nאנו מאמינים שתמצא/י ערך רב בקבוצה זו. משתמשים אחרים בקבוצה יקבלו התראה על הצטרפותך בקרוב.\n\nאם תרצה/י לדבר איתי בעתיד או לקבל עזרה נוספת, אל תהסס/י לפנות. אני כאן כדי לעזור!`,
            newStage: 'completed',
            selectedGroup: selectedGroup._id,
            joinGroup: true
          };
        } else {
          // המשתמש לא בחר קבוצה מהרשימה, נציע חיפוש נוסף
          return {
            message: 'נראה שלא מצאת קבוצה מתאימה מהרשימה. אשמח להציע לך קבוצות נוספות. האם תוכל/י לתת לי מידע נוסף על מה שאת/ה מחפש/ת?',
            nextQuestion: 6,
            questionData: {
              id: 'additional_preferences',
              question: 'העדפות נוספות'
            }
          };
        }
      }
      
      // טיפול בשיחה לאחר השלמת האיפיון
      if (stage === 'completed') {
        return {
          message: 'שמח/ה לראות אותך שוב! אם יש לך שאלות נוספות או אם את/ה מעוניין/ת למצוא קבוצה נוספת, אשמח לעזור. איך אוכל לסייע לך הפעם?'
        };
      }
      
      // ברירת מחדל אם לא זוהה שלב ספציפי
      return {
        message: 'תודה על ההודעה! האם אוכל לעזור לך במשהו נוסף?'
      };
      
    } catch (error) {
      console.error('Error processing bot response:', error);
      return {
        message: 'אירעה שגיאה בעיבוד התשובה. אנא נסה שוב מאוחר יותר.'
      };
    }
  }
  
  /**
   * קבלת קבוצות מומלצות למשתמש
   * @private
   */
  async _getRecommendedGroups(responses, sizePreference, user) {
    try {
      // חילוץ תשובות המשתמש
      const typeResponse = responses.find(r => r.questionId === 'group_type');
      const locationResponse = responses.find(r => r.questionId === 'location');
      const interestsResponse = responses.find(r => r.questionId === 'interests');
      
      // ניתוח תשובות באמצעות AI
      const groupType = typeResponse ? await aiService.analyzeGroupTypePreference(typeResponse.answer) : null;
      const location = locationResponse ? await aiService.analyzeLocation(locationResponse.answer) : null;
      const interests = interestsResponse ? await aiService.analyzeInterests(interestsResponse.answer) : [];
      
      // שאילתת חיפוש למסד הנתונים
      const query = {};
      
      if (groupType) {
        query.type = groupType;
      }
      
      if (location) {
        query['location.city'] = location;
      }
      
      // חיפוש קבוצות מתאימות
      let groups = await Group.find(query).limit(10);
      
      // מיון קבוצות לפי רלוונטיות
      groups = groups.map(group => {
        // חישוב ציון התאמה
        let matchScore = 0;
        let matchReason = '';
        
        // התאמת סוג
        if (group.type === groupType) {
          matchScore += 5;
          matchReason += 'סוג הקבוצה תואם את העדפותיך. ';
        }
        
        // התאמת מיקום
        if (group.location && group.location.city === location) {
          matchScore += 3;
          matchReason += 'הקבוצה ממוקמת באזור שציינת. ';
        }
        
        // התאמת תחומי עניין
        const matchingInterests = group.tags.filter(tag => 
          interests.some(interest => tag.toLowerCase().includes(interest.toLowerCase()))
        );
        
        if (matchingInterests.length > 0) {
          matchScore += matchingInterests.length * 2;
          matchReason += `הקבוצה עוסקת בנושאים שמעניינים אותך: ${matchingInterests.join(', ')}. `;
        }
        
        // התאמת גודל
        if (sizePreference === 'small' && group.members.length < 20) {
          matchScore += 2;
          matchReason += 'זוהי קבוצה קטנה ואינטימית. ';
        } else if (sizePreference === 'large' && group.members.length >= 20) {
          matchScore += 2;
          matchReason += 'זוהי קבוצה גדולה ומגוונת. ';
        }
        
        return {
          ...group.toObject(),
          matchScore,
          matchReason: matchReason || 'קבוצה זו עשויה להתאים לך.'
        };
      });
      
      // מיון לפי ציון התאמה
      groups.sort((a, b) => b.matchScore - a.matchScore);
      
      // החזרת עד 3 קבוצות מומלצות
      return groups.slice(0, 3);
    } catch (error) {
      console.error('Error getting recommended groups:', error);
      throw error;
    }
  }
}

/**
 * פונקציית עזר - תשובה מותאמת לסוג הקבוצה המבוקש
 */
function getGroupTypeResponse(groupType) {
  switch (groupType) {
    case 'support':
      return 'אני רואה שאת/ה מחפש/ת קבוצת תמיכה. אלה קבוצות שמספקות מרחב בטוח לשיתוף ותמיכה הדדית.';
    case 'activity':
      return 'אני רואה שאת/ה מחפש/ת קבוצת פעילות חברתית. אלה קבוצות שמתמקדות ביצירת קשרים חברתיים דרך פעילויות משותפות.';
    case 'interest':
      return 'אני רואה שאת/ה מחפש/ת קבוצת תחומי עניין. אלה קבוצות שמתמקדות בנושאים ספציפיים או תחביבים משותפים.';
    default:
      return 'תודה על המידע. אני אחפש קבוצות שיתאימו להעדפותיך.';
  }
}

module.exports = new ChatController();
