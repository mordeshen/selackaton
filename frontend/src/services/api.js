import axios from 'axios';
import authService from './auth'; // צריך ליצור את הקובץ הזה

/**
 * שירות API - מספק פונקציות לביצוע קריאות API לשרת
 */
class ApiService {
  constructor() {
    // קביעת כתובת בסיס ל-API
    this.baseURL = process.env.REACT_APP_API_URL || '/api';
    
    // יצירת מופע axios עם הגדרות ברירת מחדל
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    // הגדרת interceptors להוספת טוקן אימות ולטיפול בשגיאות
    this.setupInterceptors();
  }
  
  /**
   * הגדרת interceptors עבור בקשות ותשובות
   */
  setupInterceptors() {
    // הוספת טוקן אימות לכל בקשה
    this.api.interceptors.request.use(
      (config) => {
        const token = authService.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // טיפול בשגיאות תשובה (כולל פג תוקף של טוקן)
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        // אם הטוקן פג תוקף (401), ניסיון התחדשות
        if (error.response && error.response.status === 401) {
          try {
            // ניסיון לחדש את הטוקן
            const refreshed = await authService.refreshToken();
            
            if (refreshed) {
              // ניסיון חוזר של הבקשה המקורית
              const token = authService.getToken();
              error.config.headers['Authorization'] = `Bearer ${token}`;
              return this.api(error.config);
            } else {
              // אם לא ניתן לחדש, הוצאת המשתמש מהמערכת
              authService.logout();
              window.location.href = '/login';
              return Promise.reject(error);
            }
          } catch (refreshError) {
            // במקרה של שגיאה בחידוש, הוצאת המשתמש מהמערכת
            authService.logout();
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * טיפול בשגיאות API
   * @param {Object} error - אובייקט שגיאה
   */
  handleError(error) {
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('Status:', error.response.status);
      
      // התאמת הודעות שגיאה למקרים מיוחדים
      switch (error.response.status) {
        case 400:
          console.error('Bad Request: Check the input data');
          break;
        case 401:
          console.error('Unauthorized: Authentication failed');
          break;
        case 403:
          console.error('Forbidden: Insufficient permissions');
          break;
        case 404:
          console.error('Not Found: Resource not found');
          break;
        case 500:
          console.error('Server Error: Internal server error');
          break;
        default:
          console.error(`Error status: ${error.response.status}`);
      }
    } else if (error.request) {
      // בקשה נשלחה אך לא התקבלה תשובה
      console.error('No Response Received:', error.request);
    } else {
      // תקלה בהגדרת הבקשה
      console.error('Request Error:', error.message);
    }
  }
  
  /**
   * קבלת נתונים מה-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {Object} params - פרמטרים לשאילתה
   * @returns {Promise} - תוצאת הבקשה
   */
  async get(endpoint, params = {}) {
    try {
      const response = await this.api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * שליחת נתונים ל-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {Object} data - נתונים לשליחה
   * @returns {Promise} - תוצאת הבקשה
   */
  async post(endpoint, data = {}) {
    try {
      const response = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * עדכון נתונים ב-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {Object} data - נתונים לעדכון
   * @returns {Promise} - תוצאת הבקשה
   */
  async put(endpoint, data = {}) {
    try {
      const response = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * עדכון חלקי של נתונים ב-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {Object} data - נתונים לעדכון
   * @returns {Promise} - תוצאת הבקשה
   */
  async patch(endpoint, data = {}) {
    try {
      const response = await this.api.patch(endpoint, data);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * מחיקת נתונים מה-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {Object} params - פרמטרים לשאילתה
   * @returns {Promise} - תוצאת הבקשה
   */
  async delete(endpoint, params = {}) {
    try {
      const response = await this.api.delete(endpoint, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * העלאת קבצים ל-API
   * @param {string} endpoint - נקודת קצה של ה-API
   * @param {FormData} formData - נתוני הטופס עם הקבצים
   * @param {function} onProgress - פונקציית callback להתקדמות ההעלאה
   * @returns {Promise} - תוצאת הבקשה
   */
  async uploadFiles(endpoint, formData, onProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
      
      // אם יש פונקציית התקדמות, הוספה לתצורה
      if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }
      
      const response = await this.api.post(endpoint, formData, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * API עבור משתמשים
   */
  users = {
    /**
     * התחברות למערכת
     * @param {Object} credentials - פרטי התחברות
     * @returns {Promise} - תוצאת הבקשה
     */
    login: (credentials) => this.post('/users/login', credentials),
    
    /**
     * הרשמה למערכת
     * @param {Object} userData - נתוני משתמש
     * @returns {Promise} - תוצאת הבקשה
     */
    register: (userData) => this.post('/users/register', userData),
    
    /**
     * קבלת פרופיל משתמש
     * @returns {Promise} - תוצאת הבקשה
     */
    getProfile: () => this.get('/users/profile'),
    
    /**
     * קבלת רשימת משתמשים
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - רשימת משתמשים
     */
    getAll: (params) => this.get('/users', params),
    
    /**
     * קבלת משתמש לפי מזהה
     * @param {string} id - מזהה המשתמש
     * @returns {Promise} - נתוני המשתמש
     */
    getById: (id) => this.get(`/users/${id}`),
    
    /**
     * יצירת משתמש חדש
     * @param {Object} userData - נתוני המשתמש החדש
     * @returns {Promise} - המשתמש שנוצר
     */
    create: (userData) => this.post('/users', userData),
    
    /**
     * עדכון פרטי משתמש
     * @param {string} id - מזהה המשתמש
     * @param {Object} userData - נתונים לעדכון
     * @returns {Promise} - המשתמש המעודכן
     */
    update: (id, userData) => this.put(`/users/${id}`, userData),
    
    /**
     * מחיקת משתמש
     * @param {string} id - מזהה המשתמש
     * @returns {Promise} - אישור המחיקה
     */
    delete: (id) => this.delete(`/users/${id}`),
    
    /**
     * קבלת קבוצות של משתמש
     * @param {string} id - מזהה המשתמש
     * @returns {Promise} - רשימת קבוצות המשתמש
     */
    getGroups: (id) => this.get(`/users/${id}/groups`),
    
    /**
     * קבלת היסטוריית פעילות של משתמש
     * @param {string} id - מזהה המשתמש
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - היסטוריית פעילות
     */
    getActivity: (id, params) => this.get(`/users/${id}/activity`, params),
    
    /**
     * קבלת התראות על משתמש
     * @param {string} id - מזהה המשתמש
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - התראות המשתמש
     */
    getAlerts: (id, params) => this.get(`/users/${id}/alerts`, params),
  };
  
  /**
   * API עבור קבוצות
   */
  groups = {
    /**
     * קבלת רשימת קבוצות
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - רשימת קבוצות
     */
    getAll: (params) => this.get('/groups', params),
    
    /**
     * קבלת קבוצה לפי מזהה
     * @param {string} id - מזהה הקבוצה
     * @returns {Promise} - נתוני הקבוצה
     */
    getById: (id) => this.get(`/groups/${id}`),
    
    /**
     * יצירת קבוצה חדשה
     * @param {Object} groupData - נתוני הקבוצה החדשה
     * @returns {Promise} - הקבוצה שנוצרה
     */
    create: (groupData) => this.post('/groups', groupData),
    
    /**
     * עדכון פרטי קבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {Object} groupData - נתונים לעדכון
     * @returns {Promise} - הקבוצה המעודכנת
     */
    update: (id, groupData) => this.put(`/groups/${id}`, groupData),
    
    /**
     * מחיקת קבוצה
     * @param {string} id - מזהה הקבוצה
     * @returns {Promise} - אישור המחיקה
     */
    delete: (id) => this.delete(`/groups/${id}`),
    
    /**
     * קבלת חברי קבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - רשימת חברי הקבוצה
     */
    getMembers: (id, params) => this.get(`/groups/${id}/members`, params),
    
    /**
     * הוספת משתמש לקבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {string} userId - מזהה המשתמש
     * @param {Object} data - נתונים נוספים
     * @returns {Promise} - אישור הוספה
     */
    addMember: (id, userId, data = {}) => this.post(`/groups/${id}/members/${userId}`, data),
    
    /**
     * הסרת משתמש מקבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {string} userId - מזהה המשתמש
     * @returns {Promise} - אישור הסרה
     */
    removeMember: (id, userId) => this.delete(`/groups/${id}/members/${userId}`),
    
    /**
     * שליחת הודעה לקבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {Object} messageData - נתוני ההודעה
     * @returns {Promise} - אישור שליחה
     */
    sendMessage: (id, messageData) => this.post(`/groups/${id}/messages`, messageData),
    
    /**
     * קבלת היסטוריית הודעות של קבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - היסטוריית הודעות
     */
    getMessages: (id, params) => this.get(`/groups/${id}/messages`, params),
    
    /**
     * קבלת אנליטיקה של קבוצה
     * @param {string} id - מזהה הקבוצה
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - נתוני אנליטיקה
     */
    getAnalytics: (id, params) => this.get(`/groups/${id}/analytics`, params),
  };
  
  /**
   * API עבור אירועים
   */
  events = {
    /**
     * קבלת רשימת אירועים
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - רשימת אירועים
     */
    getAll: (params) => this.get('/events', params),
    
    /**
     * קבלת אירוע לפי מזהה
     * @param {string} id - מזהה האירוע
     * @returns {Promise} - נתוני האירוע
     */
    getById: (id) => this.get(`/events/${id}`),
    
    /**
     * יצירת אירוע חדש
     * @param {Object} eventData - נתוני האירוע החדש
     * @returns {Promise} - האירוע שנוצר
     */
    create: (eventData) => this.post('/events', eventData),
    
    /**
     * עדכון פרטי אירוע
     * @param {string} id - מזהה האירוע
     * @param {Object} eventData - נתונים לעדכון
     * @returns {Promise} - האירוע המעודכן
     */
    update: (id, eventData) => this.put(`/events/${id}`, eventData),
    
    /**
     * מחיקת אירוע
     * @param {string} id - מזהה האירוע
     * @returns {Promise} - אישור המחיקה
     */
    delete: (id) => this.delete(`/events/${id}`),
    
    /**
     * קבלת קבוצות שמשתתפות באירוע
     * @param {string} id - מזהה האירוע
     * @returns {Promise} - רשימת קבוצות
     */
    getGroups: (id) => this.get(`/events/${id}/groups`),
    
    /**
     * שיתוף אירוע עם קבוצה
     * @param {string} id - מזהה האירוע
     * @param {string} groupId - מזהה הקבוצה
     * @returns {Promise} - אישור השיתוף
     */
    shareWithGroup: (id, groupId) => this.post(`/events/${id}/share/${groupId}`),
  };
  
  /**
   * API עבור התראות
   */
  alerts = {
    /**
     * קבלת רשימת התראות
     * @param {Object} params - פרמטרים לסינון וחיפוש
     * @returns {Promise} - רשימת התראות
     */
    getAll: (params) => this.get('/alerts', params),
    
    /**
     * קבלת התראה לפי מזהה
     * @param {string} id - מזהה ההתראה
     * @returns {Promise} - נתוני ההתראה
     */
    getById: (id) => this.get(`/alerts/${id}`),
    
    /**
     * יצירת התראה חדשה
     * @param {Object} alertData - נתוני ההתראה החדשה
     * @returns {Promise} - ההתראה שנוצרה
     */
    create: (alertData) => this.post('/alerts', alertData),
    
    /**
     * עדכון התראה
     * @param {string} id - מזהה ההתראה
     * @param {Object} alertData - נתונים לעדכון
     * @returns {Promise} - ההתראה המעודכנת
     */
    update: (id, alertData) => this.put(`/alerts/${id}`, alertData),
    
    /**
     * מחיקת התראה
     * @param {string} id - מזהה ההתראה
     * @returns {Promise} - אישור המחיקה
     */
    delete: (id) => this.delete(`/alerts/${id}`),
    
    /**
     * סימון התראה כנקראה
     * @param {string} id - מזהה ההתראה
     * @returns {Promise} - אישור סימון
     */
    markAsRead: (id) => this.patch(`/alerts/${id}/read`),
    
    /**
     * סימון כל ההתראות כנקראו
     * @returns {Promise} - אישור סימון
     */
    markAllAsRead: () => this.patch('/alerts/read-all'),
  };
  
  /**
   * API עבור אנליטיקה
   */
  analytics = {
    /**
     * קבלת נתוני מערכת כלליים
     * @param {Object} params - פרמטרים לסינון ותאריכים
     * @returns {Promise} - נתוני אנליטיקה
     */
    getSystemStats: (params) => this.get('/analytics/system', params),
    
    /**
     * קבלת נתוני פעילות משתמשים
     * @param {Object} params - פרמטרים לסינון ותאריכים
     * @returns {Promise} - נתוני פעילות
     */
    getUserActivity: (params) => this.get('/analytics/users/activity', params),
    
    /**
     * קבלת נתוני פעילות קבוצות
     * @param {Object} params - פרמטרים לסינון ותאריכים
     * @returns {Promise} - נתוני פעילות
     */
    getGroupActivity: (params) => this.get('/analytics/groups/activity', params),
    
    /**
     * קבלת נתוני אירועים
     * @param {Object} params - פרמטרים לסינון ותאריכים
     * @returns {Promise} - נתוני אירועים
     */
    getEventStats: (params) => this.get('/analytics/events', params),
    
    /**
     * קבלת נתוני התראות
     * @param {Object} params - פרמטרים לסינון ותאריכים
     * @returns {Promise} - נתוני התראות
     */
    getAlertStats: (params) => this.get('/analytics/alerts', params),
    
    /**
     * קבלת נתונים לדשבורד
     * @returns {Promise} - נתוני דשבורד
     */
    getDashboardData: () => this.get('/analytics/dashboard'),
  };
}

// יצירת מופע יחיד של שירות ה-API וייצוא שלו
const apiService = new ApiService();
export default apiService;