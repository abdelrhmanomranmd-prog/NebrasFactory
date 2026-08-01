# -*- coding: utf-8 -*-
"""hrws214: warehouse bars + georgian draw + CNC OPT + materials catalog UI."""
from pathlib import Path
import re

js = Path('js/nebras-aluminum-cutting.js')
t = js.read_text(encoding='utf-8')

# 1) stock key + state
if "ALU_STOCK_KEY" not in t:
    t = t.replace(
        "const ALU_AUDIT_KEY = 'nebrasAluminumAudit';",
        "const ALU_AUDIT_KEY = 'nebrasAluminumAudit';\n    const ALU_STOCK_KEY = 'nebrasAluminumStock';",
        1
    )
    t = t.replace(
        "let aluAudit = [];",
        "let aluAudit = [];\n    let aluStock = [];",
        1
    )
    print('stock state ok')
else:
    print('stock state exists')

# 2) persist local
if "saveLocal(ALU_STOCK_KEY" not in t:
    t = t.replace(
        "saveLocal(ALU_AUDIT_KEY, aluAudit.slice(-400));",
        "saveLocal(ALU_AUDIT_KEY, aluAudit.slice(-400));\n        saveLocal(ALU_STOCK_KEY, aluStock);",
        1
    )
    print('persist stock ok')

# 3) cloud keys default list
if "'aluminum_stock'" not in t.split("persistAluminumCuttingCloud")[1][:800]:
    t = t.replace(
        "'aluminum_colors', 'aluminum_remnants', 'aluminum_audit'",
        "'aluminum_colors', 'aluminum_remnants', 'aluminum_stock', 'aluminum_audit'",
        1
    )
    print('cloud keys ok')

# 4) getters/setters near remnants
if 'function getAluminumStock' not in t:
    anchor = 'function getAluminumRemnants() { return aluRemnants; }'
    if anchor not in t:
        # try alt
        m = re.search(r'function getAluminumRemnants\(\)\s*\{\s*return aluRemnants;\s*\}', t)
        if not m:
            raise SystemExit('getAluminumRemnants missing')
        anchor = m.group(0)
    block = """function getAluminumRemnants() { return aluRemnants; }
    function getAluminumStock() { return aluStock; }
    function setAluminumStockFromCloud(v) {
        aluStock = Array.isArray(v) ? v : [];
        saveLocal(ALU_STOCK_KEY, aluStock);
    }"""
    # if already expanded skip
    t = t.replace(anchor, block if 'getAluminumStock' not in t else anchor, 1)
    # ensure set after getAluminumAudit pattern - also load on boot
    print('stock adapters ok')

# Load stock in seed/load path - find where remnants loaded
if "loadLocal(ALU_STOCK_KEY" not in t and "ALU_STOCK_KEY" in t:
    # common pattern: aluRemnants = loadLocal(...)
    if 'aluRemnants = loadLocal(ALU_REMNANTS_KEY' in t:
        t = t.replace(
            'aluRemnants = loadLocal(ALU_REMNANTS_KEY',
            'aluStock = loadLocal(ALU_STOCK_KEY, []) || [];\n        aluRemnants = loadLocal(ALU_REMNANTS_KEY',
            1
        )
        print('load stock ok')
    else:
        # search seedDefaults end
        m = re.search(r'aluRemnants\s*=\s*loadLocal\([^)]+\)', t)
        if m:
            t = t.replace(m.group(0), 'aluStock = loadLocal(ALU_STOCK_KEY, []) || [];\n        ' + m.group(0), 1)
            print('load stock via regex ok')
        else:
            print('WARN load stock miss')

# 5) Nav warehouse
if "{ id: 'warehouse'" not in t:
    t = t.replace(
        "{ id: 'remnants', icon: 'fas fa-recycle', label: 'بنك الفضلة' },",
        "{ id: 'warehouse', icon: 'fas fa-warehouse', label: 'مخزن الأعواد' },\n                { id: 'remnants', icon: 'fas fa-recycle', label: 'بنك الفضلة' },",
        1
    )
    print('nav ok')

# 6) render branch
if "aluActiveTab === 'warehouse'" not in t:
    t = t.replace(
        "else if (aluActiveTab === 'remnants') body = renderAluRemnants();",
        "else if (aluActiveTab === 'warehouse') body = renderAluWarehouse();\n        else if (aluActiveTab === 'remnants') body = renderAluRemnants();",
        1
    )
    print('render branch ok')

