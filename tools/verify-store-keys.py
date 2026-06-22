#!/usr/bin/env python3
"""Verify nebras_data_store keys in SQL match NEBRAS_CLOUD_STORE_SPECS in JS."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "js" / "nebras-platform.js"
SQL_FILES = [
    ROOT / "supabase" / "001-nebras-platform-v2.sql",
    ROOT / "supabase" / "023-nebras-store-keys-complete.sql",
]


def js_keys():
    text = JS.read_text(encoding="utf-8")
    block = re.search(r"const NEBRAS_CLOUD_STORE_SPECS = \[(.*?)\n        \];", text, re.S)
    if not block:
        sys.exit("NEBRAS_CLOUD_STORE_SPECS not found")
    return sorted(set(re.findall(r"\{ key: '([a-z_]+)'", block.group(1))))


def sql_keys():
    keys = set()
    for path in SQL_FILES:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        keys.update(re.findall(r"^\s+\('([a-z_]+)',\s*'", text, re.M))
    return sorted(keys)


def main():
    jk = js_keys()
    sk = sql_keys()
    extra_sql = sorted(set(sk) - set(jk))
    missing_sql = sorted(set(jk) - set(sk))
    print(f"JS specs: {len(jk)} keys")
    print(f"SQL bootstrap: {len(sk)} keys")
    if extra_sql:
        print(f"SQL only (OK if admin_recovery_otp): {extra_sql}")
    if missing_sql:
        print(f"MISSING in SQL: {missing_sql}")
        sys.exit(1)
    if extra_sql == ["admin_recovery_otp"]:
        print("OK — 67 app keys + admin_recovery_otp in SQL")
        return
    if not missing_sql and not extra_sql:
        print("OK — perfect match")
        return
    if not missing_sql:
        print("OK — SQL covers all app keys")
        return
    sys.exit(1)


if __name__ == "__main__":
    main()
