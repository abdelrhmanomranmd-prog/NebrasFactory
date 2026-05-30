"""
استيراد صور الرولّات الرسمية من كتالوج نبراس (GitHub Pages).
التشغيل: python scripts/import-nibras-catalog-rolls.py

المصدر: https://abuhamza2026.github.io/nibras-catalog/
"""
import base64
import json
import re
import urllib.request
from pathlib import Path

CATALOG_URL = "https://raw.githubusercontent.com/abuhamza2026/nibras-catalog/main/index.html"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "images" / "rolls"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("Downloading catalog…")
    with urllib.request.urlopen(CATALOG_URL, timeout=120) as resp:
        text = resp.read().decode("utf-8", errors="ignore")

    idx = text.find("const colors = ")
    if idx < 0:
        raise SystemExit("colors array not found in catalog HTML")

    start = idx + len("const colors = ")
    depth = 0
    end = None
    for j in range(start, len(text)):
        if text[j] == "[":
            depth += 1
        elif text[j] == "]":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    if end is None:
        raise SystemExit("could not parse colors JSON")

    colors = json.loads(text[start:end])
    print("Found", len(colors), "roll textures")

    for c in colors:
        code = str(c.get("code", ""))
        num = re.sub(r"\D", "", code)
        img = c.get("img", "")
        if not img.startswith("data:image"):
            continue
        header, b64 = img.split(",", 1)
        ext = "jpg" if "jpeg" in header else "png"
        data = base64.b64decode(b64)
        path = OUT / f"N-{num}.{ext}"
        path.write_bytes(data)
        print("  wrote", path.name, "—", c.get("en", ""))

    print("Done. Images saved to", OUT)


if __name__ == "__main__":
    main()
