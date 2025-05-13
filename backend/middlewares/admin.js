// backend/middlewares/admin.js
/**
 * Middleware to check if a user has admin role
 * This middleware should be used after the auth middleware
 */
const admin = (req, res, next) => {
  try {
    // Check if user exists (should be added by auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'אימות נכשל. אנא התחבר מחדש' });
    }
    
    // Check if user has admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'אין לך הרשאה לבצע פעולה זו' });
    }
    
    next();
  } catch (error) {
    console.error('Admin authorization error:', error.message);
    res.status(500).json({ message: 'שגיאת שרת פנימית' });
  }
};

module.exports = admin;
