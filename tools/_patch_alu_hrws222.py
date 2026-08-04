# -*- coding: utf-8 -*-
"""hrws222 — ترقية دقة ورسومات التخصيمات"""
from pathlib import Path

path = Path('js/nebras-aluminum-cutting.js')
t = path.read_text(encoding='utf-8')
orig = t

# --- 1) Helpers after slidingSashHeightMm ---
HELPERS = r'''
    /** ارتفاع ضرفة السحاب — يخصم كعب الباب من الأرض إن وُجد */
    function slidingSashHeightMm(H, d, isSlidingDoor) {
        const heel = isSlidingDoor ? aluNum(d && d.sashFromFloorMm) : 0;
        return aluRound(Math.max(0, H - aluNum(d && d.sashDeductH) - heel), 1);
    }

    /**
     * صافي عرض ورقة مفصلي بعد خصم رؤية المرد بين الضلف
     * leafClear = (W − (n−1)×mullSight) / n
     * إن كانت الرؤية 0 يطابق السلوك القديم W/n
     */
    function hingedLeafClearWidthMm(W, leaves, d, sys) {
        const n = Math.max(1, Math.round(aluNum(leaves) || 1));
        if (n <= 1) return aluRound(Math.max(0, W), 1);
        let sight = aluNum(d && d.mullionSightMm);
        if (sight <= 0 && sys) {
            const mp = partForRole(sys, 'mullion');
            sight = mp ? aluNum(mp.thicknessMm) : 0;
        }
        if (sight < 0) sight = 0;
        return aluRound(Math.max(0, (W - (n - 1) * sight) / n), 1);
    }

    /** مقاس ضرفة مفصلي (عرض×ارتفاع) بعد التخصيمات — مصدر واحد للقطع والزجاج والرسم */
    function hingedSashSizeMm(W, H, leaves, d, sys, isDoor) {
        const n = Math.max(1, Math.round(aluNum(leaves) || 1));
        const heel = isDoor ? aluNum(d && d.sashFromFloorMm) : 0;
        const leafClear = hingedLeafClearWidthMm(W, n, d, sys);
        const sashW = aluRound(Math.max(0, leafClear - aluNum(d && d.sashDeductW)), 1);
        const sashH = aluRound(Math.max(0, H - aluNum(d && d.sashDeductH) - heel), 1);
        return { sashW: sashW, sashH: sashH, leafClear: leafClear, heel: heel, leaves: n };
    }

    /** خطوات معادلة مقروءة للمهندس — شفافية كاملة قبل القص */
    function buildFormulaSteps(item) {
        const shape = resolveItemShape(item);
        const found = findSystem(item.profileSystemId, shape.family);
        const sys = found.system;
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const leaves = Math.max(1, shape.leaves || 1);
        const cols = shape.bayCols || Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = shape.bayRows || Math.max(1, Math.round(aluNum(item.bayRows) || 1));
        const steps = [];
        steps.push({ k: 'الفتحة', v: W + ' × ' + H + ' مم · كمية ' + Math.max(1, Math.round(aluNum(item.qty) || 1)) });
        steps.push({ k: 'النظام', v: (sys ? sys.nameAr : '—') + ' · ' + shape.nameAr });
        if (shape.family === 'sliding') {
            const sashW = slidingSashWidthMm(W, leaves, d);
            const sashH = slidingSashHeightMm(H, d, shape.isSlidingDoor || shape.isDoor);
            steps.push({
                k: 'ضرفة سحاب',
                v: '(W+(n−1)×ركوب−(n−1)×تقسيم)/n = ' + sashW + ' مم · ارتفاع ' + sashH +
                    ' · ركوب ' + aluNum(d.sashOverlapMm) + ' · ضلف ' + leaves
            });
            const g = buildItemGlass(item);
            steps.push({ k: 'زجاج من الضرفة', v: sashW + '−' + aluNum(d.glassSashDeductW) + ' × ' + sashH + '−' + aluNum(d.glassSashDeductH) + ' → ' + g.widthMm + '×' + g.heightMm + ' ×' + g.panels });
        } else if (shape.family === 'facade') {
            const cell = facadeCellSizeMm(W, H, cols, rows, d, sys);
            steps.push({
                k: 'خلية واجهة',
                v: '(W−(أعمدة−1)×رؤية)/أعمدة = ' + cell.cellW + ' × ' + cell.cellH +
                    ' · رؤية عمود ' + cell.mullSight + ' · عارضة ' + cell.transSight
            });
            const g = buildItemGlass(item);
            steps.push({ k: 'زجاج خلية', v: g.widthMm + '×' + g.heightMm + ' ×' + g.panels + ' لوح' });
        } else if (!shape.isFixed) {
            const sz = hingedSashSizeMm(W, H, leaves, d, sys, shape.isDoor);
            steps.push({
                k: 'ضرفة مفصلي',
                v: 'صافي ورقة ' + sz.leafClear + ' − تخصيم ' + aluNum(d.sashDeductW) + ' = ' + sz.sashW +
                    ' مم · ارتفاع ' + sz.sashH + (sz.heel ? (' (كعب ' + sz.heel + ')') : '')
            });
            const g = buildItemGlass(item);
            steps.push({ k: 'زجاج من الضرفة', v: g.widthMm + '×' + g.heightMm + ' ×' + g.panels });
        } else {
            const g = buildItemGlass(item);
            steps.push({ k: 'ثابت', v: 'زجاج ' + g.widthMm + '×' + g.heightMm + ' (تخصيم ثابت ' + aluNum(d.glassFixedDeductW) + '×' + aluNum(d.glassFixedDeductH) + ')' });
        }
        const angle = aluNum(sys && sys.cutAngle) || aluNum(d.cutAngle) || 45;
        steps.push({ k: 'زاوية القص', v: angle + '° · بدل ميتري ' + (angle === 45 ? aluNum(d.miterExtraMm) : 0) + ' مم على حلق/ضرفة/باكيت' });
        return steps;
    }
'''

