# -*- coding: utf-8 -*-
"""Map imported Riwaq images onto Nebras catalog SKU paths + write showcase list."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMP = ROOT / "images" / "riwaq-import"
WPC = ROOT / "images" / "catalog" / "wpc-photos" / "by-sku-clean"
ALU = ROOT / "images" / "catalog" / "aluminum" / "by-sku"
CLAD = ROOT / "images" / "catalog" / "cladding"
SHOW = ROOT / "images" / "riwaq-import" / "nebras-showcase"

# Nebras SKU <- Riwaq relative under riwaq-import
WPC_MAP = {
    "WPC-RDY-FLAT-45-STD.png": "doors/wpc-flat-single-walnut.png",
    "WPC-RDY-FLAT-STEEL.png": "doors/wpc-flat-single-groove.png",
    "WPC-RDY-FLAT-GLASS.png": "doors/wpc-glass-single-walnut.png",
    "WPC-RDY-FLAT-CLS.png": "doors/wpc-classic-single-walnut.png",
    "WPC-RDY-U45-STD.png": "doors/upvc-flat-single-anthracite.png",
    "WPC-RDY-U45-STEEL.png": "doors/upvc-flat-single-groove.png",
    "WPC-RDY-U60-STD.png": "doors/upvc-classic-single-anthracite.png",
    "WPC-RDY-U60-GLASS.png": "doors/upvc-glass-single-white.png",
    "WPC-RDY-LIB40-STD.png": "doors/wpc-classic-single-white.png",
    "WPC-RDY-LIB40-STEEL.png": "doors/wpc-flat-single-white.png",
    "WPC-RDY-LIB40-GLASS.png": "doors/wpc-glass-single-twolite.png",
    "WPC-RDY-LQ-FLAT.png": "doors/wpc-flat-quarter-walnut.png",
    "WPC-RDY-LQ-U.png": "doors/upvc-flat-single-cream.png",
    "WPC-RDY-SLD-FLAT.png": "doors/wpc-flat-double-walnut.png",
    "WPC-RDY-SLD-U.png": "doors/upvc-flat-double-anthracite.png",
    "WPC-SUP-FLAT-45-STD.png": "doors/wpc-flat-single-walnut.png",
    "WPC-SUP-U45-STD.png": "doors/upvc-flat-single-anthracite.png",
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

SHOWCASE = [
    "doors/wpc-flat-single-walnut.png",
    "doors/wpc-classic-single-walnut.png",
    "doors/wpc-glass-single-walnut.png",
    "doors/wpc-flat-quarter-walnut.png",
    "doors/wpc-flat-double-walnut.png",
    "doors/upvc-flat-single-anthracite.png",
    "doors/upvc-glass-single-white.png",
    "doors/hero-doors-hall.png",
    "aluminum/aluminum-sliding-window-bronze.png",
    "aluminum/aluminum-sliding-door-bronze.png",
    "aluminum/aluminum-curtain-wall.png",
    "cladding/aluminum-cladding-champagne.png",
]


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
    SHOW.mkdir(parents=True, exist_ok=True)
    n1 = copy_map(WPC_MAP, WPC, "wpc")
    n2 = copy_map(ALU_MAP, ALU, "alu")
    n3 = copy_map(CLAD_MAP, CLAD, "clad")
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
        "wpcMapped": n1,
        "aluMapped": n2,
        "cladMapped": n3,
        "showcase": show_paths,
    }
    (ROOT / "tools" / "riwaq-nebras-showcase.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("DONE", meta)


if __name__ == "__main__":
    main()
