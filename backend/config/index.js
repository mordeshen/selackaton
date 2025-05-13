// backend/config/index.js
require('dotenv').config();

// פונקציה לבדיקה וטעינה של Firebase service account
const loadFirebaseServiceAccount = () => {
  // ברירת מחדל - אובייקט דמה תקף עבור firebase
  const dummyAccount = {
    type: 'service_account',
    project_id: 'dummy-project'
  };
  
  try {
    // ניסיון לטעון מתוך משתנה סביבה
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        console.log('FIREBASE_SERVICE_ACCOUNT env variable found');
        
        // אם זה כבר אובייקט
        if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'object') {
          console.log('FIREBASE_SERVICE_ACCOUNT is already an object');
          return process.env.FIREBASE_SERVICE_ACCOUNT;
        }
        
        // רכישת ציטוטים שברירי - פתרון לבעיות ציטוט נפוצות
        let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (jsonStr.startsWith("'") && jsonStr.endsWith("'")) {
          jsonStr = jsonStr.substring(1, jsonStr.length - 1);
        }
        
        // ניסיון לפרש JSON
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', parseError);
        console.log('Using dummy firebase service account instead');
        return dummyAccount;
      }
    }
    
    // ניסיון לטעון מקובץ, אם קיים
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      try {
        console.log('Attempting to load service account from:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        return require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      } catch (pathError) {
        console.error('Error loading service account from path:', pathError);
        return dummyAccount;
      }
    }
    
    console.log('No Firebase service account configuration found, using dummy account');
    return dummyAccount;
  } catch (error) {
    console.error('Error in loadFirebaseServiceAccount:', error);
    return dummyAccount;
  }
};

module.exports = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/shavim',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    jwtSecret: process.env.JWT_SECRET
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v15.0',
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  },
  firebase: {
    serviceAccount: loadFirebaseServiceAccount(),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  }
};