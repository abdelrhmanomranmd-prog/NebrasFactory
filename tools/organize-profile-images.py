#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src_dir = ROOT / 'images' / 'profile-2026'
out_root = ROOT / 'images' / 'profile-2026'

RANGES = {
    'doors': (0, 12),
    'cabinets': (12, 32),
    'cnc': (32, 47),
    'gallery-extra': (47, 94),
}

mapping = {}

def copy_range(folder, start, end):
    dest_dir = out_root / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for idx in range(start, end):
        src = src_dir / f'profile-img-{idx:03d}.jpg'
        if not src.exists():
            continue
        dest = dest_dir / f'{folder}-{len(paths) + 1:02d}.jpg'
        if not dest.exists() or dest.stat().st_size != src.stat().st_size:
            shutil.copy2(src, dest)
        paths.append(str(dest.relative_to(ROOT)).replace('\\', '/'))
    mapping[folder] = paths

for folder, (a, b) in RANGES.items():
    copy_range(folder, a, b)

# hero from first door image
hero_src = out_root / 'doors' / 'doors-01.jpg'
if hero_src.exists():
    hero_dest = out_root / 'hero-cover.jpg'
    shutil.copy2(hero_src, hero_dest)
    mapping['hero'] = [str(hero_dest.relative_to(ROOT)).replace('\\', '/')]

manifest = out_root / 'manifest.json'
manifest.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding='utf-8')
for k, v in mapping.items():
    print(k, len(v))
