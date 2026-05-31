#!/usr/bin/env python3
"""Verify door designer: presets, color pipeline, no regression flags."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
CSS = os.path.join(ROOT, 'css', '12-door-designer.css')
ERRORS = []
WARNINGS = []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNINGS.append(msg)


def main():
    with open(JS, encoding='utf-8') as f:
        js = f.read()
    with open(CSS, encoding='utf-8') as f:
        css = f.read()

    # Regression guards
    if 'composeRoll: false' in js:
        err('composeRoll: false still present — live preview color may freeze')
    if 'has-roll-css-only' in js or 'has-roll-css-only' in css:
        err('has-roll-css-only still present — disables instant color layers')
    if "toDataURL('image/jpeg'" in js:
        warn('JPEG compose found — may cause pixelation; prefer PNG')
    if "toDataURL('image/png')" not in js:
        err('PNG compose missing in composeDoorPhotoWithRoll')
    if not re.search(r'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS\s*=\s*true', js):
        err('DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS is not true')
    if 'applyComposedRollToPhotoPresetImg(img' not in js:
        err('applyComposedRollToPhotoPresetImg not called — color bake missing')
    if 'has-door-roll-tint::after' not in css:
        err('Instant CSS tint layer (::after) missing from door designer CSS')
    if 'grayscale(1)' in css and 'has-roll-composite' in css:
        pass  # expected: grayscale only until composite ready

    # Preset map vs files
    preset_paths = re.findall(r"DOOR_PHOTO_PRESET_ROOT\s*\+\s*'([^']+)'", js)
    missing = []
    for rel in preset_paths:
        path = os.path.join(ROOT, 'images', 'doors', 'presets', rel.replace('/', os.sep))
        if not os.path.isfile(path):
            missing.append(rel)
    if missing:
        err(f'Missing {len(missing)} door preset images: {missing[:5]}...')

    # Roll swatches
    roll_dir = os.path.join(ROOT, 'images', 'rolls')
    if os.path.isdir(roll_dir):
        rolls = [f for f in os.listdir(roll_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        if len(rolls) < 15:
            warn(f'Only {len(rolls)} roll swatch images in images/rolls')
    else:
        warn('images/rolls directory not found')

    # Cache bust version
    m = re.search(r"DOOR_PHOTO_PRESET_CACHE\s*=\s*'(\d+)'", js)
    if m:
        print(f'DOOR_PHOTO_PRESET_CACHE = {m.group(1)}')

    print('=== DOOR DESIGNER VERIFY ===')
    print(f'Preset paths in map: {len(preset_paths)}')
    print(f'Missing preset files: {len(missing)}')
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    print(f'WARNINGS: {len(WARNINGS)}')
    for w in WARNINGS:
        print(f'  WARN: {w}')
    if ERRORS:
        print('RESULT: FAILED')
        sys.exit(1)
    print('RESULT: PASS — door designer pipeline OK')
    sys.exit(0)


if __name__ == '__main__':
    main()
