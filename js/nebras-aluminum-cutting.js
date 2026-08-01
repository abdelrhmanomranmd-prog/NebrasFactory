/**
 * نبراس — تخصيمات قطاعات الألومنيوم (V3 Pro)
 * أقوى من Ecotal/Uptime Window: مقارنة أعواد متعددة · بنك فضلة · تدقيق معادلات · استيكر ورشة · تفريز · مراحل · استيراد/تصدير
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
    const ALU_REMNANTS_KEY = 'nebrasAluminumRemnants';
    const ALU_AUDIT_KEY = 'nebrasAluminumAudit';

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
        autoCompareStocks: true,
        compareStockLengths: [6000, 6500, 7000],
        useRemnantBank: true,
        saveRemnantsAfterCut: true,
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
        cutAngle: 45,
        miterExtraMm: 0,
        beadInsetMm: 8
    };

    let aluProfiles = [];
    let aluSystems = [];
    let aluEstimates = [];
    let aluCutJobs = [];
    let aluAccessories = [];
    let aluGlass = [];
    let aluWire = [];
    let aluColors = [];
    let aluRemnants = [];
    let aluAudit = [];
    let aluSettings = Object.assign({}, DEFAULT_SETTINGS);
    let aluActiveTab = 'dashboard';
    let aluEstimateDraft = null;
    let aluCutDraft = null;
    let aluDataReady = false;
    let aluEditSystemId = null;

    const READY_SHAPES = {
        casement: { nameAr: 'شباك مفصلي', family: 'hinged', leaves: 1 },
        tilt_turn: { nameAr: 'شباك قلاب /Tilt-Turn', family: 'hinged', leaves: 1 },
        fixed: { nameAr: 'شباك ثابت', family: 'hinged', leaves: 1 },
        sliding2: { nameAr: 'شباك سحاب ضلفتين', family: 'sliding', leaves: 2 },
        sliding3: { nameAr: 'شباك سحاب 3 ضلف', family: 'sliding', leaves: 3 },
        sliding4: { nameAr: 'شباك سحاب 4 ضلف', family: 'sliding', leaves: 4 },
        door_hinged: { nameAr: 'باب مفصلي', family: 'hinged', leaves: 1 },
        door_sliding: { nameAr: 'باب سحاب', family: 'sliding', leaves: 2 },
        facade_panel: { nameAr: 'وحدة واجهة — باي واحد', family: 'facade', leaves: 1 },
        facade_bay: { nameAr: 'واجهة — شبكة بايات (أعمدة×صفوف)', family: 'facade', leaves: 1 }
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

    function ensureFacadeSystemPresent() {
        if (aluSystems.some(function (s) { return s.family === 'facade' && s.active !== false; })) return false;
        aluSystems.push({
            id: 'sys-facade-cw',
            nameAr: 'واجهة ستارة Curtain Wall',
            family: 'facade',
            cutAngle: 90,
            tracksCount: 0,
            deductions: Object.assign({}, DEFAULT_DEDUCTIONS, {
                mullionDeductFull: 0, sashDeductW: 40, glassFixedDeductW: 50, glassFixedDeductH: 50, cutAngle: 90, miterExtraMm: 0, beadInsetMm: 10
            }),
            parts: [
                { id: 'p-cw-fr', role: 'frame', nameAr: 'إطار محيط واجهة', sku: 'CW-FR-01', thicknessMm: 65, weightKgPerM: 1.85, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                { id: 'p-cw-mu', role: 'mullion', nameAr: 'عمود رأسي Mullion', sku: 'CW-MU-01', thicknessMm: 65, weightKgPerM: 2.1, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                { id: 'p-cw-tr', role: 'meeting', nameAr: 'عارضة أفقية Transom', sku: 'CW-TR-01', thicknessMm: 65, weightKgPerM: 1.7, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                { id: 'p-cw-bar', role: 'bar', nameAr: 'ضغط / Pressure bar', sku: 'CW-PB-01', thicknessMm: 25, weightKgPerM: 0.55, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                { id: 'p-cw-bd', role: 'bead', nameAr: 'باكيت خلية', sku: 'CW-BD-01', thicknessMm: 20, weightKgPerM: 0.3, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true }
            ],
            active: true
        });
        return true;
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
                        { id: 'p-bd', role: 'bead', nameAr: 'باكيت سوناتا', sku: 'SON-BD-01', thicknessMm: 20, weightKgPerM: 0.28, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-th', role: 'threshold', nameAr: 'عتبة باب', sku: 'SON-TH-01', thicknessMm: 45, weightKgPerM: 1.1, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true }
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
                        { id: 'p-kn', role: 'knife', nameAr: 'سكينة', sku: 'SL-KN-01', thicknessMm: 20, weightKgPerM: 0.45, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-sbd', role: 'bead', nameAr: 'باكيت سحاب', sku: 'SL-BD-01', thicknessMm: 20, weightKgPerM: 0.28, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-sth', role: 'threshold', nameAr: 'عتبة باب سحاب', sku: 'SL-TH-01', thicknessMm: 50, weightKgPerM: 1.15, pricePerKg: 18, withPackage: false, disableLastBarRemnant: false, active: true }
                    ],
                    active: true
                },
                {
                    id: 'sys-facade-cw',
                    nameAr: 'واجهة ستارة Curtain Wall',
                    family: 'facade',
                    cutAngle: 90,
                    tracksCount: 0,
                    deductions: Object.assign({}, DEFAULT_DEDUCTIONS, {
                        mullionDeductFull: 0, sashDeductW: 40, glassFixedDeductW: 50, glassFixedDeductH: 50, cutAngle: 90, miterExtraMm: 0, beadInsetMm: 10
                    }),
                    parts: [
                        { id: 'p-cw-fr', role: 'frame', nameAr: 'إطار محيط واجهة', sku: 'CW-FR-01', thicknessMm: 65, weightKgPerM: 1.85, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-cw-mu', role: 'mullion', nameAr: 'عمود رأسي Mullion', sku: 'CW-MU-01', thicknessMm: 65, weightKgPerM: 2.1, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-cw-tr', role: 'meeting', nameAr: 'عارضة أفقية Transom', sku: 'CW-TR-01', thicknessMm: 65, weightKgPerM: 1.7, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-cw-bar', role: 'bar', nameAr: 'ضغط / Pressure bar', sku: 'CW-PB-01', thicknessMm: 25, weightKgPerM: 0.55, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true },
                        { id: 'p-cw-bd', role: 'bead', nameAr: 'باكيت خلية', sku: 'CW-BD-01', thicknessMm: 20, weightKgPerM: 0.3, pricePerKg: 19, withPackage: false, disableLastBarRemnant: false, active: true }
                    ],
                    active: true
                }
            ];
        }
        if (ensureFacadeSystemPresent()) {
            try { saveLocal(ALU_SYSTEMS_KEY, aluSystems); } catch (e) { /* ignore */ }
        }
        if (!aluAccessories.length) {
            aluAccessories = [
                { id: 'acc-corner', code: 'CORNER', nameAr: 'كورنر', equationType: 'per_corner', equationValue: 1, purchasePrice: 1.5, sellPrice: 2.5, applyScope: 'all', colorAr: '', active: true },
                { id: 'acc-screw', code: 'SCREW', nameAr: 'مسامير تثبيت', equationType: 'per_perimeter_cm', equationValue: 50, purchasePrice: 0.15, sellPrice: 0.25, applyScope: 'frame', colorAr: '', active: true },
                { id: 'acc-handle', code: 'HANDLE', nameAr: 'مقبض', equationType: 'per_leaf', equationValue: 1, purchasePrice: 18, sellPrice: 28, applyScope: 'sash', colorAr: 'أسود', active: true },
                { id: 'acc-hinge', code: 'HINGE', nameAr: 'مفصلة', equationType: 'per_leaf', equationValue: 2, purchasePrice: 12, sellPrice: 22, applyScope: 'sash', colorAr: '', familyOnly: 'hinged', active: true },
                { id: 'acc-roller', code: 'ROLLER', nameAr: 'بكرة سحاب', equationType: 'per_leaf', equationValue: 2, purchasePrice: 10, sellPrice: 16, applyScope: 'sash', colorAr: '', familyOnly: 'sliding', active: true },
                { id: 'acc-lock', code: 'LOCK', nameAr: 'قفل', equationType: 'per_unit', equationValue: 1, purchasePrice: 35, sellPrice: 55, applyScope: 'all', colorAr: '', active: true },
                { id: 'acc-rubber', code: 'RUBBER', nameAr: 'كاوتش (م)', equationType: 'per_meter', equationValue: 1, purchasePrice: 3, sellPrice: 5, applyScope: 'all', colorAr: '', active: true },
                { id: 'acc-bracket', code: 'BRACKET', nameAr: 'زاوية تثبيت واجهة', equationType: 'per_unit', equationValue: 4, purchasePrice: 8, sellPrice: 14, applyScope: 'frame', colorAr: '', familyOnly: 'facade', active: true },
                { id: 'acc-setting', code: 'SETTING', nameAr: 'وسادة زجاج Setting block', equationType: 'per_unit', equationValue: 4, purchasePrice: 1.2, sellPrice: 2, applyScope: 'all', colorAr: '', familyOnly: 'facade', active: true }
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
        aluRemnants = loadLocal(ALU_REMNANTS_KEY, []);
        aluAudit = loadLocal(ALU_AUDIT_KEY, []);
        aluSettings = Object.assign({}, DEFAULT_SETTINGS, loadLocal(ALU_SETTINGS_KEY, {}) || {});
        if (!Array.isArray(aluSettings.compareStockLengths) || !aluSettings.compareStockLengths.length) {
            aluSettings.compareStockLengths = [6000, 6500, 7000];
        }
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
        saveLocal(ALU_REMNANTS_KEY, aluRemnants);
        saveLocal(ALU_AUDIT_KEY, aluAudit.slice(-400));
    }

    function aluLog(action, detail) {
        aluAudit.unshift({
            id: aluId('aud'),
            at: new Date().toISOString(),
            action: action,
            detail: detail || '',
            user: (typeof currentAdmin !== 'undefined' && currentAdmin) ? (currentAdmin.username || '') : ''
        });
        if (aluAudit.length > 400) aluAudit = aluAudit.slice(0, 400);
    }

    async function persistAluminumCuttingCloud(keys) {
        persistAluminumCuttingLocal();
        keys = keys || [
            'aluminum_profiles', 'aluminum_systems', 'aluminum_estimates', 'aluminum_cut_jobs',
            'aluminum_cut_settings', 'aluminum_accessories', 'aluminum_glass', 'aluminum_wire',
            'aluminum_colors', 'aluminum_remnants', 'aluminum_audit'
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
    function getAluminumRemnants() { return aluRemnants; }
    function getAluminumAudit() { return aluAudit; }

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
    function setAluminumRemnantsFromCloud(v) { aluRemnants = Array.isArray(v) ? v : []; saveLocal(ALU_REMNANTS_KEY, aluRemnants); }
    function setAluminumAuditFromCloud(v) { aluAudit = Array.isArray(v) ? v : []; saveLocal(ALU_AUDIT_KEY, aluAudit); }

    function findSystem(id, shapeFamily) {
        const exact = aluSystems.find(function (s) { return s.id === id && s.active !== false; });
        if (exact) {
            if (shapeFamily && exact.family && exact.family !== shapeFamily && shapeFamily !== 'facade') {
                return { system: exact, warning: 'نظام القطاع عائلة مختلفة عن شكل البند (' + exact.family + ' ≠ ' + shapeFamily + ')' };
            }
            return { system: exact, warning: '' };
        }
        if (shapeFamily) {
            const byFam = aluSystems.find(function (s) { return s.active !== false && s.family === shapeFamily; });
            if (byFam) return { system: byFam, warning: 'لم يُعثر على النظام المحدد — استُخدم نظام بنفس العائلة: ' + byFam.nameAr };
        }
        return { system: null, warning: 'لا يوجد نظام قطاع صالح لهذا البند' };
    }

    function getSystem(id) {
        return findSystem(id).system;
    }

    function partForRole(sys, role) {
        if (!sys) return null;
        return (sys.parts || []).find(function (p) { return p.active !== false && p.role === role; }) || null;
    }

    function dOf(sys) {
        return Object.assign({}, DEFAULT_DEDUCTIONS, (sys && sys.deductions) || {});
    }

    /**
     * بناء قطع التقطيع من شكل جاهز + تخصيمات النظام
     * الأطوال بالمليمتر — أي خطأ هنا = هدر/خسارة مباشرة
     * لا تعيين صامت لقطاع خاطئ: إن نقص الدور يُسجَّل تحذير
     */
    function buildShapeCuts(item, itemIndex) {
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        const found = findSystem(item.profileSystemId, shape.family);
        const sys = found.system;
        const warnings = [];
        if (found.warning) warnings.push(found.warning);
        if (!sys) {
            return { cuts: [], warnings: warnings.length ? warnings : ['تعذّر بناء القطع — أضف نظام قطاع أولاً'] };
        }
        if (shape.family !== 'facade' && sys.family && sys.family !== shape.family && sys.family !== 'facade') {
            warnings.push('تحذير: شكل «' + shape.nameAr + '» مع نظام «' + sys.nameAr + '» (' + sys.family + ')');
        }
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const angle = aluNum(sys.cutAngle) || aluNum(d.cutAngle) || 45;
        const miterExtra = angle === 45 ? aluNum(d.miterExtraMm) : 0;
        const beadInset = aluNum(d.beadInsetMm) || 8;
        const cuts = [];
        const idx = itemIndex + 1;
        const cols = Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = Math.max(1, Math.round(aluNum(item.bayRows) || 1));

        function push(role, labelAr, lengthMm, pieceQty, axisTag) {
            const len = aluRound(Math.max(1, lengthMm + miterExtra), 1);
            if (len < 1 || pieceQty <= 0) return;
            const part = partForRole(sys, role);
            if (!part) {
                warnings.push('ناقص قطاع لدور «' + (PART_ROLES[role] || role) + '» في نظام ' + sys.nameAr);
            }
            cuts.push({
                profileId: part ? part.id : '',
                profileSku: part ? part.sku : ('MISSING:' + role),
                profileName: part ? part.nameAr : ('⚠ ' + (PART_ROLES[role] || role)),
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
                withPackage: !!(part && part.withPackage),
                missingPart: !part
            });
        }

        if (shape.family === 'facade') {
            /* واجهة: إطار خارجي + أعمدة رأسية + عوارض أفقية + ضغط/كابينج اختياري */
            push('frame', 'إطار واجهة أفقي', W, 2, 'W');
            push('frame', 'إطار واجهة رأسي', H, 2, 'H');
            const mullionLen = H - aluNum(d.mullionDeductFull);
            const transomLen = W - aluNum(d.sashDeductW);
            push('mullion', 'عمود واجهة رأسي', mullionLen, Math.max(0, cols - 1), 'H');
            push('meeting', 'عارضة أفقية / Transom', Math.max(1, transomLen / Math.max(1, cols)), Math.max(0, rows - 1) * cols, 'W');
            push('bar', 'ضغط / Pressure bar', W, Math.max(1, rows), 'W');
            if (!partForRole(sys, 'sash') || !partForRole(sys, 'sash').withPackage) {
                const cellW = W / cols;
                const cellH = H / rows;
                push('bead', 'باكيت خلية — أفقي', Math.max(1, cellW - beadInset), cols * rows * 2, 'W');
                push('bead', 'باكيت خلية — رأسي', Math.max(1, cellH - beadInset), cols * rows * 2, 'H');
            }
            return { cuts: cuts, warnings: warnings };
        }

        /* حلق دائماً لشبابيك/أبواب */
        push('frame', 'حلق أفقي', W, 2, 'W');
        push('frame', 'حلق رأسي', H, 2, 'H');

        if (shape.family === 'sliding') {
            const sashW = (W / leaves) + aluNum(d.sashOverlapMm) - aluNum(d.splitBetweenSashesMm);
            const sashH = H - aluNum(d.sashDeductH);
            const mullDed = (item.shape === 'door_sliding' && aluNum(d.sashFromFloorMm) > 0)
                ? aluNum(d.mullionDeductWithHeel) : aluNum(d.mullionDeductFull);
            push('mullion', 'مرد / عمود التقاء', H - mullDed, Math.max(1, leaves - 1), 'H');
            push('sash', 'ضرفة — أفقي', sashW, leaves * 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, leaves * 2, 'H');
            if (aluNum(sys.tracksCount) >= 1) {
                push('knife', 'سكينة', W, Math.max(1, aluNum(sys.tracksCount)), 'W');
            }
            if (item.shape === 'door_sliding') {
                push('threshold', 'عتبة', W, 1, 'W');
            }
            const sashPart = partForRole(sys, 'sash');
            if (!sashPart || !sashPart.withPackage) {
                push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), leaves * 2, 'W');
                push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), leaves * 2, 'H');
            }
        } else if (item.shape === 'fixed') {
            push('bead', 'باكيت ثابت أفقي', Math.max(1, W - aluNum(d.glassFixedDeductW)), 2, 'W');
            push('bead', 'باكيت ثابت رأسي', Math.max(1, H - aluNum(d.glassFixedDeductH)), 2, 'H');
        } else {
            /* مفصلي / قلاب / باب مفصلي */
            const heel = (item.shape === 'door_hinged') ? aluNum(d.sashFromFloorMm) : 0;
            const sashW = W - aluNum(d.sashDeductW);
            const sashH = H - aluNum(d.sashDeductH) - heel;
            push('sash', 'ضرفة — أفقي', sashW, 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, 2, 'H');
            if (item.shape === 'door_hinged') {
                push('threshold', 'عتبة', W, 1, 'W');
            }
            const sashPart = partForRole(sys, 'sash');
            if (!sashPart || !sashPart.withPackage) {
                push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), 2, 'W');
                push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), 2, 'H');
            }
        }
        return { cuts: cuts, warnings: warnings };
    }

    function flattenShapeCuts(item, itemIndex) {
        const built = buildShapeCuts(item, itemIndex);
        if (Array.isArray(built)) return built; /* توافق قديم */
        (built.warnings || []).forEach(function (w) {
            /* تُعرض في التدقيق */
        });
        return built.cuts || [];
    }

    function shapeCutsWithMeta(item, itemIndex) {
        const built = buildShapeCuts(item, itemIndex);
        if (Array.isArray(built)) return { cuts: built, warnings: [] };
        return built;
    }

    function buildItemGlass(item) {
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        const found = findSystem(item.profileSystemId, shape.family);
        const sys = found.system;
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const cols = Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = Math.max(1, Math.round(aluNum(item.bayRows) || 1));
        let gW = 0;
        let gH = 0;
        let panels = qty;

        if (shape.family === 'facade') {
            const cellW = W / cols;
            const cellH = H / rows;
            gW = Math.max(0, aluRound(cellW - aluNum(d.glassFixedDeductW), 1));
            gH = Math.max(0, aluRound(cellH - aluNum(d.glassFixedDeductH), 1));
            panels = cols * rows * qty;
        } else if (item.shape === 'fixed') {
            gW = Math.max(0, aluRound(W - aluNum(d.glassFixedDeductW), 1));
            gH = Math.max(0, aluRound(H - aluNum(d.glassFixedDeductH), 1));
            panels = qty;
        } else if (shape.family === 'sliding') {
            /* زجاج السحاب من مقاس الضرفة لا من تقسيم العرض الخام فقط */
            const sashW = (W / leaves) + aluNum(d.sashOverlapMm) - aluNum(d.splitBetweenSashesMm);
            const sashH = H - aluNum(d.sashDeductH);
            gW = Math.max(0, aluRound(sashW - aluNum(d.glassSashDeductW), 1));
            gH = Math.max(0, aluRound(sashH - aluNum(d.glassSashDeductH), 1));
            panels = leaves * qty;
        } else {
            const heel = (item.shape === 'door_hinged') ? aluNum(d.sashFromFloorMm) : 0;
            const sashW = W - aluNum(d.sashDeductW);
            const sashH = H - aluNum(d.sashDeductH) - heel;
            gW = Math.max(0, aluRound(sashW - aluNum(d.glassSashDeductW), 1));
            gH = Math.max(0, aluRound(sashH - aluNum(d.glassSashDeductH), 1));
            panels = leaves * qty;
        }

        const areaM2 = aluRound((gW / 1000) * (gH / 1000) * panels, 3);
        const gl = aluGlass.find(function (g) { return g.id === item.glassId; }) || aluGlass[0];
        return {
            widthMm: gW, heightMm: gH, panels: panels, areaM2: areaM2,
            thicknessMm: gl ? aluNum(gl.thicknessMm) : 6,
            pricePerM2: gl ? aluNum(gl.pricePerM2) : 45,
            nameAr: gl ? gl.nameAr : 'زجاج',
            openingLabel: item.labelAr || '',
            warning: found.warning || ''
        };
    }

    function buildItemWire(item) {
        if (!item.hasWire) return null;
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
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
    }

    function calcAccessoryQty(acc, item, shape) {
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const cols = Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = Math.max(1, Math.round(aluNum(item.bayRows) || 1));
        const scope = acc.applyScope || 'all';
        /* نطاق التطبيق: إطار خارجي · ضرفة · الكل */
        let perimeterCm;
        let perimeterM;
        if (scope === 'frame') {
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
        }
        const val = Math.max(0.001, aluNum(acc.equationValue) || 1);
        let q = 0;
        switch (acc.equationType) {
            case 'per_corner':
                if (shape.family === 'facade') q = (4 + Math.max(0, cols - 1) * 2 + Math.max(0, rows - 1) * 2) * val * qty;
                else q = (4 + (shape.family === 'fixed' ? 0 : leaves * 4)) * val * qty;
                break;
            case 'per_perimeter_cm':
                q = Math.ceil(perimeterCm / val) * qty;
                break;
            case 'per_meter':
                q = aluRound(perimeterM * val * qty, 2);
                break;
            case 'per_leaf':
                if (shape.family === 'facade') q = cols * rows * val * qty;
                else if (shape.family === 'fixed' && scope === 'sash') q = 0;
                else q = leaves * val * qty;
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
            const scope = a.applyScope || 'all';
            if (scope === 'sash' && (shape.family === 'fixed' || shape.family === 'facade')) return false;
            return true;
        }).map(function (a) {
            const q = calcAccessoryQty(a, item, shape);
            const unit = mode === 'sell' ? aluNum(a.sellPrice) : aluNum(a.purchasePrice);
            return {
                id: a.id, code: a.code, nameAr: a.nameAr, colorAr: a.colorAr || '',
                qty: q, unitPrice: unit, total: aluRound(q * unit, 2), applyScope: a.applyScope || 'all'
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
        const formulaWarnings = [];

        items.forEach(function (item, i) {
            const built = shapeCutsWithMeta(item, i);
            allCuts = allCuts.concat(built.cuts || []);
            (built.warnings || []).forEach(function (w) {
                if (formulaWarnings.indexOf(w) < 0) formulaWarnings.push(w);
            });
            buildItemAccessories(item, est.priceMode).forEach(function (a) {
                const found = accessories.find(function (x) { return x.code === a.code && x.colorAr === a.colorAr; });
                if (found) {
                    found.qty = aluRound(found.qty + a.qty, 2);
                    found.total = aluRound(found.qty * found.unitPrice, 2);
                } else accessories.push(Object.assign({}, a));
            });
            const g = buildItemGlass(item);
            glassPanels.push(g);
            if (g.warning && formulaWarnings.indexOf(g.warning) < 0) formulaWarnings.push(g.warning);
            glassCost += g.areaM2 * g.pricePerM2;
            const wr = buildItemWire(item);
            if (wr) { wireRows.push(wr); wireCost += wr.total; }
            const color = aluColors.find(function (c) { return c.id === item.colorId; });
            const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
            const areaBill = billableAreaM2(item.widthMm, item.heightMm) * qty;
            billableM2 += areaBill;
            if (color) colorCost += areaBill * aluNum(color.surchargePerM2);
        });

        const missingParts = allCuts.filter(function (c) { return c.missingPart; }).length;

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
            formulaWarnings: formulaWarnings,
            missingParts: missingParts,
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
    function packBarsOnePass(pieces, stockLen, kerf, mode, seedBars) {
        const bars = (seedBars || []).map(function (s, i) {
            return {
                index: i + 1,
                stockMm: aluNum(s.lengthMm) || stockLen,
                usedMm: 0,
                remain: aluNum(s.lengthMm) || stockLen,
                pieces: [],
                kerfTotal: 0,
                fromRemnant: true,
                remnantId: s.id || ''
            };
        });
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
                bars.push({
                    index: bars.length + 1,
                    stockMm: stockLen,
                    usedMm: 0,
                    remain: stockLen,
                    pieces: [],
                    kerfTotal: 0,
                    fromRemnant: false
                });
                bestIdx = bars.length - 1;
            }
            const bar = bars[bestIdx];
            const extraKerf = bar.pieces.length ? kerf : 0;
            bar.pieces.push(Object.assign({}, piece, { kerfBefore: extraKerf }));
            bar.usedMm = aluRound(bar.usedMm + piece.lengthMm + extraKerf, 1);
            bar.kerfTotal = aluRound(bar.kerfTotal + extraKerf, 1);
            bar.remain = aluRound(bar.stockMm - bar.usedMm, 1);
        });
        /* إعادة ترقيم */
        bars.forEach(function (b, i) { b.index = i + 1; });
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

    function optimizeProfileCuts(cutRows, stockLen, kerf, remnantSeeds) {
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
        const seeds = (remnantSeeds || []).slice().sort(function (a, b) { return aluNum(b.lengthMm) - aluNum(a.lengthMm); });

        const bfd = packBarsOnePass(expanded, stock, k, 'best', seeds);
        const ffd = packBarsOnePass(expanded.slice(), stock, k, 'first', seeds);

        function score(bars) {
            const remnantMin = aluNum(aluSettings.remnantMinMm) || 200;
            let scrapMm = 0;
            let usableRemnantMm = 0;
            let newBars = 0;
            bars.forEach(function (b) {
                const r = Math.max(0, b.remain);
                if (r < remnantMin) scrapMm += r;
                else usableRemnantMm += r;
                if (!b.fromRemnant) newBars += 1;
            });
            const waste = scrapMm; /* الفضلة القابلة لإعادة الاستخدام ليست هدراً نهائياً في نبراس Pro */
            const used = bars.reduce(function (s, b) { return s + b.usedMm; }, 0);
            const totalBought = newBars * stock;
            return {
                bars: bars,
                groups: groupIdenticalBars(bars.filter(function (b) { return !b.fromRemnant || b.pieces.length; })),
                barCount: newBars,
                remnantBarsUsed: bars.filter(function (b) { return b.fromRemnant && b.pieces.length; }).length,
                wasteMm: aluRound(scrapMm, 1),
                scrapMm: aluRound(scrapMm, 1),
                usableRemnantMm: aluRound(usableRemnantMm, 1),
                usedMm: aluRound(used, 1),
                totalMm: totalBought + bars.filter(function (b) { return b.fromRemnant; }).reduce(function (s, b) { return s + b.stockMm; }, 0),
                wastePct: totalBought > 0 ? aluRound((scrapMm / Math.max(1, totalBought)) * 100, 2) : 0,
                yieldPct: totalBought > 0 ? aluRound((used / Math.max(1, totalBought + usableRemnantMm)) * 100, 2) : 0,
                costScore: newBars * stock + scrapMm * 0.15 - usableRemnantMm * 0.05
            };
        }

        /* دعم worst fit داخل pack: إن mode=worst اختر أكبر remain */
        function packWorst(pieces, stockLen2, kerf2, seeds2) {
            const bars = (seeds2 || []).map(function (s, i) {
                return {
                    index: i + 1, stockMm: aluNum(s.lengthMm), usedMm: 0,
                    remain: aluNum(s.lengthMm), pieces: [], kerfTotal: 0, fromRemnant: true, remnantId: s.id || ''
                };
            });
            pieces.forEach(function (piece) {
                let bestIdx = -1;
                let bestRemain = -1;
                for (let i = 0; i < bars.length; i++) {
                    const usedExtra = bars[i].pieces.length ? kerf2 : 0;
                    const need = piece.lengthMm + usedExtra;
                    const remain = bars[i].remain - need;
                    if (remain < -0.001) continue;
                    if (remain > bestRemain) { bestRemain = remain; bestIdx = i; }
                }
                if (bestIdx < 0) {
                    bars.push({ index: bars.length + 1, stockMm: stockLen2, usedMm: 0, remain: stockLen2, pieces: [], kerfTotal: 0, fromRemnant: false });
                    bestIdx = bars.length - 1;
                }
                const bar = bars[bestIdx];
                const extraKerf = bar.pieces.length ? kerf2 : 0;
                bar.pieces.push(Object.assign({}, piece, { kerfBefore: extraKerf }));
                bar.usedMm = aluRound(bar.usedMm + piece.lengthMm + extraKerf, 1);
                bar.kerfTotal = aluRound(bar.kerfTotal + extraKerf, 1);
                bar.remain = aluRound(bar.stockMm - bar.usedMm, 1);
            });
            bars.forEach(function (b, i) { b.index = i + 1; });
            return bars;
        }

        const wfdBars = packWorst(expanded.slice(), stock, k, seeds);
        const candidates = [
            Object.assign(score(bfd), { algorithm: 'Best-Fit Decreasing' }),
            Object.assign(score(ffd), { algorithm: 'First-Fit Decreasing' }),
            Object.assign(score(wfdBars), { algorithm: 'Worst-Fit Decreasing' })
        ];
        candidates.sort(function (a, b) {
            if (a.barCount !== b.barCount) return a.barCount - b.barCount;
            if (a.costScore !== b.costScore) return a.costScore - b.costScore;
            return a.wasteMm - b.wasteMm;
        });
        return candidates[0];
    }

    /**
     * حساب كمية الشراء مع خيار «آخر عود فاضل» (فيديو 04/08)
     * إذا المستخدم من آخر عود ≤ العتبة → شراء (المستخدم + أمان) بالمتر بدل عود كامل
     */
    function purchaseQtyForPlan(plan, stockMm, disableLastBar) {
        const newBars = (plan.bars || []).filter(function (b) { return !b.fromRemnant; });
        const barCount = plan.barCount != null ? plan.barCount : newBars.length;
        if (!aluSettings.lastBarRemnantEnabled || disableLastBar || barCount < 1 || !newBars.length) {
            return { fullBars: barCount, remnantMeters: 0, buyLabel: barCount + ' عود', costBarsEquivalent: barCount };
        }
        const last = newBars[newBars.length - 1];
        const threshold = aluNum(aluSettings.lastBarThresholdMm) || 4500;
        const safety = aluNum(aluSettings.lastBarSafetyMm) || 50;
        if (last.usedMm <= threshold) {
            const meters = aluRound((last.usedMm + safety) / 1000, 3);
            const fullBars = Math.max(0, barCount - 1);
            return {
                fullBars: fullBars,
                remnantMeters: meters,
                buyLabel: fullBars + ' عود + ' + meters + ' م',
                costBarsEquivalent: fullBars + (meters * 1000 / Math.max(1, stockMm))
            };
        }
        return { fullBars: barCount, remnantMeters: 0, buyLabel: barCount + ' عود', costBarsEquivalent: barCount };
    }

    function remnantsForProfile(profileId, role) {
        if (!aluSettings.useRemnantBank) return [];
        return (aluRemnants || []).filter(function (r) {
            if (r.used) return false;
            if (aluNum(r.lengthMm) < (aluNum(aluSettings.remnantMinMm) || 200)) return false;
            return (profileId && r.profileId === profileId) || (!profileId && r.role === role);
        });
    }

    function buildPlanForStock(cuts, stock, kerf, weightAdj) {
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
        let totalCost = 0;
        let totalScrapKg = 0;
        let totalPieces = 0;
        let remnantsUsed = 0;
        const consumedRemnantIds = [];

        Object.keys(groups).forEach(function (key) {
            const rows = groups[key];
            const sample = rows[0];
            const seeds = remnantsForProfile(sample.profileId, sample.role).map(function (r) {
                return { id: r.id, lengthMm: r.lengthMm };
            });
            const plan = optimizeProfileCuts(rows, stock, kerf, seeds);
            plan.bars.forEach(function (b) {
                if (b.fromRemnant && b.pieces.length && b.remnantId) {
                    consumedRemnantIds.push(b.remnantId);
                    remnantsUsed += 1;
                }
            });
            const disableLast = rows.some(function (r) { return r.disableLastBarRemnant; });
            const purchase = purchaseQtyForPlan(plan, stock, disableLast);
            const weightKgPerM = aluNum(sample.weightKgPerM);
            const pricePerKg = aluNum(sample.pricePerKg);
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
            totalWaste += plan.scrapMm;
            totalCost += cost;
            totalScrapKg += scrapKg;
        });

        const boughtMm = totalBars * stock;
        return {
            plans: plans,
            totalBars: totalBars,
            totalPieces: totalPieces,
            totalWasteMm: aluRound(totalWaste, 1),
            wastePct: boughtMm > 0 ? aluRound((totalWaste / boughtMm) * 100, 2) : 0,
            yieldPct: boughtMm > 0 ? aluRound(((boughtMm - totalWaste) / boughtMm) * 100, 2) : 0,
            profilesCost: aluRound(totalCost, 2),
            scrapKg: aluRound(totalScrapKg, 3),
            scrapCredit: aluRound(totalScrapKg * aluNum(aluSettings.scrapPricePerKg), 2),
            remnantsUsed: remnantsUsed,
            consumedRemnantIds: consumedRemnantIds,
            kerfMm: kerf,
            stockBarMm: stock,
            costScore: totalCost + totalWaste * 0.001
        };
    }

    function runFullCuttingPlan(cuts, opts) {
        opts = opts || {};
        const preferred = aluNum(opts.stockBarMm) || aluNum(aluSettings.stockBarMm) || 6500;
        const kerf = aluNum(opts.kerfMm != null ? opts.kerfMm : aluSettings.kerfMm) || 10;
        const weightAdj = 1 + (aluNum(opts.weightAdjustPct) / 100);
        let lengths = [preferred];
        if (aluSettings.autoCompareStocks !== false) {
            const extra = (aluSettings.compareStockLengths || [6000, 6500, 7000]).map(aluNum).filter(function (n) { return n >= 1000; });
            lengths = extra.concat([preferred]).filter(function (v, i, a) { return a.indexOf(v) === i; });
        }
        const comparisons = lengths.map(function (len) {
            return buildPlanForStock(cuts, len, kerf, weightAdj);
        });
        comparisons.sort(function (a, b) {
            if (a.profilesCost !== b.profilesCost) return a.profilesCost - b.profilesCost;
            if (a.totalBars !== b.totalBars) return a.totalBars - b.totalBars;
            return a.wastePct - b.wastePct;
        });
        const best = comparisons[0];
        best.stockComparisons = comparisons.map(function (c) {
            return {
                stockBarMm: c.stockBarMm,
                totalBars: c.totalBars,
                wastePct: c.wastePct,
                profilesCost: c.profilesCost,
                remnantsUsed: c.remnantsUsed,
                selected: c.stockBarMm === best.stockBarMm
            };
        });
        best.createdAt = new Date().toISOString();
        best.nebrasPro = true;
        return best;
    }

    function commitRemnantsFromPlan(result, meta) {
        if (!result || !aluSettings.saveRemnantsAfterCut) return false;
        if (result.remnantsCommitted) return false;
        const remnantMin = aluNum(aluSettings.remnantMinMm) || 200;
        const jobId = (meta && meta.jobId) || result.commitId || '';
        (result.consumedRemnantIds || []).forEach(function (id) {
            const r = aluRemnants.find(function (x) { return x.id === id; });
            if (r) r.used = true;
        });
        (result.plans || []).forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b, barIdx) {
                if (b.remain >= remnantMin) {
                    aluRemnants.push({
                        id: aluId('rem'),
                        profileId: pl.profileId,
                        profileSku: pl.profileSku,
                        profileName: pl.profileName,
                        role: pl.role,
                        lengthMm: b.remain,
                        fromEstimate: (meta && meta.estimateRef) || '',
                        fromJobId: jobId,
                        barIndex: barIdx,
                        createdAt: new Date().toISOString(),
                        used: false
                    });
                }
            });
        });
        result.remnantsCommitted = true;
        result.commitId = jobId || result.commitId || aluId('commit');
        aluRemnants = aluRemnants.filter(function (r) { return !r.used; }).slice(-300);
        persistAluminumCuttingCloud(['aluminum_remnants']);
        return true;
    }

    function explainEstimateFormulas(est) {
        const items = (est && (est.items || est.openings)) || [];
        return items.map(function (item, i) {
            const shape = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
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
            { id: 'audit', icon: 'fas fa-microscope', label: 'تدقيق دقة' },
            { id: 'remnants', icon: 'fas fa-recycle', label: 'بنك فضلة' },
            { id: 'shop', icon: 'fas fa-industry', label: 'ورشة' },
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
        else if (aluActiveTab === 'audit') body = renderAluAudit();
        else if (aluActiveTab === 'remnants') body = renderAluRemnants();
        else if (aluActiveTab === 'shop') body = renderAluShop();
        else if (aluActiveTab === 'reports') body = renderAluReports();
        else if (aluActiveTab === 'settings') body = renderAluSettings();

        host.innerHTML = nav + '<div class="alu-cut-panel">' + body + '</div>';
        if (aluActiveTab === 'estimate') {
            try { toggleAluBayFields(); } catch (e) { /* ignore */ }
        }
    }

    function renderAluDashboard() {
        const lastJob = aluCutJobs[aluCutJobs.length - 1];
        const avgWaste = aluCutJobs.length
            ? aluRound(aluCutJobs.reduce(function (s, j) { return s + aluNum(j.wastePct); }, 0) / aluCutJobs.length, 2)
            : 0;
        const liveRem = aluRemnants.filter(function (r) { return !r.used; }).length;
        return '<div class="alu-cut-hero"><div class="alu-cut-hero-glow"></div><div class="alu-cut-hero-inner">' +
            '<p class="alu-cut-kicker">نبراس Pro · أقوى من برامج التخصيم التقليدية</p>' +
            '<h3>تخصيم قطاعات الألومنيوم — دقة ورشة كاملة</h3>' +
            '<p>مقارنة أعواد 6/6.5/7م تلقائياً · 3 خوارزميات تقطيع · بنك فضلة يعيد الاستخدام · تدقيق معادلات قطعة بقطعة · استيكر وتفريز للورشة · مراحل تنفيذ.</p>' +
            '<div class="alu-cut-hero-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newAluEstimate();setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'cutting\')"><i class="fas fa-scissors"></i> تقطيع ذكي</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'audit\')"><i class="fas fa-microscope"></i> تدقيق دقة</button>' +
            '</div></div></div>' +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + aluSystems.length + '</strong><span>أنظمة</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluEstimates.length + '</strong><span>مقايسات</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + liveRem + '</strong><span>فضلات حية</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + (lastJob ? lastJob.wastePct + '%' : '—') + '</strong><span>آخر هدر</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + (avgWaste || '—') + (avgWaste ? '%' : '') + '</strong><span>متوسط هدر</span></div>' +
            '</div>' +
            '<div class="alu-pro-badge-row">' +
            '<span class="alu-pro-badge">مقارنة أعواد متعددة</span>' +
            '<span class="alu-pro-badge">Best/First/Worst Fit</span>' +
            '<span class="alu-pro-badge">بنك فضلة</span>' +
            '<span class="alu-pro-badge">آخر عود فاضل</span>' +
            '<span class="alu-pro-badge">تدقيق معادلات</span>' +
            '<span class="alu-pro-badge">استيكر + تفريز</span>' +
            '</div>' +
            '<p class="alu-cut-note"><i class="fas fa-shield-halved"></i> نبراس Pro: الفضلة القابلة لإعادة الاستخدام لا تُحسب هدراً نهائياً — تُحفظ في بنك الفضلة للمقايسة التالية.</p>';
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
            const bay = (sh.family === 'facade')
                ? (' · بايات ' + Math.max(1, aluNum(it.bayCols) || 1) + '×' + Math.max(1, aluNum(it.bayRows) || 1))
                : '';
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + aluEsc(it.labelAr || sh.nameAr || 'بند') + '</strong>' +
                '<small>' + aluEsc(sh.nameAr || '') + ' — ' + aluNum(it.widthMm) + '×' + aluNum(it.heightMm) +
                ' مم × ' + aluNum(it.qty) + bay +
                (aluSettings.showHandleHeight && it.handleHeightMm ? ' · مقبض ' + aluNum(it.handleHeightMm) + ' مم' : '') +
                (it.locationCode ? ' · موقع ' + aluEsc(it.locationCode) : '') +
                '</small></div>' +
                '<div class="erp-row-actions">' +
                '<button type="button" class="nebras-users-btn" onclick="editAluItem(' + i + ')" aria-label="تعديل"><i class="fas fa-pen"></i></button>' +
                '<button type="button" class="erp-row-del" onclick="removeAluItem(' + i + ')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</div></article>';
        }).join('') || '<p class="erp-empty">أضف بنوداً من الأشكال الجاهزة.</p>';

        const totals = computeEstimateTotals(d);
        const warnHtml = (totals.formulaWarnings && totals.formulaWarnings.length)
            ? '<div class="alu-cut-warn"><strong>تحذيرات دقة:</strong><ul>' +
              totals.formulaWarnings.map(function (w) { return '<li>' + aluEsc(w) + '</li>'; }).join('') +
              '</ul>' + (totals.missingParts ? '<p>قطاعات ناقصة في الأدوار: ' + totals.missingParts + ' قطعة</p>' : '') +
              '</div>'
            : '';
        return '<div class="alu-cut-form-card">' +
            '<h4><i class="fas fa-ruler-combined"></i> مقايسة — إضافة بنود</h4>' +
            warnHtml +
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
            '<input type="hidden" id="alu-op-edit-idx" value="">' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>الشكل</span><select id="alu-op-shape" onchange="toggleAluBayFields()">' + shapeOpts + '</select></label>' +
            '<label class="nebras-field"><span>نظام القطاع</span><select id="alu-op-sys">' + sysOpts + '</select></label>' +
            '<label class="nebras-field"><span>العرض مم</span><input type="number" id="alu-op-w" min="200" placeholder="1200"></label>' +
            '<label class="nebras-field"><span>الارتفاع مم</span><input type="number" id="alu-op-h" min="200" placeholder="1400"></label>' +
            '<label class="nebras-field"><span>الكمية</span><input type="number" id="alu-op-qty" min="1" value="1"></label>' +
            '<label class="nebras-field alu-bay-only" style="display:none"><span>أعمدة باي</span><input type="number" id="alu-op-cols" min="1" value="1"></label>' +
            '<label class="nebras-field alu-bay-only" style="display:none"><span>صفوف باي</span><input type="number" id="alu-op-rows" min="1" value="1"></label>' +
            '<label class="nebras-field"><span>وصف / موقع</span><input type="text" id="alu-op-label" placeholder="شباك غرفة 1"></label>' +
            '<label class="nebras-field"><span>كود موقع</span><input type="text" id="alu-op-loc" placeholder="A-01"></label>' +
            '<label class="nebras-field"><span>ارتفاع مقبض مم</span><input type="number" id="alu-op-handle" value="50"></label>' +
            '<label class="nebras-field"><span>زجاج</span><select id="alu-op-glass">' + glassOpts + '</select></label>' +
            '<label class="nebras-field"><span>لون</span><select id="alu-op-color">' + colorOpts + '</select></label>' +
            '<label class="nebras-field"><span>سلك</span><select id="alu-op-wire">' + wireOpts + '</select></label>' +
            '<label class="nebras-field"><span>مع سلك؟</span><select id="alu-op-haswire"><option value="0">لا</option><option value="1">نعم</option></select></label>' +
            '<label class="nebras-field"><span>سلك ثابت</span><select id="alu-op-wirefix"><option value="none">متحرك</option><option value="top">فوق</option><option value="bottom">تحت</option><option value="both">فوق وتحت</option></select></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="alu-op-submit" onclick="addAluItem()"><i class="fas fa-plus"></i> إضافة البند</button>' +
            '<button type="button" class="nebras-users-btn" onclick="clearAluItemForm()">مسح الحقول</button>' +
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

    function toggleAluBayFields() {
        const shape = aluField('alu-op-shape');
        const show = shape === 'facade_panel' || shape === 'facade_bay';
        document.querySelectorAll('.alu-bay-only').forEach(function (el) {
            el.style.display = show ? '' : 'none';
        });
        if (shape === 'facade_panel') {
            const c = document.getElementById('alu-op-cols');
            const r = document.getElementById('alu-op-rows');
            if (c && !c.value) c.value = '1';
            if (r && !r.value) r.value = '1';
        }
        /* اقتراح نظام بنفس العائلة */
        const fam = (READY_SHAPES[shape] || {}).family;
        if (fam) {
            const match = aluSystems.find(function (s) { return s.active !== false && s.family === fam; });
            const sel = document.getElementById('alu-op-sys');
            if (match && sel) sel.value = match.id;
        }
    }

    function readAluItemFromForm() {
        const shape = aluField('alu-op-shape') || 'sliding2';
        return {
            shape: shape,
            profileSystemId: aluField('alu-op-sys') || (aluSystems[0] || {}).id,
            widthMm: aluNum(aluField('alu-op-w')),
            heightMm: aluNum(aluField('alu-op-h')),
            qty: Math.max(1, Math.round(aluNum(aluField('alu-op-qty')) || 1)),
            bayCols: Math.max(1, Math.round(aluNum(aluField('alu-op-cols')) || 1)),
            bayRows: Math.max(1, Math.round(aluNum(aluField('alu-op-rows')) || 1)),
            labelAr: aluField('alu-op-label') || (READY_SHAPES[shape] || {}).nameAr || 'بند',
            locationCode: aluField('alu-op-loc'),
            handleHeightMm: aluNum(aluField('alu-op-handle')) || 50,
            glassId: aluField('alu-op-glass'),
            colorId: aluField('alu-op-color'),
            wireId: aluField('alu-op-wire'),
            hasWire: aluField('alu-op-haswire') === '1',
            wireFixed: aluField('alu-op-wirefix') || 'none'
        };
    }

    function clearAluItemForm() {
        ['alu-op-w', 'alu-op-h', 'alu-op-label', 'alu-op-loc', 'alu-op-edit-idx'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.value = id === 'alu-op-edit-idx' ? '' : '';
        });
        const qty = document.getElementById('alu-op-qty');
        if (qty) qty.value = '1';
        const btn = document.getElementById('alu-op-submit');
        if (btn) btn.innerHTML = '<i class="fas fa-plus"></i> إضافة البند';
        toggleAluBayFields();
    }

    function addAluItem() {
        if (!aluEstimateDraft) aluEstimateDraft = newEstimateDraft();
        syncEstimateDraftFields();
        const row = readAluItemFromForm();
        if (row.widthMm < 200 || row.heightMm < 200) { alert('أدخل عرض وارتفاع صحيحين (مم).'); return; }
        const editIdx = aluField('alu-op-edit-idx');
        aluEstimateDraft.items = aluEstimateDraft.items || [];
        if (editIdx !== '' && !isNaN(parseInt(editIdx, 10))) {
            const i = parseInt(editIdx, 10);
            if (aluEstimateDraft.items[i]) {
                row.id = aluEstimateDraft.items[i].id;
                aluEstimateDraft.items[i] = row;
            } else {
                row.id = aluId('op');
                aluEstimateDraft.items.push(row);
            }
        } else {
            row.id = aluId('op');
            aluEstimateDraft.items.push(row);
        }
        renderAluminumCuttingPanel();
    }

    function editAluItem(i) {
        if (!aluEstimateDraft || !aluEstimateDraft.items || !aluEstimateDraft.items[i]) return;
        const it = aluEstimateDraft.items[i];
        const set = function (id, v) {
            const el = document.getElementById(id);
            if (el) el.value = v == null ? '' : String(v);
        };
        set('alu-op-edit-idx', i);
        set('alu-op-shape', it.shape || 'sliding2');
        set('alu-op-sys', it.profileSystemId || '');
        set('alu-op-w', it.widthMm);
        set('alu-op-h', it.heightMm);
        set('alu-op-qty', it.qty || 1);
        set('alu-op-cols', it.bayCols || 1);
        set('alu-op-rows', it.bayRows || 1);
        set('alu-op-label', it.labelAr || '');
        set('alu-op-loc', it.locationCode || '');
        set('alu-op-handle', it.handleHeightMm || 50);
        set('alu-op-glass', it.glassId || '');
        set('alu-op-color', it.colorId || '');
        set('alu-op-wire', it.wireId || '');
        set('alu-op-haswire', it.hasWire ? '1' : '0');
        set('alu-op-wirefix', it.wireFixed || 'none');
        toggleAluBayFields();
        const btn = document.getElementById('alu-op-submit');
        if (btn) btn.innerHTML = '<i class="fas fa-check"></i> تحديث البند';
        const card = document.querySelector('.alu-cut-subcard');
        if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
            '<h4><i class="fas fa-scissors"></i> تقرير تقطيع Pro — كاتنج ليست</h4>' +
            '<p class="alu-cut-note">' + aluEsc(aluCutDraft.estimateRef || '') + ' · ' + aluEsc(aluCutDraft.customerName || '') +
            ' · العود الأمثل <strong>' + result.stockBarMm + ' مم</strong> · منشار ' + result.kerfMm + ' مم' +
            (result.remnantsUsed ? ' · استُخدمت ' + result.remnantsUsed + ' فضلة من البنك' : '') + '</p>' +
            (result.stockComparisons && result.stockComparisons.length > 1
                ? '<div class="alu-compare-table"><table class="alu-table"><thead><tr><th>طول العود</th><th>أعواد</th><th>هدر %</th><th>تكلفة</th><th>فضلات مستخدمة</th><th></th></tr></thead><tbody>' +
                result.stockComparisons.map(function (c) {
                    return '<tr class="' + (c.selected ? 'alu-row-best' : '') + '"><td>' + c.stockBarMm + '</td><td>' + c.totalBars +
                        '</td><td>' + c.wastePct + '</td><td>' + c.profilesCost + '</td><td>' + c.remnantsUsed +
                        '</td><td>' + (c.selected ? '<strong>الأمثل</strong>' : '') + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                : '') +
            '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + result.totalPieces + '</strong><span>قطع</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.totalBars + '</strong><span>أعواد شراء</span></div>' +
            '<div class="alu-cut-kpi alu-cut-kpi--accent"><strong>' + result.wastePct + '%</strong><span>هدر سكراب</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.scrapKg + '</strong><span>كغ سكراب</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + result.profilesCost + '</strong><span>تكلفة شراء</span></div>' +
            '</div>' + plansHtml +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluCutJob()"><i class="fas fa-save"></i> حفظ + إضافة الفضلة للبنك</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluCutReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'shop\')">استيكر الورشة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'reports\')">تقارير المشتريات</button>' +
            '</div></div>';
    }

    function saveAluCutJob() {
        if (!requireAluAccess() || !aluCutDraft || !aluCutDraft.lastResult) return;
        if (aluCutDraft.savedJobId || aluCutDraft.lastResult.remnantsCommitted) {
            if (typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('هذه الخطة محفوظة مسبقاً — لن تُضاعَف الفضلة', 'ok');
            } else {
                alert('هذه الخطة محفوظة مسبقاً — لن تُضاعَف الفضلة.');
            }
            return;
        }
        const jobId = aluId('cut');
        const job = {
            id: jobId,
            estimateId: aluCutDraft.estimateId,
            estimateRef: aluCutDraft.estimateRef,
            customerName: aluCutDraft.customerName,
            result: aluCutDraft.lastResult,
            accessories: aluCutDraft.accessories,
            glassPanels: aluCutDraft.glassPanels,
            wastePct: aluCutDraft.lastResult.wastePct,
            totalBars: aluCutDraft.lastResult.totalBars,
            stockBarMm: aluCutDraft.lastResult.stockBarMm,
            createdAt: new Date().toISOString()
        };
        aluCutJobs.push(job);
        commitRemnantsFromPlan(aluCutDraft.lastResult, { estimateRef: aluCutDraft.estimateRef, jobId: jobId });
        aluCutDraft.savedJobId = jobId;
        aluLog('قطع', 'حفظ خطة ' + (aluCutDraft.estimateRef || '') + ' · عود ' + job.stockBarMm + ' · هدر ' + job.wastePct + '%');
        persistAluminumCuttingCloud(['aluminum_cut_jobs', 'aluminum_remnants', 'aluminum_audit']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ الخطة وإضافة الفضلة لبنك إعادة الاستخدام', 'ok');
        renderAluminumCuttingPanel();
    }

    function renderAluAudit() {
        const est = aluEstimateDraft && (aluEstimateDraft.items || []).length
            ? aluEstimateDraft
            : (aluEstimates[aluEstimates.length - 1] || null);
        if (!est) {
            return '<p class="erp-empty">افتح مقايسة أولاً لعرض تدقيق المعادلات قطعة بقطعة.</p>';
        }
        const explained = explainEstimateFormulas(est);
        const blocks = explained.map(function (ex) {
            const cutRows = ex.cuts.map(function (c) {
                return '<tr><td>' + aluEsc(c.code) + '</td><td>' + aluEsc(c.label) + '</td><td>' + aluEsc(c.sku) +
                    '</td><td>' + c.lengthMm + '</td><td>' + c.qty + '</td><td>' + aluEsc(c.role) + '</td></tr>';
            }).join('');
            const d = ex.deductions || {};
            return '<section class="alu-cut-form-card"><h4>' + aluEsc(ex.item) + ' <small>' + aluEsc(ex.system) + '</small></h4>' +
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
                ' · إكسسوارات: ' + (ex.accessories || []).length + ' بند</p></section>';
        }).join('');
        return '<div class="alu-cut-form-card"><h4><i class="fas fa-microscope"></i> تدقيق الدقة — شفافية كاملة</h4>' +
            '<p class="alu-cut-note">كل طول ظاهر هنا ناتج من التخصيمات الحالية للنظام. راجع قبل القص — أي رقم خاطئ في التخصيمات يظهر فوراً.</p></div>' +
            blocks +
            '<div class="alu-cut-form-card"><h4>سجل العمليات</h4><div class="nebras-erp-list">' +
            (aluAudit.slice(0, 20).map(function (a) {
                return '<article class="erp-row"><div class="erp-row-main"><strong>' + aluEsc(a.action) + '</strong><small>' +
                    aluEsc(a.at) + ' · ' + aluEsc(a.user) + ' — ' + aluEsc(a.detail) + '</small></div></article>';
            }).join('') || '<p class="erp-empty">لا سجل بعد.</p>') +
            '</div></div>';
    }

    function renderAluRemnants() {
        const live = aluRemnants.filter(function (r) { return !r.used; });
        const rows = live.map(function (r, i) {
            return '<tr><td>' + aluEsc(r.profileName) + '</td><td>' + aluEsc(r.profileSku) + '</td><td>' +
                r.lengthMm + '</td><td>' + aluEsc(r.fromEstimate || '') + '</td><td>' +
                '<button type="button" class="erp-tag" onclick="discardAluRemnant(\'' + aluEsc(r.id) + '\')">استبعاد</button></td></tr>';
        }).join('') || '<tr><td colspan="5">لا فضلات حية — ستُضاف تلقائياً بعد حفظ خطة تقطيع.</td></tr>';
        return '<div class="alu-cut-form-card"><h4><i class="fas fa-recycle"></i> بنك الفضلة — ميزة نبراس Pro</h4>' +
            '<p class="alu-cut-note">الفضلة ≥ ' + aluSettings.remnantMinMm + ' مم تُحفظ وتُستهلك تلقائياً في التقطيع التالي لنفس القطاع قبل شراء أعواد جديدة. هذا يوفر تكلفة لا توفرها البرامج التي ترمي الفضلة كهدر.</p>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>قطاع</th><th>SKU</th><th>طول مم</th><th>من مقايسة</th><th></th></tr></thead><tbody>' +
            rows + '</tbody></table></div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn" onclick="clearAluRemnants()">تفريغ البنك</button>' +
            '<button type="button" class="nebras-users-btn" onclick="exportAluSystemsJson()">تصدير الأنظمة JSON</button>' +
            '<label class="nebras-users-btn" style="cursor:pointer">استيراد أنظمة<input type="file" accept="application/json" hidden onchange="importAluSystemsJson(event)"></label>' +
            '</div></div>';
    }

    function discardAluRemnant(id) {
        aluRemnants = aluRemnants.filter(function (r) { return r.id !== id; });
        persistAluminumCuttingCloud(['aluminum_remnants']);
        renderAluminumCuttingPanel();
    }
    function clearAluRemnants() {
        if (!confirm('تفريغ بنك الفضلة؟')) return;
        aluRemnants = [];
        persistAluminumCuttingCloud(['aluminum_remnants']);
        renderAluminumCuttingPanel();
    }

    function exportAluSystemsJson() {
        const blob = new Blob([JSON.stringify({ systems: aluSystems, accessories: aluAccessories, settings: aluSettings }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-aluminum-systems.json';
        a.click();
        aluLog('تصدير', 'تصدير أنظمة وإكسسوارات');
    }

    function importAluSystemsJson(ev) {
        const file = ev && ev.target && ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
            try {
                const data = JSON.parse(String(reader.result || '{}'));
                if (Array.isArray(data.systems) && data.systems.length) aluSystems = data.systems;
                if (Array.isArray(data.accessories) && data.accessories.length) aluAccessories = data.accessories;
                if (data.settings && typeof data.settings === 'object') aluSettings = Object.assign({}, aluSettings, data.settings);
                persistAluminumCuttingCloud();
                aluLog('استيراد', 'استيراد أنظمة من ملف');
                alert('تم الاستيراد بنجاح.');
                renderAluminumCuttingPanel();
            } catch (e) { alert('ملف غير صالح.'); }
        };
        reader.readAsText(file);
    }

    function renderAluShop() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        const cut = aluCutDraft && aluCutDraft.lastResult;
        if (!cut) {
            return '<p class="erp-empty">شغّل التقطيع أولاً لطباعة استيكرات الورشة وتقرير التفريز.</p>';
        }
        let stickers = 0;
        cut.plans.forEach(function (pl) {
            pl.plan.bars.forEach(function (b) { stickers += b.pieces.length; });
        });
        const milling = (est && (est.items || []) || []).map(function (it, i) {
            const handle = aluNum(it.handleHeightMm) || 50;
            return '<tr><td>' + aluEsc(it.labelAr || ('بند ' + (i + 1))) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + handle + '</td><td>' + (READY_SHAPES[it.shape] || {}).nameAr + '</td>' +
                '<td>مقبض على ' + handle + ' مم من الأسفل · مفصّلات حسب النظام</td></tr>';
        }).join('') || '<tr><td colspan="5">—</td></tr>';

        return '<div class="alu-cut-form-card"><h4><i class="fas fa-industry"></i> ورشة — استيكر + تفريز</h4>' +
            '<p class="alu-cut-note">عدد قطع الاستيكر المتوقعة: <strong>' + stickers + '</strong> — كل قطعة برمز W/H ورقم البند لتجنب الخطأ في القص.</p>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="printAluStickers()"><i class="fas fa-tags"></i> طباعة استيكرات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluMillingReport()"><i class="fas fa-drill"></i> تقرير تفريز</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'approved\')">اعتماد المقايسة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'in_production\')">تحويل للإنتاج</button>' +
            '</div></div>' +
            '<div class="alu-cut-form-card"><h4>تفريز / مواقع التركيب</h4>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>بند</th><th>مقاس</th><th>مقبض مم</th><th>شكل</th><th>تعليمات</th></tr></thead><tbody>' +
            milling + '</tbody></table></div></div>' +
            renderAluStagesBlock(est);
    }

    function renderAluStagesBlock(est) {
        if (!est) return '';
        const stages = est.stages || [
            { name: 'قياس/اعتماد', done: !!est.status },
            { name: 'تقطيع', done: est.status === 'in_production' || est.status === 'done' },
            { name: 'تجميع', done: est.status === 'done' },
            { name: 'تركيب', done: false }
        ];
        return '<div class="alu-cut-form-card"><h4>مراحل التنفيذ</h4>' +
            '<p>الحالة: <strong>' + aluEsc(est.status || 'draft') + '</strong></p>' +
            '<div class="alu-stages">' + stages.map(function (s) {
                return '<span class="alu-stage' + (s.done ? ' is-done' : '') + '">' + aluEsc(s.name) + '</span>';
            }).join('') + '</div>' +
            '<div class="erp-form-grid" style="margin-top:0.75rem">' +
            '<label class="nebras-field"><span>مشتريات فعلية</span><input type="number" id="alu-actual-buy" value="' + aluNum(est.actualPurchases) + '"></label>' +
            '<label class="nebras-field"><span>مصاريف إضافية</span><input type="number" id="alu-extra-exp" value="' + aluNum(est.extraExpenses) + '"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn" onclick="saveAluEstimateFinance()">حفظ التكاليف الفعلية</button></div>';
    }

    function setAluEstimateStatus(status) {
        if (!aluEstimateDraft && aluEstimates.length) aluEstimateDraft = JSON.parse(JSON.stringify(aluEstimates[aluEstimates.length - 1]));
        if (!aluEstimateDraft) { alert('لا مقايسة'); return; }
        aluEstimateDraft.status = status;
        aluEstimateDraft.updatedAt = new Date().toISOString();
        const idx = aluEstimates.findIndex(function (e) { return e.id === aluEstimateDraft.id; });
        if (idx >= 0) aluEstimates[idx] = JSON.parse(JSON.stringify(aluEstimateDraft));
        else aluEstimates.push(JSON.parse(JSON.stringify(aluEstimateDraft)));
        aluLog('حالة', aluEstimateDraft.ref + ' → ' + status);
        persistAluminumCuttingCloud(['aluminum_estimates', 'aluminum_audit']);
        renderAluminumCuttingPanel();
    }

    function saveAluEstimateFinance() {
        if (!aluEstimateDraft) return;
        aluEstimateDraft.actualPurchases = aluNum(aluField('alu-actual-buy'));
        aluEstimateDraft.extraExpenses = aluNum(aluField('alu-extra-exp'));
        const idx = aluEstimates.findIndex(function (e) { return e.id === aluEstimateDraft.id; });
        if (idx >= 0) aluEstimates[idx] = JSON.parse(JSON.stringify(aluEstimateDraft));
        persistAluminumCuttingCloud(['aluminum_estimates']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ التكاليف الفعلية', 'ok');
    }

    function printAluStickers() {
        if (!aluCutDraft || !aluCutDraft.lastResult) return;
        let html = '<h1>استيكرات تقطيع — نبراس</h1><div style="display:flex;flex-wrap:wrap;gap:8px">';
        aluCutDraft.lastResult.plans.forEach(function (pl) {
            pl.plan.bars.forEach(function (b) {
                b.pieces.forEach(function (p) {
                    html += '<div style="border:1px solid #333;padding:8px 10px;width:140px;font-size:12px">' +
                        '<strong>' + aluEsc(p.code) + '</strong><br>' + p.lengthMm + ' مم<br>' +
                        aluEsc(p.labelAr) + '<br><small>' + aluEsc(pl.profileSku) + '</small></div>';
                });
            });
        });
        html += '</div>';
        openPrintWindow('استيكرات', html);
    }

    function printAluMillingReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        let html = '<h1>تقرير تفريز — نبراس</h1><p class="meta">' + aluEsc(est.ref) + '</p><table><tr><th>بند</th><th>مقاس</th><th>مقبض</th><th>ملاحظات</th></tr>';
        (est.items || []).forEach(function (it) {
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + (it.handleHeightMm || 50) + ' مم</td><td>تفريز حسب كتالوج النظام</td></tr>';
        });
        html += '</table>';
        openPrintWindow('تفريز', html);
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
        const sys = getSystem(aluField('alu-part-sys'));
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
        const sys = getSystem(aluEditSystemId) || aluSystems[0];
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
            ['cutAngle', 'زاوية القص (45 أو 90)'],
            ['miterExtraMm', 'بدل زاوية 45° (مم لكل قطعة)'],
            ['beadInsetMm', 'تخصيم الباكيت من داخل الضرفة']
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
        const sys = getSystem(aluField('alu-ded-sys') || aluEditSystemId);
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
                ' · نطاق ' + aluEsc(a.applyScope || 'all') +
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
            '<label class="nebras-field"><span>نطاق التطبيق</span><select id="alu-acc-scope"><option value="all">الكل</option><option value="frame">الإطار فقط</option><option value="sash">الضرفة فقط</option></select></label>' +
            '<label class="nebras-field"><span>عائلة فقط</span><select id="alu-acc-fam"><option value="">الكل</option><option value="hinged">مفصلي</option><option value="sliding">سحاب</option><option value="facade">واجهة</option></select></label>' +
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
                'alu-acc-color': a.colorAr || '', 'alu-acc-fam': a.familyOnly || '',
                'alu-acc-scope': a.applyScope || 'all'
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
            applyScope: aluField('alu-acc-scope') || 'all',
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
            '<label class="nebras-field"><span>مقارنة أعواد تلقائياً</span><select id="alu-set-cmp"><option value="1"' + (aluSettings.autoCompareStocks !== false ? ' selected' : '') + '>نعم (أقوى)</option><option value="0"' + (aluSettings.autoCompareStocks === false ? ' selected' : '') + '>لا</option></select></label>' +
            '<label class="nebras-field"><span>أطوال المقارنة مم</span><input type="text" id="alu-set-cmp-list" value="' + aluEsc((aluSettings.compareStockLengths || [6000, 6500, 7000]).join(',')) + '" placeholder="6000,6500,7000"></label>' +
            '<label class="nebras-field"><span>بنك الفضلة</span><select id="alu-set-bank"><option value="1"' + (aluSettings.useRemnantBank !== false ? ' selected' : '') + '>مفعّل</option><option value="0"' + (aluSettings.useRemnantBank === false ? ' selected' : '') + '>موقوف</option></select></label>' +
            '</div>' +
            '<label class="nebras-field nebras-field--wide"><span>شروط عرض السعر</span><textarea id="alu-set-terms" rows="3">' + aluEsc(aluSettings.quoteTerms || '') + '</textarea></label>' +
            '<p class="alu-cut-note">نبراس Pro: مقارنة 6/6.5/7م + 3 خوارزميات + بنك فضلة — أقوى من البرامج التي تعتمد عوداً واحداً وخوارزمية واحدة.</p>' +
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
        aluSettings.autoCompareStocks = aluField('alu-set-cmp') !== '0';
        aluSettings.useRemnantBank = aluField('alu-set-bank') !== '0';
        aluSettings.saveRemnantsAfterCut = aluSettings.useRemnantBank;
        aluSettings.compareStockLengths = String(aluField('alu-set-cmp-list') || '6000,6500,7000')
            .split(/[,،\s]+/).map(aluNum).filter(function (n) { return n >= 1000; });
        if (!aluSettings.compareStockLengths.length) aluSettings.compareStockLengths = [6000, 6500, 7000];
        persistAluminumCuttingCloud(['aluminum_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ إعدادات Pro', 'ok');
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
    global.getAluminumRemnants = getAluminumRemnants;
    global.getAluminumAudit = getAluminumAudit;
    global.setAluminumProfilesFromCloud = setAluminumProfilesFromCloud;
    global.setAluminumSystemsFromCloud = setAluminumSystemsFromCloud;
    global.setAluminumEstimatesFromCloud = setAluminumEstimatesFromCloud;
    global.setAluminumCutJobsFromCloud = setAluminumCutJobsFromCloud;
    global.setAluminumCutSettingsFromCloud = setAluminumCutSettingsFromCloud;
    global.setAluminumAccessoriesFromCloud = setAluminumAccessoriesFromCloud;
    global.setAluminumGlassFromCloud = setAluminumGlassFromCloud;
    global.setAluminumWireFromCloud = setAluminumWireFromCloud;
    global.setAluminumColorsFromCloud = setAluminumColorsFromCloud;
    global.setAluminumRemnantsFromCloud = setAluminumRemnantsFromCloud;
    global.setAluminumAuditFromCloud = setAluminumAuditFromCloud;
    global.renderAluminumCuttingPanel = renderAluminumCuttingPanel;
    global.nebrasOptimizeAluminumCuts = runFullCuttingPlan;
    global.discardAluRemnant = discardAluRemnant;
    global.clearAluRemnants = clearAluRemnants;
    global.exportAluSystemsJson = exportAluSystemsJson;
    global.importAluSystemsJson = importAluSystemsJson;
    global.printAluStickers = printAluStickers;
    global.printAluMillingReport = printAluMillingReport;
    global.setAluEstimateStatus = setAluEstimateStatus;
    global.saveAluEstimateFinance = saveAluEstimateFinance;
    global.editAluItem = editAluItem;
    global.clearAluItemForm = clearAluItemForm;
    global.toggleAluBayFields = toggleAluBayFields;
    global.explainAluEstimateFormulas = explainEstimateFormulas;

    function runAluminumSelfTest() {
        seedDefaults();
        ensureFacadeSystemPresent();
        const report = { ok: true, checks: [], fails: [] };
        function assert(name, cond, detail) {
            const row = { name: name, pass: !!cond, detail: detail || '' };
            report.checks.push(row);
            if (!cond) { report.ok = false; report.fails.push(row); }
        }
        const slideSys = aluSystems.find(function (s) { return s.family === 'sliding'; });
        const hingeSys = aluSystems.find(function (s) { return s.family === 'hinged'; });
        const facadeSys = aluSystems.find(function (s) { return s.family === 'facade'; });
        assert('seed-systems', !!(slideSys && hingeSys && facadeSys), 'sliding+hinged+facade');

        const slidingItem = {
            shape: 'sliding2', profileSystemId: slideSys.id,
            widthMm: 2000, heightMm: 1600, qty: 1, glassId: (aluGlass[0] || {}).id
        };
        const slideBuilt = shapeCutsWithMeta(slidingItem, 0);
        const beads = (slideBuilt.cuts || []).filter(function (c) { return c.role === 'bead'; });
        const beadVert = beads.filter(function (c) { return /رأسي/.test(c.labelAr); });
        const beadHorz = beads.filter(function (c) { return /أفقي/.test(c.labelAr); });
        assert('sliding-beads-hv', beadVert.length >= 1 && beadHorz.length >= 1, 'v=' + beadVert.length + ' h=' + beadHorz.length);
        assert('no-silent-wrong-sku', !(slideBuilt.cuts || []).some(function (c) { return !c.missingPart && !c.profileId && c.role; }), 'all roles resolved or flagged');

        const glass = buildItemGlass(slidingItem);
        const d = dOf(slideSys);
        const expectSashW = (2000 / 2) + aluNum(d.sashOverlapMm) - aluNum(d.splitBetweenSashesMm);
        const expectGW = aluRound(expectSashW - aluNum(d.glassSashDeductW), 1);
        assert('sliding-glass-from-sash', Math.abs(glass.widthMm - expectGW) < 0.2, glass.widthMm + ' vs ' + expectGW);

        const facadeItem = {
            shape: 'facade_bay', profileSystemId: facadeSys.id,
            widthMm: 6000, heightMm: 3000, qty: 1, bayCols: 3, bayRows: 2, glassId: (aluGlass[0] || {}).id
        };
        const facadeBuilt = shapeCutsWithMeta(facadeItem, 0);
        const mullions = (facadeBuilt.cuts || []).filter(function (c) { return c.role === 'mullion'; });
        assert('facade-mullions', mullions.length >= 1 && mullions[0].qty === 2, 'cols-1=' + (mullions[0] && mullions[0].qty));
        const fGlass = buildItemGlass(facadeItem);
        assert('facade-glass-panels', fGlass.panels === 6, String(fGlass.panels));

        const fake = { remnantsCommitted: false, plans: [{ profileId: 'x', profileSku: 'X', profileName: 'X', role: 'frame', plan: { bars: [{ remain: 500 }] } }], consumedRemnantIds: [] };
        const before = aluRemnants.length;
        commitRemnantsFromPlan(fake, { estimateRef: 'SELFTEST', jobId: 'self-1' });
        const mid = aluRemnants.length;
        commitRemnantsFromPlan(fake, { estimateRef: 'SELFTEST', jobId: 'self-1' });
        assert('remnant-idempotent', mid > before && aluRemnants.length === mid, 'before=' + before + ' mid=' + mid + ' after=' + aluRemnants.length);
        /* تنظيف فضلة الاختبار */
        aluRemnants = aluRemnants.filter(function (r) { return r.fromJobId !== 'self-1'; });

        report.summary = report.ok ? 'PASS ' + report.checks.length + '/' + report.checks.length : 'FAIL ' + report.fails.length + '/' + report.checks.length;
        return report;
    }

    global.__nebrasAluSelfTest = runAluminumSelfTest;

    /* توافق أزرار قديمة */
    global.addAluOpening = addAluItem;
    global.removeAluOpening = removeAluItem;
    global.saveAluProfile = function () { setAluTab('systems'); };
})(typeof window !== 'undefined' ? window : globalThis);
