# -*- coding: utf-8 -*-
"""Map Riwaq door images onto Nebras SKUs — ONLY when type/finish/leaf truly match.

Rules (from Riwaq DOOR_LOOKS vs Nebras industrial SKUs):
- WPC flat / classic / glass / leaf&quarter ← Riwaq wpc-* images of the same finish+leaf
- NEVER map uPVC → WPC-U (U-channel ≠ uPVC)
- NEVER map double-leaf → sliding
- NEVER map groove/line → stainless steel decor
- U / Lib / Sliding / Steel keep authentic Nebras factory photos from by-sku
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMP = ROOT / "images" / "riwaq-import"
BY_SKU = ROOT / "images" / "catalog" / "wpc-photos" / "by-sku"
CLEAN = ROOT / "images" / "catalog" / "wpc-photos" / "by-sku-clean"
ALU = ROOT / "images" / "catalog" / "aluminum" / "by-sku"
CLAD = ROOT / "images" / "catalog" / "cladding"
SHOW = ROOT / "images" / "riwaq-import" / "nebras-showcase"

# True type matches only — Riwaq family+finish+leaf ↔ Nebras SKU meaning
WPC_TRUE_MATCH = {
    # Flat plain — single leaf
    "WPC-RDY-FLAT-45-STD.png": "doors/wpc-flat-single-walnut.png",
    "WPC-RDY-FLAT-45-N110.png": "doors/wpc-flat-single-white.png",
    "WPC-SUP-FLAT-45-STD.png": "doors/wpc-flat-single-walnut.png",
    "WPC-SUP-FLAT-45-N110.png": "doors/wpc-flat-single-white.png",
    # Classic decor — single leaf
    "WPC-RDY-FLAT-CLS.png": "doors/wpc-classic-single-walnut.png",
    "WPC-SUP-FLAT-CLS.png": "doors/wpc-classic-single-walnut.png",
    # Glass decor — single leaf
    "WPC-RDY-FLAT-GLASS.png": "doors/wpc-glass-single-walnut.png",
    "WPC-SUP-FLAT-GLASS.png": "doors/wpc-glass-single-walnut.png",
    # Leaf & quarter — flat
    "WPC-RDY-LQ-FLAT.png": "doors/wpc-flat-quarter-walnut.png",
    "WPC-SUP-LQ-FLAT.png": "doors/wpc-flat-quarter-walnut.png",
}

ALU_MAP = {
    "ALU-WIN-SLD2.png": "aluminum/aluminum-sliding-window-bronze.png",
    "ALU-WIN-SLD.png": "aluminum/aluminum-sliding-window-white.png",
    "ALU-DOR-SLD.png": "aluminum/aluminum-sliding-door-bronze.png",
    "ALU-DOR-FLD.png": "aluminum/hero-reel-alu-folding.png",
    "ALU-FAC-CLAD.png": "cladding/aluminum-cladding-champagne.png",
    "ALU-FAC-GRID.png": "aluminum/aluminum-curtain-wall.png",
    "ALU-WIN-CASE.png": "aluminum/aluminum-sliding-window.png",
}

CLAD_MAP = {
    "CLAD-PLN-OAK.png": "cladding/aluminum-cladding-champagne.png",
}

# Showcase / hydra — WPC looks only (no uPVC mixed into WPC galleries)
SHOWCASE = [
    "doors/wpc-flat-single-walnut.png",
    "doors/wpc-classic-single-walnut.png",
    "doors/wpc-glass-single-walnut.png",
    "doors/wpc-flat-quarter-walnut.png",
    "doors/wpc-flat-double-walnut.png",
    "doors/wpc-flat-single-white.png",
    "doors/wpc-classic-single-white.png",
    "doors/hero-doors-hall.png",
    "aluminum/aluminum-sliding-window-bronze.png",
    "aluminum/aluminum-sliding-door-bronze.png",
    "aluminum/aluminum-curtain-wall.png",
    "cladding/aluminum-cladding-champagne.png",
]


def restore_clean_from_bysku():
    """Put authentic Nebras photos back into by-sku-clean before selective Riwaq overlay."""
    CLEAN.mkdir(parents=True, exist_ok=True)
    n = 0
    for src in BY_SKU.glob("WPC-*.png"):
        dest = CLEAN / src.name
        shutil.copy2(src, dest)
        n += 1
        print("RESTORE", src.name, src.stat().st_size)
    return n


def copy_map(mapping, dest_dir, label):
    dest_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    for dest_name, src_rel in mapping.items():
        src = IMP / src_rel
        if not src.exists():
            print("MISSING", label, src_rel)
            continue
        dest = dest_dir / dest_name
        shutil.copy2(src, dest)
        print("MAP", label, dest_name, "<-", src_rel, dest.stat().st_size)
        n += 1
    return n


def main():
    restored = restore_clean_from_bysku()
    n1 = copy_map(WPC_TRUE_MATCH, CLEAN, "wpc-true")
    n2 = copy_map(ALU_MAP, ALU, "alu")
    n3 = copy_map(CLAD_MAP, CLAD, "clad")
    SHOW.mkdir(parents=True, exist_ok=True)
    show_paths = []
    for rel in SHOWCASE:
        src = IMP / rel
        if not src.exists():
            print("SHOWCASE missing", rel)
            continue
        dest = SHOW / src.name
        shutil.copy2(src, dest)
        show_paths.append("images/riwaq-import/nebras-showcase/" + src.name)
    meta = {
        "restoredFromBySku": restored,
        "wpcTrueMatched": n1,
        "aluMapped": n2,
        "cladMapped": n3,
        "showcase": show_paths,
        "rule": "uPVC/double/groove never overwrite U/Lib/SLD/steel Nebras photos",
    }
    (ROOT / "tools" / "riwaq-nebras-showcase.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("DONE", meta)


if __name__ == "__main__":
    main()
