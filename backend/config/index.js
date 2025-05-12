// backend/config/index.js
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/shavim',
  jwtSecret: process.env.JWT_SECRET || 'yoursecretkey',
  jwtExpire: process.env.JWT_EXPIRE || '30d',
  nodeEnv: process.env.NODE_ENV || 'development',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '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',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
    jwtSecret: process.env.JWT_SECRET || 'yoursecretkey'
  },
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v15.0',
    token: process.env.WHATSAPP_TOKEN || 'your-whatsapp-token',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'your-phone-number-id'
  },
  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || {
      "type": "service_account",
      "project_id": "shavim-project",
      "private_key_id": "dummy-key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n",
      "client_email": "firebase-adminsdk-dummy@shavim-project.iam.gserviceaccount.com",
      "client_id": "000000000000000000000",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dummy%40shavim-project.iam.gserviceaccount.com"
    },
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://shavim-project.firebaseio.com'
  }
};
