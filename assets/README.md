# assets/ — מקור הלוגו

`logo-wordmark.svg` הוא ה-wordmark של העמוד כקובץ עצמאי, באותם טוקנים של
`style.css` (‎`--oak #7A4E24`‎ · ‎`--rule #9BA29C`‎ · ‎`--ink-soft #5A6165`‎ ·
‎`--paper #E8E9E4`‎). הוא נבנה על ידי `build-logo.py`, שמודד את הטקסט
ב-Chromium ומחשב ממנו את הקואורדינטות — אין כאן מספרים שנוחשו ביד.

## למה המייל מצביע על PNG ולא על ה-SVG

שתי סיבות, שתיהן מגבלות של לקוחות מייל:

1. **ג'ימייל לא מרנדר SVG בגוף המייל.** PNG עובד בכל לקוח.
2. **ה-SVG משתמש בגופן מערכת.** רסטור בצד שרת (למשל `f_png` על ה-SVG
   ב-Cloudinary) ירוץ על מכונה בלי גופן עברי ויפיק ג'יבריש. לכן הרסטור
   נעשה כאן, ב-Chromium מקומי עם הגופנים האמיתיים, וה-PNG המוכן הוא
   מה שעולה.

הרקע (`--paper`) אפוי לתוך התמונה בכוונה: לקוח מייל במצב כהה הופך רקע
שקוף לשחור, ואז "נגרות בהזמנה" באפור כהה נעלם.

## הנכס ב-Cloudinary

    public_id: alon-carpentry/logo-wordmark      (1734×252 PNG)
    במייל:     .../upload/f_png,q_auto,w_440/alon-carpentry/logo-wordmark

## בנייה מחדש

    python3 assets/build-logo.py     # דורש playwright + chromium
