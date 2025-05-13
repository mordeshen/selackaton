const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

// ניתובים ציבוריים
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventDetails);

// ניתובים מאובטחים (דורשים אימות)
router.post('/', auth, eventController.createEvent);
router.put('/:id', auth, eventController.updateEvent);
router.delete('/:id', auth, eventController.deleteEvent);

// ניתובים להרשמה לאירועים
router.post('/:id/register', auth, eventController.registerForEvent);
router.delete('/:id/register', auth, eventController.cancelRegistration);

// ניתובים להמלצות אירועים
router.get('/recommended', auth, eventController.getRecommendedEvents);

// ניתובים למנהלים בלבד
router.post('/refresh-external', auth, admin, eventController.refreshExternalEvents);

module.exports = router;
