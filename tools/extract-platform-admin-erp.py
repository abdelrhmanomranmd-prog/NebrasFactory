#!/usr/bin/env python3
"""Extract ERP admin UI from nebras-platform.js → nebras-platform-admin-erp.js (hrws276)."""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM = os.path.join(ROOT, 'js', 'nebras-platform.js')
OUT = os.path.join(ROOT, 'js', 'nebras-platform-admin-erp.js')

lines = open(PLATFORM, encoding='utf-8').readlines()

def should_extract(lineno):
    if 16153 <= lineno <= 16299:
        return True
    if 16325 <= lineno <= 17516:
        return True
    return False

extracted = []
new_platform = []
for i, line in enumerate(lines):
    lineno = i + 1
    if should_extract(lineno):
        extracted.append(line)
    else:
        if lineno == 16153:
            new_platform.append('        /* ERP admin UI → js/nebras-platform-admin-erp.js (hrws276 lazy) */\n')
        new_platform.append(line)

header = (
    '/**\n'
    ' * نبراس hrws276 — واجهة ERP الإدارية (platformAdminErp · lazy)\n'
    ' * يُحمَّل مع bootNebrasAdminSession — الزائر لا يحمّل هذا الملف.\n'
    ' */\n'
)
footer = (
    '\n        if (typeof window !== \'undefined\') {\n'
    '            window.__NEBRAS_ERP_UI_LOADED__ = true;\n'
    '            window.openErpModule = openErpModule;\n'
    '            window.openErpInventory = openErpInventory;\n'
    '            window.openErpProduction = openErpProduction;\n'
    '            window.addErpProductionEntry = addErpProductionEntry;\n'
    '            window.deleteErpProductionEntry = deleteErpProductionEntry;\n'
    '            window.openErpProcurement = openErpProcurement;\n'
    '            window.addErpPurchase = addErpPurchase;\n'
    '            window.deleteErpPurchase = deleteErpPurchase;\n'
    '            window.openErpAccounting = openErpAccounting;\n'
    '            window.addErpTransfer = addErpTransfer;\n'
    '            window.deleteErpTransfer = deleteErpTransfer;\n'
    '            window.openErpOrders = openErpOrders;\n'
    '            window.addErpOrder = addErpOrder;\n'
    '            window.updateErpOrderStatus = updateErpOrderStatus;\n'
    '            window.deleteErpOrder = deleteErpOrder;\n'
    '            window.saveErpInventoryItem = saveErpInventoryItem;\n'
    '            window.editErpInventoryItem = editErpInventoryItem;\n'
    '            window.cancelErpInventoryEdit = cancelErpInventoryEdit;\n'
    '            window.deleteErpInventoryItem = deleteErpInventoryItem;\n'
    '            window.openErpWarehouseTransfers = openErpWarehouseTransfers;\n'
    '            window.addErpStockTransfer = addErpStockTransfer;\n'
    '            window.deleteErpStockTransfer = deleteErpStockTransfer;\n'
    '        }\n'
)

open(OUT, 'w', encoding='utf-8', newline='\n').write(header + ''.join(extracted) + footer)
open(PLATFORM, 'w', encoding='utf-8', newline='\n').writelines(new_platform)

print('Extracted', len(extracted), 'lines ->', os.path.relpath(OUT, ROOT))
print('Platform.js now', len(new_platform), 'lines')