old_helpers = '''    /** ارتفاع ضرفة السحاب — يخصم كعب الباب من الأرض إن وُجد */
    function slidingSashHeightMm(H, d, isSlidingDoor) {
        const heel = isSlidingDoor ? aluNum(d && d.sashFromFloorMm) : 0;
        return aluRound(Math.max(0, H - aluNum(d && d.sashDeductH) - heel), 1);
    }

    /**
     * عرض/ارتفاع خلية واجهة بعد خصم رؤية الأعمدة والعوارض
'''

if old_helpers not in t:
    raise SystemExit('helpers anchor missing')
t = t.replace(old_helpers, HELPERS + '\n    /**\n     * عرض/ارتفاع خلية واجهة بعد خصم رؤية الأعمدة والعوارض\n', 1)

# --- 2) Hinged multi-leaf in buildShapeCuts ---
old_hinged = '''        } else {
            /* مفصلي / قلاب / باب / رسم يدوي متعدد الضلف */
            const heel = shape.isDoor ? aluNum(d.sashFromFloorMm) : 0;
            if (leaves > 1) {
                const leafW = W / leaves;
                const sashW = Math.max(1, leafW - aluNum(d.sashDeductW));
                const sashH = H - aluNum(d.sashDeductH) - heel;
                const mullDed = heel > 0 ? aluNum(d.mullionDeductWithHeel) : aluNum(d.mullionDeductFull);
                push('mullion', 'مرد بين الضلف', H - mullDed, Math.max(0, leaves - 1), 'H');
                push('sash', 'ضرفة — أفقي', sashW, leaves * 2, 'W');
                push('sash', 'ضرفة — رأسي', sashH, leaves * 2, 'H');
                if (shape.isDoor) push('threshold', 'عتبة', W, 1, 'W');
                const sashPart = partForRole(sys, 'sash');
                if (!sashPart || !sashPart.withPackage) {
                    push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), leaves * 2, 'W');
                    push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), leaves * 2, 'H');
                }
            } else {
                const sashW = W - aluNum(d.sashDeductW);
                const sashH = H - aluNum(d.sashDeductH) - heel;
                push('sash', 'ضرفة — أفقي', sashW, 2, 'W');
                push('sash', 'ضرفة — رأسي', sashH, 2, 'H');
                if (shape.isDoor) push('threshold', 'عتبة', W, 1, 'W');
                const sashPart = partForRole(sys, 'sash');
                if (!sashPart || !sashPart.withPackage) {
                    push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), 2, 'W');
                    push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), 2, 'H');
                }
            }
        }'''

new_hinged = '''        } else {
            /* مفصلي / قلاب / باب / رسم يدوي — مصدر واحد hingedSashSizeMm */
            const sz = hingedSashSizeMm(W, H, leaves, d, sys, shape.isDoor);
            const sashW = Math.max(1, sz.sashW);
            const sashH = Math.max(1, sz.sashH);
            if (leaves > 1) {
                const mullDed = sz.heel > 0 ? aluNum(d.mullionDeductWithHeel) : aluNum(d.mullionDeductFull);
                push('mullion', 'مرد بين الضلف', H - mullDed, Math.max(0, leaves - 1), 'H');
            }
            push('sash', 'ضرفة — أفقي', sashW, leaves * 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, leaves * 2, 'H');
            if (shape.isDoor) push('threshold', 'عتبة', W, 1, 'W');
            const sashPart = partForRole(sys, 'sash');
            if (!sashPart || !sashPart.withPackage) {
                push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), leaves * 2, 'W');
                push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), leaves * 2, 'H');
            }
        }'''

if old_hinged not in t:
    raise SystemExit('hinged block missing')
t = t.replace(old_hinged, new_hinged, 1)

# --- 3) buildItemGlass hinged ---
old_glass = '''        } else {
            const heel = shape.isDoor ? aluNum(d.sashFromFloorMm) : 0;
            if (leaves > 1) {
                const sashW = (W / leaves) - aluNum(d.sashDeductW);
                const sashH = H - aluNum(d.sashDeductH) - heel;
                gW = Math.max(0, aluRound(sashW - aluNum(d.glassSashDeductW), 1));
                gH = Math.max(0, aluRound(sashH - aluNum(d.glassSashDeductH), 1));
            } else {
                const sashW = W - aluNum(d.sashDeductW);
                const sashH = H - aluNum(d.sashDeductH) - heel;
                gW = Math.max(0, aluRound(sashW - aluNum(d.glassSashDeductW), 1));
                gH = Math.max(0, aluRound(sashH - aluNum(d.glassSashDeductH), 1));
            }
            panels = leaves * qty;
        }'''