# 7) Warehouse UI + functions before renderAluRemnants or removeAluPart
WAREHOUSE_FN = r'''
    function renderAluWarehouse() {
        const rows = (aluStock || []).map(function (s, i) {
            return '<tr><td>' + aluEsc(s.sku) + '</td><td>' + aluEsc(s.nameAr || '') +
                '</td><td>' + aluNum(s.lengthMm) + '</td><td>' + aluNum(s.qty) +
                '</td><td>' + aluEsc(s.note || '') +
                '</td><td><button type="button" class="erp-tag" onclick="removeAluStockBar(' + i + ')">حذف</button></td></tr>';
        }).join('') || '<tr><td colspan="6">لا أعواد في المخزن — أضف رصيداً أدناه.</td></tr>';
        const totalBars = (aluStock || []).reduce(function (n, s) { return n + Math.max(0, Math.round(aluNum(s.qty) || 0)); }, 0);
        const totalMm = (aluStock || []).reduce(function (n, s) {
            return n + Math.max(0, aluNum(s.lengthMm)) * Math.max(0, aluNum(s.qty));
        }, 0);
        return '<div class="alu-cut-form-card"><h4><i class="fas fa-warehouse"></i> مخزن أعواد الألومنيوم</h4>' +
            '<p class="alu-cut-note">رصيد فعلي لكل SKU — عند حفظ خطة التقطيع مع «ربط المخزن» يُخصم تلقائياً. أقوى من الاعتماد على طول عود واحد فقط.</p>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + totalBars + '</strong><span>أعواد</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluRound(totalMm / 1000, 1) + '</strong><span>متر طولي</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + (aluSettings.linkWarehouse ? 'مفعّل' : 'موقوف') + '</strong><span>ربط الخصم</span></div>' +
            '</div>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>SKU</span><input id="alu-st-sku" placeholder="IG-FR-01"></label>' +
            '<label class="nebras-field"><span>الاسم</span><input id="alu-st-name" placeholder="حلق …"></label>' +
            '<label class="nebras-field"><span>طول العود مم</span><input type="number" id="alu-st-len" value="' + (aluNum(aluSettings.stockBarMm) || 6500) + '"></label>' +
            '<label class="nebras-field"><span>الكمية (أعواد)</span><input type="number" id="alu-st-qty" value="10" min="1"></label>' +
            '<label class="nebras-field"><span>ملاحظة</span><input id="alu-st-note" placeholder="مورد / لون"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluStockBar()"><i class="fas fa-plus"></i> إضافة للمخزن</button>' +
            '<div class="alu-table-wrap" style="margin-top:.75rem"><table class="alu-table"><thead><tr>' +
            '<th>SKU</th><th>اسم</th><th>طول</th><th>كمية</th><th>ملاحظة</th><th></th></tr></thead><tbody>' +
            rows + '</tbody></table></div></div>';
    }

    function addAluStockBar() {
        if (!requireAluAccess()) return;
        const sku = aluField('alu-st-sku');
        if (!sku) { alert('SKU مطلوب'); return; }
        const qty = Math.max(1, Math.round(aluNum(aluField('alu-st-qty')) || 1));
        const lengthMm = aluNum(aluField('alu-st-len')) || aluSettings.stockBarMm || 6500;
        const found = aluStock.find(function (s) {
            return String(s.sku).toLowerCase() === String(sku).toLowerCase() && aluNum(s.lengthMm) === lengthMm;
        });
        if (found) {
            found.qty = aluNum(found.qty) + qty;
            found.nameAr = aluField('alu-st-name') || found.nameAr;
            found.note = aluField('alu-st-note') || found.note;
        } else {
            aluStock.push({
                id: aluId('stk'),
                sku: sku.trim(),
                nameAr: aluField('alu-st-name') || sku,
                lengthMm: lengthMm,
                qty: qty,
                note: aluField('alu-st-note') || '',
                updatedAt: new Date().toISOString()
            });
        }
        aluLog('مخزن', 'إضافة ' + qty + ' عود · ' + sku);
        persistAluminumCuttingCloud(['aluminum_stock', 'aluminum_audit']);
        renderAluminumCuttingPanel();
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم تحديث مخزن الأعواد', 'ok');
    }

    function removeAluStockBar(i) {
        if (!aluStock[i]) return;
        if (!confirm('حذف هذا الرصيد؟')) return;
        aluStock.splice(i, 1);
        persistAluminumCuttingCloud(['aluminum_stock']);
        renderAluminumCuttingPanel();
    }

'''

