// n8n · Code node · "Prepare" — רץ בין ה-Webhook לבין שלוש הפעולות.
// Run Once for All Items.
//
// שתי עבודות:
//   1. escaping. גוף המייל נבנה ממה שגולש הקליד. בלי בריחת תווים,
//      פנייה שמכילה '<' שוברת את ה-HTML, ופנייה זדונית מזריקה לתוכו.
//   2. נרמול: trim, ברירת מחדל לקטגוריה, חותמת זמן אחת שמשמשת
//      גם את השורה בשיטס וגם את המיילים.

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const out = [];

for (const item of $input.all()) {
  const b = item.json.body ?? item.json;
  const raw = {
    name:     String(b.name     ?? '').trim(),
    phone:    String(b.phone    ?? '').trim(),
    email:    String(b.email    ?? '').trim(),
    city:     String(b.city     ?? '').trim(),
    category: String(b.category ?? '').trim() || 'עוד לא בטוח',
    details:  String(b.details  ?? '').trim(),
  };

  // ולידציה בצד השרת. כתובת ה-webhook גלויה ב-F12, ולכן הבדיקה
  // בדפדפן היא נוחות למשתמש — לא הגנה. ר' PRD §7.
  // הספים כאן חייבים להיות זהים ל-RULES ב-index.html. פער ביניהם שקט
  // ומסוכן: הדפדפן מאשר, השרת דוחה, והמשתמש רואה "נשלח" כי ה-webhook
  // מחזיר 200 לפני שהשער רץ. _review/test_validation_sync.py שומר על זה.
  const bad = [];
  if (raw.name.length    < 2) bad.push('name');
  if (raw.details.length < 2) bad.push('details');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.email)) bad.push('email');
  if (!/^0\d{1,2}[-\s]?\d{7}$/.test(raw.phone.replace(/[^\d\-\s]/g, ''))) bad.push('phone');
  if (String(b.company ?? '') !== '') bad.push('honeypot');   // בוט

  const ts = new Date();

  out.push({
    json: {
      ...raw,
      valid:   bad.length === 0,
      invalid: bad,
      // חותמת אחת לכל שלוש הפעולות, בשעון ישראל
      stamp: ts.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
      iso:   ts.toISOString(),
      // מה שנכנס לתוך ה-HTML של מייל האישור
      safe: {
        name:     esc(raw.name),
        phone:    esc(raw.phone),
        email:    esc(raw.email),
        city:     esc(raw.city),
        category: esc(raw.category),
        details:  esc(raw.details).replaceAll('\n', '<br>'),
      },
    },
  });
}

return out;