new_glass = '''        } else {
            const sz = hingedSashSizeMm(W, H, leaves, d, sys, shape.isDoor);
            gW = Math.max(0, aluRound(sz.sashW - aluNum(d.glassSashDeductW), 1));
            gH = Math.max(0, aluRound(sz.sashH - aluNum(d.glassSashDeductH), 1));
            panels = leaves * qty;
        }'''

if old_glass not in t:
    raise SystemExit('glass hinged missing')
t = t.replace(old_glass, new_glass, 1)

# --- 4) buildItemWire facade-aware ---
old_wire = '''    function buildItemWire(item) {
        if (!item.hasWire) return null;
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const shape = resolveItemShape(item);
        const found = findSystem(item.profileSystemId, shape.family);
        const d = dOf(found.system);
        const deduct = item.wireFixed === 'none' ? aluNum(d.wireMovingDeduct) : aluNum(d.wireFixedDeduct);
        const wW = Math.max(0, W - deduct);
        const wH = Math.max(0, H - deduct);
        const area = aluRound((wW / 1000) * (wH / 1000) * qty, 3);
        const wr = aluWire.find(function (w) { return w.id === item.wireId; }) || aluWire[0];
        return {
            nameAr: wr ? wr.nameAr : 'سلك',
            areaM2: area,
            pricePerM2: wr ? aluNum(wr.pricePerM2) : 22,
            total: aluRound(area * (wr ? aluNum(wr.pricePerM2) : 22), 2)
        };
    }'''

new_wire = '''    function buildItemWire(item) {
        if (!item.hasWire) return null;
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const shape = resolveItemShape(item);
        const found = findSystem(item.profileSystemId, shape.family);
        const d = dOf(found.system);
        const deduct = item.wireFixed === 'none' ? aluNum(d.wireMovingDeduct) : aluNum(d.wireFixedDeduct);
        let wW;
        let wH;
        let panels = qty;
        if (shape.family === 'facade') {
            /* مساحة السلك = خلايا الواجهة (نفس منطق إطارات السلك في الكاتنج) */
            const cols = shape.bayCols || Math.max(1, Math.round(aluNum(item.bayCols) || 1));
            const rows = shape.bayRows || Math.max(1, Math.round(aluNum(item.bayRows) || 1));
            const cell = facadeCellSizeMm(W, H, cols, rows, d, found.system);
            wW = Math.max(0, aluRound(cell.cellW - deduct, 1));
            wH = Math.max(0, aluRound(cell.cellH - deduct, 1));
            panels = cols * rows * qty;
        } else {
            wW = Math.max(0, W - deduct);
            wH = Math.max(0, H - deduct);
        }
        const area = aluRound((wW / 1000) * (wH / 1000) * panels, 3);
        const wr = aluWire.find(function (w) { return w.id === item.wireId; }) || aluWire[0];
        return {
            nameAr: wr ? wr.nameAr : 'سلك',
            widthMm: wW,
            heightMm: wH,
            panels: panels,
            areaM2: area,
            pricePerM2: wr ? aluNum(wr.pricePerM2) : 22,
            total: aluRound(area * (wr ? aluNum(wr.pricePerM2) : 22), 2)
        };
    }'''

if old_wire not in t:
    raise SystemExit('wire missing')
t = t.replace(old_wire, new_wire, 1)

# --- 5) calcAccessoryQty sash scopes ---
old_acc = '''        if (scope === 'frame') {
            perimeterCm = 2 * (W + H) / 10;
            perimeterM = 2 * (W + H) / 1000;
        } else if (scope === 'sash' && shape.family === 'sliding') {
            const sashW = W / leaves;
            const sashH = H;
            perimeterCm = leaves * 2 * (sashW + sashH) / 10;
            perimeterM = leaves * 2 * (sashW + sashH) / 1000;
        } else if (scope === 'sash') {
            perimeterCm = leaves * 2 * (W + H) / 10;
            perimeterM = leaves * 2 * (W + H) / 1000;
        } else {
            perimeterCm = 2 * (W + H) / 10;
            perimeterM = 2 * (W + H) / 1000;
        }'''

new_acc = '''        if (scope === 'frame') {
            perimeterCm = 2 * (W + H) / 10;
            perimeterM = 2 * (W + H) / 1000;
        } else if (scope === 'sash' && shape.family === 'sliding') {
            const foundSys = findSystem(item.profileSystemId, shape.family);
            const dd = dOf(foundSys.system);
            const sashW = slidingSashWidthMm(W, leaves, dd);
            const sashH = slidingSashHeightMm(H, dd, shape.isSlidingDoor || shape.isDoor);
            perimeterCm = leaves * 2 * (sashW + sashH) / 10;
            perimeterM = leaves * 2 * (sashW + sashH) / 1000;
        } else if (scope === 'sash') {
            const foundSys = findSystem(item.profileSystemId, shape.family);
            const dd = dOf(foundSys.system);
            const sz = hingedSashSizeMm(W, H, leaves, dd, foundSys.system, shape.isDoor);
            perimeterCm = leaves * 2 * (sz.sashW + sz.sashH) / 10;
            perimeterM = leaves * 2 * (sz.sashW + sz.sashH) / 1000;
        } else {
            perimeterCm = 2 * (W + H) / 10;
            perimeterM = 2 * (W + H) / 1000;
        }'''

if old_acc not in t:
    raise SystemExit('accessory perimeter missing')
t = t.replace(old_acc, new_acc, 1)