if 'function renderAluWarehouse' not in t:
    # insert before renderAluRemnants
    if 'function renderAluRemnants' in t:
        t = t.replace('    function renderAluRemnants', WAREHOUSE_FN + '    function renderAluRemnants', 1)
        print('warehouse fns ok')
    else:
        raise SystemExit('renderAluRemnants missing')

# 8) Upgrade consumeAluWarehouse to also debit aluStock
old_consume = """    function consumeAluWarehouse(result) {
        if (!aluSettings.linkWarehouse || !result) return;
        if (!aluSettings.warehouseStockMm || typeof aluSettings.warehouseStockMm !== 'object') {
            aluSettings.warehouseStockMm = {};
        }
        const stock = Number(result.stockBarMm) || Number(aluSettings.stockBarMm) || 6500;
        (result.plans || []).forEach(function (pl) {
            const sku = pl.profileSku || pl.profileId || '_unknown';
            const bars = (pl.plan && pl.plan.barCount) || ((pl.plan && pl.plan.bars) ? pl.plan.bars.length : 0);
            const mm = bars * stock;
            aluSettings.warehouseStockMm[sku] = Math.max(0, Number(aluSettings.warehouseStockMm[sku] || 0) - mm);
        });
        const totalBars = Number(result.totalBars) || 0;
        aluSettings.warehouseStockMm._total = Math.max(0, Number(aluSettings.warehouseStockMm._total || 0) - (totalBars * stock));
    }"""

new_consume = """    function consumeAluWarehouse(result) {
        if (!aluSettings.linkWarehouse || !result) return;
        if (!aluSettings.warehouseStockMm || typeof aluSettings.warehouseStockMm !== 'object') {
            aluSettings.warehouseStockMm = {};
        }
        const stockLen = Number(result.stockBarMm) || Number(aluSettings.stockBarMm) || 6500;
        (result.plans || []).forEach(function (pl) {
            const sku = pl.profileSku || pl.profileId || '_unknown';
            let need = (pl.plan && pl.plan.barCount) || ((pl.plan && pl.plan.bars) ? pl.plan.bars.length : 0);
            const mm = need * stockLen;
            aluSettings.warehouseStockMm[sku] = Math.max(0, Number(aluSettings.warehouseStockMm[sku] || 0) - mm);
            /* خصم من مخزن الأعواد التفصيلي */
            aluStock.forEach(function (s) {
                if (need <= 0) return;
                if (String(s.sku).toLowerCase() !== String(sku).toLowerCase()) return;
                if (aluNum(s.lengthMm) && Math.abs(aluNum(s.lengthMm) - stockLen) > 1) return;
                const take = Math.min(need, Math.max(0, Math.round(aluNum(s.qty) || 0)));
                s.qty = Math.max(0, aluNum(s.qty) - take);
                need -= take;
            });
            if (need > 0) {
                aluLog('مخزن', 'نقص رصيد ' + sku + ' بمقدار ' + need + ' عود');
            }
        });
        aluStock = aluStock.filter(function (s) { return aluNum(s.qty) > 0; });
        const totalBars = Number(result.totalBars) || 0;
        aluSettings.warehouseStockMm._total = Math.max(0, Number(aluSettings.warehouseStockMm._total || 0) - (totalBars * stockLen));
    }"""

if old_consume in t:
    t = t.replace(old_consume, new_consume, 1)
    print('consume upgraded')
elif 'خصم من مخزن الأعواد التفصيلي' in t:
    print('consume already upgraded')
else:
    print('WARN consume block mismatch')

# persist stock on cut job
if "'aluminum_stock'" not in t[t.find('persistAluminumCuttingCloud([\'aluminum_cut_jobs'):t.find('persistAluminumCuttingCloud([\'aluminum_cut_jobs')+200]:
    t = t.replace(
        "persistAluminumCuttingCloud(['aluminum_cut_jobs', 'aluminum_remnants', 'aluminum_audit', 'aluminum_estimates', 'aluminum_cut_settings']);",
        "persistAluminumCuttingCloud(['aluminum_cut_jobs', 'aluminum_remnants', 'aluminum_audit', 'aluminum_estimates', 'aluminum_cut_settings', 'aluminum_stock']);",
        1
    )
    print('cut persist stock ok')

