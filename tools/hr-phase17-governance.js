/* Phase 17 — HR dept governor + activity log + executive daily/monthly governance reports */

    const HR_DEPT_ACTIVITY_KEY = 'nebrasHrDeptActivity';
    let hrDeptActivity = [];

    function loadHrPhase17Data() {
        try {
            const a = localStorage.getItem(HR_DEPT_ACTIVITY_KEY);
            hrDeptActivity = a ? JSON.parse(a) : [];
            if (!Array.isArray(hrDeptActivity)) hrDeptActivity = [];
        } catch (e) { hrDeptActivity = []; }
    }

    function saveHrPhase17Data() {
        try {
            localStorage.setItem(HR_DEPT_ACTIVITY_KEY, JSON.stringify(hrDeptActivity.slice(0, 500)));
        } catch (e) { console.warn('HR phase17 save', e); }
    }

    function setHrDeptActivityFromCloud(v) {
        hrDeptActivity = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_DEPT_ACTIVITY_KEY, JSON.stringify(hrDeptActivity)); } catch (e) { /* ignore */ }
    }

    function isHrDeptGovernor(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        return isStrictHrUser(admin);
    }

    function logHrDeptActivity(action, detail) {
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const scope = getHrAdminScope(admin);
        const now = new Date();
        hrDeptActivity.unshift({
            id: 'hda-' + Date.now(),
            date: now.toISOString().slice(0, 10),
            time: now.toTimeString().slice(0, 5),
            action: action,
            detail: detail || '',
            scopeLabel: scope.label,
            branchId: scope.branchId || '',
            departmentKey: scope.departmentKey || '',
            userId: admin ? admin.id : '',
            username: admin ? admin.username : ''
        });
        if (hrDeptActivity.length > 500) hrDeptActivity.length = 500;
        saveHrPhase17Data();
    }

    function hrAuditGoverned(action, detail) {
        if (typeof addAuditLog === 'function') addAuditLog(action, detail);
        logHrDeptActivity(action, detail);
    }

    function hrScopePeriodMatch(entry, period) {
        const raw = entry.date || entry.createdAt || entry.assignedDate;
        if (!raw) return false;
        if (typeof matchesExecutiveReportPeriod === 'function') {
            return matchesExecutiveReportPeriod({ date: raw }, period);
        }
        const dd = new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw);
        if (isNaN(dd.getTime())) return false;
        const now = new Date();
        if (period === 'daily') return dd.toDateString() === now.toDateString();
        if (period === 'monthly') return dd.getFullYear() === now.getFullYear() && dd.getMonth() === now.getMonth();
        if (period === 'yearly') return dd.getFullYear() === now.getFullYear();
        return true;
    }

    function buildHrDeptGovernanceMatrix(period, branchId) {
        loadHrData();
        period = period || 'daily';
        const rows = [];
        const branchIds = ['hq'];
        if (typeof branchesData !== 'undefined' && Array.isArray(branchesData)) {
            branchesData.forEach(function(b) { if (b && b.id != null) branchIds.push(String(b.id)); });
        }
        const deptKeys = typeof HR_FACTORY_DEPTS !== 'undefined' ? Object.keys(HR_FACTORY_DEPTS) : [];
        deptKeys.forEach(function(deptKey) {
            branchIds.forEach(function(bid) {
                if (branchId != null && branchId !== '' && String(branchId) !== String(bid)) return;
                const scope = { mode: 'department', branchId: bid, departmentKey: deptKey };
                const emps = hrEmployees.filter(function(e) { return employeeMatchesHrScope(e, scope); });
                if (!emps.length) return;
                const teamIds = emps.map(function(e) { return e.id; });
                const att = hrAttendance.filter(function(a) {
                    return teamIds.indexOf(a.employeeId) >= 0 && hrScopePeriodMatch(a, period);
                });
                const present = att.filter(function(a) { return a.checkIn; }).length;
                const pendingLeave = hrLeaveRequests.filter(function(l) {
                    return l.status === 'pending' && teamIds.indexOf(l.employeeId) >= 0;
                }).length;
                const onRoad = hrVehicleTracking.filter(function(t) {
                    return t.status === 'on_road' && trackingMatchesHrScope(t, scope);
                }).length;
                const saud = calcSaudizationStats(emps);
                const acts = hrDeptActivity.filter(function(a) {
                    return a.departmentKey === deptKey && String(a.branchId || '') === String(bid) && hrScopePeriodMatch(a, period);
                }).length;
                const deptLabel = HR_FACTORY_DEPTS[deptKey] || deptKey;
                const branchLabel = resolveHrBranchLabel(bid);
                rows.push({
                    deptKey: deptKey,
                    branchId: bid,
                    cells: [
                        deptLabel,
                        branchLabel,
                        emps.length + ' موظف · ' + present + ' حضور',
                        'سعودة ' + saud.pct + '% · إجازات ' + pendingLeave + ' · سيارات ' + onRoad + ' · عمليات ' + acts
                    ],
                    stats: { emps: emps.length, present: present, saud: saud.pct, pendingLeave: pendingLeave, onRoad: onRoad, acts: acts }
                });
            });
        });
        return rows;
    }

    function buildHrExecutiveReportData(period, branchId) {
        loadHrData();
        const scopeBranch = function(entry) {
            if (branchId == null || branchId === '') return true;
            const bid = String(branchId);
            if (bid === 'hq') return String(entry.branchId) === 'hq';
            return String(entry.branchId) === bid;
        };
        const scopePeriod = function(entry) { return hrScopePeriodMatch(entry, period); };

        const att = hrAttendance.filter(function(a) { return scopeBranch(a) && scopePeriod(a); });
        const emps = hrEmployees.filter(scopeBranch);
        const activeEmps = emps.filter(function(e) { return e.status === 'active'; }).length;
        const withCheckIn = att.filter(function(a) { return a.checkIn; }).length;
        const bioCount = att.filter(function(a) { return a.checkInMethod === 'biometric' || a.bioVerified; }).length;
        const mobileCount = att.filter(function(a) { return a.checkInMethod === 'mobile'; }).length;
        const onRoad = hrVehicleTracking.filter(function(t) {
            return t.status === 'on_road' && scopeBranch(t);
        }).length;
        const saud = calcSaudizationStats(emps);
        const otMonth = att.reduce(function(s, a) { return s + (a.overtimeHours || 0); }, 0);
        const govMatrix = buildHrDeptGovernanceMatrix(period, branchId);
        const totalActs = hrDeptActivity.filter(function(a) { return hrScopePeriodMatch(a, period); }).length;

        const rows = att.slice(0, 12).map(function(a) {
            const meth = (typeof HR_ATT_METHOD !== 'undefined' && HR_ATT_METHOD[a.checkInMethod]) || a.checkInMethod || '—';
            return [
                a.date,
                (a.employeeNo || '') + ' — ' + (a.employeeName || ''),
                (a.checkIn || '—') + ' → ' + (a.checkOut || '—'),
                meth
            ];
        });

        const deptRows = govMatrix.map(function(r) { return r.cells; });
        const activityRows = hrDeptActivity.filter(function(a) {
            if (!hrScopePeriodMatch(a, period)) return false;
            if (branchId != null && branchId !== '' && String(a.branchId || '') !== String(branchId)) return false;
            return true;
        }).slice(0, 15).map(function(a) {
            return [
                (a.date || '') + ' ' + (a.time || ''),
                a.username || '—',
                a.action || '—',
                (a.scopeLabel ? a.scopeLabel + ' — ' : '') + (a.detail || '')
            ];
        });

        return {
            kpis: [
                { label: 'موظفون', val: emps.length },
                { label: 'نشطون', val: activeEmps },
                { label: 'سعودة', val: saud.pct + '%' },
                { label: 'سجلات حضور', val: att.length },
                { label: 'حضور مسجّل', val: withCheckIn },
                { label: 'ساعات إضافية', val: otMonth + 'h' },
                { label: 'أقسام HR نشطة', val: govMatrix.length },
                { label: 'عمليات HR', val: totalActs }
            ],
            rows: rows,
            deptRows: deptRows,
            activityRows: activityRows,
            govMatrix: govMatrix,
            period: period
        };
    }

    function getHrDeptActivity() {
        loadHrPhase17Data();
        return hrDeptActivity.slice();
    }

    function filterHrDeptActivityForScope() {
        const scope = getHrAdminScope();
        return hrDeptActivity.filter(function(a) {
            if (scope.mode === 'full' || scope.mode === 'company') return true;
            if (scope.departmentKey && a.departmentKey !== scope.departmentKey) return false;
            if (scope.branchId && String(a.branchId || '') !== String(scope.branchId)) return false;
            return true;
        });
    }

    function groupTeamByEmployeeDept(emps) {
        const groups = {};
        emps.forEach(function(e) {
            const k = e.department || (HR_FACTORY_DEPTS[e.departmentKey] || e.departmentKey || 'غير محدد');
            if (!groups[k]) groups[k] = [];
            groups[k].push(e);
        });
        return groups;
    }

    function renderHrGovernancePanel() {
        const scope = getHrAdminScope();
        const isOwner = isHrDeptGovernor();
        const team = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status === 'active'; }), 'employee');
        const groups = groupTeamByEmployeeDept(team);
        const groupRows = Object.keys(groups).map(function(k) {
            const list = groups[k];
            const saud = calcSaudizationStats(list);
            return '<tr><td><strong>' + esc(k) + '</strong></td><td>' + list.length + '</td><td>' + saud.pct + '%</td><td>' +
                list.map(function(e) { return esc(e.nameAr); }).slice(0, 4).join(' · ') + (list.length > 4 ? '…' : '') + '</td></tr>';
        }).join('');

        const branchBreak = {};
        team.forEach(function(e) {
            const bl = resolveHrBranchLabel(e.branchId);
            branchBreak[bl] = (branchBreak[bl] || 0) + 1;
        });
        const branchRows = Object.keys(branchBreak).map(function(k) {
            return '<div class="hr-report-card"><strong>' + branchBreak[k] + '</strong><span>' + esc(k) + '</span></div>';
        }).join('');

        const acts = filterHrDeptActivityForScope().slice(0, 25).map(function(a) {
            return '<tr><td>' + formatHrDate(a.date) + ' ' + esc(a.time || '') + '</td><td>' + esc(a.username || '—') + '</td>' +
                '<td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>';
        }).join('');

        const period = 'daily';
        const matrix = buildHrDeptGovernanceMatrix(period, scope.branchId || '');
        const matrixRows = matrix.filter(function(r) {
            if (scope.departmentKey && r.deptKey !== scope.departmentKey) return false;
            return true;
        }).map(function(r) {
            return '<tr><td>' + esc(r.cells[0]) + '</td><td>' + esc(r.cells[1]) + '</td><td>' + esc(r.cells[2]) + '</td><td>' + esc(r.cells[3]) + '</td></tr>';
        }).join('');

        const ownerBanner = isOwner
            ? '<div class="hr-gov-owner-banner"><i class="' + esc(scope.icon) + '"></i><div><strong>مسؤول إدارة وحوكمة القسم</strong>' +
                '<p>أنت مدير منظومة HR لـ <em>' + esc(scope.label) + '</em> — تدير موظفيك وسيارات نطاقك بصلاحيات كاملة داخل قسمك.</p></div></div>'
            : '<div class="hr-gov-owner-banner hr-gov-owner-banner--main"><i class="fas fa-crown"></i><div><strong>حوكمة HR — الإدارة الرئيسية</strong>' +
                '<p>رؤية شاملة لكل مسؤولي HR والأقسام والفروع — يظهر في التقارير التنفيذية اليومية والشهرية.</p></div></div>';

        return '<div class="hr-panel is-active">' +
            ownerBanner +
            '<div class="hr-report-grid">' + (branchRows || '<p class="erp-empty">لا فريق في النطاق</p>') + '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-sitemap"></i> أقسام الموظفين داخل نطاقك</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>قسم الموظفين</th><th>العدد</th><th>سعودة</th><th>أسماء</th></tr></thead><tbody>' +
            (groupRows || '<tr><td colspan="4" class="erp-empty">لا موظفين</td></tr>') + '</tbody></table></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-chart-pie"></i> مصفوفة الحوكمة — اليوم</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>قسم HR</th><th>الفرع</th><th>القوى العاملة</th><th>مؤشرات</th></tr></thead><tbody>' +
            (matrixRows || '<tr><td colspan="4" class="erp-empty">لا بيانات</td></tr>') + '</tbody></table></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-clock-rotate-left"></i> سجل عمليات قسمك</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>' +
            (acts || '<tr><td colspan="4" class="erp-empty">لا عمليات بعد</td></tr>') + '</tbody></table></div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportHrGovernanceCsv()"><i class="fas fa-file-csv"></i> تصدير حوكمة CSV</button>' +
                (canViewHrExecutiveReports() ? '<button type="button" class="nebras-users-btn" onclick="openExecutiveReports()"><i class="fas fa-chart-bar"></i> التقارير التنفيذية</button>' : '') +
            '</div></div>';
    }

    function exportHrGovernanceCsv() {
        if (!requireHrOps()) return;
        const scope = getHrAdminScope();
        const matrix = buildHrDeptGovernanceMatrix('monthly', scope.branchId || '');
        const lines = ['قسم HR,الفرع,موظفون,حضور,سعودة%,إجازات معلقة,سيارات خارجة,عمليات HR'];
        matrix.forEach(function(r) {
            if (scope.departmentKey && r.deptKey !== scope.departmentKey) return;
            lines.push([
                r.cells[0], r.cells[1], r.stats.emps, r.stats.present, r.stats.saud,
                r.stats.pendingLeave, r.stats.onRoad, r.stats.acts
            ].join(','));
        });
        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-hr-governance-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        hrAuditGoverned('HR حوكمة', 'تصدير CSV مصفوفة');
    }
