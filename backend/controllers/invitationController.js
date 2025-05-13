// backend/controllers/invitationController.js
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const crypto = require('crypto');
const QRCode = require('qrcode');


class InvitationController {
  // יצירת הזמנה חדשה
  async createInvitation(req, res) {
    try {
      // יצירת קוד הזמנה ייחודי
      const inviteCode = crypto.randomBytes(6).toString('hex');
      
      // שמירת ההזמנה במסד הנתונים
      const invitation = new Invitation({
        code: inviteCode,
        createdBy: req.user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // תוקף לשבוע
        active: true
      });
      
      await invitation.save();
      
      // יצירת URL להזמנה
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/onboarding/${inviteCode}`;
      
      return res.status(201).json({
        success: true,
        data: {
          inviteCode,
          inviteUrl,
          expiresAt: invitation.expiresAt
        },
        message: 'הזמנה נוצרה בהצלחה'
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה ביצירת ההזמנה',
        error: error.message
      });
    }
  }
  
  // בדיקת תוקף הזמנה
  async validateInvitation(req, res) {
    try {
      const { code } = req.params;
      
      const invitation = await Invitation.findOne({ 
        code,
        active: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'הזמנה לא תקפה או פגה תוקף'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { 
          isValid: true,
          createdBy: invitation.createdBy
        },
        message: 'הזמנה תקפה'
      });
    } catch (error) {
      console.error('Error validating invitation:', error);
      return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה בבדיקת ההזמנה',
        error: error.message
      });
    }
  }

  // הוספת מתודה ליצירת QR code
  async getInvitationQR(req, res) {
    try {
    const { code } = req.params;
    
    const invitation = await Invitation.findOne({ 
        code,
        active: true,
        expiresAt: { $gt: new Date() }
    });
    
    if (!invitation) {
        return res.status(404).json({
        success: false,
        message: 'הזמנה לא תקפה או פגה תוקף'
        });
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/onboarding/${code}`;
    
    // יצירת קוד QR כתמונת PNG
    const qrDataURL = await QRCode.toDataURL(inviteUrl);
    
    return res.status(200).json({
        success: true,
        data: {
        qrCode: qrDataURL,
        inviteUrl
        },
        message: 'קוד QR נוצר בהצלחה'
    });
    } catch (error) {
    console.error('Error generating QR code:', error);
    return res.status(500).json({
        success: false,
        message: 'אירעה שגיאה ביצירת קוד QR',
        error: error.message
    });
    }
  }
}

module.exports = new InvitationController();