# 9) Georgian bars on elevation — insert before dimH lines
geo_marker = "        inner += dimH(ox, ox + fw, oy + fh + 18, Wmm + ' مم');"
geo_block = """        /* شبكة جورجيا على الزجاج — مرئية للمهندس في الرسم */
        if (item.georgianType && item.georgianType !== 'none' && shape.family !== 'facade') {
            const gtype = item.georgianType;
            const gx0 = ix + sashT;
            const gy0 = iy + sashT;
            const gw0 = Math.max(8, iw - sashT * 2);
            const gh0 = Math.max(8, ih - sashT * 2);
            const colsG = gtype === 'victorian' ? 4 : (gtype === 'colonial' ? 3 : 2);
            const rowsG = gtype === 'victorian' ? 4 : (gtype === 'colonial' ? 3 : 2);
            if (gtype === 'diamond') {
                const cx = gx0 + gw0 / 2;
                const cy = gy0 + gh0 / 2;
                inner += '<polygon points="' + cx + ',' + gy0 + ' ' + (gx0 + gw0) + ',' + cy + ' ' + cx + ',' + (gy0 + gh0) + ' ' + gx0 + ',' + cy +
                    '" fill="none" stroke="' + gold + '" stroke-width="1.1" opacity="0.85"/>';
                inner += '<line x1="' + gx0 + '" y1="' + gy0 + '" x2="' + (gx0 + gw0) + '" y2="' + (gy0 + gh0) + '" stroke="' + gold + '" stroke-width="0.8" opacity="0.55"/>';
                inner += '<line x1="' + (gx0 + gw0) + '" y1="' + gy0 + '" x2="' + gx0 + '" y2="' + (gy0 + gh0) + '" stroke="' + gold + '" stroke-width="0.8" opacity="0.55"/>';
            } else {
                for (let c = 1; c < colsG; c++) {
                    const x = gx0 + (gw0 / colsG) * c;
                    inner += '<line x1="' + x + '" y1="' + gy0 + '" x2="' + x + '" y2="' + (gy0 + gh0) + '" stroke="' + gold + '" stroke-width="1" opacity="0.75"/>';
                }
                for (let r = 1; r < rowsG; r++) {
                    const y = gy0 + (gh0 / rowsG) * r;
                    inner += '<line x1="' + gx0 + '" y1="' + y + '" x2="' + (gx0 + gw0) + '" y2="' + y + '" stroke="' + gold + '" stroke-width="1" opacity="0.75"/>';
                }
            }
            const gName = (GEORGIAN_TYPES[gtype] || {}).nameAr || gtype;
            inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + 14) + '" text-anchor="middle" font-size="9" fill="' + gold + '" font-weight="700">جورجيا: ' + aluEsc(gName) + '</text>';
        }

""" + geo_marker

if 'شبكة جورجيا على الزجاج' not in t:
    if geo_marker not in t:
        raise SystemExit('geo marker missing')
    t = t.replace(geo_marker, geo_block, 1)
    print('georgian draw ok')
else:
    print('georgian draw exists')

# 10) Materials: georgian/spacer/paint catalog cards
old_mat_end = """            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>زيادة</th></tr></thead><tbody>' + cRows + '</tbody></table></div></div>';
    }"""

new_mat_end = """            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>زيادة</th></tr></thead><tbody>' + cRows + '</tbody></table></div></div>' +
            '<div class="alu-cut-form-card"><h4>كتالوج جورجيا / فواصل / دهان</h4>' +
            '<p class="alu-cut-note">تُطبَّق من بند المقايسة — الرسوم تظهر على الارتفاع، والأسعار تُحسب في الإجمالي.</p>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>جورجيا</th><th>زيادة م²</th></tr></thead><tbody>' +
            Object.keys(GEORGIAN_TYPES).map(function (k) {
                return '<tr><td>' + aluEsc(GEORGIAN_TYPES[k].nameAr) + '</td><td>' + aluNum(GEORGIAN_TYPES[k].surchargePerM2) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="alu-table-wrap" style="margin-top:.5rem"><table class="alu-table"><thead><tr><th>فاصل دبل</th><th>زيادة م²</th></tr></thead><tbody>' +
            Object.keys(SPACER_TYPES).map(function (k) {
                return '<tr><td>' + aluEsc(SPACER_TYPES[k].nameAr) + '</td><td>' + aluNum(SPACER_TYPES[k].surchargePerM2) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="alu-table-wrap" style="margin-top:.5rem"><table class="alu-table"><thead><tr><th>دهان</th><th>ر.س/كغ</th></tr></thead><tbody>' +
            Object.keys(PAINT_TYPES).map(function (k) {
                return '<tr><td>' + aluEsc(PAINT_TYPES[k].nameAr) + '</td><td>' + aluNum(PAINT_TYPES[k].perKg) + '</td></tr>';
            }).join('') + '</tbody></table></div></div>';
    }"""

