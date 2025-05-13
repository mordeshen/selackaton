/**
 * Implementation of Token Bucket algorithm for rate limiting
 */
class TokenBucket {
  constructor(options) {
    this.capacity = options.capacity || 60;  // מספר האסימונים המקסימלי בדלי
    this.fillRate = options.fillRate || 1;   // מספר האסימונים לשניה שמתווספים
    this.fillInterval = options.fillInterval || 1000; // מילישניות
    
    this.tokens = this.capacity; // מתחילים עם דלי מלא
    this.lastFilled = Date.now();
    
    // התחלת תהליך מילוי תקופתי של הדלי
    this.interval = setInterval(() => this.refill(), this.fillInterval);
  }
  
  /**
   * מילוי מחדש של הדלי לפי קצב המילוי והזמן שעבר
   */
  refill() {
    const now = Date.now();
    const timePassed = now - this.lastFilled;
    const tokensToAdd = Math.floor(timePassed * this.fillRate / this.fillInterval);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastFilled = now;
    }
  }
  
  /**
   * צריכת אסימונים מהדלי
   * @param {number} count מספר האסימונים שרוצים לצרוך
   * @returns {boolean} האם הצריכה הצליחה
   */
  consume(count = 1) {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    
    return false;
  }
  
  /**
   * בדיקה האם יש מספיק אסימונים בדלי
   * @param {number} count מספר האסימונים שרוצים לבדוק
   * @returns {boolean} האם יש מספיק אסימונים
   */
  hasTokens(count = 1) {
    this.refill();
    return this.tokens >= count;
  }
  
  /**
   * מחיקת טיימר כאשר לא צריך יותר את האובייקט
   */
  dispose() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  /**
   * קבלת מצב הדלי הנוכחי
   * @returns {Object} מידע על מצב הדלי
   */
  getStatus() {
    this.refill();
    return {
      capacity: this.capacity,
      availableTokens: this.tokens,
      fillRate: this.fillRate,
      fillInterval: this.fillInterval
    };
  }
}

module.exports = TokenBucket;
