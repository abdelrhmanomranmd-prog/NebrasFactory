/**
 * نبراس — منصة الشؤون القانونية
 * نبراس + الشركات الشريكة — عقود · قضايا · امتثال · سياسات · PDPL · شراكات
 */
(function(global) {
    'use strict';

    const LEGAL_CONTRACTS_KEY = 'nebrasLegalContracts';
    const LEGAL_CASES_KEY = 'nebrasLegalCases';
    const LEGAL_COMPLIANCE_KEY = 'nebrasLegalCompliance';
    const LEGAL_POLICIES_KEY = 'nebrasLegalPolicies';
    const LEGAL_CORR_KEY = 'nebrasLegalCorrespondence';
    const LEGAL_ACTIVITY_KEY = 'nebrasLegalActivity';
    const LEGAL_RENTALS_KEY = 'nebrasLegalRentals';
    const LEGAL_NOTIF_SETTINGS_KEY = 'nebrasLegalNotifSettings';
    const LEGAL_ATTACH_MAX = 450000;

    let legalContracts = [];
    let legalCases = [];
    let legalCompliance = [];
    let legalPolicies = [];
    let legalCorrespondence = [];
    let legalActivity = [];
    let legalRentals = [];
    let legalNotifSettings = { remindDays: [30, 60], lastScan: '' };
    let pendingLegalAttachment = null;
    let legalActiveTab = 'dashboard';
    let legalCompanyFilter = '';
    let legalEditor = { kind: '', id: null };
    let legalDataReady = false;

    const LEGAL_CONTRACT_TYPES = {
        employment: 'عقد عمل',
        commercial: 'تجاري',
        partnership: 'شراكة / مساهمة',
        supply: 'توريد',
        lease: 'إيجار',
        nda: 'سرية (NDA)',
        agency: 'وكالة',
        service: 'خدمات',
        other: 'أخرى'
    };

    const LEGAL_CONTRACT_STATUS = {
        draft: { label: 'مسودة', tag: '' },
        active: { label: 'ساري', tag: 'erp-tag--ok' },
        expiring: { label: 'قريب الانتهاء', tag: 'erp-tag--accent' },
        expired: { label: 'منتهي', tag: 'erp-tag--danger' },
        terminated: { label: 'مُنهى', tag: 'erp-tag--danger' }
    };

    const LEGAL_CASE_TYPES = {
        labor: 'عمالي',
        commercial: 'تجاري',
        civil: 'مدني',
        criminal: 'جنائي',
        administrative: 'إداري',
        ip: 'ملكية فكرية',
        other: 'أخرى'
    };

    const LEGAL_CASE_STATUS = {
        open: { label: 'مفتوحة', tag: '' },
        investigation: { label: 'تحقيق', tag: 'erp-tag--accent' },
        mediation: { label: 'وساطة', tag: '' },
        court: { label: 'محكمة', tag: 'erp-tag--danger' },
        closed_won: { label: 'مغلقة — لصالحنا', tag: 'erp-tag--ok' },
        closed_lost: { label: 'مغلقة — ضدنا', tag: 'erp-tag--danger' },
        archived: { label: 'مؤرشفة', tag: '' }
    };

    const LEGAL_COMPLIANCE_TYPES = {
        commercial_registration: 'سجل تجاري',
        vat: 'ضريبة القيمة المضافة',
        gosi: 'التأمينات (GOSI)',
        municipal: 'بلدية / رخصة',
        industrial: 'صناعي / MODON',
        environmental: 'بيئي',
        zakat: 'زكاة وضريبة',
        chamber: 'غرفة تجارية',
        pdpl: 'حماية البيانات PDPL',
        labor: 'نظام العمل / مكتب عمل',
        other: 'أخرى'
    };

    const LEGAL_POLICY_TYPES = {
        privacy: 'خصوصية البيانات',
        labor: 'نظام العمل الداخلي',
        gps_tracking: 'تتبع GPS / أسطول',
        anti_harassment: 'مكافحة التحرش',
        safety: 'سلامة مهنية',
        whistleblower: 'الإبلاغ عن المخالفات',
        partnership: 'إدارة الشركات الشريكة',
        code_of_conduct: 'سلوكيات الموظفين',
        other: 'أخرى'
    };

    const LEGAL_LEASE_ROLES = {
        landlord: 'الشركة مؤجّرة (تؤجّر للغير)',
        tenant: 'الشركة مستأجرة (مكان للعمل)'
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function legalField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function isStrictLegalUser(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) return false;
        return admin.role === 'legal';
    }

    function canAccessLegal() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof canManage === 'function' && canManage('legal')) return true;
        return false;
    }

    function requireLegalAccess(msg) {
        if (!canAccessLegal()) {
            alert(msg || 'منصة الشؤون القانونية — للقسم القانوني أو الإدارة الرئيسية.');
            return false;
        }
        return true;
    }

    function getLegalActor() {
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        return {
            userId: admin && admin.id ? String(admin.id) : '',
            username: admin && admin.username ? String(admin.username) : 'system',
            role: admin && admin.role ? String(admin.role) : ''
        };
    }

    function legalAudit(action, detail) {
        const actor = getLegalActor();
        const entry = {
            id: 'la-' + Date.now(),
            action: action,
            detail: detail || '',
            username: actor.username,
            recordedAt: new Date().toISOString()
        };
        legalActivity.unshift(entry);
        if (legalActivity.length > 600) legalActivity.length = 600;
        try { localStorage.setItem(LEGAL_ACTIVITY_KEY, JSON.stringify(legalActivity)); } catch (e) { /* ignore */ }
        if (typeof addAuditLog === 'function') addAuditLog(action, '[' + actor.username + '] ' + (detail || ''));
    }

    function resolveLegalCompanyId(record) {
        if (!record) return typeof getDefaultHrCompanyId === 'function' ? getDefaultHrCompanyId() : 'comp-nebras';
        return String(record.companyId || (typeof getDefaultHrCompanyId === 'function' ? getDefaultHrCompanyId() : 'comp-nebras'));
    }

    function resolveLegalCompanyLabel(id) {
        return typeof resolveHrCompanyLabel === 'function' ? resolveHrCompanyLabel(id) : String(id || 'نبراس');
    }

    function getLegalAdminScope(admin) {
        admin = admin || (typeof getNebrasCurrentAdmin === 'function' ? getNebrasCurrentAdmin() : null);
        if (!admin) return { mode: 'none' };
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) return { mode: 'full' };
        if (admin.role === 'manager' && typeof canManage === 'function' && canManage('legal', admin)) return { mode: 'full' };
        if (admin.legalScopeCompanyId) return { mode: 'company', companyId: String(admin.legalScopeCompanyId) };
        if (isStrictLegalUser(admin)) {
            return { mode: 'restricted', companyId: '', label: 'نطاق Legal غير معيّن — تواصلي مع الإدارة' };
        }
        return { mode: 'full' };
    }

    function applyLegalCompanyFilter(list) {
        const scope = getLegalAdminScope();
        if (scope.mode === 'restricted') return [];
        if (scope.mode === 'company' && scope.companyId) {
            return list.filter(function(r) { return resolveLegalCompanyId(r) === scope.companyId; });
        }
        if (!legalCompanyFilter) return list;
        return list.filter(function(r) { return resolveLegalCompanyId(r) === String(legalCompanyFilter); });
    }

    function setLegalCompanyFilter(val) {
        legalCompanyFilter = val || '';
        renderLegalPlatformPanelSafe();
    }

    function loadLegalData(force) {
        if (legalDataReady && !force) return;
        try {
            legalContracts = JSON.parse(localStorage.getItem(LEGAL_CONTRACTS_KEY) || '[]');
            legalCases = JSON.parse(localStorage.getItem(LEGAL_CASES_KEY) || '[]');
            legalCompliance = JSON.parse(localStorage.getItem(LEGAL_COMPLIANCE_KEY) || '[]');
            legalPolicies = JSON.parse(localStorage.getItem(LEGAL_POLICIES_KEY) || '[]');
            legalCorrespondence = JSON.parse(localStorage.getItem(LEGAL_CORR_KEY) || '[]');
            legalActivity = JSON.parse(localStorage.getItem(LEGAL_ACTIVITY_KEY) || '[]');
            legalRentals = JSON.parse(localStorage.getItem(LEGAL_RENTALS_KEY) || '[]');
            legalNotifSettings = JSON.parse(localStorage.getItem(LEGAL_NOTIF_SETTINGS_KEY) || '{}');
        } catch (e) {
            legalContracts = []; legalCases = []; legalCompliance = [];
            legalPolicies = []; legalCorrespondence = []; legalActivity = [];
            legalRentals = []; legalNotifSettings = { remindDays: [30, 60], lastScan: '' };
        }
        if (!Array.isArray(legalContracts)) legalContracts = [];
        if (!Array.isArray(legalCases)) legalCases = [];
        if (!Array.isArray(legalCompliance)) legalCompliance = [];
        if (!Array.isArray(legalPolicies)) legalPolicies = [];
        if (!Array.isArray(legalCorrespondence)) legalCorrespondence = [];
        if (!Array.isArray(legalActivity)) legalActivity = [];
        if (!Array.isArray(legalRentals)) legalRentals = [];
        if (!legalNotifSettings || typeof legalNotifSettings !== 'object') {
            legalNotifSettings = { remindDays: [30, 60], lastScan: '' };
        }
        if (typeof loadHrCompaniesData === 'function') loadHrCompaniesData();
        legalDataReady = true;
    }

    function saveLegalData() {
        try {
            localStorage.setItem(LEGAL_CONTRACTS_KEY, JSON.stringify(legalContracts));
            localStorage.setItem(LEGAL_CASES_KEY, JSON.stringify(legalCases));
            localStorage.setItem(LEGAL_COMPLIANCE_KEY, JSON.stringify(legalCompliance));
            localStorage.setItem(LEGAL_POLICIES_KEY, JSON.stringify(legalPolicies));
            localStorage.setItem(LEGAL_CORR_KEY, JSON.stringify(legalCorrespondence));
            localStorage.setItem(LEGAL_ACTIVITY_KEY, JSON.stringify(legalActivity));
            localStorage.setItem(LEGAL_RENTALS_KEY, JSON.stringify(legalRentals));
            localStorage.setItem(LEGAL_NOTIF_SETTINGS_KEY, JSON.stringify(legalNotifSettings));
        } catch (e) { console.warn('Legal save', e); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function setLegalContractsFromCloud(v) { legalContracts = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalCasesFromCloud(v) { legalCases = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalComplianceFromCloud(v) { legalCompliance = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalPoliciesFromCloud(v) { legalPolicies = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalCorrespondenceFromCloud(v) { legalCorrespondence = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalActivityFromCloud(v) { legalActivity = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalRentalsFromCloud(v) { legalRentals = Array.isArray(v) ? v : []; saveLegalData(); }
    function setLegalNotifSettingsFromCloud(v) {
        legalNotifSettings = v && typeof v === 'object' ? v : { remindDays: [30, 60], lastScan: '' };
        try { localStorage.setItem(LEGAL_NOTIF_SETTINGS_KEY, JSON.stringify(legalNotifSettings)); } catch (e) { /* ignore */ }
    }
    function getLegalNotifSettings() { loadLegalData(); return legalNotifSettings; }

    function legalReadAttachment(input) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > LEGAL_ATTACH_MAX) {
            alert('الملف كبير — الحد الأقصى ~450 كيلوبايت. استخدمي PDF مضغوط أو صورة أصغر.');
            input.value = '';
            return;
        }
        const hint = document.getElementById('legal-attach-hint');
        if (hint) hint.textContent = 'جاري المعالجة…';
        const reader = new FileReader();
        reader.onload = function(ev) {
            pendingLegalAttachment = { name: file.name, dataUrl: ev.target.result, mime: file.type, cloudUrl: '' };
            if (hint) hint.textContent = '✓ محلي: ' + file.name;
            if (typeof uploadNebrasMediaFile === 'function') {
                if (hint) hint.textContent = 'جاري الرفع للسحابة…';
                uploadNebrasMediaFile(file).then(function(url) {
                    if (url && pendingLegalAttachment && pendingLegalAttachment.name === file.name) {
                        pendingLegalAttachment.cloudUrl = url;
                        if (hint) hint.textContent = '✓ سحابة: ' + file.name;
                    }
                }).catch(function() {
                    if (hint) hint.textContent = '✓ محلي (فشل السحابة): ' + file.name;
                });
            }
        };
        reader.readAsDataURL(file);
    }

    function applyLegalAttachmentFields(record) {
        if (!pendingLegalAttachment) return record;
        record.attachmentName = pendingLegalAttachment.name;
        record.attachmentDataUrl = pendingLegalAttachment.dataUrl;
        record.attachmentMime = pendingLegalAttachment.mime;
        record.attachmentCloudUrl = pendingLegalAttachment.cloudUrl || record.attachmentCloudUrl || '';
        pendingLegalAttachment = null;
        return record;
    }

    function viewLegalAttachment(recordId, kind) {
        let rec = null;
        if (kind === 'rental') rec = legalRentals.find(function(x) { return x.id === recordId; });
        else if (kind === 'case') rec = legalCases.find(function(x) { return x.id === recordId; });
        else if (kind === 'contract') rec = legalContracts.find(function(x) { return x.id === recordId; });
        else if (kind === 'compliance') rec = legalCompliance.find(function(x) { return x.id === recordId; });
        const src = rec && (rec.attachmentCloudUrl || rec.attachmentDataUrl);
        if (!rec || !src) { alert('لا مرفق لهذا السجل.'); return; }
        if (rec.attachmentCloudUrl && rec.attachmentCloudUrl.indexOf('http') === 0) {
            window.open(rec.attachmentCloudUrl, '_blank');
            return;
        }
        const w = window.open('', '_blank');
        if (!w) return;
        if (String(rec.attachmentMime || '').indexOf('pdf') >= 0 || String(src).indexOf('application/pdf') >= 0) {
            w.document.write('<iframe src="' + src + '" style="width:100%;height:100%;border:0"></iframe>');
        } else {
            w.document.write('<img src="' + src + '" style="max-width:100%;height:auto">');
        }
        w.document.close();
    }

    function legalAttachmentCell(rec, kind) {
        if (!rec || (!rec.attachmentName && !rec.attachmentDataUrl && !rec.attachmentCloudUrl)) return '—';
        return '<button type="button" class="erp-tag erp-tag--action" onclick="viewLegalAttachment(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fas fa-paperclip"></i> ' + esc(rec.attachmentName || 'مرفق') + '</button>';
    }

    function resolveRentalStatus(endDate) {
        if (!endDate) return 'active';
        if (isExpiredLegal(endDate)) return 'expired';
        if (isExpiringLegal(endDate, 60)) return 'expiring';
        return 'active';
    }

    function formatLegalDate(d) {
        if (!d) return '—';
        try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('ar-SA'); } catch (e) { return d; }
    }

    function daysUntil(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr + 'T12:00:00');
        return Math.round((d - new Date()) / 86400000);
    }

    function isExpiringLegal(dateStr, warnDays) {
        const days = daysUntil(dateStr);
        return days != null && days >= 0 && days <= (warnDays || 60);
    }

    function isExpiredLegal(dateStr) {
        const days = daysUntil(dateStr);
        return days != null && days < 0;
    }

    function companySelectLegal(selectedId) {
        const companies = typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies() : [];
        return companies.map(function(c) {
            return '<option value="' + esc(c.id) + '"' + (String(selectedId || c.id) === String(c.id) ? ' selected' : '') + '>' + esc(c.nameAr) + '</option>';
        }).join('');
    }

    function collectLegalAlerts() {
        const alerts = [];
        legalContracts.forEach(function(c) {
            if (!c.endDate) return;
            const days = daysUntil(c.endDate);
            if (days != null && days < 0) alerts.push({ level: 'danger', cat: 'عقد', ref: c.title, detail: 'منتهي', id: c.id, kind: 'contract' });
            else if (days != null && days <= 60) alerts.push({ level: 'warn', cat: 'عقد', ref: c.title, detail: 'ينتهي خلال ' + days + ' يوم', id: c.id, kind: 'contract' });
        });
        legalCompliance.forEach(function(c) {
            if (!c.expiryDate) return;
            const days = daysUntil(c.expiryDate);
            const lbl = LEGAL_COMPLIANCE_TYPES[c.type] || c.type;
            if (days != null && days < 0) alerts.push({ level: 'danger', cat: 'امتثال', ref: lbl, detail: c.title + ' — منتهي', id: c.id, kind: 'compliance' });
            else if (days != null && days <= 60) alerts.push({ level: 'warn', cat: 'امتثال', ref: lbl, detail: c.title + ' — ' + days + ' يوم', id: c.id, kind: 'compliance' });
        });
        legalCases.filter(function(c) { return c.status === 'open' || c.status === 'court'; }).forEach(function(c) {
            alerts.push({ level: 'info', cat: 'قضية', ref: c.title, detail: (LEGAL_CASE_STATUS[c.status] || {}).label || c.status, id: c.id, kind: 'case' });
        });
        legalRentals.forEach(function(r) {
            if (!r.endDate) return;
            const role = LEGAL_LEASE_ROLES[r.leaseRole] || r.leaseRole || 'إيجار';
            const days = daysUntil(r.endDate);
            const ref = (r.title || r.propertyAddress || 'عقد إيجار') + ' (' + role + ')';
            if (days != null && days < 0) alerts.push({ level: 'danger', cat: 'إيجار', ref: ref, detail: 'منتهي', id: r.id, kind: 'rental' });
            else if (days != null && days <= 60) alerts.push({ level: 'warn', cat: 'إيجار', ref: ref, detail: 'ينتهي خلال ' + days + ' يوم', id: r.id, kind: 'rental' });
        });
        return alerts;
    }

    function processLegalExpiryReminders() {
        const today = new Date().toISOString().slice(0, 10);
        if (legalNotifSettings.lastScan === today) return;
        const thresholds = legalNotifSettings.remindDays || [30, 60];
        legalRentals.forEach(function(r) {
            if (!r.endDate) return;
            const days = daysUntil(r.endDate);
            if (days == null) return;
            thresholds.forEach(function(th) {
                if (days === th || (days < th && days >= th - 2)) {
                    const exists = legalActivity.some(function(a) {
                        return a.kind === 'rental-reminder' && a.refId === r.id && a.threshold === th && a.recordedAt && a.recordedAt.slice(0, 10) === today;
                    });
                    if (!exists) {
                        legalActivity.unshift({
                            id: 'la-rem-' + Date.now() + '-' + r.id,
                            action: 'تنبيه إيجار',
                            detail: (r.title || '') + ' — ينتهي ' + r.endDate + ' (' + days + ' يوم)',
                            username: 'system',
                            kind: 'rental-reminder',
                            refId: r.id,
                            threshold: th,
                            recordedAt: new Date().toISOString()
                        });
                    }
                }
            });
        });
        legalNotifSettings.lastScan = today;
        try { localStorage.setItem(LEGAL_NOTIF_SETTINGS_KEY, JSON.stringify(legalNotifSettings)); } catch (e) { /* ignore */ }
    }

    function sendLegalRentalReminder(rentalId) {
        if (!requireLegalAccess()) return;
        const r = legalRentals.find(function(x) { return x.id === rentalId; });
        if (!r) return;
        const role = LEGAL_LEASE_ROLES[r.leaseRole] || r.leaseRole || '';
        const subject = 'تنبيه Legal — عقد إيجار ' + (r.title || '');
        const body =
            'مصنع نبراس — الشؤون القانونية\n\n' +
            'العقد: ' + (r.title || '') + '\n' +
            'الدور: ' + role + '\n' +
            'العقار: ' + (r.propertyAddress || '') + '\n' +
            'الطرف: ' + (r.partyName || '') + '\n' +
            'الإيجار الشهري: ' + (r.monthlyRent || '—') + ' ر.س\n' +
            'تاريخ الانتهاء: ' + (r.endDate || '') + '\n\n' +
            'يرجى المتابعة مع قسم الشؤون القانونية.';
        const sendFn = typeof sendNebrasHrNotificationEmail === 'function' ? sendNebrasHrNotificationEmail : null;
        if (!sendFn) { alert(body); return; }
        sendFn({ subject: subject, body: body, meta: { rentalId: r.id, type: 'legal-rental-expiry' } }).then(function() {
            legalAudit('Legal تنبيه إيجار', r.title || r.id);
            alert('تم إرسال التنبيه.');
        });
    }

    function getLegalTabDefinitions() {
        return [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة التحكم', group: 'الرئيسية' },
            { id: 'companies', icon: 'fas fa-building-circle-check', label: 'الشركات (قانوني)', group: 'الكيانات' },
            { id: 'contracts', icon: 'fas fa-file-signature', label: 'العقود', group: 'المعاملات' },
            { id: 'rentals', icon: 'fas fa-building', label: 'عقود الإيجار', group: 'المعاملات' },
            { id: 'partnerships', icon: 'fas fa-handshake', label: 'اتفاقيات الشراكة', group: 'المعاملات' },
            { id: 'cases', icon: 'fas fa-gavel', label: 'قضايا ونزاعات', group: 'التقاضي' },
            { id: 'compliance', icon: 'fas fa-certificate', label: 'امتثال وتراخيص', group: 'الامتثال' },
            { id: 'policies', icon: 'fas fa-book', label: 'سياسات ولوائح', group: 'الامتثال' },
            { id: 'pdpl', icon: 'fas fa-user-shield', label: 'حماية البيانات PDPL', group: 'الامتثال' },
            { id: 'correspondence', icon: 'fas fa-envelope-open-text', label: 'مراسلات قانونية', group: 'التواصل' },
            { id: 'alerts', icon: 'fas fa-bell', label: 'تنبيهات قانونية', group: 'الامتثال' },
            { id: 'activity', icon: 'fas fa-clock-rotate-left', label: 'سجل العمليات', group: 'الحوكمة' }
        ];
    }

    function renderLegalCompanyToolbar() {
        const companies = typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies() : [];
        if (companies.length < 2) return '';
        const opts = '<option value=""' + (!legalCompanyFilter ? ' selected' : '') + '>كل الشركات</option>' +
            companies.map(function(c) {
                return '<option value="' + esc(c.id) + '"' + (String(legalCompanyFilter) === String(c.id) ? ' selected' : '') + '>' + esc(c.nameAr) + '</option>';
            }).join('');
        return '<label class="nebras-field hr-company-filter"><span><i class="fas fa-building"></i> الشركة</span><select onchange="setLegalCompanyFilter(this.value)">' + opts + '</select></label>';
    }

    function renderLegalMultiCompanyOverview() {
        if (legalCompanyFilter) return '';
        const companies = typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies() : [];
        if (companies.length < 2) return '';
        const cards = companies.map(function(c) {
            const contracts = applyLegalCompanyFilter(legalContracts).filter(function(x) { return resolveLegalCompanyId(x) === c.id; }).length;
            const cases = applyLegalCompanyFilter(legalCases).filter(function(x) { return resolveLegalCompanyId(x) === c.id && (x.status === 'open' || x.status === 'court'); }).length;
            const comp = applyLegalCompanyFilter(legalCompliance).filter(function(x) { return resolveLegalCompanyId(x) === c.id; }).length;
            return '<article class="hr-company-card' + (c.isPrimary ? ' hr-company-card--primary' : '') + '">' +
                '<div class="hr-company-card-head"><strong>' + esc(c.nameAr) + '</strong>' +
                '<small>س.ت: ' + esc(c.crNumber || '—') + ' · ضريبي: ' + esc(c.taxNumber || '—') + '</small></div>' +
                '<div class="hr-company-kpis">' +
                    '<span><strong>' + contracts + '</strong> عقد</span>' +
                    '<span><strong>' + cases + '</strong> قضية نشطة</span>' +
                    '<span><strong>' + comp + '</strong> امتثال</span>' +
                '</div>' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="setLegalCompanyFilter(\'' + esc(c.id) + '\')"><i class="fas fa-scale-balanced"></i> إدارة قانونية</button>' +
            '</article>';
        }).join('');
        return '<div class="hr-multi-company-block legal-multi-co">' +
            '<div class="hr-multi-company-head"><h4><i class="fas fa-scale-balanced"></i> الشؤون القانونية — مجموعة نبراس والشركاء</h4>' +
            '<p>كل شركة لها عقودها وقضاياها وتراخيصها — تُدار من منصة واحدة محكومة.</p></div>' +
            '<div class="hr-company-grid">' + cards + '</div></div>';
    }

    function renderLegalDashboard() {
        const contracts = applyLegalCompanyFilter(legalContracts);
        const cases = applyLegalCompanyFilter(legalCases);
        const compliance = applyLegalCompanyFilter(legalCompliance);
        const policies = applyLegalCompanyFilter(legalPolicies);
        const activeContracts = contracts.filter(function(c) { return c.status === 'active'; }).length;
        const openCases = cases.filter(function(c) { return c.status === 'open' || c.status === 'court' || c.status === 'mediation'; }).length;
        const expiring = collectLegalAlerts().filter(function(a) { return a.level === 'danger' || a.level === 'warn'; }).length;
        const partnershipAgreements = contracts.filter(function(c) { return c.type === 'partnership'; }).length;
        const rentalCount = applyLegalCompanyFilter(legalRentals).length;
        const pdplItems = compliance.filter(function(c) { return c.type === 'pdpl'; }).length +
            policies.filter(function(p) { return p.type === 'privacy' || p.type === 'gps_tracking'; }).length;

        const quick = [
            { tab: 'contracts', icon: 'fas fa-file-signature', label: 'عقد جديد' },
            { tab: 'rentals', icon: 'fas fa-building', label: 'عقد إيجار' },
            { tab: 'cases', icon: 'fas fa-gavel', label: 'قضية' },
            { tab: 'compliance', icon: 'fas fa-certificate', label: 'ترخيص' },
            { tab: 'policies', icon: 'fas fa-book', label: 'سياسة' },
            { tab: 'partnerships', icon: 'fas fa-handshake', label: 'شراكة' },
            { tab: 'pdpl', icon: 'fas fa-user-shield', label: 'PDPL' }
        ].map(function(q) {
            return '<button type="button" class="hr-command-quick-btn legal-quick-btn" onclick="switchLegalTab(\'' + q.tab + '\')"><i class="' + q.icon + '"></i> ' + q.label + '</button>';
        }).join('');

        const alertRows = collectLegalAlerts().slice(0, 5).map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : (a.level === 'warn' ? 'hr-alert--warn' : '');
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span><strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p></article>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            renderLegalMultiCompanyOverview() +
            '<div class="legal-command-hero">' +
                '<div class="legal-command-hero-inner">' +
                    '<span class="hr-command-pill legal-pill"><i class="fas fa-scale-balanced"></i> نبراس Legal</span>' +
                    '<h2 class="hr-command-title">منصة الشؤون القانونية والامتثال</h2>' +
                    '<p class="hr-command-sub">نبراس + الشركات الشريكة — عقود · إيجار · قضايا · تراخيص · سياسات · PDPL</p>' +
                '</div></div>' +
            '<div class="hr-command-kpi-ring">' +
                '<div class="hr-command-kpi"><strong>' + contracts.length + '</strong><span>عقود</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--ok"><strong>' + activeContracts + '</strong><span>عقود سارية</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--accent"><strong>' + openCases + '</strong><span>قضايا نشطة</span></div>' +
                '<div class="hr-command-kpi"><strong>' + compliance.length + '</strong><span>بنود امتثال</span></div>' +
                '<div class="hr-command-kpi"><strong>' + policies.length + '</strong><span>سياسات</span></div>' +
                '<div class="hr-command-kpi' + (expiring ? ' hr-command-kpi--danger' : '') + '"><strong>' + expiring + '</strong><span>تنبيهات</span></div>' +
                '<div class="hr-command-kpi"><strong>' + partnershipAgreements + '</strong><span>اتفاقيات شراكة</span></div>' +
                '<div class="hr-command-kpi"><strong>' + rentalCount + '</strong><span>عقود إيجار</span></div>' +
                '<div class="hr-command-kpi"><strong>' + pdplItems + '</strong><span>PDPL / خصوصية</span></div>' +
            '</div>' +
            '<div class="hr-command-quick-row">' + quick + '</div>' +
            (alertRows ? '<h4 class="hr-tracking-section-title"><i class="fas fa-bell"></i> تنبيهات عاجلة</h4><div class="hr-alerts-list hr-alerts-list--compact">' + alertRows + '</div>' : '') +
            '<p class="hr-platform-note legal-note"><i class="fas fa-shield-halved"></i> كل عملية قانونية تُسجَّل باسم المستخدم والوقت — حوكمة كاملة للمجموعة.</p>' +
        '</div>';
    }

    function renderLegalCompaniesPanel() {
        const companies = typeof getHrCompanies === 'function' ? getHrCompanies() : [];
        const rows = companies.map(function(c) {
            const contracts = legalContracts.filter(function(x) { return resolveLegalCompanyId(x) === c.id; }).length;
            const cases = legalCases.filter(function(x) { return resolveLegalCompanyId(x) === c.id; }).length;
            const comp = legalCompliance.filter(function(x) { return resolveLegalCompanyId(x) === c.id; }).length;
            return '<tr><td><strong>' + esc(c.nameAr) + '</strong>' + (c.isPrimary ? ' <span class="erp-tag erp-tag--ok">أم</span>' : ' <span class="erp-tag">شريكة</span>') +
                '<br><small>' + esc(c.activityDescription || '') + '</small></td>' +
                '<td>' + esc(c.crNumber || '—') + '<br><small>ضريبي: ' + esc(c.taxNumber || '—') + '</small><br><small>700: ' + esc(c.unifiedNumber || '—') + '</small></td>' +
                '<td>' + esc(c.managerName || '—') + '<br><small>' + esc(c.phone || '') + '</small></td>' +
                '<td>' + contracts + ' عقد · ' + cases + ' قضية · ' + comp + ' امتثال</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="setLegalCompanyFilter(\'' + esc(c.id) + '\');switchLegalTab(\'contracts\')"><i class="fas fa-scale-balanced"></i> ملف قانوني</button> ' +
                (typeof openHrCompanyEditor === 'function' ? '<button type="button" class="erp-tag" onclick="openHrCompanyEditor(\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i> بيانات HR</button>' : '') +
                '</td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-building"></i> ملف قانوني لكل شركة — السجل التجاري والضريبي مُسجَّل في HR · العقود والقضايا هنا.</p>' +
            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="typeof openHrCompanyEditor===\'function\'&&openHrCompanyEditor(null)"><i class="fas fa-plus"></i> شركة شريكة (من HR)</button></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الشركة</th><th>س.ت / ضريبي / 700</th><th>المسؤول</th><th>الملف القانوني</th><th>إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="erp-empty">سجّلي الشركات من HR أولاً</td></tr>') + '</tbody></table></div></div>';
    }

    function renderLegalListPanel(kind, title, addLabel, columns, rowsHtml, editorHtml) {
        return '<div class="hr-panel is-active">' +
            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openLegalEditor(\'' + kind + '\',null)"><i class="fas fa-plus"></i> ' + addLabel + '</button></div>' +
            editorHtml +
            '<h4 class="hr-tracking-section-title">' + title + '</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' + columns + '</tr></thead><tbody>' +
            (rowsHtml || '<tr><td colspan="6" class="erp-empty">لا سجلات — أضيفي أولاً</td></tr>') + '</tbody></table></div></div>';
    }

    function renderLegalContractsPanel() {
        const list = applyLegalCompanyFilter(legalContracts);
        const editor = legalEditor.kind === 'contract' ? renderLegalContractEditor(legalEditor.id) : '';
        const rows = list.map(function(c) {
            const st = LEGAL_CONTRACT_STATUS[c.status] || LEGAL_CONTRACT_STATUS.draft;
            return '<tr><td><strong>' + esc(c.title) + '</strong><br><small>' + esc(LEGAL_CONTRACT_TYPES[c.type] || c.type) + '</small></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(c.companyId)) + '<br><small>' + esc(c.partyName || '') + '</small></td>' +
                '<td>' + formatLegalDate(c.startDate) + ' → ' + formatLegalDate(c.endDate) + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + st.label + '</span></td>' +
                '<td>' + legalAttachmentCell(c, 'contract') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'contract\',\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteLegalRecord(\'contract\',\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return renderLegalListPanel('contract', '<i class="fas fa-file-signature"></i> سجل العقود', 'عقد جديد',
            '<th>العقد</th><th>الشركة / الطرف</th><th>المدة</th><th>الحالة</th><th>مرفق</th><th>إجراء</th>', rows, editor);
    }

    function renderLegalRentalsPanel() {
        const list = applyLegalCompanyFilter(legalRentals);
        const editor = legalEditor.kind === 'rental' ? renderLegalRentalEditor(legalEditor.id) : '';
        const rows = list.map(function(r) {
            const st = LEGAL_CONTRACT_STATUS[resolveRentalStatus(r.endDate)] || LEGAL_CONTRACT_STATUS.active;
            const role = LEGAL_LEASE_ROLES[r.leaseRole] || r.leaseRole || '—';
            const days = daysUntil(r.endDate);
            const expiryBadge = days != null && days < 0 ? '<span class="erp-tag erp-tag--danger">منتهي</span>' :
                (days != null && days <= 60 ? '<span class="erp-tag erp-tag--accent">' + days + ' يوم</span>' : '');
            return '<tr><td><strong>' + esc(r.title || 'عقد إيجار') + '</strong><br><small>' + esc(role) + '</small></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(r.companyId)) + '<br><small>' + esc(r.partyName || '') + '</small></td>' +
                '<td>' + esc(r.propertyAddress || '—') + '</td>' +
                '<td>' + (r.monthlyRent ? hrNumLegal(r.monthlyRent).toLocaleString('ar-SA') + ' ر.س' : '—') + '</td>' +
                '<td>' + formatLegalDate(r.startDate) + ' → ' + formatLegalDate(r.endDate) + ' ' + expiryBadge + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + st.label + '</span></td>' +
                '<td>' + legalAttachmentCell(r, 'rental') +
                (days != null && days <= 60 && days >= 0 ? ' <button type="button" class="erp-tag" onclick="sendLegalRentalReminder(\'' + esc(r.id) + '\')"><i class="fas fa-bell"></i></button>' : '') +
                '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'rental\',\'' + esc(r.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteLegalRecord(\'rental\',\'' + esc(r.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-building"></i> <strong>عقود الإيجار</strong> — مؤجّر أو مستأجر · رفع صورة/ملف العقد · تنبيه قبل الانتهاء بـ 60 يوماً.</p>' +
            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openLegalEditor(\'rental\',null)"><i class="fas fa-plus"></i> عقد إيجار جديد</button></div>' +
            editor +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
            '<th>العقد</th><th>الشركة / الطرف</th><th>العقار</th><th>الإيجار الشهري</th><th>المدة</th><th>الحالة</th><th>مرفق · تنبيه</th><th>إجراء</th>' +
            '</tr></thead><tbody>' +
            (rows || '<tr><td colspan="8" class="erp-empty">لا عقود إيجار — أضيفي عقداً (مؤجّر أو مستأجر)</td></tr>') +
            '</tbody></table></div></div>';
    }

    function hrNumLegal(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function renderLegalRentalEditor(id) {
        const r = id ? legalRentals.find(function(x) { return x.id === id; }) : {};
        const roleOpts = Object.keys(LEGAL_LEASE_ROLES).map(function(k) {
            return '<option value="' + k + '"' + ((r.leaseRole || 'tenant') === k ? ' selected' : '') + '>' + LEGAL_LEASE_ROLES[k] + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-building"></i> ' + (id ? 'تعديل عقد إيجار' : 'عقد إيجار جديد') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة التابعة *</span><select id="lrent-company">' + companySelectLegal(r.companyId || legalCompanyFilter) + '</select></label>' +
                '<label class="nebras-field"><span>دور الشركة *</span><select id="lrent-role">' + roleOpts + '</select></label>' +
                '<label class="nebras-field"><span>عنوان العقد *</span><input id="lrent-title" value="' + esc(r.title || '') + '" placeholder="إيجار مستودع الرياض"></label>' +
                '<label class="nebras-field"><span>الطرف الآخر</span><input id="lrent-party" value="' + esc(r.partyName || '') + '" placeholder="اسم المستأجر أو المؤجّر"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>عنوان العقار *</span><input id="lrent-address" value="' + esc(r.propertyAddress || '') + '"></label>' +
                '<label class="nebras-field"><span>الإيجار الشهري (ر.س)</span><input type="number" id="lrent-rent" min="0" step="0.01" value="' + esc(r.monthlyRent || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم العقد / المرجع</span><input id="lrent-ref" value="' + esc(r.referenceNo || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ البداية</span><input type="date" id="lrent-start" value="' + esc(r.startDate || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ الانتهاء *</span><input type="date" id="lrent-end" value="' + esc(r.endDate || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><textarea id="lrent-notes" rows="2">' + esc(r.notes || '') + '</textarea></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفق العقد (صورة / PDF)</span><input type="file" accept="image/*,application/pdf" onchange="legalReadAttachment(this)"><small id="legal-attach-hint" class="hr-attach-hint">' + (r.attachmentName ? esc(r.attachmentName) : 'اختياري — صورة العقد') + '</small></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalRental(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalPartnershipsPanel() {
        const list = applyLegalCompanyFilter(legalContracts).filter(function(c) { return c.type === 'partnership'; });
        const editor = legalEditor.kind === 'partnership' ? renderLegalContractEditor(legalEditor.id, 'partnership') : '';
        const rows = list.map(function(c) {
            return '<tr><td><strong>' + esc(c.title) + '</strong></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(c.companyId)) + ' ↔ ' + esc(c.partyName || '') + '</td>' +
                '<td>' + formatLegalDate(c.startDate) + '</td>' +
                '<td>' + esc(c.notes || '—') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'partnership\',\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-handshake"></i> اتفاقيات إدارة HR للشركات الشريكة — مثل أمواج اللدائن — عقود شراكة ومسؤوليات قانونية.</p>' +
            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openLegalEditor(\'partnership\',null)"><i class="fas fa-handshake"></i> اتفاقية شراكة</button></div>' +
            editor +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الاتفاقية</th><th>الأطراف</th><th>التاريخ</th><th>ملاحظات</th><th>إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="erp-empty">لا اتفاقيات شراكة — أضيفي اتفاقية أمواج اللدائن مثلاً</td></tr>') + '</tbody></table></div></div>';
    }

    function renderLegalContractEditor(id, forceType) {
        const c = id ? legalContracts.find(function(x) { return x.id === id; }) : {};
        const type = forceType || c.type || 'commercial';
        const typeOpts = Object.keys(LEGAL_CONTRACT_TYPES).map(function(k) {
            return '<option value="' + k + '"' + (type === k ? ' selected' : '') + '>' + LEGAL_CONTRACT_TYPES[k] + '</option>';
        }).join('');
        const statusOpts = Object.keys(LEGAL_CONTRACT_STATUS).map(function(k) {
            return '<option value="' + k + '"' + ((c.status || 'draft') === k ? ' selected' : '') + '>' + LEGAL_CONTRACT_STATUS[k].label + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-file-signature"></i> ' + (id ? 'تعديل عقد' : 'عقد / اتفاقية جديدة') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة التابعة *</span><select id="lc-company">' + companySelectLegal(c.companyId || legalCompanyFilter) + '</select></label>' +
                (forceType ? '<input type="hidden" id="lc-type" value="partnership">' :
                    '<label class="nebras-field"><span>نوع العقد</span><select id="lc-type">' + typeOpts + '</select></label>') +
                '<label class="nebras-field"><span>عنوان العقد *</span><input id="lc-title" value="' + esc(c.title || '') + '"></label>' +
                '<label class="nebras-field"><span>الطرف الآخر</span><input id="lc-party" value="' + esc(c.partyName || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم العقد / المرجع</span><input id="lc-ref" value="' + esc(c.referenceNo || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ البداية</span><input type="date" id="lc-start" value="' + esc(c.startDate || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ الانتهاء</span><input type="date" id="lc-end" value="' + esc(c.endDate || '') + '"></label>' +
                '<label class="nebras-field"><span>القيمة (ريال)</span><input type="number" id="lc-value" value="' + esc(c.valueAmount || '') + '"></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="lc-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>المحامي / المسؤول</span><input id="lc-lawyer" value="' + esc(c.lawyerName || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات / شروط</span><textarea id="lc-notes" rows="3">' + esc(c.notes || '') + '</textarea></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفق العقد (صورة / PDF)</span><input type="file" accept="image/*,application/pdf" onchange="legalReadAttachment(this)"><small id="legal-attach-hint" class="hr-attach-hint">' + (c.attachmentName ? esc(c.attachmentName) : 'اختياري') + '</small></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalContract(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalCasesPanel() {
        const list = applyLegalCompanyFilter(legalCases);
        const editor = legalEditor.kind === 'case' ? renderLegalCaseEditor(legalEditor.id) : '';
        const rows = list.map(function(c) {
            const st = LEGAL_CASE_STATUS[c.status] || LEGAL_CASE_STATUS.open;
            return '<tr><td><strong>' + esc(c.title) + '</strong><br><small>' + esc(LEGAL_CASE_TYPES[c.type] || c.type) + '</small></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(c.companyId)) + '</td>' +
                '<td>' + esc(c.opposingParty || '—') + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + st.label + '</span></td>' +
                '<td>' + esc(c.courtName || '—') + '</td>' +
                '<td>' + legalAttachmentCell(c, 'case') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'case\',\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteLegalRecord(\'case\',\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return renderLegalListPanel('case', '<i class="fas fa-gavel"></i> قضايا ونزاعات', 'قضية جديدة',
            '<th>القضية</th><th>الشركة</th><th>الطرف المقابل</th><th>الحالة</th><th>المحكمة</th><th>مرفق</th><th>إجراء</th>', rows, editor);
    }

    function renderLegalCaseEditor(id) {
        const c = id ? legalCases.find(function(x) { return x.id === id; }) : {};
        const typeOpts = Object.keys(LEGAL_CASE_TYPES).map(function(k) {
            return '<option value="' + k + '"' + ((c.type || 'commercial') === k ? ' selected' : '') + '>' + LEGAL_CASE_TYPES[k] + '</option>';
        }).join('');
        const statusOpts = Object.keys(LEGAL_CASE_STATUS).map(function(k) {
            return '<option value="' + k + '"' + ((c.status || 'open') === k ? ' selected' : '') + '>' + LEGAL_CASE_STATUS[k].label + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-gavel"></i> ' + (id ? 'تعديل قضية' : 'قضية / نزاع جديد') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة *</span><select id="lcase-company">' + companySelectLegal(c.companyId) + '</select></label>' +
                '<label class="nebras-field"><span>عنوان القضية *</span><input id="lcase-title" value="' + esc(c.title || '') + '"></label>' +
                '<label class="nebras-field"><span>النوع</span><select id="lcase-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="lcase-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>الطرف المقابل</span><input id="lcase-opposing" value="' + esc(c.opposingParty || '') + '"></label>' +
                '<label class="nebras-field"><span>المحكمة / الجهة</span><input id="lcase-court" value="' + esc(c.courtName || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم القضية</span><input id="lcase-no" value="' + esc(c.caseNo || '') + '"></label>' +
                '<label class="nebras-field"><span>المحامي</span><input id="lcase-lawyer" value="' + esc(c.lawyerName || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ الفتح</span><input type="date" id="lcase-opened" value="' + esc(c.openedDate || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملخص / ملاحظات</span><textarea id="lcase-notes" rows="3">' + esc(c.notes || '') + '</textarea></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفقات (صورة / PDF)</span><input type="file" accept="image/*,application/pdf" onchange="legalReadAttachment(this)"><small id="legal-attach-hint" class="hr-attach-hint">' + (c.attachmentName ? esc(c.attachmentName) : 'اختياري — أوراق القضية') + '</small></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalCase(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalCompliancePanel() {
        const list = applyLegalCompanyFilter(legalCompliance);
        const editor = legalEditor.kind === 'compliance' ? renderLegalComplianceEditor(legalEditor.id) : '';
        const rows = list.map(function(c) {
            const days = daysUntil(c.expiryDate);
            const badge = days != null && days < 0 ? '<span class="erp-tag erp-tag--danger">منتهي</span>' :
                (days != null && days <= 60 ? '<span class="erp-tag erp-tag--accent">' + days + ' يوم</span>' : '<span class="erp-tag erp-tag--ok">ساري</span>');
            return '<tr><td><strong>' + esc(c.title) + '</strong><br><small>' + esc(LEGAL_COMPLIANCE_TYPES[c.type] || c.type) + '</small></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(c.companyId)) + '</td>' +
                '<td>' + esc(c.authority || '—') + '</td>' +
                '<td>' + formatLegalDate(c.expiryDate) + ' ' + badge + '</td>' +
                '<td>' + legalAttachmentCell(c, 'compliance') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'compliance\',\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteLegalRecord(\'compliance\',\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return renderLegalListPanel('compliance', '<i class="fas fa-certificate"></i> امتثال وتراخيص', 'بند امتثال',
            '<th>البند</th><th>الشركة</th><th>الجهة</th><th>الانتهاء</th><th>مرفق</th><th>إجراء</th>', rows, editor);
    }

    function renderLegalComplianceEditor(id) {
        const c = id ? legalCompliance.find(function(x) { return x.id === id; }) : {};
        const typeOpts = Object.keys(LEGAL_COMPLIANCE_TYPES).map(function(k) {
            return '<option value="' + k + '"' + ((c.type || 'commercial_registration') === k ? ' selected' : '') + '>' + LEGAL_COMPLIANCE_TYPES[k] + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-certificate"></i> ' + (id ? 'تعديل امتثال' : 'بند امتثال / ترخيص') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة *</span><select id="lcomp-company">' + companySelectLegal(c.companyId) + '</select></label>' +
                '<label class="nebras-field"><span>النوع</span><select id="lcomp-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>العنوان *</span><input id="lcomp-title" value="' + esc(c.title || '') + '"></label>' +
                '<label class="nebras-field"><span>الجهة الرسمية</span><input id="lcomp-authority" value="' + esc(c.authority || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم الترخيص / المرجع</span><input id="lcomp-ref" value="' + esc(c.referenceNo || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ الإصدار</span><input type="date" id="lcomp-issued" value="' + esc(c.issuedDate || '') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ الانتهاء</span><input type="date" id="lcomp-expiry" value="' + esc(c.expiryDate || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><textarea id="lcomp-notes" rows="2">' + esc(c.notes || '') + '</textarea></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفق الترخيص (صورة / PDF)</span><input type="file" accept="image/*,application/pdf" onchange="legalReadAttachment(this)"><small id="legal-attach-hint" class="hr-attach-hint">' + (c.attachmentName ? esc(c.attachmentName) : 'اختياري') + '</small></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalCompliance(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalPoliciesPanel() {
        const list = applyLegalCompanyFilter(legalPolicies);
        const editor = legalEditor.kind === 'policy' ? renderLegalPolicyEditor(legalEditor.id) : '';
        const rows = list.map(function(p) {
            return '<tr><td><strong>' + esc(p.title) + '</strong><br><small>' + esc(LEGAL_POLICY_TYPES[p.type] || p.type) + ' · v' + esc(p.version || '1') + '</small></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(p.companyId)) + '</td>' +
                '<td>' + formatLegalDate(p.effectiveDate) + '</td>' +
                '<td>' + (p.approved ? '<span class="erp-tag erp-tag--ok">معتمدة</span>' : '<span class="erp-tag">مسودة</span>') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'policy\',\'' + esc(p.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteLegalRecord(\'policy\',\'' + esc(p.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return renderLegalListPanel('policy', '<i class="fas fa-book"></i> سياسات ولوائح', 'سياسة جديدة',
            '<th>السياسة</th><th>الشركة</th><th>السريان</th><th>الحالة</th><th>إجراء</th>', rows, editor);
    }

    function renderLegalPolicyEditor(id) {
        const p = id ? legalPolicies.find(function(x) { return x.id === id; }) : {};
        const typeOpts = Object.keys(LEGAL_POLICY_TYPES).map(function(k) {
            return '<option value="' + k + '"' + ((p.type || 'privacy') === k ? ' selected' : '') + '>' + LEGAL_POLICY_TYPES[k] + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-book"></i> ' + (id ? 'تعديل سياسة' : 'سياسة / لائحة') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة *</span><select id="lpol-company">' + companySelectLegal(p.companyId) + '</select></label>' +
                '<label class="nebras-field"><span>النوع</span><select id="lpol-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>العنوان *</span><input id="lpol-title" value="' + esc(p.title || '') + '"></label>' +
                '<label class="nebras-field"><span>الإصدار</span><input id="lpol-version" value="' + esc(p.version || '1.0') + '"></label>' +
                '<label class="nebras-field"><span>تاريخ السريان</span><input type="date" id="lpol-effective" value="' + esc(p.effectiveDate || '') + '"></label>' +
                '<label class="nebras-field"><span>معتمدة</span><select id="lpol-approved"><option value="1"' + (p.approved ? ' selected' : '') + '>نعم</option><option value="0"' + (!p.approved ? ' selected' : '') + '>مسودة</option></select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>نص السياسة / الملخص</span><textarea id="lpol-body" rows="5">' + esc(p.bodyText || '') + '</textarea></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalPolicy(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalPdplPanel() {
        const privacyPolicies = applyLegalCompanyFilter(legalPolicies).filter(function(p) { return p.type === 'privacy' || p.type === 'gps_tracking'; });
        const pdplCompliance = applyLegalCompanyFilter(legalCompliance).filter(function(c) { return c.type === 'pdpl'; });
        const gpsConsents = typeof getHrGpsConsents === 'function' ? getHrGpsConsents() : [];
        return '<div class="hr-panel is-active">' +
            '<div class="legal-pdpl-hero"><i class="fas fa-user-shield"></i><div><strong>نظام حماية البيانات الشخصية — PDPL</strong>' +
            '<p>سياسات الخصوصية · موافقات GPS · سجل الموافقات · امتثال SDAIA لنبراس والشركات الشريكة.</p></div></div>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + privacyPolicies.length + '</strong><span>سياسات خصوصية</span></div>' +
                '<div class="hr-report-card"><strong>' + pdplCompliance.length + '</strong><span>بنود PDPL</span></div>' +
                '<div class="hr-report-card"><strong>' + gpsConsents.length + '</strong><span>موافقات GPS مسجّلة</span></div>' +
            '</div>' +
            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn" onclick="openLegalEditor(\'policy\',null)"><i class="fas fa-book"></i> سياسة خصوصية</button>' +
                '<button type="button" class="nebras-users-btn" onclick="openLegalEditor(\'compliance\',null)"><i class="fas fa-certificate"></i> بند PDPL</button>' +
            '</div>' +
            '<details class="hr-gps-legal-doc" open><summary>قائمة تحقق PDPL — ما يجب توفره</summary><ul class="hr-gps-legal-list">' +
                '<li><strong>سياسة خصوصية</strong> منشورة وتذكر جمع الموقع والبيانات الشخصية.</li>' +
                '<li><strong>موافقة صريحة</strong> قبل تتبع GPS — مُفعَّلة في منصة HR.</li>' +
                '<li><strong>تعيين مسؤول حماية بيانات</strong> (DPO) — سجّليه في المراسلات القانونية.</li>' +
                '<li><strong>سجل معالجة البيانات</strong> — وثّقي من يصل للبيانات ولماذا.</li>' +
                '<li><strong>احتفاظ محدود</strong> — GPS: 90 يوم (قابل للتعديل في إعدادات HR GPS).</li>' +
            '</ul></details></div>';
    }

    function renderLegalCorrespondencePanel() {
        const list = applyLegalCompanyFilter(legalCorrespondence);
        const editor = legalEditor.kind === 'correspondence' ? renderLegalCorrEditor(legalEditor.id) : '';
        const rows = list.map(function(c) {
            return '<tr><td>' + formatLegalDate(c.sentDate) + '</td><td><strong>' + esc(c.subject) + '</strong></td>' +
                '<td>' + esc(resolveLegalCompanyLabel(c.companyId)) + '</td>' +
                '<td>' + esc(c.recipient || '—') + ' / ' + esc(c.direction === 'incoming' ? 'وارد' : 'صادر') + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openLegalEditor(\'correspondence\',\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button></td></tr>';
        }).join('');
        return renderLegalListPanel('correspondence', '<i class="fas fa-envelope-open-text"></i> مراسلات قانونية', 'مراسلة',
            '<th>التاريخ</th><th>الموضوع</th><th>الشركة</th><th>الجهة</th><th>إجراء</th>', rows, editor);
    }

    function renderLegalCorrEditor(id) {
        const c = id ? legalCorrespondence.find(function(x) { return x.id === id; }) : {};
        return '<div class="hr-editor-overlay" id="legal-editor">' +
            '<h4><i class="fas fa-envelope"></i> مراسلة قانونية</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الشركة</span><select id="lcorr-company">' + companySelectLegal(c.companyId) + '</select></label>' +
                '<label class="nebras-field"><span>الاتجاه</span><select id="lcorr-dir"><option value="outgoing"' + (c.direction !== 'incoming' ? ' selected' : '') + '>صادر</option><option value="incoming"' + (c.direction === 'incoming' ? ' selected' : '') + '>وارد</option></select></label>' +
                '<label class="nebras-field"><span>الموضوع *</span><input id="lcorr-subject" value="' + esc(c.subject || '') + '"></label>' +
                '<label class="nebras-field"><span>الجهة / المستلم</span><input id="lcorr-recipient" value="' + esc(c.recipient || '') + '"></label>' +
                '<label class="nebras-field"><span>التاريخ</span><input type="date" id="lcorr-date" value="' + esc(c.sentDate || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم المرجع</span><input id="lcorr-ref" value="' + esc(c.referenceNo || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملخص المحتوى</span><textarea id="lcorr-body" rows="4">' + esc(c.bodySummary || '') + '</textarea></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveLegalCorrespondence(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelLegalEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function renderLegalAlertsPanel() {
        const alerts = collectLegalAlerts();
        const items = alerts.map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : (a.level === 'warn' ? 'hr-alert--warn' : '');
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span><strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p></article>';
        }).join('');
        return '<div class="hr-panel is-active"><h4 class="hr-tracking-section-title"><i class="fas fa-bell"></i> تنبيهات قانونية (' + alerts.length + ')</h4>' +
            (items || '<p class="erp-empty">لا تنبيهات — كل شيء ساري</p>') + '</div>';
    }

    function renderLegalActivityPanel() {
        const rows = legalActivity.slice(0, 80).map(function(a) {
            return '<tr><td>' + formatLegalDate(a.recordedAt) + '</td><td>' + esc(a.username) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>';
        }).join('');
        return '<div class="hr-panel is-active"><h4 class="hr-tracking-section-title"><i class="fas fa-clock-rotate-left"></i> سجل عمليات الشؤون القانونية</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="erp-empty">لا عمليات بعد</td></tr>') + '</tbody></table></div></div>';
    }

    function openLegalEditor(kind, id) {
        if (!requireLegalAccess()) return;
        legalEditor = { kind: kind, id: id };
        renderLegalPlatformPanelSafe();
    }

    function cancelLegalEditor() {
        legalEditor = { kind: '', id: null };
        renderLegalPlatformPanelSafe();
    }

    function saveLegalContract(id) {
        if (!requireLegalAccess()) return;
        const title = legalField('lc-title');
        if (!title) { alert('عنوان العقد مطلوب.'); return; }
        const record = {
            id: id || ('lct-' + Date.now()),
            companyId: legalField('lc-company'),
            type: legalField('lc-type') || 'commercial',
            title: title,
            partyName: legalField('lc-party'),
            referenceNo: legalField('lc-ref'),
            startDate: legalField('lc-start'),
            endDate: legalField('lc-end'),
            valueAmount: legalField('lc-value'),
            status: legalField('lc-status') || 'draft',
            lawyerName: legalField('lc-lawyer'),
            notes: legalField('lc-notes'),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalContracts.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) {
                record.createdAt = legalContracts[idx].createdAt;
                record.attachmentName = legalContracts[idx].attachmentName;
                record.attachmentDataUrl = legalContracts[idx].attachmentDataUrl;
                record.attachmentMime = legalContracts[idx].attachmentMime;
                record.attachmentCloudUrl = legalContracts[idx].attachmentCloudUrl;
                legalContracts[idx] = applyLegalAttachmentFields(record);
            }
        } else {
            record.createdAt = record.updatedAt;
            legalContracts.unshift(applyLegalAttachmentFields(record));
        }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal عقد', (id ? 'تعديل ' : 'إضافة ') + title);
        renderLegalPlatformPanelSafe();
    }

    function saveLegalCase(id) {
        if (!requireLegalAccess()) return;
        const title = legalField('lcase-title');
        if (!title) { alert('عنوان القضية مطلوب.'); return; }
        const record = {
            id: id || ('lcs-' + Date.now()),
            companyId: legalField('lcase-company'),
            type: legalField('lcase-type'),
            status: legalField('lcase-status'),
            title: title,
            opposingParty: legalField('lcase-opposing'),
            courtName: legalField('lcase-court'),
            caseNo: legalField('lcase-no'),
            lawyerName: legalField('lcase-lawyer'),
            openedDate: legalField('lcase-opened'),
            notes: legalField('lcase-notes'),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalCases.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) {
                record.createdAt = legalCases[idx].createdAt;
                record.attachmentName = legalCases[idx].attachmentName;
                record.attachmentDataUrl = legalCases[idx].attachmentDataUrl;
                record.attachmentMime = legalCases[idx].attachmentMime;
                record.attachmentCloudUrl = legalCases[idx].attachmentCloudUrl;
                legalCases[idx] = applyLegalAttachmentFields(record);
            }
        } else {
            record.createdAt = record.updatedAt;
            legalCases.unshift(applyLegalAttachmentFields(record));
        }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal قضية', title);
        renderLegalPlatformPanelSafe();
    }

    function saveLegalCompliance(id) {
        if (!requireLegalAccess()) return;
        const title = legalField('lcomp-title');
        if (!title) { alert('العنوان مطلوب.'); return; }
        const record = {
            id: id || ('lcmp-' + Date.now()),
            companyId: legalField('lcomp-company'),
            type: legalField('lcomp-type'),
            title: title,
            authority: legalField('lcomp-authority'),
            referenceNo: legalField('lcomp-ref'),
            issuedDate: legalField('lcomp-issued'),
            expiryDate: legalField('lcomp-expiry'),
            notes: legalField('lcomp-notes'),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalCompliance.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) {
                record.createdAt = legalCompliance[idx].createdAt;
                record.attachmentName = legalCompliance[idx].attachmentName;
                record.attachmentDataUrl = legalCompliance[idx].attachmentDataUrl;
                record.attachmentMime = legalCompliance[idx].attachmentMime;
                record.attachmentCloudUrl = legalCompliance[idx].attachmentCloudUrl;
                legalCompliance[idx] = applyLegalAttachmentFields(record);
            }
        } else {
            record.createdAt = record.updatedAt;
            legalCompliance.unshift(applyLegalAttachmentFields(record));
        }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal امتثال', title);
        renderLegalPlatformPanelSafe();
    }

    function saveLegalPolicy(id) {
        if (!requireLegalAccess()) return;
        const title = legalField('lpol-title');
        if (!title) { alert('عنوان السياسة مطلوب.'); return; }
        const record = {
            id: id || ('lpol-' + Date.now()),
            companyId: legalField('lpol-company'),
            type: legalField('lpol-type'),
            title: title,
            version: legalField('lpol-version') || '1.0',
            effectiveDate: legalField('lpol-effective'),
            approved: legalField('lpol-approved') === '1',
            bodyText: legalField('lpol-body'),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalPolicies.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) { record.createdAt = legalPolicies[idx].createdAt; legalPolicies[idx] = record; }
        } else { record.createdAt = record.updatedAt; legalPolicies.unshift(record); }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal سياسة', title);
        renderLegalPlatformPanelSafe();
    }

    function saveLegalRental(id) {
        if (!requireLegalAccess()) return;
        const title = legalField('lrent-title');
        const address = legalField('lrent-address');
        const endDate = legalField('lrent-end');
        if (!title) { alert('عنوان العقد مطلوب.'); return; }
        if (!address) { alert('عنوان العقار مطلوب.'); return; }
        if (!endDate) { alert('تاريخ انتهاء العقد مطلوب للتنبيهات.'); return; }
        const record = {
            id: id || ('lrent-' + Date.now()),
            companyId: legalField('lrent-company'),
            leaseRole: legalField('lrent-role') || 'tenant',
            title: title,
            partyName: legalField('lrent-party'),
            propertyAddress: address,
            monthlyRent: legalField('lrent-rent'),
            referenceNo: legalField('lrent-ref'),
            startDate: legalField('lrent-start'),
            endDate: endDate,
            notes: legalField('lrent-notes'),
            status: resolveRentalStatus(endDate),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalRentals.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) {
                record.createdAt = legalRentals[idx].createdAt;
                record.attachmentName = legalRentals[idx].attachmentName;
                record.attachmentDataUrl = legalRentals[idx].attachmentDataUrl;
                record.attachmentMime = legalRentals[idx].attachmentMime;
                record.attachmentCloudUrl = legalRentals[idx].attachmentCloudUrl;
                legalRentals[idx] = applyLegalAttachmentFields(record);
            }
        } else {
            record.createdAt = record.updatedAt;
            legalRentals.unshift(applyLegalAttachmentFields(record));
        }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal إيجار', (LEGAL_LEASE_ROLES[record.leaseRole] || '') + ' — ' + title);
        renderLegalPlatformPanelSafe();
    }

    function saveLegalCorrespondence(id) {
        if (!requireLegalAccess()) return;
        const subject = legalField('lcorr-subject');
        if (!subject) { alert('الموضوع مطلوب.'); return; }
        const record = {
            id: id || ('lcor-' + Date.now()),
            companyId: legalField('lcorr-company'),
            direction: legalField('lcorr-dir'),
            subject: subject,
            recipient: legalField('lcorr-recipient'),
            sentDate: legalField('lcorr-date'),
            referenceNo: legalField('lcorr-ref'),
            bodySummary: legalField('lcorr-body'),
            updatedAt: new Date().toISOString()
        };
        if (id) {
            const idx = legalCorrespondence.findIndex(function(x) { return x.id === id; });
            if (idx >= 0) { record.createdAt = legalCorrespondence[idx].createdAt; legalCorrespondence[idx] = record; }
        } else { record.createdAt = record.updatedAt; legalCorrespondence.unshift(record); }
        saveLegalData();
        legalEditor = { kind: '', id: null };
        legalAudit('Legal مراسلة', subject);
        renderLegalPlatformPanelSafe();
    }

    function deleteLegalRecord(kind, id) {
        if (!requireLegalAccess() || !confirm('حذف هذا السجل القانوني؟')) return;
        if (kind === 'contract') legalContracts = legalContracts.filter(function(x) { return x.id !== id; });
        else if (kind === 'rental') legalRentals = legalRentals.filter(function(x) { return x.id !== id; });
        else if (kind === 'case') legalCases = legalCases.filter(function(x) { return x.id !== id; });
        else if (kind === 'compliance') legalCompliance = legalCompliance.filter(function(x) { return x.id !== id; });
        else if (kind === 'policy') legalPolicies = legalPolicies.filter(function(x) { return x.id !== id; });
        saveLegalData();
        legalAudit('Legal حذف', kind + ' ' + id);
        renderLegalPlatformPanelSafe();
    }

    function renderLegalWorkspaceSidebar() {
        const head = document.querySelector('#legal-ws-sidebar .hr-ws-sidebar-head');
        if (head) {
            head.innerHTML = '<strong><i class="fas fa-scale-balanced"></i> نبراس Legal</strong>' +
                '<span>شؤون قانونية · امتثال · PDPL — المجموعة والشركاء</span>';
        }
        const nav = document.getElementById('legal-ws-nav');
        const tabs = getLegalTabDefinitions();
        if (nav) {
            const groups = [];
            const map = {};
            tabs.forEach(function(t) {
                const g = t.group || 'النظام';
                if (!map[g]) { map[g] = []; groups.push(g); }
                map[g].push(t);
            });
            nav.innerHTML = groups.map(function(g) {
                return '<div class="hr-ws-nav-group"><span class="hr-ws-nav-group-label">' + esc(g) + '</span>' +
                    map[g].map(function(t) {
                        return '<button type="button" class="hr-ws-nav-item' + (legalActiveTab === t.id ? ' is-active' : '') +
                            '" onclick="switchLegalTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
                    }).join('') + '</div>';
            }).join('');
        }
        const brand = document.getElementById('legal-ws-brand-title');
        const scope = document.getElementById('legal-ws-scope-label');
        const userPill = document.getElementById('legal-ws-user-pill');
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const coLabel = legalCompanyFilter && typeof resolveHrCompanyLabel === 'function' ? ' · ' + resolveHrCompanyLabel(legalCompanyFilter) : '';
        if (brand) brand.textContent = 'نبراس Legal — الشؤون القانونية والامتثال' + coLabel;
        if (scope) scope.textContent = (isStrictLegalUser() ? 'قسم الشؤون القانونية' : 'الإدارة الرئيسية') + coLabel;
        if (userPill && admin) userPill.textContent = admin.username + (admin.role === 'legal' ? ' · Legal' : '');
    }

    function updateLegalSummary() {
        const summary = document.getElementById('legal-platform-summary');
        if (!summary) return;
        const contracts = applyLegalCompanyFilter(legalContracts).length;
        const cases = applyLegalCompanyFilter(legalCases).filter(function(c) { return c.status === 'open' || c.status === 'court'; }).length;
        const alerts = collectLegalAlerts().filter(function(a) { return a.level === 'danger' || a.level === 'warn'; }).length;
        summary.innerHTML =
            '<div class="erp-stat erp-stat--accent legal-stat"><strong><i class="fas fa-scale-balanced"></i></strong><span>نبراس Legal</span></div>' +
            '<div class="erp-stat"><strong>' + contracts + '</strong><span>عقود</span></div>' +
            '<div class="erp-stat erp-stat--accent"><strong>' + cases + '</strong><span>قضايا نشطة</span></div>' +
            (alerts ? '<div class="erp-stat erp-stat--danger"><strong>' + alerts + '</strong><span>تنبيهات</span></div>' : '');
    }

    function renderLegalPlatformPanel() {
        const content = document.getElementById('legal-platform-content');
        if (!content) return;
        loadLegalData();
        renderLegalWorkspaceSidebar();
        updateLegalSummary();
        const ctx = legalCompanyFilter ? '<div class="hr-company-ctx-banner legal-ctx"><i class="fas fa-filter"></i> ملف قانوني: <strong>' +
            esc(resolveLegalCompanyLabel(legalCompanyFilter)) + '</strong> <button type="button" class="erp-tag" onclick="setLegalCompanyFilter(\'\')">كل الشركات</button></div>' : '';
        const toolbar = '<div class="hr-toolbar">' + renderLegalCompanyToolbar() +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportLegalPdf()"><i class="fas fa-file-pdf"></i> تقرير PDF للقسم</button></div>';
        let panel = '';
        if (legalActiveTab === 'dashboard') panel = renderLegalDashboard();
        else if (legalActiveTab === 'companies') panel = renderLegalCompaniesPanel();
        else if (legalActiveTab === 'contracts') panel = renderLegalContractsPanel();
        else if (legalActiveTab === 'rentals') panel = renderLegalRentalsPanel();
        else if (legalActiveTab === 'partnerships') panel = renderLegalPartnershipsPanel();
        else if (legalActiveTab === 'cases') panel = renderLegalCasesPanel();
        else if (legalActiveTab === 'compliance') panel = renderLegalCompliancePanel();
        else if (legalActiveTab === 'policies') panel = renderLegalPoliciesPanel();
        else if (legalActiveTab === 'pdpl') panel = renderLegalPdplPanel();
        else if (legalActiveTab === 'correspondence') panel = renderLegalCorrespondencePanel();
        else if (legalActiveTab === 'alerts') panel = renderLegalAlertsPanel();
        else if (legalActiveTab === 'activity') panel = renderLegalActivityPanel();
        else panel = renderLegalDashboard();
        content.innerHTML = ctx + toolbar + '<div class="hr-panels">' + panel + '</div>';
    }

    function renderLegalPlatformPanelSafe() {
        try {
            renderLegalPlatformPanel();
            return true;
        } catch (e) {
            console.error('renderLegalPlatformPanel', e);
            const content = document.getElementById('legal-platform-content');
            if (content) content.innerHTML = '<p class="erp-empty">تعذّر تحميل الشؤون القانونية — ' + esc(e.message) + '</p>';
            return false;
        }
    }

    function showLegalPlatformShell() {
        const el = document.getElementById('legal-platform');
        if (!el) { alert('تعذر فتح منصة Legal — أعيدي تحميل الصفحة.'); return false; }
        if (typeof closeAllAdminSections === 'function') {
            document.querySelectorAll('.admin-section.show').forEach(function(n) {
                if (n.id !== 'legal-platform') { n.classList.remove('show'); n.setAttribute('aria-hidden', 'true'); }
            });
        }
        const dash = document.getElementById('admin-dashboard');
        if (dash && isStrictLegalUser()) {
            dash.classList.remove('show');
            dash.setAttribute('aria-hidden', 'true');
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('legal-platform-open');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        return true;
    }

    function closeLegalWorkspace() {
        const el = document.getElementById('legal-platform');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('legal-platform-open');
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof currentAdmin !== 'undefined' && currentAdmin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function openLegalPlatform() {
        if (!requireLegalAccess()) return;
        loadLegalData();
        try { processLegalExpiryReminders(); } catch (e) { console.warn('Legal reminders', e); }
        legalActiveTab = legalActiveTab || 'dashboard';
        if (!showLegalPlatformShell()) return;
        renderLegalPlatformPanelSafe();
    }

    function switchLegalTab(tab) {
        legalActiveTab = tab || 'dashboard';
        legalEditor = { kind: '', id: null };
        renderLegalPlatformPanelSafe();
    }

    function applyLegalOnlyDashboard(user) {
        user = user || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!user || !isStrictLegalUser(user)) return;
        const dash = document.getElementById('admin-dashboard');
        if (dash) dash.classList.add('dashboard-legal-only');
        ['dash-nav-analytics', 'dash-nav-partners', 'dash-nav-ops', 'dash-nav-modules', 'dash-nav-erp', 'dash-nav-platform', 'dash-nav-content', 'dash-nav-settings'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const cmdTitle = document.getElementById('dashboard-command-title');
        const cmdSub = document.getElementById('dashboard-command-subtitle');
        if (cmdTitle) cmdTitle.textContent = 'Legal — نبراس';
        if (cmdSub) cmdSub.textContent = 'الشؤون القانونية والامتثال — المجموعة والشركاء';
    }

    function exportLegalPdf() {
        if (!requireLegalAccess()) return;
        loadLegalData();
        const contracts = applyLegalCompanyFilter(legalContracts);
        const cases = applyLegalCompanyFilter(legalCases);
        const compliance = applyLegalCompanyFilter(legalCompliance);
        const openCases = cases.filter(function(c) {
            return c.status === 'open' || c.status === 'court' || c.status === 'mediation';
        }).length;
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة للطباعة/PDF.'); return; }
        let body = '<h1>تقرير الشؤون القانونية — نبراس</h1><p>عقود: ' + contracts.length +
            ' · قضايا نشطة: ' + openCases + ' · امتثال: ' + compliance.length + '</p>';
        body += '<h2>العقود</h2><table><tr><th>المرجع</th><th>العنوان</th><th>الحالة</th><th>النوع</th></tr>';
        contracts.slice(0, 40).forEach(function(c) {
            body += '<tr><td>' + esc(c.refNo || c.id) + '</td><td>' + esc(c.titleAr || c.partyAr) + '</td><td>' + esc(c.status) + '</td><td>' + esc(c.type) + '</td></tr>';
        });
        body += '</table><h2>القضايا</h2><table><tr><th>المرجع</th><th>الموضوع</th><th>الحالة</th><th>النوع</th></tr>';
        cases.slice(0, 40).forEach(function(c) {
            body += '<tr><td>' + esc(c.refNo || c.id) + '</td><td>' + esc(c.subjectAr || c.titleAr) + '</td><td>' + esc(c.status) + '</td><td>' + esc(c.type) + '</td></tr>';
        });
        body += '</table><p class="foot">مستند داخلي — Legal · نبراس</p>';
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>نبراس Legal</title>' +
            '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#1a365d}h1{font-size:18px}h2{font-size:14px;margin-top:20px}' +
            'table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border:1px solid #ccc;padding:6px;text-align:right}th{background:#e8f0f8}.foot{margin-top:24px;font-size:10px;color:#666}</style></head><body>');
        w.document.write(body);
        w.document.write('</body></html>');
        w.document.close();
        w.print();
        legalAudit('تقرير Legal PDF', 'عقود ' + contracts.length);
    }

    global.openLegalPlatform = openLegalPlatform;
    global.closeLegalWorkspace = closeLegalWorkspace;
    global.switchLegalTab = switchLegalTab;
    global.setLegalCompanyFilter = setLegalCompanyFilter;
    global.getLegalAdminScope = getLegalAdminScope;
    global.openLegalEditor = openLegalEditor;
    global.cancelLegalEditor = cancelLegalEditor;
    global.saveLegalContract = saveLegalContract;
    global.saveLegalCase = saveLegalCase;
    global.saveLegalCompliance = saveLegalCompliance;
    global.saveLegalPolicy = saveLegalPolicy;
    global.saveLegalRental = saveLegalRental;
    global.saveLegalCorrespondence = saveLegalCorrespondence;
    global.deleteLegalRecord = deleteLegalRecord;
    global.canAccessLegalPlatform = canAccessLegal;
    global.isStrictLegalUser = isStrictLegalUser;
    global.loadLegalData = loadLegalData;
    global.getLegalContracts = function() { loadLegalData(); return legalContracts; };
    global.getLegalCases = function() { loadLegalData(); return legalCases; };
    global.getLegalCompliance = function() { loadLegalData(); return legalCompliance; };
    global.getLegalPolicies = function() { loadLegalData(); return legalPolicies; };
    global.getLegalCorrespondence = function() { loadLegalData(); return legalCorrespondence; };
    global.getLegalRentals = function() { loadLegalData(); return legalRentals; };
    global.getLegalActivity = function() { loadLegalData(); return legalActivity; };
    global.setLegalContractsFromCloud = setLegalContractsFromCloud;
    global.setLegalCasesFromCloud = setLegalCasesFromCloud;
    global.setLegalComplianceFromCloud = setLegalComplianceFromCloud;
    global.setLegalPoliciesFromCloud = setLegalPoliciesFromCloud;
    global.setLegalCorrespondenceFromCloud = setLegalCorrespondenceFromCloud;
    global.setLegalActivityFromCloud = setLegalActivityFromCloud;
    global.setLegalRentalsFromCloud = setLegalRentalsFromCloud;
    global.setLegalNotifSettingsFromCloud = setLegalNotifSettingsFromCloud;
    global.getLegalNotifSettings = getLegalNotifSettings;
    global.legalReadAttachment = legalReadAttachment;
    global.viewLegalAttachment = viewLegalAttachment;
    global.sendLegalRentalReminder = sendLegalRentalReminder;
    global.processLegalExpiryReminders = processLegalExpiryReminders;
    global.applyLegalOnlyDashboard = applyLegalOnlyDashboard;
    global.renderLegalPlatformPanelSafe = renderLegalPlatformPanelSafe;
    global.exportLegalPdf = exportLegalPdf;

})(typeof window !== 'undefined' ? window : globalThis);
