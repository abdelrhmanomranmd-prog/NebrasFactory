/**
 * نبراس HCM Suite — توسعة منصة HR (جسر/Odoo style)
 * تذاكر سفر · خصومات ديناميكية · مركز الأسطول · مركز السعودة
 */
(function(global) {
    'use strict';

    const HR_TRAVEL_KEY = 'nebrasHrTravelTickets';
    const HR_DEDUCTIONS_KEY = 'nebrasHrDeductions';

    let hrTravelTickets = [];
    let hrDeductions = [];

    const HR_TRAVEL_STATUS = {
        pending: { label: 'معلق', tag: '' },
        approved: { label: 'موافق', tag: 'erp-tag--ok' },
        booked: { label: 'محجوز', tag: 'erp-tag--accent' },
        completed: { label: 'مكتمل', tag: 'erp-tag--ok' },
        cancelled: { label: 'ملغى', tag: 'erp-tag--danger' }
    };

    const HR_DEDUCTION_TYPES = {
        loan: 'سلفة',
        advance: 'عهدة / سلفة',
        penalty: 'جزاء إداري',
        absence: 'خصم غياب',
        ticket: 'تذكرة سفر',
        custom: 'خصم آخر'
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hrNum(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function loadHcmSuiteData() {
        try {
            const t = localStorage.getItem(HR_TRAVEL_KEY);
            hrTravelTickets = t ? JSON.parse(t) : [];
            if (!Array.isArray(hrTravelTickets)) hrTravelTickets = [];
        } catch (e) { hrTravelTickets = []; }
        try {
            const d = localStorage.getItem(HR_DEDUCTIONS_KEY);
            hrDeductions = d ? JSON.parse(d) : [];
            if (!Array.isArray(hrDeductions)) hrDeductions = [];
        } catch (e) { hrDeductions = []; }
    }

    function saveHcmSuiteData() {
        try {
            localStorage.setItem(HR_TRAVEL_KEY, JSON.stringify(hrTravelTickets));
            localStorage.setItem(HR_DEDUCTIONS_KEY, JSON.stringify(hrDeductions));
        } catch (e) { console.warn('HCM save', e); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function getScopedEmployees() {
        const all = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        if (typeof applyHrScopeFilter === 'function') return applyHrScopeFilter(all.slice(), 'employee');
        return all;
    }

    function employeeInScope(empId) {
        const emps = getScopedEmployees();
        return emps.some(function(e) { return e.id === empId; });
    }

    function computeHrPayrollExtras(employeeId, month) {
        loadHcmSuiteData();
        const gosiRate = 0.09;
        let dynamicDed = 0;
        const dedLines = [];
        hrDeductions.forEach(function(d) {
            if (d.employeeId !== employeeId || d.active === false) return;
            if (d.recurring === 'once' && d.month && d.month !== month) return;
            const amt = hrNum(d.amount);
            if (amt <= 0) return;
            dynamicDed += amt;
            dedLines.push({ type: d.type, label: HR_DEDUCTION_TYPES[d.type] || d.type, amount: amt, note: d.note || '' });
        });
        const travelCost = hrTravelTickets.filter(function(t) {
            return t.employeeId === employeeId && t.payrollMonth === month && t.status !== 'cancelled' && hrNum(t.cost) > 0;
        }).reduce(function(s, t) { return s + hrNum(t.cost); }, 0);
        if (travelCost > 0) {
            dynamicDed += travelCost;
            dedLines.push({ type: 'ticket', label: 'تذاكر سفر', amount: travelCost, note: '' });
        }
        return { dynamicDed: Math.round(dynamicDed * 100) / 100, dedLines: dedLines, gosiRate: gosiRate };
    }

    function renderHrTravelPanel() {
        loadHcmSuiteData();
        const teamIds = getScopedEmployees().map(function(e) { return e.id; });
        const list = hrTravelTickets.filter(function(t) { return teamIds.indexOf(t.employeeId) >= 0; });
        const empOpts = getScopedEmployees().map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const statusOpts = Object.keys(HR_TRAVEL_STATUS).map(function(k) {
            return '<option value="' + k + '">' + HR_TRAVEL_STATUS[k].label + '</option>';
        }).join('');
        const rows = list.map(function(t) {
            const st = HR_TRAVEL_STATUS[t.status] || HR_TRAVEL_STATUS.pending;
            return '<tr><td>' + esc(t.employeeName) + '</td><td>' + esc(t.route || '—') + '</td><td>' + esc(t.travelDate || '') + '</td>' +
                '<td>' + esc(t.ticketNo || '—') + '</td><td>' + hrNum(t.cost).toLocaleString('ar-SA') + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td><button type="button" class="erp-tag" onclick="deleteHrTravelTicket(\'' + esc(t.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-plane"></i> <strong>تذاكر السفر</strong> — طلب · موافقة · حجز · ربط بمسير الرواتب (شهر الخصم).</p>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-plus"></i> تذكرة سفر جديدة</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="htr-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>المسار / الوجهة</span><input id="htr-route" placeholder="الرياض — جدة"></label>' +
                '<label class="nebras-field"><span>تاريخ السفر</span><input type="date" id="htr-date"></label>' +
                '<label class="nebras-field"><span>رقم التذكرة</span><input id="htr-ticket-no"></label>' +
                '<label class="nebras-field"><span>التكلفة (ر.س)</span><input type="number" id="htr-cost" min="0" step="0.01"></label>' +
                '<label class="nebras-field"><span>شهر خصم الراتب</span><input type="month" id="htr-payroll-month" value="' + new Date().toISOString().slice(0, 7) + '"></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="htr-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="htr-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addHrTravelTicket()"><i class="fas fa-save"></i> حفظ التذكرة</button></div></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الموظف</th><th>المسار</th><th>التاريخ</th><th>رقم التذكرة</th><th>التكلفة</th><th>الحالة</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="7" class="erp-empty">لا تذاكر مسجّلة</td></tr>') + '</tbody></table></div></div>';
    }

    function addHrTravelTicket() {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        const empId = (document.getElementById('htr-employee') || {}).value || '';
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const emp = emps.find(function(e) { return e.id === empId; });
        if (!emp) { alert('اختر موظفاً.'); return; }
        if (!employeeInScope(empId)) { alert('خارج نطاقك.'); return; }
        const route = (document.getElementById('htr-route') || {}).value || '';
        if (!route.trim()) { alert('أدخل المسار/الوجهة.'); return; }
        loadHcmSuiteData();
        hrTravelTickets.unshift({
            id: 'htr-' + Date.now(),
            employeeId: emp.id,
            employeeName: emp.nameAr,
            employeeNo: emp.employeeNo,
            route: route.trim(),
            travelDate: (document.getElementById('htr-date') || {}).value || '',
            ticketNo: (document.getElementById('htr-ticket-no') || {}).value || '',
            cost: hrNum((document.getElementById('htr-cost') || {}).value),
            payrollMonth: (document.getElementById('htr-payroll-month') || {}).value || new Date().toISOString().slice(0, 7),
            status: (document.getElementById('htr-status') || {}).value || 'pending',
            note: (document.getElementById('htr-note') || {}).value || '',
            createdAt: new Date().toISOString().slice(0, 10)
        });
        saveHcmSuiteData();
        if (typeof hrAudit === 'function') hrAudit('HR تذكرة سفر', emp.nameAr + ' — ' + route);
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
        else if (typeof renderHrPlatformPanel === 'function') renderHrPlatformPanel();
    }

    function deleteHrTravelTicket(id) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        loadHcmSuiteData();
        const t = hrTravelTickets.find(function(x) { return x.id === id; });
        if (!t || !confirm('حذف تذكرة ' + t.employeeName + '؟')) return;
        hrTravelTickets = hrTravelTickets.filter(function(x) { return x.id !== id; });
        saveHcmSuiteData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function renderHrDeductionsPanel() {
        loadHcmSuiteData();
        const teamIds = getScopedEmployees().map(function(e) { return e.id; });
        const list = hrDeductions.filter(function(d) { return teamIds.indexOf(d.employeeId) >= 0; });
        const empOpts = getScopedEmployees().map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const typeOpts = Object.keys(HR_DEDUCTION_TYPES).map(function(k) {
            return '<option value="' + k + '">' + HR_DEDUCTION_TYPES[k] + '</option>';
        }).join('');
        const rows = list.map(function(d) {
            return '<tr><td>' + esc(d.employeeName) + '</td><td>' + esc(HR_DEDUCTION_TYPES[d.type] || d.type) + '</td>' +
                '<td><strong>' + hrNum(d.amount).toLocaleString('ar-SA') + '</strong></td>' +
                '<td>' + (d.recurring === 'once' ? 'مرة — ' + esc(d.month || '') : 'شهري') + '</td>' +
                '<td>' + esc(d.note || '—') + '</td>' +
                '<td><button type="button" class="erp-tag" onclick="toggleHrDeduction(\'' + esc(d.id) + '\')">' + (d.active === false ? 'تفعيل' : 'إيقاف') + '</button> ' +
                '<button type="button" class="erp-tag" onclick="deleteHrDeduction(\'' + esc(d.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-scale-balanced"></i> <strong>الخصومات الديناميكية</strong> — سلف · جزاء · غياب · تذاكر — تُطبَّق تلقائياً على مسير الرواتب.</p>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-plus"></i> خصم جديد</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="hded-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>نوع الخصم</span><select id="hded-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>المبلغ (ر.س)</span><input type="number" id="hded-amount" min="0" step="0.01"></label>' +
                '<label class="nebras-field"><span>التكرار</span><select id="hded-recurring"><option value="monthly">شهري</option><option value="once">مرة واحدة</option></select></label>' +
                '<label class="nebras-field"><span>شهر التطبيق (للمرة الواحدة)</span><input type="month" id="hded-month" value="' + new Date().toISOString().slice(0, 7) + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>سبب / ملاحظة</span><input id="hded-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDeduction()"><i class="fas fa-save"></i> حفظ الخصم</button></div></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الموظف</th><th>النوع</th><th>المبلغ</th><th>التكرار</th><th>ملاحظة</th><th>إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="6" class="erp-empty">لا خصومات — يُحسب المسير بـ GOSI 9% فقط</td></tr>') + '</tbody></table></div></div>';
    }

    function saveHrDeduction() {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        const empId = (document.getElementById('hded-employee') || {}).value || '';
        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        const emp = emps.find(function(e) { return e.id === empId; });
        if (!emp) { alert('اختر موظفاً.'); return; }
        const amount = hrNum((document.getElementById('hded-amount') || {}).value);
        if (amount <= 0) { alert('أدخل مبلغ الخصم.'); return; }
        loadHcmSuiteData();
        hrDeductions.unshift({
            id: 'hded-' + Date.now(),
            employeeId: emp.id,
            employeeName: emp.nameAr,
            type: (document.getElementById('hded-type') || {}).value || 'custom',
            amount: amount,
            recurring: (document.getElementById('hded-recurring') || {}).value || 'monthly',
            month: (document.getElementById('hded-month') || {}).value || '',
            note: (document.getElementById('hded-note') || {}).value || '',
            active: true,
            createdAt: new Date().toISOString().slice(0, 10)
        });
        saveHcmSuiteData();
        if (typeof hrAudit === 'function') hrAudit('HR خصم', emp.nameAr + ' — ' + amount);
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function toggleHrDeduction(id) {
        loadHcmSuiteData();
        const d = hrDeductions.find(function(x) { return x.id === id; });
        if (d) { d.active = d.active === false; saveHcmSuiteData(); }
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function deleteHrDeduction(id) {
        if (typeof requireHrOps === 'function' && !requireHrOps()) return;
        loadHcmSuiteData();
        hrDeductions = hrDeductions.filter(function(x) { return x.id !== id; });
        saveHcmSuiteData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function renderHrFleetHubPanel() {
        const vehs = typeof applyHrScopeFilter === 'function'
            ? applyHrScopeFilter((typeof getHrVehicles === 'function' ? getHrVehicles() : []).slice(), 'vehicle')
            : (typeof getHrVehicles === 'function' ? getHrVehicles() : []);
        const tracking = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
        const onRoad = tracking.filter(function(t) { return t.status === 'on_road'; });
        const expiring = vehs.filter(function(v) {
            return v.insuranceExp || v.inspectionExp;
        }).length;
        const cards = onRoad.slice(0, 8).map(function(t) {
            const mapsQ = encodeURIComponent((t.plateNo || '') + ' ' + (t.destination || '') + ' السعودية');
            return '<article class="hr-fleet-hub-card hr-fleet-hub-card--live">' +
                '<span class="plate-badge">' + esc(t.plateNo) + '</span>' +
                '<strong>' + esc(t.driverName || '—') + '</strong>' +
                '<small><i class="fas fa-mobile-screen"></i> ' + esc(t.driverPhone || '—') + '</small>' +
                '<small><i class="fas fa-location-dot"></i> ' + esc(t.destination || '—') + '</small>' +
                '<a class="hr-gps-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapsQ + '"><i class="fas fa-location-crosshairs"></i> تتبع GPS</a>' +
                '<button type="button" class="erp-tag erp-tag--ok" onclick="returnHrVehicleFromTracking(\'' + esc(t.id) + '\')"><i class="fas fa-rotate-left"></i> عودة</button>' +
            '</article>';
        }).join('');
        const vehCards = vehs.slice(0, 6).map(function(v) {
            return '<article class="hr-fleet-hub-card">' +
                '<span class="plate-badge">' + esc(v.plateNo) + '</span>' +
                '<strong>' + esc(v.make) + ' ' + esc(v.model) + '</strong>' +
                '<small>' + esc(v.currentDriverName || 'بدون سائق') + '</small>' +
                (v.gpsTracker ? '<small>GPS: ' + esc(v.gpsTracker) + '</small>' : '') +
            '</article>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-truck-fast"></i> <strong>مركز إدارة الأسطول</strong> — سيارات الشركة · تتبع حي · جوال السائق · لوحة المركبة · GPS.</p>' +
            '<div class="hr-command-kpi-ring">' +
                '<div class="hr-command-kpi"><strong>' + vehs.length + '</strong><span>إجمالي المركبات</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--accent"><strong>' + onRoad.length + '</strong><span>خارجة الآن</span></div>' +
                '<div class="hr-command-kpi"><strong>' + expiring + '</strong><span>وثائق للمتابعة</span></div>' +
            '</div>' +
            '<div class="hr-command-quick-row">' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'tracking\')"><i class="fas fa-plus"></i> تسجيل خروج</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'vehicles\')"><i class="fas fa-car"></i> سجل السيارات</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'fleet-reps\')"><i class="fas fa-user-tie"></i> مندوبون</button>' +
            '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-satellite-dish"></i> سيارات خارجة — تتبع مباشر</h4>' +
            '<div class="hr-fleet-hub-grid">' + (cards || '<p class="erp-empty">لا سيارات خارجة حالياً</p>') + '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-warehouse"></i> أسطول الشركة</h4>' +
            '<div class="hr-fleet-hub-grid">' + (vehCards || '<p class="erp-empty">لا مركبات في النطاق</p>') + '</div></div>';
    }

    function renderHrSaudizationPanel() {
        const team = getScopedEmployees().filter(function(e) { return e.status === 'active'; });
        const stats = typeof calcSaudizationStats === 'function' ? calcSaudizationStats(team) : { pct: 0, saudi: 0, total: 0 };
        let band = 'أحمر';
        let bandCls = 'hr-nitaqat--red';
        if (stats.pct >= 40) { band = 'بلاتيني'; bandCls = 'hr-nitaqat--plat'; }
        else if (stats.pct >= 30) { band = 'أخضر مرتفع'; bandCls = 'hr-nitaqat--green'; }
        else if (stats.pct >= 20) { band = 'أخضر'; bandCls = 'hr-nitaqat--green'; }
        else if (stats.pct >= 10) { band = 'أصفر'; bandCls = 'hr-nitaqat--yellow'; }
        const byNat = {};
        team.forEach(function(e) {
            const n = e.nationality || 'غير محدد';
            byNat[n] = (byNat[n] || 0) + 1;
        });
        const natRows = Object.keys(byNat).sort(function(a, b) { return byNat[b] - byNat[a]; }).map(function(n) {
            return '<tr><td>' + esc(n) + '</td><td><strong>' + byNat[n] + '</strong></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-flag"></i> <strong>مركز السعودة والامتثال</strong> — نسبة السعودة · توزيع الجنسيات · هدف المصنع 30%+.</p>' +
            '<div class="hr-saud-center">' +
                '<div class="hr-saud-gauge-wrap ' + bandCls + '">' +
                    '<div class="hr-saud-gauge-pct"><strong>' + stats.pct + '%</strong><span>سعودة الفريق</span></div>' +
                    '<div class="hr-saud-gauge-meta"><span>سعوديون: ' + stats.saudi + '</span><span>الإجمالي: ' + stats.total + '</span></div>' +
                    '<div class="hr-nitaqat-band">تقدير نطاق: <strong>' + band + '</strong></div>' +
                '</div>' +
                '<div class="hr-saud-target"><i class="fas fa-bullseye"></i> الهدف: 30% سعودة — مصنع أبواب WPC</div>' +
            '</div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الجنسية</th><th>العدد</th></tr></thead><tbody>' +
            (natRows || '<tr><td colspan="2" class="erp-empty">لا بيانات</td></tr>') + '</tbody></table></div>' +
            '<div class="erp-form-actions"><button type="button" class="nebras-users-btn" onclick="switchHrTab(\'employees\')"><i class="fas fa-users"></i> إدارة الموظفين</button>' +
            '<button type="button" class="nebras-users-btn" onclick="switchHrTab(\'documents\')"><i class="fas fa-id-card"></i> إقامات ومستندات</button></div></div>';
    }

    function getHcmTabExtensions() {
        return [
            { id: 'fleet-hub', icon: 'fas fa-truck-fast', label: 'مركز الأسطول', group: 'إدارة الأسطول' },
            { id: 'travel', icon: 'fas fa-plane', label: 'تذاكر السفر', group: 'الرواتب والمزايا' },
            { id: 'deductions', icon: 'fas fa-scale-balanced', label: 'الخصومات', group: 'الرواتب والمزايا' },
            { id: 'saudization', icon: 'fas fa-flag', label: 'السعودة والامتثال', group: 'الامتثال' }
        ];
    }

    function setHrTravelFromCloud(v) {
        hrTravelTickets = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_TRAVEL_KEY, JSON.stringify(hrTravelTickets)); } catch (e) { /* ignore */ }
    }

    function setHrDeductionsFromCloud(v) {
        hrDeductions = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_DEDUCTIONS_KEY, JSON.stringify(hrDeductions)); } catch (e) { /* ignore */ }
    }

    loadHcmSuiteData();

    global.computeHrPayrollExtras = computeHrPayrollExtras;
    global.renderHrTravelPanel = renderHrTravelPanel;
    global.addHrTravelTicket = addHrTravelTicket;
    global.deleteHrTravelTicket = deleteHrTravelTicket;
    global.renderHrDeductionsPanel = renderHrDeductionsPanel;
    global.saveHrDeduction = saveHrDeduction;
    global.toggleHrDeduction = toggleHrDeduction;
    global.deleteHrDeduction = deleteHrDeduction;
    global.renderHrFleetHubPanel = renderHrFleetHubPanel;
    global.renderHrSaudizationPanel = renderHrSaudizationPanel;
    global.getHcmTabExtensions = getHcmTabExtensions;
    global.getHrTravelTickets = function() { loadHcmSuiteData(); return hrTravelTickets; };
    global.getHrDeductions = function() { loadHcmSuiteData(); return hrDeductions; };
    global.setHrTravelFromCloud = setHrTravelFromCloud;
    global.setHrDeductionsFromCloud = setHrDeductionsFromCloud;
    global.loadHcmSuiteData = loadHcmSuiteData;
})(typeof window !== 'undefined' ? window : globalThis);
