# שינויים אחרונים (Recent Changes)

## ענף: frontend-auth-updates

תאריך: 13.05.2025

### שינויים עיקריים:

#### שינויים בצד שרת (Backend):
- עדכון קובץ הגדרות (backend/config/index.js)
- שיפורים במערכת ההתראות (backend/services/notification.js)

#### שינויים בצד לקוח (Frontend):
- שדרוג מערכת האימות:
  - הוחלף שירות האימות הישן (authService.js → auth.js)
  - הוספת עמוד הרשמה חדש (Register.js)
- עדכון רכיבים:
  - שיפורים ברכיב התראות (AlertPanel.js)
  - עדכון רכיב רשימת קבוצות (GroupList.js)
  - שיפורים ברכיב כרטיס משתמש (userCard.js)
- עדכון דף התחברות (Login.js)
- שיפורים בדף צ'אט אישי (PersonalChat.js)
- הוספת קובץ עיצוב ראשי (index.css)
- שדרוג חבילות (package.json)
- הוספת הגדרות ESLint (.eslintrc.js)
- הוספת דיווח ביצועים (reportWebVitals.js)
- הוספת קובץ קונפיגורציה (8n8.json)

### סיכום
שדרוג משמעותי של מערכת האימות בצד הלקוח, כולל תמיכה בהרשמת משתמשים חדשים ושיפורים בממשק המשתמש.
