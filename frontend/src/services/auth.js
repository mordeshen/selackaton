import axios from 'axios';
import jwtDecode from 'jwt-decode';

/**
 * שירות אימות והרשאות - מספק פונקציות לניהול תהליכי אימות והרשאות
 */
class AuthService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    this.tokenKey = 'shichrur_auth_token';
    this.refreshTokenKey = 'shichrur_refresh_token';
    this.userKey = 'shichrur_user';
  }

  /**
   * התחברות למערכת
   * @param {string} email - כתובת אימייל
   * @param {string} password - סיסמה
   * @returns {Promise} - אישור התחברות ונתוני משתמש
   */
  async login(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email,
        password,
      });

      const { token, refreshToken, user } = response.data;

      // שמירת נתוני אימות בלוקל סטורג'
      this.setToken(token);
      this.setRefreshToken(refreshToken);
      this.setUser(user);

      return user;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * יציאה מהמערכת
   */
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    
    // ניתן להוסיף גם קריאה לשרת לביטול תוקף הטוקן
    try {
      axios.post(`${this.baseURL}/auth/logout`);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  /**
   * הרשמה למערכת
   * @param {Object} userData - נתוני משתמש חדש
   * @returns {Promise} - אישור הרשמה ונתוני משתמש
   */
  async register(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/register`, userData);
      
      const { token, refreshToken, user } = response.data;

      // שמירת נתוני אימות בלוקל סטורג'
      this.setToken(token);
      this.setRefreshToken(refreshToken);
      this.setUser(user);

      return user;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * חידוש טוקן
   * @returns {Promise<boolean>} - האם החידוש הצליח
   */
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/refresh-token`, {
        refreshToken,
      });

      const { token, newRefreshToken } = response.data;

      this.setToken(token);
      
      if (newRefreshToken) {
        this.setRefreshToken(newRefreshToken);
      }

      return true;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * שינוי סיסמה
   * @param {string} currentPassword - סיסמה נוכחית
   * @param {string} newPassword - סיסמה חדשה
   * @returns {Promise} - אישור שינוי סיסמה
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post(
        `${this.baseURL}/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Change password error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * איפוס סיסמה - שליחת מייל
   * @param {string} email - אימייל המשתמש
   * @returns {Promise} - אישור שליחת מייל
   */
  async forgotPassword(email) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
        email,
      });

      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * איפוס סיסמה - קביעת סיסמה חדשה
   * @param {string} token - טוקן איפוס סיסמה
   * @param {string} newPassword - סיסמה חדשה
   * @returns {Promise} - אישור איפוס סיסמה
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await axios.post(`${this.baseURL}/auth/reset-password`, {
        token,
        newPassword,
      });

      return response.data;
    } catch (error) {
      console.error('Reset password error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * בדיקת תקפות טוקן
   * @returns {boolean} - האם הטוקן תקף
   */
  isTokenValid() {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      return decodedToken.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * בדיקה אם המשתמש מחובר
   * @returns {boolean} - האם המשתמש מחובר
   */
  isAuthenticated() {
    return this.isTokenValid();
  }

  /**
   * קבלת נתוני המשתמש המחובר
   * @returns {Object|null} - נתוני המשתמש או null אם אינו מחובר
   */
  getCurrentUser() {
    if (!this.isAuthenticated()) {
      return null;
    }

    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * עדכון נתוני המשתמש המחובר בלוקל סטורג'
   * @param {Object} userData - נתוני משתמש מעודכנים
   */
  updateCurrentUser(userData) {
    if (!userData) return;
    
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const updatedUser = { ...currentUser, ...userData };
    this.setUser(updatedUser);
  }

  /**
   * בדיקה אם למשתמש יש הרשאה מסוימת
   * @param {string|Array} permission - הרשאה או מערך הרשאות לבדיקה
   * @returns {boolean} - האם יש למשתמש את ההרשאה
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    
    if (!user || !user.permissions) {
      return false;
    }

    if (Array.isArray(permission)) {
      return permission.some(p => user.permissions.includes(p));
    }
    
    return user.permissions.includes(permission);
  }

  /**
   * בדיקה אם המשתמש הוא בעל תפקיד מסוים
   * @param {string|Array} role - תפקיד או מערך תפקידים לבדיקה
   * @returns {boolean} - האם המשתמש בעל התפקיד
   */
  hasRole(role) {
    const user = this.getCurrentUser();
    
    if (!user || !user.roles) {
      return false;
    }

    if (Array.isArray(role)) {
      return role.some(r => user.roles.includes(r));
    }
    
    return user.roles.includes(role);
  }

  /**
   * שמירת טוקן אימות בלוקל סטורג'
   * @param {string} token - טוקן אימות
   */
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * קבלת טוקן אימות מלוקל סטורג'
   * @returns {string|null} - טוקן אימות
   */
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * שמירת טוקן רענון בלוקל סטורג'
   * @param {string} refreshToken - טוקן רענון
   */
  setRefreshToken(refreshToken) {
    localStorage.setItem(this.refreshTokenKey, refreshToken);
  }

  /**
   * קבלת טוקן רענון מלוקל סטורג'
   * @returns {string|null} - טוקן רענון
   */
  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /**
   * שמירת נתוני משתמש בלוקל סטורג'
   * @param {Object} user - נתוני משתמש
   */
  setUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
}

// יצירת מופע יחיד של שירות האימות וייצוא שלו
const authService = new AuthService();
export default authService;