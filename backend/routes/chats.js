// backend/routes/chats.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const auth = require('../middlewares/auth');

// קבלת הצ'אט האישי
router.get('/personal', auth, chatController.getPersonalChat);

// שליחת הודעה בצ'אט האישי
router.post('/personal/message', auth, chatController.sendPersonalMessage);

module.exports = router;
