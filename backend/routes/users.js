const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/admin');

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: התחברות למערכת וקבלת טוקן
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: התחברות בוצעה בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: טוקן JWT לאימות
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: פרטי התחברות שגויים
 *       403:
 *         description: המשתמש חסום
 *       500:
 *         description: שגיאת שרת
 */
router.post('/login', userController.loginUser);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: קבלת פרטי המשתמש המחובר
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: פרטי המשתמש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     groups:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Group'
 *                     messageStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         lastWeek:
 *                           type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.get('/profile', auth, userController.getUserProfile);

/**
 * @swagger
 * /api/users/profile/{id}:
 *   get:
 *     summary: קבלת פרטי משתמש לפי מזהה
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה המשתמש
 *     responses:
 *       200:
 *         description: פרטי המשתמש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     groups:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Group'
 *                     messageStats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         lastWeek:
 *                           type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאה לצפות בפרטי המשתמש המבוקש
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.get('/profile/:id', auth, userController.getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: עדכון פרטי המשתמש המחובר
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               city:
 *                 type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               profilePic:
 *                 type: string
 *               bio:
 *                 type: string
 *               needsSupport:
 *                 type: boolean
 *               password:
 *                 type: string
 *                 description: סיסמה חדשה (אופציונלי)
 *     responses:
 *       200:
 *         description: פרטי המשתמש עודכנו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: נתונים שגויים
 *       401:
 *         description: המשתמש לא מחובר
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.put('/profile', auth, userController.updateUserProfile);

/**
 * @swagger
 * /api/users/profile/{id}:
 *   put:
 *     summary: עדכון פרטי משתמש לפי מזהה (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה המשתמש
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               city:
 *                 type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               profilePic:
 *                 type: string
 *               bio:
 *                 type: string
 *               needsSupport:
 *                 type: boolean
 *               password:
 *                 type: string
 *                 description: סיסמה חדשה (אופציונלי)
 *     responses:
 *       200:
 *         description: פרטי המשתמש עודכנו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: נתונים שגויים
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאה לעדכן את המשתמש המבוקש
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.put('/profile/:id', auth, userController.updateUserProfile);

/**
 * @swagger
 * /api/users/groups:
 *   get:
 *     summary: קבלת הקבוצות של המשתמש המחובר
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: הקבוצות של המשתמש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                       whatsappId:
 *                         type: string
 *                       lastMonthMessages:
 *                         type: integer
 *                       memberCount:
 *                         type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       500:
 *         description: שגיאת שרת
 */
router.get('/groups', auth, userController.getUserGroups);

/**
 * @swagger
 * /api/users/groups/join:
 *   post:
 *     summary: הצטרפות המשתמש המחובר לקבוצה
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               groupId:
 *                 type: string
 *                 description: מזהה הקבוצה אליה רוצים להצטרף
 *     responses:
 *       200:
 *         description: המשתמש הצטרף לקבוצה בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     group:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *       400:
 *         description: המשתמש כבר חבר בקבוצה
 *       401:
 *         description: המשתמש לא מחובר
 *       404:
 *         description: הקבוצה לא נמצאה
 *       500:
 *         description: שגיאת שרת
 */
router.post('/groups/join', auth, userController.joinGroup);

/**
 * @swagger
 * /api/users/groups/{groupId}:
 *   delete:
 *     summary: עזיבת קבוצה על ידי המשתמש המחובר
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה הקבוצה אותה רוצים לעזוב
 *     responses:
 *       200:
 *         description: המשתמש עזב את הקבוצה בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: המשתמש אינו חבר בקבוצה
 *       401:
 *         description: המשתמש לא מחובר
 *       404:
 *         description: הקבוצה לא נמצאה
 *       500:
 *         description: שגיאת שרת
 */
router.delete('/groups/:groupId', auth, userController.leaveGroup);

/**
 * @swagger
 * /api/users/alerts:
 *   get:
 *     summary: קבלת התראות עבור המשתמש המחובר
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: מספר העמוד
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: מספר פריטים בעמוד
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: סינון לפי רמת חומרה
 *     responses:
 *       200:
 *         description: התראות המשתמש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alert'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       500:
 *         description: שגיאת שרת
 */
router.get('/alerts', auth, userController.getUserAlerts);

/**
 * @swagger
 * /api/users/alerts/{id}:
 *   get:
 *     summary: קבלת התראות עבור משתמש לפי מזהה (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה המשתמש
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: מספר העמוד
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: מספר פריטים בעמוד
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: סינון לפי רמת חומרה
 *     responses:
 *       200:
 *         description: התראות המשתמש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     alerts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Alert'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאה לצפות בהתראות של המשתמש המבוקש
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.get('/alerts/:id', auth, userController.getUserAlerts);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: קבלת רשימת משתמשים פעילים (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: מספר העמוד
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: מספר פריטים בעמוד
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: lastActivity
 *           enum: [name, lastLogin, lastActivity, role, status]
 *         description: שדה המיון
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *         description: סדר המיון
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked]
 *         description: סינון לפי סטטוס
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *         description: סינון לפי תפקיד
 *     responses:
 *       200:
 *         description: רשימת המשתמשים נשלפה בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                           lastActivity:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאת מנהל
 *       500:
 *         description: שגיאת שרת
 */
router.get('/', auth, admin, userController.getActiveUsers);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: חיפוש משתמשים (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: ביטוי החיפוש (לפחות 2 תווים)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: מספר העמוד
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: מספר פריטים בעמוד
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, blocked]
 *         description: סינון לפי סטטוס
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *         description: סינון לפי תפקיד
 *     responses:
 *       200:
 *         description: תוצאות החיפוש נשלפו בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           lastLogin:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       400:
 *         description: ביטוי חיפוש קצר מדי
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאת מנהל
 *       500:
 *         description: שגיאת שרת
 */
router.get('/search', auth, admin, userController.searchUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: מחיקת משתמש (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה המשתמש למחיקה
 *     responses:
 *       200:
 *         description: המשתמש נמחק בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: לא ניתן למחוק את המשתמש הנוכחי
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאת מנהל
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.delete('/:id', auth, admin, userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/status:
 *   put:
 *     summary: עדכון סטטוס משתמש (דורש הרשאת מנהל)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: מזהה המשתמש
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, blocked]
 *                 description: הסטטוס החדש
 *     responses:
 *       200:
 *         description: סטטוס המשתמש עודכן בהצלחה
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: סטטוס לא תקין או ניסיון לעדכן את המשתמש הנוכחי
 *       401:
 *         description: המשתמש לא מחובר
 *       403:
 *         description: אין הרשאת מנהל
 *       404:
 *         description: משתמש לא נמצא
 *       500:
 *         description: שגיאת שרת
 */
router.put('/:id/status', auth, admin, userController.updateUserStatus);

router.post('/register-with-invitation', userController.registerWithInvitation);


module.exports = router;
