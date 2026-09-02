# -*- coding: utf-8 -*-
"""
בונה את ה-wordmark של אלון ברששת כ-SVG עצמאי, באותם טוקנים של style.css,
ומרנדר אותו ל-PNG דרך Chromium (עם גופני המערכת האמיתיים).

הקנבס נחתך לגבולות הדיו בפועל (actualBoundingBox), לא לתיבת ה-em של הגופן —
אחרת נוצרים שוליים לבנים מיותרים סביב הלוגו במייל.
"""
import json, pathlib
from playwright.sync_api import sync_playwright

OUT = pathlib.Path(__file__).parent

# --- טוקנים, מועתקים מ-style.css ---
OAK, RULE, INK_SOFT, PAPER = "#7A4E24", "#9BA29C", "#5A6165", "#E8E9E4"
SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Hebrew", "Arial Hebrew", Arial, sans-serif'
NAME, SUB = "אלון ברששת", "נגרות בהזמנה"

S = 2                              # הכפלה כדי שה-PNG יהיה חד; הפרופורציות זהות לעמוד
NAME_PX, NAME_W = 25 * S, 800      # .mark-name
NAME_LS = -0.015 * NAME_PX
SUB_PX,  SUB_W  = 15 * S, 600      # .mark-sub
SUB_LS  = 0.03 * SUB_PX
GAP     = 0.6 * 16 * S             # .mark gap
RULE_W  = 2.0 * 16 * S             # .mark-rule
PAD     = 12 * S

MEASURE = """
([sans, name, namePx, nameLs, nameW, sub, subPx, subLs, subW]) => {
  const ctx = document.createElement('canvas').getContext('2d');
  const m = (t, px, ls, w) => {
    ctx.letterSpacing = ls + 'px';
    ctx.font = `${w} ${px}px ${sans}`;
    const r = ctx.measureText(t);
    return {adv: r.width, up: r.actualBoundingBoxAscent, dn: r.actualBoundingBoxDescent};
  };
  return {name: m(name, namePx, nameLs, nameW), sub: m(sub, subPx, subLs, subW)};
}
"""

def build(nx, ny, sx, sy, rx, ry, w, h):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.0f} {h:.0f}" role="img" aria-label="אלון ברששת · נגרות בהזמנה">
  <title>אלון ברששת · נגרות בהזמנה</title>
  <rect width="100%" height="100%" fill="{PAPER}"/>
  <style>
    .n {{ font-family: {SANS}; font-weight: {NAME_W}; font-size: {NAME_PX}px;
         letter-spacing: {NAME_LS:.3f}px; fill: {OAK}; }}
    .s {{ font-family: {SANS}; font-weight: {SUB_W}; font-size: {SUB_PX}px;
         letter-spacing: {SUB_LS:.3f}px; fill: {INK_SOFT}; }}
  </style>
  <text class="n" x="{nx:.1f}" y="{ny:.1f}" text-anchor="end" direction="rtl">{NAME}</text>
  <rect x="{rx:.1f}" y="{ry:.1f}" width="{RULE_W:.0f}" height="1" fill="{RULE}"/>
  <text class="s" x="{sx:.1f}" y="{sy:.1f}" text-anchor="end" direction="rtl">{SUB}</text>
</svg>
'''

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page()
    pg.set_content("<body style='margin:0'></body>")
    m = pg.evaluate(MEASURE, [SANS, NAME, NAME_PX, NAME_LS, NAME_W, SUB, SUB_PX, SUB_LS, SUB_W])
    n, s = m["name"], m["sub"]

    # כל טקסט ממורכז אנכית על אותו קו מרכז (כמו align-items:center ב-.mark)
    band = max(n["up"], s["up"])          # גובה גוף האות; ן' הסופית חורגת מתחתיו
    H  = band + 2 * PAD
    CY = H / 2
    ny = CY + n["up"] / 2                 # קו בסיס שממרכז את גוף האות על CY
    sy = CY + s["up"] / 2
    assert PAD >= max(n["dn"], s["dn"]), "השוליים התחתונים קטנים מזנב האות"

    W = PAD + n["adv"] + GAP + RULE_W + GAP + s["adv"] + PAD
    name_left = W - PAD - n["adv"]
    rule_x    = name_left - GAP - RULE_W
    sub_left  = rule_x - GAP - s["adv"]

    svg = build(name_left, ny, sub_left, sy, rule_x, CY - 0.5, W, H)
    (OUT / "logo-wordmark.svg").write_text(svg, encoding="utf-8")

    pg2 = br.new_page(viewport={"width": round(W), "height": round(H)}, device_scale_factor=3)
    pg2.goto((OUT / "logo-wordmark.svg").as_uri())
    pg2.screenshot(path=str(OUT / "logo-wordmark.png"))
    print(f"svg {W:.0f}x{H:.0f}  ->  png {round(W)*3}x{round(H)*3} @3x")
    br.close()
