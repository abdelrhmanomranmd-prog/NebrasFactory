/* Phase 15 — Nebras WPC Factory HR: shifts, production lines, Saudization, factory ops */

    const HR_SHIFT_ROSTER_KEY = 'nebrasHrShiftRoster';

    const HR_FACTORY_DEPTS = {
        admin: 'الإدارة والمكتب',
        production_wpc: 'إنتاج WPC',
        production_alu: 'خط الألومنيوم',
        workshop: 'الورشة والتشغيل',
        quality: 'الجودة والفحص',
        warehouse: 'المستودع واللوجستيات',
        installation: 'التركيب والميداني',
        sales: 'المبيعات والعروض',
        maintenance: 'الصيانة والمرافق',
        hr: 'الموارد البشرية'
    };

    const HR_SHIFTS = {
        morning: { label: 'صباحية (6–14)', start: '06:00', end: '14:00', stdHours: 8 },
        evening: { label: 'مسائية (14–22)', start: '14:00', end: '22:00', stdHours: 8 },
        night: { label: 'ليلية (22–6)', start: '22:00', end: '06:00', stdHours: 8 },
        admin: { label: 'إداري (8–17)', start: '08:00', end: '17:00', stdHours: 8 }
    };

    const HR_PROD_LINES = {
        wpc_press: 'كبس WPC',
        wpc_finish: 'تشطيب WPC',
        wpc_cut: 'قص وتجهيز WPC',
        alu_extrusion: 'بثق ألومنيوم',
        alu_assembly: 'تجميع ألومنيوم',
        door_assembly: 'تجميع أبواب',
        qc_final: 'فحص نهائي',
        packing: 'تغليف وشحن',
        installation: 'فرق تركيب',
        none: '— غير مرتبط بخط —'
    };

    const HR_SKILL_LEVELS = {
        trainee: 'متدرب',
        operator: 'مشغّل',
        skilled: 'فني ماهر',
        supervisor: 'مشرف خط',
        manager: 'إداري'
    };

    let hrShiftRoster = [];

    function loadHrPhase15Data() {
        try {
            const r = localStorage.getItem(HR_SHIFT_ROSTER_KEY);
            hrShiftRoster = r ? JSON.parse(r) : [];
            if (!Array.isArray(hrShiftRoster)) hrShiftRoster = [];
        } catch (e) { hrShiftRoster = []; }
    }

    function saveHrPhase15Data() {
        try {
            localStorage.setItem(HR_SHIFT_ROSTER_KEY, JSON.stringify(hrShiftRoster));
        } catch (e) { console.warn('HR phase15 save', e); }
    }

    function setHrShiftRosterFromCloud(v) {
        hrShiftRoster = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_SHIFT_ROSTER_KEY, JSON.stringify(hrShiftRoster)); } catch (e) { /* ignore */ }
    }

    function isEmployeeSaudi(emp) {
        if (!emp) return false;
        const n = String(emp.nationality || '').trim();
        return n === 'سعودي' || n === 'سعودية' || n.toLowerCase() === 'saudi';
    }

    function calcSaudizationStats(list) {
        const emps = (list || hrEmployees).filter(function(e) { return e.status === 'active'; });
        const total = emps.length;
        const saudi = emps.filter(isEmployeeSaudi).length;
        const pct = total ? Math.round((saudi / total) * 100) : 0;
        return { total: total, saudi: saudi, nonSaudi: total - saudi, pct: pct };
    }

    function calcOvertimeHours(workHours, stdHours) {
        const h = parseFloat(workHours) || 0;
        const std = parseFloat(stdHours) || 8;
        return Math.max(0, Math.round((h - std) * 100) / 100);
    }

    function getEmployeeShiftId(emp) {
        if (!emp) return 'admin';
        return emp.shiftId || 'admin';
    }

    function filterHrFactoryEmployees() {
        let list = hrEmployees.filter(function(e) { return e.status === 'active'; });
        if (hrBranchFilter) {
            list = list.filter(function(e) { return String(e.branchId) === String(hrBranchFilter); });
        }
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(e) {
                const hay = [
                    e.nameAr, e.employeeNo, e.department, e.jobTitle,
                    HR_FACTORY_DEPTS[e.departmentKey] || e.department,
                    HR_PROD_LINES[e.productionLine] || e.productionLine
                ].join(' ').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
        return list;
    }

    function getTodayShiftRoster(date) {
        const d = date || new Date().toISOString().slice(0, 10);
        return hrShiftRoster.filter(function(r) { return r.date === d; });
    }

    function ensureBuiltinHrPhase15Seed() {
        const today = new Date().toISOString().slice(0, 10);
        hrEmployees.forEach(function(e) {
            if (!e.departmentKey && e.department) {
                const hit = Object.keys(HR_FACTORY_DEPTS).find(function(k) {
                    return HR_FACTORY_DEPTS[k] === e.department || e.department.indexOf(HR_FACTORY_DEPTS[k]) >= 0;
                });
                if (hit) e.departmentKey = hit;
            }
            if (!e.shiftId) e.shiftId = (e.departmentKey === 'admin' || e.departmentKey === 'sales') ? 'admin' : 'morning';
            if (!e.skillLevel) e.skillLevel = e.employmentType === 'daily' ? 'operator' : 'skilled';
        });
        if (hrEmployees.length < 6) return;
        const extras = [
            {
                id: 'emp-hq-005', employeeNo: 'NEB-005', nameAr: 'سعد فهد الدوسري', nameEn: 'Saad Al-Dosari',
                nationalId: '5*********', nationality: 'سعودي', branchId: 'hq', departmentKey: 'production_wpc',
                department: 'إنتاج WPC', jobTitle: 'مشغّل خط كبس WPC', employmentType: 'fulltime', status: 'active',
                shiftId: 'morning', productionLine: 'wpc_press', skillLevel: 'skilled',
                joinDate: '2022-04-01', phone: '0500000005', salary: 7500, transportAllowance: 600, createdAt: today, updatedAt: today
            },
            {
                id: 'emp-hq-006', employeeNo: 'NEB-006', nameAr: 'راجيش كومار', nameEn: 'Rajesh Kumar',
                nationalId: '6*********', nationality: 'هندي', branchId: 'hq', departmentKey: 'quality',
                department: 'الجودة والفحص', jobTitle: 'مفتش جودة أبواب', employmentType: 'fulltime', status: 'active',
                shiftId: 'evening', productionLine: 'qc_final', skillLevel: 'skilled',
                joinDate: '2021-09-15', phone: '0500000006', salary: 6800, createdAt: today, updatedAt: today
            },
            {
                id: 'emp-hq-007', employeeNo: 'NEB-007', nameAr: 'فهد العنزي', nameEn: 'Fahad Al-Anzi',
                nationalId: '7*********', nationality: 'سعودي', branchId: 'hq', departmentKey: 'installation',
                department: 'التركيب والميداني', jobTitle: 'مشرف فرق تركيب', employmentType: 'fulltime', status: 'active',
                shiftId: 'admin', productionLine: 'installation', skillLevel: 'supervisor',
                joinDate: '2019-11-01', phone: '0500000007', salary: 11000, housingAllowance: 1500, createdAt: today, updatedAt: today
            },
            {
                id: 'emp-hq-008', employeeNo: 'NEB-008', nameAr: 'يوسف إبراهيم', nameEn: 'Youssef Ibrahim',
                nationalId: '8*********', nationality: 'مصري', branchId: 'hq', departmentKey: 'warehouse',
                department: 'المستودع واللوجستيات', jobTitle: 'أمين مستودع', employmentType: 'fulltime', status: 'active',
                shiftId: 'morning', productionLine: 'packing', skillLevel: 'operator',
                joinDate: '2020-02-20', phone: '0500000008', salary: 5500, createdAt: today, updatedAt: today
            }
        ];
        extras.forEach(function(x) {
            if (!hrEmployees.some(function(e) { return e.id === x.id; })) hrEmployees.push(x);
        });
        if (!hrShiftRoster.length) {
            ['morning', 'evening', 'admin'].forEach(function(sh, i) {
                hrEmployees.filter(function(e) { return e.status === 'active' && getEmployeeShiftId(e) === sh; }).slice(0, 4).forEach(function(e, j) {
                    hrShiftRoster.push({
                        id: 'sr-' + sh + '-' + j,
                        date: today,
                        employeeId: e.id,
                        employeeNo: e.employeeNo,
                        employeeName: e.nameAr,
                        shiftId: sh,
                        productionLine: e.productionLine || '',
                        branchId: e.branchId || 'hq',
                        status: 'scheduled',
                        note: ''
                    });
                });
            });
        }
    }

    function renderHrFactoryPanel() {
        const today = new Date().toISOString().slice(0, 10);
        const emps = filterHrFactoryEmployees();
        const saud = calcSaudizationStats(emps);
        const roster = getTodayShiftRoster(today);
        const prodCount = emps.filter(function(e) {
            return e.departmentKey === 'production_wpc' || e.departmentKey === 'production_alu' || e.departmentKey === 'workshop';
        }).length;
        const onAttToday = hrAttendance.filter(function(a) {
            return a.date === today && a.checkIn && emps.some(function(e) { return e.id === a.employeeId; });
        }).length;
        const otTotal = hrAttendance.filter(function(a) { return a.date === today && (a.overtimeHours || 0) > 0; })
            .reduce(function(s, a) { return s + (a.overtimeHours || 0); }, 0);

        const shiftCards = Object.keys(HR_SHIFTS).map(function(sh) {
            const def = HR_SHIFTS[sh];
            const count = emps.filter(function(e) { return getEmployeeShiftId(e) === sh; }).length;
            const present = roster.filter(function(r) { return r.shiftId === sh; }).length;
            return '<div class="hr-factory-shift-card"><strong>' + esc(def.label) + '</strong><span>' + count + ' موظف</span><small>جدول اليوم: ' + present + '</small></div>';
        }).join('');

        const deptRows = Object.keys(HR_FACTORY_DEPTS).map(function(k) {
            const c = emps.filter(function(e) { return e.departmentKey === k || e.department === HR_FACTORY_DEPTS[k]; }).length;
            if (!c) return '';
            const saudIn = emps.filter(function(e) {
                return (e.departmentKey === k || e.department === HR_FACTORY_DEPTS[k]) && isEmployeeSaudi(e);
            }).length;
            return '<tr><td>' + esc(HR_FACTORY_DEPTS[k]) + '</td><td>' + c + '</td><td>' + saudIn + '</td><td>' + (c ? Math.round((saudIn / c) * 100) : 0) + '%</td></tr>';
        }).join('');

        const lineRows = Object.keys(HR_PROD_LINES).filter(function(k) { return k !== 'none'; }).map(function(k) {
            const c = emps.filter(function(e) { return e.productionLine === k; }).length;
            if (!c) return '';
            return '<div class="hr-report-card"><strong>' + c + '</strong><span>' + esc(HR_PROD_LINES[k]) + '</span></div>';
        }).join('');

        const rosterRows = roster.map(function(r) {
            const sh = HR_SHIFTS[r.shiftId] || { label: r.shiftId };
            const att = hrAttendance.find(function(a) { return a.employeeId === r.employeeId && a.date === today; });
            const st = att && att.checkIn ? '<span class="erp-tag erp-tag--ok">حاضر</span>' : '<span class="erp-tag">مجدول</span>';
            return '<tr><td>' + esc(r.employeeNo) + '<br><small>' + esc(r.employeeName) + '</small></td>' +
                '<td>' + esc(sh.label) + '</td><td>' + esc(HR_PROD_LINES[r.productionLine] || '—') + '</td>' +
                '<td>' + st + (att && att.overtimeHours ? ' <small>+' + att.overtimeHours + 'h</small>' : '') + '</td>' +
                '<td><button type="button" class="erp-tag" onclick="deleteHrShiftRoster(\'' + esc(r.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');

        const empOpts = emps.map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const shiftOpts = Object.keys(HR_SHIFTS).map(function(k) {
            return '<option value="' + k + '">' + HR_SHIFTS[k].label + '</option>';
        }).join('');
        const lineOpts = Object.keys(HR_PROD_LINES).map(function(k) {
            return '<option value="' + k + '">' + HR_PROD_LINES[k] + '</option>';
        }).join('');

        const saudClass = saud.pct >= 30 ? 'hr-saud-gauge--ok' : (saud.pct >= 20 ? 'hr-saud-gauge--warn' : 'hr-saud-gauge--low');

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-industry"></i> <strong>مصنع نبراس للأبواب WPC</strong> — ورديات · خطوط إنتاج · سعودة · حضور الإنتاج. المقر القصيم + الفروع.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card hr-report-card--accent"><strong>' + prodCount + '</strong><span>قوة إنتاج</span></div>' +
                '<div class="hr-report-card"><strong>' + onAttToday + '</strong><span>حضور اليوم</span></div>' +
                '<div class="hr-report-card"><strong>' + otTotal + 'h</strong><span>ساعات إضافية اليوم</span></div>' +
                '<div class="hr-report-card ' + saudClass + '"><strong>' + saud.pct + '%</strong><span>سعودة (' + saud.saudi + '/' + saud.total + ')</span></div>' +
            '</div>' +
            '<div class="hr-saud-gauge ' + saudClass + '"><div class="hr-saud-gauge-fill" style="width:' + Math.min(100, saud.pct) + '%"></div><span>نسبة السعوديين — هدف القطاع 30%+</span></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-clock"></i> الورديات</h4>' +
            '<div class="hr-factory-shift-grid">' + shiftCards + '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-layer-group"></i> خطوط الإنتاج</h4>' +
            '<div class="hr-report-grid">' + (lineRows || '<p class="erp-empty">عيّني خط الإنتاج من بطاقة الموظف</p>') + '</div>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-calendar-plus"></i> إضافة لجدول وردية اليوم</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="hsr-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>الوردية</span><select id="hsr-shift">' + shiftOpts + '</select></label>' +
                '<label class="nebras-field"><span>خط الإنتاج</span><select id="hsr-line">' + lineOpts + '</select></label>' +
                '<label class="nebras-field"><span>ملاحظة</span><input id="hsr-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addHrShiftRoster()"><i class="fas fa-plus"></i> إضافة للجدول</button>' +
            (canViewHrExecutiveReports() ? '<button type="button" class="nebras-users-btn" onclick="exportHrFactoryCsv()"><i class="fas fa-file-csv"></i> تصدير CSV</button>' : '') +
            '</div></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-table"></i> جدول وردية — ' + formatHrDate(today) + '</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الموظف</th><th>الوردية</th><th>الخط</th><th>الحضور</th><th></th></tr></thead><tbody>' +
            (rosterRows || '<tr><td colspan="5" class="erp-empty">لا جدول — أضيفي موظفين للوردية</td></tr>') + '</tbody></table></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-sitemap"></i> الأقسام · السعودة</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>القسم</th><th>العدد</th><th>سعوديون</th><th>النسبة</th></tr></thead><tbody>' +
            (deptRows || '<tr><td colspan="4" class="erp-empty">لا بيانات</td></tr>') + '</tbody></table></div></div>';
    }

    function addHrShiftRoster() {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(hrField('hsr-employee'));
        if (!emp) { alert('اختر موظفاً.'); return; }
        const today = new Date().toISOString().slice(0, 10);
        hrShiftRoster.unshift({
            id: 'sr-' + Date.now(),
            date: today,
            employeeId: emp.id,
            employeeNo: emp.employeeNo,
            employeeName: emp.nameAr,
            shiftId: hrField('hsr-shift') || emp.shiftId || 'morning',
            productionLine: hrField('hsr-line') || emp.productionLine || '',
            branchId: emp.branchId || 'hq',
            status: 'scheduled',
            note: hrField('hsr-note')
        });
        saveHrData();
        hrAudit('HR جدول وردية', emp.nameAr);
        renderHrPlatformPanel();
    }

    function deleteHrShiftRoster(id) {
        if (!requireHrOps()) return;
        hrShiftRoster = hrShiftRoster.filter(function(x) { return x.id !== id; });
        saveHrData();
        renderHrPlatformPanel();
    }

    function exportHrFactoryCsv() {
        if (!requireHrExecutiveReport()) return;
        const saud = calcSaudizationStats();
        const lines = ['قسم,عدد,سعوديون,نسبة سعودة'];
        Object.keys(HR_FACTORY_DEPTS).forEach(function(k) {
            const emps = hrEmployees.filter(function(e) {
                return e.status === 'active' && (e.departmentKey === k || e.department === HR_FACTORY_DEPTS[k]);
            });
            const c = emps.length;
            const s = emps.filter(isEmployeeSaudi).length;
            if (c) lines.push([HR_FACTORY_DEPTS[k], c, s, Math.round((s / c) * 100) + '%'].join(','));
        });
        lines.push('');
        lines.push('إجمالي سعودة,' + saud.total + ',' + saud.saudi + ',' + saud.pct + '%');
        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-hr-factory-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        hrAudit('HR تصدير مصنع', 'CSV سعودة وأقسام');
    }

    function renderHrFactoryDashboardBlock() {
        const saud = calcSaudizationStats();
        const prod = hrEmployees.filter(function(e) {
            return e.status === 'active' && (e.departmentKey === 'production_wpc' || e.departmentKey === 'production_alu' || e.departmentKey === 'workshop');
        }).length;
        const saudClass = saud.pct >= 30 ? 'erp-stat--ok' : 'erp-stat--accent';
        return '<div class="hr-factory-dash-block">' +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-industry"></i> مصنع WPC — لمحة سريعة ' +
            '<button type="button" class="erp-tag erp-tag--action" onclick="switchHrTab(\'factory\')">عمليات المصنع</button></h4>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card hr-report-card--accent"><strong>' + prod + '</strong><span>عمال إنتاج</span></div>' +
                '<div class="hr-report-card ' + (saud.pct >= 30 ? '' : 'hr-report-card--danger') + '"><strong>' + saud.pct + '%</strong><span>سعودة</span></div>' +
                '<div class="hr-report-card"><strong>' + Object.keys(HR_SHIFTS).length + '</strong><span>ورديات</span></div>' +
            '</div></div>';
    }

    function factoryDeptSelectHtml(selectedKey, fieldId) {
        const opts = Object.keys(HR_FACTORY_DEPTS).map(function(k) {
            return '<option value="' + k + '"' + (selectedKey === k ? ' selected' : '') + '>' + HR_FACTORY_DEPTS[k] + '</option>';
        }).join('');
        return '<select id="' + (fieldId || 'he-dept-key') + '"><option value="">— قسم —</option>' + opts + '</select>';
    }