if old_mat_end in t:
    t = t.replace(old_mat_end, new_mat_end, 1)
    print('materials catalog ok')
else:
    print('materials catalog skip')

# 11) CNC OPT export + shop button
if 'function exportAluCutCnc' not in t:
    cnc = r'''
    function exportAluCutCnc() {
        const result = (aluCutDraft && aluCutDraft.lastResult)
            || (aluEstimateDraft ? runFullCuttingPlan(computeEstimateTotals(aluEstimateDraft).cuts, {
                stockBarMm: aluEstimateDraft.stockBarMm, kerfMm: aluEstimateDraft.kerfMm, weightAdjustPct: aluEstimateDraft.weightAdjustPct
            }) : null);
        if (!result) { alert('شغّل التقطيع أو افتح مقايسة أولاً.'); return; }
        const lines = ['[NEBRAS-CNC-OPT]', 'STOCK=' + (result.stockBarMm || ''), 'KERF=' + (result.kerfMm || aluSettings.kerfMm || '')];
        let n = 1;
        (result.plans || []).forEach(function (pl) {
            lines.push('PROFILE=' + (pl.profileSku || '') + '|' + (pl.profileName || ''));
            (pl.plan.bars || []).forEach(function (b, bi) {
                (b.pieces || []).forEach(function (p) {
                    lines.push(['CUT', n, pl.profileSku || '', bi + 1, p.lengthMm || 0, (p.code || ''), (p.labelAr || '').replace(/\|/g, '/')].join('|'));
                    n++;
                });
            });
        });
        lines.push('[END]');
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-cnc-' + ((aluCutDraft && aluCutDraft.estimateRef) || (aluEstimateDraft && aluEstimateDraft.ref) || 'plan') + '.opt';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم تصدير ملف CNC/OPT', 'ok');
    }

'''
    t = t.replace('    function exportAluCutDxf()', cnc + '    function exportAluCutDxf()', 1)
    print('cnc export ok')

if 'exportAluCutCnc()' not in t:
    t = t.replace(
        '<button type="button" class="nebras-users-btn" onclick="exportAluCutDxf()"><i class="fas fa-drafting-compass"></i> تصدير DXF</button>',
        '<button type="button" class="nebras-users-btn" onclick="exportAluCutDxf()"><i class="fas fa-drafting-compass"></i> تصدير DXF</button>' +
        "' +\n            '" +
        '<button type="button" class="nebras-users-btn" onclick="exportAluCutCnc()"><i class="fas fa-microchip"></i> تصدير CNC/OPT</button>',
        1
    )
    # Fix potential quote breakage - do carefully
    print('cnc button attempt')

# Fix button insertion more carefully if broken
if "onclick=\"exportAluCutCnc()\"" not in t and "onclick='exportAluCutCnc()'" not in t:
    # find dxf button line in source
    m = re.search(r"(onclick=\"exportAluCutDxf\(\)\"[^']*'</button>')", t)
    if m:
        t = t.replace(
            m.group(1),
            m.group(1) + " +\n            '<button type=\"button\" class=\"nebras-users-btn\" onclick=\"exportAluCutCnc()\"><i class=\"fas fa-microchip\"></i> تصدير CNC/OPT</button>'",
            1
        )
        print('cnc button ok')
    else:
        print('WARN cnc button')

# 12) Exports globals
if 'global.exportAluCutCnc' not in t:
    t = t.replace(
        'global.exportAluCutDxf = exportAluCutDxf;',
        'global.exportAluCutDxf = exportAluCutDxf;\n    global.exportAluCutCnc = exportAluCutCnc;\n    global.addAluStockBar = addAluStockBar;\n    global.removeAluStockBar = removeAluStockBar;\n    global.getAluminumStock = getAluminumStock;\n    global.setAluminumStockFromCloud = setAluminumStockFromCloud;',
        1
    )
    print('globals ok')

