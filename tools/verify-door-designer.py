#!/usr/bin/env python3
"""Verify door designer: SVG studio live, export presets, 360° turntable."""
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

    if "designCanvasMode: 'studio-live'" not in js:
        err('DEFAULT door designer should use studio-live mode')
    if 'DOOR_DESIGNER_LIVE_USE_PHOTO_PRESETS = false' not in js:
        err('Live preview must use dynamic SVG studio (photo presets off)')
    if 'const ROT_MIN = -180' not in js or 'const ROT_MAX = 180' not in js:
        err('360° turntable rotation missing')
    if 'mode: \'bake-transom\'' not in js:
        err('bake-transom MDF mode missing for quote/export photos')
    if 'paintDoorDesignerLivePreview' not in js:
        err('paintDoorDesignerLivePreview missing')
    if 'bindDoorDesignerTurntable' not in js:
        err('bindDoorDesignerTurntable missing')
    if re.search(
        r"if \(cfg\.enabled !== false\)[\s\S]{0,350}cfg\.designCanvasMode = 'studio-live'",
        js,
    ) is None:
        err('Enabled door designer must force studio-live (not 3D hijack)')

    # Export / quote photo pipeline
    if 'resolveDoorDesignerPhotoPreset' not in js:
        err('resolveDoorDesignerPhotoPreset missing for export photos')
    if 'composeDoorPhotoWithRoll' not in js:
        err('composeDoorPhotoWithRoll missing for export color bake')

    # Regression guards
    if 'composeRoll: false' in js:
        err('composeRoll: false still present — live preview color may freeze')
    if "toDataURL('image/png')" not in js:
        err('PNG compose missing in composeDoorPhotoWithRoll')

    # Studio SVG visible; photo preset hidden when not active
    if ':not(.wpc-door-stage--photo-preset) .wpc-door-svg-overlay' not in css:
        warn('CSS guard for SVG-over-photo ghost layers may be missing')

    # Preset map vs files
    preset_paths = re.findall(r"DOOR_PHOTO_PRESET_ROOT\s*\+\s*'([^']+)'", js)
    missing = []
    for rel in preset_paths:
        path = os.path.join(ROOT, 'images', 'doors', 'presets', rel.replace('/', os.sep))
        if not os.path.isfile(path):
            missing.append(rel)
    if missing:
        err(f'Missing {len(missing)} door preset images: {missing[:5]}...')

    m = re.search(r"DOOR_PHOTO_PRESET_CACHE\s*=\s*'(\d+)'", js)
    if m:
        print(f'DOOR_PHOTO_PRESET_CACHE = {m.group(1)}')
    m2 = re.search(r"dataSeed: '([^']+)'", js)
    if m2:
        print(f'dataSeed = {m2.group(1)}')

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
