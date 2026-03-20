# Amarel Project Cockpit (Supabase)

אפליקציית ניהול פרויקטים אישית בעברית (RTL) עם:
- Supabase DB + CRUD
- דשבורד KPI והתראות
- מסכי פרויקטים, לקוחות, ראשי צוותים, אנליטיקות, מאגר ידע, פגישות
- תהליכי גיוס לפי ראש צוות עם כל סטטוסי הגיוס
- עיצוב תואם מותג Amarel (כחול/כתום)

## 1) מה יש בפרויקט
- `supabase/schema.sql` - סכמת DB מלאה (טבלאות, קשרים, FK, Views, Triggers, RLS)
- `supabase/seed.sql` - נתוני התחלה
- `supabase/add_recruitment_pipeline_safe.sql` - הוספת תהליכי גיוס בצורה בטוחה לפרויקט קיים
- `supabase/add_goals_automation_safe.sql` - הוספת יעדי ראש צוות/עובדים + אוטומציית הצעות יעדים בצורה בטוחה
- `web/index.html` - UI ראשי
- `web/styles.css` - עיצוב
- `web/app.js` - Supabase integration + CRUD + charts

## 2) הגדרת Supabase
1. צור פרויקט חדש ב-Supabase.
2. פתח SQL Editor והרץ את `supabase/schema.sql`.
3. הרץ אחריו את `supabase/seed.sql`.
4. ב-Supabase Settings קח:
   - Project URL
   - anon public key

הערה חשובה:
- קובצי SQL שנמצאים בפרויקט המקומי לא משנים את ה-Database לבד.
- כל שינוי ב-DB נכנס לתוקף רק אחרי שמריצים אותו ב-Supabase SQL Editor.
- אם מחיקה לא עובדת, הרץ את `supabase/apply_delete_policies_safe.sql`.

## 3) הוספת הלוגו
שמור את קובץ הלוגו בשם:
- `web/assets/amarel-logo.png`

ה-UI כבר מוגדר להציג אותו אוטומטית.

## 4) הפעלה מקומית
בטרמינל מתוך תיקיית הפרויקט:

```powershell
cd web
python -m http.server 5500
```

ואז פתח בדפדפן:
- `http://localhost:5500`

## 5) חיבור מתוך המסך
ב-Top Bar הזן:
- Supabase URL
- Anon Key

לחץ `חיבור`.

## 5.1) חיבור אוטומטי מקובץ מקומי (מומלץ)
1. הקובץ `web/config.local.js` כבר נוצר אצלך עם ה-URL וה-Key שסיפקת.
2. בקובץ זה יש אוטו-טעינה בעת פתיחת האפליקציה.
3. הקובץ מוחרג ב-`.gitignore`, ולכן לא אמור להיכנס ל-GitHub.
4. לשיתוף עם צוות בלי לחשוף מפתחות, השתמש ב-`web/config.example.js` כתבנית.

## 6) הערות חשובות
- ה-RLS בקובץ מוגדר בסיסי מאוד (`authenticated` עם גישה רחבה) לצורך התחלה מהירה.
- לפני Production כדאי להדק Policies לפי משתמש/ארגון.
- אפשר להוסיף Supabase Auth בהמשך ולהצמיד נתונים ל-`profiles`.