# 13) Self-test extras
if 'warehouse-stock-debit' not in t:
    extra = """
        /* hrws214 — مخزن + جورجيا رسم + CNC */
        aluStock = [{ id: 't', sku: 'TEST-SKU', nameAr: 't', lengthMm: 6500, qty: 5 }];
        const fakeWh = { stockBarMm: 6500, totalBars: 2, plans: [{ profileSku: 'TEST-SKU', plan: { barCount: 2, bars: [{ pieces: [{ lengthMm: 1000, code: 'A' }] }] } }] };
        const prevLink = aluSettings.linkWarehouse;
        aluSettings.linkWarehouse = true;
        consumeAluWarehouse(fakeWh);
        assert('warehouse-stock-debit', aluStock.length === 1 && aluNum(aluStock[0].qty) === 3, 'qty=' + (aluStock[0] && aluStock[0].qty));
        aluSettings.linkWarehouse = prevLink;
        aluStock = [];
        const geoItem = Object.assign({}, slidingItem, { georgianType: 'diamond' });
        const geoSvg = aluDrawElevationSvg(geoItem);
        assert('georgian-draw', geoSvg.indexOf('جورجيا') !== -1 && geoSvg.indexOf('polygon') !== -1, 'geo svg');
        assert('cnc-export-fn', typeof exportAluCutCnc === 'function', 'cnc');

"""
    old = "        report.summary = report.ok ? 'PASS ' + report.checks.length + '/' + report.checks.length : 'FAIL ' + report.fails.length + '/' + report.checks.length;"
    if old not in t:
        raise SystemExit('selftest summary missing')
    t = t.replace(old, extra + '\n' + old, 1)
    print('selftest ok')

js.write_text(t, encoding='utf-8')
print('js written', len(t))

# Platform bridges
plat = Path('js/nebras-platform.js')
pt = plat.read_text(encoding='utf-8')
if "key: 'aluminum_stock'" not in pt:
    pt = pt.replace(
        """{ key: 'aluminum_remnants', get: function() {
                return typeof getAluminumRemnants === 'function' ? getAluminumRemnants() : [];
            }, set: function(v) {
                if (typeof setAluminumRemnantsFromCloud === 'function') setAluminumRemnantsFromCloud(v);
            }},
            { key: 'aluminum_audit', get: function() {""",
        """{ key: 'aluminum_remnants', get: function() {
                return typeof getAluminumRemnants === 'function' ? getAluminumRemnants() : [];
            }, set: function(v) {
                if (typeof setAluminumRemnantsFromCloud === 'function') setAluminumRemnantsFromCloud(v);
            }},
            { key: 'aluminum_stock', get: function() {
                return typeof getAluminumStock === 'function' ? getAluminumStock() : [];
            }, set: function(v) {
                if (typeof setAluminumStockFromCloud === 'function') setAluminumStockFromCloud(v);
            }},
            { key: 'aluminum_audit', get: function() {""",
        1
    )
    pt = pt.replace(
        "'aluminum_remnants', 'aluminum_audit'",
        "'aluminum_remnants', 'aluminum_stock', 'aluminum_audit'",
        1
    )
    pt = pt.replace(
        "'aluminum_remnants', 'aluminum_audit',",
        "'aluminum_remnants', 'aluminum_stock', 'aluminum_audit',",
        1
    )
    plat.write_text(pt, encoding='utf-8')
    print('platform stock bridge ok')
else:
    print('platform stock exists')

# CSS warehouse tip
css = Path('css/57-aluminum-cutting.css')
c = css.read_text(encoding='utf-8')
if 'alu-wh-empty' not in c:
    c += """

/* hrws214 warehouse */
.alu-cut-form-card .fa-warehouse { color: var(--alu-accent, #155e94); }
"""
    css.write_text(c, encoding='utf-8')
    print('css ok')

# bump index
idx = Path('index.html')
it = idx.read_text(encoding='utf-8')
if 'hrws213' in it:
    idx.write_text(it.replace('hrws213', 'hrws214'), encoding='utf-8')
    print('bumped hrws214')
elif 'hrws214' in it:
    print('already hrws214')
else:
    print('WARN bump')
