# CLAUDE.md — alon-carpentry-landing

אתר נגריית אלון ברששת (לקוח פיקטיבי בקורס AI Dev). HTML/CSS/JS בלבד — בלי ספריות ובלי build.

## פריסה (אישור מתן, 19.10.26 — מחליף את "פריסה ידנית" של מטלה 7)
- Vercel מחובר ל-GitHub: push ל-`main` = פריסה לייצור; push ל-branch = preview.
- קלוד עובד על branch, בודק, ממזג ל-`main` ושולח למתן קישור + מה השתנה.
- **חריג:** המיזוג הראשון של `admin.html` והמיזוג הראשון של בועת הצ'אט — קישור preview למתן ואישור לפני מיזוג.
- **אסור תמיד:** force push, מחיקת branches שלא קלוד יצר, שינוי הגדרות הפרויקט ב-Vercel.
- `.vercelignore` מחריג מסמכים וכלים מהאתר החי. קובץ חדש שאינו חלק מהאתר — להוסיף לשם.

## אבטחה
- שום מפתח סודי ב-repo (הוא ציבורי). המפתחות חיים ב-credentials של n8n.
- `Allowed Origins` ב-n8n תמיד עם סכימה (`https://…`) — ר' README.

## מסמכי תכנון (מטלה 11)
`~/claude-brain/ai-dev-focus/course/lesson-11/homework-11/` — מסמך העיצוב ותוכנית הביצוע.