# --- 6) explainEstimateFormulas enrich ---
old_explain = '''    function explainEstimateFormulas(est) {
        const items = (est && (est.items || est.openings)) || [];
        return items.map(function (item, i) {
            const shape = resolveItemShape(item);
            const found = findSystem(item.profileSystemId, shape.family);
            const sys = found.system;
            const d = dOf(sys);
            const built = shapeCutsWithMeta(item, i);
            return {
                item: item.labelAr || ('بند ' + (i + 1)),
                system: sys ? sys.nameAr : '—',
                warnings: (built.warnings || []).concat(found.warning ? [found.warning] : []),
                deductions: d,
                cuts: (built.cuts || []).map(function (c) {
                    return {
                        label: c.labelAr,
                        code: c.code,
                        lengthMm: c.lengthMm,
                        qty: c.qty,
                        role: c.role,
                        sku: c.profileSku,
                        missingPart: !!c.missingPart
                    };
                }),
                glass: buildItemGlass(item),
                accessories: buildItemAccessories(item, est.priceMode)
            };
        });
    }'''

new_explain = '''    function explainEstimateFormulas(est) {
        const items = (est && (est.items || est.openings)) || [];
        return items.map(function (item, i) {
            const shape = resolveItemShape(item);
            const found = findSystem(item.profileSystemId, shape.family);
            const sys = found.system;
            const d = dOf(sys);
            const built = shapeCutsWithMeta(item, i);
            return {
                item: item.labelAr || ('بند ' + (i + 1)),
                system: sys ? sys.nameAr : '—',
                shape: shape,
                warnings: (built.warnings || []).concat(found.warning ? [found.warning] : []),
                deductions: d,
                formulaSteps: buildFormulaSteps(item),
                cuts: (built.cuts || []).map(function (c) {
                    return {
                        label: c.labelAr,
                        code: c.code,
                        lengthMm: c.lengthMm,
                        qty: c.qty,
                        role: c.role,
                        sku: c.profileSku,
                        angleL: c.angleL,
                        angleR: c.angleR,
                        missingPart: !!c.missingPart
                    };
                }),
                glass: buildItemGlass(item),
                wire: buildItemWire(item),
                accessories: buildItemAccessories(item, est.priceMode)
            };
        });
    }'''

if old_explain not in t:
    raise SystemExit('explain missing')
t = t.replace(old_explain, new_explain, 1)

# --- 7) Drawing suite: replace aluItemDrawingsHtml and insert cut ticket before it ---
old_draw_end = '''    function aluItemDrawingsHtml(item, compact) {
        const elev = aluDrawElevationSvg(item, compact ? { viewW: 220, viewH: 200 } : { viewW: 360, viewH: 320 });
        if (compact) return '<div class="alu-elev-card">' + elev + '</div>';
        const glassSvg = aluDrawGlassNestSvg(item, { viewW: 280, viewH: 180 });
        return '<div class="alu-draw-pair"><div class="alu-elev-card">' + elev + '</div><div class="alu-elev-card">' + glassSvg + '</div></div>';
    }'''

