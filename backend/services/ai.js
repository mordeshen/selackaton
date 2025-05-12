// services/ai.js
const { OpenAI } = require('openai');
const config = require('../config');

// הגדרת מגבלת טוקנים (אם נדרש)
const TokenBucket = require('../utils/tokenBucket');
const rateLimiter = new TokenBucket({
  bucketSize: 20,  // מספר הבקשות המקסימלי
  refillRate: 10,  // קצב מילוי מחדש (בקשות לדקה)
});

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    
    // תבניות prompt לתפקידים שונים
    this.promptTemplates = {
      groupFacilitator: `אתה מנחה קבוצה וירטואלי בשם "שחרור". 
      תפקידך לסייע בהנחיית קבוצת תמיכה בוואטסאפ, לעודד שיח חיובי, 
      להכיר בין חברי הקבוצה ולזהות מצבי מצוקה.
      
      מידע על הקבוצה: {{groupInfo}}
      
      ההיסטוריה האחרונה של השיחה: 
      {{chatHistory}}
      
      בהתבסס על המידע הזה, כיצד תגיב להודעה הבאה מחבר הקבוצה?
      הודעה: {{userMessage}}`,
      
      groupManager: `אתה מנהל קבוצות במערכת "שחרור".
      תפקידך להתאים ולשבץ אנשים לקבוצות מתאימות על פי המאפיינים שלהם.
      
      פרופיל המשתמש החדש: {{userProfile}}
      
      מידע על הקבוצות הקיימות:
      {{groupsInfo}}
      
      כיצד תפעל? האם תשבץ את המשתמש לקבוצה קיימת או תיצור קבוצה חדשה?
      במידה ותשבץ לקבוצה קיימת, לאיזו קבוצה ומדוע?`,
      
      personalAssistant: `אתה עוזר אישי חיובי ותומך במערכת "שחרור".
      תפקידך לשוחח עם המשתמש באופן אישי, להבין את הצרכים שלו,
      ולסייע לו בהתמודדות עם מצבי לחץ ותסכול.
      
      היסטורית השיחה עם המשתמש:
      {{chatHistory}}
      
      הנושאים שמעניינים את המשתמש: {{userInterests}}
      
      כיצד תגיב להודעה הבאה מהמשתמש?
      הודעה: {{userMessage}}`
    };
  }

  async generateResponse(role, context, userMessage) {
    // בדיקת מגבלת הבקשות (אם נדרש)
    if (!rateLimiter.consumeToken()) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // בחירת תבנית prompt המתאימה לתפקיד
    let promptTemplate = this.promptTemplates[role];
    if (!promptTemplate) {
      throw new Error(`Unknown role: ${role}`);
    }
    
    // החלפת המשתנים בתבנית
    Object.keys(context).forEach(key => {
      promptTemplate = promptTemplate.replace(`{{${key}}}`, context[key]);
    });
    
    promptTemplate = promptTemplate.replace('{{userMessage}}', userMessage);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: promptTemplate }],
        max_tokens: 500,
        temperature: 0.7
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  async analyzeUserProfile(messages) {
    // ניתוח הודעות המשתמש לבניית פרופיל פסיכולוגי
    try {
      const prompt = `
      אנא נתח את הסדרה הבאה של הודעות ממשתמש וצור פרופיל פסיכולוגי.
      התייחס למאפיינים הבאים: 
      1. תחומי עניין
      2. מצב רגשי
      3. סגנון תקשורת
      4. גורמי לחץ אפשריים
      5. מה עשוי לעזור למשתמש זה להתמודד עם מצבי לחץ
      
      הודעות המשתמש:
      ${messages.join('\n')}
      
      פרופיל פסיכולוגי:`;
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.5
      });
      
      return this.parseProfileFromText(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing user profile:', error);
      throw error;
    }
  }
  
  parseProfileFromText(text) {
    // המרת טקסט לאובייקט פרופיל מובנה
    const profile = {
      interests: [],
      emotionalState: '',
      communicationStyle: '',
      stressFactors: [],
      supportStrategies: []
    };
    
    // לוגיקה פשוטה לחילוץ מידע מהטקסט
    if (text.includes('תחומי עניין')) {
      const interestsMatch = text.match(/תחומי עניין:(.+?)(?=\n\d|\n\w)/s);
      if (interestsMatch) {
        profile.interests = interestsMatch[1].trim().split(/,|\n/).map(i => i.trim()).filter(i => i);
      }
    }
    
    // המשך לוגיקה דומה לשאר השדות...
    
    return profile;
  }

  // פונקציות מהקוד שלי שיכולות להיות שימושיות
  async analyzeGroupTypePreference(message) {
    try {
      const prompt = `
      אנא נתח את ההודעה הבאה ויסק איזה סוג קבוצה המשתמש מעדיף: תמיכה (support), פעילות (activity), או תחומי עניין (interest)
      הודעת המשתמש: "${message}"
      השב עם המילה support, activity, או interest בלבד.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 5
      });
      
      const result = response.choices[0].message.content.trim().toLowerCase();
      
      if (['support', 'activity', 'interest'].includes(result)) {
        return result;
      }
      
      // ברירת מחדל
      return 'support';
    } catch (error) {
      console.error('Error analyzing group type preference:', error);
      return 'support';
    }
  }
  
  async analyzeLocation(message) {
    try {
      const prompt = `
      אנא נתח את ההודעה הבאה וחלץ את שם העיר או האזור בישראל שהמשתמש מציין.
      הודעת המשתמש: "${message}"
      השב עם שם העיר או האזור בלבד, בעברית.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      });
      
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error analyzing location:', error);
      return 'תל אביב';
    }
  }
  
  async analyzeInterests(message) {
    try {
      const prompt = `
      אנא נתח את ההודעה הבאה וחלץ עד 5 תחומי עניין או נושאים שהמשתמש מציין שמעניינים אותו.
      הודעת המשתמש: "${message}"
      השב בפורמט של רשימה מופרדת בפסיקים, בעברית.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100
      });
      
      const result = response.choices[0].message.content.trim();
      return result.split(',').map(item => item.trim());
    } catch (error) {
      console.error('Error analyzing interests:', error);
      return ['תמיכה'];
    }
  }
}

module.exports = new AIService();