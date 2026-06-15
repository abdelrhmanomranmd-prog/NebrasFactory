/**
 * نبراس HR — سلف الموظفين بأقساط (Jisr/Odoo style)
 * خصم على N شهر · تأجيل شهر (راتب كامل) · رصيد متبقي · ربط بمسير الرواتب
 */
(function(global) {
    'use strict';

    const HR_ADVANCES_KEY = 'nebrasHrAdvances';
    let hrAdvances = [];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hrNum(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function addMonths(ym, n) {
        const p = String(ym || '').split('-');
        if (p.length < 2) return ym;
        let y = parseInt(p[0], 10);
        let m = parseInt(p[1], 10) - 1 + n;
        y += Math.floor(m / 12);
        m = ((m % 12) + 12) % 12;
        return y + '-' + String(m + 1).padStart(2, '0');
    }

    function loadHrAdvancesData() {
        try {
            const raw = localStorage.getItem(HR_ADVANCES_KEY);
            hrAdvances = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(hrAdvances)) hrAdvances = [];
        } catch (e) { hrAdvances = []; }
    }

    function saveHrAdvancesData() {
        try { localStorage.setItem(HR_ADVANCES_KEY, JSON.stringify(hrAdvances)); } catch (e) { /* ignore */ }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function getScopedEmployeeIds() {
        const all = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const scoped = typeof applyHrScopeFilter === 'function' ? applyHrScopeFilter(all.slice(), 'employee') : all;
        return scoped.map(function(e) { return e.id; });
    }

    function ensureAdvanceSchedule(adv) {
        if (!adv || adv.status === 'closed') return adv;
        if (adv.schedule && adv.schedule.length) return adv;
        const count = Math.max(1, parseInt(adv.installmentCount, 10) || 1);
        const start = adv.startMonth || new Date().toISOString().slice(0, 7);
        const per = adv.installmentAmount > 0
            ? hrNum(adv.installmentAmount)
            : Math.round((hrNum(adv.principal) / count) * 100) / 100;
        adv.installmentAmount = per;
        adv.schedule = [];
        for (let i = 0; i < count; i++) {
            adv.schedule.push({
                month: addMonths(start, i),
                amount: per,
                status: 'pending'
            });
        }
        return adv;
    }

    function isAdvanceMonthDeferred(adv, month) {
        if (!adv) return false;
        if ((adv.skippedMonths || []).indexOf(month) >= 0) return true;
        const slot = (adv.schedule || []).find(function(s) { return s.month === month; });
        return !!(slot && (slot.status === 'skipped' || slot.status === 'postponed'));
    }

    function extendAdvanceScheduleForPostpone(adv, slot) {
        if (!adv || !slot) return;
        let lastMonth = adv.startMonth || slot.month;
        (adv.schedule || []).forEach(function(s) {
            if (s.month > lastMonth) lastMonth = s.month;
        });
        let newMonth = addMonths(lastMonth, 1);
        while ((adv.schedule || []).find(function(s) { return s.month === newMonth; })) {
            newMonth = addMonths(newMonth, 1);
        }
        adv.schedule.push({
            month: newMonth,
            amount: slot.amount,
            status: 'pending',
            postponedFrom: slot.month
        });
        adv.installmentCount = Math.max(adv.installmentCount || 0, adv.schedule.length);
    }

    function computeHrAdvanceDeduction(employeeId, month) {
        loadHrAdvancesData();
        let total = 0;
        const lines = [];
        const teamIds = getScopedEmployeeIds();
        hrAdvances.forEach(function(adv) {
            if (!adv || adv.status === 'closed' || adv.employeeId !== employeeId) return;
            if (teamIds.indexOf(employeeId) < 0 && typeof applyHrScopeFilter === 'function') return;
            ensureAdvanceSchedule(adv);
            if (isAdvanceMonthDeferred(adv, month)) return;
            const slot = (adv.schedule || []).find(function(s) { return s.month === month; });
            if (slot) {
                if (slot.status === 'skipped' || slot.status === 'postponed' || slot.status === 'deducted') return;
                const amt = Math.min(hrNum(slot.amount), hrNum(adv.remaining));
                if (amt > 0) {
                    total += amt;
                    lines.push({
                        type: 'advance',
                        label: 'سلفة — قسط ' + (adv.reference || adv.id),
                        amount: amt,
                        note: 'متبقي ' + hrNum(adv.remaining) + ' ر.س',
                        advanceId: adv.id
                    });
                }
                return;
            }
            if (month < (adv.startMonth || month)) return;
            if (hrNum(adv.remaining) <= 0) return;
            const amt = Math.min(hrNum(adv.installmentAmount), hrNum(adv.remaining));
            if (amt > 0) {
                total += amt;
                lines.push({
                    type: 'advance',
                    label: 'سلفة — قسط',
                    amount: amt,
                    note: adv.note || '',
                    advanceId: adv.id
                });
            }
        });
        return { amount: Math.round(total * 100) / 100, lines: lines };
    }

    function applyHrAdvancePayrollDeductions(month, payrollItems) {
        loadHrAdvancesData();
        if (!payrollItems || !payrollItems.length) return;
        payrollItems.forEach(function(item) {
            if (!item || !item.employeeId) return;
            (item.dedLines || []).forEach(function(line) {
                if (!line.advanceId) return;
                const adv = hrAdvances.find(function(a) { return a.id === line.advanceId; });
                if (!adv || adv.status === 'closed') return;
                ensureAdvanceSchedule(adv);
                const amt = hrNum(line.amount);
                adv.remaining = Math.max(0, Math.round((hrNum(adv.remaining) - amt) * 100) / 100);
                adv.installmentsPaid = (adv.installmentsPaid || 0) + 1;
                const slot = (adv.schedule || []).find(function(s) { return s.month === month; });
                if (slot) slot.status = 'deducted';
                if (hrNum(adv.remaining) <= 0) adv.status = 'closed';
            });
        });
        saveHrAdvancesData();
    }

    function formatSkippedMonths(adv) {
        const months = (adv.skippedMonths || []).slice();
        if (!months.length) return '—';
        return months.map(function(m) {
            return '<span class="erp-tag erp-tag--accent" title="راتب كامل — خصم مؤجّل">' + esc(m) + '</span>';
        }).join(' ');
    }

    function renderHrAdvancesPanel() {
        loadHrAdvancesData();
        const teamIds = getScopedEmployeeIds();
        const list = hrAdvances.filter(function(a) { return teamIds.indexOf(a.employeeId) >= 0; });
        const empOpts = (typeof applyHrScopeFilter === 'function'
            ? applyHrScopeFilter((typeof getHrEmployees === 'function' ? getHrEmployees() : []).slice(), 'employee')
            : (typeof getHrEmployees === 'function' ? getHrEmployees() : [])
        ).map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const monthNow = new Date().toISOString().slice(0, 7);
        const rows = list.map(function(a) {
            ensureAdvanceSchedule(a);
            const st = a.status === 'closed' ? '<span class="erp-tag erp-tag--ok">مغلقة</span>' : '<span class="erp-tag erp-tag--accent">نشطة</span>';
            const postponeBtn = a.status !== 'closed'
                ? '<button type="button" class="erp-tag erp-tag--action" onclick="postponeHrAdvanceMonthFor(\'' + esc(a.id) + '\')" title="تأجيل خصم شهر — الموظف يقبض راتبه كاملاً"><i class="fas fa-calendar-xmark"></i> تأجيل خصم</button>'
                : '';
            return '<tr><td>' + esc(a.employeeName) + '</td>' +
                '<td><strong>' + hrNum(a.principal).toLocaleString('ar-SA') + '</strong></td>' +
                '<td>' + hrNum(a.remaining).toLocaleString('ar-SA') + '</td>' +
                '<td>' + esc(a.installmentCount || '—') + ' قسط × ' + hrNum(a.installmentAmount).toLocaleString('ar-SA') + '</td>' +
                '<td>' + esc(a.startMonth || '') + '</td>' +
                '<td>' + formatSkippedMonths(a) + '</td>' +
                '<td>' + st + '</td>' +
                '<td>' + postponeBtn +
                ' <button type="button" class="erp-tag" onclick="toggleHrAdvanceClosed(\'' + esc(a.id) + '\')">' + (a.status === 'closed' ? 'إعادة فتح' : 'إغلاق') + '</button>' +
                ' <button type="button" class="erp-tag" onclick="deleteHrAdvance(\'' + esc(a.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-hand-holding-dollar"></i> <strong>سلف الموظفين بأقساط</strong> — حدد عدد أشهر الخصم · <strong>تأجيل خصم شهر</strong> (الموظف يقبض راتبه كاملاً والقسط يُؤجَّل لشهر لاحق) · يُطبَّق تلقائياً على مسير الرواتب.</p>' +
            '<div class="hr-toolbar">' +
                '<label class="nebras-field"><span>شهر التأجيل الافتراضي</span><input type="month" id="hadv-postpone-month" value="' + monthNow + '"></label>' +
            '</div>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-plus"></i> سلفة جديدة بأقساط</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف *</span><select id="hadv-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>مبلغ السلفة (ر.س) *</span><input type="number" id="hadv-principal" min="1" step="0.01"></label>' +
                '<label class="nebras-field"><span>عدد أشهر الخصم *</span><input type="number" id="hadv-count" min="1" max="60" value="6"></label>' +
                '<label class="nebras-field"><span>بداية الخصم (شهر)</span><input type="month" id="hadv-start" value="' + monthNow + '"></label>' +
                '<label class="nebras-field"><span>مرجع / رقم</span><input id="hadv-ref" placeholder="SLF-2026-001"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظة</span><input id="hadv-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrAdvance()"><i class="fas fa-save"></i> تسجيل السلفة</button></div></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
            '<th>الموظف</th><th>السلفة</th><th>المتبقي</th><th>الأقساط</th><th>البداية</th><th>أشهر مؤجّلة</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="8" class="erp-empty">لا سلف مسجّلة — استخدمي النموذج أعلاه</td></tr>') +
            '</tbody></table></div></div>';
    }

    function saveHrAdvance() {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        const empId = (document.getElementById('hadv-employee') || {}).value || '';
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const emp = emps.find(function(e) { return e.id === empId; });
        if (!emp) { alert('اختر موظفاً.'); return; }
        const principal = hrNum((document.getElementById('hadv-principal') || {}).value);
        const count = Math.max(1, parseInt((document.getElementById('hadv-count') || {}).value, 10) || 1);
        const startMonth = (document.getElementById('hadv-start') || {}).value || new Date().toISOString().slice(0, 7);
        if (principal <= 0) { alert('أدخل مبلغ السلفة.'); return; }
        loadHrAdvancesData();
        const per = Math.round((principal / count) * 100) / 100;
        const adv = {
            id: 'hadv-' + Date.now(),
            employeeId: emp.id,
            employeeName: emp.nameAr,
            employeeNo: emp.employeeNo,
            principal: principal,
            remaining: principal,
            installmentCount: count,
            installmentAmount: per,
            installmentsPaid: 0,
            startMonth: startMonth,
            skippedMonths: [],
            schedule: [],
            reference: (document.getElementById('hadv-ref') || {}).value || '',
            note: (document.getElementById('hadv-note') || {}).value || '',
            status: 'active',
            createdAt: new Date().toISOString().slice(0, 10)
        };
        ensureAdvanceSchedule(adv);
        if (typeof stampHrRecord === 'function') stampHrRecord(adv, true);
        hrAdvances.unshift(adv);
        saveHrAdvancesData();
        if (typeof hrAudit === 'function') hrAudit('HR سلفة', emp.nameAr + ' — ' + principal + ' / ' + count + ' شهر');
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function postponeHrAdvanceMonthFor(advanceId) {
        const monthEl = document.getElementById('hadv-postpone-month');
        const month = monthEl ? monthEl.value : new Date().toISOString().slice(0, 7);
        if (!month) { alert('اختر شهر التأجيل.'); return; }
        postponeHrAdvanceMonth(advanceId, month);
    }

    function skipHrAdvanceMonthPrompt(advanceId) {
        postponeHrAdvanceMonthFor(advanceId);
    }

    function postponeHrAdvanceMonth(advanceId, month) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) { alert('صيغة الشهر: YYYY-MM'); return; }
        loadHrAdvancesData();
        const adv = hrAdvances.find(function(a) { return a.id === advanceId; });
        if (!adv || adv.status === 'closed') return;
        ensureAdvanceSchedule(adv);
        if (isAdvanceMonthDeferred(adv, month)) {
            alert('تم تأجيل خصم هذا الشهر مسبقاً.');
            return;
        }
        if (!adv.skippedMonths) adv.skippedMonths = [];
        adv.skippedMonths.push(month);
        let slot = (adv.schedule || []).find(function(s) { return s.month === month; });
        if (!slot) {
            slot = {
                month: month,
                amount: hrNum(adv.installmentAmount),
                status: 'pending'
            };
            adv.schedule.push(slot);
            adv.schedule.sort(function(a, b) { return String(a.month).localeCompare(String(b.month)); });
        }
        if (slot.status === 'deducted') {
            alert('تم خصم قسط هذا الشهر بالفعل في مسير الرواتب.');
            adv.skippedMonths.pop();
            return;
        }
        slot.status = 'postponed';
        extendAdvanceScheduleForPostpone(adv, slot);
        saveHrAdvancesData();
        if (typeof hrAudit === 'function') hrAudit('HR تأجيل سلفة', adv.employeeName + ' — ' + month + ' (راتب كامل)');
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
        alert('تم تأجيل خصم السلفة لشهر ' + month + '.\nالموظف يقبض راتبه كاملاً — والقسط يُخصم في شهر لاحق.');
    }

    function skipHrAdvanceMonth(advanceId, month) {
        postponeHrAdvanceMonth(advanceId, month);
    }

    function toggleHrAdvanceClosed(id) {
        loadHrAdvancesData();
        const adv = hrAdvances.find(function(a) { return a.id === id; });
        if (!adv) return;
        adv.status = adv.status === 'closed' ? 'active' : 'closed';
        saveHrAdvancesData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function deleteHrAdvance(id) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        if (!confirm('حذف سجل السلفة؟')) return;
        loadHrAdvancesData();
        hrAdvances = hrAdvances.filter(function(a) { return a.id !== id; });
        saveHrAdvancesData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function setHrAdvancesFromCloud(v) {
        hrAdvances = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_ADVANCES_KEY, JSON.stringify(hrAdvances)); } catch (e) { /* ignore */ }
    }

    function getHrAdvancesTabExtension() {
        return { id: 'advances', icon: 'fas fa-hand-holding-dollar', label: 'سلف بأقساط', group: 'الرواتب والمزايا' };
    }

    loadHrAdvancesData();

    global.computeHrAdvanceDeduction = computeHrAdvanceDeduction;
    global.applyHrAdvancePayrollDeductions = applyHrAdvancePayrollDeductions;
    global.renderHrAdvancesPanel = renderHrAdvancesPanel;
    global.saveHrAdvance = saveHrAdvance;
    global.postponeHrAdvanceMonth = postponeHrAdvanceMonth;
    global.postponeHrAdvanceMonthFor = postponeHrAdvanceMonthFor;
    global.skipHrAdvanceMonth = skipHrAdvanceMonth;
    global.skipHrAdvanceMonthPrompt = skipHrAdvanceMonthPrompt;
    global.toggleHrAdvanceClosed = toggleHrAdvanceClosed;
    global.deleteHrAdvance = deleteHrAdvance;
    global.getHrAdvances = function() { loadHrAdvancesData(); return hrAdvances; };
    global.setHrAdvancesFromCloud = setHrAdvancesFromCloud;
    global.getHrAdvancesTabExtension = getHrAdvancesTabExtension;
    global.loadHrAdvancesData = loadHrAdvancesData;

})(typeof window !== 'undefined' ? window : globalThis);
