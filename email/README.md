# email/ — שלוש הפעולות של ה-workflow

הקבצים כאן הם המקור לתוכן שנכנס לצמתים ב-n8n. הם לא רצים באתר.

| קובץ | לאן זה נכנס ב-n8n |
|---|---|
| `prepare.js` | צומת **Code** בשם `Prepare`, בין ה-Webhook לשלוש הפעולות. Run Once for All Items |
| `notification.txt` | צומת **Send Email** — התראה לבעל העסק. פורמט Text, לא HTML |
| `confirmation.html` | צומת **Send Email** — אישור לפונה. פורמט HTML |
| `render-preview.py` | לא נכנס ל-n8n. מציב נתוני דוגמה ומצלם תצוגה מקדימה |

## סדר הצמתים

    Webhook (POST, publish)
      └─ Prepare            ← ניקוי, ולידציה, escaping, חותמת זמן
           ├─ Google Sheets · Append Row     ($json.name … $json.stamp)
           ├─ Send Email → devai.test5858@gmail.com   (notification.txt)
           └─ Send Email → {{ $json.email }}          (confirmation.html)

## למה יש צומת Prepare

**Escaping.** גוף מייל האישור נבנה ממה שגולש הקליד. בלי בריחת תווים,
פנייה שמכילה `<` שוברת את ה-HTML, ופנייה זדונית מזריקה לתוכו. `Prepare`
מייצר `$json.safe.*` — ורק משם נלקחים ערכים לתוך `confirmation.html`.

**ולידציה בצד השרת.** כתובת ה-webhook גלויה ב-F12 (PRD §7), ולכן הבדיקה
בדפדפן היא נוחות למשתמש ולא הגנה. `Prepare` מסמן `valid: false` לפנייה
פגומה או ל-honeypot שמולא.

**חותמת זמן אחת** לשלוש הפעולות, בשעון ישראל — במקום שלוש חותמות
שנוצרות בשלושה רגעים שונים.

## הערות למי שעורך את המייל

- טבלאות ו-CSS inline בלבד. ג'ימייל מסיר `<style>`, ואאוטלוק מרנדר
  במנוע Word — flex, grid ו-`border-radius` לא קיימים שם.
- הלוגו והתמונה מגיעים מ-Cloudinary בכתובת ציבורית, בלי קבצים מצורפים.
- הפורמטים מפורשים (`f_png` ללוגו, `f_jpg` לתמונה) ולא `f_auto`:
  לקוח מייל לא תמיד שולח כותרת `Accept` שאפשר לסמוך עליה.
- **אין במייל הבטחת זמן תגובה.** אלון לא מסר אחת (PRD §12 שאלה 3).

## תצוגה מקדימה

    python3 email/render-preview.py     # -> email/_preview/
