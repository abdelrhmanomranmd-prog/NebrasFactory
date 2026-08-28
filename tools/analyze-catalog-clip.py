#!/usr/bin/env python3
from PIL import Image
import os

base = os.path.join(os.path.dirname(__file__), '..', 'images', 'catalog', 'wpc-photos', 'by-sku-clean')

for name in sorted(os.listdir(base)):
    if not name.endswith('.png'):
        continue
    p = os.path.join(base, name)
    im = Image.open(p).convert('RGB')
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r < 235 or g < 235 or b < 235:
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    du_w, du_h = x1 - x0 + 1, y1 - y0 + 1
    margin_x = int(du_w * 0.09)
    margin_y_top = int(du_h * 0.08)
    margin_y_bot = int(du_h * 0.06)
    ix0, ix1 = x0 + margin_x, x1 - margin_x
    iy0, iy1 = y0 + margin_y_top, y1 - margin_y_bot
    top = round(iy0 / h * 100, 1)
    right = round((w - ix1) / w * 100, 1)
    bottom = round((h - iy1) / h * 100, 1)
    left = round(ix0 / w * 100, 1)
    clip = f"{top}% {right}% {bottom}% {left}%"
    if 'SLD' in name or 'LQ' in name or name.endswith('STD.png'):
        print(name, clip)
