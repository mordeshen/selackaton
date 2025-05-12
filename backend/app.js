const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// יצירת אפליקציית Express
const app = express();

// ייבוא הניתובים
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const eventRoutes = require('./routes/events');
const invitationRoutes = require('./routes/invitations');
const chatRoutes = require('./routes/chats');

// הגדרות Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API מערכת שחרור',
      version: '1.0.0',
      description: 'API למערכת ניהול קבוצות WhatsApp למניעת אלימות במשפחה',
      contact: {
        name: 'צוות שחרור',
        email: 'contact@shichrur.org'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'שרת פיתוח'
      },
      {
        url: 'https://api.shichrur.org',
        description: 'שרת ייצור'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './models/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// ניתובים
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/events', eventRoutes);

// ניתוב ברירת מחדל
app.get('/', (req, res) => {
  res.status(200).json({ message: 'ברוכים הבאים ל-API של מערכת שחרור' });
});

// טיפול בשגיאות
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'שגיאת שרת פנימית',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
