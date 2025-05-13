import io from 'socket.io-client';
import authService from './auth';

/**
 * שירות תקשורת בזמן אמת - מספק פונקציות לקבלת עדכונים בזמן אמת דרך WebSockets
 */
class RealtimeService {
  constructor() {
    this.socket = null;
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.listeners = {};
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 שניות
  }

  /**
   * התחברות לשירות הזמן-אמת
   * @returns {Promise} - הבטחה שמתממשת כאשר ההתחברות מסתיימת
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected && this.socket) {
        return resolve(this.socket);
      }

      // נתק קודם אם קיים
      if (this.socket) {
        this.disconnect();
      }

      const token = authService.getToken();

      if (!token) {
        return reject(new Error('No auth token available'));
      }

      this.socket = io(this.baseURL, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      // טיפול באירועי התחברות
      this.socket.on('connect', () => {
        console.log('Realtime service connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      // טיפול בשגיאות התחברות
      this.socket.on('connect_error', (error) => {
        console.error('Realtime connection error:', error);
        
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
          this.disconnect();
        }
      });

      // טיפול בהתנתקות
      this.socket.on('disconnect', (reason) => {
        console.log('Realtime service disconnected:', reason);
        this.connected = false;
        
        // ניסיון להתחבר מחדש אם הסיבה אינה ניתוק יזום
        if (reason === 'io server disconnect') {
          // הניתוק היה יזום מהשרת, ננסה להתחבר מחדש ידנית
          setTimeout(() => {
            this.socket.connect();
          }, this.reconnectDelay);
        }
        // במקרים אחרים, הספרייה תנסה להתחבר מחדש אוטומטית
      });

      // טיפול בטוקן לא תקף
      this.socket.on('unauthorized', (error) => {
        console.error('Unauthorized realtime connection:', error);
        
        // ננסה לחדש את הטוקן ולהתחבר מחדש
        authService.refreshToken()
          .then(success => {
            if (success) {
              this.reconnect();
            } else {
              // אם חידוש הטוקן נכשל, ננתק
              this.disconnect();
              reject(new Error('Authentication failed'));
            }
          })
          .catch(err => {
            this.disconnect();
            reject(err);
          });
      });

      // רישום לאירועי מערכת
      this.setupSystemEvents();
    });
  }

  /**
   * ניתוק מהשירות
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.listeners = {};
  }

  /**
   * התחברות מחדש לשירות
   * @returns {Promise} - הבטחה שמתממשת כאשר ההתחברות מחדש מסתיימת
   */
  reconnect() {
    return this.connect();
  }

  /**
   * הגדרת אירועי מערכת פנימיים
   */
  setupSystemEvents() {
    if (!this.socket) return;

    // אירוע חידוש טוקן
    this.socket.on('refresh_token', async () => {
      const success = await authService.refreshToken();
      
      if (success) {
        // שליחת טוקן מעודכן לשרת
        this.socket.emit('token_refreshed', { token: authService.getToken() });
      } else {
        // אם חידוש הטוקן נכשל, ננתק
        this.disconnect();
      }
    });
  }