new_draw_end = r'''    function aluDrawCutTicketSvg(cuts, opts) {
        opts = opts || {};
        const list = (cuts || []).slice(0, opts.max || 12);
        const viewW = opts.viewW || 420;
        const rowH = 34;
        const pad = 16;
        const viewH = pad * 2 + 22 + list.length * rowH;
        const navy = '#0d2840';
        const gold = '#c9a227';
        const accent = '#155e94';
        let maxLen = 1;
        list.forEach(function (c) { maxLen = Math.max(maxLen, aluNum(c.lengthMm) || 1); });
        const barMax = viewW - pad * 2 - 150;
        let inner = '<text x="' + (viewW / 2) + '" y="16" text-anchor="middle" font-size="12" font-weight="800" fill="' + navy + '">تذكرة قص هندسية — طول + زاوية</text>';
        list.forEach(function (c, i) {
            const y = pad + 28 + i * rowH;
            const len = Math.max(1, aluNum(c.lengthMm));
            const bw = Math.max(8, (len / maxLen) * barMax);
            const aL = aluNum(c.angleL) || 90;
            const aR = aluNum(c.angleR) || 90;
            inner += '<text x="' + pad + '" y="' + (y - 6) + '" font-size="9" fill="' + accent + '" font-weight="700">' + aluEsc((c.code || '') + ' · ' + (c.labelAr || c.label || '')) + '</text>';
            inner += '<rect x="' + pad + '" y="' + y + '" width="' + bw + '" height="10" fill="rgba(21,94,148,0.18)" stroke="' + navy + '" stroke-width="1.2" rx="1"/>';
            /* علامات الزاوية */
            inner += '<polygon points="' + pad + ',' + y + ' ' + (pad + 8) + ',' + y + ' ' + pad + ',' + (y + 10) + '" fill="' + (aL === 45 ? gold : navy) + '" opacity="0.85"/>';
            inner += '<polygon points="' + (pad + bw) + ',' + y + ' ' + (pad + bw - 8) + ',' + y + ' ' + (pad + bw) + ',' + (y + 10) + '" fill="' + (aR === 45 ? gold : navy) + '" opacity="0.85"/>';
            inner += '<text x="' + (pad + bw + 8) + '" y="' + (y + 9) + '" font-size="10" font-weight="800" fill="' + navy + '">' + len + ' مم · ∠' + aL + '/' + aR + ' · ×' + (c.qty || 1) + '</text>';
        });
        if (!list.length) {
            inner += '<text x="' + (viewW / 2) + '" y="48" text-anchor="middle" font-size="11" fill="#5a6b7a">لا قطع لهذا البند</text>';
        }
        return '<svg class="alu-cut-ticket-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + viewW + ' ' + Math.max(80, viewH) + '" width="' + viewW + '" height="' + Math.max(80, viewH) + '" role="img" aria-label="تذكرة قص">' +
            '<rect width="100%" height="100%" fill="#ffffff"/>' + inner + '</svg>';
    }

    function aluDrawProfileSectionSvg(item, opts) {
        opts = opts || {};
        const shape = resolveItemShape(item);
        const found = findSystem(item.profileSystemId, shape.family);
        const sys = found.system;
        const frame = partForRole(sys, 'frame');
        const sash = partForRole(sys, shape.isFixed || shape.family === 'facade' ? 'bead' : 'sash') || partForRole(sys, 'sash');
        const ft = Math.max(12, Math.min(40, frame ? aluNum(frame.thicknessMm) || 20 : 20));
        const st = Math.max(8, Math.min(32, sash ? aluNum(sash.thicknessMm) || 14 : 14));
        const viewW = opts.viewW || 280;
        const viewH = opts.viewH || 160;
        const navy = '#0d2840';
        const accent = '#155e94';
        const ox = 40;
        const oy = 36;
        const ow = viewW - 80;
        const oh = viewH - 70;
        let inner = '<text x="' + (viewW / 2) + '" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="' + navy + '">مقطع قطاع (مخطط) — سُمك من الكتالوج</text>';
        inner += '<rect x="' + ox + '" y="' + oy + '" width="' + ow + '" height="' + oh + '" fill="#f8fafc" stroke="' + navy + '" stroke-width="2"/>';
        inner += '<rect x="' + (ox + 3) + '" y="' + (oy + 3) + '" width="' + Math.max(1, ow - 6) + '" height="' + Math.max(1, ft) + '" fill="rgba(201,162,39,0.35)" stroke="' + navy + '"/>';
        inner += '<rect x="' + (ox + 3) + '" y="' + (oy + oh - ft - 3) + '" width="' + Math.max(1, ow - 6) + '" height="' + Math.max(1, ft) + '" fill="rgba(201,162,39,0.35)" stroke="' + navy + '"/>';
        inner += '<rect x="' + (ox + 3) + '" y="' + (oy + 3) + '" width="' + Math.max(1, ft) + '" height="' + Math.max(1, oh - 6) + '" fill="rgba(201,162,39,0.35)" stroke="' + navy + '"/>';
        inner += '<rect x="' + (ox + ow - ft - 3) + '" y="' + (oy + 3) + '" width="' + Math.max(1, ft) + '" height="' + Math.max(1, oh - 6) + '" fill="rgba(201,162,39,0.35)" stroke="' + navy + '"/>';
        if (!shape.isFixed && shape.family !== 'facade') {
            const ix = ox + ft + 6;
            const iy = oy + ft + 6;
            const iw = Math.max(8, ow - ft * 2 - 12);
            const ih = Math.max(8, oh - ft * 2 - 12);
            inner += '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" fill="none" stroke="' + accent + '" stroke-width="1.6"/>';
            inner += '<rect x="' + (ix + 2) + '" y="' + (iy + 2) + '" width="' + Math.max(1, iw - 4) + '" height="' + Math.max(1, st) + '" fill="rgba(21,94,148,0.25)"/>';
        }
        inner += '<text x="' + (viewW / 2) + '" y="' + (viewH - 10) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">حلق ≈' + ft + ' مم' + (sash ? (' · ضرفة/باكيت ≈' + st + ' مم') : '') + '</text>';
        return '<svg class="alu-section-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + viewW + ' ' + viewH + '" width="' + viewW + '" height="' + viewH + '">' +
            '<rect width="100%" height="100%" fill="#fff"/>' + inner + '</svg>';
    }

    function aluFormulaStripHtml(item) {
        const steps = buildFormulaSteps(item);
        return '<div class="alu-formula-strip" role="note"><strong><i class="fas fa-square-root-variable"></i> معادلات البند</strong><ul>' +
            steps.map(function (s) {
                return '<li><span>' + aluEsc(s.k) + '</span> ' + aluEsc(s.v) + '</li>';
            }).join('') + '</ul></div>';
    }

    function aluItemDrawingsHtml(item, compact) {
        const elev = aluDrawElevationSvg(item, compact ? { viewW: 220, viewH: 200 } : { viewW: 360, viewH: 320 });
        if (compact) {
            return '<div class="alu-draw-suite alu-draw-suite--compact"><div class="alu-elev-card">' + elev + '</div>' +
                '<div class="alu-formula-mini">' + aluEsc((buildFormulaSteps(item)[2] && buildFormulaSteps(item)[2].v) || (buildFormulaSteps(item)[1] && buildFormulaSteps(item)[1].v) || '') + '</div></div>';
        }
        const glassSvg = aluDrawGlassNestSvg(item, { viewW: 280, viewH: 180 });
        const built = shapeCutsWithMeta(item, 0);
        const ticket = aluDrawCutTicketSvg(built.cuts || [], { viewW: 420, max: 10 });
        const section = aluDrawProfileSectionSvg(item, { viewW: 280, viewH: 160 });
        return '<div class="alu-draw-suite">' +
            aluFormulaStripHtml(item) +
            '<div class="alu-draw-pair">' +
            '<div class="alu-elev-card">' + elev + '</div>' +
            '<div class="alu-elev-card">' + glassSvg + '</div>' +
            '<div class="alu-elev-card">' + section + '</div>' +
            '</div>' +
            '<div class="alu-elev-card alu-cut-ticket-card">' + ticket + '</div>' +
            '</div>';
    }'''

