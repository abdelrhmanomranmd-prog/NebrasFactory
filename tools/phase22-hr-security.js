/* Phase 22 — HR scope enforcement + period purge */

    function requireHrRecordInScope(record, kind) {
        if (!record) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(currentAdmin)) return true;
        const scope = getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (kind === 'employee' && typeof employeeMatchesHrScope === 'function') {
            if (!employeeMatchesHrScope(record, scope)) {
                alert('خارج نطاقك — هذا السجل لقسم/فرع آخر.');
                return false;
            }
            return true;
        }
        if (kind === 'vehicle' && typeof vehicleMatchesHrScope === 'function') {
            if (!vehicleMatchesHrScope(record, scope)) {
                alert('خارج نطاقك — هذه السيارة لفرع/قسم آخر.');
                return false;
            }
            return true;
        }
        if (kind === 'tracking' && typeof applyHrScopeFilter === 'function') {
            const ok = applyHrScopeFilter([record], 'tracking').length > 0;
            if (!ok) alert('خارج نطاقك — سجل التتبع لفرع/قسم آخر.');
            return ok;
        }
        if (kind === 'attendance' || kind === 'document' || kind === 'leave') {
            const emp = getEmployeeById(record.employeeId);
            if (emp && typeof employeeMatchesHrScope === 'function' && !employeeMatchesHrScope(emp, scope)) {
                alert('خارج نطاقك — هذا السجل لموظف خارج فريقك.');
                return false;
            }
        }
        return true;
    }

    function assertHrNewRecordInScope(record) {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(currentAdmin)) return true;
        const scope = getHrAdminScope();
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (scope.branchId && String(record.branchId) !== String(scope.branchId)) {
            alert('لا يمكنك إضافة سجل لفرع خارج نطاقك.');
            return false;
        }
        if (scope.departmentKey && record.departmentKey && record.departmentKey !== scope.departmentKey) {
            alert('لا يمكنك إضافة سجل لقسم خارج نطاقك.');
            return false;
        }
        return true;
    }

    function getHrAdminScope(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return { mode: 'full', branchId: '', departmentKey: '', label: '—', icon: 'fas fa-industry' };
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) {
            return { mode: 'full', branchId: '', departmentKey: '', label: 'الإدارة الرئيسية — كل الفروع والأقسام', icon: 'fas fa-crown' };
        }
        const hasHrScope = String(admin.hrScopeBranchId || '').trim() || String(admin.hrScopeDepartmentKey || '').trim();
        const strictHr = isStrictHrUser(admin);
        if (!strictHr && !hasHrScope) {
            if (admin.assignedBranchCity && typeof branchCityToHrBranchId === 'function') {
                const bid = branchCityToHrBranchId(admin.assignedBranchCity);
                if (bid) {
                    return {
                        mode: 'branch',
                        branchId: bid,
                        departmentKey: '',
                        label: 'فرع: ' + admin.assignedBranchCity,
                        icon: 'fas fa-building'
                    };
                }
            }
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
        if (!label) label = strictHr ? 'موارد بشرية — نطاقك' : 'نطاق محدّد';
        const mode = departmentKey ? 'department' : (branchId ? 'branch' : 'company');
        return { mode: mode, branchId: branchId, departmentKey: departmentKey, label: label, icon: icon };
    }

    function collectHrAlerts() {
        const alerts = [];
        const today = new Date();
        const scopedEmpIds = typeof getHrScopedEmployeeIds === 'function' ? getHrScopedEmployeeIds() : null;
        const scopedVehs = typeof applyHrScopeFilter === 'function' ? applyHrScopeFilter(hrVehicles.slice(), 'vehicle') : hrVehicles;

        hrDocuments.forEach(function(d) {
            if (!d.expiryDate) return;
            if (scopedEmpIds && scopedEmpIds.indexOf(d.employeeId) < 0) return;
            const exp = new Date(d.expiryDate + 'T12:00:00');
            const days = Math.round((exp - today) / (1000 * 60 * 60 * 24));
            const typeLabel = HR_DOC_TYPES[d.type] || d.type;
            if (days < 0) {
                alerts.push({ level: 'danger', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' منتهي منذ ' + Math.abs(days) + ' يوم', id: d.id, kind: 'doc' });
            } else if (days <= 60) {
                alerts.push({ level: 'warn', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' ينتهي خلال ' + days + ' يوم', id: d.id, kind: 'doc' });
            }
        });
        scopedVehs.forEach(function(v) {
            [['insuranceExp', 'تأمين'], ['inspectionExp', 'فحص'], ['registrationExp', 'استمارة']].forEach(function(pair) {
                const dt = v[pair[0]];
                if (!dt) return;
                const exp = new Date(dt + 'T12:00:00');
                const days = Math.round((exp - today) / (1000 * 60 * 60 * 24));
                if (days < 0) {
                    alerts.push({ level: 'danger', cat: 'سيارة', ref: v.plateNo, detail: pair[1] + ' منتهي', id: v.id, kind: 'veh' });
                } else if (days <= 60) {
                    alerts.push({ level: 'warn', cat: 'سيارة', ref: v.plateNo, detail: pair[1] + ' خلال ' + days + ' يوم', id: v.id, kind: 'veh' });
                }
            });
        });
        const scopedLeave = typeof applyHrScopeFilter === 'function' ? applyHrScopeFilter(hrLeaveRequests.slice(), 'leave') : hrLeaveRequests;
        scopedLeave.filter(function(l) { return l.status === 'pending'; }).forEach(function(l) {
            alerts.push({ level: 'info', cat: 'إجازة', ref: l.employeeName, detail: 'طلب إجازة معلق', id: l.id, kind: 'leave' });
        });
        return alerts.sort(function(a, b) {
            const ord = { danger: 0, warn: 1, info: 2 };
            return (ord[a.level] || 9) - (ord[b.level] || 9);
        });
    }

    function getSalesRepUsers() {
        if (typeof adminUsers === 'undefined' || !Array.isArray(adminUsers)) return [];
        const scope = getHrAdminScope();
        return adminUsers.filter(function(u) {
            if (!u || u.role !== 'sales_rep' || u.isActive === false) return false;
            if (scope.mode === 'full' || scope.mode === 'company') return true;
            if (scope.branchId && u.assignedBranchId != null && String(u.assignedBranchId) !== String(scope.branchId)) return false;
            if (scope.branchId && u.assignedBranchCity && typeof branchCityToHrBranchId === 'function') {
                const bid = branchCityToHrBranchId(u.assignedBranchCity);
                if (bid && String(bid) !== String(scope.branchId)) return false;
            }
            return true;
        });
    }

    function filterHrFactoryEmployees(list) {
        list = list || hrEmployees.slice();
        list = typeof applyHrScopeFilter === 'function' ? applyHrScopeFilter(list, 'employee') : list;
        if (hrBranchFilter) list = list.filter(function(e) { return String(e.branchId) === String(hrBranchFilter); });
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(e) {
                return [e.nameAr, e.nameEn, e.employeeNo, e.phone, e.jobTitle, e.department].join(' ').toLowerCase().indexOf(q) >= 0;
            });
        }
        return list;
    }

    function purgeHrAnalyticsByPeriod(period) {
        if (typeof requireMainGovernanceAdmin === 'function' && !requireMainGovernanceAdmin()) return;
        let removed = 0;
        const keepAtt = [];
        hrAttendance.forEach(function(a) {
            const raw = a.date || a.checkInAt;
            if (raw && typeof matchesExecutiveReportPeriod === 'function' && matchesExecutiveReportPeriod({ date: raw }, period)) {
                removed++;
            } else {
                keepAtt.push(a);
            }
        });
        hrAttendance = keepAtt;
        const keepAct = [];
        hrDeptActivity.forEach(function(a) {
            const raw = a.at || a.date || a.createdAt;
            if (raw && typeof matchesExecutiveReportPeriod === 'function' && matchesExecutiveReportPeriod({ at: raw }, period)) {
                removed++;
            } else {
                keepAct.push(a);
            }
        });
        hrDeptActivity = keepAct;
        saveHrData();
        if (typeof hrAudit === 'function') hrAudit('HR حذف تحليلات', period + ' — ' + removed + ' سجل');
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('HR: حذف ' + removed + ' سجل حضور/نشاط — ' + period, 'ok');
    }

    function isHrFleetRepsTabAllowed() {
        if (typeof canViewHrExecutiveReports === 'function' && canViewHrExecutiveReports()) return true;
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        const fleetDepts = ['installation', 'warehouse', 'sales', 'admin', 'maintenance', 'hr'];
        if (scope.departmentKey && fleetDepts.indexOf(scope.departmentKey) >= 0) return true;
        if (scope.mode === 'branch') return true;
        return false;
    }
