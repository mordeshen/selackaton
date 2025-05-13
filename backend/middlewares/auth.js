// backend/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT tokens
 */
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'אימות נכשל. אנא התחבר מחדש' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with this id and token
    const user = await User.findOne({ 
      _id: decoded._id,
      'tokens.token': token
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Add token and user to request object
    req.token = token;
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(401).json({ message: 'אימות נכשל. אנא התחבר מחדש' });
  }
};

module.exports = auth;
