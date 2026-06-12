/**
 * نبراس HCM — إدارة شركات متعددة (نبراس + شركاء مثل أمواج اللدائن)
 * سجل تجاري · ضريبي · موظفون · سيارات · لوحات مستقلة لكل شركة
 */
(function(global) {
    'use strict';

    const HR_COMPANIES_KEY = 'nebrasHrCompanies';
    const DEFAULT_HR_COMPANY_ID = 'comp-nebras';

    const HR_COMPANY_TYPES = {
        primary: 'الشركة الأم — نبراس',
        partner: 'شركة شريكة / صديقة',
        subsidiary: 'شركة تابعة'
    };

    const HR_COMPANY_STATUS = {
        active: { label: 'نشطة', tag: 'erp-tag--ok' },
        suspended: { label: 'موقوفة', tag: '' },
        archived: { label: 'مؤرشفة', tag: 'erp-tag--danger' }
    };

    let hrPartnerCompanies = [];
    let hrCompanyFilter = '';
    let hrCompanyEditorId = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hrField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function canManageHrCompanies() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof isStrictHrUser === 'function' && isStrictHrUser()) return true;
        return false;
    }

    function getDefaultHrCompanyId() {
        return DEFAULT_HR_COMPANY_ID;
    }

    function ensureBuiltinHrCompaniesSeed() {
        if (hrPartnerCompanies.length) return;
        const now = new Date().toISOString().slice(0, 10);
        hrPartnerCompanies = [{
            id: DEFAULT_HR_COMPANY_ID,
            type: 'primary',
            nameAr: 'مصنع نبراس للبلاستيك WPC',
            nameEn: 'Nebras Plastic Factory WPC',
            crNumber: '',
            taxNumber: '',
            unifiedNumber: '',
            address: 'القصيم — المملكة العربية السعودية',
            city: 'القصيم',
            region: 'القصيم',
            phone: '',
            email: '',
            website: 'https://www.nebrasplasticcompany.com',
            managerName: '',
            managerPhone: '',
            activityDescription: 'تصنيع أبواب ومنتجات WPC والبلاستيك',
            notes: 'الشركة الأم — تُدار من منصة نبراس الداخلية',
            status: 'active',
            isPrimary: true,
            createdAt: now,
            updatedAt: now
        }];
        try { localStorage.setItem(HR_COMPANIES_KEY, JSON.stringify(hrPartnerCompanies)); } catch (e) { /* ignore */ }
    }

    function loadHrCompaniesData() {
        try {
            const raw = localStorage.getItem(HR_COMPANIES_KEY);
            hrPartnerCompanies = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(hrPartnerCompanies)) hrPartnerCompanies = [];
        } catch (e) { hrPartnerCompanies = []; }
        ensureBuiltinHrCompaniesSeed();
        return hrPartnerCompanies;
    }

    function saveHrCompaniesData() {
        try { localStorage.setItem(HR_COMPANIES_KEY, JSON.stringify(hrPartnerCompanies)); } catch (e) { console.warn('HR companies save', e); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function setHrCompaniesFromCloud(v) {
        hrPartnerCompanies = Array.isArray(v) ? v : [];
        if (!hrPartnerCompanies.length) ensureBuiltinHrCompaniesSeed();
        else {
            try { localStorage.setItem(HR_COMPANIES_KEY, JSON.stringify(hrPartnerCompanies)); } catch (e) { /* ignore */ }
        }
    }

    function getHrCompanies() {
        loadHrCompaniesData();
        return hrPartnerCompanies.slice();
    }

    function getActiveHrCompanies() {
        return getHrCompanies().filter(function(c) { return c.status === 'active' || c.isPrimary; });
    }

    function getHrCompanyById(id) {
        if (!id) return null;
        return getHrCompanies().find(function(c) { return c.id === id; }) || null;
    }

    function resolveHrCompanyLabel(id) {
        if (!id || id === DEFAULT_HR_COMPANY_ID) {
            const hit = getHrCompanyById(DEFAULT_HR_COMPANY_ID);
            return hit ? hit.nameAr : 'مصنع نبراس';
        }
        const c = getHrCompanyById(id);
        return c ? c.nameAr : String(id);
    }

    function resolveRecordCompanyId(record) {
        if (!record) return DEFAULT_HR_COMPANY_ID;
        return String(record.companyId || DEFAULT_HR_COMPANY_ID);
    }

    function matchesHrCompanyFilter(record) {
        if (!hrCompanyFilter) return true;
        return resolveRecordCompanyId(record) === String(hrCompanyFilter);
    }

    function applyHrCompanyFilter(list) {
        if (!hrCompanyFilter) return list;
        return list.filter(matchesHrCompanyFilter);
    }

    function migrateHrRecordsCompanyId() {
        if (typeof loadHrData !== 'function') return;
        loadHrData();
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        let changed = false;
        emps.forEach(function(e) {
            if (!e.companyId) { e.companyId = DEFAULT_HR_COMPANY_ID; changed = true; }
        });
        vehs.forEach(function(v) {
            if (!v.companyId) { v.companyId = DEFAULT_HR_COMPANY_ID; changed = true; }
        });
        if (changed && typeof saveHrData === 'function') saveHrData();
    }

    function setHrCompanyFilter(val) {
        hrCompanyFilter = val || '';
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function companySelectHtml(selectedId, includeAll) {
        const opts = [];
        if (includeAll) {
            opts.push('<option value=""' + (!selectedId ? ' selected' : '') + '>كل الشركات</option>');
        }
        getActiveHrCompanies().forEach(function(c) {
            opts.push('<option value="' + esc(c.id) + '"' + (String(selectedId) === String(c.id) ? ' selected' : '') + '>' +
                esc(c.nameAr) + (c.type === 'partner' ? ' (شريكة)' : '') + '</option>');
        });
        return opts.join('');
    }

    function renderHrCompanyFilterToolbar() {
        if (!canManageHrCompanies()) return '';
        const companies = getActiveHrCompanies();
        if (companies.length < 2) return '';
        const opts = '<option value=""' + (!hrCompanyFilter ? ' selected' : '') + '>كل الشركات (' + companies.length + ')</option>' +
            companies.map(function(c) {
                return '<option value="' + esc(c.id) + '"' + (String(hrCompanyFilter) === String(c.id) ? ' selected' : '') + '>' +
                    esc(c.nameAr) + '</option>';
            }).join('');
        const label = hrCompanyFilter ? resolveHrCompanyLabel(hrCompanyFilter) : 'كل الشركات';
        return '<label class="nebras-field hr-company-filter"><span><i class="fas fa-building"></i> الشركة</span>' +
            '<select onchange="setHrCompanyFilter(this.value)" title="' + esc(label) + '">' + opts + '</select></label>';
    }

    function countHrCompanyStats(companyId) {
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        const tracking = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
        const scopedEmps = emps.filter(function(e) { return resolveRecordCompanyId(e) === companyId; });
        const scopedVehs = vehs.filter(function(v) { return resolveRecordCompanyId(v) === companyId; });
        const empIds = scopedEmps.map(function(e) { return e.id; });
        const onRoad = tracking.filter(function(t) {
            if (t.status !== 'on_road') return false;
            const veh = vehs.find(function(v) { return v.id === t.vehicleId; });
            if (veh && resolveRecordCompanyId(veh) === companyId) return true;
            if (t.driverEmployeeId && empIds.indexOf(t.driverEmployeeId) >= 0) return true;
            return false;
        }).length;
        const saud = typeof calcSaudizationStats === 'function'
            ? calcSaudizationStats(scopedEmps.filter(function(e) { return e.status === 'active' || e.status === 'on_leave'; }))
            : { pct: 0 };
        return {
            employees: scopedEmps.length,
            active: scopedEmps.filter(function(e) { return e.status === 'active'; }).length,
            vehicles: scopedVehs.length,
            onRoad: onRoad,
            saudPct: saud.pct || 0
        };
    }

    function renderHrMultiCompanyOverview() {
        if (!canManageHrCompanies() || hrCompanyFilter) return '';
        const companies = getActiveHrCompanies();
        if (companies.length < 2) return '';
        const cards = companies.map(function(c) {
            const st = countHrCompanyStats(c.id);
            const typeLabel = HR_COMPANY_TYPES[c.type] || c.type;
            return '<article class="hr-company-card' + (c.isPrimary ? ' hr-company-card--primary' : '') + '">' +
                '<div class="hr-company-card-head">' +
                    '<span class="hr-company-type"><i class="fas fa-' + (c.isPrimary ? 'industry' : 'handshake') + '"></i> ' + esc(typeLabel) + '</span>' +
                    '<strong>' + esc(c.nameAr) + '</strong>' +
                    (c.crNumber ? '<small>س.ت: ' + esc(c.crNumber) + '</small>' : '<small class="hr-company-pending">أدخلي السجل التجاري</small>') +
                '</div>' +
                '<div class="hr-company-kpis">' +
                    '<span><strong>' + st.employees + '</strong> موظف</span>' +
                    '<span><strong>' + st.vehicles + '</strong> سيارة</span>' +
                    '<span><strong>' + st.onRoad + '</strong> خارجة</span>' +
                    '<span><strong>' + st.saudPct + '%</strong> سعودة</span>' +
                '</div>' +
                '<div class="hr-company-card-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="setHrCompanyFilter(\'' + esc(c.id) + '\');switchHrTab(\'dashboard\')"><i class="fas fa-gauge-high"></i> لوحة ' + esc(c.nameAr.split(' ')[0]) + '</button>' +
                    '<button type="button" class="erp-tag" onclick="setHrCompanyFilter(\'' + esc(c.id) + '\');switchHrTab(\'employees\')"><i class="fas fa-users"></i> الموظفون</button>' +
                '</div>' +
            '</article>';
        }).join('');
        return '<div class="hr-multi-company-block">' +
            '<div class="hr-multi-company-head">' +
                '<h4><i class="fas fa-building-circle-check"></i> مجموعة نبراس — شركات متعددة تحت إدارة HR</h4>' +
                '<p>نبراس مسؤولة عن مصنعها وعن الشركات الشريكة (مثل أمواج اللدائن). اختاري شركة لإدارة موظفيها وسياراتها بشكل مستقل.</p>' +
                '<button type="button" class="nebras-users-btn" onclick="switchHrTab(\'companies\')"><i class="fas fa-plus"></i> تسجيل شركة شريكة جديدة</button>' +
            '</div>' +
            '<div class="hr-company-grid">' + cards + '</div>' +
        '</div>';
    }

    function renderHrCompanyBadge(companyId) {
        const c = getHrCompanyById(companyId || DEFAULT_HR_COMPANY_ID);
        if (!c || (c.isPrimary && !hrCompanyFilter)) return '';
        const cls = c.type === 'partner' ? 'hr-company-badge--partner' : 'hr-company-badge--primary';
        return '<span class="hr-company-badge ' + cls + '"><i class="fas fa-building"></i> ' + esc(c.nameAr) + '</span>';
    }

    function renderHrCompaniesPanel() {
        if (!canManageHrCompanies()) {
            return '<div class="hr-panel is-active"><p class="erp-empty">سجل الشركات — لمدير HR أو الإدارة الرئيسية فقط.</p></div>';
        }
        loadHrCompaniesData();
        const editor = hrCompanyEditorId != null ? renderHrCompanyEditor(hrCompanyEditorId) : '';
        const rows = hrPartnerCompanies.map(function(c) {
            const st = HR_COMPANY_STATUS[c.status] || HR_COMPANY_STATUS.active;
            const stats = countHrCompanyStats(c.id);
            return '<tr>' +
                '<td><strong>' + esc(c.nameAr) + '</strong><br><small>' + esc(c.nameEn || '') + '</small>' +
                    (c.isPrimary ? ' <span class="erp-tag erp-tag--ok">أم</span>' : ' <span class="erp-tag">شريكة</span>') + '</td>' +
                '<td>' + esc(c.crNumber || '—') + '<br><small>ضريبي: ' + esc(c.taxNumber || '—') + '</small></td>' +
                '<td>' + esc(c.city || '—') + '<br><small>' + esc(c.managerName || '—') + '</small></td>' +
                '<td><span class="erp-tag ' + st.tag + '">' + st.label + '</span><br>' +
                    '<small>' + stats.employees + ' موظف · ' + stats.vehicles + ' سيارة</small></td>' +
                '<td>' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrCompanyEditor(\'' + esc(c.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                    (c.isPrimary ? '' : '<button type="button" class="erp-tag" onclick="deleteHrCompany(\'' + esc(c.id) + '\')"><i class="fas fa-trash"></i></button> ') +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="setHrCompanyFilter(\'' + esc(c.id) + '\');switchHrTab(\'employees\')"><i class="fas fa-users"></i> إدارة</button>' +
                '</td></tr>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<div class="hr-companies-hero">' +
                '<i class="fas fa-building-circle-check"></i>' +
                '<div><strong>سجل الشركات — نبراس + الشركاء</strong>' +
                '<p>سجّلي كل شركة باسمها التجاري ورقمها الضريبي والسجل التجاري. كل شركة لها موظفون وسيارات ولوحة مستقلة داخل نفس برنامج HR.</p></div>' +
            '</div>' +
            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrCompanyEditor(null)"><i class="fas fa-handshake"></i> شركة شريكة جديدة</button>' +
            '</div>' +
            editor +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
                '<th>الشركة</th><th>س.ت / ضريبي</th><th>المدينة / المسؤول</th><th>الحالة / الإحصاء</th><th>إجراء</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="erp-empty">لا شركات</td></tr>') + '</tbody></table></div>' +
            '<details class="hr-companies-guide"><summary><i class="fas fa-circle-info"></i> كيف تُنظّم الشركات الشريكة؟</summary>' +
                '<ol>' +
                    '<li>أضيفي الشركة هنا (مثال: <strong>أمواج اللدائن للبلاستيك والمواد الخام</strong>) مع السجل التجاري والرقم الضريبي.</li>' +
                    '<li>من شريط الأدوات اختاري الشركة ثم أضيفي موظفيها وعمالها وسائقيها.</li>' +
                    '<li>كل سجل يُربط تلقائياً بالشركة المختارة — لوحات KPI وتقارير السعودة والأسطول منفصلة.</li>' +
                    '<li>GPS والتتبع يعمل لكل شركة حسب سياراتها وIMEI المُدخل.</li>' +
                '</ol></details>' +
        '</div>';
    }

    function renderHrCompanyEditor(id) {
        const c = id ? getHrCompanyById(id) : {};
        const isEdit = !!id;
        const typeOpts = Object.keys(HR_COMPANY_TYPES).filter(function(k) { return !isEdit || !c.isPrimary || k === 'primary'; }).map(function(k) {
            return '<option value="' + k + '"' + ((c.type || 'partner') === k ? ' selected' : '') + '>' + HR_COMPANY_TYPES[k] + '</option>';
        }).join('');
        const statusOpts = Object.keys(HR_COMPANY_STATUS).map(function(k) {
            return '<option value="' + k + '"' + ((c.status || 'active') === k ? ' selected' : '') + '>' + HR_COMPANY_STATUS[k].label + '</option>';
        }).join('');

        return '<div class="hr-editor-overlay" id="hr-company-editor">' +
            '<h4><i class="fas fa-building"></i> ' + (isEdit ? 'تعديل شركة' : 'شركة شريكة / صديقة جديدة') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>اسم الشركة (عربي) *</span><input id="hc-name-ar" value="' + esc(c.nameAr || '') + '" placeholder="أمواج اللدائن للبلاستيك والمواد الخام"></label>' +
                '<label class="nebras-field"><span>اسم الشركة (إنجليزي)</span><input id="hc-name-en" value="' + esc(c.nameEn || '') + '"></label>' +
                '<label class="nebras-field"><span>نوع العلاقة</span><select id="hc-type"' + (c.isPrimary ? ' disabled' : '') + '>' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>السجل التجاري *</span><input id="hc-cr" value="' + esc(c.crNumber || '') + '" placeholder="1010xxxxxx"></label>' +
                '<label class="nebras-field"><span>الرقم الضريبي (VAT)</span><input id="hc-tax" value="' + esc(c.taxNumber || '') + '" placeholder="300xxxxxxxxxx003"></label>' +
                '<label class="nebras-field"><span>الرقم الموحد (700)</span><input id="hc-unified" value="' + esc(c.unifiedNumber || '') + '"></label>' +
                '<label class="nebras-field"><span>المدينة</span><input id="hc-city" value="' + esc(c.city || '') + '"></label>' +
                '<label class="nebras-field"><span>المنطقة</span><input id="hc-region" value="' + esc(c.region || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>العنوان</span><input id="hc-address" value="' + esc(c.address || '') + '"></label>' +
                '<label class="nebras-field"><span>هاتف الشركة</span><input id="hc-phone" value="' + esc(c.phone || '') + '"></label>' +
                '<label class="nebras-field"><span>البريد</span><input id="hc-email" type="email" value="' + esc(c.email || '') + '"></label>' +
                '<label class="nebras-field"><span>الموقع</span><input id="hc-website" value="' + esc(c.website || '') + '"></label>' +
                '<label class="nebras-field"><span>المسؤول / المدير</span><input id="hc-manager" value="' + esc(c.managerName || '') + '"></label>' +
                '<label class="nebras-field"><span>جوال المسؤول</span><input id="hc-manager-phone" value="' + esc(c.managerPhone || '') + '"></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="hc-status"' + (c.isPrimary ? ' disabled' : '') + '>' + statusOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>نشاط الشركة</span><input id="hc-activity" value="' + esc(c.activityDescription || '') + '" placeholder="بلاستيك · مواد خام · تجارة…"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات داخلية</span><input id="hc-notes" value="' + esc(c.notes || '') + '"></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrCompany(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ ورفع للسحابة</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrCompanyEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function openHrCompanyEditor(id) {
        if (!canManageHrCompanies()) return;
        hrCompanyEditorId = id;
        if (typeof switchHrTab === 'function') switchHrTab('companies');
        else if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function cancelHrCompanyEditor() {
        hrCompanyEditorId = null;
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function saveHrCompany(id) {
        if (!canManageHrCompanies()) return;
        const nameAr = hrField('hc-name-ar');
        const crNumber = hrField('hc-cr');
        if (!nameAr) { alert('اسم الشركة مطلوب.'); return; }
        if (!id && !crNumber) { alert('السجل التجاري مطلوب للشركات الشريكة.'); return; }

        const now = new Date().toISOString().slice(0, 10);
        const existing = id ? getHrCompanyById(id) : null;
        const record = {
            id: id || ('comp-' + Date.now()),
            type: existing && existing.isPrimary ? 'primary' : (hrField('hc-type') || 'partner'),
            nameAr: nameAr,
            nameEn: hrField('hc-name-en'),
            crNumber: crNumber,
            taxNumber: hrField('hc-tax'),
            unifiedNumber: hrField('hc-unified'),
            address: hrField('hc-address'),
            city: hrField('hc-city'),
            region: hrField('hc-region'),
            phone: hrField('hc-phone'),
            email: hrField('hc-email'),
            website: hrField('hc-website'),
            managerName: hrField('hc-manager'),
            managerPhone: hrField('hc-manager-phone'),
            activityDescription: hrField('hc-activity'),
            notes: hrField('hc-notes'),
            status: existing && existing.isPrimary ? 'active' : (hrField('hc-status') || 'active'),
            isPrimary: !!(existing && existing.isPrimary),
            updatedAt: now
        };

        if (id) {
            const idx = hrPartnerCompanies.findIndex(function(c) { return c.id === id; });
            if (idx >= 0) {
                record.createdAt = hrPartnerCompanies[idx].createdAt || now;
                hrPartnerCompanies[idx] = record;
            }
        } else {
            record.createdAt = now;
            hrPartnerCompanies.push(record);
        }
        saveHrCompaniesData();
        hrCompanyEditorId = null;
        if (typeof hrAudit === 'function') hrAudit('HR شركة', (id ? 'تعديل ' : 'إضافة ') + nameAr);
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
        alert('تم حفظ بيانات الشركة: ' + nameAr);
    }

    function deleteHrCompany(id) {
        if (!canManageHrCompanies()) return;
        const c = getHrCompanyById(id);
        if (!c || c.isPrimary) return;
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const linked = emps.filter(function(e) { return resolveRecordCompanyId(e) === id; }).length;
        if (linked && !confirm('الشركة مرتبطة بـ ' + linked + ' موظف. حذف الشركة؟ (لن يُحذف الموظفون)')) return;
        if (!linked && !confirm('حذف ' + c.nameAr + ' من السجل؟')) return;
        hrPartnerCompanies = hrPartnerCompanies.filter(function(x) { return x.id !== id; });
        if (hrCompanyFilter === id) hrCompanyFilter = '';
        saveHrCompaniesData();
        if (typeof hrAudit === 'function') hrAudit('HR حذف شركة', c.nameAr);
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function getHrCompanyIdForNewRecord() {
        if (hrCompanyFilter) return hrCompanyFilter;
        return DEFAULT_HR_COMPANY_ID;
    }

    function renderHrCompanyFieldInForm(selectedId) {
        if (!canManageHrCompanies()) return '';
        return '<label class="nebras-field"><span>الشركة التابعة *</span><select id="he-company">' +
            companySelectHtml(selectedId || getHrCompanyIdForNewRecord(), false) + '</select></label>';
    }

    function renderHrCompanyFieldInVehicleForm(selectedId) {
        if (!canManageHrCompanies()) return '';
        return '<label class="nebras-field"><span>الشركة التابعة *</span><select id="hv-company">' +
            companySelectHtml(selectedId || getHrCompanyIdForNewRecord(), false) + '</select></label>';
    }

    global.loadHrCompaniesData = loadHrCompaniesData;
    global.saveHrCompaniesData = saveHrCompaniesData;
    global.setHrCompaniesFromCloud = setHrCompaniesFromCloud;
    global.getHrCompanies = getHrCompanies;
    global.getActiveHrCompanies = getActiveHrCompanies;
    global.getHrCompanyById = getHrCompanyById;
    global.getDefaultHrCompanyId = getDefaultHrCompanyId;
    global.resolveHrCompanyLabel = resolveHrCompanyLabel;
    global.resolveRecordCompanyId = resolveRecordCompanyId;
    global.applyHrCompanyFilter = applyHrCompanyFilter;
    global.matchesHrCompanyFilter = matchesHrCompanyFilter;
    global.migrateHrRecordsCompanyId = migrateHrRecordsCompanyId;
    global.setHrCompanyFilter = setHrCompanyFilter;
    global.getHrCompanyFilter = function() { return hrCompanyFilter; };
    global.companySelectHtml = companySelectHtml;
    global.renderHrCompanyFilterToolbar = renderHrCompanyFilterToolbar;
    global.renderHrMultiCompanyOverview = renderHrMultiCompanyOverview;
    global.renderHrCompanyBadge = renderHrCompanyBadge;
    global.renderHrCompaniesPanel = renderHrCompaniesPanel;
    global.openHrCompanyEditor = openHrCompanyEditor;
    global.cancelHrCompanyEditor = cancelHrCompanyEditor;
    global.saveHrCompany = saveHrCompany;
    global.deleteHrCompany = deleteHrCompany;
    global.getHrCompanyIdForNewRecord = getHrCompanyIdForNewRecord;
    global.renderHrCompanyFieldInForm = renderHrCompanyFieldInForm;
    global.renderHrCompanyFieldInVehicleForm = renderHrCompanyFieldInVehicleForm;
    global.canManageHrCompanies = canManageHrCompanies;
    global.countHrCompanyStats = countHrCompanyStats;

})(typeof window !== 'undefined' ? window : globalThis);
