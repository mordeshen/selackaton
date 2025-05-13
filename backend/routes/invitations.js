// backend/routes/invitations.js
const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

// יצירת הזמנה חדשה (דורש הרשאת מנהל)
router.post('/', auth, admin, invitationController.createInvitation);

// בדיקת תוקף הזמנה
router.get('/:code/validate', invitationController.validateInvitation);

router.get('/:code/qr', invitationController.getInvitationQR);

module.exports = router;
