// services/whatsapp.js
const axios = require('axios');
const config = require('../config');
const TokenBucket = require('../utils/tokenBucket');


class WhatsAppService {
  constructor() {
    this.apiUrl = config.whatsapp.apiUrl;
    this.token = config.whatsapp.token;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    // הגדרת Token Bucket לניהול קצב הודעות
    this.messageBucket = new TokenBucket({
      capacity: 30,       // מקסימום 30 הודעות בו-זמנית
      fillRate: 1,        // תוספת של אסימון אחד כל שנייה
      fillInterval: 1000  // קצב מילוי הדלי בשניות (1000ms = 1s)
    });
        
    // קצב הודעות לכל קבוצה
    this.groupBuckets = new Map();
  }

  async sendTextMessage(to, text) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: text }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async createGroup(name, participants) {
    try {
      // הקמת קבוצת WhatsApp (יש להתאים לAPI הספציפי)
      const response = await axios.post(
        `${this.apiUrl}/groups`,
        {
          name: name,
          participants: participants // מערך מספרי טלפון
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating WhatsApp group:', error);
      throw error;
    }
  }



  /**
   * שולח הודעה לקבוצה עם בקרת קצב
   */
  async sendMessageToGroup(groupId, message, attachments = []) {
    try {
      // קבלת דלי אסימונים לקבוצה זו (או יצירת אחד חדש)
      if (!this.groupBuckets.has(groupId)) {
        this.groupBuckets.set(groupId, new TokenBucket({
          capacity: 10,      // מקסימום 10 הודעות לקבוצה 
          fillRate: 0.1,     // אסימון חדש כל 10 שניות
          fillInterval: 1000
        }));
      }
      
      const groupBucket = this.groupBuckets.get(groupId);
      
      // בדיקה האם ניתן לשלוח הודעה ברמת הקבוצה
      if (!groupBucket.consume(1)) {
        throw new Error(`Rate limit exceeded for group ${groupId}. Too many messages sent to this group.`);
      }
      
      // בדיקה ברמת המערכת הכללית
      if (!this.messageBucket.consume(1)) {
        throw new Error('System-wide rate limit exceeded. Too many messages across all groups.');
      }
      
      // המשך הקוד הקיים לשליחת ההודעה...
      // ...
      
    } catch (error) {
      logger.error('Error sending message to group', error);
      
      // אם השגיאה היא בגלל חריגת הקצב, נחזיר קוד מיוחד
      if (error.message.includes('Rate limit exceeded')) {
        return {
          success: false,
          rateLimitExceeded: true,
          retryAfter: Math.ceil(error.message.includes('group') ? 
                               10 : // שניות להמתנה ברמת הקבוצה
                               1)   // שניות להמתנה ברמת המערכת
        };
      }
      
      throw error;
    }
  }

  // קוד להתממשקות עם webhook
  handleIncomingMessage(body) {
    // לוגיקה לטיפול בהודעות נכנסות
    const messages = body.entry[0].changes[0].value.messages;
    if (messages && messages.length > 0) {
      return messages.map(msg => {
        return {
          from: msg.from,
          text: msg.text.body,
          timestamp: msg.timestamp,
          type: msg.type
        };
      });
    }
    return [];
  }
}

module.exports = new WhatsAppService();
