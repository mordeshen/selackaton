// services/security.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

class SecurityService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.secretKey = Buffer.from(config.security.encryptionKey, 'hex');
    this.jwtSecret = config.security.jwtSecret;
  }

  // הצפנת מידע רגיש
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      // החזרת מידע מוצפן בפורמט: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // פענוח מידע מוצפן
  decrypt(encryptedText) {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // אנונימיזציה של נתונים אישיים
  anonymizeData(userData) {
    const anonymized = { ...userData };
    
    // הסרת שדות מזהים
    delete anonymized.phoneNumber;
    delete anonymized.name;
    
    // אנונימיזציה של מיקום
    if (anonymized.profile && anonymized.profile.location) {
      // עיגול קואורדינטות למדויקות נמוכה יותר
      if (anonymized.profile.location.coordinates) {
        anonymized.profile.location.coordinates.lat = 
          Math.round(anonymized.profile.location.coordinates.lat * 10) / 10;
        anonymized.profile.location.coordinates.long = 
          Math.round(anonymized.profile.location.coordinates.long * 10) / 10;
      }
      
      // הסרת שם עיר מדויק
      if (anonymized.profile.location.city) {
        anonymized.profile.location.region = this.getRegionFromCity(anonymized.profile.location.city);
        delete anonymized.profile.location.city;
      }
    }
    
    // הסרת מידע רגשי מפורט
    if (anonymized.conversationData) {
      delete anonymized.conversationData;
    }
    
    return anonymized;
  }

  getRegionFromCity(city) {
    // המרת שם עיר לאזור כללי יותר
    // לוגיקה להמרת ערים לאזורים
    const cityToRegionMap = {
      'תל אביב': 'מרכז',
      'רמת גן': 'מרכז',
      'גבעתיים': 'מרכז',
      'חיפה': 'צפון',
      'קריית שמונה': 'צפון',
      'באר שבע': 'דרום',
      'אשדוד': 'דרום',
      'ירושלים': 'ירושלים',
      'בית שמש': 'ירושלים'
      // וכן הלאה
    };
    
    return cityToRegionMap[city] || 'אחר';
  }

  // יצירת JWT לאימות
  generateToken(user) {
    const payload = {
      userId: user._id,
      role: user.role || 'user'
    };
    
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  // אימות JWT 
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Invalid token');
    }
  }

  // זיהוי תוכן לא ראוי בהודעות
  async scanMessageContent(text) {
    // רשימת מילות מפתח לסינון ראשוני
    const sensitiveKeywords = [
      'אלימות', 'התאבדות', 'הרג', 'נשק', 'פגיעה', 'איום'
      // מילים נוספות
    ];
    
    // בדיקה ראשונית למילות מפתח
    const containsSensitiveWords = sensitiveKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    if (containsSensitiveWords) {
      // זיהוי ראשוני - יש להעביר לבדיקה מעמיקה יותר
      return {
        hasSensitiveContent: true,
        riskLevel: 'medium',
        reason: 'הודעה מכילה מילות מפתח רגישות',
        needsReview: true
      };
    }
    
    // ניתן להעביר לבדיקה מתקדמת יותר באמצעות AI, למשל:
    // const aiAnalysis = await AIService.analyzeContentSafety(text);
    
    return {
      hasSensitiveContent: false,
      riskLevel: 'low',
      reason: '',
      needsReview: false
    };
  }

  // פונקציה לבקרת גישה על פי תפקיד
  checkPermission(userRole, requiredRole) {
    const roleHierarchy = {
      'admin': 3,
      'moderator': 2,
      'volunteer': 1,
      'user': 0
    };
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}

module.exports = new SecurityService();