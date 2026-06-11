/* Phase 20 — HR fleet + sales rep monitoring */

    function getSalesRepUsers() {
        if (typeof adminUsers === 'undefined' || !Array.isArray(adminUsers)) return [];
        return adminUsers.filter(function(u) {
            return u && u.role === 'sales_rep' && u.isActive !== false;
        });
    }

    function matchTrackingToRep(rep, tracking) {
        if (!rep || !tracking) return false;
        const repUser = String(rep.username || '').toLowerCase();
        const driver = String(tracking.driverName || '').toLowerCase();
        const empNo = String(tracking.driverEmployeeNo || '').toLowerCase();
        if (rep.employeeNo && empNo && String(rep.employeeNo).toLowerCase() === empNo) return true;
        if (driver && repUser && driver.indexOf(repUser) >= 0) return true;
        const emp = hrEmployees.find(function(e) {
            return e && (e.employeeNo === tracking.driverEmployeeNo || e.nameAr === tracking.driverName);
        });
        if (emp && emp.phone && rep.phone && emp.phone === rep.phone) return true;
        return false;
    }

    function buildHrSalesFleetRows() {
        const reps = getSalesRepUsers();
        const tracking = applyHrScopeFilter(hrVehicleTracking.slice(), 'tracking');
        const onRoad = tracking.filter(function(t) { return t.status === 'on_road'; });
        const rows = [];
        onRoad.forEach(function(t) {
            rows.push({
                type: 'on_road',
                plate: t.plateNo || '—',
                driver: t.driverName || '—',
                phone: t.driverPhone || '—',
                empNo: t.driverEmployeeNo || '—',
                destination: t.destination || '—',
                branch: resolveHrBranchLabel(t.branchId || '')
            });
        });
        reps.forEach(function(rep) {
            const repTrack = onRoad.filter(function(t) { return matchTrackingToRep(rep, t); });
            const quotes = (typeof getRepQuoteHistory === 'function' && rep.username)
                ? getRepQuoteHistory(rep).length : 0;
            rows.push({
                type: 'rep',
                username: rep.username,
                branch: rep.assignedBranchCity || '—',
                onRoad: repTrack.length,
                quotes: quotes,
                plates: repTrack.map(function(t) { return t.plateNo; }).join(' · ') || '—'
            });
        });
        return { onRoad: onRoad, reps: reps, rows: rows };
    }

    function renderHrSalesFleetPanel() {
        const data = buildHrSalesFleetRows();
        const onRoadRows = data.onRoad.map(function(t) {
            return '<tr><td><strong class="plate-badge">' + esc(t.plateNo) + '</strong></td>' +
                '<td>' + esc(t.driverName) + '</td><td><a href="tel:' + esc(t.driverPhone || '') + '">' + esc(t.driverPhone || '—') + '</a></td>' +
                '<td>' + esc(t.driverEmployeeNo || '') + '</td><td>' + esc(t.destination || '') + '</td>' +
                '<td>' + esc(resolveHrBranchLabel(t.branchId)) + '</td></tr>';
        }).join('');
        const repRows = data.reps.map(function(r) {
            const d = data.onRoad.filter(function(t) { return matchTrackingToRep(r, t); })[0];
            return '<tr><td><strong>' + esc(r.username) + '</strong></td><td>' + esc(r.assignedBranchCity || '—') + '</td>' +
                '<td>' + (d ? '<span class="erp-tag erp-tag--ok">خارجة</span>' : '<span class="erp-tag">—</span>') + '</td>' +
                '<td>' + esc(d ? d.plateNo : '—') + '</td>' +
                '<td>' + (d ? '<a href="tel:' + esc(d.driverPhone || '') + '">' + esc(d.driverPhone || '—') + '</a>' : '—') + '</td>' +
                '<td>' + esc(d ? d.driverName : '—') + '</td></tr>';
        }).join('');
        const isMain = typeof canViewHrExecutiveReports === 'function' && canViewHrExecutiveReports();
        return '<div class="hr-panel is-active">' +
            '<div class="hr-gov-owner-banner' + (isMain ? ' hr-gov-owner-banner--main' : '') + '">' +
                '<i class="fas fa-car-side"></i><div><strong>مراقبة الأسطول والمندوبين</strong>' +
                '<p>متابعة السيارات الخارجة — رقم اللوحة · اسم السائق · جوال السائق · ربط بمندوبي المبيعات.</p></div></div>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + data.onRoad.length + '</strong><span>سيارات خارجة الآن</span></div>' +
                '<div class="hr-report-card"><strong>' + data.reps.length + '</strong><span>مندوبو مبيعات نشطون</span></div>' +
                '<div class="hr-report-card"><strong>' + applyHrScopeFilter(hrVehicles, 'vehicle').length + '</strong><span>سيارات النطاق</span></div>' +
            '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-location-dot"></i> سيارات خارجة — لوحة · سائق · جوال</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
                '<th>رقم السيارة</th><th>اسم السائق</th><th>جوال السائق</th><th>رقم الموظف</th><th>الوجهة</th><th>الفرع</th>' +
            '</tr></thead><tbody>' + (onRoadRows || '<tr><td colspan="6" class="erp-empty">لا سيارات خارجة</td></tr>') + '</tbody></table></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-user-tie"></i> مندوبو المبيعات — ربط بالأسطول</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
                '<th>المندوب</th><th>الفرع</th><th>حالة</th><th>اللوحة</th><th>جوال</th><th>السائق</th>' +
            '</tr></thead><tbody>' + (repRows || '<tr><td colspan="6" class="erp-empty">لا مندوبين</td></tr>') + '</tbody></table></div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn" onclick="switchHrTab(\'tracking\')"><i class="fas fa-plus"></i> تسجيل خروج سيارة</button>' +
                '<button type="button" class="nebras-users-btn" onclick="exportHrTrackingCsv()"><i class="fas fa-file-csv"></i> تصدير CSV</button>' +
            '</div></div>';
    }

    function isHrFleetRepsTabAllowed() {
        if (typeof canViewHrExecutiveReports === 'function' && canViewHrExecutiveReports()) return true;
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        const fleetDepts = ['installation', 'warehouse', 'sales', 'admin', 'maintenance', 'hr'];
        if (scope.departmentKey && fleetDepts.indexOf(scope.departmentKey) >= 0) return true;
        return true;
    }
