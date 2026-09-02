# -*- coding: utf-8 -*-
"""
מרנדר תצוגה מקדימה של מייל האישור: מציב נתוני דוגמה במקום ביטויי n8n
וצולם ברוחב דסקטופ וברוחב נייד. מקור אחד — confirmation.html.

    python3 email/render-preview.py [תיקיית-פלט]
"""
import pathlib, re, sys

from playwright.sync_api import sync_playwright

SRC = pathlib.Path(__file__).parent / "confirmation.html"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).parent / "_preview")
OUT.mkdir(parents=True, exist_ok=True)

SAMPLE = {
    "name":     "דנה לוי",
    "phone":    "054-123-4567",
    "email":    "dana.levi@example.com",
    "city":     "בנימינה",
    "category": "ספרייה או קיר אחסון",
    # רב-שורתי, כמו שיוצא מ-textarea אחרי ה-Code node
    "details":  "אנחנו רוצים קיר ספרייה בסלון, מהרצפה עד התקרה.<br>"
                "הקיר בערך 3.20 רוחב ו-2.60 גובה, יש בו שקע לחלון בצד ימין.<br>"
                "חשוב לנו מדפים עמוקים מספיק לאלבומים.",
}

html = SRC.read_text(encoding="utf-8")
for k, v in SAMPLE.items():
    html = html.replace("{{ $json.safe." + k + " }}", v)

left = re.findall(r"\{\{.*?\}\}", html)
if left:
    sys.exit(f"נשארו ביטויים שלא הוצבו: {sorted(set(left))}")

page_file = OUT / "preview.html"
page_file.write_text(html, encoding="utf-8")

with sync_playwright() as p:
    br = p.chromium.launch()
    for label, width in (("desktop", 700), ("mobile", 390)):
        pg = br.new_page(viewport={"width": width, "height": 900}, device_scale_factor=2)
        pg.goto(page_file.as_uri())
        pg.wait_for_load_state("networkidle")
        shot = OUT / f"confirmation-{label}.png"
        pg.screenshot(path=str(shot), full_page=True)
        print(f"{label:8} {width}px -> {shot}")
    br.close()
