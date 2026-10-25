---
type: work
title: מטלת בית 7 — עמוד נחיתה לנגרות אלון ברששת
description: עמוד נחיתה סטטי + workflow ב-n8n. מטלת מפגש 7 (MCP בפרקטיקה; Git/GitHub/Vercel)
updated: 2026-09-02
---

# נגרות אלון ברששת — עמוד נחיתה

עמוד נחיתה של נגר עצמאי (לקוח פיקטיבי, מטלת קורס), עם טופס פנייה
שנכנס ל-workflow ב-n8n: שורה בגוגל שיטס, מייל התראה לבעל העסק,
ומייל אישור מעוצב לפונה.

HTML ו-CSS בלבד — בלי ספריות, בלי כלי בנייה, בלי שלב build.
`index.html` בשורש, כפי ש-Vercel מצפה.

## מסמכי המקור

| קובץ | מה יש בו |
|---|---|
| [`PRD.md`](PRD.md) | האפיון החתום. **§6 הוא מלאי העובדות** — כל משפט בעמוד מבוסס על שורה משם |
| [`design-direction.md`](design-direction.md) | הכיוון העיצובי, הנימוקים, והפרומפטים לתמונות |

## מבנה

    index.html          העמוד. בלוק ה-script בסוף מחזיק את WEBHOOK_URL
    style.css           :root כשורש עיצובי — צבע, מרווח וטיפוגרפיה במקום אחד
    assets/             מקור ה-wordmark כ-SVG + הסקריפט שבונה אותו
    email/              התכנים שה-workflow שולח, ומה שנכנס לצומת Code

התמונות לא יושבות ב-repo. הן נכסים מנוהלים ב-Cloudinary
(`alon-carpentry/…`) ומגיעות עם `f_auto,q_auto` ו-`srcset`.

## חיבור ל-n8n

`WEBHOOK_URL` בראש בלוק ה-script ב-`index.html`. מחובר ל-workflow
`Alon-Landing-Page` (מזהה `23X7WrkFdBrt66PX`), שנבנה ופורסם ב-2.9.2026:

    https://tamburai.app.n8n.cloud/webhook/alon-lead

הפניות נשמרות בגיליון [נגרות אלון ברששת — פניות מהאתר][sheet].
ריקון המחרוזת מפעיל את מסלול הגיבוי — כך בודקים אותו בלי לכבות
את ה-workflow.

[sheet]: https://docs.google.com/spreadsheets/d/1YqkCqsdDOzdAukz55uNmLY6rd-ZRMxEKPNkqMk-8cbg/edit

ההתנהגות זהה בכל מצב כושל — חיבור שנדחה, שגיאת שרת, או CORS חסום:
הודעה ברורה, כפתור `mailto` עם כל מה שכבר מולא, **והשדות לא מתרוקנים**.

תנאי: ה-workflow חייב להיות ב-**publish** — במצב test אין האזנה קבועה.

**CORS סגור** (2.9.2026): `Allowed Origins` הוא
`https://lesson7-alon-landing.vercel.app` בלבד, במקום `*`.
**הסכימה היא חלק מהערך.** n8n מחזיר את המחרוזת כמו שהיא בכותרת
`Access-Control-Allow-Origin`, והדפדפן משווה אותה מול ה-`Origin` ששלח —
שכולל תמיד `https://`. ערך בלי סכימה לא יתאים, והבקשה תיחסם בשקט.

## מטלה 11: בוט ומסך אדמין

| קובץ | מה |
|---|---|
| `admin.html`, `admin.css` | העלאת מחירון/תנאי הזמנה עם החלפה בטוחה. לא מקושר מהעמוד, `noindex`, סיסמה ב-`sessionStorage` בלבד |
| `chat-widget.js`, `chat-widget.css` | בועת הצ'אט, נטענת מ-`index.html` |
| `supabase/` | מיגרציות (`kb_versions`, `kb_chunks`, פונקציות ההחלפה) ובדיקות SQL |
| `n8n/` | פונקציית החיתוך ובדיקותיה ומקורות קוד ה-SDK. ייצוא הזרימה המלא (JSON) מצורף להגשה ולא נשמר כאן |

הזרימה ב-n8n: `נגריית אלון — העלאה ובוט` (`3wWegpnJEWe25AkU`). נקודות הקצה:

    POST /webhook/alon-kb/upload      Header Auth (X-Admin-Key)
    GET  /webhook/alon-kb/status      Header Auth
    GET  /webhook/alon-kb/documents   Header Auth
    POST /webhook/cd2ec360-…/chat     ציבורי (הבוט)

כולן עם `Allowed Origins` לדומיין החי בלבד. המפתחות הסודיים (Supabase service_role, OpenAI, OpenRouter, Cohere) חיים רק ב-credentials של n8n.

## בדיקות

    python3 -m http.server 8899
    python3 _review/test_page.py            # 18 בדיקות תפקוד
    python3 _review/type_audit.py           # עקביות הסולם הטיפוגרפי
    python3 _review/test_webhook_paths.py   # ארבעת מצבי ה-webhook מול שרת דמה
    python3 _review/test_validation_sync.py # הוולידציה זהה בדפדפן ובשרת
    python3 _review/test_admin.py           # מסך האדמין מול שרת דמה (22)
    python3 _review/test_chat.py            # בועת הצ'אט מול שרת דמה (19)
    node --test n8n/chunker.test.js         # החיתוך (6)

**הוולידציה חיה בשני מקומות** — `RULES` ב-`index.html` (נוחות למשתמש)
ו-`prepare.js` (ההגנה האמיתית). פער ביניהם הוא כשל שקט: אם השרת מחמיר
יותר, המשתמש רואה "נשלח" והפנייה נופלת — כי ה-webhook מחזיר 200 לפני
שהשער בכלל רץ. `test_validation_sync.py` משווה ספים ו-regex ונכשל על פער.

שתי הבדיקות חוסמות את הבקשה ל-webhook (`page.route`) במקום להסתמך על
`WEBHOOK_URL` ריק. לכן הן תקפות גם עכשיו, כשהכתובת מחוברת, ולא שולחות
פנייה אמיתית ל-workflow החי בכל הרצה.

זה גם מה שמאפשר להן לרוץ אחרי סגירת ה-CORS: `localhost:8899` כבר אינו
origin מורשה, ובקשה אמיתית מהמחשב תיחסם. **בדיקה חיה מקצה לקצה נעשית
מהדומיין החי בלבד.**

`_review/` לא נכנס ל-git (צילומי מסך כבדים), ולכן בדיקות ה-Playwright רצות רק בעותק המקומי.

## פריסה

Vercel מחובר ל-GitHub: push ל-`main` = פריסה לייצור, push ל-branch = preview.
במטלה 7 הפריסה הייתה ידנית על ידי מתן (הנחיית המטלה). ממטלה 11 (19.10.26)
קלוד ממזג לפי הכללים ב-[`CLAUDE.md`](CLAUDE.md).

`.vercelignore` מחריג מהאתר החי את המסמכים (`*.md`), הסקריפטים (`*.py`),
`email/`, `_review/`, `supabase/` ו-`n8n/`.