if old_draw_end not in t:
    raise SystemExit('draw html missing')
t = t.replace(old_draw_end, new_draw_end, 1)

# --- 8) Elevation: annotate formula sashW + facade sight ---
# Sliding glass text: add sashW annotation
old_slide_txt = '''            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2 + 4) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج ' + gW + '×' + gH + ' ×' + leaves + '</text>';
            }
        } else {'''

new_slide_txt = '''            const foundSlide = findSystem(item.profileSystemId, 'sliding');
            const dSlide = dOf(foundSlide.system);
            const formulaSashW = slidingSashWidthMm(Wmm, leaves, dSlide);
            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2 - 6) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج ' + gW + '×' + gH + ' ×' + leaves + '</text>';
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2 + 10) + '" text-anchor="middle" font-size="9" fill="' + navy + '" font-weight="700">ضرفة معادلة ' + formulaSashW + ' مم</text>';
            }
        } else {'''

if old_slide_txt not in t:
    raise SystemExit('slide elev annotate missing')
t = t.replace(old_slide_txt, new_slide_txt, 1)

# Facade: use sight-proportional cells
old_facade_draw = '''        if (shape.family === 'facade') {
            const cellW = iw / cols;
            const cellH = ih / rows;
            for (let c = 1; c < cols; c++) {
                const x = ix + cellW * c;
                inner += '<line x1="' + x + '" y1="' + iy + '" x2="' + x + '" y2="' + (iy + ih) + '" stroke="' + navy + '" stroke-width="2"/>';
            }
            for (let r = 1; r < rows; r++) {
                const y = iy + cellH * r;
                inner += '<line x1="' + ix + '" y1="' + y + '" x2="' + (ix + iw) + '" y2="' + y + '" stroke="' + navy + '" stroke-width="2"/>';
            }
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const gx = ix + cellW * c + 3;
                    const gy = iy + cellH * r + 3;
                    inner += '<rect x="' + gx + '" y="' + gy + '" width="' + Math.max(1, cellW - 6) + '" height="' + Math.max(1, cellH - 6) + '" fill="' + glassFill + '" stroke="' + sky + '" stroke-width="0.8"/>';
                }
            }
            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج خلية ' + gW + '×' + gH + '</text>';
            }
        } else if (shape.family === 'sliding') {'''

new_facade_draw = '''        if (shape.family === 'facade') {
            const foundF = findSystem(item.profileSystemId, 'facade');
            const cellInfo = facadeCellSizeMm(Wmm, Hmm, cols, rows, dOf(foundF.system), foundF.system);
            const mullPx = Math.max(2, cellInfo.mullSight * scale);
            const transPx = Math.max(2, cellInfo.transSight * scale);
            const cellW = cols > 0 ? (iw - mullPx * Math.max(0, cols - 1)) / cols : iw;
            const cellH = rows > 0 ? (ih - transPx * Math.max(0, rows - 1)) / rows : ih;
            let xCursor = ix;
            for (let c = 0; c < cols; c++) {
                let yCursor = iy;
                for (let r = 0; r < rows; r++) {
                    inner += '<rect x="' + (xCursor + 2) + '" y="' + (yCursor + 2) + '" width="' + Math.max(1, cellW - 4) + '" height="' + Math.max(1, cellH - 4) + '" fill="' + glassFill + '" stroke="' + sky + '" stroke-width="0.8"/>';
                    yCursor += cellH + (r < rows - 1 ? transPx : 0);
                }
                if (c < cols - 1) {
                    const mx = xCursor + cellW;
                    inner += '<rect x="' + mx + '" y="' + iy + '" width="' + mullPx + '" height="' + ih + '" fill="' + navy + '" opacity="0.9"/>';
                    xCursor = mx + mullPx;
                }
            }
            /* عوارض أفقية */
            let yLine = iy + cellH;
            for (let r = 1; r < rows; r++) {
                inner += '<rect x="' + ix + '" y="' + yLine + '" width="' + iw + '" height="' + transPx + '" fill="' + navy + '" opacity="0.75"/>';
                yLine += cellH + transPx;
            }
            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج خلية ' + gW + '×' + gH + '</text>';
            }
        } else if (shape.family === 'sliding') {'''

if old_facade_draw not in t:
    raise SystemExit('facade draw missing')
t = t.replace(old_facade_draw, new_facade_draw, 1)

