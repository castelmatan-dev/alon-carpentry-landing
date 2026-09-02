---
type: work
title: כיוון עיצובי ופרומפטים לתמונות
description: הצעה לאישור מתן לפני ייצור תמונות ולפני כתיבת קוד
updated: 2026-09-02
status: ממתין לאישור
---

# כיוון עיצובי — נגרות אלון ברששת

## התזה

הדבר המייחד את אלון אינו "רהיטי עץ יפים" — כל נגר אומר את זה. הדבר המייחד אותו הוא **מידה**.
הוא כתב את זה פעמיים בעצמו: "כל אחד לפי המידות של הלקוח", "אני מגיע לבית ומודד". אין לו מחירון כי אין מידה סטנדרטית. הוא שולח **סקיצה** עם הצעת המחיר.

זו גם החרדה של הקונה: *האם זה יתאים? האם זה יהיה מדויק?*

**לכן העמוד בנוי כמו סקיצה של נגר.** לא כמו קטלוג.

## הסיכון שאני לוקח

אתר של נגר אמן נראה תמיד אותו דבר: רקע קרם, סריף גדול, אקסנט טרקוטה, הכל חמים ועצי. זו ברירת המחדל, וזה בדיוק מה שגורם לעמוד להיראות כמו תבנית.

**אני הופך את זה.** העמוד עצמו קריר — נייר שרטוט וגרפיט. **העץ הוא הדבר החם היחיד בעמוד, והוא נמצא רק בתמונות.**

הנימוק: כשכל העמוד חום, התמונות נבלעות בו. כשהעמוד אפור-קריר, הרהיט הוא הדבר היחיד שהעין נתפסת בו. ובנוסף — קרירות ודיוק אומרים "האיש הזה מודד", וזה בדיוק מה שהקונה צריך לשמוע.

## טוקנים

### צבע
| טוקן | ערך | תפקיד |
|---|---|---|
| `--ink` | `#23282B` | גרפיט. טקסט וכותרות. שחור עם נטייה כחלחלה — עיפרון על נייר, לא דיו |
| `--paper` | `#E8E9E4` | רקע. נייר שרטוט אפור-ירקרק קריר. **לא קרם** |
| `--surface` | `#F5F6F2` | כרטיסים, שדות טופס |
| `--rule` | `#9BA29C` | קווי המידה והמסגרות |
| `--steel` | `#38566B` | כחול פלדה מחומצנת. **האקסנט היחיד** — מספרים, מצב פוקוס, כפתור |

חום לא מופיע כטוקן בכלל. הוא נכנס דרך התמונות בלבד.

### טיפוגרפיה
- **עברית:** גופן מערכת (SF Hebrew / Noto Sans Hebrew / Arial Hebrew). האישיות מגיעה מהסדר — ניגוד משקלים חד (800 מול 400), סקאלה רחבה, `line-height: 1.7`.
- **מספרים ותוויות:** **מונוספייס** (`ui-monospace`). כל מספר בעמוד — השנה 2017, מספרי השלבים, "3–6 שבועות", "שנתיים" — בגופן מכונה. ככה מספרים נראים על שרטוט.
- עלות: אפס. שני הגופנים כבר במכשיר.

### מבנה
עמוד יחיד, טור אחד, מרווח. הסקשנים מסומנים בתוויות מונוספייס קטנות בשוליים.

```
              ┌────────────────────────────────────────┐
              │  אלון ברששת                  [פנייה]  │
              └────────────────────────────────────────┘

     ┌──────────────────────────────────────────────────┐
     │                      רהיטים לפי מידה             │  ← 800, גדול
     │                  נגרות בהזמנה · פרדס חנה         │
     │           ├──────── 2017 ────────┤               │  ← קו מידה
     │                                                  │
     │        [ תמונת hero — עץ חם, רחבה ]              │
     │                                    ◂ הדמיה       │
     └──────────────────────────────────────────────────┘
```

## אלמנט החתימה: קו המידה

`├────── 2017 ──────┤` — הקו עם סימני קצה והמספר במונוספייס. הסימון שנגר מסמן בו שרטוט.

הוא מופיע בשלושה מקומות בלבד, וכל אחד מהם עושה עבודה אמיתית:
1. **מתחת לשם** — משך הפעילות, 2017.
2. **בסקשן התהליך** — חמשת השלבים ממוספרים במונוספייס לאורך קו אנכי. השלב "ייצור" מקבל **קו מידה שמצייר את 3–6 השבועות כמרחק מדוד**. זה הרגע שבו הדימוי עובד בפועל: משך זמן מצויר כאורך. זה הדבר שיזכרו מהעמוד.
3. **מפרידים בין סקשנים.**

