/**
 * نبراس — تخصيمات WPC (V3 Pro · hrws225)
 * محرك دقة ورشة — أبواب · خزائن · رسومات SVG · 3D · Stolcad/PowerPVC
 */
(function (global) {
    'use strict';

    var MODELS_KEY = 'nebrasWpcModels';
    var ESTIMATES_KEY = 'nebrasWpcEstimates';
    var CUT_JOBS_KEY = 'nebrasWpcCutJobs';
    var SETTINGS_KEY = 'nebrasWpcCutSettings';
    var ACCESSORIES_KEY = 'nebrasWpcAccessories';
    var REMNANTS_KEY = 'nebrasWpcRemnants';
    var AUDIT_KEY = 'nebrasWpcCutAudit';

    var DEFAULT_SETTINGS = {
        sheetWidthMm: 1220,
        sheetHeightMm: 2440,
        sheetSizes: [
            { w: 1220, h: 2440, label: '1220×2440' },
            { w: 1220, h: 2800, label: '1220×2800' },
            { w: 1220, h: 3050, label: '1220×3050' }
        ],
        kerfMm: 3,
        remnantMinMm: 150,
        leafThicknessMm: 40,
        measureModeDefault: 'frame_outer',
        roundCutToMm: 0.1,
        currencyLabel: 'ر.س',
        laborPerDoor: 120,
        vatPct: 15,
        quoteTerms: 'الأسعار شاملة التخصيم والقص حسب المواصفات المعتمدة. صلاحية العرض 15 يوماً.',
        useRemnantBank: true,
        blockWorkshopOnWarning: true
    };

    /**
     * تخصيمات WPC — مصدر واحد (مم) — قابلة للتعديل لكل موديل
     * مرجع: Stolcad · PowerPVC · KOJO WPC · Studio Matrx India 2026
     */
    var DEFAULT_DEDUCTIONS = {
        /* فجوات اللوح داخل الحلق */
        headClearanceMm: 3,
        bottomClearanceMm: 10,
        bottomClearanceBathMm: 12,
        sideClearanceMm: 3,
        meetingGapMm: 4,
        /* سحاب */
        sashOverlapMm: 25,
        sashSplitMm: 0,
        sashBottomClearanceMm: 8,
        sashTopClearanceMm: 3,
        /* حلق WPC */
        jambFaceMm: 62,
        jambDepthMm: 100,
        rebateDepthMm: 40,
        headJambFaceMm: 62,
        /* تمديد/شيم بين الفتحة الخام والحلق */
        packingGapSideMm: 10,
        packingGapTopMm: 10,
        /* إطار زخرفي */
        architraveOverlapMm: 15,
        architraveWidthMm: 70,
        /* فتحة علوية */
        transomHeightMm: 300,
        transomFrameDeductMm: 8,
        transomLeafGapMm: 4,
        /* عتبة */
        thresholdHeightMm: 15,
        thresholdDeductFromLeafMm: 0,
        /* زجاج / CNC */
        glassInsetMm: 80,
        glassDeductionMm: 4,
        cncMarginMm: 12,
        /* بلوك قفل */
        lockBlockW: 120,
        lockBlockH: 200,
        lockBlockOffsetFromEdgeMm: 85,
        /* قص */
        kerfPanelMm: 3,
        kerfProfileMm: 3,
        /* حدود ورشة */
        minOpeningW: 600,
        maxOpeningW: 1500,
        minOpeningH: 1800,
        maxOpeningH: 2800,
        minLeafW: 400,
        minLeafH: 1500,
        /* خزائن */
        panelThicknessMm: 18,
        backPanelThicknessMm: 8,
        shelfGapMm: 3,
        toeKickHeightMm: 100,
        drawerFrontGapMm: 3,
        defaultCabinetDepthMm: 600
    };

    var DEDUCTION_LABELS = {
        headClearanceMm: 'فجوة علوية اللوح',
        bottomClearanceMm: 'فجوة سفلية (أرض)',
        bottomClearanceBathMm: 'فجوة سفلية (حمام)',
        sideClearanceMm: 'فجوة جانبية (كل جهة)',
        meetingGapMm: 'فجوة التقاء (باب مزدوج)',
        sashOverlapMm: 'ركوب ضلف السحاب',
        sashSplitMm: 'تقسيم بين ضلف السحاب',
        sashBottomClearanceMm: 'فجوة سفلية سحاب',
        sashTopClearanceMm: 'فجوة علوية سحاب',
        jambFaceMm: 'سُمك ظهر الحلق (عرض)',
        jambDepthMm: 'عمق الحلق في الجدار',
        rebateDepthMm: 'سُمك اللوح / عمق الرباط',
        headJambFaceMm: 'سُمك العارضة العلوية',
        packingGapSideMm: 'شيم جانبي (فتحة خام)',
        packingGapTopMm: 'شيم علوي (فتحة خام)',
        architraveOverlapMm: 'زيادة الإطار الزخرفي',
        architraveWidthMm: 'عرض الإطار الزخرفي',
        transomHeightMm: 'ارتفاع الفتحة العلوية',
        transomFrameDeductMm: 'تخصيم إطار الترانسوم',
        transomLeafGapMm: 'فجوة بين الترانسوم واللوح',
        thresholdHeightMm: 'ارتفاع العتبة',
        thresholdDeductFromLeafMm: 'تخصيم العتبة من اللوح',
        glassInsetMm: 'إ inset الزجاج من حافة اللوح',
        glassDeductionMm: 'تخصيم الزجاج عن الحشو',
        cncMarginMm: 'هامش CNC عن حافة اللوح',
        lockBlockW: 'عرض بلوك القفل',
        lockBlockH: 'ارتفاع بلوك القفل',
        lockBlockOffsetFromEdgeMm: 'بعد القفل عن الحافة',
        kerfPanelMm: 'كيرف قص اللوح',
        kerfProfileMm: 'كيرف قص البروفيل',
        minOpeningW: 'أدنى عرض فتحة',
        maxOpeningW: 'أقصى عرض فتحة',
        minOpeningH: 'أدنى ارتفاع فتحة',
        maxOpeningH: 'أقصى ارتفاع فتحة',
        minLeafW: 'أدنى عرض لوح',
        minLeafH: 'أدنى ارتفاع لوح',
        panelThicknessMm: 'سُمك لوح الخزانة',
        backPanelThicknessMm: 'سُمك ظهر الخزانة',
        shelfGapMm: 'فجوة بين الرفوف',
        toeKickHeightMm: 'ارتفاع قاعدة المطبخ',
        drawerFrontGapMm: 'فجوة بين واجهات الأدراج',
        defaultCabinetDepthMm: 'عمق الخزانة الافتراضي'
    };

    var MEASURE_MODES = {
        frame_outer: { nameAr: 'مقاس الحلق الخارجي (تركيب)', desc: 'W×H = خارج الحلق — الأكثر شيوعاً في المصنع' },
        rough_opening: { nameAr: 'فتحة خام (حائط)', desc: 'W×H = brick-to-brick — يُخصم الشيم تلقائياً' },
        finished_leaf: { nameAr: 'مقاس اللوح الجاهز', desc: 'W×H = اللوح فقط — يُحسب الحلق عكسياً' }
    };

    var DOOR_SHAPES = {
        single_hinged: { nameAr: 'باب مفرد مفصلي', family: 'hinged', leaves: 1 },
        double_hinged: { nameAr: 'باب مزدوج مفصلي', family: 'hinged', leaves: 2 },
        sliding_2: { nameAr: 'باب سحاب ضلفتين', family: 'sliding', leaves: 2 },
        sliding_3: { nameAr: 'باب سحاب 3 ضلف', family: 'sliding', leaves: 3 },
        transom: { nameAr: 'باب + فتحة علوية', family: 'transom', leaves: 1, hasTransom: true },
        flat_plain: { nameAr: 'فلات سادة', family: 'flat', leaves: 1, style: 'flat' },
        u60_plain: { nameAr: 'يو 60 سادة', family: 'u60', leaves: 1, style: 'u60' },
        lib_plain: { nameAr: 'ليب سادة', family: 'lib', leaves: 1, style: 'lib' },
        flat_glass: { nameAr: 'فلات زجاج', family: 'flat', leaves: 1, style: 'flat', hasGlass: true },
        flat_classic: { nameAr: 'فلات كلاسيك CNC', family: 'flat', leaves: 1, style: 'flat', hasCnc: true },
        pricing_only: { nameAr: 'بند تسعير فقط', family: 'hinged', leaves: 0, pricingOnly: true },
        /* خزائن WPC */
        cabinet_wardrobe: { nameAr: 'خزانة ملابس — بابين', family: 'cabinet', leaves: 2, product: 'cabinet' },
        cabinet_single: { nameAr: 'خزانة — باب واحد', family: 'cabinet', leaves: 1, product: 'cabinet' },
        cabinet_kitchen_base: { nameAr: 'خزانة مطبخ سفلية', family: 'cabinet', leaves: 1, product: 'cabinet', kitchen: true },
        cabinet_kitchen_wall: { nameAr: 'خزانة مطبخ علوية', family: 'cabinet', leaves: 1, product: 'cabinet', kitchen: true, wallMount: true },
        cabinet_drawer_stack: { nameAr: 'خزانة أدراج', family: 'cabinet', leaves: 0, product: 'cabinet', drawers: true }
    };

    var PART_ROLES = {
        leaf: 'لوح الباب',
        frame_h: 'إطار أفقي',
        frame_v: 'إطار رأسي',
        jamb: 'حلق / فتحة',
        architrave: 'إطار زخرفي',
        threshold: 'عتبة',
        transom: 'فتحة علوية',
        lock_block: 'بلوک قفل',
        filler: 'حشو زجاج',
        shelf: 'رف WPC',
        back: 'ظهر الخزانة',
        drawer_front: 'واجهة درج',
        toe_kick: 'قاعدة / كعب'
    };

    var wpcModels = [];
    var wpcEstimates = [];
    var wpcCutJobs = [];
    var wpcAccessories = [];
    var wpcRemnants = [];
    var wpcAudit = [];
    var wpcSettings = {};
    var wpcActiveTab = 'dashboard';
    var wpcNavStack = [];
    var wpcEstimateDraft = null;
    var wpcDataReady = false;

    function wEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function wNum(v) {
        var n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }
    function wRound(n, d) {
        d = d == null ? 1 : d;
        var f = Math.pow(10, d);
        return Math.round(wNum(n) * f) / f;
    }
    function wId(prefix) {
        return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }
    function wField(id) {
        var el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function loadLocal(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return fallback;
            var parsed = JSON.parse(raw);
            return parsed == null ? fallback : parsed;
        } catch (e) { return fallback; }
    }
    function saveLocal(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    function canAccessWpcCutting() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof canManage === 'function' && canManage('production')) return true;
        var admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        return !!(admin && (admin.role === 'wpc_manager' || admin.role === 'production_manager'));
    }
    function requireWpcAccess(msg) {
        if (!canAccessWpcCutting()) {
            alert(msg || 'تخصيمات WPC — لمدير الإنتاج أو الإدارة الرئيسية.');
            return false;
        }
        return true;
    }

    function dOf(model) {
        return Object.assign({}, DEFAULT_DEDUCTIONS, (model && model.deductions) || {});
    }
    function partForRole(model, role) {
        if (!model) return null;
        return (model.parts || []).find(function (p) { return p.active !== false && p.role === role; }) || null;
    }
    function findModel(id) {
        return wpcModels.find(function (m) { return m.id === id && m.active !== false; }) || null;
    }

    function seedWpcDefaults() {
        if (wpcModels.length) return;
        wpcModels = [
            {
                id: 'wpc-nebras-flat',
                nameAr: 'نبراس — فلات WPC',
                family: 'flat',
                style: 'flat',
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: [
                    { id: 'wf-leaf', role: 'leaf', nameAr: 'لوح باب فلات', sku: 'WPC-FL-LEAF', pricePerM2: 85, thicknessMm: 40, active: true },
                    { id: 'wf-frh', role: 'frame_h', nameAr: 'إطار أفقي', sku: 'WPC-FL-FRH', pricePerM: 45, thicknessMm: 40, active: true },
                    { id: 'wf-frv', role: 'frame_v', nameAr: 'إطار رأسي', sku: 'WPC-FL-FRV', pricePerM: 45, thicknessMm: 40, active: true },
                    { id: 'wf-jmb', role: 'jamb', nameAr: 'حلق WPC', sku: 'WPC-FL-JMB', pricePerM: 38, thicknessMm: 40, active: true },
                    { id: 'wf-arch', role: 'architrave', nameAr: 'إطار زخرفي', sku: 'WPC-FL-ARCH', pricePerM: 32, thicknessMm: 18, active: true },
                    { id: 'wf-thr', role: 'threshold', nameAr: 'عتبة', sku: 'WPC-FL-THR', pricePerM: 28, thicknessMm: 15, active: true },
                    { id: 'wf-lock', role: 'lock_block', nameAr: 'بلوک قفل', sku: 'WPC-FL-LOCK', pricePerUnit: 12, active: true }
                ],
                active: true
            },
            {
                id: 'wpc-nebras-u60',
                nameAr: 'نبراس — يو 60 WPC',
                family: 'u60',
                style: 'u60',
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { jambDepthMm: 100, jambFaceMm: 65 }),
                parts: [
                    { id: 'wu-leaf', role: 'leaf', nameAr: 'لوح باب يو 60', sku: 'WPC-U60-LEAF', pricePerM2: 95, thicknessMm: 40, active: true },
                    { id: 'wu-frh', role: 'frame_h', nameAr: 'إطار يو أفقي', sku: 'WPC-U60-FRH', pricePerM: 52, thicknessMm: 40, active: true },
                    { id: 'wu-frv', role: 'frame_v', nameAr: 'إطار يو رأسي', sku: 'WPC-U60-FRV', pricePerM: 52, thicknessMm: 40, active: true },
                    { id: 'wu-jmb', role: 'jamb', nameAr: 'حلق يو 60', sku: 'WPC-U60-JMB', pricePerM: 42, thicknessMm: 40, active: true },
                    { id: 'wu-cnc', role: 'cnc_panel', nameAr: 'لوح CNC يو', sku: 'WPC-U60-CNC', pricePerM2: 110, thicknessMm: 18, active: true },
                    { id: 'wu-lock', role: 'lock_block', nameAr: 'بلوک قفل', sku: 'WPC-U60-LOCK', pricePerUnit: 12, active: true }
                ],
                active: true
            },
            {
                id: 'wpc-nebras-lib',
                nameAr: 'نبراس — ليب WPC',
                family: 'lib',
                style: 'lib',
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS),
                parts: [
                    { id: 'wl-leaf', role: 'leaf', nameAr: 'لوح باب ليب', sku: 'WPC-LIB-LEAF', pricePerM2: 92, thicknessMm: 40, active: true },
                    { id: 'wl-frh', role: 'frame_h', nameAr: 'إطار ليب أفقي', sku: 'WPC-LIB-FRH', pricePerM: 48, thicknessMm: 40, active: true },
                    { id: 'wl-frv', role: 'frame_v', nameAr: 'إطار ليب رأسي', sku: 'WPC-LIB-FRV', pricePerM: 48, thicknessMm: 40, active: true },
                    { id: 'wl-jmb', role: 'jamb', nameAr: 'حلق ليب', sku: 'WPC-LIB-JMB', pricePerM: 40, thicknessMm: 40, active: true },
                    { id: 'wl-lock', role: 'lock_block', nameAr: 'بلوک قفل', sku: 'WPC-LIB-LOCK', pricePerUnit: 12, active: true }
                ],
                active: true
            },
            {
                id: 'wpc-nebras-sliding',
                nameAr: 'نبراس — سحاب WPC',
                family: 'sliding',
                style: 'sliding',
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { sashOverlapMm: 30, sashBottomClearanceMm: 8 }),
                parts: [
                    { id: 'ws-leaf', role: 'leaf', nameAr: 'لوح سحاب', sku: 'WPC-SL-LEAF', pricePerM2: 88, thicknessMm: 40, active: true },
                    { id: 'ws-frh', role: 'frame_h', nameAr: 'علوي سحاب', sku: 'WPC-SL-FRH', pricePerM: 50, thicknessMm: 40, active: true },
                    { id: 'ws-frv', role: 'frame_v', nameAr: 'جانبي سحاب', sku: 'WPC-SL-FRV', pricePerM: 50, thicknessMm: 40, active: true },
                    { id: 'ws-thr', role: 'threshold', nameAr: 'سكينة / عتبة سحاب', sku: 'WPC-SL-THR', pricePerM: 35, thicknessMm: 20, active: true },
                    { id: 'ws-lock', role: 'lock_block', nameAr: 'قفل سحاب', sku: 'WPC-SL-LOCK', pricePerUnit: 18, active: true }
                ],
                active: true
            },
            {
                id: 'wpc-nebras-cabinet',
                nameAr: 'نبراس — خزائن WPC',
                family: 'cabinet',
                style: 'cabinet',
                deductions: Object.assign({}, DEFAULT_DEDUCTIONS, { defaultCabinetDepthMm: 600, panelThicknessMm: 18 }),
                parts: [
                    { id: 'wc-side', role: 'frame_v', nameAr: 'جانب خزانة', sku: 'WPC-CB-SIDE', pricePerM2: 72, thicknessMm: 18, active: true },
                    { id: 'wc-top', role: 'frame_h', nameAr: 'سقف/قاعدة', sku: 'WPC-CB-TOP', pricePerM2: 72, thicknessMm: 18, active: true },
                    { id: 'wc-back', role: 'back', nameAr: 'ظهر الخزانة', sku: 'WPC-CB-BACK', pricePerM2: 45, thicknessMm: 8, active: true },
                    { id: 'wc-shelf', role: 'shelf', nameAr: 'رف WPC', sku: 'WPC-CB-SHF', pricePerM2: 68, thicknessMm: 18, active: true },
                    { id: 'wc-door', role: 'leaf', nameAr: 'باب خزانة', sku: 'WPC-CB-DOOR', pricePerM2: 85, thicknessMm: 18, active: true },
                    { id: 'wc-drawer', role: 'drawer_front', nameAr: 'واجهة درج', sku: 'WPC-CB-DRW', pricePerM2: 82, thicknessMm: 18, active: true },
                    { id: 'wc-toe', role: 'toe_kick', nameAr: 'قاعدة مطبخ', sku: 'WPC-CB-TOE', pricePerM2: 55, thicknessMm: 18, active: true }
                ],
                active: true
            }
        ];
        if (!wpcAccessories.length) {
            wpcAccessories = [
                { id: 'acc-hinge', nameAr: 'مفصلات (3 حبات)', code: 'HNG-3', pricePerUnit: 45, perDoor: true },
                { id: 'acc-lock', nameAr: 'قفل + مقبض', code: 'LCK-SET', pricePerUnit: 85, perDoor: true },
                { id: 'acc-seal', nameAr: 'حشية مطاط', code: 'SEL-M', pricePerM: 8, perDoor: false },
                { id: 'acc-glass', nameAr: 'زجاج سيكوريت 6مم', code: 'GLS-6', pricePerM2: 120, perDoor: false }
            ];
        }
    }

    function normalizeModelDeductions(model) {
        if (!model) return Object.assign({}, DEFAULT_DEDUCTIONS);
        model.deductions = Object.assign({}, DEFAULT_DEDUCTIONS, model.deductions || {});
        return model.deductions;
    }

    function resolveItemShape(item) {
        var base = DOOR_SHAPES[item.shape] || DOOR_SHAPES.single_hinged;
        var leaves = base.family === 'cabinet' && base.drawers ? 0 : Math.max(1, wNum(item.leaves) || base.leaves || 1);
        if (base.family === 'cabinet' && !base.drawers) leaves = Math.max(1, wNum(item.leaves) || base.leaves || 1);
        return Object.assign({}, base, {
            leaves: leaves,
            hasTransom: !!(item.hasTransom || base.hasTransom),
            hasGlass: !!(item.hasGlass || base.hasGlass),
            hasCnc: !!(item.hasCnc || base.hasCnc),
            isBathroom: !!item.isBathroom,
            isDoor: base.family !== 'cabinet',
            isCabinet: base.family === 'cabinet'
        });
    }

    function resolveMeasureMode(item) {
        var m = item && item.measureMode;
        if (m && MEASURE_MODES[m]) return m;
        return wpcSettings.measureModeDefault || 'frame_outer';
    }

    /** يحوّل مدخلات المستخدم إلى frameOuter + innerClear + leafCut — مصدر واحد للورشة */
    function computeWpcCabinetGeometry(item, model) {
        var d = dOf(model);
        var shape = resolveItemShape(item);
        var W = wNum(item.widthMm);
        var H = wNum(item.heightMm);
        var D = wNum(item.depthMm) || wNum(d.defaultCabinetDepthMm);
        var panelT = wNum(d.panelThicknessMm);
        var backT = wNum(d.backPanelThicknessMm);
        var steps = [];
        var leaves = shape.drawers ? 0 : Math.max(1, shape.leaves || 1);
        steps.push({ k: 'خزانة خارجي', v: W + '×' + H + '×' + D + ' مم' });
        var internalW = wRound(W - 2 * panelT, 1);
        var internalH = wRound(H - 2 * panelT, 1);
        var internalD = wRound(D - panelT - backT, 1);
        steps.push({ k: 'داخلي', v: 'عرض ' + internalW + ' · عمق ' + internalD + ' · ارتفاع صافي ' + internalH });
        var sideGap = wNum(d.sideClearanceMm);
        var headGap = wNum(d.headClearanceMm);
        var bottomGap = shape.drawers ? wNum(d.drawerFrontGapMm) : wNum(d.bottomClearanceMm);
        var leafW = 0;
        var leafH = 0;
        if (shape.drawers) {
            var drawerCount = Math.max(2, Math.round(wNum(item.drawerCount) || 4));
            leafH = wRound(Math.max(50, (H - (drawerCount + 1) * bottomGap) / drawerCount), 1);
            leafW = wRound(Math.max(50, W - 2 * sideGap), 1);
            steps.push({ k: 'واجهات أدراج', v: leafW + '×' + leafH + ' × ' + drawerCount });
        } else if (leaves <= 1) {
            leafW = wRound(Math.max(50, W - 2 * sideGap), 1);
            leafH = wRound(Math.max(50, H - headGap - bottomGap), 1);
            steps.push({ k: 'باب خزانة', v: leafW + '×' + leafH });
        } else {
            var meeting = wNum(d.meetingGapMm);
            leafW = wRound(Math.max(50, (W - 2 * sideGap - (leaves - 1) * meeting) / leaves), 1);
            leafH = wRound(Math.max(50, H - headGap - bottomGap), 1);
            steps.push({ k: 'باب خزانة مزدوج', v: leafW + '×' + leafH + ' × ' + leaves });
        }
        return {
            frameOuterW: wRound(W, 1), frameOuterH: wRound(H, 1), depthMm: wRound(D, 1),
            innerClearW: internalW, innerClearH: internalH, internalDepthMm: internalD,
            leafW: leafW, leafH: leafH, leaves: leaves, transomH: 0,
            steps: steps, shape: shape, deductions: d, product: 'cabinet'
        };
    }

    function computeWpcGeometry(item, model) {
        var d = dOf(model);
        var shape = resolveItemShape(item);
        if (shape.family === 'cabinet') return computeWpcCabinetGeometry(item, model);
        var mode = resolveMeasureMode(item);
        var W = wNum(item.widthMm);
        var H = wNum(item.heightMm);
        var leaves = Math.max(1, shape.leaves || 1);
        var steps = [];
        var frameOuterW = W;
        var frameOuterH = H;

        if (mode === 'rough_opening') {
            frameOuterW = W - 2 * wNum(d.packingGapSideMm);
            frameOuterH = H - wNum(d.packingGapTopMm);
            steps.push({ k: 'فتحة خام', v: W + '×' + H + ' مم' });
            steps.push({ k: 'حلق خارجي', v: 'عرض: ' + W + ' − 2×' + d.packingGapSideMm + ' = ' + wRound(frameOuterW, 1) +
                ' · ارتفاع: ' + H + ' − ' + d.packingGapTopMm + ' = ' + wRound(frameOuterH, 1) });
        } else if (mode === 'finished_leaf') {
            var jamb = wNum(d.jambFaceMm);
            var side = wNum(d.sideClearanceMm);
            var head = wNum(d.headClearanceMm);
            var bottom = shape.isBathroom ? wNum(d.bottomClearanceBathMm) : wNum(d.bottomClearanceMm);
            frameOuterW = W + 2 * jamb + 2 * side;
            frameOuterH = H + wNum(d.headJambFaceMm) + head + bottom;
            steps.push({ k: 'لوح جاهز', v: W + '×' + H + ' مم' });
            steps.push({ k: 'حلق خارجي (عكسي)', v: wRound(frameOuterW, 1) + '×' + wRound(frameOuterH, 1) + ' مم' });
        } else {
            steps.push({ k: 'حلق خارجي', v: W + '×' + H + ' مم (مدخل مباشر)' });
        }

        var innerClearW = wRound(frameOuterW - 2 * wNum(d.jambFaceMm), 1);
        var innerClearH = wRound(frameOuterH - wNum(d.headJambFaceMm), 1);
        steps.push({ k: 'صافي الفتحة', v: 'عرض: ' + frameOuterW + ' − 2×' + d.jambFaceMm + ' = ' + innerClearW +
            ' · ارتفاع: ' + frameOuterH + ' − ' + d.headJambFaceMm + ' = ' + innerClearH });

        var transomH = 0;
        if (shape.hasTransom || item.hasTransom) {
            transomH = wNum(item.transomHeightMm) || wNum(d.transomHeightMm);
            innerClearH = wRound(Math.max(0, innerClearH - transomH - wNum(d.transomLeafGapMm)), 1);
            steps.push({ k: 'بعد الترانسوم', v: 'ارتفاع صافي للوح: ' + innerClearH + ' (−' + transomH + '−' + d.transomLeafGapMm + ')' });
        }

        var bottomGap = shape.isBathroom ? wNum(d.bottomClearanceBathMm) : wNum(d.bottomClearanceMm);
        if (shape.family === 'sliding') {
            bottomGap = wNum(d.sashBottomClearanceMm);
        }
        var headGap = shape.family === 'sliding' ? wNum(d.sashTopClearanceMm) : wNum(d.headClearanceMm);
        var sideGap = wNum(d.sideClearanceMm);
        var leafH = wRound(Math.max(0, innerClearH - headGap - bottomGap - wNum(d.thresholdDeductFromLeafMm)), 1);
        var leafW;

        if (shape.family === 'sliding') {
            leafW = slidingLeafWidthMm(innerClearW, leaves, d);
            steps.push({ k: 'لوح سحاب', v: 'عرض: (' + innerClearW + '+(' + leaves + '−1)×' + d.sashOverlapMm + '−(' + leaves + '−1)×' + d.sashSplitMm + ')/' + leaves + ' = ' + leafW +
                ' · ارتفاع: ' + innerClearH + '−' + headGap + '−' + bottomGap + ' = ' + leafH });
        } else {
            if (leaves <= 1) {
                leafW = wRound(Math.max(0, innerClearW - 2 * sideGap), 1);
                steps.push({ k: 'لوح مفصلي', v: 'عرض: ' + innerClearW + ' − 2×' + sideGap + ' = ' + leafW +
                    ' · ارتفاع: ' + innerClearH + ' − ' + headGap + ' − ' + bottomGap + ' = ' + leafH });
            } else {
                var meeting = wNum(d.meetingGapMm);
                leafW = wRound(Math.max(0, (innerClearW - 2 * sideGap - (leaves - 1) * meeting) / leaves), 1);
                steps.push({ k: 'لوح مزدوج', v: 'عرض/ضلفة: (' + innerClearW + '−2×' + sideGap + '−(' + leaves + '−1)×' + meeting + ')/' + leaves + ' = ' + leafW +
                    ' · ارتفاع: ' + leafH });
            }
        }

        return {
            frameOuterW: wRound(frameOuterW, 1),
            frameOuterH: wRound(frameOuterH, 1),
            innerClearW: innerClearW,
            innerClearH: innerClearH,
            leafW: leafW,
            leafH: leafH,
            transomH: transomH,
            leaves: leaves,
            steps: steps,
            shape: shape,
            deductions: d
        };
    }

    function slidingLeafWidthMm(innerClearW, leaves, d) {
        var n = Math.max(1, Math.round(wNum(leaves) || 1));
        var overlap = wNum(d.sashOverlapMm);
        var split = wNum(d.sashSplitMm);
        if (n <= 1) return wRound(Math.max(0, innerClearW), 1);
        return wRound(Math.max(0, (innerClearW + (n - 1) * overlap - (n - 1) * split) / n), 1);
    }

    function buildWpcFormulaSteps(item) {
        var model = findModel(item.modelId) || wpcModels[0];
        var geo = computeWpcGeometry(item, model);
        return geo.steps || [];
    }

    function validateWpcEstimateForWorkshop(est) {
        est = est || wpcEstimateDraft;
        var blocking = [];
        var warnings = [];
        if (!est || !(est.items || []).length) {
            blocking.push('لا توجد بنود في المقايسة');
            return { ok: false, blocking: blocking, warnings: warnings };
        }
        (est.items || []).forEach(function (it, i) {
            if (it.pricingOnly || it.shape === 'pricing_only') return;
            var built = wpcCutsWithMeta(it, i);
            (built.blocking || []).forEach(function (b) { blocking.push('بند ' + (i + 1) + ': ' + b); });
            (built.warnings || []).forEach(function (w) { warnings.push('بند ' + (i + 1) + ': ' + w); });
            (built.panels || []).concat(built.cuts || []).forEach(function (p) {
                if (p.missingPart) blocking.push('بند ' + (i + 1) + ': قطعة ناقصة «' + (p.partName || p.role) + '»');
            });
        });
        return { ok: blocking.length === 0, blocking: blocking, warnings: warnings };
    }

    function wpcCutsWithMeta(item, itemIndex) {
        var result = buildWpcDoorCuts(item, itemIndex);
        var blocking = [];
        var model = findModel(item.modelId) || wpcModels[0];
        var d = dOf(model);
        var W = wNum(item.widthMm);
        var H = wNum(item.heightMm);
        if (W < wNum(d.minOpeningW) || W > wNum(d.maxOpeningW)) {
            blocking.push('عرض ' + W + ' خارج الحدود (' + d.minOpeningW + '–' + d.maxOpeningW + ' مم)');
        }
        if (H < wNum(d.minOpeningH) || H > wNum(d.maxOpeningH)) {
            blocking.push('ارتفاع ' + H + ' خارج الحدود (' + d.minOpeningH + '–' + d.maxOpeningH + ' مم)');
        }
        if (result.geometry && resolveItemShape(item).family !== 'cabinet') {
            if (result.geometry.leafW < wNum(d.minLeafW)) blocking.push('عرض اللوح ' + result.geometry.leafW + ' أقل من الأدنى ' + d.minLeafW);
            if (result.geometry.leafH < wNum(d.minLeafH)) blocking.push('ارتفاع اللوح ' + result.geometry.leafH + ' أقل من الأدنى ' + d.minLeafH);
        }
        result.blocking = blocking;
        return result;
    }

    function buildWpcCabinetCuts(item, itemIndex) {
        var shape = resolveItemShape(item);
        var model = findModel(item.modelId) || wpcModels[0];
        var warnings = [];
        var formulaSteps = [];
        if (!model) warnings.push('لا يوجد موديل WPC — أضف موديلاً أولاً');
        normalizeModelDeductions(model);
        var geo = computeWpcCabinetGeometry(item, model);
        formulaSteps = geo.steps.slice();
        var d = geo.deductions;
        var qty = Math.max(1, Math.round(wNum(item.qty) || 1));
        var cuts = [];
        var panels = [];
        var idx = itemIndex + 1;
        var W = geo.frameOuterW;
        var H = geo.frameOuterH;
        var D = geo.depthMm;
        var panelT = wNum(d.panelThicknessMm);
        var backT = wNum(d.backPanelThicknessMm);
        var internalW = geo.innerClearW;
        var internalD = geo.internalDepthMm;
        var bodyH = shape.kitchen && !shape.wallMount ? wRound(H - wNum(d.toeKickHeightMm), 1) : H;
        var shelfCount = Math.max(0, Math.round(wNum(item.shelfCount != null ? item.shelfCount : (shape.wallMount ? 0 : 2))));

        function pushPanel(role, labelAr, widthMm, heightMm, pieceQty, formulaNote) {
            var w = wRound(Math.max(0.1, wNum(widthMm)), 1);
            var h = wRound(Math.max(0.1, wNum(heightMm)), 1);
            if (w < 1 || h < 1) { warnings.push('مقاس غير صالح لـ «' + labelAr + '»: ' + w + '×' + h); return; }
            var part = partForRole(model, role);
            panels.push({
                role: role, labelAr: labelAr, partName: part ? part.nameAr : (PART_ROLES[role] || role),
                sku: part ? part.sku : ('WPC-' + role), widthMm: w, heightMm: h, qty: pieceQty * qty,
                areaM2: wRound((w / 1000) * (h / 1000) * pieceQty * qty, 4), itemIndex: idx,
                openingLabel: item.labelAr || shape.nameAr, missingPart: !part, formulaNote: formulaNote || '',
                pricePerM2: part ? wNum(part.pricePerM2) : 0, pricePerM: part ? wNum(part.pricePerM) : 0,
                pricePerUnit: part ? wNum(part.pricePerUnit) : 0
            });
        }

        pushPanel('frame_v', 'جانب خزانة', internalD, bodyH, 2,
            'Side = (' + D + '−' + panelT + '−' + backT + ')×' + bodyH + ' ×2');
        pushPanel('frame_h', 'سقف/قاعدة خزانة', internalW, wRound(D - panelT, 1), 2,
            'Top/Bot = (' + W + '−2×' + panelT + ')×(' + D + '−' + panelT + ') ×2');
        pushPanel('back', 'ظهر الخزانة', internalW, wRound(bodyH - (shape.kitchen ? 0 : 0), 1), 1,
            'Back = ' + internalW + '×' + bodyH);
        if (shelfCount > 0) {
            pushPanel('shelf', 'رف WPC', internalW, internalD, shelfCount,
                'Shelf = ' + internalW + '×' + internalD + ' ×' + shelfCount);
            formulaSteps.push({ k: 'رفوف', v: shelfCount + ' × ' + internalW + '×' + internalD });
        }
        if (shape.kitchen && !shape.wallMount) {
            pushPanel('toe_kick', 'قاعدة مطبخ (كعب)', internalW, wNum(d.toeKickHeightMm), 1,
                'Toe = ' + internalW + '×' + d.toeKickHeightMm);
        }
        if (shape.drawers) {
            var drawerCount = Math.max(2, Math.round(wNum(item.drawerCount) || 4));
            pushPanel('drawer_front', 'واجهة درج', geo.leafW, geo.leafH, drawerCount,
                'Drawer = ' + geo.leafW + '×' + geo.leafH + ' ×' + drawerCount);
        } else {
            var leaves = geo.leaves;
            for (var li = 0; li < leaves; li++) {
                pushPanel('leaf', 'باب خزانة' + (leaves > 1 ? ' ضلفة ' + (li + 1) : ''), geo.leafW, geo.leafH, 1,
                    'Door = ' + geo.leafW + '×' + geo.leafH);
            }
        }
        return { cuts: cuts, panels: panels, warnings: warnings, formulaSteps: formulaSteps, geometry: geo, blocking: [] };
    }

    function buildWpcDoorCuts(item, itemIndex) {
        if (item && (item.pricingOnly || item.shape === 'pricing_only')) {
            return { cuts: [], panels: [], warnings: [], blocking: [], formulaSteps: [], geometry: null };
        }
        var shapeEarly = resolveItemShape(item);
        if (shapeEarly.family === 'cabinet') return buildWpcCabinetCuts(item, itemIndex);
        var shape = resolveItemShape(item);
        var model = findModel(item.modelId) || wpcModels[0];
        var warnings = [];
        var formulaSteps = [];
        if (!model) warnings.push('لا يوجد موديل WPC — أضف موديلاً أولاً');
        normalizeModelDeductions(model);
        var geo = computeWpcGeometry(item, model);
        formulaSteps = geo.steps.slice();
        var d = geo.deductions;
        var qty = Math.max(1, Math.round(wNum(item.qty) || 1));
        var leaves = geo.leaves;
        var cuts = [];
        var panels = [];
        var idx = itemIndex + 1;
        var W = geo.frameOuterW;
        var H = geo.frameOuterH;
        var leafW = geo.leafW;
        var leafH = geo.leafH;

        function pushPanel(role, labelAr, widthMm, heightMm, pieceQty, formulaNote) {
            var w = wRound(Math.max(0.1, wNum(widthMm)), 1);
            var h = wRound(Math.max(0.1, wNum(heightMm)), 1);
            if (w < 1 || h < 1) {
                warnings.push('مقاس غير صالح لـ «' + labelAr + '»: ' + w + '×' + h);
                return;
            }
            var part = partForRole(model, role);
            panels.push({
                role: role, labelAr: labelAr,
                partName: part ? part.nameAr : (PART_ROLES[role] || role),
                sku: part ? part.sku : ('WPC-' + role),
                widthMm: w, heightMm: h, qty: pieceQty * qty,
                areaM2: wRound((w / 1000) * (h / 1000) * pieceQty * qty, 4),
                itemIndex: idx, openingLabel: item.labelAr || shape.nameAr,
                missingPart: !part,
                formulaNote: formulaNote || '',
                pricePerM2: part ? wNum(part.pricePerM2) : 0,
                pricePerM: part ? wNum(part.pricePerM) : 0,
                pricePerUnit: part ? wNum(part.pricePerUnit) : 0
            });
        }

        function pushLinear(role, labelAr, lengthMm, pieceQty, formulaNote) {
            var len = wRound(Math.max(0.1, wNum(lengthMm)), 1);
            var part = partForRole(model, role);
            cuts.push({
                role: role, labelAr: labelAr,
                partName: part ? part.nameAr : (PART_ROLES[role] || role),
                sku: part ? part.sku : ('WPC-' + role),
                lengthMm: len, qty: pieceQty * qty,
                itemIndex: idx, openingLabel: item.labelAr || shape.nameAr,
                missingPart: !part, formulaNote: formulaNote || '',
                pricePerM: part ? wNum(part.pricePerM) : 0,
                pricePerUnit: part ? wNum(part.pricePerUnit) : 0
            });
        }

        pushLinear('jamb', 'عارضة علوية (Head)', W, 1, 'Head = ' + W);
        pushLinear('jamb', 'قائمة جانبية (Jamb)', H, 2, 'Jamb = ' + H + ' ×2');
        if (shape.family !== 'sliding') {
            pushLinear('jamb', 'عتبة حلق سفلية', W, 1, 'Sill = ' + W);
        }

        pushLinear('frame_h', 'إطار WPC أفقي', W, 2, 'Frame H = ' + W + ' ×2');
        pushLinear('frame_v', 'إطار WPC رأسي', H, 2, 'Frame V = ' + H + ' ×2');

        if (item.includeArchitrave !== false) {
            var archOv = wNum(d.architraveOverlapMm);
            pushLinear('architrave', 'إطار زخرفي أفقي', W + archOv * 2, 2,
                'Arch H = ' + W + '+2×' + archOv);
            pushLinear('architrave', 'إطار زخرفي رأسي', H + archOv, 2,
                'Arch V = ' + H + '+' + archOv);
        }

        if (shape.family === 'sliding') {
            pushLinear('threshold', 'سكينة /轨道 سحاب', W, 1, 'Track = ' + W);
        } else if (shape.family !== 'flat') {
            pushLinear('threshold', 'عتبة', W, 1, 'Threshold = ' + W);
        }

        if (geo.transomH > 0) {
            var tW = wRound(W - 2 * wNum(d.transomFrameDeductMm), 1);
            pushPanel('transom', 'لوح/زجاج ترانسوم', tW, geo.transomH, 1,
                'Transom = ' + tW + '×' + geo.transomH);
        }

        for (var li = 0; li < leaves; li++) {
            pushPanel('leaf', 'لوح باب' + (leaves > 1 ? ' ضlfة ' + (li + 1) : ''), leafW, leafH, 1,
                'Leaf = ' + leafW + '×' + leafH);
        }

        if (shape.hasGlass || item.hasGlass) {
            var inset = wNum(d.glassInsetMm);
            var gDed = wNum(d.glassDeductionMm);
            var gW = wRound(Math.max(1, leafW - inset * 2 - gDed * 2), 1);
            var gH = wRound(Math.max(1, leafH - inset * 2 - gDed * 2), 1);
            pushPanel('filler', 'حشو زجاج', gW, gH, leaves,
                'Glass = (' + leafW + '−2×' + inset + '−2×' + gDed + ')×(' + leafH + '−2×' + inset + '−2×' + gDed + ')');
            formulaSteps.push({ k: 'زجاج', v: gW + '×' + gH + ' مم × ' + leaves });
        }

        if (shape.hasCnc || item.hasCnc) {
            var margin = wNum(d.cncMarginMm);
            pushPanel('cnc_panel', 'لوح CNC', Math.max(1, leafW - margin * 2), Math.max(1, leafH - margin * 2), leaves,
                'CNC = (' + leafW + '−2×' + margin + ')×(' + leafH + '−2×' + margin + ')');
        }

        pushPanel('lock_block', 'بلوک تقوية قفل', wNum(d.lockBlockW), wNum(d.lockBlockH), leaves,
            'Lock block ' + d.lockBlockW + '×' + d.lockBlockH);

        return {
            cuts: cuts, panels: panels, warnings: warnings,
            formulaSteps: formulaSteps, geometry: geo, blocking: []
        };
    }

    function runWpcSheetPlan(panels, opts) {
        opts = opts || {};
        var sheetW = wNum(opts.sheetWidthMm) || wNum(wpcSettings.sheetWidthMm) || 1220;
        var sheetH = wNum(opts.sheetHeightMm) || wNum(wpcSettings.sheetHeightMm) || 2440;
        var kerf = wNum(opts.kerfMm) || wNum(wpcSettings.kerfMm) || 3;
        var step = 1;
        var pieces = [];
        (panels || []).forEach(function (p) {
            if (p.role === 'lock_block') return;
            var q = Math.max(1, Math.round(wNum(p.qty) || 1));
            for (var i = 0; i < q; i++) {
                pieces.push({
                    label: p.labelAr, sku: p.sku,
                    w: wNum(p.widthMm), h: wNum(p.heightMm), role: p.role
                });
            }
        });
        pieces.sort(function (a, b) { return (b.w * b.h) - (a.w * a.h); });

        var sheets = [];

        function overlaps(x, y, w, h, sheet) {
            for (var j = 0; j < sheet.placed.length; j++) {
                var ex = sheet.placed[j];
                if (!(x + w + kerf <= ex.x || x >= ex.x + ex.w + kerf ||
                    y + h + kerf <= ex.y || y >= ex.y + ex.h + kerf)) return true;
            }
            return false;
        }

        function tryPlace(piece, sheet) {
            var optsPl = [
                { w: piece.w, h: piece.h, rot: false },
                { w: piece.h, h: piece.w, rot: true }
            ];
            for (var pi = 0; pi < optsPl.length; pi++) {
                var pl = optsPl[pi];
                if (pl.w + kerf > sheetW || pl.h + kerf > sheetH) continue;
                for (var y = 0; y <= sheetH - pl.h; y += step) {
                    for (var x = 0; x <= sheetW - pl.w; x += step) {
                        if (!overlaps(x, y, pl.w, pl.h, sheet)) {
                            sheet.placed.push({
                                x: x, y: y, w: pl.w, h: pl.h,
                                label: piece.label, sku: piece.sku, rot: pl.rot
                            });
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        pieces.forEach(function (piece) {
            var placed = false;
            for (var si = 0; si < sheets.length; si++) {
                if (tryPlace(piece, sheets[si])) { placed = true; break; }
            }
            if (!placed) {
                var ns = { w: sheetW, h: sheetH, placed: [] };
                if (tryPlace(piece, ns)) sheets.push(ns);
                else {
                    var overflow = piece.w > sheetW || piece.h > sheetH;
                    sheets.push({
                        w: sheetW, h: sheetH,
                        placed: [{
                            x: 0, y: 0, w: piece.w, h: piece.h,
                            label: piece.label, sku: piece.sku, rot: false, overflow: overflow
                        }]
                    });
                }
            }
        });

        var totalSheetArea = sheets.length * sheetW * sheetH;
        var usedArea = 0;
        var overflowCount = 0;
        sheets.forEach(function (s) {
            s.placed.forEach(function (p) {
                usedArea += p.w * p.h;
                if (p.overflow) overflowCount++;
            });
        });
        var wastePct = totalSheetArea > 0 ? wRound((1 - usedArea / totalSheetArea) * 100, 2) : 0;

        return {
            sheets: sheets, sheetCount: sheets.length, wastePct: wastePct,
            sheetW: sheetW, sheetH: sheetH, kerfMm: kerf,
            overflowCount: overflowCount, usedAreaM2: wRound(usedArea / 1e6, 3)
        };
    }

    function computeWpcEstimateTotals(est) {
        est = est || wpcEstimateDraft;
        var subtotal = 0;
        var allPanels = [];
        var allCuts = [];
        var warnings = [];
        var formulaWarnings = [];
        (est && est.items || []).forEach(function (it, i) {
            var built = wpcCutsWithMeta(it, i);
            (built.warnings || []).forEach(function (w) { warnings.push(w); });
            (built.blocking || []).forEach(function (b) { formulaWarnings.push(b); });
            (built.formulaSteps || []).forEach(function (s) { /* captured per item */ });
            allPanels = allPanels.concat(built.panels || []);
            allCuts = allCuts.concat(built.cuts || []);
            (built.panels || []).forEach(function (p) {
                subtotal += wNum(p.areaM2) * wNum(p.pricePerM2);
            });
            (built.cuts || []).forEach(function (c) {
                subtotal += (wNum(c.lengthMm) / 1000) * wNum(c.pricePerM);
                subtotal += wNum(c.pricePerUnit) * wNum(c.qty);
            });
        });
        var doorCount = (est.items || []).reduce(function (n, it) {
            return n + (it.pricingOnly ? 0 : Math.max(1, wNum(it.qty) || 1));
        }, 0);
        subtotal += doorCount * wNum(wpcSettings.laborPerDoor);
        (wpcAccessories || []).forEach(function (a) {
            if (a.perDoor) subtotal += wNum(a.pricePerUnit) * doorCount;
        });
        var vat = wRound(subtotal * wNum(wpcSettings.vatPct) / 100, 2);
        return {
            subtotal: wRound(subtotal, 2),
            vat: vat,
            total: wRound(subtotal + vat, 2),
            panels: allPanels,
            cuts: allCuts,
            doorCount: doorCount,
            warnings: warnings,
            formulaWarnings: formulaWarnings
        };
    }

    function hydrateWpcCuttingLocal() {
        wpcModels = loadLocal(MODELS_KEY, []);
        wpcEstimates = loadLocal(ESTIMATES_KEY, []);
        wpcCutJobs = loadLocal(CUT_JOBS_KEY, []);
        wpcAccessories = loadLocal(ACCESSORIES_KEY, []);
        wpcRemnants = loadLocal(REMNANTS_KEY, []);
        wpcAudit = loadLocal(AUDIT_KEY, []);
        wpcSettings = Object.assign({}, DEFAULT_SETTINGS, loadLocal(SETTINGS_KEY, {}));
        seedWpcDefaults();
        if (!loadLocal(MODELS_KEY, null)) saveLocal(MODELS_KEY, wpcModels);
        wpcDataReady = true;
    }

    function persistWpcCuttingLocal() {
        saveLocal(MODELS_KEY, wpcModels);
        saveLocal(ESTIMATES_KEY, wpcEstimates);
        saveLocal(CUT_JOBS_KEY, wpcCutJobs);
        saveLocal(SETTINGS_KEY, wpcSettings);
        saveLocal(ACCESSORIES_KEY, wpcAccessories);
        saveLocal(REMNANTS_KEY, wpcRemnants);
        saveLocal(AUDIT_KEY, wpcAudit.slice(-300));
    }

    async function persistWpcCuttingCloud(keys) {
        persistWpcCuttingLocal();
        keys = keys || ['wpc_models', 'wpc_estimates', 'wpc_cut_jobs', 'wpc_cut_settings', 'wpc_accessories', 'wpc_remnants', 'wpc_cut_audit'];
        if (typeof persistNebrasCriticalStores === 'function') {
            try {
                return await persistNebrasCriticalStores(keys, { silent: true, showToast: false, promptReauth: false });
            } catch (e) { console.warn('wpc cloud persist', e); }
        }
        return false;
    }

    function getWpcModels() { return wpcModels; }
    function getWpcEstimates() { return wpcEstimates; }
    function getWpcCutJobs() { return wpcCutJobs; }
    function getWpcCutSettings() { return wpcSettings; }
    function getWpcAccessories() { return wpcAccessories; }
    function getWpcRemnants() { return wpcRemnants; }
    function setWpcModelsFromCloud(v) { wpcModels = Array.isArray(v) ? v : []; seedWpcDefaults(); saveLocal(MODELS_KEY, wpcModels); }
    function setWpcEstimatesFromCloud(v) { wpcEstimates = Array.isArray(v) ? v : []; saveLocal(ESTIMATES_KEY, wpcEstimates); }
    function setWpcCutJobsFromCloud(v) { wpcCutJobs = Array.isArray(v) ? v : []; saveLocal(CUT_JOBS_KEY, wpcCutJobs); }
    function setWpcCutSettingsFromCloud(v) { wpcSettings = Object.assign({}, DEFAULT_SETTINGS, v || {}); saveLocal(SETTINGS_KEY, wpcSettings); }
    function setWpcAccessoriesFromCloud(v) { wpcAccessories = Array.isArray(v) ? v : []; saveLocal(ACCESSORIES_KEY, wpcAccessories); }
    function setWpcRemnantsFromCloud(v) { wpcRemnants = Array.isArray(v) ? v : []; saveLocal(REMNANTS_KEY, wpcRemnants); }
    function setWpcCutAuditFromCloud(v) { wpcAudit = Array.isArray(v) ? v : []; saveLocal(AUDIT_KEY, wpcAudit); }

    /* —— رسومات هندسية + معاينة 3D —— */
    function wpcDrawElevationSvg(item, opts) {
        opts = opts || {};
        var Wmm = Math.max(100, wNum(item.widthMm) || 900);
        var Hmm = Math.max(100, wNum(item.heightMm) || 2100);
        var Dmm = Math.max(100, wNum(item.depthMm) || wNum(DEFAULT_DEDUCTIONS.defaultCabinetDepthMm));
        var shape = resolveItemShape(item);
        var geo = computeWpcGeometry(item, findModel(item.modelId) || wpcModels[0]);
        var viewW = opts.viewW || 400;
        var viewH = opts.viewH || 340;
        var margin = 52;
        var drawW = viewW - margin * 2;
        var drawH = viewH - margin * 2 - 20;
        var scale = Math.min(drawW / Wmm, drawH / Hmm);
        var fw = Wmm * scale;
        var fh = Hmm * scale;
        var ox = (viewW - fw) / 2;
        var oy = margin * 0.5;
        var navy = '#0d2840';
        var accent = '#1a6b4a';
        var gold = '#c9a227';
        var wood = '#8b6914';
        var inner = '';

        function dimH(x1, x2, y, label) {
            var mid = (x1 + x2) / 2;
            return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + x1 + '" y1="' + (y - 4) + '" x2="' + x1 + '" y2="' + (y + 4) + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<line x1="' + x2 + '" y1="' + (y - 4) + '" x2="' + x2 + '" y2="' + (y + 4) + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<text x="' + mid + '" y="' + (y + 14) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + navy + '">' + wEsc(label) + '</text>';
        }
        function dimV(y1, y2, x, label) {
            var mid = (y1 + y2) / 2;
            return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + gold + '" stroke-width="1.2"/>' +
                '<text x="' + (x - 10) + '" y="' + mid + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + navy + '" transform="rotate(-90 ' + (x - 10) + ' ' + mid + ')">' + wEsc(label) + '</text>';
        }

        if (shape.family === 'cabinet') {
            var frameT = Math.max(4, Math.min(14, fw * 0.04));
            inner += '<rect x="' + ox + '" y="' + oy + '" width="' + fw + '" height="' + fh + '" fill="#f4f7f5" stroke="' + navy + '" stroke-width="2" rx="2"/>';
            inner += '<rect x="' + (ox + frameT) + '" y="' + (oy + frameT) + '" width="' + Math.max(1, fw - frameT * 2) + '" height="' + Math.max(1, fh - frameT * 2) + '" fill="#fff" stroke="' + accent + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
            if (shape.drawers) {
                var dc = Math.max(2, Math.round(wNum(item.drawerCount) || 4));
                var gap = 3 * scale;
                var dh = (fh - frameT * 2 - gap * (dc + 1)) / dc;
                for (var di = 0; di < dc; di++) {
                    var dy = oy + frameT + gap + di * (dh + gap);
                    inner += '<rect x="' + (ox + frameT + 4) + '" y="' + dy + '" width="' + Math.max(1, fw - frameT * 2 - 8) + '" height="' + Math.max(1, dh) + '" fill="rgba(139,105,20,0.15)" stroke="' + wood + '" stroke-width="1.2" rx="2"/>';
                    inner += '<circle cx="' + (ox + fw - frameT - 12) + '" cy="' + (dy + dh / 2) + '" r="3" fill="' + gold + '"/>';
                }
            } else {
                var leaves = Math.max(1, geo.leaves || 1);
                var lw = (fw - frameT * 2) / leaves;
                for (var li = 0; li < leaves; li++) {
                    var lx = ox + frameT + li * lw;
                    inner += '<rect x="' + (lx + 3) + '" y="' + (oy + frameT + 3) + '" width="' + Math.max(1, lw - 6) + '" height="' + Math.max(1, fh - frameT * 2 - 6) + '" fill="rgba(26,107,74,0.12)" stroke="' + accent + '" stroke-width="1.4" rx="2"/>';
                    inner += '<line x1="' + (lx + lw / 2) + '" y1="' + (oy + fh / 2 - 20) + '" x2="' + (lx + lw / 2) + '" y2="' + (oy + fh / 2 + 20) + '" stroke="' + gold + '" stroke-width="1.5"/>';
                }
            }
            inner += dimH(ox, ox + fw, oy + fh + 18, Wmm + ' مم');
            inner += dimV(oy, oy + fh, ox - 14, Hmm + ' مم');
            inner += '<text x="' + (viewW / 2) + '" y="18" text-anchor="middle" font-size="12" font-weight="800" fill="' + navy + '">' + wEsc(shape.nameAr) + ' — منظر أمامي</text>';
            inner += '<text x="' + (viewW / 2) + '" y="32" text-anchor="middle" font-size="10" fill="' + accent + '">عمق: ' + Dmm + ' مم</text>';
        } else {
            var frameT2 = Math.max(5, Math.min(16, Math.round(Math.min(fw, fh) * 0.038)));
            var leaves2 = Math.max(1, geo.leaves || 1);
            inner += '<rect x="' + ox + '" y="' + oy + '" width="' + fw + '" height="' + fh + '" fill="#f8fafc" stroke="' + navy + '" stroke-width="2.2" rx="2"/>';
            inner += '<rect x="' + (ox + frameT2) + '" y="' + (oy + frameT2) + '" width="' + Math.max(1, fw - frameT2 * 2) + '" height="' + Math.max(1, fh - frameT2 * 2) + '" fill="#fff" stroke="' + accent + '" stroke-width="1.4"/>';
            var leafPxW = (fw - frameT2 * 2) / leaves2;
            for (var lj = 0; lj < leaves2; lj++) {
                var ljx = ox + frameT2 + lj * leafPxW;
                inner += '<rect x="' + (ljx + 4) + '" y="' + (oy + frameT2 + 4) + '" width="' + Math.max(1, leafPxW - 8) + '" height="' + Math.max(1, fh - frameT2 * 2 - 8) + '" fill="rgba(26,107,74,0.1)" stroke="' + accent + '" stroke-width="1.2"/>';
            }
            if (geo.transomH > 0) {
                var th = geo.transomH * scale;
                inner += '<rect x="' + (ox + frameT2) + '" y="' + (oy + frameT2) + '" width="' + Math.max(1, fw - frameT2 * 2) + '" height="' + th + '" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" stroke-width="1"/>';
            }
            inner += dimH(ox, ox + fw, oy + fh + 18, Wmm + ' مم');
            inner += dimV(oy, oy + fh, ox - 14, Hmm + ' مم');
            inner += '<text x="' + (viewW / 2) + '" y="18" text-anchor="middle" font-size="12" font-weight="800" fill="' + navy + '">' + wEsc(shape.nameAr) + ' — ارتفاع</text>';
            inner += '<text x="' + (viewW / 2) + '" y="32" text-anchor="middle" font-size="10" fill="' + accent + '">لوح: ' + (geo.leafW || '—') + '×' + (geo.leafH || '—') + ' مم</text>';
        }
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + viewW + ' ' + viewH + '" class="wpc-elev-svg" role="img" aria-label="رسم هندسي">' + inner + '</svg>';
    }

    var wpc3dState = { rotX: -12, rotY: 28 };

    function wpcDraw3dPreviewHtml(item, opts) {
        opts = opts || {};
        var shape = resolveItemShape(item);
        var W = Math.max(100, wNum(item.widthMm) || 900);
        var H = Math.max(100, wNum(item.heightMm) || 2100);
        var D = shape.family === 'cabinet' ? Math.max(100, wNum(item.depthMm) || 600) : Math.max(80, wNum(DEFAULT_DEDUCTIONS.jambDepthMm) || 120);
        var maxDim = Math.max(W, H, D);
        var sc = Math.min(180 / maxDim, 0.22);
        var pw = Math.round(W * sc);
        var ph = Math.round(H * sc);
        var pd = Math.round(D * sc);
        var uid = opts.uid || 'wpc3d-' + Date.now();
        var isCab = shape.family === 'cabinet';
        var label = shape.nameAr + (isCab ? ' · ' + D + 'مم عمق' : '');
        return '<div class="wpc-3d-wrap" id="' + uid + '-wrap">' +
            '<div class="wpc-3d-toolbar">' +
            '<button type="button" class="nebras-users-btn wpc-3d-btn" onclick="wpcRotate3d(-1,0,\'' + uid + '\')"><i class="fas fa-rotate-left"></i></button>' +
            '<button type="button" class="nebras-users-btn wpc-3d-btn" onclick="wpcRotate3d(1,0,\'' + uid + '\')"><i class="fas fa-rotate-right"></i></button>' +
            '<button type="button" class="nebras-users-btn wpc-3d-btn" onclick="wpcRotate3d(0,-1,\'' + uid + '\')"><i class="fas fa-arrow-up"></i></button>' +
            '<button type="button" class="nebras-users-btn wpc-3d-btn" onclick="wpcRotate3d(0,1,\'' + uid + '\')"><i class="fas fa-arrow-down"></i></button>' +
            '</div>' +
            '<div class="wpc-3d-stage" id="' + uid + '-stage">' +
            '<div class="wpc-3d-scene" id="' + uid + '" style="transform:rotateX(' + wpc3dState.rotX + 'deg) rotateY(' + wpc3dState.rotY + 'deg)">' +
            '<div class="wpc-3d-face wpc-3d-front" style="width:' + pw + 'px;height:' + ph + 'px;transform:translateZ(' + (pd / 2) + 'px)"><span>' + wEsc(label) + '</span></div>' +
            '<div class="wpc-3d-face wpc-3d-back" style="width:' + pw + 'px;height:' + ph + 'px;transform:rotateY(180deg) translateZ(' + (pd / 2) + 'px)"></div>' +
            '<div class="wpc-3d-face wpc-3d-left" style="width:' + pd + 'px;height:' + ph + 'px;transform:rotateY(-90deg) translateZ(' + (pw / 2) + 'px)"></div>' +
            '<div class="wpc-3d-face wpc-3d-right" style="width:' + pd + 'px;height:' + ph + 'px;transform:rotateY(90deg) translateZ(' + (pw / 2) + 'px)"></div>' +
            '<div class="wpc-3d-face wpc-3d-top" style="width:' + pw + 'px;height:' + pd + 'px;transform:rotateX(90deg) translateZ(' + (ph / 2) + 'px)"></div>' +
            '<div class="wpc-3d-face wpc-3d-bottom" style="width:' + pw + 'px;height:' + pd + 'px;transform:rotateX(-90deg) translateZ(' + (ph / 2) + 'px)"></div>' +
            '</div></div>' +
            '<p class="wpc-3d-dims">' + W + ' × ' + H + ' × ' + D + ' مم</p></div>';
    }

    function wpcRotate3d(dYaw, dPitch, uid) {
        wpc3dState.rotY += dYaw * 18;
        wpc3dState.rotX += dPitch * 12;
        wpc3dState.rotX = Math.max(-60, Math.min(30, wpc3dState.rotX));
        var el = document.getElementById(uid);
        if (el) el.style.transform = 'rotateX(' + wpc3dState.rotX + 'deg) rotateY(' + wpc3dState.rotY + 'deg)';
    }

    function wpcGetPreviewItem() {
        if (wpcEstimateDraft && wpcEstimateDraft.items && wpcEstimateDraft.items.length) return wpcEstimateDraft.items[0];
        var est = wpcEstimates[wpcEstimates.length - 1];
        return est && est.items && est.items[0] ? est.items[0] : {
            shape: 'single_hinged', widthMm: 900, heightMm: 2100, depthMm: 600, qty: 1, measureMode: 'frame_outer',
            modelId: wpcModels[0] ? wpcModels[0].id : ''
        };
    }

    function renderWpcDrawings() {
        var item = wpcGetPreviewItem();
        var shape = resolveItemShape(item);
        var svg = wpcDrawElevationSvg(item);
        var html3d = wpcDraw3dPreviewHtml(item, { uid: 'wpc3d-main' });
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-drafting-compass"></i> رسومات هندسية ومعاينة 3D</h4>' +
            '<p class="wpc-cut-note">أبواب · خزائن · أدراج — مقاسات من محرك التخصيم مباشرة (Stolcad/PowerPVC).</p></div>' +
            '<div class="wpc-draw-grid">' +
            '<section class="wpc-draw-panel"><h5><i class="fas fa-ruler-combined"></i> منظر أمامي (SVG)</h5>' + svg + '</section>' +
            '<section class="wpc-draw-panel"><h5><i class="fas fa-cube"></i> معاينة ثلاثية الأبعاد</h5>' + html3d + '</section></div>' +
            '<div class="wpc-cut-form-card"><h5>ملخص الهندسة</h5>' +
            '<div class="wpc-geo-summary">' +
            '<span>النوع: <strong>' + wEsc(shape.nameAr) + '</strong></span> ' +
            (shape.family === 'cabinet' ? '<span>عمق: <strong>' + wNum(item.depthMm || DEFAULT_DEDUCTIONS.defaultCabinetDepthMm) + '</strong> مم</span> ' : '') +
            '<span>خارجي: <strong>' + wNum(item.widthMm) + '×' + wNum(item.heightMm) + '</strong></span></div>' +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'estimate\')"><i class="fas fa-edit"></i> تعديل المقاسات</button></div>';
    }

    /* —— UI —— */
    var WPC_NAV_GROUPS = [
        { label: 'القيادة', items: [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة WPC' },
            { id: 'estimates', icon: 'fas fa-folder-open', label: 'المقايسات' },
            { id: 'estimate', icon: 'fas fa-ruler-combined', label: 'بند / مقايسة' }
        ]},
        { label: 'الهندسة', items: [
            { id: 'models', icon: 'fas fa-door-closed', label: 'موديلات WPC' },
            { id: 'drawings', icon: 'fas fa-drafting-compass', label: 'رسومات / 3D' },
            { id: 'deductions', icon: 'fas fa-sliders', label: 'التخصيمات' },
            { id: 'audit', icon: 'fas fa-microscope', label: 'تدقيق المعادلات' },
            { id: 'accessories', icon: 'fas fa-puzzle-piece', label: 'إكسسوارات' }
        ]},
        { label: 'الإنتاج', items: [
            { id: 'cutting', icon: 'fas fa-scissors', label: 'تخطيط الألواح' },
            { id: 'production', icon: 'fas fa-clipboard-check', label: 'مسار المصنع' }
        ]},
        { label: 'التقارير', items: [
            { id: 'reports', icon: 'fas fa-file-lines', label: 'تقارير وطباعة' },
            { id: 'settings', icon: 'fas fa-gears', label: 'إعدادات' }
        ]}
    ];

    var WPC_STATUS = {
        draft: 'مسودة', approved: 'معتمدة', cutting: 'قيد القص',
        in_production: 'تجميع', ready_install: 'جاهز', installed: 'تم التركيب'
    };

    function showWpcCuttingShell() {
        var el = document.getElementById('wpc-cutting');
        if (!el) { alert('تعذر فتح تخصيمات WPC — أعيدي تحميل الصفحة.'); return false; }
        document.querySelectorAll('.admin-section.show').forEach(function (node) {
            if (node.id !== 'wpc-cutting') { node.classList.remove('show'); node.setAttribute('aria-hidden', 'true'); }
        });
        var dash = document.getElementById('admin-dashboard');
        if (dash) { dash.classList.remove('show'); dash.setAttribute('aria-hidden', 'true'); }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('wpc-platform-open');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        return true;
    }

    function closeWpcCuttingWorkspace() {
        var el = document.getElementById('wpc-cutting');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('wpc-platform-open');
        wpcNavStack = [];
        var admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        var dash = document.getElementById('admin-dashboard');
        if (dash && admin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
            if (typeof renderDashboardTiles === 'function') try { renderDashboardTiles(); } catch (e) { /* ignore */ }
        }
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('عدتِ للداشبورد', 'ok');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function goBackWpcCutting() {
        if (wpcNavStack.length) { wpcActiveTab = wpcNavStack.pop() || 'dashboard'; renderWpcCuttingPanel(); return; }
        if (wpcActiveTab !== 'dashboard') { wpcActiveTab = 'dashboard'; renderWpcCuttingPanel(); return; }
        closeWpcCuttingWorkspace();
    }

    function paintWpcWorkspaceChrome() {
        var pill = document.getElementById('wpc-ws-user-pill');
        var admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        if (pill) pill.textContent = admin ? ((admin.displayName || admin.username || 'مدير WPC') + ' · تخصيمات') : 'تخصيمات WPC';
        var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
        set('wpc-kpi-models', String(wpcModels.length));
        set('wpc-kpi-estimates', String(wpcEstimates.length));
        set('wpc-kpi-jobs', String(wpcCutJobs.length));
        var lastJob = wpcCutJobs[wpcCutJobs.length - 1];
        set('wpc-kpi-waste', lastJob ? (lastJob.wastePct + '%') : '—');
    }

    function renderWpcWorkspaceNav() {
        var nav = document.getElementById('wpc-ws-nav');
        if (!nav) return;
        nav.innerHTML = WPC_NAV_GROUPS.map(function (group) {
            return '<div class="hr-ws-nav-group"><span class="hr-ws-nav-group-label">' + wEsc(group.label) + '</span>' +
                group.items.map(function (t) {
                    return '<button type="button" class="hr-ws-nav-item' + (wpcActiveTab === t.id ? ' is-active' : '') +
                        '" onclick="setWpcCutTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + wEsc(t.label) + '</button>';
                }).join('') + '</div>';
        }).join('');
    }

    function openWpcCutting(tab) {
        if (!requireWpcAccess()) return;
        if (!wpcDataReady) hydrateWpcCuttingLocal();
        wpcNavStack = [];
        if (tab) wpcActiveTab = tab;
        else if (!wpcActiveTab) wpcActiveTab = 'dashboard';
        if (!showWpcCuttingShell()) return;
        renderWpcCuttingPanel();
        if (typeof odooReadThroughPanel === 'function') {
            try { odooReadThroughPanel('erp-wpc-cutting'); } catch (e) { /* ignore */ }
        }
    }

    function setWpcCutTab(tab, opts) {
        opts = opts || {};
        var next = tab || 'dashboard';
        if (!opts.replace && wpcActiveTab && wpcActiveTab !== next) {
            wpcNavStack.push(wpcActiveTab);
            if (wpcNavStack.length > 20) wpcNavStack.shift();
        }
        wpcActiveTab = next;
        renderWpcCuttingPanel();
    }

    function renderWpcCuttingPanel() {
        var host = document.getElementById('wpc-cutting-body');
        if (!host) return;
        seedWpcDefaults();
        renderWpcWorkspaceNav();
        paintWpcWorkspaceChrome();
        var body = '';
        if (wpcActiveTab === 'dashboard') body = renderWpcDashboard();
        else if (wpcActiveTab === 'estimates') body = renderWpcEstimatesList();
        else if (wpcActiveTab === 'estimate') body = renderWpcEstimateEditor();
        else if (wpcActiveTab === 'models') body = renderWpcModels();
        else if (wpcActiveTab === 'drawings') body = renderWpcDrawings();
        else if (wpcActiveTab === 'deductions') body = renderWpcDeductions();
        else if (wpcActiveTab === 'audit') body = renderWpcAudit();
        else if (wpcActiveTab === 'accessories') body = renderWpcAccessoriesPanel();
        else if (wpcActiveTab === 'cutting') body = renderWpcCutting();
        else if (wpcActiveTab === 'production') body = renderWpcProductionBoard();
        else if (wpcActiveTab === 'reports') body = renderWpcReports();
        else if (wpcActiveTab === 'settings') body = renderWpcSettings();
        host.innerHTML = '<div class="wpc-cut-panel wpc-ws-panel">' + body + '</div>';
    }

    function newWpcEstimate() {
        wpcEstimateDraft = {
            id: wId('wpc-est'),
            ref: 'WPC-' + new Date().getFullYear() + '-' + String(wpcEstimates.length + 1).padStart(4, '0'),
            customerName: '', projectName: '', status: 'draft',
            items: [], notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
    }

    function loadWpcEstimate(id) {
        var e = wpcEstimates.find(function (x) { return x.id === id; });
        if (!e) return;
        wpcEstimateDraft = JSON.parse(JSON.stringify(e));
        setWpcCutTab('estimate');
    }

    function saveWpcEstimateDraft() {
        if (!wpcEstimateDraft) return;
        var gate = validateWpcEstimateForWorkshop(wpcEstimateDraft);
        if (!gate.ok && wpcSettings.blockWorkshopOnWarning !== false) {
            alert('⛔ لا يمكن الحفظ — أخطاء تمنع الورشة:\n\n' + gate.blocking.join('\n'));
            return;
        }
        if (gate.warnings.length && !confirm('تحذيرات:\n' + gate.warnings.join('\n') + '\n\nمتابعة الحفظ؟')) return;
        wpcEstimateDraft.updatedAt = new Date().toISOString();
        wpcEstimateDraft.totalsSnapshot = computeWpcEstimateTotals(wpcEstimateDraft);
        var idx = wpcEstimates.findIndex(function (e) { return e.id === wpcEstimateDraft.id; });
        if (idx >= 0) wpcEstimates[idx] = JSON.parse(JSON.stringify(wpcEstimateDraft));
        else wpcEstimates.push(JSON.parse(JSON.stringify(wpcEstimateDraft)));
        persistWpcCuttingCloud(['wpc_estimates']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('✓ تم الحفظ على السيرفر — المقاسات معتمدة', 'ok');
    }

    function runWpcCutJobFromDraft() {
        if (!wpcEstimateDraft) return;
        var gate = validateWpcEstimateForWorkshop(wpcEstimateDraft);
        if (!gate.ok) {
            alert('⛔ لا يمكن إرسال للورشة:\n\n' + gate.blocking.join('\n'));
            return;
        }
        var totals = computeWpcEstimateTotals(wpcEstimateDraft);
        var plan = runWpcSheetPlan(totals.panels);
        if (plan.overflowCount > 0) {
            alert('⛔ ' + plan.overflowCount + ' قطعة أكبر من اللوح ' + plan.sheetW + '×' + plan.sheetH + ' — راجعي المقاسات أو اللوح');
            return;
        }
        var job = {
            id: wId('wpc-job'), estimateId: wpcEstimateDraft.id,
            at: new Date().toISOString(), sheetCount: plan.sheetCount,
            wastePct: plan.wastePct, plan: plan, validated: true
        };
        wpcCutJobs.push(job);
        persistWpcCuttingCloud(['wpc_cut_jobs']);
        setWpcCutTab('cutting');
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('✓ تخطيط ' + plan.sheetCount + ' لوح · هدر ' + plan.wastePct + '%', 'ok');
    }

    function renderWpcDashboard() {
        var openEst = wpcEstimates.filter(function (e) { return e.status !== 'installed'; }).length;
        return '<div class="wpc-command-dash">' +
            '<section class="wpc-command-hero">' +
            '<p class="wpc-cut-kicker"><i class="fas fa-door-closed"></i> تخصيمات WPC — أبواب وخزائن · مصنع نبراس</p>' +
            '<h2>محرك تخصيم WPC — دقة ورشة V3</h2>' +
            '<p>أبواب · خزائن · مطبخ · رسومات SVG · معاينة 3D · Stolcad/PowerPVC · تدقيق · تخطيط ألواح</p>' +
            '<div class="wpc-cut-hero-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newWpcEstimate();setWpcCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'drawings\')"><i class="fas fa-drafting-compass"></i> رسومات / 3D</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'models\')"><i class="fas fa-door-closed"></i> موديلات WPC</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'cutting\')"><i class="fas fa-scissors"></i> تخطيط الألواح</button>' +
            '</div></section>' +
            '<div class="wpc-dash-metrics">' +
            '<article class="wpc-metric"><i class="fas fa-door-closed"></i><div><strong>' + wpcModels.length + '</strong><span>موديلات</span></div></article>' +
            '<article class="wpc-metric"><i class="fas fa-folder-open"></i><div><strong>' + wpcEstimates.length + '</strong><span>مقايسات</span></div></article>' +
            '<article class="wpc-metric"><i class="fas fa-scissors"></i><div><strong>' + wpcCutJobs.length + '</strong><span>مهام قص</span></div></article>' +
            '<article class="wpc-metric"><i class="fas fa-clock"></i><div><strong>' + openEst + '</strong><span>قيد التنفيذ</span></div></article>' +
            '</div></div>';
    }

    function renderWpcEstimatesList() {
        var rows = wpcEstimates.slice().reverse().map(function (e) {
            var t = e.totalsSnapshot || {};
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + wEsc(e.ref) + '</strong>' +
                '<span>' + wEsc(e.customerName || '—') + ' · ' + wEsc(WPC_STATUS[e.status] || e.status) + '</span>' +
                '<small>' + wEsc(e.projectName || '') + (t.total != null ? ' · ' + t.total + ' ' + wpcSettings.currencyLabel : '') + '</small></div>' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="loadWpcEstimate(\'' + wEsc(e.id) + '\')">فتح</button></article>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-folder-open"></i> مقايسات WPC</h4>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="newWpcEstimate();setWpcCutTab(\'estimate\')"><i class="fas fa-plus"></i> مقايسة جديدة</button></div>' +
            (rows || '<p class="erp-empty">لا مقايسات — ابدأ الأولى.</p>');
    }

    function renderWpcEstimateEditor() {
        if (!wpcEstimateDraft) newWpcEstimate();
        var est = wpcEstimateDraft;
        var shapeOpts = Object.keys(DOOR_SHAPES).map(function (k) {
            return '<option value="' + k + '"' + (est.items[0] && est.items[0].shape === k ? ' selected' : '') + '>' + wEsc(DOOR_SHAPES[k].nameAr) + '</option>';
        }).join('');
        var modelOpts = wpcModels.map(function (m) {
            var sel = est.items[0] && est.items[0].modelId === m.id ? ' selected' : '';
            return '<option value="' + wEsc(m.id) + '"' + sel + '>' + wEsc(m.nameAr) + '</option>';
        }).join('');
        var modeOpts = Object.keys(MEASURE_MODES).map(function (k) {
            var sel = (est.items[0] && est.items[0].measureMode === k) ? ' selected' : '';
            return '<option value="' + k + '"' + sel + '>' + wEsc(MEASURE_MODES[k].nameAr) + '</option>';
        }).join('');
        var item = est.items[0] || {
            shape: 'single_hinged', modelId: wpcModels[0] ? wpcModels[0].id : '',
            widthMm: 900, heightMm: 2100, depthMm: 600, qty: 1, measureMode: 'frame_outer', shelfCount: 2
        };
        if (!est.items.length) est.items.push(item);
        var shapeInfo = resolveItemShape(item);
        var isCabinet = shapeInfo.family === 'cabinet';
        var meta = wpcCutsWithMeta(item, 0);
        var totals = computeWpcEstimateTotals(est);
        var geo = meta.geometry || {};
        var formulaHtml = (meta.formulaSteps || []).map(function (s) {
            return '<li><strong>' + wEsc(s.k) + ':</strong> ' + wEsc(s.v) + '</li>';
        }).join('');
        var panelRows = (meta.panels || []).map(function (p) {
            return '<tr><td>' + wEsc(p.labelAr) + '</td><td>' + wEsc(p.partName) + '</td><td><strong>' + p.widthMm + '×' + p.heightMm + '</strong></td><td>' + p.qty + '</td><td>' + p.areaM2 + '</td><td class="wpc-formula-cell">' + wEsc(p.formulaNote || '') + '</td></tr>';
        }).join('');
        var linearRows = (meta.cuts || []).map(function (c) {
            return '<tr><td>' + wEsc(c.labelAr) + '</td><td>' + wEsc(c.partName) + '</td><td><strong>' + c.lengthMm + '</strong> مم</td><td>' + c.qty + '</td><td>—</td><td class="wpc-formula-cell">' + wEsc(c.formulaNote || '') + '</td></tr>';
        }).join('');
        var blockHtml = (meta.blocking || []).length
            ? '<div class="wpc-cut-alert wpc-cut-alert--block"><strong>⛔ يمنع الورشة:</strong><ul>' + meta.blocking.map(function (b) { return '<li>' + wEsc(b) + '</li>'; }).join('') + '</ul></div>' : '';
        var warnHtml = (meta.warnings || []).length
            ? '<div class="wpc-cut-alert wpc-cut-alert--warn"><strong>⚠ تحذير:</strong><ul>' + meta.warnings.map(function (w) { return '<li>' + wEsc(w) + '</li>'; }).join('') + '</ul></div>' : '';

        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-ruler-combined"></i> ' + wEsc(est.ref) + '</h4>' +
            '<div class="erp-form-grid">' +
            '<label>العميل<input id="wpc-est-customer" value="' + wEsc(est.customerName) + '" onchange="wpcEstFieldUpdate()"></label>' +
            '<label>المشروع<input id="wpc-est-project" value="' + wEsc(est.projectName) + '" onchange="wpcEstFieldUpdate()"></label>' +
            '</div></div>' +
            '<div class="wpc-cut-form-card"><h4>' + (isCabinet ? 'بند الخزانة — مقاسات دقيقة' : 'بند الباب — مقاسات دقيقة') + '</h4>' +
            '<p class="wpc-cut-note">' + wEsc((MEASURE_MODES[item.measureMode || 'frame_outer'] || {}).desc || '') + '</p>' +
            '<div class="erp-form-grid">' +
            '<label>نوع القياس<select id="wpc-item-measure-mode" onchange="wpcItemFieldUpdate()">' + modeOpts + '</select></label>' +
            '<label>النوع<select id="wpc-item-shape" onchange="wpcItemFieldUpdate()">' + shapeOpts + '</select></label>' +
            '<label>موديل WPC<select id="wpc-item-model" onchange="wpcItemFieldUpdate()">' + modelOpts + '</select></label>' +
            '<label>العرض (مم)<input type="number" step="0.1" id="wpc-item-width" value="' + wNum(item.widthMm) + '" onchange="wpcItemFieldUpdate()"></label>' +
            '<label>الارتفاع (مم)<input type="number" step="0.1" id="wpc-item-height" value="' + wNum(item.heightMm) + '" onchange="wpcItemFieldUpdate()"></label>' +
            (isCabinet ? '<label>العمق (مم)<input type="number" step="0.1" id="wpc-item-depth" value="' + wNum(item.depthMm || DEFAULT_DEDUCTIONS.defaultCabinetDepthMm) + '" onchange="wpcItemFieldUpdate()"></label>' : '') +
            (isCabinet && !shapeInfo.drawers ? '<label>عدد الرفوف<input type="number" id="wpc-item-shelves" value="' + wNum(item.shelfCount != null ? item.shelfCount : 2) + '" min="0" onchange="wpcItemFieldUpdate()"></label>' : '') +
            (isCabinet && shapeInfo.drawers ? '<label>عدد الأدراج<input type="number" id="wpc-item-drawers" value="' + wNum(item.drawerCount || 4) + '" min="2" onchange="wpcItemFieldUpdate()"></label>' : '') +
            '<label>الكمية<input type="number" id="wpc-item-qty" value="' + wNum(item.qty) + '" min="1" onchange="wpcItemFieldUpdate()"></label>' +
            (!isCabinet ? '<label><input type="checkbox" id="wpc-item-bath"' + (item.isBathroom ? ' checked' : '') + ' onchange="wpcItemFieldUpdate()"> حمام (فجوة 12مم)</label>' : '') +
            '</div>' +
            '<div class="wpc-geo-summary">' +
            '<span>خارجي: <strong>' + (geo.frameOuterW || '—') + '×' + (geo.frameOuterH || '—') + '</strong></span> ' +
            (isCabinet ? '<span>عمق: <strong>' + (geo.depthMm || '—') + '</strong></span> ' : '') +
            (!isCabinet ? '<span>صافي: <strong>' + (geo.innerClearW || '—') + '×' + (geo.innerClearH || '—') + '</strong></span> ' : '') +
            '<span>' + (shapeInfo.drawers ? 'درج' : (isCabinet ? 'باب' : 'لوح')) + ': <strong>' + (geo.leafW || '—') + '×' + (geo.leafH || '—') + '</strong></span>' +
            '</div></div>' +
            '<div class="wpc-draw-grid wpc-draw-grid--inline">' +
            '<section class="wpc-draw-panel"><h5><i class="fas fa-ruler-combined"></i> رسم هندسي</h5>' + wpcDrawElevationSvg(item, { viewW: 360, viewH: 300 }) + '</section>' +
            '<section class="wpc-draw-panel"><h5><i class="fas fa-cube"></i> معاينة 3D</h5>' + wpcDraw3dPreviewHtml(item, { uid: 'wpc3d-est' }) + '</section></div>' + blockHtml + warnHtml +
            '<div class="wpc-cut-form-card"><h4>سلسلة المعادلات</h4><ol class="wpc-formula-steps">' + (formulaHtml || '<li>—</li>') + '</ol></div>' +
            '<div class="wpc-cut-form-card"><h4>قائمة القص للورشة</h4>' +
            '<table class="wpc-cut-table"><thead><tr><th>البند</th><th>القطعة</th><th>المقاس</th><th>عدد</th><th>م²</th><th>المعادلة</th></tr></thead>' +
            '<tbody>' + (panelRows + linearRows || '<tr><td colspan="6">—</td></tr>') + '</tbody></table>' +
            '<p><strong>الإجمالي: ' + totals.total + ' ' + wpcSettings.currencyLabel + '</strong></p></div>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveWpcEstimateDraft()"><i class="fas fa-save"></i> حفظ (بعد التدقيق)</button>' +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'audit\')"><i class="fas fa-microscope"></i> تدقيق</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printWpcCutReport()"><i class="fas fa-print"></i> قائمة قص</button>' +
            '<button type="button" class="nebras-users-btn" onclick="runWpcCutJobFromDraft()"><i class="fas fa-scissors"></i> تخطيط ألواح</button></div>';
    }

    function wpcEstFieldUpdate() {
        if (!wpcEstimateDraft) return;
        wpcEstimateDraft.customerName = wField('wpc-est-customer');
        wpcEstimateDraft.projectName = wField('wpc-est-project');
    }
    function wpcItemFieldUpdate() {
        if (!wpcEstimateDraft) return;
        if (!wpcEstimateDraft.items.length) wpcEstimateDraft.items.push({});
        var it = wpcEstimateDraft.items[0];
        it.shape = wField('wpc-item-shape') || 'single_hinged';
        it.modelId = wField('wpc-item-model');
        it.measureMode = wField('wpc-item-measure-mode') || 'frame_outer';
        it.widthMm = wNum(wField('wpc-item-width')) || 900;
        it.heightMm = wNum(wField('wpc-item-height')) || 2100;
        it.depthMm = wNum(wField('wpc-item-depth')) || wNum(DEFAULT_DEDUCTIONS.defaultCabinetDepthMm);
        it.shelfCount = wNum(wField('wpc-item-shelves'));
        it.drawerCount = wNum(wField('wpc-item-drawers')) || 4;
        it.qty = Math.max(1, wNum(wField('wpc-item-qty')) || 1);
        var bathEl = document.getElementById('wpc-item-bath');
        it.isBathroom = bathEl ? bathEl.checked : false;
        renderWpcCuttingPanel();
    }

    function renderWpcModels() {
        var rows = wpcModels.map(function (m) {
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + wEsc(m.nameAr) + '</strong>' +
                '<span>' + wEsc(m.family) + ' · ' + (m.parts || []).length + ' قطع</span></div></article>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-door-closed"></i> موديلات WPC</h4>' +
            '<p class="wpc-cut-note">كتalog نبراس: فلات · يو 60 · ليب · سحاب — مع قطع وتخصيمات لكل موديل.</p>' + rows + '</div>';
    }

    function renderWpcDeductions() {
        var modelId = wpcModels[0] ? wpcModels[0].id : '';
        var modelOpts = wpcModels.map(function (m) {
            return '<option value="' + wEsc(m.id) + '">' + wEsc(m.nameAr) + '</option>';
        }).join('');
        var m = wpcModels[0];
        var d = dOf(m);
        var fields = Object.keys(DEFAULT_DEDUCTIONS).map(function (k) {
            var label = DEDUCTION_LABELS[k] || k;
            return '<label>' + wEsc(label) + ' (مم)<input type="number" step="0.1" id="wpc-ded-' + k + '" value="' + wNum(d[k]) + '"></label>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-sliders"></i> التخصيمات — قابلة للتعديل</h4>' +
            '<p class="wpc-cut-note">مرجع صناعي: Stolcad · PowerPVC · KOJO WPC — كل مم يؤثر على اللوح والحلق.</p>' +
            '<label>الموديل<select id="wpc-ded-model" onchange="renderWpcCuttingPanel()">' + modelOpts + '</select></label>' +
            '<div class="erp-form-grid erp-form-grid--compact">' + fields + '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveWpcModelDeductions()"><i class="fas fa-save"></i> حفظ التخصيمات</button></div>';
    }

    function saveWpcModelDeductions() {
        var modelId = wField('wpc-ded-model') || (wpcModels[0] && wpcModels[0].id);
        var m = findModel(modelId);
        if (!m) return;
        normalizeModelDeductions(m);
        Object.keys(DEFAULT_DEDUCTIONS).forEach(function (k) {
            var el = document.getElementById('wpc-ded-' + k);
            if (el) m.deductions[k] = wNum(el.value);
        });
        persistWpcCuttingCloud(['wpc_models']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('✓ تخصيمات ' + m.nameAr + ' محفوظة', 'ok');
    }

    function renderWpcAudit() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return '<p class="erp-empty">افتحي مقايسة للتدقيق.</p>';
        var gate = validateWpcEstimateForWorkshop(est);
        var rows = (est.items || []).map(function (it, i) {
            var meta = wpcCutsWithMeta(it, i);
            var geo = meta.geometry || {};
            var steps = (meta.formulaSteps || []).map(function (s) {
                return '<li>' + wEsc(s.k) + ': ' + wEsc(s.v) + '</li>';
            }).join('');
            return '<article class="wpc-audit-card">' +
                '<h5>بند ' + (i + 1) + ' — ' + wEsc(it.labelAr || (DOOR_SHAPES[it.shape] || {}).nameAr || 'باب') + '</h5>' +
                '<p>مدخل: ' + wNum(it.widthMm) + '×' + wNum(it.heightMm) + ' · لوح: <strong>' + geo.leafW + '×' + geo.leafH + '</strong></p>' +
                '<ol class="wpc-formula-steps">' + steps + '</ol></article>';
        }).join('');
        var status = gate.ok
            ? '<p class="wpc-cut-alert wpc-cut-alert--ok">✓ جاهز للورشة — لا أخطاء حاجبة</p>'
            : '<div class="wpc-cut-alert wpc-cut-alert--block"><strong>⛔ أخطاء:</strong><ul>' +
              gate.blocking.map(function (b) { return '<li>' + wEsc(b) + '</li>'; }).join('') + '</ul></div>';
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-microscope"></i> تدقيق المعادلات</h4>' +
            status + rows +
            '<button type="button" class="nebras-users-btn" onclick="setWpcCutTab(\'estimate\')"><i class="fas fa-edit"></i> تعديل المقايسة</button></div>';
    }

    function renderWpcAccessoriesPanel() {
        var rows = wpcAccessories.map(function (a) {
            return '<tr><td>' + wEsc(a.nameAr) + '</td><td>' + wEsc(a.code) + '</td><td>' + wNum(a.pricePerUnit || a.pricePerM || a.pricePerM2) + '</td></tr>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4>إكسسوارات WPC</h4><table class="wpc-cut-table"><thead><tr><th>الاسم</th><th>الكود</th><th>السعر</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    function renderWpcCutting() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return '<p class="erp-empty">افتحي مقايسة أولاً.</p>';
        var totals = computeWpcEstimateTotals(est);
        var plan = runWpcSheetPlan(totals.panels);
        var sheetHtml = plan.sheets.map(function (s, i) {
            var pieces = s.placed.map(function (p) {
                return '<li>' + wEsc(p.label) + ' — ' + p.w + '×' + p.h + ' @ (' + p.x + ',' + p.y + ')' + (p.rot ? ' ↻' : '') + '</li>';
            }).join('');
            return '<div class="wpc-sheet-card"><h5>لوح ' + (i + 1) + ' (' + plan.sheetW + '×' + plan.sheetH + ')</h5><ul>' + pieces + '</ul></div>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-scissors"></i> تخطيط الألواح</h4>' +
            '<p>ألواح: <strong>' + plan.sheetCount + '</strong> · هدر: <strong>' + plan.wastePct + '%</strong> · كيرف: ' + plan.kerfMm + 'مم · شبكة 1مم</p>' +
            (plan.overflowCount ? '<p class="wpc-cut-alert wpc-cut-alert--block">⛔ ' + plan.overflowCount + ' قطعة لا تناسب اللوح!</p>' : '') +
            sheetHtml +
            '<button type="button" class="nebras-users-btn" onclick="printWpcSheetPlan()"><i class="fas fa-print"></i> طباعة خطة الألواح</button></div>';
    }

    function renderWpcProductionBoard() {
        var cols = ['draft', 'approved', 'cutting', 'in_production', 'ready_install', 'installed'];
        var board = cols.map(function (st) {
            var cards = wpcEstimates.filter(function (e) { return (e.status || 'draft') === st; }).map(function (e) {
                return '<article class="wpc-pipe-card"><strong>' + wEsc(e.ref) + '</strong><span>' + wEsc(e.customerName || '') + '</span>' +
                    '<button type="button" class="erp-tag" onclick="loadWpcEstimate(\'' + wEsc(e.id) + '\')">فتح</button></article>';
            }).join('') || '<p class="erp-empty">فارغ</p>';
            return '<section class="wpc-pipe-col"><header>' + wEsc(WPC_STATUS[st]) + '</header>' + cards + '</section>';
        }).join('');
        return '<div class="wpc-cut-form-card"><h4>مسار المصنع WPC</h4><div class="wpc-pipe-board">' + board + '</div></div>';
    }

    function renderWpcReports() {
        return '<div class="wpc-cut-form-card"><h4><i class="fas fa-file-lines"></i> تقارير</h4>' +
            '<div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn" onclick="printWpcCutReport()"><i class="fas fa-print"></i> قائمة قص</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printWpcQuoteReport()"><i class="fas fa-file-invoice"></i> عرض سعر</button>' +
            '<button type="button" class="nebras-users-btn" onclick="printWpcSheetPlan()"><i class="fas fa-table"></i> خطة ألواح</button>' +
            '<button type="button" class="nebras-users-btn" onclick="exportWpcCutCsv()"><i class="fas fa-download"></i> CSV</button>' +
            '</div></div>';
    }

    function renderWpcSettings() {
        return '<div class="wpc-cut-form-card"><h4>إعدادات المحرك</h4>' +
            '<div class="erp-form-grid">' +
            '<label>عرض اللوح (مم)<input type="number" id="wpc-set-sheet-w" value="' + wNum(wpcSettings.sheetWidthMm) + '"></label>' +
            '<label>طول اللوح (مم)<input type="number" id="wpc-set-sheet-h" value="' + wNum(wpcSettings.sheetHeightMm) + '"></label>' +
            '<label>كيرف القص (مm)<input type="number" id="wpc-set-kerf" value="' + wNum(wpcSettings.kerfMm) + '"></label>' +
            '<label>أجر باب<input type="number" id="wpc-set-labor" value="' + wNum(wpcSettings.laborPerDoor) + '"></label>' +
            '</div>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveWpcSettings()"><i class="fas fa-save"></i> حفظ</button></div>';
    }

    function saveWpcSettings() {
        wpcSettings.sheetWidthMm = wNum(wField('wpc-set-sheet-w')) || 1220;
        wpcSettings.sheetHeightMm = wNum(wField('wpc-set-sheet-h')) || 2440;
        wpcSettings.kerfMm = wNum(wField('wpc-set-kerf')) || 3;
        wpcSettings.laborPerDoor = wNum(wField('wpc-set-labor')) || 120;
        persistWpcCuttingCloud(['wpc_cut_settings']);
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('✓ تم الحفظ', 'ok');
    }

    function wpcPrintHtml(title, body) {
        var w = window.open('', '_blank', 'width=900,height=700');
        if (!w) { alert('فعّلي النوافذ المنبثقة للطباعة'); return; }
        w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>' + wEsc(title) + '</title>' +
            '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#0d2840}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ccc;padding:8px;text-align:right}h1{font-size:1.3rem}</style></head><body>' +
            '<h1>' + wEsc(title) + '</h1><p>مصنع نبراس — تخصيمات WPC · ' + new Date().toLocaleString('ar-SA') + '</p>' + body + '</body></html>');
        w.document.close();
        w.focus();
        setTimeout(function () { w.print(); }, 400);
    }

    function printWpcCutReport() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return alert('لا مقايسة');
        var totals = computeWpcEstimateTotals(est);
        var rows = totals.panels.map(function (p) {
            return '<tr><td>' + wEsc(p.labelAr) + '</td><td>' + wEsc(p.partName) + '</td><td>' + p.widthMm + '×' + p.heightMm + '</td><td>' + p.qty + '</td></tr>';
        }).join('');
        totals.cuts.forEach(function (c) {
            rows += '<tr><td>' + wEsc(c.labelAr) + '</td><td>' + wEsc(c.partName) + '</td><td>' + c.lengthMm + ' مم</td><td>' + c.qty + '</td></tr>';
        });
        wpcPrintHtml('قائمة قص WPC — ' + est.ref, '<table><thead><tr><th>البند</th><th>القطعة</th><th>المقاس</th><th>عدد</th></tr></thead><tbody>' + rows + '</tbody></table>');
    }

    function printWpcQuoteReport() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return;
        var t = computeWpcEstimateTotals(est);
        wpcPrintHtml('عرض سعر WPC — ' + est.ref,
            '<p>العميل: ' + wEsc(est.customerName) + '</p><p>المشروع: ' + wEsc(est.projectName) + '</p>' +
            '<p>عدد الأبواب: ' + t.doorCount + '</p><p>المجموع: ' + t.total + ' ' + wpcSettings.currencyLabel + '</p>' +
            '<p><small>' + wEsc(wpcSettings.quoteTerms) + '</small></p>');
    }

    function printWpcSheetPlan() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return;
        var plan = runWpcSheetPlan(computeWpcEstimateTotals(est).panels);
        var html = plan.sheets.map(function (s, i) {
            return '<h3>لوح ' + (i + 1) + '</h3><ul>' + s.placed.map(function (p) {
                return '<li>' + wEsc(p.label) + ' — ' + p.w + '×' + p.h + '</li>';
            }).join('') + '</ul>';
        }).join('');
        wpcPrintHtml('خطة ألواح WPC', '<p>عدد الألواح: ' + plan.sheetCount + ' · هدر: ' + plan.wastePct + '%</p>' + html);
    }

    function exportWpcCutCsv() {
        var est = wpcEstimateDraft || wpcEstimates[wpcEstimates.length - 1];
        if (!est) return;
        var t = computeWpcEstimateTotals(est);
        var lines = ['البند,القطعة,عرض,ارتفاع,طول,عدد'];
        t.panels.forEach(function (p) { lines.push([p.labelAr, p.partName, p.widthMm, p.heightMm, '', p.qty].join(',')); });
        t.cuts.forEach(function (c) { lines.push([c.labelAr, c.partName, '', '', c.lengthMm, c.qty].join(',')); });
        var blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (est.ref || 'wpc-cut') + '.csv';
        a.click();
    }

    hydrateWpcCuttingLocal();

    global.openWpcCutting = openWpcCutting;
    global.closeWpcCuttingWorkspace = closeWpcCuttingWorkspace;
    global.goBackWpcCutting = goBackWpcCutting;
    global.setWpcCutTab = setWpcCutTab;
    global.newWpcEstimate = newWpcEstimate;
    global.loadWpcEstimate = loadWpcEstimate;
    global.saveWpcEstimateDraft = saveWpcEstimateDraft;
    global.wpcEstFieldUpdate = wpcEstFieldUpdate;
    global.wpcItemFieldUpdate = wpcItemFieldUpdate;
    global.runWpcCutJobFromDraft = runWpcCutJobFromDraft;
    global.saveWpcSettings = saveWpcSettings;
    global.printWpcCutReport = printWpcCutReport;
    global.printWpcQuoteReport = printWpcQuoteReport;
    global.printWpcSheetPlan = printWpcSheetPlan;
    global.exportWpcCutCsv = exportWpcCutCsv;
    global.wpcRotate3d = wpcRotate3d;
    global.wpcDrawElevationSvg = wpcDrawElevationSvg;
    global.wpcDraw3dPreviewHtml = wpcDraw3dPreviewHtml;
    global.buildWpcDoorCuts = buildWpcDoorCuts;
    global.buildWpcFormulaSteps = buildWpcFormulaSteps;
    global.validateWpcEstimateForWorkshop = validateWpcEstimateForWorkshop;
    global.wpcCutsWithMeta = wpcCutsWithMeta;
    global.computeWpcGeometry = computeWpcGeometry;
    global.saveWpcModelDeductions = saveWpcModelDeductions;
    global.runWpcSheetPlan = runWpcSheetPlan;
    global.getWpcModels = getWpcModels;
    global.getWpcEstimates = getWpcEstimates;
    global.getWpcCutJobs = getWpcCutJobs;
    global.getWpcCutSettings = getWpcCutSettings;
    global.getWpcAccessories = getWpcAccessories;
    global.getWpcRemnants = getWpcRemnants;
    global.setWpcModelsFromCloud = setWpcModelsFromCloud;
    global.setWpcEstimatesFromCloud = setWpcEstimatesFromCloud;
    global.setWpcCutJobsFromCloud = setWpcCutJobsFromCloud;
    global.setWpcCutSettingsFromCloud = setWpcCutSettingsFromCloud;
    global.setWpcAccessoriesFromCloud = setWpcAccessoriesFromCloud;
    global.setWpcRemnantsFromCloud = setWpcRemnantsFromCloud;
    global.setWpcCutAuditFromCloud = setWpcCutAuditFromCloud;
})(typeof window !== 'undefined' ? window : globalThis);
