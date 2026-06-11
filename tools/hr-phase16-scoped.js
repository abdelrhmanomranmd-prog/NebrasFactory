/* Phase 16 — HR scope per branch/department + creative scoped dashboards */

    const HR_SCOPE_DEPT_ICONS = {
        admin: 'fas fa-building',
        production_wpc: 'fas fa-industry',
        production_alu: 'fas fa-layer-group',
        workshop: 'fas fa-gears',
        quality: 'fas fa-clipboard-check',
        warehouse: 'fas fa-warehouse',
        installation: 'fas fa-screwdriver-wrench',
        sales: 'fas fa-chart-line',
        maintenance: 'fas fa-wrench',
        hr: 'fas fa-people-roof'
    };

    function branchCityToHrBranchId(city) {
        const c = String(city || '').trim();
        if (!c) return '';
        if (typeof branchesData !== 'undefined' && Array.isArray(branchesData)) {
            const hit = branchesData.find(function(b) {
                const name = String(b.city || b.cityAr || '').trim();
                return name === c || name.indexOf(c) >= 0 || c.indexOf(name) >= 0;
            });
            if (hit) return String(hit.id);
        }
        return '';
    }

    function getHrAdminScope(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return { mode: 'full', branchId: '', departmentKey: '', label: '—', icon: 'fas fa-industry' };
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) {
            return { mode: 'full', branchId: '', departmentKey: '', label: 'الإدارة الرئيسية — كل الفروع والأقسام', icon: 'fas fa-crown' };
        }
        if (!isStrictHrUser(admin)) {
            return { mode: 'full', branchId: '', departmentKey: '', label: 'وصول كامل', icon: 'fas fa-industry' };
        }
        let branchId = String(admin.hrScopeBranchId || '').trim();
        if (!branchId && admin.assignedBranchCity) branchId = branchCityToHrBranchId(admin.assignedBranchCity);
        const departmentKey = String(admin.hrScopeDepartmentKey || '').trim();
        let label = '';
        let icon = 'fas fa-people-roof';
        if (departmentKey && typeof HR_FACTORY_DEPTS !== 'undefined' && HR_FACTORY_DEPTS[departmentKey]) {
            label = HR_FACTORY_DEPTS[departmentKey];
            icon = HR_SCOPE_DEPT_ICONS[departmentKey] || icon;
        }
        if (branchId) {
            const bl = resolveHrBranchLabel(branchId);
            label = label ? (label + ' · ' + bl) : bl;
        }
        if (!label) label = 'موارد بشرية — كل الفروع';
        const mode = departmentKey ? 'department' : (branchId ? 'branch' : 'company');
        return { mode: mode, branchId: branchId, departmentKey: departmentKey, label: label, icon: icon };
    }

    function employeeMatchesHrScope(emp, scope) {
        if (!emp) return false;
        scope = scope || getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (scope.branchId && String(emp.branchId) !== String(scope.branchId)) return false;
        if (scope.departmentKey) {
            if (emp.departmentKey === scope.departmentKey) return true;
            if (typeof HR_FACTORY_DEPTS !== 'undefined' && emp.department === HR_FACTORY_DEPTS[scope.departmentKey]) return true;
            return false;
        }
        return true;
    }

    function vehicleMatchesHrScope(veh, scope) {
        if (!veh) return false;
        scope = scope || getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (scope.branchId && String(veh.branchId) !== String(scope.branchId)) return false;
        if (scope.departmentKey) {
            if (!veh.assignedEmployeeId) return false;
            return employeeMatchesHrScope(getEmployeeById(veh.assignedEmployeeId), scope);
        }
        return true;
    }

    function trackingMatchesHrScope(t, scope) {
        if (!t) return false;
        scope = scope || getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        const emp = t.driverEmployeeId ? getEmployeeById(t.driverEmployeeId) : findEmployeeByNo(t.driverEmployeeNo);
        if (emp && employeeMatchesHrScope(emp, scope)) return true;
        const veh = t.vehicleId ? getVehicleById(t.vehicleId) : findVehicleByPlate(t.plateNo);
        return vehicleMatchesHrScope(veh, scope);
    }

    function applyHrScopeFilter(list, kind) {
        const scope = getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return list;
        return list.filter(function(item) {
            if (kind === 'employee') return employeeMatchesHrScope(item, scope);
            if (kind === 'vehicle') return vehicleMatchesHrScope(item, scope);
            if (kind === 'tracking') return trackingMatchesHrScope(item, scope);
            if (kind === 'attendance' || kind === 'document' || kind === 'leave') {
                return employeeMatchesHrScope(getEmployeeById(item.employeeId), scope);
            }
            return true;
        });
    }

    function getHrScopedEmployeeIds() {
        return applyHrScopeFilter(hrEmployees, 'employee').map(function(e) { return e.id; });
    }

    function isHrTabAllowedForScope(tabId) {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        if (tabId === 'reports') return canViewHrExecutiveReports();
        if (scope.departmentKey) {
            const prodDepts = ['production_wpc', 'production_alu', 'workshop', 'quality'];
            if (tabId === 'factory' && prodDepts.indexOf(scope.departmentKey) < 0) return false;
            const fleetDepts = ['installation', 'warehouse', 'sales', 'admin', 'maintenance', 'hr'];
            if ((tabId === 'vehicles' || tabId === 'tracking') && fleetDepts.indexOf(scope.departmentKey) < 0) return false;
        }
        return true;
    }

    function renderHrScopeBanner() {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return '';
        return '<div class="hr-scope-banner"><i class="' + esc(scope.icon) + '"></i>' +
            '<div><strong>نطاقك: ' + esc(scope.label) + '</strong>' +
            '<span>خصوصية القسم — لا تظهر بيانات أقسام أو فروع أخرى</span></div></div>';
    }

    function renderHrScopedDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs) {
        const scope = getHrAdminScope();
        const today = new Date().toISOString().slice(0, 10);
        const team = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status === 'active'; }), 'employee');
        const teamIds = team.map(function(e) { return e.id; });
        const presentToday = hrAttendance.filter(function(a) {
            return a.date === today && a.checkIn && teamIds.indexOf(a.employeeId) >= 0;
        }).length;
        const onLeaveTeam = team.filter(function(e) { return e.status === 'on_leave'; }).length;
        const vehs = applyHrScopeFilter(hrVehicles, 'vehicle');
        const onRoad = applyHrScopeFilter(hrVehicleTracking.filter(function(t) { return t.status === 'on_road'; }), 'tracking').length;
        const alerts = collectHrAlerts().filter(function(a) {
            if (a.kind === 'doc') {
                const d = hrDocuments.find(function(x) { return x.id === a.id; });
                return d && teamIds.indexOf(d.employeeId) >= 0;
            }
            return true;
        });
        const urgentAlerts = alerts.filter(function(a) { return a.level === 'danger' || a.level === 'warn'; }).length;
        const saud = calcSaudizationStats(team);
        const pendingScoped = hrLeaveRequests.filter(function(l) {
            return l.status === 'pending' && teamIds.indexOf(l.employeeId) >= 0;
        }).length;

        const teamRows = team.slice(0, 8).map(function(e) {
            const att = hrAttendance.find(function(a) { return a.employeeId === e.id && a.date === today; });
            const st = att && att.checkIn ? '<span class="erp-tag erp-tag--ok">حاضر ' + esc(att.checkIn) + '</span>' : '<span class="erp-tag">—</span>';
            return '<tr><td>' + esc(e.employeeNo) + '</td><td>' + esc(e.nameAr) + '</td><td>' + esc(e.jobTitle || '') + '</td><td>' + st + '</td></tr>';
        }).join('');

        const vehRows = vehs.filter(function(v) { return v.currentDriverName; }).slice(0, 5).map(function(v) {
            return '<article class="hr-command-mini-card"><span class="plate-badge">' + esc(v.plateNo) + '</span><strong>' + esc(v.currentDriverName) + '</strong><small>خارجة الآن</small></article>';
        }).join('');

        const quickTabs = [
            { id: 'employees', icon: 'fas fa-users', label: 'الفريق' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور' },
            { id: 'documents', icon: 'fas fa-folder-open', label: 'مستندات' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'إجازات' }
        ];
        if (isHrTabAllowedForScope('vehicles')) quickTabs.push({ id: 'vehicles', icon: 'fas fa-car', label: 'سيارات' });
        if (isHrTabAllowedForScope('tracking')) quickTabs.push({ id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع' });
        if (isHrTabAllowedForScope('factory')) quickTabs.push({ id: 'factory', icon: 'fas fa-industry', label: 'المصنع' });

        const quickHtml = quickTabs.map(function(t) {
            return '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            renderHrScopeBanner() +
            '<div class="hr-command-hero">' +
                '<div class="hr-command-hero-glow"></div>' +
                '<div class="hr-command-hero-inner">' +
                    '<span class="hr-command-pill"><i class="' + esc(scope.icon) + '"></i> ' + esc(scope.label) + '</span>' +
                    '<h2 class="hr-command-title">مركز HR — مصنع نبراس للأبواب WPC</h2>' +
                    '<p class="hr-command-sub">إدارة موظفيك وسيارات نطاقك · منظم · خاص · آمن</p>' +
                '</div>' +
            '</div>' +
            '<div class="hr-command-kpi-ring">' +
                '<div class="hr-command-kpi"><strong>' + team.length + '</strong><span>فريق القسم</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--ok"><strong>' + presentToday + '</strong><span>حضور اليوم</span></div>' +
                '<div class="hr-command-kpi"><strong>' + onLeaveTeam + '</strong><span>في إجازة</span></div>' +
                '<div class="hr-command-kpi"><strong>' + vehs.length + '</strong><span>سيارات النطاق</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--accent"><strong>' + onRoad + '</strong><span>خارجة الآن</span></div>' +
                '<div class="hr-command-kpi' + (urgentAlerts ? ' hr-command-kpi--danger' : '') + '"><strong>' + urgentAlerts + '</strong><span>تنبيهات</span></div>' +
                '<div class="hr-command-kpi"><strong>' + saud.pct + '%</strong><span>سعودة الفريق</span></div>' +
                '<div class="hr-command-kpi"><strong>' + pendingScoped + '</strong><span>إجازات معلقة</span></div>' +
            '</div>' +
            '<div class="hr-command-quick-row">' + quickHtml + '</div>' +
            '<div class="hr-command-split">' +
                '<div class="hr-command-panel">' +
                    '<h4><i class="fas fa-users"></i> فريقك — حضور اليوم</h4>' +
                    '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الرقم</th><th>الاسم</th><th>المسمى</th><th>الحضور</th></tr></thead><tbody>' +
                    (teamRows || '<tr><td colspan="4" class="erp-empty">لا موظفين في نطاقك</td></tr>') + '</tbody></table></div>' +
                '</div>' +
                '<div class="hr-command-panel">' +
                    '<h4><i class="fas fa-car"></i> سيارات خارجة — نطاقك</h4>' +
                    '<div class="hr-command-mini-grid">' + (vehRows || '<p class="erp-empty">لا سيارات خارجة</p>') + '</div>' +
                '</div>' +
            '</div>' +
            renderHrDashboardAlertsBlock() +
        '</div>';
    }

    function renderHrAdminCommandCenter(user) {
        const host = document.getElementById('hr-command-center');
        if (!host) return;
        if (!user || !isStrictHrUser(user)) {
            host.hidden = true;
            host.innerHTML = '';
            return;
        }
        loadHrData();
        const scope = getHrAdminScope(user);
        const today = new Date().toISOString().slice(0, 10);
        const team = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status === 'active'; }), 'employee');
        const teamIds = team.map(function(e) { return e.id; });
        const present = hrAttendance.filter(function(a) { return a.date === today && a.checkIn && teamIds.indexOf(a.employeeId) >= 0; }).length;
        const vehs = applyHrScopeFilter(hrVehicles, 'vehicle').length;
        const onRoad = applyHrScopeFilter(hrVehicleTracking.filter(function(t) { return t.status === 'on_road'; }), 'tracking').length;
        const alerts = collectHrAlerts().filter(function(a) {
            if (a.kind === 'doc') {
                const d = hrDocuments.find(function(x) { return x.id === a.id; });
                return d && teamIds.indexOf(d.employeeId) >= 0;
            }
            return true;
        }).length;

        host.hidden = false;
        host.innerHTML =
            '<div class="hr-command-center-wrap">' +
                '<div class="hr-command-hero hr-command-hero--dash">' +
                    '<div class="hr-command-hero-glow"></div>' +
                    '<div class="hr-command-hero-inner">' +
                        '<span class="hr-command-pill"><i class="' + esc(scope.icon) + '"></i> نطاقك الخاص</span>' +
                        '<h2>' + esc(scope.label) + '</h2>' +
                        '<p>داشبورد HR — مصنع نبراس WPC · بيانات قسمك فقط</p>' +
                        '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrPlatform()"><i class="fas fa-people-roof"></i> فتح منصة HR الكاملة</button>' +
                    '</div>' +
                '</div>' +
                '<div class="hr-command-kpi-ring hr-command-kpi-ring--dash">' +
                    '<div class="hr-command-kpi"><strong>' + team.length + '</strong><span>موظفو نطاقك</span></div>' +
                    '<div class="hr-command-kpi hr-command-kpi--ok"><strong>' + present + '</strong><span>حضور اليوم</span></div>' +
                    '<div class="hr-command-kpi"><strong>' + vehs + '</strong><span>سيارات</span></div>' +
                    '<div class="hr-command-kpi hr-command-kpi--accent"><strong>' + onRoad + '</strong><span>خارجة</span></div>' +
                    '<div class="hr-command-kpi"><strong>' + alerts + '</strong><span>تنبيهات</span></div>' +
                '</div>' +
                '<p class="hr-scope-privacy-note"><i class="fas fa-lock"></i> خصوصية مطلقة — لا يرى مستخدمو الأقسام الأخرى بيانات قسمك</p>' +
            '</div>';
    }
