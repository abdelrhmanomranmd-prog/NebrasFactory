"""Extract 20 WPC roll swatches from local catalog JPEG (قديم — للاحتياط فقط).

للصور الرسمية مثل https://abuhamza2026.github.io/nibras-catalog/ استخدمي:
  python scripts/import-nibras-catalog-rolls.py
"""
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "images" / "background-Nebras-colour-catalogue-(rolls).jpeg"
OUT = ROOT / "images" / "rolls"
OUT.mkdir(parents=True, exist_ok=True)

# 7 أعمدة × 3 صفوف — الصف الثالث فيه 6 ألوان فقط (N-16..21)
GRID = [
    (0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (0, 5), (0, 6),
    (1, 0), (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
    (2, 0), (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
]
CODES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21]

COLS, ROWS = 7, 3

# الكارت الذهبي داخل كل خلية (بدون أسماء السطرين أسفل الخلية)
SWATCH_IN_CELL = (0.10, 0.02, 0.90, 0.68)


def crop_bounds(w, h):
    ratio = h / w
    if ratio < 0.55:
        return 0.035, 0.19, 0.965, 0.81
    return 0.04, 0.30, 0.96, 0.72


def main():
    img = Image.open(CATALOG).convert("RGB")
    w, h = img.size
    left, top, right, bottom = crop_bounds(w, h)
    x0, y0 = int(w * left), int(h * top)
    x1, y1 = int(w * right), int(h * bottom)
    gw, gh = x1 - x0, y1 - y0
    cw, ch = gw / COLS, gh / ROWS
    sx0, sy0, sx1, sy1 = SWATCH_IN_CELL
    print("catalog", w, "x", h)

    for idx, (row, col) in enumerate(GRID):
        code = CODES[idx]
        cx = x0 + col * cw
        cy = y0 + row * ch
        box = (
            int(cx + cw * sx0),
            int(cy + ch * sy0),
            int(cx + cw * sx1),
            int(cy + ch * sy1),
        )
        tile = img.crop(box)
        tile = tile.resize((360, 420), Image.Resampling.LANCZOS)
        out = OUT / f"N-{code}.jpg"
        tile.save(out, quality=95)
        print("wrote", out.name)

    print("done:", len(GRID), "swatches")


if __name__ == "__main__":
    main()