  /**
   * רישום להאזנה לאירוע
   * @param {string} eventName - שם האירוע
   * @param {function} callback - פונקציית callback לביצוע כאשר האירוע מתרחש
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  on(eventName, callback) {
    if (!this.connected) {
      this.connect().catch(err => console.error('Connection error:', err));
    }

    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }

    this.listeners[eventName].push(callback);
    
    if (this.socket) {
      this.socket.on(eventName, callback);
    }

    // החזרת פונקציה להסרת ההאזנה
    return () => this.off(eventName, callback);
  }

  /**
   * הסרת האזנה לאירוע
   * @param {string} eventName - שם האירוע
   * @param {function} callback - פונקציית ה-callback שנרשמה
   */
  off(eventName, callback) {
    if (!this.socket) return;

    this.socket.off(eventName, callback);
    
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter(
        (cb) => cb !== callback
      );
    }
  }

  /**
   * שליחת אירוע לשרת
   * @param {string} eventName - שם האירוע
   * @param {*} data - נתונים לשליחה עם האירוע
   * @returns {Promise} - הבטחה שמתממשת כאשר התקבל אישור מהשרת
   */
  emit(eventName, data) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.socket) {
        this.connect()
          .then(() => {
            this.socket.emit(eventName, data, (response) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          })
          .catch(reject);
      } else {
        this.socket.emit(eventName, data, (response) => {
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      }
    });
  }

  /**
   * רישום להאזנה לעדכוני התראות
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבלת התראה חדשה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onNewAlert(callback) {
    return this.on('new_alert', callback);
  }

  /**
   * רישום להאזנה לעדכוני קבוצות
   * @param {string} groupId - מזהה הקבוצה (אופציונלי - אם לא מצוין, מקבלים עדכונים לכל הקבוצות)
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבל עדכון קבוצה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onGroupUpdate(groupId, callback) {
    // אם לא צוין מזהה קבוצה, מאזינים לכל העדכונים
    if (typeof groupId === 'function') {
      callback = groupId;
      return this.on('group_update', callback);
    }
    
    // האזנה ספציפית לקבוצה
    const wrappedCallback = (data) => {
      if (data.groupId === groupId) {
        callback(data);
      }
    };
    
    return this.on('group_update', wrappedCallback);
  }

  /**
   * רישום להאזנה להודעות חדשות בקבוצה
   * @param {string} groupId - מזהה הקבוצה (אופציונלי - אם לא מצוין, מקבלים הודעות מכל הקבוצות)
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבלת הודעה חדשה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onNewMessage(groupId, callback) {
    // אם לא צוין מזהה קבוצה, מאזינים לכל ההודעות
    if (typeof groupId === 'function') {
      callback = groupId;
      return this.on('new_message', callback);
    }
    
    // האזנה ספציפית לקבוצה
    const wrappedCallback = (data) => {
      if (data.groupId === groupId) {
        callback(data);
      }
    };
    
    return this.on('new_message', wrappedCallback);
  }

  /**
   * רישום להאזנה לאירועים חדשים
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבל אירוע חדש
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onNewEvent(callback) {
    return this.on('new_event', callback);
  }

  /**
   * רישום להאזנה לעדכוני מצב משתמש
   * @param {string} userId - מזהה המשתמש (אופציונלי - אם לא מצוין, מקבלים עדכונים לכל המשתמשים)
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבל עדכון מצב משתמש
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onUserStatusChange(userId, callback) {
    // אם לא צוין מזהה משתמש, מאזינים לכל העדכונים
    if (typeof userId === 'function') {
      callback = userId;
      return this.on('user_status_change', callback);
    }
    
    // האזנה ספציפית למשתמש
    const wrappedCallback = (data) => {
      if (data.userId === userId) {
        callback(data);
      }
    };
    
    return this.on('user_status_change', wrappedCallback);
  }

  /**
   * רישום להאזנה לכניסה של משתמש לקבוצה
   * @param {string} groupId - מזהה הקבוצה (אופציונלי)
   * @param {function} callback - פונקציית callback לביצוע כאשר משתמש מצטרף לקבוצה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onUserJoinGroup(groupId, callback) {
    // אם לא צוין מזהה קבוצה, מאזינים לכל הקבוצות
    if (typeof groupId === 'function') {
      callback = groupId;
      return this.on('user_join_group', callback);
    }
    
    // האזנה ספציפית לקבוצה
    const wrappedCallback = (data) => {
      if (data.groupId === groupId) {
        callback(data);
      }
    };
    
    return this.on('user_join_group', wrappedCallback);
  }

  /**
   * רישום להאזנה ליציאה של משתמש מקבוצה
   * @param {string} groupId - מזהה הקבוצה (אופציונלי)
   * @param {function} callback - פונקציית callback לביצוע כאשר משתמש עוזב קבוצה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onUserLeaveGroup(groupId, callback) {
    // אם לא צוין מזהה קבוצה, מאזינים לכל הקבוצות
    if (typeof groupId === 'function') {
      callback = groupId;
      return this.on('user_leave_group', callback);
    }
    
    // האזנה ספציפית לקבוצה
    const wrappedCallback = (data) => {
      if (data.groupId === groupId) {
        callback(data);
      }
    };
    
    return this.on('user_leave_group', wrappedCallback);
  }

  /**
   * רישום להאזנה לעדכוני מצוקה
   * @param {function} callback - פונקציית callback לביצוע כאשר מתקבל עדכון מצוקה
   * @returns {function} - פונקציה להסרת ההאזנה
   */
  onDistressSignal(callback) {
    return this.on('distress_signal', callback);
  }

  /**
   * שליחת אות חיים לשרת
   * @returns {Promise} - הבטחה שמתממשת כאשר התקבל אישור מהשרת
   */
  sendHeartbeat() {
    return this.emit('heartbeat', { timestamp: new Date().toISOString() });
  }

  /**
   * שליחת אישור קריאת התראה
   * @param {string} alertId - מזהה ההתראה
   * @returns {Promise} - הבטחה שמתממשת כאשר התקבל אישור מהשרת
   */
  markAlertAsRead(alertId) {
    return this.emit('mark_alert_read', { alertId });
  }

  /**
   * שליחת פידבק על התערבות AI
   * @param {string} interventionId - מזהה ההתערבות
   * @param {string} feedback - פידבק
   * @param {number} rating - דירוג (1-5)
   * @returns {Promise} - הבטחה שמתממשת כאשר התקבל אישור מהשרת
   */
  sendInterventionFeedback(interventionId, feedback, rating) {
    return this.emit('intervention_feedback', {
      interventionId,
      feedback,
      rating
    });
  }
}

// יצירת מופע יחיד של שירות הזמן-אמת וייצוא שלו
const realtimeService = new RealtimeService();
export default realtimeService;