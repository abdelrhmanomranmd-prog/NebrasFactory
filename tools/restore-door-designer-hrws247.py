#!/usr/bin/env python3
"""Restore door designer JS blocks from hrws247 baseline (pre 2-day experiments)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUR = ROOT / 'js' / 'nebras-platform.js'
OLD = ROOT / 'tools' / '_hrws247_platform.js'


def find_line(lines: list[str], pattern: str) -> int:
    for i, line in enumerate(lines):
        if pattern in line:
            return i
    raise SystemExit(f'pattern not found: {pattern}')


def main() -> None:
    if not OLD.exists():
        raise SystemExit(f'Missing {OLD} — export with: git show 418feef:js/nebras-platform.js')

    cur = CUR.read_text(encoding='utf-8').splitlines()
    old = OLD.read_text(encoding='utf-8-sig').splitlines()

    cur_engine_start = find_line(cur, 'const DOOR_PHOTO_PRESET_ROOT')
    cur_engine_end = find_line(cur, 'const WPC_RAW_BARE_ROWS')
    old_engine_start = find_line(old, 'const DOOR_PHOTO_PRESET_ROOT')
    old_engine_end = find_line(old, 'const WPC_RAW_BARE_ROWS')

    cur_ui_start = find_line(cur, 'function openDoorDesignerFromGateway')
    cur_ui_end = find_line(cur, 'function isBrandIntroVisible')
    old_ui_start = find_line(old, 'function openDoorDesignerFromGateway')
    old_ui_end = find_line(old, 'function isBrandIntroVisible')

    merged = (
        cur[:cur_engine_start]
        + old[old_engine_start:old_engine_end]
        + cur[cur_engine_end:cur_ui_start]
        + old[old_ui_start:old_ui_end]
        + cur[cur_ui_end:]
    )
    CUR.write_text('\n'.join(merged) + '\n', encoding='utf-8')
    print(
        'door designer restored:',
        f'engine {old_engine_end - old_engine_start} lines,',
        f'ui {old_ui_end - old_ui_start} lines',
    )


if __name__ == '__main__':
    main()