# --- 9) renderAluAudit richer ---
old_audit_block = '''            return '<section class="alu-cut-form-card"><h4>' + aluEsc(ex.item) + ' <small>' + aluEsc(ex.system) + '</small></h4>' +
                ((ex.warnings || []).length
                    ? '<div class="alu-cut-warn"><ul>' + ex.warnings.map(function (w) { return '<li>' + aluEsc(w) + '</li>'; }).join('') + '</ul></div>'
                    : '') +
                '<p class="alu-cut-note">ركوب ضرفة ' + aluNum(d.sashOverlapMm) +
                ' · تخصيم زجاج ' + aluNum(d.glassSashDeductW) + '×' + aluNum(d.glassSashDeductH) +
                ' · مرد ' + aluNum(d.mullionDeductFull) + ' · زاوية ' + aluNum(d.cutAngle) + '°' +
                ' · بدل ميتري ' + aluNum(d.miterExtraMm) + '</p>' +
                '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>رمز</th><th>قطعة</th><th>SKU</th><th>طول مم</th><th>كمية</th><th>دور</th></tr></thead><tbody>' +
                cutRows + '</tbody></table></div>' +
                '<p>زجاج: ' + (ex.glass ? (ex.glass.widthMm + '×' + ex.glass.heightMm + ' ×' + ex.glass.panels + ' = ' + ex.glass.areaM2 + ' م²') : '—') +
                ' · إكسسوارات: ' + (ex.accessories || []).length + ' بند</p></section>';'''

new_audit_block = '''            const stepsHtml = (ex.formulaSteps || []).map(function (s) {
                return '<li><strong>' + aluEsc(s.k) + ':</strong> ' + aluEsc(s.v) + '</li>';
            }).join('');
            const ticket = aluDrawCutTicketSvg((ex.cuts || []).map(function (c) {
                return { code: c.code, labelAr: c.label, lengthMm: c.lengthMm, qty: c.qty, angleL: c.angleL, angleR: c.angleR };
            }), { viewW: 480, max: 14 });
            return '<section class="alu-cut-form-card"><h4>' + aluEsc(ex.item) + ' <small>' + aluEsc(ex.system) + '</small></h4>' +
                ((ex.warnings || []).length
                    ? '<div class="alu-cut-warn"><ul>' + ex.warnings.map(function (w) { return '<li>' + aluEsc(w) + '</li>'; }).join('') + '</ul></div>'
                    : '') +
                '<div class="alu-formula-strip"><strong>خطوات المعادلة</strong><ul>' + stepsHtml + '</ul></div>' +
                '<p class="alu-cut-note">ركوب ضرفة ' + aluNum(d.sashOverlapMm) +
                ' · تخصيم زجاج ' + aluNum(d.glassSashDeductW) + '×' + aluNum(d.glassSashDeductH) +
                ' · مرد ' + aluNum(d.mullionDeductFull) + ' · زاوية ' + aluNum(d.cutAngle) + '°' +
                ' · بدل ميتري ' + aluNum(d.miterExtraMm) +
                ' · رؤية مرد ' + aluNum(d.mullionSightMm) + '</p>' +
                '<div class="alu-elev-card alu-cut-ticket-card">' + ticket + '</div>' +
                '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>رمز</th><th>قطعة</th><th>SKU</th><th>طول مم</th><th>∠L/R</th><th>كمية</th><th>دور</th></tr></thead><tbody>' +
                (ex.cuts.map(function (c) {
                    return '<tr><td>' + aluEsc(c.code) + '</td><td>' + aluEsc(c.label) + '</td><td>' + aluEsc(c.sku) +
                        '</td><td>' + c.lengthMm + '</td><td>' + (c.angleL || '—') + '/' + (c.angleR || '—') +
                        '</td><td>' + c.qty + '</td><td>' + aluEsc(c.role) + '</td></tr>';
                }).join('')) + '</tbody></table></div>' +
                '<p>زجاج: ' + (ex.glass ? (ex.glass.widthMm + '×' + ex.glass.heightMm + ' ×' + ex.glass.panels + ' = ' + ex.glass.areaM2 + ' م²') : '—') +
                (ex.wire ? (' · سلك: ' + ex.wire.widthMm + '×' + ex.wire.heightMm + ' ×' + (ex.wire.panels || 1) + ' = ' + ex.wire.areaM2 + ' م²') : '') +
                ' · إكسسوارات: ' + (ex.accessories || []).length + ' بند</p></section>';'''

# Fix: old cutRows still referenced - I replaced the return that used cutRows. Need to also remove unused cutRows or keep building it.
# Looking at renderAluAudit - cutRows is built before return. My new block doesn't use cutRows - that's fine, dead var ok in JS.

if old_audit_block not in t:
    raise SystemExit('audit block missing')
t = t.replace(old_audit_block, new_audit_block, 1)

# --- 10) Self-tests before report.summary ---
old_end_tests = '''        assert('validate-fn-present', typeof validateAluEstimateForWorkshop === 'function', 'fn');


        report.summary = report.ok ? 'PASS ' + report.checks.length + '/' + report.checks.length : 'FAIL ' + report.fails.length + '/' + report.checks.length;'''

