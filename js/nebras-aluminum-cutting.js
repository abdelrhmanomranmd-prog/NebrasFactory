/**
 * نبراس — تخصيمات قطاعات الألومنيوم (V2 — وفق سير عمل Ecotal / Uptime Window)
 * مصادر الدقة: سلسلة 01–09 مقدمة/إعدادات/مقايسات/تقطيع/إكسسوارات
 * قطاعات · تخصيمات قابلة للضبط · معادلات إكسسوارات · تقطيع 1D أدق هدر · تقارير مشتريات/تجميع/تكلفة
 */
(function (global) {
    'use strict';

    const ALU_PROFILES_KEY = 'nebrasAluminumProfiles';
    const ALU_SYSTEMS_KEY = 'nebrasAluminumSystems';
    const ALU_ESTIMATES_KEY = 'nebrasAluminumEstimates';
    const ALU_CUT_JOBS_KEY = 'nebrasAluminumCutJobs';
    const ALU_SETTINGS_KEY = 'nebrasAluminumCutSettings';
    const ALU_ACCESSORIES_KEY = 'nebrasAluminumAccessories';
    const ALU_GLASS_KEY = 'nebrasAluminumGlass';
    const ALU_WIRE_KEY = 'nebrasAluminumWire';
    const ALU_COLORS_KEY = 'nebrasAluminumColors';

    const DEFAULT_SETTINGS = {
        stockBarMm: 6500,
        kerfMm: 10,
        remnantMinMm: 200,
        lastBarRemnantEnabled: true,
        lastBarThresholdMm: 4500,
        lastBarSafetyMm: 50,
        scrapPricePerKg: 2.5,
        underMeterMode: 'round_to_meter',
        priceModeDefault: 'purchase',
        showHandleHeight: true,
        linkWarehouse: false,
        quoteTerms: 'الأسعار شاملة التخصيم والتقطيع حسب المواصفات المعتمدة. صلاحية العرض 15 يوماً. التركيب حسب الاتفاق.',
        currencyLabel: 'ر.س',
        laborPerUnit: 80
    };

    /** تخصيمات افتراضية (مم) — قابلة للتعديل لكل نظام قطاع */
    const DEFAULT_DEDUCTIONS = {
        sashOverlapMm: 25,
        splitBetweenSashesMm: 0,
        sashFromFloorMm: 0,
        mullionDeductFull: 40,
        mullionDeductWithHeel: 50,
        glassSashDeductW: 80,
        glassSashDeductH: 100,
        glassFixedDeductW: 60,
        glassFixedDeductH: 60,
        wireMovingDeduct: 40,
        wireFixedDeduct: 30,
        sashDeductW: 40,
        sashDeductH: 40,
        cutAngle: 45
    };

    let aluProfiles = [];
    let aluSystems = [];
    let aluEstimates = [];
    let aluCutJobs = [];
    let aluAccessories = [];
    let aluGlass = [];
    let aluWire = [];
    let aluColors = [];
    let aluSettings = Object.assign({}, DEFAULT_SETTINGS);
    let aluActiveTab = 'dashboard';
    let aluEstimateDraft = null;
    let aluCutDraft = null;
    let aluDataReady = false;
    let aluEditSystemId = null;

    const READY_SHAPES = {
        casement: { nameAr: 'شباك مفصلي', family: 'hinged', leaves: 1 },
        fixed: { nameAr: 'شباك ثابت', family: 'hinged', leaves: 1 },
        sliding2: { nameAr: 'شباك سحاب ضلفتين', family: 'sliding', leaves: 2 },
        sliding3: { nameAr: 'شباك سحاب 3 ضلف', family: 'sliding', leaves: 3 },
        sliding4: { nameAr: 'شباك سحاب 4 ضلف', family: 'sliding', leaves: 4 },
        door_hinged: { nameAr: 'باب مفصلي', family: 'hinged', leaves: 1 },
        door_sliding: { nameAr: 'باب سحاب', family: 'sliding', leaves: 2 }
    };

    const PART_ROLES = {
        frame: 'حلوق',
        bar: 'بارات',
        sash: 'ضرف',
        bead: 'باكيت',
        meeting: 'سقاس',
        mullion: 'مرد',
        box: 'علب',
        flat: 'فلتات',
        threshold: 'عتبة',
        cladding: 'تجاليد',
        knife: 'سكينة',
        wireFrame: 'سلك'
    };

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
    function aluChecked(id) {
        const el = document.getElementById(id);
        return !!(el && el.checked);
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

    function seedDefaults() {
        if (!aluSystems.length) {
            aluSystems = [
                {
                    id: 'sys-sonata45',
                    nameAr: 'سوناتا 45 — مفصلي',
                    family: 'hinged',
                    cutAngle: 45,
                    tracksCount: 0,
                    deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                    parts: [
                        { id: 'p-fr', role: 'frame', nameAr: 'حلق سوناتا 45', sku: 'SON-FR-45', thicknessMm: 45, weightKgPerM: 0.95, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-sh', role: 'sash', nameAr: 'ضرفة سوناتا 45', sku: 'SON-SH-45', thicknessMm: 45, weightKgPerM: 0.72, pricePerKg: 18, withPackage: false, disableLastBarRemnant: true, active: true },
                        { id: 'p-bd', role: 'bead', nameAr: 'باكيت سوناتا', sku: 'SON-BD-01', thicknessMm: 20, weightKgPerM: 0.28, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true }
                    ],
                    active: true
                },
                {
                    id: 'sys-slide-std',
                    nameAr: 'سحاب قياسي',
                    family: 'sliding',
                    cutAngle: 45,
                    tracksCount: 2,
                    deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { sashOverlapMm: 28, mullionDeductFull: 40 }),
                    parts: [
                        { id: 'p-sfr', role: 'frame', nameAr: 'حلق سحاب', sku: 'SL-FR-01', thicknessMm: 50, weightKgPerM: 1.05, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-ssh', role: 'sash', nameAr: 'ضرفة سحاب', sku: 'SL-SH-01', thicknessMm: 40, weightKgPerM: 0.78, pricePerKg: 18, withPackage: false, disableLastBarRemnant: true, active: true },
                        { id: 'p-mu', role: 'mullion', nameAr: 'مرد / عمود التقاء', sku: 'SL-MU-01', thicknessMm: 40, weightKgPerM: 0.88, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-kn', role: 'knife', nameAr: 'سكينة', sku: 'SL-KN-01', thicknessMm: 20, weightKgPerM: 0.45, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true }
                    ],
                    active: true
                }
            ];
        }
        if (!aluAccessories.length) {
            aluAccessories = [
                { id: 'acc-corner', code: 'CORNER', nameAr: 'كورنر', equationType: 'per_corner', equationValue: 1, purchasePrice: 1.5, sellPrice: 2.5, applyScope: 'all', colorAr: '', active: true },
                { id: 'acc-screw', code: 'SCREW', nameAr: 'مسامير تثبيت', equationType: 'per_perimeter_cm', equationValue: 50, purchasePrice: 0.15, sellPrice: 0.25, applyScope: 'frame', colorAr: '', active: true },
                { id: 'acc-handle', code: 'HANDLE', nameAr: 'مقبض', equationType: 'per_leaf', equationValue: 1, purchasePrice: 18, sellPrice: 28, applyScope: 'sash', colorAr: 'أسود', active: true },
                { id: 'acc-hinge', code: 'HINGE', nameAr: 'مفصلة', equationType: 'per_leaf', equationValue: 2, purchasePrice: 12, sellPrice: 22, applyScope: 'sash', colorAr: '', familyOnly: 'hinged', active: true },
                { id: 'acc-roller', code: 'ROLLER', nameAr: 'بكرة سحاب', equationType: 'per_leaf', equationValue: 2, purchasePrice: 10, sellPrice: 16, applyScope: 'sash', colorAr: '', familyOnly: 'sliding', active: true },
                { id: 'acc-lock', code: 'LOCK', nameAr: 'قفل', equationType: 'per_unit', equationValue: 1, purchasePrice: 35, sellPrice: 55, applyScope: 'all', colorAr: '', active: true },
                { id: 'acc-rubber', code: 'RUBBER', nameAr: 'كاوتش (م)', equationType: 'per_meter', equationValue: 1, purchasePrice: 3, sellPrice: 5, applyScope: 'all', colorAr: '', active: true }
            ];
        }
        if (!aluGlass.length) {
            aluGlass = [
                { id: 'gl-6', nameAr: 'زجاج شفاف 6مم', thicknessMm: 6, pricePerM2: 45, active: true },
                { id: 'gl-8', nameAr: 'زجاج شفاف 8مم', thicknessMm: 8, pricePerM2: 58, active: true },
                { id: 'gl-d24', nameAr: 'دبل جلاص 24مم', thicknessMm: 24, pricePerM2: 95, active: true }
            ];
        }
        if (!aluWire.length) {
            aluWire = [
                { id: 'wr-fiber', nameAr: 'سلك فايبر', kind: 'fiber', sizeMm: 18, pricePerM2: 22, active: true },
                { id: 'wr-hard', nameAr: 'سلك ناشف', kind: 'hard', sizeMm: 16, pricePerM2: 28, active: true }
            ];
        }
        if (!aluColors.length) {
            aluColors = [
                { id: 'cl-silver', nameAr: 'فضي مؤكسد', surchargePerM2: 0, active: true },
                { id: 'cl-bronze', nameAr: 'برونز', surchargePerM2: 15, active: true },
                { id: 'cl-white', nameAr: 'أبيض كهرباء', surchargePerM2: 25, active: true }
            ];
        }
        /* توافق مع النسخة القديمة: تحويل قائمة قطاعات مسطحة إن وُجدت بلا أنظمة */
        if (!aluSystems.length && aluProfiles.length) {
            aluSystems = [{
                id: 'sys-legacy',
                nameAr: 'قطاعات مستوردة',
                family: 'hinged',
                cutAngle: 45,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: aluProfiles.map(function (p) {
                    return {
                        id: p.id,
                        role: p.role || 'frame',
                        nameAr: p.nameAr,
                        sku: p.sku,
                        thicknessMm: 45,
                        weightKgPerM: aluNum(p.weightKgPerM),
                        pricePerKg: aluNum(p.pricePerBar) && aluNum(p.stockBarMm) ? aluRound(aluNum(p.pricePerBar) / Math.max(0.1, aluNum(p.stockBarMm) / 1000 * Math.max(0.1, aluNum(p.weightKgPerM))), 2) : 18,
                        withPackage: false,
                        disableLastBarRemnant: p.role === 'sash',
                        active: p.active !== false
                    };
                }),
                active: true
            }];
        }
    }

    function hydrateAluminumCuttingLocal() {
        aluProfiles = loadLocal(ALU_PROFILES_KEY, []);
        aluSystems = loadLocal(ALU_SYSTEMS_KEY, []);
        aluEstimates = loadLocal(ALU_ESTIMATES_KEY, []);
        aluCutJobs = loadLocal(ALU_CUT_JOBS_KEY, []);
        aluAccessories = loadLocal(ALU_ACCESSORIES_KEY, []);
        aluGlass = loadLocal(ALU_GLASS_KEY, []);
        aluWire = loadLocal(ALU_WIRE_KEY, []);
        aluColors = loadLocal(ALU_COLORS_KEY, []);
        aluSettings = Object.assign({}, DEFAULT_SETTINGS, loadLocal(ALU_SETTINGS_KEY, {}) || {});
        seedDefaults();
        syncFlatProfilesFromSystems();
        aluDataReady = true;
    }

    function syncFlatProfilesFromSystems() {
        const flat = [];
        aluSystems.forEach(function (sys) {
            (sys.parts || []).forEach(function (p) {
                flat.push(Object.assign({}, p, {
                    systemId: sys.id,
                    systemName: sys.nameAr,
                    stockBarMm: aluSettings.stockBarMm,
                    pricePerBar: aluRound(aluNum(p.weightKgPerM) * (aluSettings.stockBarMm / 1000) * aluNum(p.pricePerKg), 2)
                }));
            });
        });
        aluProfiles = flat;
    }

    function persistAluminumCuttingLocal() {
        syncFlatProfilesFromSystems();
        saveLocal(ALU_PROFILES_KEY, aluProfiles);
        saveLocal(ALU_SYSTEMS_KEY, aluSystems);
        saveLocal(ALU_ESTIMATES_KEY, aluEstimates);
        saveLocal(ALU_CUT_JOBS_KEY, aluCutJobs);
        saveLocal(ALU_SETTINGS_KEY, aluSettings);
        saveLocal(ALU_ACCESSORIES_KEY, aluAccessories);
        saveLocal(ALU_GLASS_KEY, aluGlass);
        saveLocal(ALU_WIRE_KEY, aluWire);
        saveLocal(ALU_COLORS_KEY, aluColors);
    }

    async function persistAluminumCuttingCloud(keys) {
        persistAluminumCuttingLocal();
        keys = keys || [
            'aluminum_profiles', 'aluminum_systems', 'aluminum_estimates', 'aluminum_cut_jobs',
            'aluminum_cut_settings', 'aluminum_accessories', 'aluminum_glass', 'aluminum_wire', 'aluminum_colors'
        ];
        if (typeof persistNebrasCriticalStores === 'function') {
            try { return await persistNebrasCriticalStores(keys, { silent: true, showToast: false }); }
            catch (e) { console.warn('aluminum cloud persist', e); }
        }
        return false;
    }

    /* —— Cloud adapters —— */
    function getAluminumProfiles() { syncFlatProfilesFromSystems(); return aluProfiles; }
    function getAluminumSystems() { return aluSystems; }
    function getAluminumEstimates() { return aluEstimates; }
    function getAluminumCutJobs() { return aluCutJobs; }
    function getAluminumCutSettings() { return aluSettings; }
    function getAluminumAccessories() { return aluAccessories; }
    function getAluminumGlass() { return aluGlass; }
    function getAluminumWire() { return aluWire; }
    function getAluminumColors() { return aluColors; }

    function setAluminumProfilesFromCloud(v) { aluProfiles = Array.isArray(v) ? v : []; saveLocal(ALU_PROFILES_KEY, aluProfiles); }
    function setAluminumSystemsFromCloud(v) { aluSystems = Array.isArray(v) ? v : []; seedDefaults(); saveLocal(ALU_SYSTEMS_KEY, aluSystems); }
    function setAluminumEstimatesFromCloud(v) { aluEstimates = Array.isArray(v) ? v : []; saveLocal(ALU_ESTIMATES_KEY, aluEstimates); }
    function setAluminumCutJobsFromCloud(v) { aluCutJobs = Array.isArray(v) ? v : []; saveLocal(ALU_CUT_JOBS_KEY, aluCutJobs); }
    function setAluminumCutSettingsFromCloud(v) {
        aluSettings = Object.assign({}, DEFAULT_SETTINGS, (v && typeof v === 'object') ? v : {});
        saveLocal(ALU_SETTINGS_KEY, aluSettings);
    }
    function setAluminumAccessoriesFromCloud(v) { aluAccessories = Array.isArray(v) ? v : []; saveLocal(ALU_ACCESSORIES_KEY, aluAccessories); }
    function setAluminumGlassFromCloud(v) { aluGlass = Array.isArray(v) ? v : []; saveLocal(ALU_GLASS_KEY, aluGlass); }
    function setAluminumWireFromCloud(v) { aluWire = Array.isArray(v) ? v : []; saveLocal(ALU_WIRE_KEY, aluWire); }
    function setAluminumColorsFromCloud(v) { aluColors = Array.isArray(v) ? v : []; saveLocal(ALU_COLORS_KEY, aluColors); }

    function findSystem(id) {
        return aluSystems.find(function (s) { return s.id === id; }) || aluSystems[0] || null;
    }
    function partForRole(sys, role) {
        if (!sys) return null;
        return (sys.parts || []).find(function (p) { return p.active !== false && p.role === role; })
            || (sys.parts || []).find(function (p) { return p.active !== false; })
            || null;
    }
    function dOf(sys) {
        return Object.assign({}, DEFAULT_DEDUCTIONS, (sys && sys.deductions) || {});
    }

    /**
     * بناء قطع التقطيع من شكل جاهز + تخصيمات النظام
     * الأطوال بالمليمتر — أي خطأ هنا = هدر/خسارة مباشرة
     */
    function buildShapeCuts(item, itemIndex) {
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        const sys = findSystem(item.profileSystemId) || aluSystems.find(function (s) { return s.family === shape.family; }) || aluSystems[0];
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const angle = aluNum(sys && sys.cutAngle) || aluNum(d.cutAngle) || 45;
        const cuts = [];
        const idx = itemIndex + 1;

        function push(role, labelAr, lengthMm, pieceQty, axisTag) {
            const len = aluRound(Math.max(1, lengthMm), 1);
            if (len < 1) return;
            const part = partForRole(sys, role);
            cuts.push({
                profileId: part ? part.id : '',
                profileSku: part ? part.sku : role,
                profileName: part ? part.nameAr : (PART_ROLES[role] || role),
                role: role,
                labelAr: labelAr,
                code: (axisTag || 'P') + idx,
                lengthMm: len,
                qty: pieceQty * qty,
                angleL: angle,
                angleR: angle,
                openingLabel: item.labelAr || shape.nameAr,
                itemIndex: idx,
                disableLastBarRemnant: !!(part && part.disableLastBarRemnant),
                weightKgPerM: part ? aluNum(part.weightKgPerM) : 0,
                pricePerKg: part ? aluNum(part.pricePerKg) : 0,
                withPackage: !!(part && part.withPackage)
            });
        }

        /* حلق دائماً */
        push('frame', 'حلق أفقي', W, 2, 'W');
        push('frame', 'حلق رأسي', H, 2, 'H');

        if (shape.family === 'sliding') {
            const sashW = (W / leaves) + aluNum(d.sashOverlapMm) - aluNum(d.splitBetweenSashesMm);
            const sashH = H - aluNum(d.sashDeductH);
            push('mullion', 'مرد / عمود التقاء', H - aluNum(d.mullionDeductFull), Math.max(1, leaves - 1), 'H');
            push('sash', 'ضرفة — أفقي', sashW, leaves * 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, leaves * 2, 'H');
            if (sys && aluNum(sys.tracksCount) >= 1) {
                push('knife', 'سكينة', W, Math.max(1, aluNum(sys.tracksCount)), 'W');
            }
            if (!partForRole(sys, 'sash') || !(partForRole(sys, 'sash').withPackage)) {
                push('bead', 'باكيت', Math.max(1, sashW - 10), leaves * 2, 'W');
            }
        } else if (item.shape === 'fixed') {
            /* ثابت: حلق فقط + باكيت */
            push('bead', 'باكيت ثابت', Math.max(1, W - aluNum(d.glassFixedDeductW)), 2, 'W');
            push('bead', 'باكيت ثابت رأسي', Math.max(1, H - aluNum(d.glassFixedDeductH)), 2, 'H');
        } else {
            /* مفصلي / باب مفصلي */
            const sashW = W - aluNum(d.sashDeductW);
            const sashH = H - aluNum(d.sashDeductH) - (item.shape === 'door_hinged' ? aluNum(d.sashFromFloorMm) : 0);
            push('sash', 'ضرفة — أفقي', sashW, 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, 2, 'H');
            if (item.shape === 'door_hinged') {
                push('threshold', 'عتبة', W, 1, 'W');
            }
            const sashPart = partForRole(sys, 'sash');
            if (!sashPart || !sashPart.withPackage) {
                push('bead', 'باكيت', Math.max(1, sashW - 8), 2, 'W');
                push('bead', 'باكيت رأسي', Math.max(1, sashH - 8), 2, 'H');
            }
        }
        return cuts;
    }

    function buildItemGlass(item) {
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        const sys = findSystem(item.profileSystemId);
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const isFixed = item.shape === 'fixed';
        const dW = isFixed ? aluNum(d.glassFixedDeductW) : aluNum(d.glassSashDeductW);
        const dH = isFixed ? aluNum(d.glassFixedDeductH) : aluNum(d.glassSashDeductH);
        const gW = Math.max(0, aluRound((W - dW) / (shape.family === 'sliding' ? leaves : 1), 1));
        const gH = Math.max(0, aluRound(H - dH, 1));
        const panels = (shape.family === 'sliding' ? leaves : 1) * qty;
        const areaM2 = aluRound((gW / 1000) * (gH / 1000) * panels, 3);
        const gl = aluGlass.find(function (g) { return g.id === item.glassId; }) || aluGlass[0];
        return {
            widthMm: gW, heightMm: gH, panels: panels, areaM2: areaM2,
            thicknessMm: gl ? aluNum(gl.thicknessMm) : 6,
            pricePerM2: gl ? aluNum(gl.pricePerM2) : 45,
            nameAr: gl ? gl.nameAr : 'زجاج',
            openingLabel: item.labelAr || ''
        };
    }

    function buildItemWire(item) {
        if (!item.hasWire) return null;
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const sys = findSystem(item.profileSystemId);
        const d = dOf(sys);
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
    }

    function calcAccessoryQty(acc, item, shape) {
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const perimeterCm = 2 * (W + H) / 10;
        const perimeterM = 2 * (W + H) / 1000;
        const val = Math.max(0.001, aluNum(acc.equationValue) || 1);
        let q = 0;
        switch (acc.equationType) {
            case 'per_corner':
                /* زوايا: حلق 4 + كل ضرفة 4 */
                q = (4 + leaves * 4) * val * qty;
                break;
            case 'per_perimeter_cm':
                q = Math.ceil(perimeterCm / val) * qty;
                break;
            case 'per_meter':
                q = aluRound(perimeterM * val * qty, 2);
                break;
            case 'per_leaf':
                q = leaves * val * qty;
                break;
            case 'per_unit':
                q = val * qty;
                break;
            case 'fixed':
                q = val;
                break;
            default:
                q = val * qty;
        }
        return aluRound(q, 2);
    }

    function buildItemAccessories(item, priceMode) {
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        const mode = priceMode || aluSettings.priceModeDefault || 'purchase';
        return aluAccessories.filter(function (a) {
            if (a.active === false) return false;
            if (a.familyOnly && a.familyOnly !== shape.family) return false;
            return true;
        }).map(function (a) {
            const q = calcAccessoryQty(a, item, shape);
            const unit = mode === 'sell' ? aluNum(a.sellPrice) : aluNum(a.purchasePrice);
            return {
                id: a.id, code: a.code, nameAr: a.nameAr, colorAr: a.colorAr || '',
                qty: q, unitPrice: unit, total: aluRound(q * unit, 2)
            };
        }).filter(function (a) { return a.qty > 0; });
    }

    function billableAreaM2(Wmm, Hmm) {
        const w = Wmm / 1000;
        const h = Hmm / 1000;
        const mode = aluSettings.underMeterMode || 'round_to_meter';
        if (mode === 'as_is') return aluRound(w * h, 3);
        if (mode === 'each_side_to_meter') {
            const ww = w < 1 ? 1 : w;
            const hh = h < 1 ? 1 : h;
            return aluRound(ww * hh, 3);
        }
        /* round_to_meter: الناتج أقل من متر → متر */
        const area = w * h;
        return aluRound(area < 1 ? 1 : area, 3);
    }

    function computeEstimateTotals(est) {
        const items = est.items || est.openings || [];
        let allCuts = [];
        let accessories = [];
        let glassPanels = [];
        let wireRows = [];
        let glassCost = 0;
        let wireCost = 0;
        let colorCost = 0;
        let billableM2 = 0;

        items.forEach(function (item, i) {
            allCuts = allCuts.concat(buildShapeCuts(item, i));
            buildItemAccessories(item, est.priceMode).forEach(function (a) {
                const found = accessories.find(function (x) { return x.code === a.code && x.colorAr === a.colorAr; });
                if (found) {
                    found.qty = aluRound(found.qty + a.qty, 2);
                    found.total = aluRound(found.qty * found.unitPrice, 2);
                } else accessories.push(Object.assign({}, a));
            });
            const g = buildItemGlass(item);
            glassPanels.push(g);
            glassCost += g.areaM2 * g.pricePerM2;
            const wr = buildItemWire(item);
            if (wr) { wireRows.push(wr); wireCost += wr.total; }
            const color = aluColors.find(function (c) { return c.id === item.colorId; });
            const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
            const areaBill = billableAreaM2(item.widthMm, item.heightMm) * qty;
            billableM2 += areaBill;
            if (color) colorCost += areaBill * aluNum(color.surchargePerM2);
        });

        const weightAdj = 1 + (aluNum(est.weightAdjustPct) / 100);
        const byProfile = {};
        allCuts.forEach(function (c) {
            if (c.withPackage && c.role === 'bead') return;
            const key = c.profileId || c.role;
            if (!byProfile[key]) {
                byProfile[key] = {
                    profileId: c.profileId, profileSku: c.profileSku, profileName: c.profileName,
                    role: c.role, totalLengthMm: 0, pieces: 0, cuts: [],
                    weightKgPerM: c.weightKgPerM, pricePerKg: c.pricePerKg,
                    disableLastBarRemnant: c.disableLastBarRemnant
                };
            }
            byProfile[key].totalLengthMm += c.lengthMm * c.qty;
            byProfile[key].pieces += c.qty;
            byProfile[key].cuts.push(c);
            if (c.disableLastBarRemnant) byProfile[key].disableLastBarRemnant = true;
        });

        const stock = aluNum(est.stockBarMm) || aluNum(aluSettings.stockBarMm) || 6500;
        const kerf = aluNum(est.kerfMm != null ? est.kerfMm : aluSettings.kerfMm) || 10;
        let profilesCost = 0;
        Object.keys(byProfile).forEach(function (k) {
            const row = byProfile[k];
            const need = row.totalLengthMm + Math.max(0, row.pieces - 1) * kerf;
            row.barsEst = Math.max(1, Math.ceil(need / Math.max(1, stock)));
            const kg = aluRound((row.totalLengthMm / 1000) * row.weightKgPerM * weightAdj, 3);
            row.weightKg = kg;
            row.costEst = aluRound(kg * row.pricePerKg, 2);
            profilesCost += row.costEst;
        });

        const accCost = accessories.reduce(function (s, a) { return s + a.total; }, 0);
        const units = items.reduce(function (s, o) { return s + Math.max(1, Math.round(aluNum(o.qty) || 1)); }, 0);
        const laborCost = aluRound(units * (aluNum(est.laborPerUnit) || aluNum(aluSettings.laborPerUnit) || 80), 2);
        const subtotal = aluRound(profilesCost + accCost + glassCost + wireCost + colorCost + laborCost, 2);
        const vat = aluRound(subtotal * 0.15, 2);

        return {
            cuts: allCuts,
            byProfile: byProfile,
            accessories: accessories,
            glassPanels: glassPanels,
            wireRows: wireRows,
            glassAreaM2: aluRound(glassPanels.reduce(function (s, g) { return s + g.areaM2; }, 0), 3),
            glassCost: aluRound(glassCost, 2),
            wireCost: aluRound(wireCost, 2),
            colorCost: aluRound(colorCost, 2),
            billableM2: aluRound(billableM2, 3),
            barsEstimate: Object.keys(byProfile).reduce(function (s, k) { return s + byProfile[k].barsEst; }, 0),
            profilesCost: aluRound(profilesCost, 2),
            accessoriesCost: aluRound(accCost, 2),
            laborCost: laborCost,
            units: units,
            subtotal: subtotal,
            vat: vat,
            total: aluRound(subtotal + vat, 2),
            stockBarMm: stock,
            kerfMm: kerf,
            weightAdjustPct: aluNum(est.weightAdjustPct)
        };
    }

    /* —— Cutting optimizer —— */
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
                if (mode === 'first') { bestIdx = i; break; }
                if (remain < bestRemain) { bestRemain = remain; bestIdx = i; }
            }
            if (bestIdx < 0) {
                bars.push({ index: bars.length + 1, stockMm: stockLen, usedMm: 0, remain: stockLen, pieces: [], kerfTotal: 0 });
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

    function signatureOfBar(bar) {
        return bar.pieces.map(function (p) {
            return p.code + ':' + p.lengthMm + ':' + p.labelAr;
        }).join('|');
    }

    function groupIdenticalBars(bars) {
        const map = {};
        bars.forEach(function (b) {
            const sig = signatureOfBar(b);
            if (!map[sig]) map[sig] = { sample: b, count: 0, indices: [] };
            map[sig].count += 1;
            map[sig].indices.push(b.index);
        });
        return Object.keys(map).map(function (sig) {
            const g = map[sig];
            return {
                sample: g.sample,
                count: g.count,
                indices: g.indices,
                usedMm: g.sample.usedMm,
                remain: g.sample.remain,
                wastePct: g.sample.stockMm > 0 ? aluRound((Math.max(0, g.sample.remain) / g.sample.stockMm) * 100, 2) : 0
            };
        });
    }

    function optimizeProfileCuts(cutRows, stockLen, kerf) {
        const expanded = [];
        cutRows.forEach(function (c) {
            const q = Math.max(1, Math.round(aluNum(c.qty) || 1));
            for (let i = 0; i < q; i++) {
                expanded.push({
                    lengthMm: aluNum(c.lengthMm),
                    labelAr: c.labelAr,
                    code: c.code || '',
                    angleL: c.angleL,
                    angleR: c.angleR,
                    openingLabel: c.openingLabel,
                    seq: i + 1
                });
            }
        });
        expanded.sort(function (a, b) { return b.lengthMm - a.lengthMm; });
        const stock = Math.max(100, aluNum(stockLen) || 6500);
        const k = Math.max(0, aluNum(kerf) || 0);
        const bfd = packBarsOnePass(expanded, stock, k, 'best');
        const ffd = packBarsOnePass(expanded.slice(), stock, k, 'first');

        function score(bars) {
            const remnantMin = aluNum(aluSettings.remnantMinMm) || 200;
            let scrapMm = 0;
            let usableRemnantMm = 0;
            bars.forEach(function (b) {
                const r = Math.max(0, b.remain);
                if (r < remnantMin) scrapMm += r;
                else usableRemnantMm += r;
            });
            const waste = scrapMm + usableRemnantMm;
            const used = bars.reduce(function (s, b) { return s + b.usedMm; }, 0);
            const total = bars.length * stock;
            return {
                bars: bars,
                groups: groupIdenticalBars(bars),
                barCount: bars.length,
                wasteMm: aluRound(waste, 1),
                scrapMm: aluRound(scrapMm, 1),
                usableRemnantMm: aluRound(usableRemnantMm, 1),
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

    /**
     * حساب كمية الشراء مع خيار «آخر عود فاضل» (فيديو 04/08)
     * إذا المستخدم من آخر عود ≤ العتبة → شراء (المستخدم + أمان) بالمتر بدل عود كامل
     */
    function purchaseQtyForPlan(plan, stockMm, disableLastBar) {
        const barCount = plan.barCount;
        if (!aluSettings.lastBarRemnantEnabled || disableLastBar || barCount < 1) {
            return { fullBars: barCount, remnantMeters: 0, buyLabel: barCount + ' عود', costBarsEquivalent: barCount };
        }
        const last = plan.bars[plan.bars.length - 1];
        const threshold = aluNum(aluSettings.lastBarThresholdMm) || 4500;
        const safety = aluNum(aluSettings.lastBarSafetyMm) || 50;
        if (last.usedMm <= threshold) {
            const meters = aluRound((last.usedMm + safety) / 1000, 3);
            const fullBars = Math.max(0, barCount - 1);
            return {
                fullBars: fullBars,
                remnantMeters: meters,
                buyLabel: fullBars + ' عود + ' + meters + ' م',
                costBarsEquivalent: fullBars + (meters * 1000 / stockMm)
            };
        }
        return { fullBars: barCount, remnantMeters: 0, buyLabel: barCount + ' عود', costBarsEquivalent: barCount };
    }

    function runFullCuttingPlan(cuts, opts) {
        opts = opts || {};
        const stock = aluNum(opts.stockBarMm) || aluNum(aluSettings.stockBarMm) || 6500;
        const kerf = aluNum(opts.kerfMm != null ? opts.kerfMm : aluSettings.kerfMm) || 10;
        const weightAdj = 1 + (aluNum(opts.weightAdjustPct) / 100);
        const groups = {};
        (cuts || []).forEach(function (c) {
            if (c.withPackage && c.role === 'bead') return;
            const key = c.profileId || c.role || 'custom';
            if (!groups[key]) groups[key] = [];
            groups[key].push(c);
        });
        const plans = [];
        let totalBars = 0;
        let totalWaste = 0;
        let totalStock = 0;
        let totalCost = 0;
        let totalScrapKg = 0;
        let totalPieces = 0;

        Object.keys(groups).forEach(function (key) {
            const rows = groups[key];
            const sample = rows[0];
            const plan = optimizeProfileCuts(rows, stock, kerf);
            const disableLast = rows.some(function (r) { return r.disableLastBarRemnant; });
            const purchase = purchaseQtyForPlan(plan, stock, disableLast);
            const weightKgPerM = aluNum(sample.weightKgPerM);
            const pricePerKg = aluNum(sample.pricePerKg);
            const usedLenM = plan.usedMm / 1000;
            const scrapKg = aluRound((plan.scrapMm / 1000) * weightKgPerM * weightAdj, 3);
            const buyKg = aluRound((purchase.costBarsEquivalent * stock / 1000) * weightKgPerM * weightAdj, 3);
            const cost = aluRound(buyKg * pricePerKg, 2);
            totalPieces += rows.reduce(function (s, r) { return s + r.qty; }, 0);
            plans.push({
                profileId: sample.profileId,
                profileSku: sample.profileSku,
                profileName: sample.profileName,
                role: sample.role,
                stockMm: stock,
                pricePerKg: pricePerKg,
                weightKgPerM: weightKgPerM,
                cost: cost,
                buyKg: buyKg,
                scrapKg: scrapKg,
                purchase: purchase,
                disableLastBarRemnant: disableLast,
                plan: plan
            });
            totalBars += plan.barCount;
            totalWaste += plan.wasteMm;
            totalStock += plan.totalMm;
            totalCost += cost;
            totalScrapKg += scrapKg;
        });

        const scrapCredit = aluRound(totalScrapKg * aluNum(aluSettings.scrapPricePerKg), 2);
        return {
            plans: plans,
            totalBars: totalBars,
            totalPieces: totalPieces,
            totalWasteMm: aluRound(totalWaste, 1),
            wastePct: totalStock > 0 ? aluRound((totalWaste / totalStock) * 100, 2) : 0,
            yieldPct: totalStock > 0 ? aluRound(((totalStock - totalWaste) / totalStock) * 100, 2) : 0,
            profilesCost: aluRound(totalCost, 2),
            scrapKg: aluRound(totalScrapKg, 3),
            scrapCredit: scrapCredit,
            kerfMm: kerf,
            stockBarMm: stock,
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
            priceMode: aluSettings.priceModeDefault || 'purchase',
            stockBarMm: aluSettings.stockBarMm,
            kerfMm: aluSettings.kerfMm,
            weightAdjustPct: 0,
            laborPerUnit: aluSettings.laborPerUnit || 80,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /* —— UI —— */
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

    function setAluTab(tab) {
        aluActiveTab = tab || 'dashboard';
        renderAluminumCuttingPanel();
    }

    function renderAluminumCuttingPanel() {
        const host = document.getElementById('aluminum-cutting-body');
        if (!host) return;
        seedDefaults();
        const tabs = [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة' },
            { id: 'estimates', icon: 'fas fa-folder-open', label: 'مقايسات' },
            { id: 'estimate', icon: 'fas fa-ruler-combined', label: 'بند/مقايسة' },
            { id: 'systems', icon: 'fas fa-bars-staggered', label: 'قطاعات' },
            { id: 'deductions', icon: 'fas fa-sliders', label: 'تخصيمات' },
            { id: 'accessories', icon: 'fas fa-puzzle-piece', label: 'إكسسوارات' },
            { id: 'materials', icon: 'fas fa-layer-group', label: 'زجاج/سلك/ألوان' },
            { id: 'cutting', icon: 'fas fa-scissors', label: 'تقطيع' },
            { id: 'reports', icon: 'fas fa-file-lines', label: 'تقارير' },
            { id: 'settings', icon: 'fas fa-gears', label: 'إعدادات' }
        ];
        const nav = '<div class="alu-cut-tabs" role="tablist">' + tabs.map(function (t) {
            return '<button type="button" class="alu-cut-tab' + (aluActiveTab === t.id ? ' is-active' : '') +
                '" onclick="setAluCutTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + t.label + '</button>';
        }).join('') + '</div>';

        let body = '';
        if (aluActiveTab === 'dashboard') body = renderAluDashboard();
        else if (aluActiveTab === 'estimates') body = renderAluEstimatesList();
        else if (aluActiveTab === 'estimate') body = renderAluEstimateEditor();
        else if (aluActiveTab === 'systems') body = renderAluSystems();
        else if (aluActiveTab === 'deductions') body = renderAluDeductions();
        else if (aluActiveTab === 'accessories') body = renderAluAccessories();
        else if (aluActiveTab === 'materials') body = renderAluMaterials();
        else if (aluActiveTab === 'cutting') body = renderAluCutting();
        else if (aluActiveTab === 'reports') body = renderAluReports();
        else if (aluActiveTab === 'settings') body = renderAluSettings();

        host.innerHTML = nav + '<div class="alu-cut-panel">' + body + '</div>';
    }

    function renderAluDashboard() {
        const lastJob = aluCutJobs[aluCutJobs.length - 1];
        return '<div class="alu-cut-hero"><div class="alu-cut-hero-glow"></div><div class="alu-cut-hero-inner">' +
            '<p class="alu-cut-kicker">نبراس · وفق معايير برامج التخصيم الاحترافية</p>' +
            '<h3>تخصيم قطاعات الألومنيوم</h3>' +
            '<p>تخصيمات قابلة للضبط · معادلات إكسسوارات · تقطيع يستغل كل مليمتر · طلبية مشتريات (أعواد + آخر عود فاضل) · تجميع وتكلفة.</p>' +
            '<div class="alu-cut-hero-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newAluEstimate();setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'estimates\')"><i class="fas fa-folder-open"></i> عرض المقايسات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'cutting\')"><i class="fas fa-scissors"></i> كاتنج ليست</button>' +
            '</div></div></div>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + aluSystems.length + '</strong><span>أنظمة قطاعات</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluEstimates.length + '</strong><span>مقايسات</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluAccessories.length + '</strong><span>إكسسوارات</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + (lastJob ? lastJob.wastePct + '%' : '—') + '</strong><span>آخر هدر</span></div>' +
            '</div>' +
            '<p class="alu-cut-note"><i class="fas fa-info-circle"></i> العود الافتراضي ' + aluSettings.stockBarMm +
            ' مم · منشار ' + aluSettings.kerfMm + ' مم · أقل فاضلة ' + aluSettings.remnantMinMm +
            ' مم · آخر عود فاضل ' + (aluSettings.lastBarRemnantEnabled ? 'مفعّل' : 'موقوف') + '.</p>';
    }

    function renderAluEstimatesList() {
        const cards = aluEstimates.slice().reverse().map(function (e) {
            const t = e.totalsSnapshot || {};
            return '<article class="alu-est-card">' +
                '<div><strong>' + aluEsc(e.ref) + '</strong>' +
                '<small>' + aluEsc(e.customerName || '—') + ' · ' + aluEsc(e.projectName || '—') + '</small>' +
                '<small>' + aluEsc((e.updatedAt || e.createdAt || '').slice(0, 10)) +
                (t.total != null ? ' · ' + t.total + ' ' + aluSettings.currencyLabel : '') + '</small></div>' +
                '<div class="alu-row-actions">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + aluEsc(e.id) + '\')">فتح</button>' +
                '<button type="button" class="erp-tag" onclick="copyAluEstimate(\'' + aluEsc(e.id) + '\')">نسخ</button>' +
                '<button type="button" class="erp-tag" onclick="deleteAluEstimate(\'' + aluEsc(e.id) + '\')">حذف</button>' +
                '</div></article>';
        }).join('') || '<p class="erp-empty">لا مقايسات بعد — أنشئ الأولى.</p>';

        const customers = {};
        aluEstimates.forEach(function (e) { if (e.customerName) customers[e.customerName] = 1; });
        return '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + aluEstimates.length + '</strong><span>مقايسات</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + Object.keys(customers).length + '</strong><span>عملاء</span></div>' +
            '</div>' +
            '<div class="erp-form-actions" style="margin-bottom:0.8rem">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newAluEstimate();setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '</div><div class="alu-est-grid">' + cards + '</div>';
    }

    function renderAluEstimateEditor() {
        if (!aluEstimateDraft) aluEstimateDraft = newEstimateDraft();
        const d = aluEstimateDraft;
        /* توافق openings القديمة */
        if ((!d.items || !d.items.length) && d.openings && d.openings.length) {
            d.items = d.openings.map(function (op) {
                return {
                    id: op.id || aluId('op'),
                    shape: op.system || 'sliding2',
                    widthMm: op.widthMm,
                    heightMm: op.heightMm,
                    qty: op.qty,
                    labelAr: op.labelAr,
                    glassId: (aluGlass[0] || {}).id,
                    handleHeightMm: 50,
                    hasWire: false,
                    wireFixed: 'none',
                    profileSystemId: (aluSystems[0] || {}).id
                };
            });
        }
        const shapeOpts = Object.keys(READY_SHAPES).map(function (k) {
            return '<option value="' + k + '">' + aluEsc(READY_SHAPES[k].nameAr) + '</option>';
        }).join('');
        const sysOpts = aluSystems.map(function (s) {
            return '<option value="' + aluEsc(s.id) + '">' + aluEsc(s.nameAr) + '</option>';
        }).join('');
        const glassOpts = aluGlass.map(function (g) {
            return '<option value="' + aluEsc(g.id) + '">' + aluEsc(g.nameAr) + '</option>';
        }).join('');
        const colorOpts = '<option value="">—</option>' + aluColors.map(function (c) {
            return '<option value="' + aluEsc(c.id) + '">' + aluEsc(c.nameAr) + '</option>';
        }).join('');
        const wireOpts = '<option value="">—</option>' + aluWire.map(function (w) {
            return '<option value="' + aluEsc(w.id) + '">' + aluEsc(w.nameAr) + '</option>';
        }).join('');

        const itemsHtml = (d.items || []).map(function (it, i) {
            const sh = READY_SHAPES[it.shape] || {};
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + aluEsc(it.labelAr || sh.nameAr || 'بند') + '</strong>' +
                '<small>' + aluEsc(sh.nameAr || '') + ' — ' + aluNum(it.widthMm) + '×' + aluNum(it.heightMm) +
                ' مم × ' + aluNum(it.qty) +
                (aluSettings.showHandleHeight && it.handleHeightMm ? ' · مقبض ' + aluNum(it.handleHeightMm) + ' مم' : '') +
                (it.locationCode ? ' · موقع ' + aluEsc(it.locationCode) : '') +
                '</small></div>' +
                '<button type="button" class="erp-row-del" onclick="removeAluItem(' + i + ')" aria-label="حذف"><i class="fas fa-trash"></i></button></article>';
        }).join('') || '<p class="erp-empty">أضف بنوداً من الأشكال الجاهزة.</p>';

        const totals = computeEstimateTotals(d);
        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-ruler-combined"></i> مقايسة — إضافة بنود</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>مرجع</span><input type="text" id="alu-est-ref" value="' + aluEsc(d.ref) + '"></label>' +
            '<label class="nebras-field"><span>العميل</span><input type="text" id="alu-est-customer" value="' + aluEsc(d.customerName) + '"></label>' +
            '<label class="nebras-field"><span>المشروع</span><input type="text" id="alu-est-project" value="' + aluEsc(d.projectName) + '"></label>' +
            '<label class="nebras-field"><span>سعر إكسسوار</span><select id="alu-est-pricemode">' +
            '<option value="purchase"' + (d.priceMode !== 'sell' ? ' selected' : '') + '>شراء</option>' +
            '<option value="sell"' + (d.priceMode === 'sell' ? ' selected' : '') + '>بيع</option></select></label>' +
            '<label class="nebras-field"><span>عود مم</span><input type="number" id="alu-est-stock" value="' + aluNum(d.stockBarMm || aluSettings.stockBarMm) + '"></label>' +
            '<label class="nebras-field"><span>منشار مم</span><input type="number" id="alu-est-kerf" value="' + aluNum(d.kerfMm != null ? d.kerfMm : aluSettings.kerfMm) + '" step="0.1"></label>' +
            '<label class="nebras-field"><span>تعديل وزن %</span><input type="number" id="alu-est-wadj" value="' + aluNum(d.weightAdjustPct) + '" step="1" placeholder="-10 أخف"></label>' +
            '<label class="nebras-field"><span>أجور / وحدة</span><input type="number" id="alu-est-labor" value="' + aluNum(d.laborPerUnit) + '"></label>' +
            '</div>' +
            '<div class="alu-cut-subcard"><h5>إضافة بند من الأشكال الجاهزة</h5>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الشكل</span><select id="alu-op-shape">' + shapeOpts + '</select></label>' +
            '<label class="nebras-field"><span>نظام القطاع</span><select id="alu-op-sys">' + sysOpts + '</select></label>' +
            '<label class="nebras-field"><span>العرض مم</span><input type="number" id="alu-op-w" min="200" placeholder="1200"></label>' +
            '<label class="nebras-field"><span>الارتفاع مم</span><input type="number" id="alu-op-h" min="200" placeholder="1400"></label>' +
            '<label class="nebras-field"><span>الكمية</span><input type="number" id="alu-op-qty" min="1" value="1"></label>' +
            '<label class="nebras-field"><span>وصف / موقع</span><input type="text" id="alu-op-label" placeholder="شباك غرفة 1"></label>' +
            '<label class="nebras-field"><span>كود موقع</span><input type="text" id="alu-op-loc" placeholder="A-01"></label>' +
            '<label class="nebras-field"><span>ارتفاع مقبض مم</span><input type="number" id="alu-op-handle" value="50"></label>' +
            '<label class="nebras-field"><span>زجاج</span><select id="alu-op-glass">' + glassOpts + '</select></label>' +
            '<label class="nebras-field"><span>لون</span><select id="alu-op-color">' + colorOpts + '</select></label>' +
            '<label class="nebras-field"><span>سلك</span><select id="alu-op-wire">' + wireOpts + '</select></label>' +
            '<label class="nebras-field"><span>مع سلك؟</span><select id="alu-op-haswire"><option value="0">لا</option><option value="1">نعم</option></select></label>' +
            '<label class="nebras-field"><span>سلك ثابت</span><select id="alu-op-wirefix"><option value="none">متحرك</option><option value="top">فوق</option><option value="bottom">تحت</option><option value="both">فوق وتحت</option></select></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluItem()"><i class="fas fa-plus"></i> إضافة البند</button>' +
            '</div>' +
            '<div class="nebras-erp-list">' + itemsHtml + '</div>' +
            '<div class="alu-cut-totals">' +
            '<div><span>أعواد (تقدير)</span><strong>' + totals.barsEstimate + '</strong></div>' +
            '<div><span>قطاعات</span><strong>' + totals.profilesCost + '</strong></div>' +
            '<div><span>إكسسوارات</span><strong>' + totals.accessoriesCost + '</strong></div>' +
            '<div><span>زجاج م²</span><strong>' + totals.glassAreaM2 + '</strong></div>' +
            '<div><span>سلك</span><strong>' + totals.wireCost + '</strong></div>' +
            '<div class="alu-cut-totals-grand"><span>شامل الضريبة</span><strong>' + totals.total + ' ' + aluSettings.currencyLabel + '</strong></div>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluEstimate()"><i class="fas fa-save"></i> حفظ</button>' +
            '<button type="button" class="nebras-users-btn" onclick="sendAluEstimateToCutting()"><i class="fas fa-scissors"></i> إرسال للتقطيع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluEstimateReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'estimates\')">قائمة المقايسات</button>' +
            '</div></div>';
    }

    function syncEstimateDraftFields() {
        if (!aluEstimateDraft) return;
        aluEstimateDraft.ref = aluField('alu-est-ref') || aluEstimateDraft.ref;
        aluEstimateDraft.customerName = aluField('alu-est-customer');
        aluEstimateDraft.projectName = aluField('alu-est-project');
        aluEstimateDraft.priceMode = aluField('alu-est-pricemode') || 'purchase';
        aluEstimateDraft.stockBarMm = aluNum(aluField('alu-est-stock')) || aluSettings.stockBarMm;
        aluEstimateDraft.kerfMm = aluNum(aluField('alu-est-kerf'));
        aluEstimateDraft.weightAdjustPct = aluNum(aluField('alu-est-wadj'));
        aluEstimateDraft.laborPerUnit = aluNum(aluField('alu-est-labor')) || 80;
        aluEstimateDraft.updatedAt = new Date().toISOString();
    }

    function addAluItem() {
        if (!aluEstimateDraft) aluEstimateDraft = newEstimateDraft();
        syncEstimateDraftFields();
        const W = aluNum(aluField('alu-op-w'));
        const H = aluNum(aluField('alu-op-h'));
        if (W < 200 || H < 200) { alert('أدخل عرض وارتفاع صحيحين (مم).'); return; }
        const shape = aluField('alu-op-shape') || 'sliding2';
        aluEstimateDraft.items = aluEstimateDraft.items || [];
        aluEstimateDraft.items.push({
            id: aluId('op'),
            shape: shape,
            profileSystemId: aluField('alu-op-sys') || (aluSystems[0] || {}).id,
            widthMm: W,
            heightMm: H,
            qty: Math.max(1, Math.round(aluNum(aluField('alu-op-qty')) || 1)),
            labelAr: aluField('alu-op-label') || (READY_SHAPES[shape] || {}).nameAr || 'بند',
            locationCode: aluField('alu-op-loc'),
            handleHeightMm: aluNum(aluField('alu-op-handle')) || 50,
            glassId: aluField('alu-op-glass'),
            colorId: aluField('alu-op-color'),
            wireId: aluField('alu-op-wire'),
            hasWire: aluField('alu-op-haswire') === '1',
            wireFixed: aluField('alu-op-wirefix') || 'none'
        });
        renderAluminumCuttingPanel();
    }

    function removeAluItem(i) {
        if (!aluEstimateDraft || !aluEstimateDraft.items) return;
        aluEstimateDraft.items.splice(i, 1);
        renderAluminumCuttingPanel();
    }

    function newAluEstimate() {
        aluEstimateDraft = newEstimateDraft();
        renderAluminumCuttingPanel();
    }

    function saveAluEstimate() {
        if (!requireAluAccess() || !aluEstimateDraft) return;
        syncEstimateDraftFields();
        if (!(aluEstimateDraft.items || []).length) { alert('أضف بنداً واحداً على الأقل.'); return; }
        const totals = computeEstimateTotals(aluEstimateDraft);
        aluEstimateDraft.totalsSnapshot = { barsEstimate: totals.barsEstimate, subtotal: totals.subtotal, total: totals.total, glassAreaM2: totals.glassAreaM2 };
        const copy = JSON.parse(JSON.stringify(aluEstimateDraft));
        const idx = aluEstimates.findIndex(function (e) { return e.id === copy.id; });
        if (idx >= 0) aluEstimates[idx] = copy; else aluEstimates.push(copy);
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

    function copyAluEstimate(id) {
        const e = aluEstimates.find(function (x) { return x.id === id; });
        if (!e) return;
        const copy = JSON.parse(JSON.stringify(e));
        copy.id = aluId('est');
        copy.ref = e.ref + '-نسخ';
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        aluEstimates.push(copy);
        persistAluminumCuttingCloud(['aluminum_estimates']);
        loadAluEstimate(copy.id);
    }

    function deleteAluEstimate(id) {
        if (!confirm('حذف المقايسة؟')) return;
        aluEstimates = aluEstimates.filter(function (e) { return e.id !== id; });
        persistAluminumCuttingCloud(['aluminum_estimates']);
        renderAluminumCuttingPanel();
    }

    function sendAluEstimateToCutting() {
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        if (!(aluEstimateDraft.items || []).length) { alert('أضف بنوداً أولاً.'); return; }
        const totals = computeEstimateTotals(aluEstimateDraft);
        aluCutDraft = {
            estimateId: aluEstimateDraft.id,
            estimateRef: aluEstimateDraft.ref,
            customerName: aluEstimateDraft.customerName,
            stockBarMm: totals.stockBarMm,
            kerfMm: totals.kerfMm,
            weightAdjustPct: totals.weightAdjustPct,
            cuts: totals.cuts,
            accessories: totals.accessories,
            glassPanels: totals.glassPanels,
            wireRows: totals.wireRows,
            laborCost: totals.laborCost,
            accessoriesCost: totals.accessoriesCost,
            glassCost: totals.glassCost,
            wireCost: totals.wireCost,
            colorCost: totals.colorCost,
            estimate: aluEstimateDraft
        };
        setAluTab('cutting');
    }

    function renderAluCutting() {
        if (!aluCutDraft && aluEstimateDraft && (aluEstimateDraft.items || []).length) {
            sendAluEstimateToCutting();
            return;
        }
        if (!aluCutDraft) {
            return '<p class="erp-empty">لا قطع جاهزة — افتح مقايسة ثم «إرسال للتقطيع».</p>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'estimates\')">المقايسات</button>';
        }
        const result = runFullCuttingPlan(aluCutDraft.cuts, {
            stockBarMm: aluCutDraft.stockBarMm,
            kerfMm: aluCutDraft.kerfMm,
            weightAdjustPct: aluCutDraft.weightAdjustPct
        });
        aluCutDraft.lastResult = result;

        const plansHtml = result.plans.map(function (pl) {
            const groupsHtml = pl.plan.groups.map(function (g) {
                const segs = g.sample.pieces.map(function (p) {
                    const pct = Math.max(2, (p.lengthMm / pl.stockMm) * 100);
                    return '<span class="alu-bar-seg" style="flex:' + pct + '" title="' + aluEsc(p.code + ' ' + p.labelAr + ' ' + p.lengthMm + 'مم') + '">' +
                        aluEsc(p.code) + ' ' + p.lengthMm + '</span>';
                }).join('');
                const wastePct = Math.max(0, (g.remain / pl.stockMm) * 100);
                return '<div class="alu-bar-row">' +
                    '<div class="alu-bar-meta"><strong>× ' + g.count + ' عود متطابق</strong>' +
                    '<small>استخدام ' + g.usedMm + ' · متبقي ' + g.remain + ' · هدر ' + g.wastePct + '%</small></div>' +
                    '<div class="alu-bar-track">' + segs +
                    (g.remain > 0 ? '<span class="alu-bar-waste" style="flex:' + wastePct + '">' + g.remain + '</span>' : '') +
                    '</div></div>';
            }).join('');
            return '<section class="alu-cut-plan-block">' +
                '<header><h4>' + aluEsc(pl.profileName) + ' <small>' + aluEsc(pl.profileSku) + '</small></h4>' +
                '<p>' + pl.plan.barCount + ' عود × ' + pl.stockMm + ' مم · هدر ' + pl.plan.wastePct +
                '% · شراء: ' + aluEsc(pl.purchase.buyLabel) +
                (pl.disableLastBarRemnant ? ' (آخر عود فاضل موقف لهذا القطاع)' : '') +
                ' · تكلفة ' + pl.cost + ' · ' + aluEsc(pl.plan.algorithm) + '</p></header>' +
                groupsHtml + '</section>';
        }).join('');

        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-scissors"></i> تقرير تقطيع — كاتنج ليست</h4>' +
            '<p class="alu-cut-note">' + aluEsc(aluCutDraft.estimateRef || '') + ' · ' + aluEsc(aluCutDraft.customerName || '') +
            ' · عود ' + result.stockBarMm + ' مم · منشار ' + result.kerfMm + ' مم</p>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + result.totalPieces + '</strong><span>قطع</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.totalBars + '</strong><span>أعواد</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + result.wastePct + '%</strong><span>هدر</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.scrapKg + '</strong><span>كغ سكراب</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.profilesCost + '</strong><span>تكلفة شراء</span></div>' +
            '</div>' + plansHtml +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluCutJob()"><i class="fas fa-save"></i> حفظ الخطة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluCutReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'reports\')">تقارير المشتريات</button>' +
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
            wastePct: aluCutDraft.lastResult.wastePct,
            totalBars: aluCutDraft.lastResult.totalBars,
            createdAt: new Date().toISOString()
        };
        aluCutJobs.push(job);
        persistAluminumCuttingCloud(['aluminum_cut_jobs']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ خطة التقطيع', 'ok');
        renderAluminumCuttingPanel();
    }

    function renderAluSystems() {
        const list = aluSystems.map(function (sys, si) {
            const parts = (sys.parts || []).map(function (p) {
                return '<li><strong>' + aluEsc(PART_ROLES[p.role] || p.role) + '</strong> — ' +
                    aluEsc(p.nameAr) + ' (' + aluEsc(p.sku) + ') · ' + aluNum(p.weightKgPerM) + ' كغ/م · ' +
                    aluNum(p.pricePerKg) + '/كغ' +
                    (p.withPackage ? ' · بباكيته' : '') +
                    (p.disableLastBarRemnant ? ' · بدون آخر عود فاضل' : '') +
                    '</li>';
            }).join('');
            return '<article class="alu-cut-form-card"><h4>' + aluEsc(sys.nameAr) +
                ' <small>' + (sys.family === 'sliding' ? 'سحاب' : 'مفصلي') +
                (sys.tracksCount ? ' · تراكات ' + sys.tracksCount : '') +
                ' · زاوية ' + (sys.cutAngle || 45) + '°</small></h4>' +
                '<ul class="alu-parts-list">' + parts + '</ul>' +
                '<button type="button" class="nebras-users-btn" onclick="editAluSystemDeducts(\'' + aluEsc(sys.id) + '\')">تعديل التخصيمات</button>' +
                '</article>';
        }).join('');

        return '<p class="alu-cut-note">أضف/عدّل أنظمة القطاعات (مفصلي · سحاب) مع الحلوق والضرف والباكيت والمرد والسكينة — كما في إعدادات القطاعات بالبرامج الاحترافية.</p>' +
            list +
            '<div class="alu-cut-form-card"><h4>إضافة نظام قطاع</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الاسم</span><input type="text" id="alu-sys-name" placeholder="سوناتا 45"></label>' +
            '<label class="nebras-field"><span>العائلة</span><select id="alu-sys-family"><option value="hinged">مفصلي</option><option value="sliding">سحاب</option></select></label>' +
            '<label class="nebras-field"><span>زاوية قص</span><select id="alu-sys-angle"><option value="45">45</option><option value="90">90</option></select></label>' +
            '<label class="nebras-field"><span>عدد التراكات</span><input type="number" id="alu-sys-tracks" value="0" min="0"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluSystem()">حفظ النظام</button></div>' +
            '<div class="alu-cut-form-card"><h4>إضافة جزء لنظام</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>النظام</span><select id="alu-part-sys">' +
            aluSystems.map(function (s) { return '<option value="' + aluEsc(s.id) + '">' + aluEsc(s.nameAr) + '</option>'; }).join('') +
            '</select></label>' +
            '<label class="nebras-field"><span>النوع</span><select id="alu-part-role">' +
            Object.keys(PART_ROLES).map(function (r) { return '<option value="' + r + '">' + PART_ROLES[r] + '</option>'; }).join('') +
            '</select></label>' +
            '<label class="nebras-field"><span>الاسم</span><input type="text" id="alu-part-name"></label>' +
            '<label class="nebras-field"><span>SKU</span><input type="text" id="alu-part-sku"></label>' +
            '<label class="nebras-field"><span>تخانة مم</span><input type="number" id="alu-part-th" value="45"></label>' +
            '<label class="nebras-field"><span>وزن كغ/م</span><input type="number" id="alu-part-w" value="0.9" step="0.01"></label>' +
            '<label class="nebras-field"><span>سعر/كغ</span><input type="number" id="alu-part-pkg" value="18" step="0.1"></label>' +
            '<label class="nebras-field"><span>بباكيته؟</span><select id="alu-part-pkgflag"><option value="0">لا</option><option value="1">نعم</option></select></label>' +
            '<label class="nebras-field"><span>منع آخر عود فاضل</span><select id="alu-part-nolast"><option value="0">لا</option><option value="1">نعم (للضرفة غالباً)</option></select></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluPart()">إضافة الجزء</button></div>';
    }

    function addAluSystem() {
        if (!requireAluAccess()) return;
        const nameAr = aluField('alu-sys-name');
        if (!nameAr) { alert('اسم النظام مطلوب'); return; }
        aluSystems.push({
            id: aluId('sys'),
            nameAr: nameAr,
            family: aluField('alu-sys-family') || 'hinged',
            cutAngle: aluNum(aluField('alu-sys-angle')) || 45,
            tracksCount: aluNum(aluField('alu-sys-tracks')),
            deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
            parts: [],
            active: true
        });
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        renderAluminumCuttingPanel();
    }

    function addAluPart() {
        if (!requireAluAccess()) return;
        const sys = findSystem(aluField('alu-part-sys'));
        if (!sys) return;
        const nameAr = aluField('alu-part-name');
        const sku = aluField('alu-part-sku');
        if (!nameAr || !sku) { alert('الاسم و SKU مطلوبان'); return; }
        sys.parts = sys.parts || [];
        sys.parts.push({
            id: aluId('p'),
            role: aluField('alu-part-role') || 'frame',
            nameAr: nameAr,
            sku: sku,
            thicknessMm: aluNum(aluField('alu-part-th')) || 45,
            weightKgPerM: aluNum(aluField('alu-part-w')),
            pricePerKg: aluNum(aluField('alu-part-pkg')),
            withPackage: aluField('alu-part-pkgflag') === '1',
            disableLastBarRemnant: aluField('alu-part-nolast') === '1',
            active: true
        });
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        renderAluminumCuttingPanel();
    }

    function editAluSystemDeducts(id) {
        aluEditSystemId = id;
        setAluTab('deductions');
    }

    function renderAluDeductions() {
        const sys = findSystem(aluEditSystemId) || aluSystems[0];
        if (!sys) return '<p class="erp-empty">أضف نظام قطاع أولاً.</p>';
        aluEditSystemId = sys.id;
        const d = dOf(sys);
        const fields = [
            ['sashOverlapMm', 'ركوب الضرفة'],
            ['splitBetweenSashesMm', 'تقسيم بين الضرفتين'],
            ['sashFromFloorMm', 'تقسيم الضرفة من الأرض (باب بكعب)'],
            ['mullionDeductFull', 'تخصيم المرد — ضرفة كاملة'],
            ['mullionDeductWithHeel', 'تخصيم المرد — بكعب'],
            ['sashDeductW', 'تخصيم عرض الضرفة'],
            ['sashDeductH', 'تخصيم ارتفاع الضرفة'],
            ['glassSashDeductW', 'تخصيم زجاج الضرفة — عرض'],
            ['glassSashDeductH', 'تخصيم زجاج الضرفة — ارتفاع'],
            ['glassFixedDeductW', 'تخصيم زجاج الثابت — عرض'],
            ['glassFixedDeductH', 'تخصيم زجاج الثابت — ارتفاع'],
            ['wireMovingDeduct', 'تخصيم السلك المتحرك'],
            ['wireFixedDeduct', 'تخصيم السلك الثابت'],
            ['cutAngle', 'زاوية القص (45 أو 90)']
        ];
        const sysSelect = '<label class="nebras-field"><span>النظام</span><select id="alu-ded-sys" onchange="editAluSystemDeducts(this.value)">' +
            aluSystems.map(function (s) {
                return '<option value="' + aluEsc(s.id) + '"' + (s.id === sys.id ? ' selected' : '') + '>' + aluEsc(s.nameAr) + '</option>';
            }).join('') + '</select></label>';
        return '<div class="alu-cut-form-card"><h4>تخصيمات — ' + aluEsc(sys.nameAr) + '</h4>' +
            '<p class="alu-cut-note">هذه الأرقام تُحسب مباشرة في أطوال الضرف والزجاج والباكيت. أي تعديل يغيّر الكاتنج ليست والمشتريات فوراً.</p>' +
            '<div class="erp-form-grid">' + sysSelect + fields.map(function (f) {
                return '<label class="nebras-field"><span>' + f[1] + '</span><input type="number" id="alu-ded-' + f[0] + '" value="' + aluNum(d[f[0]]) + '" step="1"></label>';
            }).join('') + '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluDeductions()">حفظ التخصيمات</button></div>';
    }

    function saveAluDeductions() {
        if (!requireAluAccess()) return;
        const sys = findSystem(aluField('alu-ded-sys') || aluEditSystemId);
        if (!sys) return;
        const keys = Object.keys(DEFAULT_DEDUCTIONS);
        sys.deductions = sys.deductions || {};
        keys.forEach(function (k) {
            const el = document.getElementById('alu-ded-' + k);
            if (el) sys.deductions[k] = aluNum(el.value);
        });
        if (sys.deductions.cutAngle) sys.cutAngle = sys.deductions.cutAngle;
        persistAluminumCuttingCloud(['aluminum_systems']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ التخصيمات', 'ok');
    }

    function renderAluAccessories() {
        const rows = aluAccessories.map(function (a, i) {
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + aluEsc(a.nameAr) + '</strong>' +
                '<small>' + aluEsc(a.code) + ' · ' + aluEsc(a.equationType) + '=' + aluNum(a.equationValue) +
                ' · شراء ' + aluNum(a.purchasePrice) + ' / بيع ' + aluNum(a.sellPrice) +
                (a.colorAr ? ' · لون ' + aluEsc(a.colorAr) : '') + '</small></div>' +
                '<button type="button" class="erp-tag" onclick="editAluAccessory(' + i + ')">تعديل</button></article>';
        }).join('');
        return '<div class="alu-cut-form-card"><h4>إكسسوارات ومعادلات الحساب</h4>' +
            '<p class="alu-cut-note">مثال: كورنر = قيمة لكل زاوية (1 أو 2) · مسامير = كل X سم من المحيط · كاوتش بالمتر · مقبض لكل ضرفة.</p>' +
            '<div class="erp-form-grid" id="alu-acc-form">' +
            '<input type="hidden" id="alu-acc-id" value="">' +
            '<label class="nebras-field"><span>الاسم</span><input type="text" id="alu-acc-name"></label>' +
            '<label class="nebras-field"><span>كود</span><input type="text" id="alu-acc-code"></label>' +
            '<label class="nebras-field"><span>المعادلة</span><select id="alu-acc-eq">' +
            '<option value="per_corner">لكل زاوية</option>' +
            '<option value="per_perimeter_cm">كل X سم محيط</option>' +
            '<option value="per_meter">بالمتر</option>' +
            '<option value="per_leaf">لكل ضرفة</option>' +
            '<option value="per_unit">لكل وحدة/بند</option>' +
            '<option value="fixed">ثابت</option></select></label>' +
            '<label class="nebras-field"><span>قيمة المعادلة</span><input type="number" id="alu-acc-val" value="1" step="0.1"></label>' +
            '<label class="nebras-field"><span>سعر شراء</span><input type="number" id="alu-acc-buy" step="0.01"></label>' +
            '<label class="nebras-field"><span>سعر بيع</span><input type="number" id="alu-acc-sell" step="0.01"></label>' +
            '<label class="nebras-field"><span>لون</span><input type="text" id="alu-acc-color"></label>' +
            '<label class="nebras-field"><span>عائلة فقط</span><select id="alu-acc-fam"><option value="">الكل</option><option value="hinged">مفصلي</option><option value="sliding">سحاب</option></select></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluAccessory()">حفظ</button>' +
            '<label class="nebras-field" style="max-width:140px"><span>تعديل جماعي %</span><input type="number" id="alu-acc-bulk" placeholder="5"></label>' +
            '<button type="button" class="nebras-users-btn" onclick="bulkAluAccessoryPrices()">تطبيق على الكل</button>' +
            '</div></div><div class="nebras-erp-list">' + rows + '</div>';
    }

    function editAluAccessory(i) {
        const a = aluAccessories[i];
        if (!a) return;
        setAluTab('accessories');
        setTimeout(function () {
            const map = {
                'alu-acc-id': a.id, 'alu-acc-name': a.nameAr, 'alu-acc-code': a.code,
                'alu-acc-eq': a.equationType, 'alu-acc-val': a.equationValue,
                'alu-acc-buy': a.purchasePrice, 'alu-acc-sell': a.sellPrice,
                'alu-acc-color': a.colorAr || '', 'alu-acc-fam': a.familyOnly || ''
            };
            Object.keys(map).forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.value = map[id];
            });
        }, 40);
    }

    function saveAluAccessory() {
        if (!requireAluAccess()) return;
        const nameAr = aluField('alu-acc-name');
        const code = aluField('alu-acc-code');
        if (!nameAr || !code) { alert('الاسم والكود مطلوبان'); return; }
        const id = aluField('alu-acc-id') || aluId('acc');
        const row = {
            id: id, nameAr: nameAr, code: code,
            equationType: aluField('alu-acc-eq') || 'per_unit',
            equationValue: aluNum(aluField('alu-acc-val')) || 1,
            purchasePrice: aluNum(aluField('alu-acc-buy')),
            sellPrice: aluNum(aluField('alu-acc-sell')),
            colorAr: aluField('alu-acc-color'),
            familyOnly: aluField('alu-acc-fam') || '',
            applyScope: 'all',
            active: true
        };
        const idx = aluAccessories.findIndex(function (a) { return a.id === id; });
        if (idx >= 0) aluAccessories[idx] = Object.assign({}, aluAccessories[idx], row);
        else aluAccessories.push(row);
        persistAluminumCuttingCloud(['aluminum_accessories']);
        renderAluminumCuttingPanel();
    }

    function bulkAluAccessoryPrices() {
        const pct = aluNum(aluField('alu-acc-bulk'));
        if (!pct) { alert('أدخل نسبة مئوية'); return; }
        const f = 1 + pct / 100;
        aluAccessories.forEach(function (a) {
            a.purchasePrice = aluRound(aluNum(a.purchasePrice) * f, 2);
            a.sellPrice = aluRound(aluNum(a.sellPrice) * f, 2);
        });
        persistAluminumCuttingCloud(['aluminum_accessories']);
        renderAluminumCuttingPanel();
    }

    function renderAluMaterials() {
        const gRows = aluGlass.map(function (g) {
            return '<tr><td>' + aluEsc(g.nameAr) + '</td><td>' + aluNum(g.thicknessMm) + '</td><td>' + aluNum(g.pricePerM2) + '</td></tr>';
        }).join('');
        const wRows = aluWire.map(function (w) {
            return '<tr><td>' + aluEsc(w.nameAr) + '</td><td>' + aluEsc(w.kind) + '</td><td>' + aluNum(w.sizeMm) + '</td><td>' + aluNum(w.pricePerM2) + '</td></tr>';
        }).join('');
        const cRows = aluColors.map(function (c) {
            return '<tr><td>' + aluEsc(c.nameAr) + '</td><td>' + aluNum(c.surchargePerM2) + '</td></tr>';
        }).join('');
        return '<div class="alu-cut-form-card"><h4>زجاج</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الاسم</span><input id="alu-gl-name"></label>' +
            '<label class="nebras-field"><span>سماكة</span><input type="number" id="alu-gl-th" value="6"></label>' +
            '<label class="nebras-field"><span>سعر م²</span><input type="number" id="alu-gl-price" value="45"></label></div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluGlass()">إضافة زجاج</button>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>مم</th><th>سعر</th></tr></thead><tbody>' + gRows + '</tbody></table></div></div>' +
            '<div class="alu-cut-form-card"><h4>سلك</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الاسم</span><input id="alu-wr-name"></label>' +
            '<label class="nebras-field"><span>نوع</span><select id="alu-wr-kind"><option value="fiber">فايبر</option><option value="hard">ناشف</option></select></label>' +
            '<label class="nebras-field"><span>مقاس</span><input type="number" id="alu-wr-size" value="18"></label>' +
            '<label class="nebras-field"><span>سعر م²</span><input type="number" id="alu-wr-price" value="22"></label></div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluWire()">إضافة سلك</button>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>نوع</th><th>مقاس</th><th>سعر</th></tr></thead><tbody>' + wRows + '</tbody></table></div></div>' +
            '<div class="alu-cut-form-card"><h4>ألوان / دهان</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الاسم</span><input id="alu-cl-name"></label>' +
            '<label class="nebras-field"><span>زيادة م²</span><input type="number" id="alu-cl-sur" value="0"></label></div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluColor()">إضافة لون</button>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>اسم</th><th>زيادة</th></tr></thead><tbody>' + cRows + '</tbody></table></div></div>';
    }

    function addAluGlass() {
        const nameAr = aluField('alu-gl-name');
        if (!nameAr) return;
        aluGlass.push({ id: aluId('gl'), nameAr: nameAr, thicknessMm: aluNum(aluField('alu-gl-th')), pricePerM2: aluNum(aluField('alu-gl-price')), active: true });
        persistAluminumCuttingCloud(['aluminum_glass']);
        renderAluminumCuttingPanel();
    }
    function addAluWire() {
        const nameAr = aluField('alu-wr-name');
        if (!nameAr) return;
        aluWire.push({ id: aluId('wr'), nameAr: nameAr, kind: aluField('alu-wr-kind'), sizeMm: aluNum(aluField('alu-wr-size')), pricePerM2: aluNum(aluField('alu-wr-price')), active: true });
        persistAluminumCuttingCloud(['aluminum_wire']);
        renderAluminumCuttingPanel();
    }
    function addAluColor() {
        const nameAr = aluField('alu-cl-name');
        if (!nameAr) return;
        aluColors.push({ id: aluId('cl'), nameAr: nameAr, surchargePerM2: aluNum(aluField('alu-cl-sur')), active: true });
        persistAluminumCuttingCloud(['aluminum_colors']);
        renderAluminumCuttingPanel();
    }

    function renderAluReports() {
        const est = aluEstimateDraft && (aluEstimateDraft.items || []).length
            ? aluEstimateDraft
            : (aluEstimates[aluEstimates.length - 1] || null);
        if (!est) return '<p class="erp-empty">لا مقايسة للتقارير.</p>';
        const totals = computeEstimateTotals(est);
        const cut = (aluCutDraft && aluCutDraft.lastResult)
            ? aluCutDraft.lastResult
            : runFullCuttingPlan(totals.cuts, { stockBarMm: est.stockBarMm, kerfMm: est.kerfMm, weightAdjustPct: est.weightAdjustPct });

        const purchaseRows = cut.plans.map(function (pl) {
            return '<tr><td>' + aluEsc(pl.profileSku) + '</td><td>' + aluEsc(pl.profileName) + '</td><td>' +
                aluEsc(pl.purchase.buyLabel) + '</td><td>' + pl.buyKg + '</td><td>' + pl.cost + '</td></tr>';
        }).join('');
        const accRows = totals.accessories.map(function (a) {
            return '<tr><td>' + aluEsc(a.nameAr) + (a.colorAr ? ' / ' + aluEsc(a.colorAr) : '') +
                '</td><td>' + a.qty + '</td><td>' + a.unitPrice + '</td><td>' + a.total + '</td></tr>';
        }).join('') || '<tr><td colspan="4">—</td></tr>';
        const glassRows = totals.glassPanels.map(function (g) {
            return '<tr><td>' + aluEsc(g.nameAr) + '</td><td>' + g.widthMm + '×' + g.heightMm +
                '</td><td>' + g.panels + '</td><td>' + g.areaM2 + '</td><td>' + aluRound(g.areaM2 * g.pricePerM2, 2) + '</td></tr>';
        }).join('');

        const assembly = aluRound(cut.profilesCost + totals.accessoriesCost + totals.glassCost + totals.wireCost + totals.colorCost + totals.laborCost - (cut.scrapCredit || 0), 2);
        const vat = aluRound(assembly * 0.15, 2);

        return '<div class="alu-cut-form-card"><h4>طلبية مشتريات تفصيلية</h4>' +
            '<p class="alu-cut-note">' + aluEsc(est.ref) + ' — القطاعات تُحسب بآخر عود فاضل إن كان مفعّلاً</p>' +
            '<h5>قطاعات</h5><div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>SKU</th><th>قطاع</th><th>شراء</th><th>كغ</th><th>تكلفة</th></tr></thead><tbody>' +
            purchaseRows + '</tbody></table></div>' +
            '<h5>إكسسوارات</h5><div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>صنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead><tbody>' +
            accRows + '</tbody></table></div>' +
            '<h5>زجاج</h5><div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>نوع</th><th>مقاس</th><th>ألواح</th><th>م²</th><th>تكلفة</th></tr></thead><tbody>' +
            glassRows + '</tbody></table></div>' +
            (totals.wireRows.length ? '<h5>سلك</h5><p>تكلفة ' + totals.wireCost + '</p>' : '') +
            '</div>' +
            '<div class="alu-cut-form-card"><h4>تجميع وتكلفة</h4>' +
            '<div class="alu-cut-totals">' +
            '<div><span>قطاعات</span><strong>' + cut.profilesCost + '</strong></div>' +
            '<div><span>إكسسوارات</span><strong>' + totals.accessoriesCost + '</strong></div>' +
            '<div><span>زجاج</span><strong>' + totals.glassCost + '</strong></div>' +
            '<div><span>سلك/ألوان</span><strong>' + aluRound(totals.wireCost + totals.colorCost, 2) + '</strong></div>' +
            '<div><span>أجور</span><strong>' + totals.laborCost + '</strong></div>' +
            '<div><span>خصم سكراب</span><strong>-' + (cut.scrapCredit || 0) + '</strong></div>' +
            '<div><span>قبل الضريبة</span><strong>' + assembly + '</strong></div>' +
            '<div class="alu-cut-totals-grand"><span>شامل 15%</span><strong>' + aluRound(assembly + vat, 2) + '</strong></div>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn" onclick="printAluPurchaseReport()">طباعة مشتريات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluAssemblyReport()">طباعة تجميع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluQuoteReport()">عرض سعر</button>' +
            '</div></div>';
    }

    function renderAluSettings() {
        return '<div class="alu-cut-form-card"><h4>إعدادات التقطيع وعرض السعر</h4>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>طول العود الافتراضي مم</span><input type="number" id="alu-set-stock" value="' + aluNum(aluSettings.stockBarMm) + '"></label>' +
            '<label class="nebras-field"><span>مساحة قطع المنشار مم</span><input type="number" id="alu-set-kerf" value="' + aluNum(aluSettings.kerfMm) + '" step="0.1"></label>' +
            '<label class="nebras-field"><span>أقل مقاس فاضلة مم</span><input type="number" id="alu-set-rem" value="' + aluNum(aluSettings.remnantMinMm) + '"></label>' +
            '<label class="nebras-field"><span>آخر عود فاضل</span><select id="alu-set-last"><option value="1"' + (aluSettings.lastBarRemnantEnabled ? ' selected' : '') + '>مفعّل</option><option value="0"' + (!aluSettings.lastBarRemnantEnabled ? ' selected' : '') + '>موقوف</option></select></label>' +
            '<label class="nebras-field"><span>عتبة آخر عود مم</span><input type="number" id="alu-set-th" value="' + aluNum(aluSettings.lastBarThresholdMm) + '"></label>' +
            '<label class="nebras-field"><span>زيادة أمان مم</span><input type="number" id="alu-set-safe" value="' + aluNum(aluSettings.lastBarSafetyMm) + '"></label>' +
            '<label class="nebras-field"><span>سعر سكراب / كغ</span><input type="number" id="alu-set-scrap" value="' + aluNum(aluSettings.scrapPricePerKg) + '" step="0.1"></label>' +
            '<label class="nebras-field"><span>أقل من متر</span><select id="alu-set-um">' +
            '<option value="round_to_meter"' + (aluSettings.underMeterMode === 'round_to_meter' ? ' selected' : '') + '>الناتج → متر</option>' +
            '<option value="as_is"' + (aluSettings.underMeterMode === 'as_is' ? ' selected' : '') + '>دون تغيير</option>' +
            '<option value="each_side_to_meter"' + (aluSettings.underMeterMode === 'each_side_to_meter' ? ' selected' : '') + '>كل ضلع → متر ثم الضرب</option>' +
            '</select></label>' +
            '<label class="nebras-field"><span>سعر إكسسوار افتراضي</span><select id="alu-set-pm">' +
            '<option value="purchase"' + (aluSettings.priceModeDefault !== 'sell' ? ' selected' : '') + '>شراء</option>' +
            '<option value="sell"' + (aluSettings.priceModeDefault === 'sell' ? ' selected' : '') + '>بيع</option></select></label>' +
            '<label class="nebras-field"><span>أجور تجميع / وحدة</span><input type="number" id="alu-set-labor" value="' + aluNum(aluSettings.laborPerUnit) + '"></label>' +
            '</div>' +
            '<label class="nebras-field nebras-field--wide"><span>شروط عرض السعر</span><textarea id="alu-set-terms" rows="3">' + aluEsc(aluSettings.quoteTerms || '') + '</textarea></label>' +
            '<p class="alu-cut-note">الافتراضيات وفق الفيديو: عود 6.5م · منشار 1سم · فاضلة 20سم · آخر عود فاضل عند أقل من 4.5م + 5سم أمان.</p>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluCutSettings()">حفظ الإعدادات</button></div>';
    }

    function saveAluCutSettings() {
        if (!requireAluAccess()) return;
        aluSettings.stockBarMm = aluNum(aluField('alu-set-stock')) || 6500;
        aluSettings.kerfMm = aluNum(aluField('alu-set-kerf'));
        aluSettings.remnantMinMm = aluNum(aluField('alu-set-rem')) || 200;
        aluSettings.lastBarRemnantEnabled = aluField('alu-set-last') !== '0';
        aluSettings.lastBarThresholdMm = aluNum(aluField('alu-set-th')) || 4500;
        aluSettings.lastBarSafetyMm = aluNum(aluField('alu-set-safe')) || 50;
        aluSettings.scrapPricePerKg = aluNum(aluField('alu-set-scrap'));
        aluSettings.underMeterMode = aluField('alu-set-um') || 'round_to_meter';
        aluSettings.priceModeDefault = aluField('alu-set-pm') || 'purchase';
        aluSettings.laborPerUnit = aluNum(aluField('alu-set-labor')) || 80;
        aluSettings.quoteTerms = aluField('alu-set-terms');
        persistAluminumCuttingCloud(['aluminum_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ الإعدادات', 'ok');
    }

    function openPrintWindow(title, html) {
        const w = window.open('', '_blank', 'noopener,noreferrer,width=960,height=1000');
        if (!w) { alert('اسمح بالنوافذ المنبثقة للطباعة.'); return; }
        w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' +
            aluEsc(title) + '</title><style>' +
            'body{font-family:Cairo,Tahoma,sans-serif;padding:24px;color:#1a1a1a}' +
            'h1{font-size:1.2rem}h2{font-size:1rem;margin-top:1rem}' +
            'table{width:100%;border-collapse:collapse;font-size:.84rem;margin:.4rem 0 1rem}' +
            'th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#eef2f5}' +
            '.bar{display:flex;height:22px;border:1px solid #999;margin:4px 0}' +
            '.seg{background:#2c3e50;color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;border-left:1px solid #fff}' +
            '.waste{background:#f0c0c0;color:#622;font-size:10px;display:flex;align-items:center;justify-content:center}' +
            '.meta{color:#555;font-size:.9rem}@media print{button{display:none}}' +
            '</style></head><body>' + html + '<p><button onclick="window.print()">طباعة</button></p></body></html>');
        w.document.close();
    }

    function printAluEstimateReport() {
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        const t = computeEstimateTotals(aluEstimateDraft);
        let html = '<h1>مقايسة ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(aluEstimateDraft.ref) + ' — ' +
            aluEsc(aluEstimateDraft.customerName) + ' / ' + aluEsc(aluEstimateDraft.projectName) + '</p><table><tr><th>بند</th><th>شكل</th><th>مقاس</th><th>كمية</th></tr>';
        (aluEstimateDraft.items || []).forEach(function (it) {
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + aluEsc((READY_SHAPES[it.shape] || {}).nameAr || '') +
                '</td><td>' + it.widthMm + '×' + it.heightMm + '</td><td>' + it.qty + '</td></tr>';
        });
        html += '</table><p>الإجمالي شامل الضريبة: ' + t.total + ' ' + aluSettings.currencyLabel + '</p>';
        openPrintWindow('مقايسة', html);
    }

    function printAluCutReport() {
        if (!aluCutDraft || !aluCutDraft.lastResult) { alert('شغّل التقطيع أولاً.'); return; }
        const r = aluCutDraft.lastResult;
        let html = '<h1>كاتنج ليست — نبراس</h1><p class="meta">' + aluEsc(aluCutDraft.estimateRef || '') +
            ' · قطع ' + r.totalPieces + ' · أعواد ' + r.totalBars + ' · هدر ' + r.wastePct + '%</p>';
        r.plans.forEach(function (pl) {
            html += '<h2>' + aluEsc(pl.profileName) + ' — شراء: ' + aluEsc(pl.purchase.buyLabel) + '</h2>';
            pl.plan.groups.forEach(function (g) {
                html += '<div>× ' + g.count + ' — متبقي ' + g.remain + '</div><div class="bar">';
                g.sample.pieces.forEach(function (p) {
                    html += '<span class="seg" style="flex:' + Math.max(2, (p.lengthMm / pl.stockMm) * 100) + '">' +
                        aluEsc(p.code) + ' ' + p.lengthMm + '</span>';
                });
                if (g.remain > 0) html += '<span class="waste" style="flex:' + ((g.remain / pl.stockMm) * 100) + '">' + g.remain + '</span>';
                html += '</div>';
            });
        });
        openPrintWindow('تقطيع', html);
    }

    function printAluPurchaseReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        const totals = computeEstimateTotals(est);
        const cut = (aluCutDraft && aluCutDraft.lastResult) || runFullCuttingPlan(totals.cuts, { stockBarMm: est.stockBarMm, kerfMm: est.kerfMm, weightAdjustPct: est.weightAdjustPct });
        let html = '<h1>طلبية مشتريات ألومنيوم</h1><p class="meta">' + aluEsc(est.ref) + '</p><h2>قطاعات</h2><table><tr><th>SKU</th><th>قطاع</th><th>شراء</th><th>تكلفة</th></tr>';
        cut.plans.forEach(function (pl) {
            html += '<tr><td>' + aluEsc(pl.profileSku) + '</td><td>' + aluEsc(pl.profileName) + '</td><td>' +
                aluEsc(pl.purchase.buyLabel) + '</td><td>' + pl.cost + '</td></tr>';
        });
        html += '</table><h2>إكسسوارات</h2><table><tr><th>صنف</th><th>كمية</th><th>إجمالي</th></tr>';
        totals.accessories.forEach(function (a) {
            html += '<tr><td>' + aluEsc(a.nameAr) + '</td><td>' + a.qty + '</td><td>' + a.total + '</td></tr>';
        });
        html += '</table><h2>زجاج</h2><p>مساحة ' + totals.glassAreaM2 + ' م² · تكلفة ' + totals.glassCost + '</p>';
        openPrintWindow('مشتريات', html);
    }

    function printAluAssemblyReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        const t = computeEstimateTotals(est);
        let html = '<h1>تقرير تجميع وتكلفة</h1><p class="meta">' + aluEsc(est.ref) + '</p>';
        html += '<p>قطاعات (تقدير وزن): ' + t.profilesCost + ' · إكسسوارات: ' + t.accessoriesCost +
            ' · زجاج: ' + t.glassCost + ' · سلك: ' + t.wireCost + ' · أجور: ' + t.laborCost +
            ' · شامل الضريبة: ' + t.total + '</p>';
        openPrintWindow('تجميع', html);
    }

    function printAluQuoteReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        const t = computeEstimateTotals(est);
        let html = '<h1>عرض سعر ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(est.ref) + ' — ' +
            aluEsc(est.customerName) + ' / ' + aluEsc(est.projectName) + '</p>';
        html += '<table><tr><th>بند</th><th>مقاس</th><th>كمية</th><th>م² محاسبة</th></tr>';
        (est.items || []).forEach(function (it) {
            const area = billableAreaM2(it.widthMm, it.heightMm) * Math.max(1, it.qty || 1);
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + it.qty + '</td><td>' + area + '</td></tr>';
        });
        html += '</table><p><strong>الإجمالي شامل الضريبة: ' + t.total + ' ' + aluSettings.currencyLabel +
            '</strong></p><p class="meta">' + aluEsc(aluSettings.quoteTerms || '') + '</p>';
        openPrintWindow('عرض سعر', html);
    }

    /* init */
    hydrateAluminumCuttingLocal();

    global.openAluminumCutting = openAluminumCutting;
    global.setAluCutTab = setAluTab;
    global.newAluEstimate = newAluEstimate;
    global.addAluItem = addAluItem;
    global.removeAluItem = removeAluItem;
    global.saveAluEstimate = saveAluEstimate;
    global.loadAluEstimate = loadAluEstimate;
    global.copyAluEstimate = copyAluEstimate;
    global.deleteAluEstimate = deleteAluEstimate;
    global.sendAluEstimateToCutting = sendAluEstimateToCutting;
    global.saveAluCutJob = saveAluCutJob;
    global.addAluSystem = addAluSystem;
    global.addAluPart = addAluPart;
    global.editAluSystemDeducts = editAluSystemDeducts;
    global.saveAluDeductions = saveAluDeductions;
    global.saveAluAccessory = saveAluAccessory;
    global.editAluAccessory = editAluAccessory;
    global.bulkAluAccessoryPrices = bulkAluAccessoryPrices;
    global.addAluGlass = addAluGlass;
    global.addAluWire = addAluWire;
    global.addAluColor = addAluColor;
    global.saveAluCutSettings = saveAluCutSettings;
    global.printAluEstimateReport = printAluEstimateReport;
    global.printAluCutReport = printAluCutReport;
    global.printAluPurchaseReport = printAluPurchaseReport;
    global.printAluAssemblyReport = printAluAssemblyReport;
    global.printAluQuoteReport = printAluQuoteReport;
    global.isStrictAluminumUser = isStrictAluminumUser;
    global.canAccessAluminumCutting = canAccessAluminumCutting;
    global.getAluminumProfiles = getAluminumProfiles;
    global.getAluminumSystems = getAluminumSystems;
    global.getAluminumEstimates = getAluminumEstimates;
    global.getAluminumCutJobs = getAluminumCutJobs;
    global.getAluminumCutSettings = getAluminumCutSettings;
    global.getAluminumAccessories = getAluminumAccessories;
    global.getAluminumGlass = getAluminumGlass;
    global.getAluminumWire = getAluminumWire;
    global.getAluminumColors = getAluminumColors;
    global.setAluminumProfilesFromCloud = setAluminumProfilesFromCloud;
    global.setAluminumSystemsFromCloud = setAluminumSystemsFromCloud;
    global.setAluminumEstimatesFromCloud = setAluminumEstimatesFromCloud;
    global.setAluminumCutJobsFromCloud = setAluminumCutJobsFromCloud;
    global.setAluminumCutSettingsFromCloud = setAluminumCutSettingsFromCloud;
    global.setAluminumAccessoriesFromCloud = setAluminumAccessoriesFromCloud;
    global.setAluminumGlassFromCloud = setAluminumGlassFromCloud;
    global.setAluminumWireFromCloud = setAluminumWireFromCloud;
    global.setAluminumColorsFromCloud = setAluminumColorsFromCloud;
    global.renderAluminumCuttingPanel = renderAluminumCuttingPanel;
    global.nebrasOptimizeAluminumCuts = runFullCuttingPlan;

    /* توافق أزرار قديمة */
    global.addAluOpening = addAluItem;
    global.removeAluOpening = removeAluItem;
    global.saveAluProfile = function () { setAluTab('systems'); };
})(typeof window !== 'undefined' ? window : globalThis);
