# פרויקט שווים (Shavim) 

מערכת ליצירת קבוצות אנשים על בסיס מאפיינים דומים.

## תוכן העניינים
- [דרישות מערכת](#דרישות-מערכת)
- [התקנה](#התקנה)
- [הרצת הפרויקט](#הרצת-הפרויקט)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [טכנולוגיות](#טכנולוגיות)
- [API Documentation](#api-documentation)
- [תרומה לפרויקט](#תרומה-לפרויקט)
- [יצירת קשר](#יצירת-קשר)

## דרישות מערכת

לפני התקנת הפרויקט, ודא שהמערכת שלך עומדת בדרישות הבאות:

- **Node.js** (גרסה 16.x או מעלה)
- **npm** (גרסה 8.x או מעלה)
- **MongoDB** (גרסה 5.x או מעלה)

## התקנה

בצע את השלבים הבאים כדי להתקין את הפרויקט במחשב המקומי שלך:

1. **שכפל את המאגר**
   ```bash
   git clone https://github.com/mordeshen/selackaton.git
   cd selackaton
   ```

2. **התקן את כל התלויות**
   
   התקן את התלויות הראשיות:
   ```bash
   npm install
   ```
   
   התקן את התלויות בצד הלקוח (Frontend):
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **הגדר משתני סביבה**
   
   צור קובץ `.env` בספרייה הראשית עם המשתנים הבאים:
   ```
   MONGODB_URI=mongodb://localhost:27017/shavim
   PORT=5000
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```
   
   התאם את הערכים לפי סביבת הפיתוח שלך.

## הרצת הפרויקט

הפרויקט מוגדר עם מספר סקריפטים מובנים ב-`package.json` המרכזי:

### 1. הרצת הפרויקט המלא (Frontend + Backend)

```bash
npm run dev
```
פקודה זו תריץ במקביל (בעזרת `concurrently`) את השרת עם `nodemon` ואת צד הלקוח.

### 2. הרצת חלקים נפרדים

הרצת צד השרת (Backend) בלבד:
```bash
npm run server
```
פקודה זו תריץ את השרת עם `nodemon` לרענון אוטומטי.

הרצת צד הלקוח (Frontend) בלבד:
```bash
npm run client
```

### 3. סביבת ייצור (Production)

הרצת השרת בלבד (ללא nodemon):
```bash
npm start
```

### 4. בדיקות יחידה

הרצת בדיקות (Jest):
```bash
npm test
```

## מבנה הפרויקט

הפרויקט מחולק לשני חלקים עיקריים:

```
selackaton/
├── backend/               # צד שרת - Node.js/Express
│   ├── models/            # מודלים של MongoDB
│   ├── routes/            # ניתובי API
│   ├── middleware/        # Middleware
│   ├── app.js             # אפליקציית Express
│   └── server.js          # הגדרות השרת
│
├── frontend/              # צד לקוח - React
│   ├── public/            # קבצים סטטיים
│   └── src/               # קוד מקור
│       ├── components/    # רכיבי React
│       ├── pages/         # דפי האפליקציה
│       ├── context/       # React Context
│       ├── App.js         # רכיב App הראשי
│       └── index.js       # נקודת הכניסה
│
├── docs/                  # תיעוד הפרויקט
├── tests/                 # בדיקות
└── package.json           # הגדרות הפרויקט
```

## טכנולוגיות

הפרויקט משתמש בטכנולוגיות הבאות:

### צד שרת (Backend)
- Node.js
- Express.js (גרסה 5.1.0)
- MongoDB with Mongoose (גרסה 8.14.2)
- JWT Authentication
- Firebase Admin
- OpenAI API
- Swagger for API Documentation
- Winston (לוגים)
- Helmet (אבטחה)
- Express Rate Limit

### צד לקוח (Frontend)
- React
- React Router
- Material-UI (MUI)
- Redux Toolkit
- Axios

### פיתוח וטסטים
- Jest
- Supertest
- Nodemon
- Concurrently

## API Documentation

לאחר הרצת השרת, ניתן לגשת לתיעוד ה-API בכתובת:
```
http://localhost:5000/api-docs
```

תיעוד זה נוצר באמצעות Swagger ומספק:
- רשימת כל נקודות הקצה (Endpoints) של ה-API
- פרמטרים נדרשים לכל בקשה
- דוגמאות תגובה
- אפשרות לבדיקת ה-API ישירות מהממשק

## תרומה לפרויקט

אנו מעודדים תרומה לפרויקט. אנא פעל לפי השלבים הבאים:

1. עשה Fork למאגר
2. צור ענף חדש עבור התכונה שלך (`git checkout -b feature/your-feature-name`)
3. בצע את השינויים שלך ו-commit אותם (`git commit -m 'Add some feature'`)
4. העלה את הענף למאגר שלך (`git push origin feature/your-feature-name`)
5. פתח בקשת משיכה (Pull Request) ל-repository הראשי: https://github.com/mordeshen/selackaton

## יצירת קשר

לשאלות או לתמיכה, אנא צור קשר:

- מרדכי שנוולד
- GitHub: https://github.com/mordeshen
- Repository: https://github.com/mordeshen/selackaton