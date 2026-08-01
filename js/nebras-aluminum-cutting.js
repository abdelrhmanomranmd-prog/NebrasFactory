/**
 * نبراس — تخصيمات قطاعات الألومنيوم
 * مقايسات باب/شباك · مكتبة قطاعات · تقطيع 1D ذكي (تقليل الهدر) · تقارير مشتريات/تجميع/تكلفة
 */
(function (global) {
    'use strict';

    const ALU_PROFILES_KEY = 'nebrasAluminumProfiles';
    const ALU_ESTIMATES_KEY = 'nebrasAluminumEstimates';
    const ALU_CUT_JOBS_KEY = 'nebrasAluminumCutJobs';
    const ALU_SETTINGS_KEY = 'nebrasAluminumCutSettings';

    let aluProfiles = [];
    let aluEstimates = [];
    let aluCutJobs = [];
    let aluSettings = {
        stockBarMm: 6000,
        kerfMm: 3,
        defaultGlassDeductW: 80,
        defaultGlassDeductH: 100,
        currencyLabel: 'ر.س'
    };
    let aluActiveTab = 'dashboard';
    let aluEstimateDraft = null;
    let aluCutDraft = null;
    let aluDataReady = false;

    const ALU_SYSTEMS = {
        sliding2: {
            code: 'sliding2',
            nameAr: 'شباك سحاب — ضلفتين',
            glassLeaves: 2,
            pieces: [
                { role: 'frame', labelAr: 'إطار علوي/سفلي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار جانبي', qty: 2, len: 'H', angleL: 45, angleR: 45 },
                { role: 'interlock', labelAr: 'عمود التقاء', qty: 1, len: 'H-40', angleL: 90, angleR: 90 },
                { role: 'sash', labelAr: 'ضلفة — أفقي', qty: 4, len: 'W/2-25', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — رأسي', qty: 4, len: 'H-50', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'roller', nameAr: 'بكرة سحاب', qtyPerUnit: 4, unitPrice: 12 },
                { code: 'lock', nameAr: 'قفل سحاب', qtyPerUnit: 1, unitPrice: 35 },
                { code: 'handle', nameAr: 'مقبض', qtyPerUnit: 2, unitPrice: 18 },
                { code: 'brush', nameAr: 'فرشاة عزل (م)', qtyPerUnit: 0, qtyFrom: 'perimeter_m', unitPrice: 4 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 1, unitPrice: 15 }
            ]
        },
        sliding3: {
            code: 'sliding3',
            nameAr: 'شباك سحاب — ثلاث ضلف',
            glassLeaves: 3,
            pieces: [
                { role: 'frame', labelAr: 'إطار علوي/سفلي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار جانبي', qty: 2, len: 'H', angleL: 45, angleR: 45 },
                { role: 'interlock', labelAr: 'عمود التقاء', qty: 2, len: 'H-40', angleL: 90, angleR: 90 },
                { role: 'sash', labelAr: 'ضلفة — أفقي', qty: 6, len: 'W/3-20', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — رأسي', qty: 6, len: 'H-50', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'roller', nameAr: 'بكرة سحاب', qtyPerUnit: 6, unitPrice: 12 },
                { code: 'lock', nameAr: 'قفل سحاب', qtyPerUnit: 1, unitPrice: 35 },
                { code: 'handle', nameAr: 'مقبض', qtyPerUnit: 3, unitPrice: 18 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 1, unitPrice: 18 }
            ]
        },
        casement: {
            code: 'casement',
            nameAr: 'شباك مفصلي',
            glassLeaves: 1,
            pieces: [
                { role: 'frame', labelAr: 'إطار أفقي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار رأسي', qty: 2, len: 'H', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — أفقي', qty: 2, len: 'W-40', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — رأسي', qty: 2, len: 'H-40', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'hinge', nameAr: 'مفصلة', qtyPerUnit: 2, unitPrice: 22 },
                { code: 'handle', nameAr: 'مقبض مفصلي', qtyPerUnit: 1, unitPrice: 28 },
                { code: 'stay', nameAr: 'ذراع تثبيت', qtyPerUnit: 1, unitPrice: 20 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 1, unitPrice: 12 }
            ]
        },
        fixed: {
            code: 'fixed',
            nameAr: 'شباك ثابت / ثابتة',
            glassLeaves: 1,
            pieces: [
                { role: 'frame', labelAr: 'إطار أفقي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار رأسي', qty: 2, len: 'H', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'bead', nameAr: 'حبة زجاج (م)', qtyPerUnit: 0, qtyFrom: 'perimeter_m', unitPrice: 6 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 1, unitPrice: 10 }
            ]
        },
        door_sliding: {
            code: 'door_sliding',
            nameAr: 'باب سحاب',
            glassLeaves: 2,
            pieces: [
                { role: 'frame', labelAr: 'إطار علوي/سفلي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار جانبي', qty: 2, len: 'H', angleL: 45, angleR: 45 },
                { role: 'threshold', labelAr: 'عتبة', qty: 1, len: 'W', angleL: 90, angleR: 90 },
                { role: 'interlock', labelAr: 'عمود التقاء', qty: 1, len: 'H-50', angleL: 90, angleR: 90 },
                { role: 'sash', labelAr: 'ضلفة — أفقي', qty: 4, len: 'W/2-30', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — رأسي', qty: 4, len: 'H-60', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'roller', nameAr: 'بكرة باب', qtyPerUnit: 4, unitPrice: 28 },
                { code: 'lock', nameAr: 'قفل باب سحاب', qtyPerUnit: 1, unitPrice: 75 },
                { code: 'handle', nameAr: 'مقبض باب', qtyPerUnit: 2, unitPrice: 45 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 2, unitPrice: 18 }
            ]
        },
        door_hinged: {
            code: 'door_hinged',
            nameAr: 'باب مفصلي',
            glassLeaves: 1,
            pieces: [
                { role: 'frame', labelAr: 'إطار أفقي', qty: 2, len: 'W', angleL: 45, angleR: 45 },
                { role: 'frame', labelAr: 'إطار رأسي', qty: 2, len: 'H', angleL: 45, angleR: 45 },
                { role: 'threshold', labelAr: 'عتبة', qty: 1, len: 'W', angleL: 90, angleR: 90 },
                { role: 'sash', labelAr: 'ضلفة — أفقي', qty: 2, len: 'W-45', angleL: 45, angleR: 45 },
                { role: 'sash', labelAr: 'ضلفة — رأسي', qty: 2, len: 'H-50', angleL: 45, angleR: 45 }
            ],
            accessories: [
                { code: 'hinge', nameAr: 'مفصلة باب', qtyPerUnit: 3, unitPrice: 35 },
                { code: 'lock', nameAr: 'قفل باب', qtyPerUnit: 1, unitPrice: 95 },
                { code: 'handle', nameAr: 'مقبض باب', qtyPerUnit: 1, unitPrice: 55 },
                { code: 'closer', nameAr: 'ذراع غلق (اختياري)', qtyPerUnit: 0, unitPrice: 120 },
                { code: 'screw', nameAr: 'مسامير تجميع (علبة)', qtyPerUnit: 2, unitPrice: 18 }
            ]
        }
    };

    const DEFAULT_PROFILES = [
        { id: 'alu-p-frame45', sku: 'ALU-FR-45', nameAr: 'قطاع إطار 45', role: 'frame', stockBarMm: 6000, weightKgPerM: 0.95, pricePerBar: 85, colorAr: 'فضي', active: true },
        { id: 'alu-p-sash45', sku: 'ALU-SH-45', nameAr: 'قطاع ضلفة 45', role: 'sash', stockBarMm: 6000, weightKgPerM: 0.72, pricePerBar: 78, colorAr: 'فضي', active: true },
        { id: 'alu-p-inter', sku: 'ALU-IL-01', nameAr: 'عمود التقاء', role: 'interlock', stockBarMm: 6000, weightKgPerM: 0.88, pricePerBar: 82, colorAr: 'فضي', active: true },
        { id: 'alu-p-thresh', sku: 'ALU-TH-01', nameAr: 'عتبة باب', role: 'threshold', stockBarMm: 6000, weightKgPerM: 1.1, pricePerBar: 95, colorAr: 'فضي', active: true },
        { id: 'alu-p-mullion', sku: 'ALU-MU-01', nameAr: 'قاطع / عمود وسط', role: 'mullion', stockBarMm: 6000, weightKgPerM: 0.8, pricePerBar: 80, colorAr: 'فضي', active: true }
    ];

    function aluEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function aluNum(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function aluRound(n, d) {
        d = d == null ? 1 : d;
        const f = Math.pow(10, d);
        return Math.round(aluNum(n) * f) / f;
    }

    function aluId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function aluField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function canAccessAluminumCutting() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof canManage === 'function' && canManage('aluminum')) return true;
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        return !!(admin && admin.role === 'aluminum_manager');
    }

    function isStrictAluminumUser(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) return false;
        return admin.role === 'aluminum_manager';
    }

    function requireAluAccess(msg) {
        if (!canAccessAluminumCutting()) {
            alert(msg || 'تخصيمات الألومنيوم — لمدير قسم الألومنيوم أو الإدارة الرئيسية.');
            return false;
        }
        return true;
    }

    function loadLocal(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            const parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (e) { return fallback; }
    }

    function saveLocal(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    function ensureDefaultProfiles() {
        if (!aluProfiles.length) {
            aluProfiles = DEFAULT_PROFILES.map(function (p) { return Object.assign({}, p); });
        }
    }

    function hydrateAluminumCuttingLocal() {
        aluProfiles = loadLocal(ALU_PROFILES_KEY, []);
        aluEstimates = loadLocal(ALU_ESTIMATES_KEY, []);
        aluCutJobs = loadLocal(ALU_CUT_JOBS_KEY, []);
        aluSettings = Object.assign({}, aluSettings, loadLocal(ALU_SETTINGS_KEY, {}) || {});
        ensureDefaultProfiles();
        aluDataReady = true;
    }

    function persistAluminumCuttingLocal() {
        saveLocal(ALU_PROFILES_KEY, aluProfiles);
        saveLocal(ALU_ESTIMATES_KEY, aluEstimates);
        saveLocal(ALU_CUT_JOBS_KEY, aluCutJobs);
        saveLocal(ALU_SETTINGS_KEY, aluSettings);
    }

    async function persistAluminumCuttingCloud(keys) {
        persistAluminumCuttingLocal();
        keys = keys || ['aluminum_profiles', 'aluminum_estimates', 'aluminum_cut_jobs', 'aluminum_cut_settings'];
        if (typeof persistNebrasCriticalStores === 'function') {
            try {
                return await persistNebrasCriticalStores(keys, { silent: true, showToast: false });
            } catch (e) {
                console.warn('aluminum cutting cloud persist', e);
            }
        }
        return false;
    }

    function getAluminumProfiles() { ensureDefaultProfiles(); return aluProfiles; }
    function getAluminumEstimates() { return aluEstimates; }
    function getAluminumCutJobs() { return aluCutJobs; }
    function getAluminumCutSettings() { return aluSettings; }

    function setAluminumProfilesFromCloud(v) {
        aluProfiles = Array.isArray(v) ? v : [];
        ensureDefaultProfiles();
        saveLocal(ALU_PROFILES_KEY, aluProfiles);
    }
    function setAluminumEstimatesFromCloud(v) {
        aluEstimates = Array.isArray(v) ? v : [];
        saveLocal(ALU_ESTIMATES_KEY, aluEstimates);
    }
    function setAluminumCutJobsFromCloud(v) {
        aluCutJobs = Array.isArray(v) ? v : [];
        saveLocal(ALU_CUT_JOBS_KEY, aluCutJobs);
    }
    function setAluminumCutSettingsFromCloud(v) {
        aluSettings = Object.assign({}, aluSettings, (v && typeof v === 'object') ? v : {});
        saveLocal(ALU_SETTINGS_KEY, aluSettings);
    }

    /** تقييم صيغة طول بالمليمتر: W, H, W/2-25, H-40 */
    function evalLenFormula(expr, W, H) {
        const raw = String(expr || '').trim().toUpperCase().replace(/\s+/g, '');
        if (!raw) return 0;
        const replaced = raw
            .replace(/W/g, '(' + aluNum(W) + ')')
            .replace(/H/g, '(' + aluNum(H) + ')');
        if (!/^[\d.+\-*/()]+$/.test(replaced)) return 0;
        try {
            // eslint-disable-next-line no-new-func
            const val = Function('"use strict"; return (' + replaced + ');')();
            return Math.max(0, aluRound(val, 1));
        } catch (e) { return 0; }
    }

    function profileForRole(role) {
        ensureDefaultProfiles();
        return aluProfiles.find(function (p) { return p.active !== false && p.role === role; })
            || aluProfiles.find(function (p) { return p.active !== false; })
            || null;
    }

    function buildOpeningCuts(opening) {
        const sys = ALU_SYSTEMS[opening.system] || ALU_SYSTEMS.sliding2;
        const W = aluNum(opening.widthMm);
        const H = aluNum(opening.heightMm);
        const qty = Math.max(1, Math.round(aluNum(opening.qty) || 1));
        const cuts = [];
        sys.pieces.forEach(function (piece) {
            const len = evalLenFormula(piece.len, W, H);
            if (len <= 0) return;
            const prof = profileForRole(piece.role);
            cuts.push({
                profileId: prof ? prof.id : '',
                profileSku: prof ? prof.sku : '',
                profileName: prof ? prof.nameAr : piece.role,
                role: piece.role,
                labelAr: piece.labelAr,
                lengthMm: len,
                qty: piece.qty * qty,
                angleL: piece.angleL || 90,
                angleR: piece.angleR || 90,
                openingLabel: opening.labelAr || (sys.nameAr + ' ' + W + '×' + H)
            });
        });
        return cuts;
    }

    function buildOpeningGlass(opening) {
        const sys = ALU_SYSTEMS[opening.system] || ALU_SYSTEMS.sliding2;
        const W = aluNum(opening.widthMm);
        const H = aluNum(opening.heightMm);
        const qty = Math.max(1, Math.round(aluNum(opening.qty) || 1));
        const leaves = Math.max(1, sys.glassLeaves || 1);
        const dW = aluNum(opening.glassDeductW != null ? opening.glassDeductW : aluSettings.defaultGlassDeductW);
        const dH = aluNum(opening.glassDeductH != null ? opening.glassDeductH : aluSettings.defaultGlassDeductH);
        const gW = Math.max(0, aluRound((W - dW) / leaves, 1));
        const gH = Math.max(0, aluRound(H - dH, 1));
        const areaM2 = aluRound((gW / 1000) * (gH / 1000) * leaves * qty, 3);
        return {
            widthMm: gW,
            heightMm: gH,
            leaves: leaves,
            panels: leaves * qty,
            areaM2: areaM2,
            thicknessMm: aluNum(opening.glassThicknessMm) || 6,
            pricePerM2: aluNum(opening.glassPricePerM2) || 45
        };
    }

    function buildOpeningAccessories(opening) {
        const sys = ALU_SYSTEMS[opening.system] || ALU_SYSTEMS.sliding2;
        const W = aluNum(opening.widthMm);
        const H = aluNum(opening.heightMm);
        const qty = Math.max(1, Math.round(aluNum(opening.qty) || 1));
        const perimeterM = aluRound(2 * (W + H) / 1000, 2);
        return (sys.accessories || []).map(function (acc) {
            let q = aluNum(acc.qtyPerUnit) * qty;
            if (acc.qtyFrom === 'perimeter_m') q = aluRound(perimeterM * qty, 2);
            return {
                code: acc.code,
                nameAr: acc.nameAr,
                qty: q,
                unitPrice: aluNum(acc.unitPrice),
                total: aluRound(q * aluNum(acc.unitPrice), 2)
            };
        }).filter(function (a) { return a.qty > 0; });
    }

    function computeEstimateTotals(est) {
        const openings = est.openings || [];
        let allCuts = [];
        let accessories = [];
        let glassPanels = [];
        let glassArea = 0;
        let glassCost = 0;
        openings.forEach(function (op) {
            allCuts = allCuts.concat(buildOpeningCuts(op));
            buildOpeningAccessories(op).forEach(function (a) {
                const found = accessories.find(function (x) { return x.code === a.code; });
                if (found) {
                    found.qty = aluRound(found.qty + a.qty, 2);
                    found.total = aluRound(found.qty * found.unitPrice, 2);
                } else accessories.push(Object.assign({}, a));
            });
            const g = buildOpeningGlass(op);
            glassPanels.push(Object.assign({ openingLabel: op.labelAr || '' }, g));
            glassArea += g.areaM2;
            glassCost += g.areaM2 * g.pricePerM2;
        });
        (est.manualCuts || []).forEach(function (mc) {
            allCuts.push({
                profileId: mc.profileId || '',
                profileSku: mc.profileSku || '',
                profileName: mc.profileName || 'يدوي',
                role: mc.role || 'custom',
                labelAr: mc.labelAr || 'قطعة يدوية',
                lengthMm: aluNum(mc.lengthMm),
                qty: Math.max(1, Math.round(aluNum(mc.qty) || 1)),
                angleL: aluNum(mc.angleL) || 90,
                angleR: aluNum(mc.angleR) || 90,
                openingLabel: 'يدوي'
            });
        });

        const byProfile = {};
        allCuts.forEach(function (c) {
            const key = c.profileId || c.role || 'x';
            if (!byProfile[key]) {
                byProfile[key] = {
                    profileId: c.profileId,
                    profileSku: c.profileSku,
                    profileName: c.profileName,
                    role: c.role,
                    totalLengthMm: 0,
                    pieces: 0,
                    cuts: []
                };
            }
            byProfile[key].totalLengthMm += c.lengthMm * c.qty;
            byProfile[key].pieces += c.qty;
            byProfile[key].cuts.push(c);
        });

        const stock = aluNum(aluSettings.stockBarMm) || 6000;
        const kerf = aluNum(aluSettings.kerfMm) || 0;
        let barsEstimate = 0;
        let profilesCost = 0;
        Object.keys(byProfile).forEach(function (k) {
            const row = byProfile[k];
            const prof = aluProfiles.find(function (p) { return p.id === row.profileId; });
            const barLen = (prof && aluNum(prof.stockBarMm)) || stock;
            const usable = Math.max(1, barLen);
            /* تقدير أولي قبل التحسين: طول + kerf تقريبي */
            const need = row.totalLengthMm + Math.max(0, row.pieces - 1) * kerf;
            row.barsEst = Math.max(1, Math.ceil(need / usable));
            row.pricePerBar = prof ? aluNum(prof.pricePerBar) : 0;
            row.costEst = aluRound(row.barsEst * row.pricePerBar, 2);
            barsEstimate += row.barsEst;
            profilesCost += row.costEst;
        });

        const accCost = accessories.reduce(function (s, a) { return s + a.total; }, 0);
        const laborPerUnit = aluNum(est.laborPerUnit) || 80;
        const units = openings.reduce(function (s, o) { return s + Math.max(1, Math.round(aluNum(o.qty) || 1)); }, 0);
        const laborCost = aluRound(units * laborPerUnit, 2);
        const subtotal = aluRound(profilesCost + accCost + glassCost + laborCost, 2);
        const vat = aluRound(subtotal * 0.15, 2);

        return {
            cuts: allCuts,
            byProfile: byProfile,
            accessories: accessories,
            glassPanels: glassPanels,
            glassAreaM2: aluRound(glassArea, 3),
            glassCost: aluRound(glassCost, 2),
            barsEstimate: barsEstimate,
            profilesCost: aluRound(profilesCost, 2),
            accessoriesCost: aluRound(accCost, 2),
            laborCost: laborCost,
            units: units,
            subtotal: subtotal,
            vat: vat,
            total: aluRound(subtotal + vat, 2)
        };
    }

    /**
     * محرك تقطيع 1D — Best Fit Decreasing + مقارنة First Fit Decreasing
     * يحترم سماكة الشفرة (kerf) وطول العود القياسي لكل قطاع
     */
    function packBarsOnePass(pieces, stockLen, kerf, mode) {
        const bars = [];
        pieces.forEach(function (piece) {
            let bestIdx = -1;
            let bestRemain = Infinity;
            for (let i = 0; i < bars.length; i++) {
                const usedExtra = bars[i].pieces.length ? kerf : 0;
                const need = piece.lengthMm + usedExtra;
                const remain = bars[i].remain - need;
                if (remain < -0.001) continue;
                if (mode === 'first') {
                    bestIdx = i;
                    break;
                }
                if (remain < bestRemain) {
                    bestRemain = remain;
                    bestIdx = i;
                }
            }
            if (bestIdx < 0) {
                bars.push({
                    index: bars.length + 1,
                    stockMm: stockLen,
                    usedMm: 0,
                    remain: stockLen,
                    pieces: [],
                    kerfTotal: 0
                });
                bestIdx = bars.length - 1;
            }
            const bar = bars[bestIdx];
            const extraKerf = bar.pieces.length ? kerf : 0;
            bar.pieces.push(Object.assign({}, piece, { kerfBefore: extraKerf }));
            bar.usedMm = aluRound(bar.usedMm + piece.lengthMm + extraKerf, 1);
            bar.kerfTotal = aluRound(bar.kerfTotal + extraKerf, 1);
            bar.remain = aluRound(stockLen - bar.usedMm, 1);
        });
        return bars;
    }

    function optimizeProfileCuts(cutRows, stockLen, kerf) {
        const expanded = [];
        cutRows.forEach(function (c) {
            const q = Math.max(1, Math.round(aluNum(c.qty) || 1));
            for (let i = 0; i < q; i++) {
                expanded.push({
                    lengthMm: aluNum(c.lengthMm),
                    labelAr: c.labelAr,
                    angleL: c.angleL,
                    angleR: c.angleR,
                    openingLabel: c.openingLabel,
                    seq: i + 1
                });
            }
        });
        expanded.sort(function (a, b) { return b.lengthMm - a.lengthMm; });
        const stock = Math.max(100, aluNum(stockLen) || 6000);
        const k = Math.max(0, aluNum(kerf) || 0);

        const bfd = packBarsOnePass(expanded, stock, k, 'best');
        const ffd = packBarsOnePass(expanded.slice(), stock, k, 'first');

        function score(bars) {
            const waste = bars.reduce(function (s, b) { return s + Math.max(0, b.remain); }, 0);
            const used = bars.reduce(function (s, b) { return s + b.usedMm; }, 0);
            const total = bars.length * stock;
            return {
                bars: bars,
                barCount: bars.length,
                wasteMm: aluRound(waste, 1),
                usedMm: aluRound(used, 1),
                totalMm: total,
                wastePct: total > 0 ? aluRound((waste / total) * 100, 2) : 0,
                yieldPct: total > 0 ? aluRound((used / total) * 100, 2) : 0
            };
        }
        const sB = score(bfd);
        const sF = score(ffd);
        const best = (sB.barCount < sF.barCount || (sB.barCount === sF.barCount && sB.wasteMm <= sF.wasteMm)) ? sB : sF;
        best.algorithm = best === sB ? 'Best-Fit Decreasing' : 'First-Fit Decreasing';
        return best;
    }

    function runFullCuttingPlan(cuts) {
        const groups = {};
        (cuts || []).forEach(function (c) {
            const key = c.profileId || c.role || 'custom';
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        const plans = [];
        let totalBars = 0;
        let totalWaste = 0;
        let totalStock = 0;
        let totalCost = 0;
        Object.keys(groups).forEach(function (key) {
            const rows = groups[key];
            const sample = rows[0];
            const prof = aluProfiles.find(function (p) { return p.id === sample.profileId; });
            const stock = (prof && aluNum(prof.stockBarMm)) || aluNum(aluSettings.stockBarMm) || 6000;
            const plan = optimizeProfileCuts(rows, stock, aluSettings.kerfMm);
            const price = prof ? aluNum(prof.pricePerBar) : 0;
            const cost = aluRound(plan.barCount * price, 2);
            plans.push({
                profileId: sample.profileId,
                profileSku: sample.profileSku || (prof && prof.sku) || '',
                profileName: sample.profileName || (prof && prof.nameAr) || key,
                stockMm: stock,
                pricePerBar: price,
                cost: cost,
                plan: plan
            });
            totalBars += plan.barCount;
            totalWaste += plan.wasteMm;
            totalStock += plan.totalMm;
            totalCost += cost;
        });
        return {
            plans: plans,
            totalBars: totalBars,
            totalWasteMm: aluRound(totalWaste, 1),
            wastePct: totalStock > 0 ? aluRound((totalWaste / totalStock) * 100, 2) : 0,
            yieldPct: totalStock > 0 ? aluRound(((totalStock - totalWaste) / totalStock) * 100, 2) : 0,
            profilesCost: aluRound(totalCost, 2),
            kerfMm: aluNum(aluSettings.kerfMm),
            createdAt: new Date().toISOString()
        };
    }

    function newEstimateDraft() {
        return {
            id: aluId('est'),
            ref: 'ALU-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(aluEstimates.length + 1).padStart(3, '0'),
            customerName: '',
            projectName: '',
            notes: '',
            laborPerUnit: 80,
            openings: [],
            manualCuts: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    function openAluminumCutting(tab) {
        if (!requireAluAccess()) return;
        if (!aluDataReady) hydrateAluminumCuttingLocal();
        if (tab) aluActiveTab = tab;
        if (typeof revealPlatformLayer === 'function') revealPlatformLayer('aluminum-cutting');
        else {
            const el = document.getElementById('aluminum-cutting');
            if (el) el.classList.add('show');
        }
        renderAluminumCuttingPanel();
        if (typeof odooReadThroughPanel === 'function') {
            try { odooReadThroughPanel('erp-aluminum-cutting'); } catch (e) { /* ignore */ }
        }
    }

    function closeAluminumCutting() {
        if (typeof closeAdminSection === 'function') closeAdminSection('aluminum-cutting');
        else {
            const el = document.getElementById('aluminum-cutting');
            if (el) el.classList.remove('show');
        }
    }

    function setAluTab(tab) {
        aluActiveTab = tab || 'dashboard';
        renderAluminumCuttingPanel();
    }

    function renderAluminumCuttingPanel() {
        const host = document.getElementById('aluminum-cutting-body');
        if (!host) return;
        ensureDefaultProfiles();
        const tabs = [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة' },
            { id: 'profiles', icon: 'fas fa-bars-staggered', label: 'القطاعات' },
            { id: 'estimate', icon: 'fas fa-ruler-combined', label: 'مقايسة' },
            { id: 'cutting', icon: 'fas fa-scissors', label: 'تقطيع' },
            { id: 'reports', icon: 'fas fa-file-lines', label: 'تقارير' },
            { id: 'settings', icon: 'fas fa-sliders', label: 'إعدادات' }
        ];
        const nav = '<div class="alu-cut-tabs" role="tablist">' + tabs.map(function (t) {
            return '<button type="button" class="alu-cut-tab' + (aluActiveTab === t.id ? ' is-active' : '') +
                '" onclick="setAluCutTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + t.label + '</button>';
        }).join('') + '</div>';

        let body = '';
        if (aluActiveTab === 'dashboard') body = renderAluDashboard();
        else if (aluActiveTab === 'profiles') body = renderAluProfiles();
        else if (aluActiveTab === 'estimate') body = renderAluEstimate();
        else if (aluActiveTab === 'cutting') body = renderAluCutting();
        else if (aluActiveTab === 'reports') body = renderAluReports();
        else if (aluActiveTab === 'settings') body = renderAluSettings();

        host.innerHTML = nav + '<div class="alu-cut-panel">' + body + '</div>';
    }

    function renderAluDashboard() {
        const totals = aluEstimates.slice(-1)[0] ? computeEstimateTotals(aluEstimates[aluEstimates.length - 1]) : null;
        const lastJob = aluCutJobs[aluCutJobs.length - 1];
        return '<div class="alu-cut-hero">' +
            '<div class="alu-cut-hero-glow"></div>' +
            '<div class="alu-cut-hero-inner">' +
            '<p class="alu-cut-kicker">نبراس · قسم الألومنيوم</p>' +
            '<h3>تخصيم قطاعات الألومنيوم</h3>' +
            '<p>مقايسات باب وشباك · تقطيع ذكي لتقليل الهدر · طلبية مشتريات · تجميع وتكلفة — بدقة ورشة.</p>' +
            '<div class="alu-cut-hero-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'cutting\')"><i class="fas fa-scissors"></i> تشغيل التقطيع</button>' +
            '</div></div></div>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + aluProfiles.filter(function (p) { return p.active !== false; }).length + '</strong><span>قطاعات نشطة</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluEstimates.length + '</strong><span>مقايسات</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluCutJobs.length + '</strong><span>خطط تقطيع</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + (lastJob ? lastJob.wastePct + '%' : '—') + '</strong><span>آخر هدر</span></div>' +
            '</div>' +
            '<div class="alu-cut-quick">' +
            '<article><h4><i class="fas fa-bars-staggered"></i> القطاعات</h4><p>أضف وعدّل قطاعات الإطار والضلفة والعتبة مع سعر العود والوزن.</p><button type="button" onclick="setAluCutTab(\'profiles\')">فتح</button></article>' +
            '<article><h4><i class="fas fa-ruler-combined"></i> المقايسة</h4><p>أبواب وشبابيك — حساب الأعواد والأكسسوارات والزجاج تلقائياً.</p><button type="button" onclick="setAluCutTab(\'estimate\')">فتح</button></article>' +
            '<article><h4><i class="fas fa-scissors"></i> التقطيع</h4><p>خوارزمية Best-Fit لتقليل الهدر لأقصى درجة مع سماكة الشفرة.</p><button type="button" onclick="setAluCutTab(\'cutting\')">فتح</button></article>' +
            '<article><h4><i class="fas fa-file-lines"></i> التقارير</h4><p>طلبية مشتريات تفصيلية · تجميع · تكلفة شاملة الضريبة.</p><button type="button" onclick="setAluCutTab(\'reports\')">فتح</button></article>' +
            '</div>' +
            (totals ? '<p class="alu-cut-note"><i class="fas fa-info-circle"></i> آخر مقايسة: تقدير أعواد ≈ ' + totals.barsEstimate + ' · إجمالي ≈ ' + totals.total + ' ' + aluSettings.currencyLabel + '</p>' : '');
    }

    function renderAluProfiles() {
        const rows = aluProfiles.map(function (p, idx) {
            return '<article class="erp-row alu-profile-row">' +
                '<div class="erp-row-main"><strong>' + aluEsc(p.nameAr) + '</strong>' +
                '<span class="erp-row-tags">' +
                '<span class="erp-tag">' + aluEsc(p.sku) + '</span>' +
                '<span class="erp-tag">' + aluEsc(p.role) + '</span>' +
                '<span class="erp-tag">' + aluNum(p.stockBarMm) + ' مم</span>' +
                (p.colorAr ? '<span class="erp-tag">' + aluEsc(p.colorAr) + '</span>' : '') +
                '</span>' +
                '<small>وزن ' + aluNum(p.weightKgPerM) + ' كغ/م · سعر العود ' + aluNum(p.pricePerBar) + ' ' + aluSettings.currencyLabel +
                (p.active === false ? ' · <span class="erp-tag erp-tag--danger">موقوف</span>' : '') +
                '</small></div>' +
                '<div class="alu-row-actions">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="editAluProfile(' + idx + ')">تعديل</button>' +
                '<button type="button" class="erp-tag" onclick="toggleAluProfile(' + idx + ')">' + (p.active === false ? 'تفعيل' : 'إيقاف') + '</button>' +
                '</div></article>';
        }).join('');

        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-plus"></i> إضافة / تعديل قطاع</h4>' +
            '<div class="erp-form-grid" id="alu-profile-form">' +
            '<input type="hidden" id="alu-pf-id" value="">' +
            '<label class="nebras-field"><span>الاسم</span><input type="text" id="alu-pf-name" placeholder="قطاع إطار 45"></label>' +
            '<label class="nebras-field"><span>SKU</span><input type="text" id="alu-pf-sku" placeholder="ALU-FR-45"></label>' +
            '<label class="nebras-field"><span>الدور</span><select id="alu-pf-role">' +
            ['frame', 'sash', 'interlock', 'threshold', 'mullion', 'custom'].map(function (r) {
                return '<option value="' + r + '">' + r + '</option>';
            }).join('') +
            '</select></label>' +
            '<label class="nebras-field"><span>طول العود (مم)</span><input type="number" id="alu-pf-stock" value="6000" min="1000" step="1"></label>' +
            '<label class="nebras-field"><span>وزن كغ/م</span><input type="number" id="alu-pf-weight" value="0.9" min="0" step="0.01"></label>' +
            '<label class="nebras-field"><span>سعر العود</span><input type="number" id="alu-pf-price" value="80" min="0" step="0.01"></label>' +
            '<label class="nebras-field"><span>اللون</span><input type="text" id="alu-pf-color" placeholder="فضي / برونز"></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluProfile()"><i class="fas fa-save"></i> حفظ القطاع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="resetAluProfileForm()">مسح</button>' +
            '</div></div>' +
            '<div class="nebras-erp-list">' + (rows || '<p class="erp-empty">لا قطاعات بعد.</p>') + '</div>';
    }

    function resetAluProfileForm() {
        ['alu-pf-id', 'alu-pf-name', 'alu-pf-sku', 'alu-pf-color'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const stock = document.getElementById('alu-pf-stock');
        if (stock) stock.value = '6000';
        const w = document.getElementById('alu-pf-weight');
        if (w) w.value = '0.9';
        const p = document.getElementById('alu-pf-price');
        if (p) p.value = '80';
    }

    function editAluProfile(idx) {
        const p = aluProfiles[idx];
        if (!p) return;
        setAluTab('profiles');
        setTimeout(function () {
            const map = {
                'alu-pf-id': p.id,
                'alu-pf-name': p.nameAr,
                'alu-pf-sku': p.sku,
                'alu-pf-role': p.role,
                'alu-pf-stock': p.stockBarMm,
                'alu-pf-weight': p.weightKgPerM,
                'alu-pf-price': p.pricePerBar,
                'alu-pf-color': p.colorAr || ''
            };
            Object.keys(map).forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.value = map[id];
            });
        }, 30);
    }

    function toggleAluProfile(idx) {
        if (!aluProfiles[idx]) return;
        aluProfiles[idx].active = aluProfiles[idx].active === false;
        aluProfiles[idx].updatedAt = new Date().toISOString();
        persistAluminumCuttingCloud(['aluminum_profiles']);
        renderAluminumCuttingPanel();
    }

    function saveAluProfile() {
        if (!requireAluAccess()) return;
        const nameAr = aluField('alu-pf-name');
        const sku = aluField('alu-pf-sku');
        if (!nameAr || !sku) {
            alert('الاسم و SKU مطلوبان.');
            return;
        }
        const id = aluField('alu-pf-id') || aluId('alu-p');
        const row = {
            id: id,
            nameAr: nameAr,
            sku: sku,
            role: aluField('alu-pf-role') || 'custom',
            stockBarMm: aluNum(aluField('alu-pf-stock')) || 6000,
            weightKgPerM: aluNum(aluField('alu-pf-weight')),
            pricePerBar: aluNum(aluField('alu-pf-price')),
            colorAr: aluField('alu-pf-color'),
            active: true,
            updatedAt: new Date().toISOString()
        };
        const idx = aluProfiles.findIndex(function (p) { return p.id === id; });
        if (idx >= 0) aluProfiles[idx] = Object.assign({}, aluProfiles[idx], row);
        else {
            row.createdAt = row.updatedAt;
            aluProfiles.push(row);
        }
        persistAluminumCuttingCloud(['aluminum_profiles']);
        resetAluProfileForm();
        renderAluminumCuttingPanel();
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ القطاع', 'ok');
    }

    function renderAluEstimate() {
        if (!aluEstimateDraft) aluEstimateDraft = newEstimateDraft();
        const d = aluEstimateDraft;
        const sysOpts = Object.keys(ALU_SYSTEMS).map(function (k) {
            return '<option value="' + k + '">' + aluEsc(ALU_SYSTEMS[k].nameAr) + '</option>';
        }).join('');
        const openingsHtml = (d.openings || []).map(function (op, i) {
            const sys = ALU_SYSTEMS[op.system] || {};
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + aluEsc(op.labelAr || sys.nameAr || 'فتحة') + '</strong>' +
                '<small>' + aluEsc(sys.nameAr || op.system) + ' — ' + aluNum(op.widthMm) + '×' + aluNum(op.heightMm) + ' مم × ' + aluNum(op.qty) + '</small></div>' +
                '<button type="button" class="erp-row-del" onclick="removeAluOpening(' + i + ')" aria-label="حذف"><i class="fas fa-trash"></i></button></article>';
        }).join('') || '<p class="erp-empty">أضف فتحات (باب/شباك) للمقايسة.</p>';

        const totals = computeEstimateTotals(d);
        const saved = aluEstimates.slice().reverse().slice(0, 8).map(function (e) {
            return '<button type="button" class="alu-saved-chip" onclick="loadAluEstimate(\'' + aluEsc(e.id) + '\')">' +
                aluEsc(e.ref) + ' · ' + aluEsc(e.customerName || 'بدون عميل') + '</button>';
        }).join('');

        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-ruler-combined"></i> مقايسة ألومنيوم — باب وشباك</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>مرجع</span><input type="text" id="alu-est-ref" value="' + aluEsc(d.ref) + '"></label>' +
            '<label class="nebras-field"><span>العميل</span><input type="text" id="alu-est-customer" value="' + aluEsc(d.customerName) + '" placeholder="اسم العميل"></label>' +
            '<label class="nebras-field"><span>المشروع</span><input type="text" id="alu-est-project" value="' + aluEsc(d.projectName) + '" placeholder="فيلا / مشروع"></label>' +
            '<label class="nebras-field"><span>أجور تجميع / وحدة</span><input type="number" id="alu-est-labor" value="' + aluNum(d.laborPerUnit) + '" min="0" step="1"></label>' +
            '</div>' +
            '<div class="alu-cut-subcard">' +
            '<h5>إضافة فتحة</h5>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>النظام</span><select id="alu-op-system">' + sysOpts + '</select></label>' +
            '<label class="nebras-field"><span>العرض مم</span><input type="number" id="alu-op-w" min="200" step="1" placeholder="1200"></label>' +
            '<label class="nebras-field"><span>الارتفاع مم</span><input type="number" id="alu-op-h" min="200" step="1" placeholder="1400"></label>' +
            '<label class="nebras-field"><span>الكمية</span><input type="number" id="alu-op-qty" min="1" value="1" step="1"></label>' +
            '<label class="nebras-field"><span>وصف</span><input type="text" id="alu-op-label" placeholder="شباك غرفة 1"></label>' +
            '<label class="nebras-field"><span>سماكة زجاج مم</span><input type="number" id="alu-op-glass-th" value="6" min="4" step="1"></label>' +
            '<label class="nebras-field"><span>سعر الزجاج / م²</span><input type="number" id="alu-op-glass-price" value="45" min="0" step="0.5"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluOpening()"><i class="fas fa-plus"></i> إضافة الفتحة</button>' +
            '</div>' +
            '<div class="nebras-erp-list">' + openingsHtml + '</div>' +
            '<div class="alu-cut-totals">' +
            '<div><span>أعواد (تقدير)</span><strong>' + totals.barsEstimate + '</strong></div>' +
            '<div><span>قطاعات</span><strong>' + totals.profilesCost + '</strong></div>' +
            '<div><span>أكسسوارات</span><strong>' + totals.accessoriesCost + '</strong></div>' +
            '<div><span>زجاج م²</span><strong>' + totals.glassAreaM2 + '</strong></div>' +
            '<div><span>تجميع</span><strong>' + totals.laborCost + '</strong></div>' +
            '<div class="alu-cut-totals-grand"><span>الإجمالي شامل الضريبة</span><strong>' + totals.total + ' ' + aluSettings.currencyLabel + '</strong></div>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluEstimate()"><i class="fas fa-save"></i> حفظ المقايسة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="sendAluEstimateToCutting()"><i class="fas fa-scissors"></i> إرسال للتقطيع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="newAluEstimate()"><i class="fas fa-file"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluEstimateReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '</div>' +
            (saved ? '<div class="alu-saved-list"><span>محفوظة:</span> ' + saved + '</div>' : '') +
            '</div>';
    }

    function syncEstimateDraftFields() {
        if (!aluEstimateDraft) return;
        aluEstimateDraft.ref = aluField('alu-est-ref') || aluEstimateDraft.ref;
        aluEstimateDraft.customerName = aluField('alu-est-customer');
        aluEstimateDraft.projectName = aluField('alu-est-project');
        aluEstimateDraft.laborPerUnit = aluNum(aluField('alu-est-labor')) || 80;
        aluEstimateDraft.updatedAt = new Date().toISOString();
    }

    function addAluOpening() {
        if (!aluEstimateDraft) aluEstimateDraft = newEstimateDraft();
        syncEstimateDraftFields();
        const W = aluNum(aluField('alu-op-w'));
        const H = aluNum(aluField('alu-op-h'));
        if (W < 200 || H < 200) {
            alert('أدخل عرض وارتفاع صحيحين (مم).');
            return;
        }
        const system = aluField('alu-op-system') || 'sliding2';
        aluEstimateDraft.openings.push({
            id: aluId('op'),
            system: system,
            widthMm: W,
            heightMm: H,
            qty: Math.max(1, Math.round(aluNum(aluField('alu-op-qty')) || 1)),
            labelAr: aluField('alu-op-label') || (ALU_SYSTEMS[system] || {}).nameAr || 'فتحة',
            glassThicknessMm: aluNum(aluField('alu-op-glass-th')) || 6,
            glassPricePerM2: aluNum(aluField('alu-op-glass-price')) || 45
        });
        renderAluminumCuttingPanel();
    }

    function removeAluOpening(i) {
        if (!aluEstimateDraft || !aluEstimateDraft.openings) return;
        aluEstimateDraft.openings.splice(i, 1);
        renderAluminumCuttingPanel();
    }

    function newAluEstimate() {
        aluEstimateDraft = newEstimateDraft();
        renderAluminumCuttingPanel();
    }

    function saveAluEstimate() {
        if (!requireAluAccess()) return;
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        if (!(aluEstimateDraft.openings || []).length) {
            alert('أضف فتحة واحدة على الأقل.');
            return;
        }
        const totals = computeEstimateTotals(aluEstimateDraft);
        aluEstimateDraft.totalsSnapshot = {
            barsEstimate: totals.barsEstimate,
            subtotal: totals.subtotal,
            total: totals.total,
            glassAreaM2: totals.glassAreaM2
        };
        const idx = aluEstimates.findIndex(function (e) { return e.id === aluEstimateDraft.id; });
        const copy = JSON.parse(JSON.stringify(aluEstimateDraft));
        if (idx >= 0) aluEstimates[idx] = copy;
        else aluEstimates.push(copy);
        persistAluminumCuttingCloud(['aluminum_estimates']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ المقايسة ' + copy.ref, 'ok');
        renderAluminumCuttingPanel();
    }

    function loadAluEstimate(id) {
        const e = aluEstimates.find(function (x) { return x.id === id; });
        if (!e) return;
        aluEstimateDraft = JSON.parse(JSON.stringify(e));
        setAluTab('estimate');
    }

    function sendAluEstimateToCutting() {
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        if (!(aluEstimateDraft.openings || []).length) {
            alert('أضف فتحات أولاً.');
            return;
        }
        const totals = computeEstimateTotals(aluEstimateDraft);
        aluCutDraft = {
            estimateId: aluEstimateDraft.id,
            estimateRef: aluEstimateDraft.ref,
            customerName: aluEstimateDraft.customerName,
            cuts: totals.cuts,
            accessories: totals.accessories,
            glassPanels: totals.glassPanels,
            laborCost: totals.laborCost,
            accessoriesCost: totals.accessoriesCost,
            glassCost: totals.glassCost
        };
        setAluTab('cutting');
    }

    function renderAluCutting() {
        if (!aluCutDraft && aluEstimateDraft && (aluEstimateDraft.openings || []).length) {
            const totals = computeEstimateTotals(aluEstimateDraft);
            aluCutDraft = {
                estimateId: aluEstimateDraft.id,
                estimateRef: aluEstimateDraft.ref,
                customerName: aluEstimateDraft.customerName,
                cuts: totals.cuts,
                accessories: totals.accessories,
                glassPanels: totals.glassPanels,
                laborCost: totals.laborCost,
                accessoriesCost: totals.accessoriesCost,
                glassCost: totals.glassCost
            };
        }
        if (!aluCutDraft) {
            return '<p class="erp-empty">لا قطع جاهزة — أنشئ مقايسة ثم اضغط «إرسال للتقطيع».</p>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'estimate\')">الذهاب للمقايسة</button>';
        }

        const result = runFullCuttingPlan(aluCutDraft.cuts);
        aluCutDraft.lastResult = result;

        const plansHtml = result.plans.map(function (pl) {
            const barsHtml = pl.plan.bars.map(function (bar) {
                const segs = bar.pieces.map(function (p) {
                    const pct = Math.max(2, (p.lengthMm / pl.stockMm) * 100);
                    return '<span class="alu-bar-seg" style="flex:' + pct + '" title="' + aluEsc(p.labelAr + ' ' + p.lengthMm + 'مم') + '">' +
                        p.lengthMm + '</span>';
                }).join('');
                const wastePct = Math.max(0, (bar.remain / pl.stockMm) * 100);
                return '<div class="alu-bar-row">' +
                    '<div class="alu-bar-meta"><strong>عود ' + bar.index + '</strong><small>متبقي ' + bar.remain + ' مم · استخدام ' + bar.usedMm + '</small></div>' +
                    '<div class="alu-bar-track">' + segs +
                    (bar.remain > 0 ? '<span class="alu-bar-waste" style="flex:' + wastePct + '">' + bar.remain + '</span>' : '') +
                    '</div></div>';
            }).join('');
            return '<section class="alu-cut-plan-block">' +
                '<header><h4>' + aluEsc(pl.profileName) + ' <small>' + aluEsc(pl.profileSku) + '</small></h4>' +
                '<p>' + pl.plan.barCount + ' عود × ' + pl.stockMm + ' مم · هدر ' + pl.plan.wastePct + '% · تكلفة ' + pl.cost + ' · ' + aluEsc(pl.plan.algorithm) + '</p></header>' +
                barsHtml + '</section>';
        }).join('');

        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-scissors"></i> تقرير تقطيع — تقليل الهدر</h4>' +
            '<p class="alu-cut-note">المقايسة: <strong>' + aluEsc(aluCutDraft.estimateRef || '—') + '</strong> · ' +
            aluEsc(aluCutDraft.customerName || '') + ' · شفرة ' + result.kerfMm + ' مم · عود قياسي ' + aluSettings.stockBarMm + ' مم</p>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + result.totalBars + '</strong><span>أعواد مطلوبة</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + result.wastePct + '%</strong><span>نسبة الهدر</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.yieldPct + '%</strong><span>كفاءة الاستخدام</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.profilesCost + '</strong><span>تكلفة القطاعات</span></div>' +
            '</div>' +
            plansHtml +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluCutJob()"><i class="fas fa-save"></i> حفظ خطة التقطيع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluCutReport()"><i class="fas fa-print"></i> طباعة التقطيع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'reports\')"><i class="fas fa-file-lines"></i> التقارير</button>' +
            '</div></div>';
    }

    function saveAluCutJob() {
        if (!requireAluAccess() || !aluCutDraft || !aluCutDraft.lastResult) return;
        const job = {
            id: aluId('cut'),
            estimateId: aluCutDraft.estimateId,
            estimateRef: aluCutDraft.estimateRef,
            customerName: aluCutDraft.customerName,
            result: aluCutDraft.lastResult,
            accessories: aluCutDraft.accessories,
            glassPanels: aluCutDraft.glassPanels,
            laborCost: aluCutDraft.laborCost,
            accessoriesCost: aluCutDraft.accessoriesCost,
            glassCost: aluCutDraft.glassCost,
            wastePct: aluCutDraft.lastResult.wastePct,
            totalBars: aluCutDraft.lastResult.totalBars,
            createdAt: new Date().toISOString()
        };
        aluCutJobs.push(job);
        persistAluminumCuttingCloud(['aluminum_cut_jobs']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ خطة التقطيع', 'ok');
        renderAluminumCuttingPanel();
    }

    function renderAluReports() {
        const est = aluEstimateDraft && (aluEstimateDraft.openings || []).length
            ? aluEstimateDraft
            : (aluEstimates[aluEstimates.length - 1] || null);
        if (!est) {
            return '<p class="erp-empty">لا مقايسة لعرض التقارير — أنشئ مقايسة أولاً.</p>';
        }
        const totals = computeEstimateTotals(est);
        const cut = aluCutDraft && aluCutDraft.lastResult
            ? aluCutDraft.lastResult
            : (aluCutJobs.length ? aluCutJobs[aluCutJobs.length - 1].result : runFullCuttingPlan(totals.cuts));

        const purchaseRows = cut.plans.map(function (pl) {
            return '<tr><td>' + aluEsc(pl.profileSku) + '</td><td>' + aluEsc(pl.profileName) + '</td><td>' + pl.stockMm + '</td><td>' +
                pl.plan.barCount + '</td><td>' + pl.pricePerBar + '</td><td>' + pl.cost + '</td></tr>';
        }).join('');

        const accRows = totals.accessories.map(function (a) {
            return '<tr><td>' + aluEsc(a.nameAr) + '</td><td>' + a.qty + '</td><td>' + a.unitPrice + '</td><td>' + a.total + '</td></tr>';
        }).join('') || '<tr><td colspan="4">—</td></tr>';

        const glassRows = totals.glassPanels.map(function (g) {
            return '<tr><td>' + aluEsc(g.openingLabel) + '</td><td>' + g.widthMm + '×' + g.heightMm + '</td><td>' +
                g.panels + '</td><td>' + g.thicknessMm + '</td><td>' + g.areaM2 + '</td><td>' + aluRound(g.areaM2 * g.pricePerM2, 2) + '</td></tr>';
        }).join('') || '<tr><td colspan="6">—</td></tr>';

        const assemblyCost = aluRound(cut.profilesCost + totals.accessoriesCost + totals.glassCost + totals.laborCost, 2);
        const vat = aluRound(assemblyCost * 0.15, 2);

        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-cart-shopping"></i> تقرير طلبية مشتريات تفصيلية</h4>' +
            '<p class="alu-cut-note">' + aluEsc(est.ref) + ' — ' + aluEsc(est.customerName || '') + ' / ' + aluEsc(est.projectName || '') + '</p>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>SKU</th><th>القطاع</th><th>طول العود</th><th>الكمية</th><th>سعر</th><th>الإجمالي</th></tr></thead><tbody>' +
            purchaseRows + '</tbody></table></div>' +
            '<p><strong>إجمالي شراء القطاعات:</strong> ' + cut.profilesCost + ' ' + aluSettings.currencyLabel +
            ' · أعواد ' + cut.totalBars + ' · هدر متوقع ' + cut.wastePct + '%</p>' +
            '</div>' +
            '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-puzzle-piece"></i> تقرير تجميع وتكلفة</h4>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>أكسسوار</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead><tbody>' +
            accRows + '</tbody></table></div>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>فتحة</th><th>زجاج مم</th><th>ألواح</th><th>سماكة</th><th>م²</th><th>تكلفة</th></tr></thead><tbody>' +
            glassRows + '</tbody></table></div>' +
            '<div class="alu-cut-totals">' +
            '<div><span>قطاعات (بعد التقطيع)</span><strong>' + cut.profilesCost + '</strong></div>' +
            '<div><span>أكسسوارات</span><strong>' + totals.accessoriesCost + '</strong></div>' +
            '<div><span>زجاج</span><strong>' + totals.glassCost + '</strong></div>' +
            '<div><span>أجور تجميع</span><strong>' + totals.laborCost + '</strong></div>' +
            '<div><span>قبل الضريبة</span><strong>' + assemblyCost + '</strong></div>' +
            '<div><span>ضريبة 15%</span><strong>' + vat + '</strong></div>' +
            '<div class="alu-cut-totals-grand"><span>الإجمالي النهائي</span><strong>' + aluRound(assemblyCost + vat, 2) + ' ' + aluSettings.currencyLabel + '</strong></div>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn" onclick="printAluPurchaseReport()"><i class="fas fa-print"></i> طباعة المشتريات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluAssemblyReport()"><i class="fas fa-print"></i> طباعة التجميع</button>' +
            '</div></div>';
    }

    function renderAluSettings() {
        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-sliders"></i> إعدادات التخصيم</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>طول العود القياسي (مم)</span><input type="number" id="alu-set-stock" value="' + aluNum(aluSettings.stockBarMm) + '" min="1000" step="1"></label>' +
            '<label class="nebras-field"><span>سماكة شفرة المنشار / Kerf (مم)</span><input type="number" id="alu-set-kerf" value="' + aluNum(aluSettings.kerfMm) + '" min="0" step="0.1"></label>' +
            '<label class="nebras-field"><span>خصم زجاج عرض (مم)</span><input type="number" id="alu-set-gdW" value="' + aluNum(aluSettings.defaultGlassDeductW) + '" min="0" step="1"></label>' +
            '<label class="nebras-field"><span>خصم زجاج ارتفاع (مم)</span><input type="number" id="alu-set-gdH" value="' + aluNum(aluSettings.defaultGlassDeductH) + '" min="0" step="1"></label>' +
            '</div>' +
            '<p class="alu-cut-note"><i class="fas fa-lightbulb"></i> القيم الافتراضية مناسبة لورش الألومنيوم (عود 6م · شفرة ≈ 3مم). عدّلها حسب منشارك ونظامك.</p>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluCutSettings()"><i class="fas fa-save"></i> حفظ الإعدادات</button>' +
            '</div>';
    }

    function saveAluCutSettings() {
        if (!requireAluAccess()) return;
        aluSettings.stockBarMm = aluNum(aluField('alu-set-stock')) || 6000;
        aluSettings.kerfMm = aluNum(aluField('alu-set-kerf'));
        aluSettings.defaultGlassDeductW = aluNum(aluField('alu-set-gdW'));
        aluSettings.defaultGlassDeductH = aluNum(aluField('alu-set-gdH'));
        persistAluminumCuttingCloud(['aluminum_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ إعدادات التخصيم', 'ok');
    }

    function openPrintWindow(title, html) {
        const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
        if (!w) {
            alert('اسمح بالنوافذ المنبثقة للطباعة.');
            return;
        }
        w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' +
            aluEsc(title) + '</title><style>' +
            'body{font-family:Cairo,Tahoma,sans-serif;padding:24px;color:#1a1a1a}' +
            'h1{font-size:1.25rem;margin:0 0 .5rem}h2{font-size:1.05rem;margin:1.2rem 0 .4rem}' +
            'table{width:100%;border-collapse:collapse;margin:.5rem 0 1rem;font-size:.85rem}' +
            'th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}' +
            'th{background:#f0f4f7}.meta{color:#555;font-size:.9rem;margin-bottom:1rem}' +
            '.bar{display:flex;height:22px;border:1px solid #999;margin:4px 0;background:#fafafa}' +
            '.seg{background:#1a5276;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;border-left:1px solid #fff}' +
            '.waste{background:#e8c4c4;color:#622;font-size:10px;display:flex;align-items:center;justify-content:center}' +
            '@media print{button{display:none}}' +
            '</style></head><body>' + html +
            '<p><button onclick="window.print()">طباعة</button></p></body></html>');
        w.document.close();
    }

    function printAluEstimateReport() {
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        const t = computeEstimateTotals(aluEstimateDraft);
        let html = '<h1>مقايسة ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(aluEstimateDraft.ref) + ' — ' +
            aluEsc(aluEstimateDraft.customerName) + ' / ' + aluEsc(aluEstimateDraft.projectName) + '</p>';
        html += '<h2>الفتحات</h2><table><tr><th>الوصف</th><th>النظام</th><th>المقاس</th><th>الكمية</th></tr>';
        (aluEstimateDraft.openings || []).forEach(function (op) {
            html += '<tr><td>' + aluEsc(op.labelAr) + '</td><td>' + aluEsc((ALU_SYSTEMS[op.system] || {}).nameAr || '') +
                '</td><td>' + op.widthMm + '×' + op.heightMm + '</td><td>' + op.qty + '</td></tr>';
        });
        html += '</table><p>أعواد تقديرية: ' + t.barsEstimate + ' · زجاج: ' + t.glassAreaM2 + ' م² · الإجمالي شامل الضريبة: ' +
            t.total + ' ' + aluSettings.currencyLabel + '</p>';
        openPrintWindow('مقايسة ألومنيوم', html);
    }

    function printAluCutReport() {
        if (!aluCutDraft || !aluCutDraft.lastResult) {
            alert('شغّل شاشة التقطيع أولاً.');
            return;
        }
        const r = aluCutDraft.lastResult;
        let html = '<h1>تقرير تقطيع ألومنيوم — نبراس</h1><p class="meta">' +
            aluEsc(aluCutDraft.estimateRef || '') + ' — هدر ' + r.wastePct + '% · أعواد ' + r.totalBars + '</p>';
        r.plans.forEach(function (pl) {
            html += '<h2>' + aluEsc(pl.profileName) + ' (' + aluEsc(pl.profileSku) + ')</h2>';
            pl.plan.bars.forEach(function (bar) {
                html += '<div><strong>عود ' + bar.index + '</strong> — متبقي ' + bar.remain + ' مم</div><div class="bar">';
                bar.pieces.forEach(function (p) {
                    const pct = Math.max(2, (p.lengthMm / pl.stockMm) * 100);
                    html += '<span class="seg" style="flex:' + pct + '">' + p.lengthMm + '</span>';
                });
                if (bar.remain > 0) {
                    html += '<span class="waste" style="flex:' + ((bar.remain / pl.stockMm) * 100) + '">' + bar.remain + '</span>';
                }
                html += '</div>';
            });
        });
        openPrintWindow('تقطيع ألومنيوم', html);
    }

    function printAluPurchaseReport() {
        setAluTab('reports');
        setTimeout(function () {
            const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
            if (!est) return;
            const totals = computeEstimateTotals(est);
            const cut = (aluCutDraft && aluCutDraft.lastResult) || runFullCuttingPlan(totals.cuts);
            let html = '<h1>طلبية مشتريات ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(est.ref) + '</p>';
            html += '<table><tr><th>SKU</th><th>القطاع</th><th>أعواد</th><th>طول</th><th>تكلفة</th></tr>';
            cut.plans.forEach(function (pl) {
                html += '<tr><td>' + aluEsc(pl.profileSku) + '</td><td>' + aluEsc(pl.profileName) + '</td><td>' +
                    pl.plan.barCount + '</td><td>' + pl.stockMm + '</td><td>' + pl.cost + '</td></tr>';
            });
            html += '</table><p>الإجمالي: ' + cut.profilesCost + ' ' + aluSettings.currencyLabel + '</p>';
            openPrintWindow('مشتريات ألومنيوم', html);
        }, 50);
    }

    function printAluAssemblyReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        const t = computeEstimateTotals(est);
        let html = '<h1>تقرير تجميع وتكلفة — نبراس</h1><p class="meta">' + aluEsc(est.ref) + ' — ' + aluEsc(est.customerName) + '</p>';
        html += '<table><tr><th>أكسسوار</th><th>كمية</th><th>إجمالي</th></tr>';
        t.accessories.forEach(function (a) {
            html += '<tr><td>' + aluEsc(a.nameAr) + '</td><td>' + a.qty + '</td><td>' + a.total + '</td></tr>';
        });
        html += '</table><p>زجاج: ' + t.glassAreaM2 + ' م² = ' + t.glassCost + ' · تجميع: ' + t.laborCost +
            ' · شامل الضريبة: ' + t.total + ' ' + aluSettings.currencyLabel + '</p>';
        openPrintWindow('تجميع ألومنيوم', html);
    }

    /* —— تهيئة —— */
    hydrateAluminumCuttingLocal();

    global.openAluminumCutting = openAluminumCutting;
    global.closeAluminumCutting = closeAluminumCutting;
    global.setAluCutTab = setAluTab;
    global.saveAluProfile = saveAluProfile;
    global.editAluProfile = editAluProfile;
    global.toggleAluProfile = toggleAluProfile;
    global.resetAluProfileForm = resetAluProfileForm;
    global.addAluOpening = addAluOpening;
    global.removeAluOpening = removeAluOpening;
    global.saveAluEstimate = saveAluEstimate;
    global.newAluEstimate = newAluEstimate;
    global.loadAluEstimate = loadAluEstimate;
    global.sendAluEstimateToCutting = sendAluEstimateToCutting;
    global.saveAluCutJob = saveAluCutJob;
    global.saveAluCutSettings = saveAluCutSettings;
    global.printAluEstimateReport = printAluEstimateReport;
    global.printAluCutReport = printAluCutReport;
    global.printAluPurchaseReport = printAluPurchaseReport;
    global.printAluAssemblyReport = printAluAssemblyReport;
    global.isStrictAluminumUser = isStrictAluminumUser;
    global.canAccessAluminumCutting = canAccessAluminumCutting;
    global.getAluminumProfiles = getAluminumProfiles;
    global.getAluminumEstimates = getAluminumEstimates;
    global.getAluminumCutJobs = getAluminumCutJobs;
    global.getAluminumCutSettings = getAluminumCutSettings;
    global.setAluminumProfilesFromCloud = setAluminumProfilesFromCloud;
    global.setAluminumEstimatesFromCloud = setAluminumEstimatesFromCloud;
    global.setAluminumCutJobsFromCloud = setAluminumCutJobsFromCloud;
    global.setAluminumCutSettingsFromCloud = setAluminumCutSettingsFromCloud;
    global.renderAluminumCuttingPanel = renderAluminumCuttingPanel;
    global.nebrasOptimizeAluminumCuts = runFullCuttingPlan;
})(typeof window !== 'undefined' ? window : globalThis);