new_end_tests = '''        assert('validate-fn-present', typeof validateAluEstimateForWorkshop === 'function', 'fn');

        /* hrws222 — دقة موحّدة + رسومات هندسية للورشة */
        const prevSight = hingeSys.deductions && hingeSys.deductions.mullionSightMm;
        hingeSys.deductions = Object.assign({}, dOf(hingeSys), { mullionSightMm: 50, sashDeductW: 40, sashDeductH: 40, glassSashDeductW: 80, glassSashDeductH: 100 });
        const multiHinge = {
            shape: 'freehand', freehand: { family: 'hinged', kind: 'window', leaves: 2 },
            profileSystemId: hingeSys.id, widthMm: 1600, heightMm: 1400, qty: 1, glassId: (aluGlass[0] || {}).id
        };
        /* leafClear=(1600-50)/2=775 · sashW=735 */
        const mhSz = hingedSashSizeMm(1600, 1400, 2, dOf(hingeSys), hingeSys, false);
        assert('hinged-multi-leaf-clear', Math.abs(mhSz.leafClear - 775) < 0.2 && Math.abs(mhSz.sashW - 735) < 0.2, JSON.stringify(mhSz));
        const mhBuilt = shapeCutsWithMeta(multiHinge, 0);
        const mhSash = (mhBuilt.cuts || []).find(function (c) { return c.role === 'sash' && /أفقي/.test(c.labelAr); });
        assert('hinged-multi-cut-sash', mhSash && Math.abs(mhSash.lengthMm - 735) < 0.2, mhSash && mhSash.lengthMm);
        const mhGlass = buildItemGlass(multiHinge);
        assert('hinged-multi-glass', Math.abs(mhGlass.widthMm - 655) < 0.2, String(mhGlass.widthMm));
        hingeSys.deductions = Object.assign({}, dOf(hingeSys), { mullionSightMm: prevSight });

        const facadeWireItem = Object.assign({}, facadeItem, { hasWire: true, wireFixed: 'fixed' });
        const fw = buildItemWire(facadeWireItem);
        const fCellW = facadeCellSizeMm(6000, 3000, 3, 2, dOf(facadeSys), facadeSys);
        const expectWireW = aluRound(fCellW.cellW - aluNum(dOf(facadeSys).wireFixedDeduct), 1);
        assert('facade-wire-from-cell', fw && fw.panels === 6 && Math.abs(fw.widthMm - expectWireW) < 0.2, fw && (fw.widthMm + '×' + fw.panels));

        const accSlide = { equationType: 'per_meter', equationValue: 1, applyScope: 'sash', active: true };
        const accQ = calcAccessoryQty(accSlide, slidingItem, resolveItemShape(slidingItem));
        const expectPerimM = 2 * 2 * (slidingSashWidthMm(2000, 2, dOf(slideSys)) + slidingSashHeightMm(1600, dOf(slideSys), false)) / 1000;
        assert('acc-sash-uses-sliding-formula', Math.abs(accQ - aluRound(expectPerimM, 2)) < 0.05, 'q=' + accQ + ' expect=' + expectPerimM);

        const ticketSvg = aluDrawCutTicketSvg(slideBuilt.cuts || []);
        assert('cut-ticket-svg', ticketSvg.indexOf('تذكرة قص') !== -1 && ticketSvg.indexOf('مم') !== -1, 'ticket');
        const sectionSvg = aluDrawProfileSectionSvg(slidingItem);
        assert('profile-section-svg', sectionSvg.indexOf('مقطع قطاع') !== -1, 'section');
        const steps = buildFormulaSteps(slidingItem);
        assert('formula-steps', steps.length >= 3 && steps.some(function (s) { return /ضرفة/.test(s.k + s.v); }), 'steps=' + steps.length);
        const suiteHtml = aluItemDrawingsHtml(slidingItem, false);
        assert('draw-suite-222', suiteHtml.indexOf('alu-draw-suite') !== -1 && suiteHtml.indexOf('alu-cut-ticket') !== -1 && suiteHtml.indexOf('alu-formula-strip') !== -1, 'suite');
        assert('helpers-222', typeof hingedSashSizeMm === 'function' && typeof aluDrawCutTicketSvg === 'function', 'fns');

        report.summary = report.ok ? 'PASS ' + report.checks.length + '/' + report.checks.length : 'FAIL ' + report.fails.length + '/' + report.checks.length;'''

if old_end_tests not in t:
    raise SystemExit('selftest end missing')
t = t.replace(old_end_tests, new_end_tests, 1)

# Fix draw-pair-html assert to still pass (suite contains pair)
t = t.replace(
    "assert('draw-pair-html', pairHtml.indexOf('alu-draw-pair') !== -1 && pairHtml.indexOf('alu-elev-svg') !== -1, 'pair');",
    "assert('draw-pair-html', pairHtml.indexOf('alu-draw-pair') !== -1 && pairHtml.indexOf('alu-elev-svg') !== -1 && pairHtml.indexOf('alu-draw-suite') !== -1, 'pair');",
    1
)

# Export new globals near other exports
t = t.replace(
    '    global.explainAluEstimateFormulas = explainEstimateFormulas;',
    '    global.explainAluEstimateFormulas = explainEstimateFormulas;\n'
    '    global.hingedSashSizeMm = hingedSashSizeMm;\n'
    '    global.hingedLeafClearWidthMm = hingedLeafClearWidthMm;\n'
    '    global.buildFormulaSteps = buildFormulaSteps;\n'
    '    global.aluDrawCutTicketSvg = aluDrawCutTicketSvg;\n'
    '    global.aluDrawProfileSectionSvg = aluDrawProfileSectionSvg;',
    1
)

# Header bump if any
if 'V3 Pro' in t[:200]:
    t = t.replace('V3 Pro', 'V3 Pro · hrws222', 1)

if t == orig:
    raise SystemExit('no changes applied')

path.write_text(t, encoding='utf-8')
print('OK patched', path)
print('size', len(t))
print('has helpers', 'hingedSashSizeMm' in t and 'aluDrawCutTicketSvg' in t)