זהו. שאר העמוד שקט. (כלל שאנל: להוריד אביזר אחד לפני שיוצאים.)

**מספור השלבים מוצדק** — התהליך של אלון הוא רצף אמיתי שהסדר בו נושא מידע: שיחה ← מדידה ← סקיצה ← ייצור ← הרכבה. הקורא צריך לדעת מה בא אחרי מה.

## תנועה

דבר אחד: **קו המידה מתחת לשם נמתח מאפס לרוחב המלא בטעינה** (600ms). קו שנמתח — כמו קו שנמדד.
כלום אחר לא זז. `prefers-reduced-motion` מכובד.

---

# פרומפטים לתמונות

**שיטה:** תמונה 1 מיוצרת בשלושה מודלים להשוואה → מתן בוחר → התמונה שנבחרה משמשת כ-reference לכל השאר, כדי שכולן ייראו כמו בית מלאכה אחד.

## בלוק הסגנון (נכנס לכל פרומפט)

> Photorealistic interior photograph. Natural daylight from a large side window — soft, directional, late morning. No studio lighting, no artificial fill, no dramatic shadows. Solid hardwood with visible open grain and a matte hand-rubbed finish, never glossy lacquer. A quiet, uncluttered room: pale plaster walls, matte concrete floor, at most one or two objects. Shot on a 35mm lens at eye level, natural depth of field. Warm wood against cool neutral surroundings; neutral color, no stylized grading, no teal-and-orange. No people, no text, no lettering, no logos, no brand marks.

הפרומפטים מתארים **חומר, תאורה וזווית** — לא "רהיט יפה".

| # | יחס | נושא, עץ, זווית ותאורה |
|---|---|---|
| 1 · hero | 16:9 | A long solid oak dining table centered in an empty room, seen straight on from the short end. Window to the left casts a soft gradient across the tabletop. Emphasis on the flat plane of the top and the grain running its full length. |
| 2 | 4:3 | Close view of the corner where an oak tabletop meets a square leg. Raking light across the surface reveals the open grain and a crisp chamfered edge. |
| 3 | 4:3 | The same oak dining table with two simple chairs, three-quarter angle from standing height, daylight from behind camera-left. |
| 4 | 4:3 | A low walnut sideboard against a plaster wall, straight on, doors closed. Soft light grazes the front, showing dark chocolate grain running continuously across the door fronts. |
| 5 | 4:3 | A floor-to-ceiling built-in wardrobe in pale oak filling an alcove, photographed straight on from a few steps back. Flush doors, no visible handles. Daylight from the right. |
| 6 | 4:3 | A full-height built-in bookshelf wall in oak, partly filled with books, three-quarter angle. Window light from the left rakes across the vertical dividers. |
| 7 | 4:3 | Close view of a shelf meeting a vertical divider in oak — the joint, the shelf edge, soft directional light. |
| 8 | 4:3 | Stacked rough-sawn hardwood boards with thin stickers between the layers, in the corner of a quiet workshop. Daylight from a high window. Grain and sawdust texture visible. No tools, no people. |

תמונה 8 תומכת בעובדה "העץ מיובש בתנור לפני העבודה" — היא אווירה, לא טענה על עבודה שבוצעה.

**כל תמונה נושאת את התווית "הדמיה" בעמוד.** בלי יוצא מן הכלל.

## הלוגו

wordmark טיפוגרפי — "אלון ברששת" במשקל 800 עם `נגרות בהזמנה` במונוספייס מתחתיו, וקו מידה מפריד ביניהם. אותו רעיון של קו החתימה.
בעמוד הוא **טקסט** (נטען מיידית). לצורך מייל האישור אותו עיצוב ייוצר כתמונה ויועלה ל-Cloudinary — לקוחות מייל לא מרנדרים גופנים אמינות, ותמונה על כתובת ציבורית משתבצת בלי קובץ מצורף.

---

## שתי הכרעות שאני צריך ממתן

1. **אישור הפרומפטים** למעלה — לפני שמייצרים משהו.
2. **גופן:** ה-PRD ננעל על גופן מערכת בלבד. גופן עברי אחד (Heebo/Assistant), מצומצם לעברית בלבד ומוגש מהשרת שלנו, שוקל ~30KB ויקנה לעמוד זהות ממשית שקשה להשיג עם גופן מערכת. עדיין בתוך תקציב ה-150KB. **לאשר או להישאר על גופן מערכת?**
