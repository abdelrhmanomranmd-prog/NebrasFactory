/**
 * نبراس HR — مخالفات المرور لكل سائق · شركة · فرع
 * تتبع مثل Odoo Fleet / جسر — ربط بالموظف والسيارة والخصم من الراتب
 */
(function(global) {
    'use strict';

    const HR_VIOLATIONS_KEY = 'nebrasHrVehicleViolations';
    let hrViolations = [];

    const VIOLATION_STATUS = {
        pending: { label: 'معلّقة', tag: 'erp-tag--warn' },
        paid: { label: 'مدفوعة', tag: 'erp-tag--ok' },
        deducted: { label: 'مخصومة من الراتب', tag: 'erp-tag--ok' },
        disputed: { label: 'معترض عليها', tag: '' }
    };

    const VIOLATION_TYPES = {
        speed: 'سرعة زائدة',
        red_light: 'إشارة حمراء',
        parking: 'وقوف خاطئ',
        seatbelt: 'حزام أمان',
        phone: 'استخدام جوال',
        other: 'أخرى'
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hrNum(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function loadHrViolationsData() {
        try {
            const raw = localStorage.getItem(HR_VIOLATIONS_KEY);
            hrViolations = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(hrViolations)) hrViolations = [];
        } catch (e) { hrViolations = []; }
    }

    function saveHrViolationsData() {
        try { localStorage.setItem(HR_VIOLATIONS_KEY, JSON.stringify(hrViolations)); } catch (e) { /* ignore */ }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function filterHrViolations() {
        loadHrViolationsData();
        let list = hrViolations.slice();
        if (typeof applyHrScopeFilter === 'function') {
            list = applyHrScopeFilter(list, 'violation');
        }
        const companyId = typeof getHrCompanyFilter === 'function' ? getHrCompanyFilter() : '';
        if (companyId) list = list.filter(function(v) { return String(v.companyId || '') === String(companyId); });
        const q = (typeof hrSearchQuery !== 'undefined' ? hrSearchQuery : '').trim().toLowerCase();
        if (q) {
            list = list.filter(function(v) {
                return (v.driverName + ' ' + v.plateNo + ' ' + v.violationNo + ' ' + v.notes).toLowerCase().indexOf(q) >= 0;
            });
        }
        list.sort(function(a, b) { return String(b.violationDate || '').localeCompare(String(a.violationDate || '')); });
        return list;
    }

    function getHrViolationsSummary() {
        const list = filterHrViolations();
        const pending = list.filter(function(v) { return v.status === 'pending'; });
        const pendingAmt = pending.reduce(function(s, v) { return s + hrNum(v.amount); }, 0);
        return { total: list.length, pending: pending.length, pendingAmount: pendingAmt };
    }

    function renderHrViolationsPanel() {
        loadHrViolationsData();
        const list = filterHrViolations();
        const sum = getHrViolationsSummary();
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const scopedEmps = typeof applyHrScopeFilter === 'function' ? applyHrScopeFilter(emps.slice(), 'employee') : emps;
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        const empOpts = '<option value="">— اختر السائق —</option>' + scopedEmps.map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const vehOpts = '<option value="">— اختياري —</option>' + vehs.map(function(v) {
            return '<option value="' + esc(v.id) + '">' + esc(v.plateNo + ' — ' + (v.make || '')) + '</option>';
        }).join('');
        const branchOpts = typeof branchSelectHtml === 'function'
            ? branchSelectHtml('')
            : '<option value="hq">المقر الرئيسي</option>';
        const companyField = typeof renderHrCompanyFieldInForm === 'function' ? renderHrCompanyFieldInForm('') : '';
        const typeOpts = Object.keys(VIOLATION_TYPES).map(function(k) {
            return '<option value="' + k + '">' + VIOLATION_TYPES[k] + '</option>';
        }).join('');
        const statusOpts = Object.keys(VIOLATION_STATUS).map(function(k) {
            return '<option value="' + k + '">' + VIOLATION_STATUS[k].label + '</option>';
        }).join('');
        const today = new Date().toISOString().slice(0, 10);

        const rows = list.map(function(v) {
            const st = VIOLATION_STATUS[v.status] || VIOLATION_STATUS.pending;
            const coLabel = v.companyId && typeof resolveHrCompanyLabel === 'function'
                ? resolveHrCompanyLabel(v.companyId) : (v.companyId || '—');
            return '<tr>' +
                '<td>' + formatHrViolationDate(v.violationDate) + '</td>' +
                '<td><span class="plate-badge">' + esc(v.plateNo || '—') + '</span></td>' +
                '<td>' + esc(v.driverName || '—') + '</td>' +
                '<td>' + esc(coLabel) + '</td>' +
                '<td>' + esc(VIOLATION_TYPES[v.violationType] || v.violationType || '—') + '</td>' +
                '<td><strong>' + (typeof formatSar === 'function' ? formatSar(v.amount) : v.amount) + '</strong></td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="markHrViolationPaid(\'' + esc(v.id) + '\')"><i class="fas fa-check"></i></button>' +
                    '<button type="button" class="erp-tag" onclick="deleteHrViolation(\'' + esc(v.id) + '\')"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        }).join('');

        return '<div class="hr-panel is-active hr-violations-panel">' +
            '<p class="hr-platform-note"><i class="fas fa-traffic-light"></i> <strong>مخالفات المرور</strong> — لكل سائق في كل فرع وشركة (نبراس والشقيقة). ربط بالسيارة والموظف · تتبع الدفع والخصم من الراتب.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + sum.total + '</strong><span>إجمالي المخالفات</span></div>' +
                '<div class="hr-report-card hr-report-card--warn"><strong>' + sum.pending + '</strong><span>معلّقة</span></div>' +
                '<div class="hr-report-card hr-report-card--danger"><strong>' + (typeof formatSar === 'function' ? formatSar(sum.pendingAmount) : sum.pendingAmount) + '</strong><span>مبالغ معلّقة</span></div>' +
            '</div>' +
            '<div class="hr-editor-overlay hr-form-section-card">' +
                '<h4><i class="fas fa-plus-circle"></i> تسجيل مخالفة جديدة</h4>' +
                '<div class="erp-form-grid">' +
                    companyField +
                    '<label class="nebras-field"><span>رقم المخالفة</span><input id="hvv-no" placeholder="مثال: 4020xxxx"></label>' +
                    '<label class="nebras-field"><span>تاريخ المخالفة</span><input type="date" id="hvv-date" value="' + today + '"></label>' +
                    '<label class="nebras-field"><span>السائق (موظف)</span><select id="hvv-driver" onchange="hrViolationDriverChanged(this)">' + empOpts + '</select></label>' +
                    '<label class="nebras-field"><span>السيارة</span><select id="hvv-vehicle" onchange="hrViolationVehicleChanged(this)">' + vehOpts + '</select></label>' +
                    '<label class="nebras-field"><span>رقم اللوحة</span><input id="hvv-plate" placeholder="أ ب ج 1234"></label>' +
                    '<label class="nebras-field"><span>الفرع</span><select id="hvv-branch">' + branchOpts + '</select></label>' +
                    '<label class="nebras-field"><span>نوع المخالفة</span><select id="hvv-type">' + typeOpts + '</select></label>' +
                    '<label class="nebras-field"><span>المبلغ (ر.س)</span><input type="number" id="hvv-amount" min="0" step="0.01"></label>' +
                    '<label class="nebras-field"><span>الحالة</span><select id="hvv-status">' + statusOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الموقع</span><input id="hvv-location" placeholder="الرياض — طريق الملك فهد"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hvv-notes"></label>' +
                '</div>' +
                '<div class="erp-form-actions">' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrViolation()"><i class="fas fa-save"></i> حفظ المخالفة</button>' +
                    '<a href="https://www.absher.sa" target="_blank" rel="noopener" class="nebras-users-btn" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> أبشر — المرور</a>' +
                '</div>' +
            '</div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
                '<th>التاريخ</th><th>اللوحة</th><th>السائق</th><th>الشركة</th><th>النوع</th><th>المبلغ</th><th>الحالة</th><th></th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="8" class="erp-empty">لا مخالفات مسجّلة</td></tr>') + '</tbody></table></div>' +
        '</div>';
    }

    function formatHrViolationDate(d) {
        if (!d) return '—';
        if (typeof formatHrDate === 'function') return formatHrDate(d);
        return d;
    }

    function hrViolationDriverChanged(sel) {
        const empId = sel && sel.value;
        if (!empId || typeof getEmployeeById !== 'function') return;
        const emp = getEmployeeById(empId);
        if (!emp) return;
        const plate = document.getElementById('hvv-plate');
        const veh = document.getElementById('hvv-vehicle');
        const branch = document.getElementById('hvv-branch');
        if (branch && emp.branchId) branch.value = emp.branchId;
        if (emp.vehicleId && veh) {
            veh.value = emp.vehicleId;
            hrViolationVehicleChanged(veh);
        } else if (plate && !plate.value) {
            const v = typeof getVehicleById === 'function' ? getVehicleById(emp.vehicleId) : null;
            if (v) plate.value = v.plateNo || '';
        }
    }

    function hrViolationVehicleChanged(sel) {
        const vehId = sel && sel.value;
        if (!vehId || typeof getVehicleById !== 'function') return;
        const v = getVehicleById(vehId);
        const plate = document.getElementById('hvv-plate');
        if (v && plate) plate.value = v.plateNo || '';
    }

    function hrField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function saveHrViolation() {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        const driverId = hrField('hvv-driver');
        const plateNo = hrField('hvv-plate');
        const amount = hrNum(hrField('hvv-amount'));
        if (!driverId && !plateNo) { alert('اختر السائق أو أدخل رقم اللوحة.'); return; }
        if (!amount) { alert('أدخل مبلغ المخالفة.'); return; }
        const emp = driverId && typeof getEmployeeById === 'function' ? getEmployeeById(driverId) : null;
        const vehId = hrField('hvv-vehicle');
        const veh = vehId && typeof getVehicleById === 'function' ? getVehicleById(vehId) : null;
        const record = {
            id: 'viol-' + Date.now(),
            violationNo: hrField('hvv-no'),
            violationDate: hrField('hvv-date') || new Date().toISOString().slice(0, 10),
            driverEmployeeId: driverId || null,
            driverName: emp ? emp.nameAr : '',
            vehicleId: vehId || null,
            plateNo: plateNo || (veh ? veh.plateNo : ''),
            companyId: (document.getElementById('he-company') ? hrField('he-company') : '') ||
                (emp ? emp.companyId : '') ||
                (typeof getHrCompanyIdForNewRecord === 'function' ? getHrCompanyIdForNewRecord() : 'comp-nebras'),
            branchId: hrField('hvv-branch') || (emp ? emp.branchId : 'hq'),
            violationType: hrField('hvv-type') || 'other',
            amount: amount,
            status: hrField('hvv-status') || 'pending',
            location: hrField('hvv-location'),
            notes: hrField('hvv-notes'),
            createdAt: new Date().toISOString()
        };
        loadHrViolationsData();
        hrViolations.unshift(record);
        saveHrViolationsData();
        if (typeof hrAudit === 'function') hrAudit('HR مخالفة مرور', record.plateNo + ' — ' + record.driverName);
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
        alert('تم تسجيل المخالفة بنجاح.');
    }

    function markHrViolationPaid(id) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        loadHrViolationsData();
        const v = hrViolations.find(function(x) { return x.id === id; });
        if (!v) return;
        v.status = v.status === 'paid' ? 'pending' : 'paid';
        v.paidAt = v.status === 'paid' ? new Date().toISOString().slice(0, 10) : '';
        saveHrViolationsData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function deleteHrViolation(id) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        if (!confirm('حذف سجل المخالفة؟')) return;
        loadHrViolationsData();
        hrViolations = hrViolations.filter(function(x) { return x.id !== id; });
        saveHrViolationsData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function setHrViolationsFromCloud(v) {
        hrViolations = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_VIOLATIONS_KEY, JSON.stringify(hrViolations)); } catch (e) { /* ignore */ }
    }

    function getHrViolationsTabExtension() {
        return { id: 'violations', icon: 'fas fa-traffic-light', label: 'مخالفات المرور', group: 'إدارة الأسطول' };
    }

    loadHrViolationsData();

    global.renderHrViolationsPanel = renderHrViolationsPanel;
    global.saveHrViolation = saveHrViolation;
    global.markHrViolationPaid = markHrViolationPaid;
    global.deleteHrViolation = deleteHrViolation;
    global.hrViolationDriverChanged = hrViolationDriverChanged;
    global.hrViolationVehicleChanged = hrViolationVehicleChanged;
    global.getHrViolations = function() { loadHrViolationsData(); return hrViolations; };
    global.setHrViolationsFromCloud = setHrViolationsFromCloud;
    global.getHrViolationsTabExtension = getHrViolationsTabExtension;
    global.getHrViolationsSummary = getHrViolationsSummary;
    global.loadHrViolationsData = loadHrViolationsData;

})(typeof window !== 'undefined' ? window : globalThis);
