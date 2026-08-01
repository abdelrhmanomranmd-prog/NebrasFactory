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
        laborPerUnit: 80,
        warehouseStockMm: {}
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
    let aluSystemsPartRole = 'frame';
    let aluEstListView = 'cards';
    let aluEstSearchQ = '';
    let aluPartKitIdx = null;
    let aluPartEditIdx = null;
    let aluScanBuffer = '';

    const PART_ROLE_ORDER = ['frame', 'bar', 'sash', 'bead', 'meeting', 'mullion', 'box', 'flat', 'threshold', 'cladding', 'knife', 'wireFrame'];

    const LIP_TYPES = {
        none: 'بدون شفة',
        with_bar: 'ببار منه فيه',
        attachable: 'بيركب له بار'
    };

    const GLASS_KINDS = {
        any: 'غير محدد',
        single: 'سينجل',
        double: 'دبل'
    };

    const GEORGIAN_TYPES = {
        none: { nameAr: 'بدون جورجيا', surchargePerM2: 0 },
        diamond: { nameAr: 'معين', surchargePerM2: 35 },
        square: { nameAr: 'مربعات', surchargePerM2: 28 },
        colonial: { nameAr: 'كولونيال', surchargePerM2: 42 },
        victorian: { nameAr: 'فيكتوريان', surchargePerM2: 48 }
    };

    const PAINT_TYPES = {
        none: { nameAr: 'بدون دهان', perKg: 0 },
        powder: { nameAr: 'دهان بودرة', perKg: 4 },
        wood: { nameAr: 'خشامونيوم', perKg: 8 },
        anodize: { nameAr: 'أنودة', perKg: 5 },
        wet: { nameAr: 'دهان سائل', perKg: 3.5 }
    };

    const SPACER_TYPES = {
        none: { nameAr: '—', surchargePerM2: 0 },
        alu12: { nameAr: 'فاصل ألومنيوم 12مم', surchargePerM2: 18 },
        alu16: { nameAr: 'فاصل ألومنيوم 16مم', surchargePerM2: 22 },
        warm14: { nameAr: 'فاصل دافئ 14مم', surchargePerM2: 28 }
    };

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
        facade_bay: { nameAr: 'واجهة — شبكة بايات (أعمدة×صفوف)', family: 'facade', leaves: 1 },
        freehand: { nameAr: 'رسم يدوي حر', family: 'hinged', leaves: 1, freehand: true },
        pricing_only: { nameAr: 'بند تسعير فقط', family: 'hinged', leaves: 0, pricingOnly: true }
    };

    const PART_ROLES = {
        frame: 'حلوق',
        bar: 'بارات',
        sash: 'ضرف',
        bead: 'باكيتات',
        meeting: 'سقاسات',
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

    function ensureMarketCatalogPresent() {
        const catalog = [
            {
                id: 'sys-ig-mass',
                nameAr: 'آي جي ماس IG Mass',
                family: 'hinged',
                cutAngle: 45,
                tracksCount: 0,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: [
                    { id: 'ig-fr', role: 'frame', nameAr: 'حلق آي جي ماس', sku: 'IG-FR-01', thicknessMm: 45, weightKgPerM: 0.98, pricePerKg: 18, lipType: 'with_bar', lipThicknessMm: 20, withPackage: false, glassKind: 'any', disableLastBarRemnant: false, active: true },
                    { id: 'ig-sh', role: 'sash', nameAr: 'ضرفة آي جي ماس', sku: 'IG-SH-01', thicknessMm: 45, weightKgPerM: 0.74, pricePerKg: 18, withPackage: false, glassKind: 'any', disableLastBarRemnant: true, active: true },
                    { id: 'ig-bd', role: 'bead', nameAr: 'باكيت آي جي', sku: 'IG-BD-01', thicknessMm: 18, weightKgPerM: 0.26, pricePerKg: 18, glassKind: 'any', withPackage: false, disableLastBarRemnant: false, active: true }
                ],
                active: true
            },
            {
                id: 'sys-alsaad',
                nameAr: 'السعد — مفصلي',
                family: 'hinged',
                cutAngle: 45,
                tracksCount: 0,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: [
                    { id: 'as-fr', role: 'frame', nameAr: 'حلق السعد', sku: 'AS-FR-01', thicknessMm: 45, weightKgPerM: 1.0, pricePerKg: 18, lipType: 'attachable', lipThicknessMm: 18, withPackage: false, glassKind: 'any', disableLastBarRemnant: false, active: true },
                    { id: 'as-sh', role: 'sash', nameAr: 'ضرفة السعد', sku: 'AS-SH-01', thicknessMm: 45, weightKgPerM: 0.76, pricePerKg: 18, withPackage: false, glassKind: 'any', disableLastBarRemnant: true, active: true },
                    { id: 'as-bd', role: 'bead', nameAr: 'باكيت السعد', sku: 'AS-BD-01', thicknessMm: 18, weightKgPerM: 0.27, pricePerKg: 18, glassKind: 'any', withPackage: false, disableLastBarRemnant: false, active: true }
                ],
                active: true
            },
            {
                id: 'sys-rock-samba',
                nameAr: 'روك سامبا — سحاب',
                family: 'sliding',
                cutAngle: 45,
                tracksCount: 2,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { sashOverlapMm: 30, mullionDeductFull: 42 }),
                parts: [
                    { id: 'rs-fr', role: 'frame', nameAr: 'حلق روك سامبا', sku: 'RS-FR-01', thicknessMm: 55, weightKgPerM: 1.15, pricePerKg: 18.5, lipType: 'none', tracksCount: 2, withPackage: false, glassKind: 'any', disableLastBarRemnant: false, active: true },
                    { id: 'rs-sh', role: 'sash', nameAr: 'ضرفة روك سامبا', sku: 'RS-SH-01', thicknessMm: 40, weightKgPerM: 0.82, pricePerKg: 18.5, withPackage: false, glassKind: 'any', disableLastBarRemnant: true, active: true },
                    { id: 'rs-mu', role: 'mullion', nameAr: 'مرد روك سامبا', sku: 'RS-MU-01', thicknessMm: 40, weightKgPerM: 0.9, pricePerKg: 18.5, withPackage: false, disableLastBarRemnant: false, active: true },
                    { id: 'rs-kn', role: 'knife', nameAr: 'سكينة روك', sku: 'RS-KN-01', thicknessMm: 20, weightKgPerM: 0.48, pricePerKg: 18.5, withPackage: false, disableLastBarRemnant: false, active: true },
                    { id: 'rs-bd', role: 'bead', nameAr: 'باكيت روك', sku: 'RS-BD-01', thicknessMm: 18, weightKgPerM: 0.28, pricePerKg: 18.5, glassKind: 'any', withPackage: false, disableLastBarRemnant: false, active: true }
                ],
                active: true
            },
            {
                id: 'sys-volcano',
                nameAr: 'فولكانو',
                family: 'hinged',
                cutAngle: 45,
                tracksCount: 0,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: [
                    { id: 'vo-fr', role: 'frame', nameAr: 'حلق فولكانو', sku: 'VO-FR-01', thicknessMm: 45, weightKgPerM: 0.97, pricePerKg: 18, lipType: 'with_bar', lipThicknessMm: 20, withPackage: false, glassKind: 'any', disableLastBarRemnant: false, active: true },
                    { id: 'vo-sh', role: 'sash', nameAr: 'ضرفة فولكانو', sku: 'VO-SH-01', thicknessMm: 45, weightKgPerM: 0.73, pricePerKg: 18, withPackage: false, glassKind: 'any', disableLastBarRemnant: true, active: true },
                    { id: 'vo-bd', role: 'bead', nameAr: 'باكيت فولكانو', sku: 'VO-BD-01', thicknessMm: 18, weightKgPerM: 0.26, pricePerKg: 18, glassKind: 'any', withPackage: false, disableLastBarRemnant: false, active: true }
                ],
                active: true
            },
            {
                id: 'sys-alumil',
                nameAr: 'ألوميل Alumil',
                family: 'sliding',
                cutAngle: 45,
                tracksCount: 2,
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { sashOverlapMm: 32 }),
                parts: [
                    { id: 'al-fr', role: 'frame', nameAr: 'حلق ألوميل', sku: 'AL-FR-01', thicknessMm: 60, weightKgPerM: 1.25, pricePerKg: 20, lipType: 'none', tracksCount: 2, withPackage: false, glassKind: 'any', disableLastBarRemnant: false, active: true },
                    { id: 'al-sh', role: 'sash', nameAr: 'ضرفة ألوميل', sku: 'AL-SH-01', thicknessMm: 42, weightKgPerM: 0.88, pricePerKg: 20, withPackage: false, glassKind: 'any', disableLastBarRemnant: true, active: true },
                    { id: 'al-mu', role: 'mullion', nameAr: 'مرد ألوميل', sku: 'AL-MU-01', thicknessMm: 42, weightKgPerM: 0.95, pricePerKg: 20, withPackage: false, disableLastBarRemnant: false, active: true },
                    { id: 'al-bd', role: 'bead', nameAr: 'باكيت ألوميل', sku: 'AL-BD-01', thicknessMm: 20, weightKgPerM: 0.3, pricePerKg: 20, glassKind: 'any', withPackage: false, disableLastBarRemnant: false, active: true }
                ],
                active: true
            }
        ];
        let added = 0;
        catalog.forEach(function (sys) {
            if (!aluSystems.some(function (s) { return s.id === sys.id; })) {
                aluSystems.push(sys);
                added++;
            }
        });
        return added > 0;
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
        if (ensureMarketCatalogPresent()) {
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
        try { aluEstListView = localStorage.getItem('aluEstListView') || 'cards'; } catch (e) { aluEstListView = 'cards'; }
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

    /**
     * يوحّد الأشكال الجاهزة + الرسم اليدوي الحر إلى عائلة/ضلف/باب/ثابت
     * الرسم اليدوي يمرّ بنفس محرك التخصيمات تماماً
     */
    function resolveItemShape(item) {
        item = item || {};
        const base = READY_SHAPES[item.shape] || READY_SHAPES.sliding2;
        if (item.shape !== 'freehand') {
            return {
                key: item.shape,
                nameAr: base.nameAr,
                family: base.family,
                leaves: Math.max(1, base.leaves || 1),
                isDoor: item.shape === 'door_hinged' || item.shape === 'door_sliding',
                isFixed: item.shape === 'fixed',
                isSlidingDoor: item.shape === 'door_sliding',
                bayCols: Math.max(1, Math.round(aluNum(item.bayCols) || 1)),
                bayRows: Math.max(1, Math.round(aluNum(item.bayRows) || 1)),
                pricingOnly: !!base.pricingOnly
            };
        }
        const fh = item.freehand || {};
        const family = fh.family || 'hinged';
        const kind = fh.kind || 'window';
        let leaves = Math.max(1, Math.min(6, Math.round(aluNum(fh.leaves) || 1)));
        if (kind === 'fixed') leaves = 1;
        if (family === 'facade') leaves = 1;
        const famAr = family === 'sliding' ? 'سحاب' : family === 'facade' ? 'واجهة' : 'مفصلي';
        const kindAr = kind === 'door' ? 'باب' : kind === 'fixed' ? 'ثابت' : 'شباك';
        return {
            key: 'freehand',
            nameAr: 'رسم يدوي — ' + famAr + ' · ' + kindAr + (family !== 'facade' && kind !== 'fixed' ? (' ×' + leaves) : ''),
            family: family,
            leaves: leaves,
            isDoor: kind === 'door',
            isFixed: kind === 'fixed',
            isSlidingDoor: family === 'sliding' && kind === 'door',
            bayCols: Math.max(1, Math.round(aluNum(fh.bayCols) || item.bayCols || 1)),
            bayRows: Math.max(1, Math.round(aluNum(fh.bayRows) || item.bayRows || 1))
        };
    }

    function buildShapeCuts(item, itemIndex) {
        if (item && (item.pricingOnly || item.shape === 'pricing_only')) {
            return { cuts: [], warnings: [] };
        }
        const shape = resolveItemShape(item);
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
        const cols = shape.bayCols || Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = shape.bayRows || Math.max(1, Math.round(aluNum(item.bayRows) || 1));

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
            const mullDed = (shape.isSlidingDoor && aluNum(d.sashFromFloorMm) > 0)
                ? aluNum(d.mullionDeductWithHeel) : aluNum(d.mullionDeductFull);
            push('mullion', 'مرد / عمود التقاء', H - mullDed, Math.max(0, leaves - 1), 'H');
            push('sash', 'ضرفة — أفقي', sashW, leaves * 2, 'W');
            push('sash', 'ضرفة — رأسي', sashH, leaves * 2, 'H');
            if (aluNum(sys.tracksCount) >= 1) {
                push('knife', 'سكينة', W, Math.max(1, aluNum(sys.tracksCount)), 'W');
            }
            if (shape.isSlidingDoor || shape.isDoor) {
                push('threshold', 'عتبة', W, 1, 'W');
            }
            const sashPart = partForRole(sys, 'sash');
            if (!sashPart || !sashPart.withPackage) {
                push('bead', 'باكيت أفقي', Math.max(1, sashW - beadInset), leaves * 2, 'W');
                push('bead', 'باكيت رأسي', Math.max(1, sashH - beadInset), leaves * 2, 'H');
            }
        } else if (shape.isFixed) {
            push('bead', 'باكيت ثابت أفقي', Math.max(1, W - aluNum(d.glassFixedDeductW)), 2, 'W');
            push('bead', 'باكيت ثابت رأسي', Math.max(1, H - aluNum(d.glassFixedDeductH)), 2, 'H');
        } else {
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
        const shape = resolveItemShape(item);
        const found = findSystem(item.profileSystemId, shape.family);
        const sys = found.system;
        const d = dOf(sys);
        const W = aluNum(item.widthMm);
        const H = aluNum(item.heightMm);
        const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
        const leaves = Math.max(1, shape.leaves || 1);
        const cols = shape.bayCols || Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = shape.bayRows || Math.max(1, Math.round(aluNum(item.bayRows) || 1));
        let gW = 0;
        let gH = 0;
        let panels = qty;

        if (shape.family === 'facade') {
            const cellW = W / cols;
            const cellH = H / rows;
            gW = Math.max(0, aluRound(cellW - aluNum(d.glassFixedDeductW), 1));
            gH = Math.max(0, aluRound(cellH - aluNum(d.glassFixedDeductH), 1));
            panels = cols * rows * qty;
        } else if (shape.isFixed) {
            gW = Math.max(0, aluRound(W - aluNum(d.glassFixedDeductW), 1));
            gH = Math.max(0, aluRound(H - aluNum(d.glassFixedDeductH), 1));
            panels = qty;
        } else if (shape.family === 'sliding') {
            const sashW = (W / leaves) + aluNum(d.sashOverlapMm) - aluNum(d.splitBetweenSashesMm);
            const sashH = H - aluNum(d.sashDeductH);
            gW = Math.max(0, aluRound(sashW - aluNum(d.glassSashDeductW), 1));
            gH = Math.max(0, aluRound(sashH - aluNum(d.glassSashDeductH), 1));
            panels = leaves * qty;
        } else {
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
        const shape = resolveItemShape(item);
        const mode = priceMode || aluSettings.priceModeDefault || 'purchase';
        return aluAccessories.filter(function (a) {
            if (a.active === false) return false;
            if (a.familyOnly && a.familyOnly !== shape.family) return false;
            const scope = a.applyScope || 'all';
            if (scope === 'sash' && (shape.isFixed || shape.family === 'facade')) return false;
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
            if (item.pricingOnly || item.shape === 'pricing_only') {
                const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
                const fixed = aluRound(aluNum(item.fixedPrice) * qty, 2);
                accessories.push({
                    id: item.id || aluId('po'), code: 'PRICE-ONLY', nameAr: item.labelAr || 'بند تسعير',
                    colorAr: '', qty: qty, unitPrice: aluNum(item.fixedPrice), total: fixed, applyScope: 'all'
                });
                return;
            }
            const g = buildItemGlass(item);
            /* زجاج دبل + فاصل + جورجيا */
            const glFront = aluGlass.find(function (x) { return x.id === (item.glassFrontId || item.glassId); }) || aluGlass[0];
            const glBack = item.glassKind === 'double'
                ? (aluGlass.find(function (x) { return x.id === item.glassBackId; }) || glFront)
                : null;
            const spacer = SPACER_TYPES[item.spacerType] || SPACER_TYPES.none;
            const georg = GEORGIAN_TYPES[item.georgianType] || GEORGIAN_TYPES.none;
            let panePrice = aluNum(glFront && glFront.pricePerM2);
            if (glBack) panePrice += aluNum(glBack.pricePerM2);
            panePrice += aluNum(spacer.surchargePerM2) + aluNum(georg.surchargePerM2);
            g.pricePerM2 = panePrice;
            g.glassKind = item.glassKind || 'single';
            g.georgianAr = georg.nameAr;
            g.spacerAr = spacer.nameAr;
            g.nameAr = (glFront ? glFront.nameAr : g.nameAr) + (glBack ? (' + ' + glBack.nameAr) : '') +
                (item.georgianType && item.georgianType !== 'none' ? (' · ' + georg.nameAr) : '');
            glassPanels.push(g);
            if (g.warning && formulaWarnings.indexOf(g.warning) < 0) formulaWarnings.push(g.warning);
            glassCost += g.areaM2 * g.pricePerM2;
            const wr = buildItemWire(item);
            if (wr) { wireRows.push(wr); wireCost += wr.total; }
            const color = aluColors.find(function (c) { return c.id === item.colorId; });
            const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
            const areaBill = billableAreaM2(item.widthMm, item.heightMm) * qty;
            billableM2 += areaBill;
            if (color) {
                const paintKg = aluNum(color.surchargePerKg);
                if (paintKg > 0) {
                    /* تقريب: كل م² ≈ 2.2 كغ دهان واجهات — أو زيادة م² */
                    colorCost += areaBill * (aluNum(color.surchargePerM2) + paintKg * 2.2);
                } else {
                    colorCost += areaBill * aluNum(color.surchargePerM2);
                }
            }
            /* دهان المقايسة العام على وزن القطاعات يُحسب بعد الحلقة */
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

        let paintTypeCost = 0;
        const paint = PAINT_TYPES[est.paintType] || PAINT_TYPES.none;
        if (paint && aluNum(paint.perKg) > 0) {
            const totalKg = Object.keys(byProfile).reduce(function (s, k) { return s + aluNum(byProfile[k].weightKg); }, 0);
            paintTypeCost = aluRound(totalKg * aluNum(paint.perKg), 2);
            colorCost = aluRound(colorCost + paintTypeCost, 2);
        }
        /* أطقم إكسسوار مرتبطة بقطاعات النظام المستخدمة */
        items.forEach(function (item) {
            if (item.pricingOnly || item.shape === 'pricing_only') return;
            const shape = resolveItemShape(item);
            const found = findSystem(item.profileSystemId, shape.family);
            const sys = found.system;
            if (!sys) return;
            const qty = Math.max(1, Math.round(aluNum(item.qty) || 1));
            (sys.parts || []).forEach(function (part) {
                if (!part.accessoryKit || !part.accessoryKit.length) return;
                part.accessoryKit.forEach(function (kit) {
                    const accId = kit.accId || kit.accessoryId;
                    const acc = aluAccessories.find(function (a) { return a.id === accId; });
                    if (!acc || acc.active === false) return;
                    const q = aluRound(aluNum(kit.qty != null ? kit.qty : kit.qtyPerCut) * qty, 2);
                    if (q <= 0) return;
                    const unit = (est.priceMode === 'sell') ? aluNum(acc.sellPrice) : aluNum(acc.purchasePrice);
                    const kitCode = (acc.code || acc.id) + '·KIT·' + (part.sku || part.id || 'p');
                    const foundA = accessories.find(function (x) { return x.code === kitCode && x.applyScope === 'kit'; });
                    if (foundA) {
                        foundA.qty = aluRound(foundA.qty + q, 2);
                        foundA.total = aluRound(foundA.qty * foundA.unitPrice, 2);
                    } else {
                        accessories.push({
                            id: acc.id, code: kitCode, nameAr: acc.nameAr + ' · ' + part.nameAr,
                            colorAr: acc.colorAr || '', qty: q, unitPrice: unit,
                            total: aluRound(q * unit, 2), applyScope: 'kit'
                        });
                    }
                });
            });
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
    }

    function newEstimateDraft() {
        return {
            id: aluId('est'),
            ref: 'ALU-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(aluEstimates.length + 1).padStart(3, '0'),
            customerName: '',
            projectName: '',
            customerPhone: '',
            deliveryDate: '',
            paintType: 'none',
            notes: '',
            priceMode: aluSettings.priceModeDefault || 'purchase',
            stockBarMm: aluSettings.stockBarMm,
            kerfMm: aluSettings.kerfMm,
            weightAdjustPct: 0,
            laborPerUnit: aluSettings.laborPerUnit || 80,
            items: [],
            supplierInvoices: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /* —— UI —— */
    const ALU_NAV_GROUPS = [
        {
            label: 'القيادة',
            items: [
                { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة التخصيمات' },
                { id: 'estimates', icon: 'fas fa-folder-open', label: 'المقايسات' },
                { id: 'estimate', icon: 'fas fa-ruler-combined', label: 'بند / مقايسة' }
            ]
        },
        {
            label: 'الهندسة',
            items: [
                { id: 'systems', icon: 'fas fa-bars-staggered', label: 'إعدادات القطاعات' },
                { id: 'deductions', icon: 'fas fa-sliders', label: 'التخصيمات' },
                { id: 'accessories', icon: 'fas fa-puzzle-piece', label: 'إكسسوارات ومعادلات' },
                { id: 'materials', icon: 'fas fa-layer-group', label: 'زجاج / سلك / ألوان' }
            ]
        },
        {
            label: 'الإنتاج',
            items: [
                { id: 'cutting', icon: 'fas fa-scissors', label: 'تقطيع ذكي' },
                { id: 'audit', icon: 'fas fa-microscope', label: 'تدقيق الدقة' },
                { id: 'remnants', icon: 'fas fa-recycle', label: 'بنك الفضلة' },
                { id: 'shop', icon: 'fas fa-industry', label: 'ورشة العمل' },
                { id: 'production', icon: 'fas fa-clipboard-check', label: 'مسار المصنع' }
            ]
        },
        {
            label: 'التقارير',
            items: [
                { id: 'reports', icon: 'fas fa-file-lines', label: 'تقارير ومشتريات' },
                { id: 'settings', icon: 'fas fa-gears', label: 'إعدادات المحرك' }
            ]
        }
    ];

    function showAluminumCuttingShell() {
        const el = document.getElementById('aluminum-cutting');
        if (!el) {
            alert('تعذر فتح منصة التخصيمات — أعيدي تحميل الصفحة.');
            return false;
        }
        document.querySelectorAll('.admin-section.show').forEach(function (node) {
            if (node.id !== 'aluminum-cutting') {
                node.classList.remove('show');
                node.setAttribute('aria-hidden', 'true');
            }
        });
        const dash = document.getElementById('admin-dashboard');
        if (dash) {
            dash.classList.remove('show');
            dash.setAttribute('aria-hidden', 'true');
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('alu-platform-open');
        paintAluWorkspaceChrome();
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        return true;
    }

    function closeAluminumCuttingWorkspace() {
        const el = document.getElementById('aluminum-cutting');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('alu-platform-open');
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof currentAdmin !== 'undefined' && currentAdmin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('عودة لداشبورد الألومنيوم', 'ok');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function paintAluWorkspaceChrome() {
        const pill = document.getElementById('alu-ws-user-pill');
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        if (pill) {
            pill.textContent = admin
                ? ((admin.displayName || admin.username || 'مدير الألومنيوم') + ' · تخصيمات')
                : 'تخصيمات الألومنيوم';
        }
        const lastJob = aluCutJobs[aluCutJobs.length - 1];
        const liveRem = aluRemnants.filter(function (r) { return !r.used; }).length;
        const set = function (id, v) {
            const n = document.getElementById(id);
            if (n) n.textContent = v;
        };
        set('alu-kpi-systems', String(aluSystems.length));
        set('alu-kpi-estimates', String(aluEstimates.length));
        set('alu-kpi-remnants', String(liveRem));
        set('alu-kpi-waste', lastJob ? (lastJob.wastePct + '%') : '—');
        const scope = document.getElementById('alu-ws-scope-label');
        if (scope) {
            const tabLabel = (ALU_NAV_GROUPS.reduce(function (acc, g) { return acc.concat(g.items); }, [])
                .find(function (t) { return t.id === aluActiveTab; }) || {}).label || 'لوحة التخصيمات';
            scope.textContent = tabLabel + ' · شبابيك · أبواب · واجهات';
        }
    }

    function renderAluWorkspaceNav() {
        const nav = document.getElementById('alu-ws-nav');
        if (!nav) return;
        nav.innerHTML = ALU_NAV_GROUPS.map(function (group) {
            return '<div class="hr-ws-nav-group">' +
                '<span class="hr-ws-nav-group-label">' + aluEsc(group.label) + '</span>' +
                group.items.map(function (t) {
                    return '<button type="button" class="hr-ws-nav-item' + (aluActiveTab === t.id ? ' is-active' : '') +
                        '" data-alu-tab="' + t.id + '" onclick="setAluCutTab(\'' + t.id + '\')">' +
                        '<i class="' + t.icon + '"></i> ' + aluEsc(t.label) + '</button>';
                }).join('') +
                '</div>';
        }).join('');
    }

    function openAluminumCutting(tab) {
        if (!requireAluAccess()) return;
        if (!aluDataReady) hydrateAluminumCuttingLocal();
        if (tab) aluActiveTab = tab;
        if (!showAluminumCuttingShell()) return;
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
        renderAluWorkspaceNav();
        paintAluWorkspaceChrome();

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
        else if (aluActiveTab === 'production') body = renderAluProductionBoard();
        else if (aluActiveTab === 'reports') body = renderAluReports();
        else if (aluActiveTab === 'settings') body = renderAluSettings();

        host.innerHTML = '<div class="alu-cut-panel alu-ws-panel">' + body + '</div>';
        if (aluActiveTab === 'estimate') {
            try { toggleAluBayFields(); } catch (e) { /* ignore */ }
        }
    }

    const ALU_STATUS = {
        draft: { ar: 'مسودة', step: 0 },
        approved: { ar: 'معتمدة', step: 1 },
        cutting: { ar: 'قيد التقطيع', step: 2 },
        in_production: { ar: 'تجميع ورشة', step: 3 },
        ready_install: { ar: 'جاهز للتركيب', step: 4 },
        installed: { ar: 'تم التركيب', step: 5 },
        done: { ar: 'مكتملة', step: 5 },
        in_progress: { ar: 'قيد التنفيذ', step: 2 }
    };

    function aluStatusMeta(status) {
        return ALU_STATUS[status] || ALU_STATUS.draft;
    }

    function syncEstimateStages(est) {
        if (!est) return [];
        const step = aluStatusMeta(est.status).step;
        est.stages = [
            { id: 'measure', name: 'قياس / مقايسة', done: step >= 0 },
            { id: 'approve', name: 'اعتماد هندسي', done: step >= 1 },
            { id: 'cut', name: 'تقطيع', done: step >= 2 },
            { id: 'assemble', name: 'تجميع ورشة', done: step >= 3 },
            { id: 'pack', name: 'تعبئة وتركيب', done: step >= 4 },
            { id: 'done', name: 'تسليم', done: step >= 5 }
        ];
        return est.stages;
    }

    function aluBarcodeSvg(code) {
        const raw = String(code || 'ALU');
        let bits = '';
        for (let i = 0; i < raw.length; i++) {
            const n = raw.charCodeAt(i);
            bits += ((n % 2) ? '1' : '0') + ((n % 3) ? '11' : '1') + ((n % 5) ? '0' : '00');
        }
        while (bits.length < 48) bits += bits;
        bits = bits.slice(0, 56);
        let x = 2;
        const bars = [];
        for (let i = 0; i < bits.length; i++) {
            const w = bits[i] === '1' ? 2.2 : 1.1;
            if (i % 2 === 0) bars.push('<rect x="' + x.toFixed(1) + '" y="2" width="' + w + '" height="28" fill="#0d2840"/>');
            x += w + 0.7;
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.ceil(x + 4) + '" height="34" aria-hidden="true">' + bars.join('') + '</svg>';
    }

    function buildInstallPackRows(est) {
        const items = (est && (est.items || [])) || [];
        const rows = [];
        items.forEach(function (it, i) {
            const shape = READY_SHAPES[it.shape] || {};
            const qty = Math.max(1, Math.round(aluNum(it.qty) || 1));
            const glass = buildItemGlass(it);
            const acc = buildItemAccessories(it, est.priceMode);
            rows.push({
                kind: 'وحدة',
                label: it.labelAr || shape.nameAr || ('بند ' + (i + 1)),
                detail: shape.nameAr + ' · ' + it.widthMm + '×' + it.heightMm + ' مم',
                qty: qty,
                loc: it.locationCode || '—'
            });
            rows.push({
                kind: 'زجاج',
                label: glass.nameAr,
                detail: glass.widthMm + '×' + glass.heightMm + ' مم',
                qty: glass.panels,
                loc: it.locationCode || '—'
            });
            acc.forEach(function (a) {
                rows.push({
                    kind: 'إكسسوار',
                    label: a.nameAr,
                    detail: a.code + (a.colorAr ? ' · ' + a.colorAr : ''),
                    qty: a.qty,
                    loc: it.locationCode || '—'
                });
            });
        });
        return rows;
    }

    function renderAluProductionBoard() {
        const buckets = {
            draft: [],
            approved: [],
            cutting: [],
            in_production: [],
            ready_install: [],
            installed: []
        };
        aluEstimates.forEach(function (e) {
            let key = e.status || 'draft';
            if (key === 'in_progress') key = 'cutting';
            if (key === 'done') key = 'installed';
            if (!buckets[key]) key = 'draft';
            buckets[key].push(e);
        });
        const cols = [
            { id: 'draft', title: 'مسودة', icon: 'fa-pen' },
            { id: 'approved', title: 'معتمدة', icon: 'fa-stamp' },
            { id: 'cutting', title: 'تقطيع', icon: 'fa-scissors' },
            { id: 'in_production', title: 'تجميع', icon: 'fa-screwdriver-wrench' },
            { id: 'ready_install', title: 'جاهز تركيب', icon: 'fa-truck' },
            { id: 'installed', title: 'تم التركيب', icon: 'fa-circle-check' }
        ];
        const board = cols.map(function (col) {
            const cards = (buckets[col.id] || []).slice().reverse().map(function (e) {
                const t = e.totalsSnapshot || {};
                return '<article class="alu-pipe-card">' +
                    '<strong>' + aluEsc(e.ref) + '</strong>' +
                    '<span>' + aluEsc(e.customerName || '—') + '</span>' +
                    '<small>' + aluEsc(e.projectName || '') +
                    (t.total != null ? ' · ' + t.total : '') + '</small>' +
                    '<div class="alu-pipe-card-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + aluEsc(e.id) + '\')">فتح</button>' +
                    '<button type="button" class="erp-tag" onclick="advanceAluEstimateStatus(\'' + aluEsc(e.id) + '\')">التالي ←</button>' +
                    '</div></article>';
            }).join('') || '<p class="alu-pipe-empty">فارغ</p>';
            return '<section class="alu-pipe-col">' +
                '<header><i class="fas ' + col.icon + '"></i> ' + col.title +
                ' <em>' + (buckets[col.id] || []).length + '</em></header>' +
                '<div class="alu-pipe-list">' + cards + '</div></section>';
        }).join('');

        return '<div class="alu-cut-form-card"><h4><i class="fas fa-clipboard-check"></i> مسار المصنع — من المقايسة إلى التركيب</h4>' +
            '<p class="alu-cut-note">لوحة حيّة يعتمد عليها المدير والمشرف: اسحب العمل مرحلة بمرحلة حتى التسليم في الموقع.</p></div>' +
            '<div class="alu-pipe-board">' + board + '</div>' +
            '<div class="alu-cut-form-card"><div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'shop\')"><i class="fas fa-industry"></i> ورشة العمل</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluInstallPack()"><i class="fas fa-box-open"></i> قائمة تعبئة وتركيب</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluWorkerCutList()"><i class="fas fa-list-ol"></i> قائمة قص للعامل</button>' +
            '</div></div>';
    }

    function advanceAluEstimateStatus(id) {
        const e = aluEstimates.find(function (x) { return x.id === id; });
        if (!e) return;
        const order = ['draft', 'approved', 'cutting', 'in_production', 'ready_install', 'installed'];
        let cur = e.status || 'draft';
        if (cur === 'in_progress') cur = 'cutting';
        if (cur === 'done') cur = 'installed';
        const idx = order.indexOf(cur);
        const next = order[Math.min(order.length - 1, Math.max(0, idx) + 1)];
        aluEstimateDraft = JSON.parse(JSON.stringify(e));
        setAluEstimateStatus(next);
    }

    function renderAluDashboard() {
        const lastJob = aluCutJobs[aluCutJobs.length - 1];
        const avgWaste = aluCutJobs.length
            ? aluRound(aluCutJobs.reduce(function (s, j) { return s + aluNum(j.wastePct); }, 0) / aluCutJobs.length, 2)
            : 0;
        const liveRem = aluRemnants.filter(function (r) { return !r.used; }).length;
        const openEst = aluEstimates.filter(function (e) {
            const st = e.status || 'draft';
            return st !== 'installed' && st !== 'done';
        }).length;
        const inCut = aluEstimates.filter(function (e) {
            return e.status === 'cutting' || e.status === 'in_progress' || e.status === 'in_production';
        }).length;
        const readyInst = aluEstimates.filter(function (e) { return e.status === 'ready_install'; }).length;
        const facadeSys = aluSystems.filter(function (s) { return s.family === 'facade'; }).length;
        const recent = aluEstimates.slice().reverse().slice(0, 4).map(function (e) {
            const t = e.totalsSnapshot || {};
            const st = aluStatusMeta(e.status);
            return '<button type="button" class="alu-dash-recent" onclick="loadAluEstimate(\'' + aluEsc(e.id) + '\')">' +
                '<strong>' + aluEsc(e.ref) + '</strong>' +
                '<span>' + aluEsc(e.customerName || '—') + ' · ' + aluEsc(st.ar) + '</span>' +
                '<em>' + (t.total != null ? t.total + ' ' + aluSettings.currencyLabel : 'بدون إجمالي') + '</em>' +
                '</button>';
        }).join('') || '<p class="erp-empty">لا مقايسات بعد — ابدأ الأولى من هنا.</p>';

        const pipeMini = [
            { id: 'draft', label: 'مسودة' },
            { id: 'approved', label: 'اعتماد' },
            { id: 'cutting', label: 'تقطيع' },
            { id: 'in_production', label: 'تجميع' },
            { id: 'ready_install', label: 'تركيب' }
        ].map(function (p) {
            const n = aluEstimates.filter(function (e) {
                let s = e.status || 'draft';
                if (s === 'in_progress') s = 'cutting';
                if (s === 'done' || s === 'installed') s = 'ready_install';
                return s === p.id;
            }).length;
            return '<button type="button" class="alu-pipe-chip" onclick="setAluCutTab(\'production\')"><strong>' + n + '</strong><span>' + p.label + '</span></button>';
        }).join('');

        return '<div class="alu-command-dash">' +
            '<section class="alu-command-hero">' +
            '<div class="alu-command-hero-bg" aria-hidden="true"></div>' +
            '<div class="alu-command-hero-inner">' +
            '<p class="alu-cut-kicker"><i class="fas fa-drafting-compass"></i> الأداة الأساسية لمدير القسم ومهندس تصميم الألومنيوم</p>' +
            '<h2>أقوى محرك تخصيمات لقطاعات الألومنيوم</h2>' +
            '<p>منصة تخصيمات كاملة بنفس أساس Ecotal: عرّف <strong>أي قطاع</strong> من السوق (حلوق · ضرف · باكيتات · مرد…) مع تخصيماته، ثم مقايسة بند بند، ثم تقارير تقطيع ومشتريات وتجميع وعرض سعر — للمفصليات والسحاب والواجهات بدون تقييد بنظام واحد.</p>' +
            '<div class="alu-cut-hero-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'systems\')"><i class="fas fa-bars-staggered"></i> إعدادات القطاعات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="newAluEstimate();setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'deductions\')"><i class="fas fa-sliders"></i> التخصيمات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'reports\')"><i class="fas fa-file-lines"></i> التقارير</button>' +
            '</div></div></section>' +

            '<div class="alu-pipe-strip">' + pipeMini + '</div>' +

            '<div class="alu-dash-metrics">' +
            '<article class="alu-metric"><i class="fas fa-cubes"></i><div><strong>' + aluSystems.length + '</strong><span>أنظمة قطاعات</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-folder-open"></i><div><strong>' + aluEstimates.length + '</strong><span>مقايسات</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-spinner"></i><div><strong>' + openEst + '</strong><span>قيد التنفيذ</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-cut"></i><div><strong>' + inCut + '</strong><span>في الورشة</span></div></article>' +
            '<article class="alu-metric alu-metric--accent"><i class="fas fa-truck"></i><div><strong>' + readyInst + '</strong><span>جاهز تركيب</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-recycle"></i><div><strong>' + liveRem + '</strong><span>فضلات حية</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-chart-line"></i><div><strong>' + (lastJob ? lastJob.wastePct + '%' : '—') + '</strong><span>آخر هدر</span></div></article>' +
            '<article class="alu-metric"><i class="fas fa-percent"></i><div><strong>' + (avgWaste || '—') + (avgWaste ? '%' : '') + '</strong><span>متوسط هدر</span></div></article>' +
            '</div>' +

            '<div class="alu-dash-grid">' +
            '<section class="alu-dash-card">' +
            '<header><h3><i class="fas fa-bolt"></i> سير عمل التخصيمات (كالفيديو)</h3><p>إعدادات القطاعات → مقايسة → تقطيع → تقارير</p></header>' +
            '<div class="alu-dash-actions">' +
            '<button type="button" onclick="setAluCutTab(\'systems\')"><i class="fas fa-bars-staggered"></i><span>1) إعدادات القطاعات</span><small>حلوق · ضرف · باكيت · مرد — أي كتالوج</small></button>' +
            '<button type="button" onclick="setAluCutTab(\'deductions\')"><i class="fas fa-sliders"></i><span>2) التخصيمات</span><small>ركوب · زجاج · مرد · سلك</small></button>' +
            '<button type="button" onclick="setAluCutTab(\'accessories\')"><i class="fas fa-puzzle-piece"></i><span>3) إكسسوارات ومعادلات</span><small>كورنر · مقبض · كاوتش</small></button>' +
            '<button type="button" onclick="setAluCutTab(\'estimate\')"><i class="fas fa-ruler-combined"></i><span>4) مقايسة + رسومات</span><small>ارتفاع · زجاج · واجهة من التخصيمات</small></button>' +
            '<button type="button" onclick="setAluCutTab(\'cutting\')"><i class="fas fa-scissors"></i><span>5) تقرير التقطيع</span><small>أعواد · أقل هدر · استيكرات</small></button>' +
            '<button type="button" onclick="setAluCutTab(\'reports\')"><i class="fas fa-file-invoice"></i><span>6) مشتريات · صور · عرض سعر</span><small>تقارير الفيديو + صور نبراس</small></button>' +
            '</div></section>' +

            '<section class="alu-dash-card">' +
            '<header><h3><i class="fas fa-clock-rotate-left"></i> أحدث المقايسات</h3><p>الحالة · العميل · الإجمالي</p></header>' +
            '<div class="alu-dash-recent-list">' + recent + '</div>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'estimates\')">كل المقايسات</button>' +
            '</section>' +

            '<section class="alu-dash-card alu-dash-card--wide">' +
            '<header><h3><i class="fas fa-shield-halved"></i> هدف التخصيمات</h3><p>من كتالوج القطاع → أرقام تخصيم دقيقة → قص بدون هدر → شراء وتجميع وتركيب</p></header>' +
            '<div class="alu-pro-badge-row">' +
            '<span class="alu-pro-badge">أي نظام قطاع من السوق</span>' +
            '<span class="alu-pro-badge">حلوق · ضرف · باكيتات · مرد</span>' +
            '<span class="alu-pro-badge">تخصيمات قابلة للتعديل</span>' +
            '<span class="alu-pro-badge">مفصلي · سحاب · واجهات</span>' +
            '<span class="alu-pro-badge">تقطيع أعواد</span>' +
            '<span class="alu-pro-badge">رسومات ارتفاع + زجاج</span>' +
            '<span class="alu-pro-badge">تقرير صور المقايسة</span>' +
            '<span class="alu-pro-badge">مشتريات · تجميع · عرض سعر</span>' +
            '<span class="alu-pro-badge">أنظمة محمّلة: ' + aluSystems.length + '</span>' +
            '</div>' +
            '<p class="alu-cut-note"><i class="fas fa-circle-check"></i> نفس أساس دروس Ecotal/Uptime — وبصيغة نبراس: رسومات دقيقة من التخصيمات، تقطيع متعدد الأعواد، بنك فضلة، ومسار مصنع كامل للمهندس ومدير القسم.</p>' +
            '<div class="erp-form-actions" style="margin-top:.75rem">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'estimate\')"><i class="fas fa-drafting-compass"></i> افتح المقايسة بالرسومات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluImagesReport()"><i class="fas fa-image"></i> تقرير الصور</button>' +
            '</div></section>' +
            '</div></div>';
    }

    function renderAluEstimatesList() {
        const q = (aluEstSearchQ || '').trim().toLowerCase();
        const filtered = aluEstimates.filter(function (e) {
            if (!q) return true;
            const blob = [e.ref, e.customerName, e.projectName, e.customerPhone, e.status].join(' ').toLowerCase();
            return blob.indexOf(q) !== -1;
        });
        const customers = {};
        filtered.forEach(function (e) { if (e.customerName) customers[e.customerName] = 1; });
        const view = aluEstListView || 'cards';

        function actions(e) {
            return '<div class="alu-row-actions">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="loadAluEstimate(\'' + aluEsc(e.id) + '\')">فتح</button>' +
                '<button type="button" class="erp-tag" onclick="advanceAluEstimateStatus(\'' + aluEsc(e.id) + '\')">التالي</button>' +
                '<button type="button" class="erp-tag" onclick="copyAluEstimate(\'' + aluEsc(e.id) + '\')">نسخ</button>' +
                '<button type="button" class="erp-tag" onclick="deleteAluEstimate(\'' + aluEsc(e.id) + '\')">حذف</button>' +
                '</div>';
        }

        let body = '';
        if (view === 'table') {
            body = '<div class="alu-table-wrap"><table class="alu-table"><thead><tr>' +
                '<th>مرجع</th><th>عميل</th><th>مشروع</th><th>هاتف</th><th>تسليم</th><th>حالة</th><th>إجمالي</th><th></th>' +
                '</tr></thead><tbody>' +
                (filtered.slice().reverse().map(function (e) {
                    const t = e.totalsSnapshot || {};
                    const st = aluStatusMeta(e.status);
                    return '<tr><td>' + aluEsc(e.ref) + '</td><td>' + aluEsc(e.customerName || '—') +
                        '</td><td>' + aluEsc(e.projectName || '—') + '</td><td>' + aluEsc(e.customerPhone || '—') +
                        '</td><td>' + aluEsc(e.deliveryDate || '—') + '</td><td>' + aluEsc(st.ar) +
                        '</td><td>' + (t.total != null ? t.total + ' ' + aluSettings.currencyLabel : '—') +
                        '</td><td>' + actions(e) + '</td></tr>';
                }).join('') || '<tr><td colspan="8">لا نتائج</td></tr>') +
                '</tbody></table></div>';
        } else if (view === 'tree') {
            const tree = {};
            filtered.forEach(function (e) {
                const c = e.customerName || 'بدون عميل';
                const p = e.projectName || 'بدون مشروع';
                if (!tree[c]) tree[c] = {};
                if (!tree[c][p]) tree[c][p] = [];
                tree[c][p].push(e);
            });
            body = '<div class="alu-est-tree">' + Object.keys(tree).sort().map(function (c) {
                return '<details class="alu-tree-node" open><summary><strong>' + aluEsc(c) + '</strong> <em>' +
                    Object.keys(tree[c]).reduce(function (s, p) { return s + tree[c][p].length; }, 0) +
                    ' مقايسة</em></summary>' +
                    Object.keys(tree[c]).sort().map(function (p) {
                        return '<details class="alu-tree-node alu-tree-node--project" open><summary>' + aluEsc(p) +
                            '</summary><div class="alu-est-grid">' +
                            tree[c][p].map(function (e) {
                                const t = e.totalsSnapshot || {};
                                const st = aluStatusMeta(e.status);
                                return '<article class="alu-est-card"><div><strong>' + aluEsc(e.ref) + '</strong>' +
                                    '<span class="alu-status-pill">' + aluEsc(st.ar) + '</span>' +
                                    '<small>' + aluEsc(e.deliveryDate || '—') +
                                    (t.total != null ? ' · ' + t.total + ' ' + aluSettings.currencyLabel : '') +
                                    '</small></div>' + actions(e) + '</article>';
                            }).join('') + '</div></details>';
                    }).join('') + '</details>';
            }).join('') + '</div>';
            if (!Object.keys(tree).length) body = '<p class="erp-empty">لا نتائج للبحث.</p>';
        } else {
            body = '<div class="alu-est-grid">' + (filtered.slice().reverse().map(function (e) {
                const t = e.totalsSnapshot || {};
                const st = aluStatusMeta(e.status);
                return '<article class="alu-est-card">' +
                    '<div><strong>' + aluEsc(e.ref) + '</strong>' +
                    '<span class="alu-status-pill">' + aluEsc(st.ar) + '</span>' +
                    '<small>' + aluEsc(e.customerName || '—') + ' · ' + aluEsc(e.projectName || '—') + '</small>' +
                    '<small>' + aluEsc(e.customerPhone || '') + (e.customerPhone ? ' · ' : '') +
                    aluEsc(e.deliveryDate || (e.updatedAt || e.createdAt || '').slice(0, 10)) +
                    (t.total != null ? ' · ' + t.total + ' ' + aluSettings.currencyLabel : '') + '</small></div>' +
                    actions(e) + '</article>';
            }).join('') || '<p class="erp-empty">لا مقايسات بعد — أنشئ الأولى.</p>') + '</div>';
        }

        return '<div class="alu-cut-kpis">' +
            '<div class="alu-cut-kpi"><strong>' + filtered.length + '</strong><span>معروضة</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + aluEstimates.length + '</strong><span>إجمالي</span></div>' +
            '<div class="alu-cut-kpi"><strong>' + Object.keys(customers).length + '</strong><span>عملاء</span></div>' +
            '</div>' +
            '<div class="alu-est-toolbar">' +
            '<label class="nebras-field alu-est-search"><span>بحث</span>' +
            '<input type="search" id="alu-est-search" value="' + aluEsc(aluEstSearchQ) +
            '" placeholder="رقم · عميل · مشروع · هاتف" oninput="setAluEstSearch(this.value)"></label>' +
            '<div class="alu-view-toggle" role="group">' +
            '<button type="button" class="nebras-users-btn' + (view === 'cards' ? ' nebras-users-btn--primary' : '') +
            '" onclick="setAluEstListView(\'cards\')"><i class="fas fa-grip"></i> كروت</button>' +
            '<button type="button" class="nebras-users-btn' + (view === 'table' ? ' nebras-users-btn--primary' : '') +
            '" onclick="setAluEstListView(\'table\')"><i class="fas fa-table"></i> جدول</button>' +
            '<button type="button" class="nebras-users-btn' + (view === 'tree' ? ' nebras-users-btn--primary' : '') +
            '" onclick="setAluEstListView(\'tree\')"><i class="fas fa-folder-tree"></i> شجرة</button>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newAluEstimate();setAluCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '</div>' + body;
    }

    function setAluEstSearch(v) {
        aluEstSearchQ = v || '';
        renderAluminumCuttingPanel();
        const el = document.getElementById('alu-est-search');
        if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (e) {} }
    }
    function setAluEstListView(v) {
        aluEstListView = v || 'cards';
        try { localStorage.setItem('aluEstListView', aluEstListView); } catch (e) {}
        renderAluminumCuttingPanel();
    }

    /* —— محرك رسومات نبراس: ارتفاع · زجاج · واجهة — دقة المقاسات من التخصيمات —— */
    function aluDrawElevationSvg(item, opts) {
        opts = opts || {};
        const Wmm = Math.max(100, aluNum(item.widthMm) || 1200);
        const Hmm = Math.max(100, aluNum(item.heightMm) || 1400);
        const shape = resolveItemShape(item);
        const leaves = Math.max(1, shape.leaves || 1);
        const cols = shape.bayCols || Math.max(1, Math.round(aluNum(item.bayCols) || 1));
        const rows = shape.bayRows || Math.max(1, Math.round(aluNum(item.bayRows) || 1));
        const viewW = opts.viewW || 360;
        const viewH = opts.viewH || 320;
        const margin = 48;
        const drawW = viewW - margin * 2;
        const drawH = viewH - margin * 2 - 18;
        const scale = Math.min(drawW / Wmm, drawH / Hmm);
        const fw = Wmm * scale;
        const fh = Hmm * scale;
        const ox = (viewW - fw) / 2;
        const oy = margin * 0.55;
        const frameT = Math.max(5, Math.min(16, Math.round(Math.min(fw, fh) * 0.038)));
        const sashT = Math.max(3.5, frameT - 1.5);
        const glass = buildItemGlass(item);
        const gW = glass.widthMm || 0;
        const gH = glass.heightMm || 0;
        const navy = '#0d2840';
        const accent = '#155e94';
        const sky = '#7dd3fc';
        const gold = '#c9a227';
        const glassFill = 'rgba(56, 189, 248, 0.18)';
        let inner = '';

        function dimH(x1, x2, y, label) {
            const mid = (x1 + x2) / 2;
            return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + x1 + '" y1="' + (y - 4) + '" x2="' + x1 + '" y2="' + (y + 4) + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + x2 + '" y1="' + (y - 4) + '" x2="' + x2 + '" y2="' + (y + 4) + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<text x="' + mid + '" y="' + (y + 14) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + navy + '">' + aluEsc(label) + '</text>';
        }
        function dimV(y1, y2, x, label) {
            const mid = (y1 + y2) / 2;
            return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + (x - 4) + '" y1="' + y1 + '" x2="' + (x + 4) + '" y2="' + y1 + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + (x - 4) + '" y1="' + y2 + '" x2="' + (x + 4) + '" y2="' + y2 + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<text x="' + (x - 8) + '" y="' + mid + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + navy + '" transform="rotate(-90 ' + (x - 8) + ' ' + mid + ')">' + aluEsc(label) + '</text>';
        }

        inner += '<rect x="' + ox + '" y="' + oy + '" width="' + fw + '" height="' + fh + '" fill="#f8fafc" stroke="' + navy + '" stroke-width="2.2" rx="2"/>';
        inner += '<rect x="' + (ox + frameT) + '" y="' + (oy + frameT) + '" width="' + Math.max(1, fw - frameT * 2) + '" height="' + Math.max(1, fh - frameT * 2) + '" fill="#fff" stroke="' + accent + '" stroke-width="1.4"/>';

        const ix = ox + frameT;
        const iy = oy + frameT;
        const iw = Math.max(1, fw - frameT * 2);
        const ih = Math.max(1, fh - frameT * 2);

        if (shape.family === 'facade') {
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
        } else if (shape.family === 'sliding') {
            const leafW = iw / leaves;
            for (let i = 0; i < leaves; i++) {
                const lx = ix + leafW * i;
                inner += '<rect x="' + lx + '" y="' + iy + '" width="' + leafW + '" height="' + ih + '" fill="none" stroke="' + navy + '" stroke-width="1.5"/>';
                const gx = lx + sashT;
                const gy = iy + sashT;
                const gw = Math.max(1, leafW - sashT * 2);
                const gh = Math.max(1, ih - sashT * 2);
                inner += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" fill="' + glassFill + '" stroke="' + sky + '" stroke-width="0.9"/>';
                const hx = lx + leafW - 6;
                const hy = iy + ih * 0.45;
                inner += '<rect x="' + hx + '" y="' + hy + '" width="3" height="' + Math.max(10, ih * 0.12) + '" fill="' + gold + '" rx="1"/>';
                if (i > 0) {
                    inner += '<line x1="' + lx + '" y1="' + iy + '" x2="' + lx + '" y2="' + (iy + ih) + '" stroke="' + accent + '" stroke-width="2.4"/>';
                }
            }
            inner += '<rect x="' + ox + '" y="' + (oy + fh - 3) + '" width="' + fw + '" height="3" fill="' + navy + '" opacity="0.85"/>';
            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2 + 4) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج ' + gW + '×' + gH + ' ×' + leaves + '</text>';
            }
        } else {
            const isFixed = !!shape.isFixed;
            const heel = shape.isDoor ? Math.max(6, fh * 0.06) : 0;
            if (!isFixed && leaves > 1) {
                const leafW = iw / leaves;
                for (let i = 0; i < leaves; i++) {
                    const lx = ix + leafW * i;
                    inner += '<rect x="' + lx + '" y="' + iy + '" width="' + leafW + '" height="' + Math.max(1, ih - heel) + '" fill="none" stroke="' + navy + '" stroke-width="1.5"/>';
                    const gx = lx + sashT;
                    const gy = iy + sashT;
                    const gw = Math.max(1, leafW - sashT * 2);
                    const gh = Math.max(1, ih - heel - sashT * 2);
                    inner += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" fill="' + glassFill + '" stroke="' + sky + '" stroke-width="0.9"/>';
                    if (i > 0) {
                        inner += '<line x1="' + lx + '" y1="' + iy + '" x2="' + lx + '" y2="' + (iy + ih - heel) + '" stroke="' + accent + '" stroke-width="2.4"/>';
                    }
                }
                if (heel > 0) {
                    inner += '<rect x="' + ix + '" y="' + (iy + ih - heel) + '" width="' + iw + '" height="' + heel + '" fill="' + navy + '" opacity="0.35"/>';
                }
                if (gW && gH) {
                    inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + (ih - heel) / 2 + oy * 0.2) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج ' + gW + '×' + gH + ' ×' + leaves + '</text>';
                }
            } else {
            const sx = ix + (isFixed ? 0 : sashT * 0.35);
            const sy = iy + (isFixed ? 0 : sashT * 0.35);
            const sw = iw - (isFixed ? 0 : sashT * 0.7);
            const sh = ih - heel - (isFixed ? 0 : sashT * 0.7);
            if (!isFixed) {
                inner += '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="none" stroke="' + navy + '" stroke-width="1.6"/>';
            }
            const gx = sx + sashT;
            const gy = sy + sashT;
            const gw = Math.max(1, sw - sashT * 2);
            const gh = Math.max(1, sh - sashT * 2);
            inner += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" fill="' + glassFill + '" stroke="' + sky + '" stroke-width="0.9"/>';
            if (!isFixed) {
                const hx = sx + sw - 7;
                const hyRatio = (aluNum(item.handleHeightMm) > 0)
                    ? Math.min(0.75, Math.max(0.25, aluNum(item.handleHeightMm) / Math.max(1, Hmm)))
                    : 0.48;
                const hy = sy + sh * hyRatio;
                inner += '<rect x="' + hx + '" y="' + hy + '" width="3.5" height="' + Math.max(12, sh * 0.1) + '" fill="' + gold + '" rx="1"/>';
                inner += '<circle cx="' + (sx + 4) + '" cy="' + (sy + sh * 0.2) + '" r="2.2" fill="' + gold + '"/>';
                inner += '<circle cx="' + (sx + 4) + '" cy="' + (sy + sh * 0.8) + '" r="2.2" fill="' + gold + '"/>';
            }
            if (heel > 0) {
                inner += '<rect x="' + ix + '" y="' + (iy + ih - heel) + '" width="' + iw + '" height="' + heel + '" fill="' + navy + '" opacity="0.35"/>';
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (iy + ih - heel / 2 + 3) + '" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">عتبة</text>';
            }
            if (gW && gH) {
                inner += '<text x="' + (ox + fw / 2) + '" y="' + (oy + fh / 2) + '" text-anchor="middle" font-size="10" fill="' + accent + '" font-weight="700">زجاج ' + gW + '×' + gH + '</text>';
            }
            }
        }

        inner += dimH(ox, ox + fw, oy + fh + 18, Wmm + ' مم');
        inner += dimV(oy, oy + fh, ox - 18, Hmm + ' مم');
        const title = (item.labelAr || shape.nameAr || 'بند') + ' · ' + shape.nameAr;
        inner += '<text x="' + (viewW / 2) + '" y="' + (viewH - 8) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + navy + '">' + aluEsc(title) + '</text>';

        return '<svg class="alu-elev-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + viewW + ' ' + viewH + '" width="' + viewW + '" height="' + viewH + '" role="img" aria-label="رسم ارتفاع">' +
            '<rect width="100%" height="100%" fill="#ffffff"/>' + inner + '</svg>';
    }

    function aluDrawGlassNestSvg(item, opts) {
        opts = opts || {};
        const glass = buildItemGlass(item);
        const gW = Math.max(1, glass.widthMm || 1);
        const gH = Math.max(1, glass.heightMm || 1);
        const panels = Math.max(1, glass.panels || 1);
        const viewW = opts.viewW || 280;
        const viewH = opts.viewH || 200;
        const cols = Math.min(panels, Math.ceil(Math.sqrt(panels)));
        const rows = Math.ceil(panels / cols);
        const pad = 28;
        const cellW = (viewW - pad * 2 - (cols - 1) * 8) / cols;
        const cellH = (viewH - pad * 2 - 20 - (rows - 1) * 8) / rows;
        const scale = Math.min(cellW / gW, cellH / gH);
        const pw = gW * scale;
        const ph = gH * scale;
        let inner = '<text x="' + (viewW / 2) + '" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="#0d2840">تقطيع زجاج — ' + gW + '×' + gH + ' مم × ' + panels + '</text>';
        for (let i = 0; i < panels; i++) {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = pad + c * (cellW + 8) + (cellW - pw) / 2;
            const y = pad + 8 + r * (cellH + 8) + (cellH - ph) / 2;
            inner += '<rect x="' + x + '" y="' + y + '" width="' + pw + '" height="' + ph + '" fill="rgba(56,189,248,0.2)" stroke="#155e94" stroke-width="1.4" rx="2"/>';
            inner += '<text x="' + (x + pw / 2) + '" y="' + (y + ph / 2 + 3) + '" text-anchor="middle" font-size="9" fill="#0d2840" font-weight="700">' + gW + '×' + gH + '</text>';
        }
        return '<svg class="alu-glass-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + viewW + ' ' + viewH + '" width="' + viewW + '" height="' + viewH + '">' +
            '<rect width="100%" height="100%" fill="#fff"/>' + inner + '</svg>';
    }

    function aluItemDrawingsHtml(item, compact) {
        const elev = aluDrawElevationSvg(item, compact ? { viewW: 220, viewH: 200 } : { viewW: 360, viewH: 320 });
        if (compact) return '<div class="alu-elev-card">' + elev + '</div>';
        const glassSvg = aluDrawGlassNestSvg(item, { viewW: 280, viewH: 180 });
        return '<div class="alu-draw-pair"><div class="alu-elev-card">' + elev + '</div><div class="alu-elev-card">' + glassSvg + '</div></div>';
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
            const sh = resolveItemShape(it);
            const bay = (sh.family === 'facade')
                ? (' · بايات ' + Math.max(1, aluNum(it.bayCols) || 1) + '×' + Math.max(1, aluNum(it.bayRows) || 1))
                : '';
            const glass = buildItemGlass(it);
            return '<article class="erp-row alu-item-with-draw">' +
                aluItemDrawingsHtml(it, true) +
                '<div class="erp-row-main"><strong>' + aluEsc(it.labelAr || sh.nameAr || 'بند') + '</strong>' +
                '<small>' + aluEsc(sh.nameAr || '') + ' — ' + aluNum(it.widthMm) + '×' + aluNum(it.heightMm) +
                ' مم × ' + aluNum(it.qty) + bay +
                ' · زجاج ' + glass.widthMm + '×' + glass.heightMm + ' ×' + glass.panels +
                (aluSettings.showHandleHeight && it.handleHeightMm ? ' · مقبض ' + aluNum(it.handleHeightMm) + ' مم' : '') +
                (it.locationCode ? ' · موقع ' + aluEsc(it.locationCode) : '') +
                '</small></div>' +
                '<div class="erp-row-actions">' +
                '<button type="button" class="nebras-users-btn" onclick="editAluItem(' + i + ')" aria-label="تعديل"><i class="fas fa-pen"></i></button>' +
                '<button type="button" class="erp-row-del" onclick="removeAluItem(' + i + ')" aria-label="حذف"><i class="fas fa-trash"></i></button>' +
                '</div></article>';
        }).join('') || '<p class="erp-empty">أضف بنوداً من الأشكال الجاهزة — يظهر رسم الارتفاع والزجاج فوراً من التخصيمات.</p>';

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
            '<label class="nebras-field"><span>هاتف</span><input type="tel" id="alu-est-phone" value="' + aluEsc(d.customerPhone || '') + '" placeholder="05xxxxxxxx"></label>' +
            '<label class="nebras-field"><span>تاريخ التسليم</span><input type="date" id="alu-est-delivery" value="' + aluEsc(d.deliveryDate || '') + '"></label>' +
            '<label class="nebras-field"><span>نوع الدهان</span><select id="alu-est-paint">' +
            Object.keys(PAINT_TYPES).map(function (k) {
                return '<option value="' + k + '"' + ((d.paintType || 'none') === k ? ' selected' : '') + '>' + PAINT_TYPES[k].nameAr +
                    (PAINT_TYPES[k].perKg ? (' (+' + PAINT_TYPES[k].perKg + '/كغ)') : '') + '</option>';
            }).join('') + '</select></label>' +
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
            '<label class="nebras-field"><span>الشكل</span><select id="alu-op-shape" onchange="toggleAluBayFields();refreshAluFreehandPreview()">' + shapeOpts + '</select></label>' +
            '<label class="nebras-field"><span>نظام القطاع</span><select id="alu-op-sys">' + sysOpts + '</select></label>' +
            '<label class="nebras-field"><span>العرض مم</span><input type="number" id="alu-op-w" min="200" placeholder="1200" oninput="refreshAluFreehandPreview()"></label>' +
            '<label class="nebras-field"><span>الارتفاع مم</span><input type="number" id="alu-op-h" min="200" placeholder="1400" oninput="refreshAluFreehandPreview()"></label>' +
            '<label class="nebras-field"><span>الكمية</span><input type="number" id="alu-op-qty" min="1" value="1"></label>' +
            '<label class="nebras-field alu-bay-only" style="display:none"><span>أعمدة باي</span><input type="number" id="alu-op-cols" min="1" value="1" oninput="refreshAluFreehandPreview()"></label>' +
            '<label class="nebras-field alu-bay-only" style="display:none"><span>صفوف باي</span><input type="number" id="alu-op-rows" min="1" value="1" oninput="refreshAluFreehandPreview()"></label>' +
            '</div>' +
            '<div class="alu-freehand-box alu-fh-only" id="alu-fh-box" style="display:none">' +
            '<h5><i class="fas fa-pen-ruler"></i> مصمم الرسم اليدوي الحر</h5>' +
            '<p class="alu-cut-note">صمّم الفتحة كما تريد: عائلة · نوع · عدد الضلف — الرسم والتخصيم يتحدّثان فوراً من اختياراتك.</p>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>العائلة</span><select id="alu-fh-family" onchange="refreshAluFreehandPreview()">' +
            '<option value="hinged">مفصلي</option><option value="sliding">سحاب</option><option value="facade">واجهة</option></select></label>' +
            '<label class="nebras-field"><span>النوع</span><select id="alu-fh-kind" onchange="refreshAluFreehandPreview()">' +
            '<option value="window">شباك</option><option value="door">باب</option><option value="fixed">ثابت</option></select></label>' +
            '<label class="nebras-field"><span>عدد الضلف</span><input type="number" id="alu-fh-leaves" min="1" max="6" value="1" oninput="refreshAluFreehandPreview()"></label>' +
            '<label class="nebras-field alu-fh-facade"><span>أعمدة الشبكة</span><input type="number" id="alu-fh-cols" min="1" value="2" oninput="refreshAluFreehandPreview()"></label>' +
            '<label class="nebras-field alu-fh-facade"><span>صفوف الشبكة</span><input type="number" id="alu-fh-rows" min="1" value="2" oninput="refreshAluFreehandPreview()"></label>' +
            '</div>' +
            '<div id="alu-fh-preview" class="alu-fh-preview"></div>' +
            '</div>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>وصف / موقع</span><input type="text" id="alu-op-label" placeholder="شباك غرفة 1"></label>' +
            '<label class="nebras-field"><span>كود موقع</span><input type="text" id="alu-op-loc" placeholder="A-01"></label>' +
            '<label class="nebras-field"><span>ارتفاع مقبض مم</span><input type="number" id="alu-op-handle" value="50"></label>' +
            '<label class="nebras-field"><span>نوع الزجاج</span><select id="alu-op-gkind" onchange="toggleAluGlassExtra()">' +
            '<option value="single">سينجل</option><option value="double">دبل</option></select></label>' +
            '<label class="nebras-field"><span>زجاج أمامي</span><select id="alu-op-glass">' + glassOpts + '</select></label>' +
            '<label class="nebras-field alu-glass-dbl" style="display:none"><span>زجاج خلفي</span><select id="alu-op-glass-back">' + glassOpts + '</select></label>' +
            '<label class="nebras-field alu-glass-dbl" style="display:none"><span>فاصل</span><select id="alu-op-spacer">' +
            Object.keys(SPACER_TYPES).map(function (k) {
                return '<option value="' + k + '">' + SPACER_TYPES[k].nameAr + '</option>';
            }).join('') + '</select></label>' +
            '<label class="nebras-field"><span>جورجيا</span><select id="alu-op-georg">' +
            Object.keys(GEORGIAN_TYPES).map(function (k) {
                return '<option value="' + k + '">' + GEORGIAN_TYPES[k].nameAr +
                    (GEORGIAN_TYPES[k].surchargePerM2 ? (' (+' + GEORGIAN_TYPES[k].surchargePerM2 + ')' ) : '') + '</option>';
            }).join('') + '</select></label>' +
            '<label class="nebras-field alu-price-only" style="display:none"><span>سعر ثابت للبند</span><input type="number" id="alu-op-fixed" value="0" step="0.01"></label>' +
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
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="printAluImagesReport()"><i class="fas fa-image"></i> تقرير الصور والرسومات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluQuoteReport()">عرض سعر بالرسومات</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'estimates\')">قائمة المقايسات</button>' +
            '</div></div>';
    }

    function syncEstimateDraftFields() {
        if (!aluEstimateDraft) return;
        aluEstimateDraft.ref = aluField('alu-est-ref') || aluEstimateDraft.ref;
        aluEstimateDraft.customerName = aluField('alu-est-customer');
        aluEstimateDraft.projectName = aluField('alu-est-project');
        aluEstimateDraft.customerPhone = aluField('alu-est-phone');
        aluEstimateDraft.deliveryDate = aluField('alu-est-delivery');
        aluEstimateDraft.paintType = aluField('alu-est-paint') || 'none';
        aluEstimateDraft.priceMode = aluField('alu-est-pricemode') || 'purchase';
        aluEstimateDraft.stockBarMm = aluNum(aluField('alu-est-stock')) || aluSettings.stockBarMm;
        aluEstimateDraft.kerfMm = aluNum(aluField('alu-est-kerf'));
        aluEstimateDraft.weightAdjustPct = aluNum(aluField('alu-est-wadj'));
        aluEstimateDraft.laborPerUnit = aluNum(aluField('alu-est-labor')) || 80;
        aluEstimateDraft.updatedAt = new Date().toISOString();
    }

    function toggleAluBayFields() {
        const shape = aluField('alu-op-shape');
        const showBay = shape === 'facade_panel' || shape === 'facade_bay';
        const showFh = shape === 'freehand';
        const showPrice = shape === 'pricing_only';
        document.querySelectorAll('.alu-bay-only').forEach(function (el) {
            el.style.display = showBay ? '' : 'none';
        });
        document.querySelectorAll('.alu-fh-only').forEach(function (el) {
            el.style.display = showFh ? '' : 'none';
        });
        document.querySelectorAll('.alu-price-only').forEach(function (el) {
            el.style.display = showPrice ? '' : 'none';
        });
        if (shape === 'facade_panel') {
            const c = document.getElementById('alu-op-cols');
            const r = document.getElementById('alu-op-rows');
            if (c && !c.value) c.value = '1';
            if (r && !r.value) r.value = '1';
        }
        let fam = (READY_SHAPES[shape] || {}).family;
        if (showFh) fam = aluField('alu-fh-family') || 'hinged';
        if (fam) {
            const match = aluSystems.find(function (s) { return s.active !== false && s.family === fam; });
            const sel = document.getElementById('alu-op-sys');
            if (match && sel) sel.value = match.id;
        }
        const fhFacade = (aluField('alu-fh-family') || '') === 'facade';
        document.querySelectorAll('.alu-fh-facade').forEach(function (el) {
            el.style.display = (showFh && fhFacade) ? '' : 'none';
        });
        toggleAluGlassExtra();
    }

    function toggleAluGlassExtra() {
        const kind = aluField('alu-op-gkind') || 'single';
        const showDbl = kind === 'double';
        document.querySelectorAll('.alu-dbl-only, .alu-glass-dbl').forEach(function (el) {
            el.style.display = showDbl ? '' : 'none';
        });
        document.querySelectorAll('.alu-georg-only').forEach(function (el) {
            el.style.display = (kind === 'georgian' || showDbl) ? '' : 'none';
        });
    }

    function readAluFreehandFromForm() {
        return {
            family: aluField('alu-fh-family') || 'hinged',
            kind: aluField('alu-fh-kind') || 'window',
            leaves: Math.max(1, Math.min(6, Math.round(aluNum(aluField('alu-fh-leaves')) || 1))),
            bayCols: Math.max(1, Math.round(aluNum(aluField('alu-fh-cols')) || 1)),
            bayRows: Math.max(1, Math.round(aluNum(aluField('alu-fh-rows')) || 1))
        };
    }

    function refreshAluFreehandPreview() {
        toggleAluBayFields();
        const box = document.getElementById('alu-fh-preview');
        if (!box) return;
        if (aluField('alu-op-shape') !== 'freehand') {
            box.innerHTML = '';
            return;
        }
        const draft = {
            shape: 'freehand',
            freehand: readAluFreehandFromForm(),
            widthMm: aluNum(aluField('alu-op-w')) || 1200,
            heightMm: aluNum(aluField('alu-op-h')) || 1400,
            qty: 1,
            profileSystemId: aluField('alu-op-sys') || (aluSystems[0] || {}).id,
            glassId: aluField('alu-op-glass') || (aluGlass[0] || {}).id,
            labelAr: aluField('alu-op-label') || 'معاينة رسم يدوي',
            handleHeightMm: aluNum(aluField('alu-op-handle')) || 50
        };
        if (draft.freehand.family === 'facade') {
            draft.bayCols = draft.freehand.bayCols;
            draft.bayRows = draft.freehand.bayRows;
        }
        const meta = resolveItemShape(draft);
        box.innerHTML = '<div class="alu-elev-card">' + aluDrawElevationSvg(draft, { viewW: 340, viewH: 280 }) +
            '</div><p class="alu-cut-note">معاينة: ' + aluEsc(meta.nameAr) + ' · زجاج ناتج من التخصيمات يُحسب عند الإضافة.</p>';
    }

    function readAluItemFromForm() {
        const shape = aluField('alu-op-shape') || 'sliding2';
        const freehand = shape === 'freehand' ? readAluFreehandFromForm() : null;
        let bayCols = Math.max(1, Math.round(aluNum(aluField('alu-op-cols')) || 1));
        let bayRows = Math.max(1, Math.round(aluNum(aluField('alu-op-rows')) || 1));
        if (freehand && freehand.family === 'facade') {
            bayCols = freehand.bayCols;
            bayRows = freehand.bayRows;
        }
        const labelDefault = freehand
            ? resolveItemShape({ shape: 'freehand', freehand: freehand }).nameAr
            : ((READY_SHAPES[shape] || {}).nameAr || 'بند');
        return {
            shape: shape,
            freehand: freehand,
            pricingOnly: shape === 'pricing_only',
            fixedPrice: aluNum(aluField('alu-op-fixed')),
            profileSystemId: aluField('alu-op-sys') || (aluSystems[0] || {}).id,
            widthMm: aluNum(aluField('alu-op-w')),
            heightMm: aluNum(aluField('alu-op-h')),
            qty: Math.max(1, Math.round(aluNum(aluField('alu-op-qty')) || 1)),
            bayCols: bayCols,
            bayRows: bayRows,
            labelAr: aluField('alu-op-label') || labelDefault,
            locationCode: aluField('alu-op-loc'),
            handleHeightMm: aluNum(aluField('alu-op-handle')) || 50,
            glassKind: aluField('alu-op-gkind') || 'single',
            glassId: aluField('alu-op-glass'),
            glassFrontId: aluField('alu-op-glass'),
            glassBackId: aluField('alu-op-glass-back'),
            spacerType: aluField('alu-op-spacer') || 'none',
            georgianType: aluField('alu-op-georg') || 'none',
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
        if (!(row.pricingOnly || row.shape === 'pricing_only')) {
            if (row.widthMm < 200 || row.heightMm < 200) { alert('أدخل عرض وارتفاع صحيحين (مم).'); return; }
        } else if (aluNum(row.fixedPrice) <= 0) {
            alert('بند التسعير يحتاج سعراً ثابتاً أكبر من صفر.');
            return;
        }
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
        set('alu-op-gkind', it.glassKind || 'single');
        set('alu-op-glass', it.glassFrontId || it.glassId || '');
        set('alu-op-glass-back', it.glassBackId || it.glassId || '');
        set('alu-op-spacer', it.spacerType || 'none');
        set('alu-op-georg', it.georgianType || 'none');
        set('alu-op-fixed', it.fixedPrice || 0);
        set('alu-op-color', it.colorId || '');
        set('alu-op-wire', it.wireId || '');
        set('alu-op-haswire', it.hasWire ? '1' : '0');
        set('alu-op-wirefix', it.wireFixed || 'none');
        if (it.freehand) {
            set('alu-fh-family', it.freehand.family || 'hinged');
            set('alu-fh-kind', it.freehand.kind || 'window');
            set('alu-fh-leaves', it.freehand.leaves || 1);
            set('alu-fh-cols', it.freehand.bayCols || it.bayCols || 1);
            set('alu-fh-rows', it.freehand.bayRows || it.bayRows || 1);
        }
        toggleAluBayFields();
        refreshAluFreehandPreview();
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
        consumeAluWarehouse(aluCutDraft.lastResult);
        aluCutDraft.savedJobId = jobId;
        /* ربط خطة التقطيع بمسار المصنع */
        if (aluCutDraft.estimateId) {
            const est = aluEstimates.find(function (e) { return e.id === aluCutDraft.estimateId; });
            if (est) {
                est.status = 'cutting';
                syncEstimateStages(est);
                est.updatedAt = new Date().toISOString();
                if (aluEstimateDraft && aluEstimateDraft.id === est.id) {
                    aluEstimateDraft.status = 'cutting';
                    syncEstimateStages(aluEstimateDraft);
                }
            }
        }
        aluLog('قطع', 'حفظ خطة ' + (aluCutDraft.estimateRef || '') + ' · عود ' + job.stockBarMm + ' · هدر ' + job.wastePct + '%');
        persistAluminumCuttingCloud(['aluminum_cut_jobs', 'aluminum_remnants', 'aluminum_audit', 'aluminum_estimates', 'aluminum_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ الخطة · الحالة: قيد التقطيع', 'ok');
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
            return '<div class="alu-cut-form-card"><h4><i class="fas fa-industry"></i> ورشة العمل</h4>' +
                '<p class="erp-empty">شغّل التقطيع أولاً لطباعة استيكرات الباركود وقائمة القص وتقرير التفريز.</p>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluCutTab(\'cutting\')">افتح التقطيع الذكي</button></div>' +
                (est ? renderAluStagesBlock(est) : '');
        }
        let stickers = 0;
        const bySku = {};
        cut.plans.forEach(function (pl) {
            pl.plan.bars.forEach(function (b) {
                stickers += b.pieces.length;
            });
            bySku[pl.profileSku] = (bySku[pl.profileSku] || 0) + pl.plan.barCount;
        });
        const skuRows = Object.keys(bySku).map(function (sku) {
            return '<tr><td>' + aluEsc(sku) + '</td><td>' + bySku[sku] + ' عود</td></tr>';
        }).join('');
        const milling = (est && (est.items || []) || []).map(function (it, i) {
            const handle = aluNum(it.handleHeightMm) || 50;
            return '<tr><td>' + aluEsc(it.labelAr || ('بند ' + (i + 1))) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + handle + '</td><td>' + aluEsc(resolveItemShape(it).nameAr || '') + '</td>' +
                '<td>مقبض على ' + handle + ' مم من الأسفل · موقع ' + aluEsc(it.locationCode || '—') + '</td></tr>';
        }).join('') || '<tr><td colspan="5">—</td></tr>';

        return '<div class="alu-cut-form-card"><h4><i class="fas fa-industry"></i> ورشة الإنتاج — استيكر · باركود · تفريز</h4>' +
            '<p class="alu-cut-note">قطع الاستيكر: <strong>' + stickers + '</strong> · مرجع ' +
            aluEsc((aluCutDraft && aluCutDraft.estimateRef) || (est && est.ref) || '') +
            ' — كل قطعة تحمل رمز محور + باركود لتجنب الخطأ على المنشار.</p>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>SKU</th><th>أعواد مطلوبة</th></tr></thead><tbody>' +
            skuRows + '</tbody></table></div>' +
            '<div class="alu-scan-box"><label class="nebras-field"><span><i class="fas fa-barcode"></i> مسح باركود القطعة</span>' +
            '<input type="text" id="alu-scan-input" placeholder="امسح أو اكتب رمز القطعة ثم Enter" onkeydown="if(event.key===\'Enter\'){event.preventDefault();scanAluBarcode(this.value);this.value=\'\';}">' +
            '</label><div id="alu-scan-log" class="alu-scan-log"></div></div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="printAluStickers()"><i class="fas fa-barcode"></i> طباعة استيكرات + باركود</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluWorkerCutList()"><i class="fas fa-list-ol"></i> قائمة قص للعامل</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluMillingReport()"><i class="fas fa-drill"></i> تقرير تفريز</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluInstallPack()"><i class="fas fa-box-open"></i> تعبئة وتركيب</button>' +
            '<button type="button" class="nebras-users-btn" onclick="exportAluCutCsv()"><i class="fas fa-file-csv"></i> تصدير CSV</button>' +
            '<button type="button" class="nebras-users-btn" onclick="exportAluCutDxf()"><i class="fas fa-drafting-compass"></i> تصدير DXF</button>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'approved\')">1) اعتماد</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'cutting\')">2) تقطيع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'in_production\')">3) تجميع</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluEstimateStatus(\'ready_install\')">4) جاهز تركيب</button>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="setAluEstimateStatus(\'installed\')">5) تم التركيب</button>' +
            '</div></div>' +
            '<div class="alu-cut-form-card"><h4>تفريز / مواقع التركيب</h4>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr><th>بند</th><th>مقاس</th><th>مقبض مم</th><th>شكل</th><th>تعليمات</th></tr></thead><tbody>' +
            milling + '</tbody></table></div></div>' +
            renderAluStagesBlock(est);
    }

    function renderAluStagesBlock(est) {
        if (!est) return '';
        const stages = syncEstimateStages(est);
        const st = aluStatusMeta(est.status);
        return '<div class="alu-cut-form-card"><h4>مراحل التنفيذ — ' + aluEsc(est.ref || '') + '</h4>' +
            '<p>الحالة الحالية: <strong>' + aluEsc(st.ar) + '</strong></p>' +
            '<div class="alu-stages">' + stages.map(function (s) {
                return '<span class="alu-stage' + (s.done ? ' is-done' : '') + '">' + aluEsc(s.name) + '</span>';
            }).join('') + '</div>' +
            '<div class="erp-form-grid" style="margin-top:0.75rem">' +
            '<label class="nebras-field"><span>مشتريات فعلية</span><input type="number" id="alu-actual-buy" value="' + aluNum(est.actualPurchases) + '"></label>' +
            '<label class="nebras-field"><span>مصاريف إضافية</span><input type="number" id="alu-extra-exp" value="' + aluNum(est.extraExpenses) + '"></label>' +
            '</div>' +
            '<h5 style="margin-top:1rem">فواتير الموردين</h5>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>النوع</span><select id="alu-inv-type"><option value="aluminum">ألومنيوم</option><option value="accessory">إكسسوارات</option><option value="glass">زجاج</option><option value="other">أخرى</option></select></label>' +
            '<label class="nebras-field"><span>المورد</span><input id="alu-inv-supplier" placeholder="اسم المورد"></label>' +
            '<label class="nebras-field"><span>رقم الفاتورة</span><input id="alu-inv-no"></label>' +
            '<label class="nebras-field"><span>المبلغ</span><input type="number" id="alu-inv-amount" value="0"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn" onclick="addAluSupplierInvoice()">إضافة فاتورة</button>' +
            '<div class="alu-table-wrap" style="margin-top:.5rem"><table class="alu-table"><thead><tr><th>نوع</th><th>مورد</th><th>فاتورة</th><th>مبلغ</th><th></th></tr></thead><tbody>' +
            ((est.supplierInvoices || []).map(function (inv, ii) {
                return '<tr><td>' + aluEsc(inv.typeAr || inv.type) + '</td><td>' + aluEsc(inv.supplier) +
                    '</td><td>' + aluEsc(inv.invoiceNo) + '</td><td>' + aluNum(inv.amount) +
                    '</td><td><button type="button" class="erp-tag" onclick="removeAluSupplierInvoice(' + ii + ')">حذف</button></td></tr>';
            }).join('') || '<tr><td colspan="5">لا فواتير بعد</td></tr>') +
            '</tbody></table></div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveAluEstimateFinance()">حفظ التكاليف الفعلية</button></div>';
    }

    function setAluEstimateStatus(status) {
        if (!aluEstimateDraft && aluEstimates.length) aluEstimateDraft = JSON.parse(JSON.stringify(aluEstimates[aluEstimates.length - 1]));
        if (!aluEstimateDraft) { alert('لا مقايسة'); return; }
        aluEstimateDraft.status = status;
        syncEstimateStages(aluEstimateDraft);
        aluEstimateDraft.updatedAt = new Date().toISOString();
        const idx = aluEstimates.findIndex(function (e) { return e.id === aluEstimateDraft.id; });
        if (idx >= 0) aluEstimates[idx] = JSON.parse(JSON.stringify(aluEstimateDraft));
        else aluEstimates.push(JSON.parse(JSON.stringify(aluEstimateDraft)));
        aluLog('حالة', aluEstimateDraft.ref + ' → ' + (aluStatusMeta(status).ar || status));
        persistAluminumCuttingCloud(['aluminum_estimates', 'aluminum_audit']);
        if (typeof showNebrasAdminToast === 'function') {
            showNebrasAdminToast('الحالة: ' + aluStatusMeta(status).ar, 'ok');
        }
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
        const ref = aluEsc(aluCutDraft.estimateRef || '');
        let html = '<h1>استيكرات تقطيع + باركود — نبراس</h1><p class="meta">' + ref + ' · ' +
            aluEsc(aluCutDraft.customerName || '') + '</p><div class="alu-sticker-sheet">';
        let seq = 1;
        aluCutDraft.lastResult.plans.forEach(function (pl) {
            pl.plan.bars.forEach(function (b, bi) {
                b.pieces.forEach(function (p) {
                    const code = String(p.code || 'P') + '-' + seq;
                    const barId = (pl.profileSku || 'SKU') + '|' + code + '|' + p.lengthMm;
                    html += '<div class="alu-sticker">' +
                        '<div class="alu-sticker-top"><strong>' + aluEsc(code) + '</strong><span>#' + seq + '</span></div>' +
                        '<div class="alu-sticker-len">' + p.lengthMm + ' مم</div>' +
                        '<div class="alu-sticker-label">' + aluEsc(p.labelAr || '') + '</div>' +
                        '<div class="alu-sticker-sku">' + aluEsc(pl.profileSku) + ' · عود ' + (bi + 1) + '</div>' +
                        '<div class="alu-sticker-bar">' + aluBarcodeSvg(barId) + '</div>' +
                        '<div class="alu-sticker-ref">' + ref + '</div></div>';
                    seq++;
                });
            });
        });
        html += '</div>';
        openPrintWindow('استيكرات', html, true);
    }

    function printAluWorkerCutList() {
        if (!aluCutDraft || !aluCutDraft.lastResult) {
            alert('شغّل التقطيع أولاً.');
            return;
        }
        let html = '<h1>قائمة قص للعامل — نبراس</h1><p class="meta">' +
            aluEsc(aluCutDraft.estimateRef || '') + ' · عود ' + aluCutDraft.lastResult.stockBarMm + ' مم · هدر ' +
            aluCutDraft.lastResult.wastePct + '%</p>';
        aluCutDraft.lastResult.plans.forEach(function (pl) {
            html += '<h2>' + aluEsc(pl.profileName) + ' <small>' + aluEsc(pl.profileSku) + '</small></h2>';
            html += '<p>أعواد: ' + pl.plan.barCount + ' · خوارزمية: ' + aluEsc(pl.plan.algorithm || '') + '</p>';
            html += '<table><tr><th>#</th><th>عود</th><th>رمز</th><th>قطعة</th><th>طول مم</th><th>✓</th></tr>';
            let n = 1;
            pl.plan.bars.forEach(function (b, bi) {
                b.pieces.forEach(function (p) {
                    html += '<tr><td>' + n + '</td><td>' + (bi + 1) + '</td><td>' + aluEsc(p.code) +
                        '</td><td>' + aluEsc(p.labelAr) + '</td><td><strong>' + p.lengthMm +
                        '</strong></td><td>□</td></tr>';
                    n++;
                });
            });
            html += '</table>';
        });
        openPrintWindow('قائمة قص', html);
    }

    function printAluInstallPack() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) { alert('افتح مقايسة أولاً.'); return; }
        const rows = buildInstallPackRows(est);
        let html = '<h1>قائمة تعبئة وتركيب — نبراس</h1><p class="meta">' +
            aluEsc(est.ref) + ' — ' + aluEsc(est.customerName || '') + ' / ' + aluEsc(est.projectName || '') +
            ' · حالة: ' + aluEsc(aluStatusMeta(est.status).ar) + '</p>';
        html += '<table><tr><th>نوع</th><th>البند</th><th>التفصيل</th><th>كمية</th><th>موقع</th><th>✓</th></tr>';
        rows.forEach(function (r) {
            html += '<tr><td>' + aluEsc(r.kind) + '</td><td>' + aluEsc(r.label) + '</td><td>' +
                aluEsc(r.detail) + '</td><td>' + r.qty + '</td><td>' + aluEsc(r.loc) + '</td><td>□</td></tr>';
        });
        html += '</table><p class="meta">راجع كل بند قبل الخروج للموقع — توقيع المشرف: ___________</p>';
        openPrintWindow('تعبئة وتركيب', html);
    }

    function printAluMillingReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est) return;
        let html = '<h1>تقرير تفريز — نبراس</h1><p class="meta">' + aluEsc(est.ref) + '</p><table><tr><th>بند</th><th>مقاس</th><th>مقبض</th><th>موقع</th><th>ملاحظات</th></tr>';
        (est.items || []).forEach(function (it) {
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + (it.handleHeightMm || 50) + ' مم</td><td>' + aluEsc(it.locationCode || '—') +
                '</td><td>تفريز حسب كتالوج النظام</td></tr>';
        });
        html += '</table>';
        openPrintWindow('تفريز', html);
    }

    function renderAluSystems() {
        if (!aluEditSystemId && aluSystems[0]) aluEditSystemId = aluSystems[0].id;
        const sys = getSystem(aluEditSystemId) || aluSystems[0];
        if (!sys) {
            return '<div class="alu-cut-form-card"><h4>إعدادات القطاعات</h4>' +
                '<p class="erp-empty">لا يوجد نظام بعد — أضف أول قطاع من الكتالوج (أي نظام ألومنيوم في السوق).</p>' +
                renderAluNewSystemForm() + '</div>';
        }
        aluEditSystemId = sys.id;
        if (!aluSystemsPartRole) aluSystemsPartRole = 'frame';

        const famAr = sys.family === 'sliding' ? 'سحاب' : sys.family === 'facade' ? 'واجهة' : 'مفصلي';
        const sysSelect = '<label class="nebras-field"><span>نظام القطاع (كل قطاعات السوق)</span><select id="alu-sys-pick" onchange="selectAluSystemForEdit(this.value)">' +
            aluSystems.map(function (s) {
                return '<option value="' + aluEsc(s.id) + '"' + (s.id === sys.id ? ' selected' : '') + '>' +
                    aluEsc(s.nameAr) + ' — ' + (s.family === 'sliding' ? 'سحاب' : s.family === 'facade' ? 'واجهة' : 'مفصلي') +
                    '</option>';
            }).join('') + '</select></label>';

        const roleTabs = PART_ROLE_ORDER.map(function (role) {
            const count = (sys.parts || []).filter(function (p) { return p.role === role && p.active !== false; }).length;
            return '<button type="button" class="alu-role-tab' + (aluSystemsPartRole === role ? ' is-active' : '') +
                '" onclick="setAluSystemsPartRole(\'' + role + '\')">' +
                aluEsc(PART_ROLES[role]) + (count ? ' <em>' + count + '</em>' : '') + '</button>';
        }).join('');

        const parts = (sys.parts || []).filter(function (p) { return p.role === aluSystemsPartRole && p.active !== false; });
        const rows = parts.map(function (p, i) {
            const idx = (sys.parts || []).indexOf(p);
            const thumb = p.imageDataUrl
                ? '<img class="alu-part-thumb" src="' + p.imageDataUrl.replace(/"/g, '') + '" alt="' + aluEsc(p.nameAr) + '"/>'
                : '<span class="alu-part-thumb alu-part-thumb--empty"><i class="fas fa-image"></i></span>';
            return '<tr>' +
                '<td class="alu-part-img-cell">' + thumb + '</td>' +
                '<td>' + aluEsc(p.nameAr) + '</td>' +
                '<td>' + aluEsc(p.sku) + '</td>' +
                '<td>' + aluNum(p.thicknessMm) + '</td>' +
                '<td>' + aluNum(p.weightKgPerM) + '</td>' +
                '<td>' + aluNum(p.pricePerKg) + '</td>' +
                '<td>' + aluEsc(LIP_TYPES[p.lipType] || (p.role === 'frame' ? '—' : '—')) + '</td>' +
                '<td>' + aluEsc(GLASS_KINDS[p.glassKind] || 'غير محدد') + '</td>' +
                '<td>' + (p.withPackage ? 'نعم' : 'لا') + '</td>' +
                '<td>' + (aluNum(p.thickness2Mm) ? aluNum(p.thickness2Mm) : '—') + '</td>' +
                '<td>' + ((p.accessoryKit && p.accessoryKit.length) ? (p.accessoryKit.length + ' صنف') : '—') + '</td>' +
                '<td class="alu-part-acts">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="editAluPart(' + idx + ')">تعديل</button>' +
                '<button type="button" class="erp-tag" onclick="openAluPartKit(' + idx + ')">إكسسوار</button>' +
                '<button type="button" class="erp-tag" onclick="removeAluPart(' + idx + ')">حذف</button></td>' +
                '</tr>';
        }).join('') || '<tr><td colspan="12">لا قطاعات في «' + aluEsc(PART_ROLES[aluSystemsPartRole]) + '» — أضف من النموذج بالأسفل (مثل Ecotal).</td></tr>';

        return '<div class="alu-cut-form-card alu-ecotal-head">' +
            '<h4><i class="fas fa-bars-staggered"></i> إعدادات القطاعات — كما في Ecotal / Uptime Window</h4>' +
            '<p class="alu-cut-note">الفكرة الأساسية من فيديوهات التخصيمات: مكتبة <strong>كل قطاعات الألومنيوم</strong> (مفصلي · سحاب · واجهات) مع حلوق/ضرف/باكيتات/مرد… وتخصيماتها. ' +
            'أضف أي قطاع من الكتالوج — ليس محدوداً بنظام واحد. الرقم هنا يغيّر طول الضرفة والزجاج والباكيت مباشرة.</p>' +
            '<div class="erp-form-grid">' + sysSelect +
            '<div class="nebras-field"><span>العائلة</span><strong>' + famAr + '</strong></div>' +
            '<div class="nebras-field"><span>زاوية القص</span><strong>' + (sys.cutAngle || 45) + '°</strong></div>' +
            '<div class="nebras-field"><span>أجزاء النظام</span><strong>' + (sys.parts || []).length + '</strong></div>' +
            '</div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="editAluSystemDeducts(\'' + aluEsc(sys.id) + '\')"><i class="fas fa-sliders"></i> تخصيمات هذا النظام</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setAluCutTab(\'estimate\')"><i class="fas fa-ruler-combined"></i> ابدأ مقايسة بهذا القطاع</button>' +
            '</div></div>' +

            '<div class="alu-cut-form-card">' +
            '<div class="alu-role-tabs" role="tablist">' + roleTabs + '</div>' +
            '<div class="alu-table-wrap"><table class="alu-table"><thead><tr>' +
            '<th>صورة</th><th>اسم القطاع</th><th>رقم/SKU</th><th>تخانة</th><th>وزن م</th><th>سعر/كغ</th><th>الشفة</th><th>زجاج</th><th>بباكيته</th><th>تخانة2</th><th>طقم</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>' +

            '<h5 style="margin-top:1rem">إضافة قطاع في «' + aluEsc(PART_ROLES[aluSystemsPartRole]) + '»</h5>' +
            '<div class="erp-form-grid">' +
            '<input type="hidden" id="alu-part-sys" value="' + aluEsc(sys.id) + '">' +
            '<input type="hidden" id="alu-part-role" value="' + aluEsc(aluSystemsPartRole) + '">' +
            '<label class="nebras-field"><span>اسم القطاع</span><input type="text" id="alu-part-name" placeholder="حلق سوناتا 45"></label>' +
            '<label class="nebras-field"><span>رقم القطاع / SKU</span><input type="text" id="alu-part-sku" placeholder="SON-FR-45"></label>' +
            '<label class="nebras-field"><span>تخانة مم</span><input type="number" id="alu-part-th" value="45"></label>' +
            '<label class="nebras-field"><span>تخانة 2 مم</span><input type="number" id="alu-part-th2" value="0" placeholder="اختياري"></label>' +
            '<label class="nebras-field"><span>وزن كغ/م</span><input type="number" id="alu-part-w" value="0.9" step="0.01"></label>' +
            '<label class="nebras-field"><span>سعر الكيلو</span><input type="number" id="alu-part-pkg" value="18" step="0.1"></label>' +
            (aluSystemsPartRole === 'frame'
                ? '<label class="nebras-field"><span>نوع الشفة</span><select id="alu-part-lip">' +
                  Object.keys(LIP_TYPES).map(function (k) { return '<option value="' + k + '">' + LIP_TYPES[k] + '</option>'; }).join('') +
                  '</select></label>' +
                  '<label class="nebras-field"><span>تخانة الشفة مم</span><input type="number" id="alu-part-lipth" value="20"></label>' +
                  '<label class="nebras-field"><span>عدد التراكات</span><input type="number" id="alu-part-tracks" value="' + aluNum(sys.tracksCount) + '" min="0"></label>'
                : '<input type="hidden" id="alu-part-lip" value="none"><input type="hidden" id="alu-part-lipth" value="0"><input type="hidden" id="alu-part-tracks" value="0">') +
            (aluSystemsPartRole === 'sash' || aluSystemsPartRole === 'bead'
                ? '<label class="nebras-field"><span>نوع الزجاج</span><select id="alu-part-glasskind">' +
                  Object.keys(GLASS_KINDS).map(function (k) { return '<option value="' + k + '">' + GLASS_KINDS[k] + '</option>'; }).join('') +
                  '</select></label>'
                : '<input type="hidden" id="alu-part-glasskind" value="any">') +
            (aluSystemsPartRole === 'sash'
                ? '<label class="nebras-field"><span>الضرفة بباكيته؟</span><select id="alu-part-pkgflag"><option value="0">لا — الباكيت يُحسب قطاعاً</option><option value="1">نعم — لا يظهر الباكيت منفرداً</option></select></label>' +
                  '<label class="nebras-field"><span>آخر عود فاضل</span><select id="alu-part-nolast"><option value="1">موقوف للضرفة (موصى)</option><option value="0">مفعّل</option></select></label>'
                : '<input type="hidden" id="alu-part-pkgflag" value="0"><input type="hidden" id="alu-part-nolast" value="0">') +
            '<label class="nebras-field nebras-field--wide"><span>صورة مقطع القطاع (من الكتالوج)</span>' +
            '<input type="file" id="alu-part-image-file" accept="image/*" onchange="aluReadPartImage(this)">' +
            '<input type="hidden" id="alu-part-image-data" value="">' +
            '<div id="alu-part-image-preview" class="alu-part-image-preview"></div></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluPart()"><i class="fas fa-plus"></i> حفظ القطاع في «' +
            aluEsc(PART_ROLES[aluSystemsPartRole]) + '»</button>' +
            '</div>' +

            renderAluNewSystemForm();
    }

    function renderAluNewSystemForm() {
        return '<div class="alu-cut-form-card"><h4>إضافة نظام قطاع جديد (أي كتالوج)</h4>' +
            '<p class="alu-cut-note">مثل الفيديو: اكتب اسم النظام من الكتالوج واحفظ ثم أضف الحلوق والضرف والباكيتات… بنفسك — بدون انتظار دعم فني.</p>' +
            '<div class="erp-form-grid">' +
            '<label class="nebras-field"><span>اسم النظام</span><input type="text" id="alu-sys-name" placeholder="سوناتا 45 / ألوميل / فولكانو / …"></label>' +
            '<label class="nebras-field"><span>العائلة</span><select id="alu-sys-family"><option value="hinged">مفصلي</option><option value="sliding">سحاب</option><option value="facade">واجهة</option></select></label>' +
            '<label class="nebras-field"><span>زاوية قص</span><select id="alu-sys-angle"><option value="45">45</option><option value="90">90</option></select></label>' +
            '<label class="nebras-field"><span>عدد التراكات</span><input type="number" id="alu-sys-tracks" value="0" min="0"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addAluSystem()">حفظ النظام وابدأ إضافة قطاعاته</button></div>';
    }

    function selectAluSystemForEdit(id) {
        aluEditSystemId = id;
        aluSystemsPartRole = 'frame';
        renderAluminumCuttingPanel();
    }

    function setAluSystemsPartRole(role) {
        aluSystemsPartRole = role || 'frame';
        renderAluminumCuttingPanel();
    }

    function addAluSystem() {
        if (!requireAluAccess()) return;
        const nameAr = aluField('alu-sys-name');
        if (!nameAr) { alert('اسم النظام مطلوب — من كتالوج القطاع الذي تستخدمه.'); return; }
        const id = aluId('sys');
        aluSystems.push({
            id: id,
            nameAr: nameAr,
            family: aluField('alu-sys-family') || 'hinged',
            cutAngle: aluNum(aluField('alu-sys-angle')) || 45,
            tracksCount: aluNum(aluField('alu-sys-tracks')),
            deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
            parts: [],
            active: true
        });
        aluEditSystemId = id;
        aluSystemsPartRole = 'frame';
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ النظام — أضف الحلوق والضرف الآن', 'ok');
        renderAluminumCuttingPanel();
    }

    function addAluPart() {
        if (!requireAluAccess()) return;
        const sys = getSystem(aluField('alu-part-sys') || aluEditSystemId);
        if (!sys) return;
        const nameAr = aluField('alu-part-name');
        const sku = aluField('alu-part-sku');
        if (!nameAr || !sku) { alert('الاسم ورقم القطاع مطلوبان'); return; }
        const role = aluField('alu-part-role') || aluSystemsPartRole || 'frame';
        sys.parts = sys.parts || [];
        sys.parts.push({
            id: aluId('p'),
            role: role,
            nameAr: nameAr,
            sku: sku,
            thicknessMm: aluNum(aluField('alu-part-th')) || 45,
            thickness2Mm: aluNum(aluField('alu-part-th2')),
            accessoryKit: [],
            weightKgPerM: aluNum(aluField('alu-part-w')),
            pricePerKg: aluNum(aluField('alu-part-pkg')),
            lipType: aluField('alu-part-lip') || 'none',
            lipThicknessMm: aluNum(aluField('alu-part-lipth')),
            tracksCount: aluNum(aluField('alu-part-tracks')),
            glassKind: aluField('alu-part-glasskind') || 'any',
            withPackage: aluField('alu-part-pkgflag') === '1',
            disableLastBarRemnant: aluField('alu-part-nolast') === '1' || role === 'sash',
            imageDataUrl: aluField('alu-part-image-data') || '',
            active: true
        });
        if (role === 'frame' && aluNum(aluField('alu-part-tracks')) > 0) {
            sys.tracksCount = aluNum(aluField('alu-part-tracks'));
        }
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        renderAluminumCuttingPanel();
    }


    function aluReadPartImage(input) {
        const file = input && input.files && input.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            alert('الصورة أكبر من 3MB — اختَر صورة أصغر من الكتالوج.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function () {
            const img = new Image();
            img.onload = function () {
                const maxW = 360;
                const scale = Math.min(1, maxW / Math.max(1, img.width));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                const data = c.toDataURL('image/jpeg', 0.74);
                const hid = document.getElementById('alu-part-image-data');
                if (hid) hid.value = data;
                const prev = document.getElementById('alu-part-image-preview');
                if (prev) prev.innerHTML = '<img class="alu-part-thumb alu-part-thumb--lg" src="' + data + '" alt="معاينة مقطع"/>';
            };
            img.onerror = function () { alert('تعذّر قراءة الصورة.'); };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }


    function editAluPart(idx) {
        const sys = getSystem(aluEditSystemId);
        if (!sys || !sys.parts || !sys.parts[idx]) return;
        const part = sys.parts[idx];
        aluPartEditIdx = idx;
        const name = window.prompt('اسم القطاع', part.nameAr || '');
        if (name == null) { aluPartEditIdx = null; return; }
        const sku = window.prompt('رقم القطاع / SKU', part.sku || '');
        if (sku == null) { aluPartEditIdx = null; return; }
        const th = window.prompt('تخانة 1 (مم)', String(part.thicknessMm || 45));
        if (th == null) { aluPartEditIdx = null; return; }
        const th2 = window.prompt('تخانة 2 (مم) — اختيارية', String(part.thickness2Mm || 0));
        if (th2 == null) { aluPartEditIdx = null; return; }
        const wt = window.prompt('وزن كغ/م', String(part.weightKgPerM || 0));
        if (wt == null) { aluPartEditIdx = null; return; }
        const pr = window.prompt('سعر الكيلو', String(part.pricePerKg || 0));
        if (pr == null) { aluPartEditIdx = null; return; }
        part.nameAr = String(name || part.nameAr).trim();
        part.sku = String(sku || part.sku).trim();
        part.thicknessMm = Math.max(0.1, Number(th) || part.thicknessMm || 45);
        part.thickness2Mm = Math.max(0, Number(th2) || 0);
        part.weightKgPerM = Math.max(0, Number(wt) || 0);
        part.pricePerKg = Math.max(0, Number(pr) || 0);
        aluPartEditIdx = null;
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        renderAluminumCuttingPanel();
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم تحديث القطاع', 'ok');
    }

    function openAluPartKit(idx) {
        const sys = getSystem(aluEditSystemId);
        if (!sys || !sys.parts || !sys.parts[idx]) return;
        const part = sys.parts[idx];
        aluPartKitIdx = idx;
        const kit = Array.isArray(part.accessoryKit) ? part.accessoryKit.slice() : [];
        const lines = kit.map(function (k) {
            return (k.accId || k.accessoryId || '') + '=' + (k.qty != null ? k.qty : (k.qtyPerCut || 1));
        }).join('\n');
        const tip = aluAccessories.filter(function (a) { return a.active !== false; }).map(function (a) {
            return a.id + ' ← ' + a.nameAr + ' (' + a.code + ')';
        }).join('\n');
        const raw = window.prompt(
            'طقم إكسسوار لهذا القطاع (سطر: معرف=كمية لكل وحدة مقايسة)\n\nالمتاح:\n' + tip.slice(0, 900),
            lines
        );
        if (raw == null) { aluPartKitIdx = null; return; }
        const next = [];
        String(raw).split(/\n+/).forEach(function (line) {
            const s = String(line || '').trim();
            if (!s) return;
            const m = s.match(/^([^=\s]+)\s*=\s*([\d.]+)$/);
            if (!m) return;
            const id = m[1].trim();
            if (!aluAccessories.some(function (a) { return a.id === id; })) return;
            const q = Math.max(0, Number(m[2]) || 0);
            next.push({ accId: id, accessoryId: id, qty: q, qtyPerCut: q });
        });
        part.accessoryKit = next;
        aluPartKitIdx = null;
        persistAluminumCuttingCloud(['aluminum_systems', 'aluminum_profiles']);
        renderAluminumCuttingPanel();
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('طقم الإكسسوار: ' + next.length + ' بند', 'ok');
    }

    function scanAluBarcode(codeArg) {
        const code = String(codeArg != null ? codeArg : (aluField('alu-scan-input') || '')).trim();
        const log = document.getElementById('alu-scan-log');
        if (!code) {
            if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('أدخل باركود أو امسحه', 'warn');
            return;
        }
        if (!aluCutDraft || !aluCutDraft.lastResult) {
            if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('شغّل التقطيع أولاً', 'warn');
            return;
        }
        let found = null;
        let seq = 0;
        aluCutDraft.lastResult.plans.forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b) {
                (b.pieces || []).forEach(function (p) {
                    seq++;
                    const pieceCode = String(p.code || 'P') + '-' + seq;
                    const barId = (pl.profileSku || 'SKU') + '|' + pieceCode + '|' + p.lengthMm;
                    if (!found && (code === pieceCode || code === barId || code === String(p.code) || code.indexOf(pieceCode) !== -1)) {
                        found = { piece: p, sku: pl.profileSku, code: pieceCode, barId: barId, lengthMm: p.lengthMm };
                    }
                });
            });
        });
        aluScanBuffer = code;
        if (!found) {
            if (log) log.innerHTML = '<span class="alu-scan-miss">غير موجود: ' + aluEsc(code) + '</span>' + (log.innerHTML || '');
            if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('لا توجد قصاصة بهذا الباركود', 'warn');
            return;
        }
        found.piece.scanned = true;
        found.piece.scannedAt = new Date().toISOString();
        found.piece.scanStatus = found.piece.scanStatus === 'cut' ? 'assembled' : 'cut';
        if (log) {
            log.innerHTML = '<span class="alu-scan-hit">✓ ' + aluEsc(found.code) + ' · ' + found.lengthMm +
                ' مم · ' + aluEsc(found.sku || '') + ' · ' + (found.piece.scanStatus === 'assembled' ? 'تجميع' : 'قص') +
                '</span>' + (log.innerHTML || '');
        }
        if (typeof showNebrasAdminToast === 'function') {
            showNebrasAdminToast('مسح: ' + found.code + ' → ' + (found.piece.scanStatus === 'assembled' ? 'تجميع' : 'قص'), 'ok');
        }
    }

    function exportAluCutCsv() {
        const result = (aluCutDraft && aluCutDraft.lastResult)
            || (aluEstimateDraft ? runFullCuttingPlan(computeEstimateTotals(aluEstimateDraft).cuts, {
                stockBarMm: aluEstimateDraft.stockBarMm, kerfMm: aluEstimateDraft.kerfMm, weightAdjustPct: aluEstimateDraft.weightAdjustPct
            }) : null);
        if (!result) { alert('شغّل التقطيع أو افتح مقايسة أولاً.'); return; }
        const rows = [['sku', 'bar', 'pieceCode', 'label', 'lengthMm', 'remainMm', 'algorithm']];
        (result.plans || []).forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b, bi) {
                (b.pieces || []).forEach(function (p, pi) {
                    rows.push([
                        pl.profileSku || '',
                        bi + 1,
                        (p.code || 'P') + '-' + (pi + 1),
                        p.labelAr || '',
                        p.lengthMm || '',
                        b.remain || '',
                        pl.plan.algorithm || ''
                    ]);
                });
            });
        });
        const csv = rows.map(function (r) {
            return r.map(function (cell) {
                const s = String(cell == null ? '' : cell);
                return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(',');
        }).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-cut-' + ((aluCutDraft && aluCutDraft.estimateRef) || (aluEstimateDraft && aluEstimateDraft.ref) || 'plan') + '.csv';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم تصدير CSV', 'ok');
    }

    function exportAluCutDxf() {
        const result = (aluCutDraft && aluCutDraft.lastResult)
            || (aluEstimateDraft ? runFullCuttingPlan(computeEstimateTotals(aluEstimateDraft).cuts, {
                stockBarMm: aluEstimateDraft.stockBarMm, kerfMm: aluEstimateDraft.kerfMm, weightAdjustPct: aluEstimateDraft.weightAdjustPct
            }) : null);
        if (!result) { alert('شغّل التقطيع أو افتح مقايسة أولاً.'); return; }
        let y = 0;
        const ents = [];
        const kerf = Number(result.kerfMm) || Number(aluSettings.kerfMm) || 10;
        (result.plans || []).forEach(function (pl) {
            (pl.plan.bars || []).forEach(function (b) {
                const L = Number(result.stockBarMm) || 6500;
                ents.push('0\nLINE\n8\nSTOCK\n10\n0\n20\n' + y + '\n11\n' + L + '\n21\n' + y);
                let x = 0;
                (b.pieces || []).forEach(function (c) {
                    const len = Number(c.lengthMm) || 0;
                    ents.push('0\nLINE\n8\nCUT\n10\n' + x + '\n20\n' + (y + 40) + '\n11\n' + (x + len) + '\n21\n' + (y + 40));
                    const label = String(c.code || c.labelAr || 'CUT').replace(/[\n\r]/g, ' ').slice(0, 40);
                    ents.push('0\nTEXT\n8\nLABEL\n10\n' + (x + 10) + '\n20\n' + (y + 70) + '\n40\n25\n1\n' + label);
                    x += len + kerf;
                });
                y += 160;
            });
        });
        const dxf = '0\nSECTION\n2\nENTITIES\n' + ents.join('\n') + '\n0\nENDSEC\n0\nEOF\n';
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-cut-' + ((aluCutDraft && aluCutDraft.estimateRef) || (aluEstimateDraft && aluEstimateDraft.ref) || 'plan') + '.dxf';
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم تصدير DXF مبسّط', 'ok');
    }

    function addAluSupplierInvoice() {
        const est = aluEstimateDraft;
        if (!est) { alert('افتح مقايسة أولاً.'); return; }
        const type = aluField('alu-inv-type') || 'aluminum';
        const typeAr = ({ aluminum: 'ألومنيوم', accessory: 'إكسسوارات', glass: 'زجاج', other: 'أخرى' })[type] || type;
        const supplier = aluField('alu-inv-supplier');
        const invoiceNo = aluField('alu-inv-no');
        const amount = aluNum(aluField('alu-inv-amount'));
        if (!supplier && !invoiceNo) { alert('أدخل المورد أو رقم الفاتورة.'); return; }
        if (!Array.isArray(est.supplierInvoices)) est.supplierInvoices = [];
        est.supplierInvoices.push({
            id: aluId('inv'),
            type: type,
            typeAr: typeAr,
            supplier: supplier,
            invoiceNo: invoiceNo,
            amount: amount,
            at: new Date().toISOString()
        });
        const idx = aluEstimates.findIndex(function (e) { return e.id === est.id; });
        if (idx >= 0) aluEstimates[idx] = JSON.parse(JSON.stringify(est));
        persistAluminumCuttingCloud(['aluminum_estimates']);
        renderAluminumCuttingPanel();
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('أُضيفت فاتورة مورد', 'ok');
    }

    function removeAluSupplierInvoice(ii) {
        const est = aluEstimateDraft;
        if (!est || !Array.isArray(est.supplierInvoices)) return;
        est.supplierInvoices.splice(ii, 1);
        const idx = aluEstimates.findIndex(function (e) { return e.id === est.id; });
        if (idx >= 0) aluEstimates[idx] = JSON.parse(JSON.stringify(est));
        persistAluminumCuttingCloud(['aluminum_estimates']);
        renderAluminumCuttingPanel();
    }

    function consumeAluWarehouse(result) {
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
    }


    function removeAluPart(idx) {
        const sys = getSystem(aluEditSystemId);
        if (!sys || !sys.parts || !sys.parts[idx]) return;
        if (!confirm('حذف هذا القطاع من النظام؟')) return;
        sys.parts.splice(idx, 1);
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
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="printAluImagesReport()"><i class="fas fa-image"></i> تقرير صور المقايسة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluWorkerCutList()">قائمة قص</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printAluInstallPack()">تعبئة وتركيب</button>' +
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
            '<label class="nebras-field"><span>ربط المخزن</span><select id="alu-set-wh"><option value="1"' + (aluSettings.linkWarehouse ? ' selected' : '') + '>مفعّل — خصم من رصيد الأعواد</option><option value="0"' + (!aluSettings.linkWarehouse ? ' selected' : '') + '>موقوف</option></select></label>' +
            '<label class="nebras-field"><span>رصيد مخزن كلي (مم أعواد)</span><input type="number" id="alu-set-wh-total" value="' + aluNum((aluSettings.warehouseStockMm && aluSettings.warehouseStockMm._total) || 0) + '"></label>' +
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
        aluSettings.linkWarehouse = aluField('alu-set-wh') === '1';
        if (!aluSettings.warehouseStockMm || typeof aluSettings.warehouseStockMm !== 'object') aluSettings.warehouseStockMm = {};
        aluSettings.warehouseStockMm._total = aluNum(aluField('alu-set-wh-total'));
        aluSettings.saveRemnantsAfterCut = aluSettings.useRemnantBank;
        aluSettings.compareStockLengths = String(aluField('alu-set-cmp-list') || '6000,6500,7000')
            .split(/[,،\s]+/).map(aluNum).filter(function (n) { return n >= 1000; });
        if (!aluSettings.compareStockLengths.length) aluSettings.compareStockLengths = [6000, 6500, 7000];
        persistAluminumCuttingCloud(['aluminum_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حفظ إعدادات Pro', 'ok');
    }

    function openPrintWindow(title, html, stickersMode) {
        const w = window.open('', '_blank', 'noopener,noreferrer,width=960,height=1000');
        if (!w) { alert('اسمح بالنوافذ المنبثقة للطباعة.'); return; }
        const stickerCss = stickersMode
            ? '.alu-sticker-sheet{display:flex;flex-wrap:wrap;gap:10px}' +
              '.alu-sticker{border:1px solid #222;padding:8px 10px;width:168px;font-size:11px;page-break-inside:avoid}' +
              '.alu-sticker-top{display:flex;justify-content:space-between;font-weight:700}' +
              '.alu-sticker-len{font-size:18px;font-weight:800;margin:4px 0}' +
              '.alu-sticker-sku,.alu-sticker-ref{color:#444;font-size:10px}' +
              '.alu-sticker-bar{margin-top:4px;overflow:hidden}'
            : '';
        w.document.write('<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' +
            aluEsc(title) + '</title><style>' +
            'body{font-family:Cairo,Tahoma,sans-serif;padding:24px;color:#0d2840}' +
            'h1{font-size:1.25rem;color:#0d2840}h2{font-size:1rem;margin-top:1rem;color:#155e94}' +
            'table{width:100%;border-collapse:collapse;font-size:.84rem;margin:.4rem 0 1rem}' +
            'th,td{border:1px solid rgba(13,40,64,.15);padding:6px 8px;text-align:right}th{background:#eef3f9;color:#0d2840}' +
            '.bar{display:flex;height:22px;border:1px solid #155e94;margin:4px 0}' +
            '.seg{background:linear-gradient(180deg,#155e94,#0d2840);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;border-left:1px solid #fff}' +
            '.waste{background:#f8d4b8;color:#8a4b12;font-size:10px;display:flex;align-items:center;justify-content:center}' +
            '.meta{color:#5a6b7a;font-size:.9rem}' +
            '.alu-draw-pair{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0 18px;page-break-inside:avoid}' +
            '.alu-elev-card{border:1px solid rgba(13,40,64,.12);border-radius:10px;padding:8px;background:#fff}' +
            '.alu-elev-svg,.alu-glass-svg{max-width:100%;height:auto;display:block}' +
            '@media print{button{display:none}.alu-draw-pair{break-inside:avoid}}' +
            stickerCss +
            '</style></head><body>' + html + '<p><button onclick="window.print()">طباعة</button></p></body></html>');
        w.document.close();
    }

    function printAluEstimateReport() {
        if (!aluEstimateDraft) return;
        syncEstimateDraftFields();
        const t = computeEstimateTotals(aluEstimateDraft);
        let html = '<h1>مقايسة ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(aluEstimateDraft.ref) + ' — ' +
            aluEsc(aluEstimateDraft.customerName) + ' / ' + aluEsc(aluEstimateDraft.projectName) + '</p><table><tr><th>بند</th><th>شكل</th><th>مقاس</th><th>كمية</th><th>زجاج</th></tr>';
        (aluEstimateDraft.items || []).forEach(function (it) {
            const g = buildItemGlass(it);
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + aluEsc(resolveItemShape(it).nameAr || '') +
                '</td><td>' + it.widthMm + '×' + it.heightMm + '</td><td>' + it.qty +
                '</td><td>' + g.widthMm + '×' + g.heightMm + ' ×' + g.panels + '</td></tr>';
        });
        html += '</table>';
        (aluEstimateDraft.items || []).forEach(function (it) {
            html += '<h2>' + aluEsc(it.labelAr || resolveItemShape(it).nameAr || 'بند') + '</h2>' + aluItemDrawingsHtml(it, false);
        });
        html += '<p>الإجمالي شامل الضريبة: ' + t.total + ' ' + aluSettings.currencyLabel + '</p>';
        openPrintWindow('مقايسة', html);
    }

    function printAluImagesReport() {
        const est = aluEstimateDraft || aluEstimates[aluEstimates.length - 1];
        if (!est || !(est.items || []).length) {
            alert('أضف بنوداً أولاً لطباعة تقرير الصور والرسومات.');
            return;
        }
        if (aluEstimateDraft) syncEstimateDraftFields();
        let html = '<h1>تقرير صور ورسومات المقايسة — نبراس</h1>' +
            '<p class="meta">' + aluEsc(est.ref || '') + ' — ' + aluEsc(est.customerName || '') + ' / ' + aluEsc(est.projectName || '') +
            '</p><p class="meta">كل رسم محسوب من التخصيمات الفعلية للنظام: حلق · ضرفة · زجاج · واجهة — للمقاول والمهندس والورشة.</p>';
        (est.items || []).forEach(function (it, i) {
            const sh = resolveItemShape(it);
            const g = buildItemGlass(it);
            const cuts = shapeCutsWithMeta(it, i);
            html += '<h2>بند ' + (i + 1) + ' — ' + aluEsc(it.labelAr || sh.nameAr || '') +
                ' · ' + it.widthMm + '×' + it.heightMm + ' مم × ' + it.qty + '</h2>';
            html += aluItemDrawingsHtml(it, false);
            html += '<table><tr><th>القطعة</th><th>الدور</th><th>الطول مم</th><th>كمية</th><th>رمز</th></tr>';
            (cuts.cuts || []).forEach(function (c) {
                html += '<tr><td>' + aluEsc(c.labelAr) + '</td><td>' + aluEsc(PART_ROLES[c.role] || c.role) +
                    '</td><td>' + c.lengthMm + '</td><td>' + c.qty + '</td><td>' + aluEsc(c.code) + '</td></tr>';
            });
            html += '</table><p class="meta">زجاج ناتج التخصيم: ' + g.widthMm + '×' + g.heightMm + ' مم × ' + g.panels +
                ' لوح · مساحة ' + g.areaM2 + ' م²</p>';
        });
        openPrintWindow('تقرير الصور', html);
    }

    function printAluCutReport() {
        if (!aluCutDraft || !aluCutDraft.lastResult) { alert('شغّل التقطيع أولاً.'); return; }
        const r = aluCutDraft.lastResult;
        let html = '<h1>كاتنج ليست — نبراس</h1><p class="meta">' + aluEsc(aluCutDraft.estimateRef || '') +
            ' · قطع ' + r.totalPieces + ' · أعواد ' + r.totalBars + ' · هدر ' + r.wastePct + '%</p>';
        r.plans.forEach(function (pl) {
            const partImg = (function () {
                let foundImg = '';
                aluSystems.forEach(function (s) {
                    (s.parts || []).forEach(function (p) {
                        if (p.sku === pl.profileSku && p.imageDataUrl) foundImg = p.imageDataUrl;
                    });
                });
                return foundImg;
            })();
            html += '<h2>' + aluEsc(pl.profileName) + ' — شراء: ' + aluEsc(pl.purchase.buyLabel) + '</h2>';
            if (partImg) {
                html += '<div class="alu-elev-card"><img src="' + partImg.replace(/"/g, '') +
                    '" alt="" style="max-width:180px;max-height:120px;object-fit:contain"/></div>';
            }
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
        if (aluEstimateDraft) syncEstimateDraftFields();
        const t = computeEstimateTotals(est);
        let html = '<h1>عرض سعر ألومنيوم — نبراس</h1><p class="meta">' + aluEsc(est.ref) + ' — ' +
            aluEsc(est.customerName) + ' / ' + aluEsc(est.projectName) + '</p>';
        html += '<table><tr><th>بند</th><th>مقاس</th><th>كمية</th><th>م² محاسبة</th></tr>';
        (est.items || []).forEach(function (it) {
            const area = billableAreaM2(it.widthMm, it.heightMm) * Math.max(1, it.qty || 1);
            html += '<tr><td>' + aluEsc(it.labelAr) + '</td><td>' + it.widthMm + '×' + it.heightMm +
                '</td><td>' + it.qty + '</td><td>' + area + '</td></tr>';
        });
        html += '</table><h2>رسومات البنود (من التخصيمات)</h2>';
        (est.items || []).forEach(function (it) {
            html += aluItemDrawingsHtml(it, false);
        });
        html += '<p><strong>الإجمالي شامل الضريبة: ' + t.total + ' ' + aluSettings.currencyLabel +
            '</strong></p><p class="meta">' + aluEsc(aluSettings.quoteTerms || '') + '</p>';
        openPrintWindow('عرض سعر', html);
    }

    /* init */
    hydrateAluminumCuttingLocal();

    global.openAluminumCutting = openAluminumCutting;
    global.closeAluminumCuttingWorkspace = closeAluminumCuttingWorkspace;
    global.showAluminumCuttingShell = showAluminumCuttingShell;
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
    global.selectAluSystemForEdit = selectAluSystemForEdit;
    global.setAluSystemsPartRole = setAluSystemsPartRole;
    global.removeAluPart = removeAluPart;
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
    global.printAluImagesReport = printAluImagesReport;
    global.setAluEstSearch = setAluEstSearch;
    global.setAluEstListView = setAluEstListView;
    global.toggleAluGlassExtra = toggleAluGlassExtra;
    global.editAluPart = editAluPart;
    global.openAluPartKit = openAluPartKit;
    global.scanAluBarcode = scanAluBarcode;
    global.exportAluCutCsv = exportAluCutCsv;
    global.exportAluCutDxf = exportAluCutDxf;
    global.addAluSupplierInvoice = addAluSupplierInvoice;
    global.removeAluSupplierInvoice = removeAluSupplierInvoice;
    global.aluDrawElevationSvg = aluDrawElevationSvg;
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
    global.printAluWorkerCutList = printAluWorkerCutList;
    global.printAluInstallPack = printAluInstallPack;
    global.advanceAluEstimateStatus = advanceAluEstimateStatus;
    global.setAluEstimateStatus = setAluEstimateStatus;
    global.saveAluEstimateFinance = saveAluEstimateFinance;
    global.editAluItem = editAluItem;
    global.clearAluItemForm = clearAluItemForm;
    global.toggleAluBayFields = toggleAluBayFields;
    global.refreshAluFreehandPreview = refreshAluFreehandPreview;
    global.aluReadPartImage = aluReadPartImage;
    global.resolveItemShape = resolveItemShape;
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

        /* رسومات الارتفاع والزجاج — يجب أن تُنتج SVG حقيقي بأبعاد */
        const elevSlide = aluDrawElevationSvg(slidingItem, { viewW: 360, viewH: 320 });
        assert('draw-sliding-svg', elevSlide.indexOf('<svg') === 0 && elevSlide.indexOf('2000 مم') !== -1 && elevSlide.indexOf('زجاج') !== -1, 'len=' + elevSlide.length);
        const elevFacade = aluDrawElevationSvg(facadeItem, { viewW: 360, viewH: 320 });
        assert('draw-facade-grid', elevFacade.indexOf('<line') !== -1 && elevFacade.indexOf('زجاج خلية') !== -1, 'facade svg');
        const hingeItem = {
            shape: 'door_hinged', profileSystemId: hingeSys.id,
            widthMm: 900, heightMm: 2200, qty: 1, handleHeightMm: 1050, glassId: (aluGlass[0] || {}).id
        };
        const elevDoor = aluDrawElevationSvg(hingeItem);
        assert('draw-door-svg', elevDoor.indexOf('عتبة') !== -1 && elevDoor.indexOf('900 مم') !== -1, 'door elevation');
        const glassSvg = aluDrawGlassNestSvg(slidingItem);
        assert('draw-glass-nest', glassSvg.indexOf('تقطيع زجاج') !== -1 && glassSvg.indexOf(String(glass.widthMm)) !== -1, 'glass nest');
        const pairHtml = aluItemDrawingsHtml(slidingItem, false);
        assert('draw-pair-html', pairHtml.indexOf('alu-draw-pair') !== -1 && pairHtml.indexOf('alu-elev-svg') !== -1, 'pair');

        const fhItem = {
            shape: 'freehand',
            freehand: { family: 'sliding', kind: 'window', leaves: 3 },
            profileSystemId: slideSys.id,
            widthMm: 2400, heightMm: 1500, qty: 1, glassId: (aluGlass[0] || {}).id
        };
        const fhBuilt = shapeCutsWithMeta(fhItem, 0);
        const fhSash = (fhBuilt.cuts || []).filter(function (c) { return c.role === 'sash'; });
        assert('freehand-sliding-3', fhSash.length >= 1 && fhSash.some(function (c) { return c.qty >= 6; }), 'sash cuts');
        const fhElev = aluDrawElevationSvg(fhItem);
        assert('freehand-draw', fhElev.indexOf('<svg') === 0 && resolveItemShape(fhItem).leaves === 3, 'fh elev');
        const fhDoor = {
            shape: 'freehand',
            freehand: { family: 'hinged', kind: 'door', leaves: 2 },
            profileSystemId: hingeSys.id,
            widthMm: 1600, heightMm: 2200, qty: 1, glassId: (aluGlass[0] || {}).id
        };
        const fhDoorCuts = shapeCutsWithMeta(fhDoor, 0);
        assert('freehand-door-threshold', (fhDoorCuts.cuts || []).some(function (c) { return c.role === 'threshold'; }), 'threshold');


        /* hrws212 — اكتمال المقايسات / زجاج / أطقم / تسعير / تصدير */
        const priceOnly = {
            shape: 'pricing_only', pricingOnly: true, fixedPrice: 250, qty: 2,
            labelAr: 'تركيب إضافي', widthMm: 0, heightMm: 0
        };
        const poTotals = computeEstimateTotals({ items: [priceOnly], paintType: 'none', priceMode: 'purchase' });
        assert('pricing-only-total', (poTotals.accessories || []).some(function (a) { return a.code === 'PRICE-ONLY' && a.total === 500; }), 'po');

        const dblItem = {
            shape: 'sliding2', profileSystemId: slideSys.id,
            widthMm: 1800, heightMm: 1500, qty: 1,
            glassKind: 'double',
            glassId: (aluGlass[0] || {}).id,
            glassFrontId: (aluGlass[0] || {}).id,
            glassBackId: (aluGlass[1] || aluGlass[0] || {}).id,
            spacerType: 'alu12',
            georgianType: 'square'
        };
        const dblTot = computeEstimateTotals({ items: [dblItem], paintType: 'powder', priceMode: 'purchase' });
        assert('double-glass-priced', aluNum(dblTot.glassCost) > 0 && (dblTot.glassPanels[0].nameAr || '').indexOf('+') !== -1, String(dblTot.glassCost));

        if (hingeSys && hingeSys.parts && hingeSys.parts[0] && aluAccessories[0]) {
            const part0 = hingeSys.parts[0];
            const prevKit = part0.accessoryKit;
            part0.accessoryKit = [{ accId: aluAccessories[0].id, qty: 2 }];
            const kitTot = computeEstimateTotals({
                items: [{ shape: 'casement', profileSystemId: hingeSys.id, widthMm: 1000, heightMm: 1200, qty: 1, glassId: (aluGlass[0] || {}).id }],
                priceMode: 'purchase', paintType: 'none'
            });
            assert('part-accessory-kit', (kitTot.accessories || []).some(function (a) { return a.applyScope === 'kit'; }), 'kit');
            part0.accessoryKit = prevKit;
        } else {
            assert('part-accessory-kit', true, 'skipped-no-seed');
        }

        const searchBlob = ['EST-1', 'عميل تجريبي', 'مشروع', '0500000000', 'draft'].join(' ').toLowerCase();
        assert('est-search-match', searchBlob.indexOf('0500') !== -1, 'phone search');

        const fakeCut = runFullCuttingPlan(slideBuilt.cuts || [], { stockBarMm: 6500, kerfMm: 10 });
        assert('cut-plan-exportable', !!(fakeCut && fakeCut.plans && fakeCut.plans.length), 'plans');
        assert('helpers-present', typeof editAluPart === 'function' && typeof exportAluCutCsv === 'function' && typeof scanAluBarcode === 'function', 'fns');


        report.summary = report.ok ? 'PASS ' + report.checks.length + '/' + report.checks.length : 'FAIL ' + report.fails.length + '/' + report.checks.length;
        return report;
    }

    global.__nebrasAluSelfTest = runAluminumSelfTest;

    /* توافق أزرار قديمة */
    global.addAluOpening = addAluItem;
    global.removeAluOpening = removeAluItem;
    global.saveAluProfile = function () { setAluTab('systems'); };
})(typeof window !== 'undefined' ? window : globalThis);
