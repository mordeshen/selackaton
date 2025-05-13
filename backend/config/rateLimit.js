// config/rateLimit.config.js
module.exports = {
    api: {
      windowMs: 15 * 60 * 1000, // 15 דקות
      max: 100, // מקסימום 100 בקשות לכל IP בחלון הזמן
      standardHeaders: true, // הוספת headers סטנדרטיים
      message: {
        status: 429,
        error: 'יותר מדי בקשות, אנא נסה שוב מאוחר יותר'
      }
    },
    login: {
      windowMs: 60 * 60 * 1000, // שעה
      max: 5, // מקסימום 5 ניסיונות התחברות שגויים
      standardHeaders: true,
      message: {
        status: 429,
        error: 'יותר מדי ניסיונות התחברות כושלים, אנא נסה שוב בעוד שעה'
      }
    },
    whatsapp: {
      windowMs: 60 * 1000, // דקה
      max: 20, // מקסימום 20 הודעות WhatsApp בדקה
      standardHeaders: true,
      message: {
        status: 429,
        error: 'הגעת למגבלת שליחת ההודעות, אנא המתן מעט'
      }
    }
  };
  
  // app.js או middleware/rateLimit.js
  const rateLimit = require('express-rate-limit');
  const rateLimitConfig = require('../config/rateLimit.config');
  
  // הגדרת מגבלות כלליות לכל ה-API
  app.use('/api/', rateLimit(rateLimitConfig.api));
  
  // הגבלות ספציפיות לנתיבים מסוימים
  app.use('/api/auth/login', rateLimit(rateLimitConfig.login));
  app.use('/api/whatsapp/send', rateLimit(rateLimitConfig.whatsapp));