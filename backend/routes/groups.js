const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

// ניתובים ציבוריים
router.get('/', groupController.getGroups);
router.get('/:id', groupController.getGroupDetails);

// ניתובים מאובטחים (דורשים אימות)
router.post('/', auth, admin, groupController.createGroup);
router.put('/:id', auth, admin, groupController.updateGroup);
router.delete('/:id', auth, admin, groupController.deleteGroup);

// ניתובים לניהול חברי קבוצה
router.get('/:id/members', auth, groupController.getGroupMembers);
router.post('/:id/members', auth, admin, groupController.addMember);
router.delete('/:id/members/:userId', auth, admin, groupController.removeMember);
router.put('/:id/members/:userId/role', auth, admin, groupController.updateMemberRole);

// ניתובים להודעות קבוצה
router.get('/:id/messages', auth, groupController.getGroupMessages);
router.post('/:id/messages', auth, groupController.sendMessage);

// ניתובים לסטטיסטיקות וניטור קבוצה
router.get('/:id/statistics', auth, admin, groupController.getGroupStatistics);
router.get('/:id/activity', auth, admin, groupController.getGroupActivity);

// ניתובים לקבוצות המלצות
router.get('/recommended', auth, groupController.getRecommendedGroups);
router.get('/city/:city', auth, groupController.getGroupsByCity);
router.get('/type/:type', auth, groupController.getGroupsByType);

module.exports = router;
