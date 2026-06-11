/**
 * نبراس — منصة الموارد البشرية (HR ERP)
 * موظفون · عمال · سيارات · إجازات — المقر الرئيسي وجميع الفروع
 */
(function(global) {
    'use strict';

    const HR_EMP_KEY = 'nebrasHrEmployees';
    const HR_VEH_KEY = 'nebrasHrVehicles';
    const HR_LEAVE_KEY = 'nebrasHrLeave';
    const HR_TRACK_KEY = 'nebrasHrVehicleTracking';

    let hrEmployees = [];
    let hrVehicles = [];
    let hrLeaveRequests = [];
    let hrVehicleTracking = [];
    let hrActiveTab = 'dashboard';
    let hrBranchFilter = '';
    let hrSearchQuery = '';
    let hrEmployeeEditorId = null;
    let hrVehicleEditorId = null;
    let hrTrackingEditorId = null;

    const HR_EMP_STATUS = {
        active: { label: 'نشط', cls: 'hr-status-active', tag: 'erp-tag--ok' },
        on_leave: { label: 'في إجازة', cls: 'hr-status-on_leave', tag: '' },
        suspended: { label: 'موقوف', cls: 'hr-status-suspended', tag: 'erp-tag--danger' },
        terminated: { label: 'منتهي', cls: 'hr-status-terminated', tag: '' }
    };

    const HR_EMP_TYPES = {
        fulltime: 'دوام كامل',
        contract: 'عقد',
        daily: 'يومية / عمال',
        remote: 'عن بُعد'
    };

    const HR_VEH_TYPES = {
        car: 'سيارة',
        truck: 'شاحنة',
        van: 'فان',
        bus: 'باص',
        pickup: 'بيك أب'
    };

    const HR_VEH_STATUS = {
        active: { label: 'نشطة', tag: 'erp-tag--ok' },
        maintenance: { label: 'صيانة', tag: '' },
        retired: { label: 'متوقفة', tag: 'erp-tag--danger' }
    };

    const HR_LEAVE_TYPES = {
        annual: 'سنوية',
        sick: 'مرضية',
        emergency: 'طارئة',
        unpaid: 'بدون راتب'
    };

    const HR_LEAVE_STATUS = {
        pending: { label: 'معلق', tag: '' },
        approved: { label: 'موافق', tag: 'erp-tag--ok' },
        rejected: { label: 'مرفوض', tag: 'erp-tag--danger' }
    };

    const HR_TRACK_STATUS = {
        on_road: { label: 'خارجة', tag: 'erp-tag--accent' },
        returned: { label: 'عادت', tag: 'erp-tag--ok' },
        cancelled: { label: 'ملغاة', tag: 'erp-tag--danger' }
    };

    const HR_DRIVER_TYPES = {
        employee: 'موظف مسجّل',
        external: 'سائق خارجي',
        temporary: 'سائق مؤقت'
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function hrNum(v) {
        const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
    }

    function hrField(id) {
        const el = document.getElementById(id);
        return el ? String(el.value || '').trim() : '';
    }

    function isStrictHrUser(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) return false;
        return admin.role === 'hr';
    }

    function canAccessHr() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof canManage === 'function' && canManage('hr')) return true;
        return false;
    }

    /** تقارير تنفيذية HR — الإدارة الرئيسية فقط */
    function canViewHrExecutiveReports() {
        return typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin();
    }

    function requireHrAccess(msg) {
        if (!canAccessHr()) {
            alert(msg || 'منصة الموارد البشرية — لموظف HR أو الإدارة الرئيسية.');
            return false;
        }
        return true;
    }

    function requireHrOps(msg) {
        if (!requireHrAccess(msg)) return false;
        return true;
    }

    function requireHrExecutiveReport(msg) {
        if (!canViewHrExecutiveReports()) {
            alert(msg || 'التقارير التنفيذية لـ HR — الإدارة الرئيسية (NEBRASFACTORY / NEBRASBASIC) فقط.');
            return false;
        }
        return true;
    }

    function getHrBranches() {
        const list = [{ id: '', label: 'كل الفروع والمقر' }];
        const hq = { id: 'hq', label: 'المقر الرئيسي — القصيم' };
        list.push(hq);
        if (typeof branchesData !== 'undefined' && Array.isArray(branchesData)) {
            branchesData.forEach(function(b) {
                if (!b) return;
                const name = typeof getBranchDisplayName === 'function'
                    ? getBranchDisplayName(b, 'ar')
                    : (b.city || b.city_en || 'فرع ' + b.id);
                list.push({ id: String(b.id), label: name });
            });
        }
        return list;
    }

    function resolveHrBranchLabel(branchId) {
        if (!branchId || branchId === 'hq') return 'المقر الرئيسي — القصيم';
        const branches = getHrBranches();
        const hit = branches.find(function(b) { return String(b.id) === String(branchId); });
        return hit ? hit.label : String(branchId);
    }

    function loadHrData() {
        try {
            const e = localStorage.getItem(HR_EMP_KEY);
            hrEmployees = e ? JSON.parse(e) : [];
            if (!Array.isArray(hrEmployees)) hrEmployees = [];
        } catch (err) { hrEmployees = []; }
        try {
            const v = localStorage.getItem(HR_VEH_KEY);
            hrVehicles = v ? JSON.parse(v) : [];
            if (!Array.isArray(hrVehicles)) hrVehicles = [];
        } catch (err) { hrVehicles = []; }
        try {
            const l = localStorage.getItem(HR_LEAVE_KEY);
            hrLeaveRequests = l ? JSON.parse(l) : [];
            if (!Array.isArray(hrLeaveRequests)) hrLeaveRequests = [];
        } catch (err) { hrLeaveRequests = []; }
        try {
            const t = localStorage.getItem(HR_TRACK_KEY);
            hrVehicleTracking = t ? JSON.parse(t) : [];
            if (!Array.isArray(hrVehicleTracking)) hrVehicleTracking = [];
        } catch (err) { hrVehicleTracking = []; }
        ensureBuiltinHrSeed();
        return { employees: hrEmployees, vehicles: hrVehicles, leave: hrLeaveRequests, tracking: hrVehicleTracking };
    }

    function saveHrData() {
        try {
            localStorage.setItem(HR_EMP_KEY, JSON.stringify(hrEmployees));
            localStorage.setItem(HR_VEH_KEY, JSON.stringify(hrVehicles));
            localStorage.setItem(HR_LEAVE_KEY, JSON.stringify(hrLeaveRequests));
            localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking));
        } catch (err) { console.warn('HR save failed', err); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function setHrEmployeesFromCloud(v) {
        hrEmployees = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_EMP_KEY, JSON.stringify(hrEmployees)); } catch (e) { /* ignore */ }
    }

    function setHrVehiclesFromCloud(v) {
        hrVehicles = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_VEH_KEY, JSON.stringify(hrVehicles)); } catch (e) { /* ignore */ }
    }

    function setHrLeaveFromCloud(v) {
        hrLeaveRequests = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_LEAVE_KEY, JSON.stringify(hrLeaveRequests)); } catch (e) { /* ignore */ }
    }

    function setHrVehicleTrackingFromCloud(v) {
        hrVehicleTracking = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking)); } catch (e) { /* ignore */ }
    }

    function ensureBuiltinHrSeed() {
        const now = new Date().toISOString().slice(0, 10);
        if (!hrEmployees.length) {
            hrEmployees = [
                {
                    id: 'emp-hq-001', employeeNo: 'NEB-001', nameAr: 'أحمد محمد العتيبي', nameEn: 'Ahmed Al-Otaibi',
                    nationalId: '1*********', nationality: 'سعودي', branchId: 'hq', department: 'الإدارة', jobTitle: 'مدير مصنع',
                    employmentType: 'fulltime', status: 'active', joinDate: '2018-03-01', phone: '0500000001', phone2: '0160000001',
                    email: 'ahmed@nebras.factory', emergencyName: 'فاطمة العتيبي', emergencyPhone: '0500000099',
                    salary: 18000, housingAllowance: 3000, transportAllowance: 1500, bankName: 'الراجحي', iban: 'SA00****',
                    gosiNo: 'GOSI-001', vehicleId: 'veh-001', notes: 'المقر الرئيسي', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-riy-002', employeeNo: 'NEB-002', nameAr: 'خالد سعد القحطاني', nameEn: 'Khaled Al-Qahtani',
                    nationalId: '2*********', nationality: 'سعودي', branchId: '2', department: 'المبيعات', jobTitle: 'مشرف مبيعات',
                    employmentType: 'fulltime', status: 'active', joinDate: '2020-06-15', phone: '0500000002', email: 'khaled@nebras.factory',
                    emergencyName: 'نورة القحطاني', emergencyPhone: '0500000088', salary: 12000, housingAllowance: 2000,
                    transportAllowance: 1000, vehicleId: 'veh-002', notes: 'فرع الرياض', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-jed-003', employeeNo: 'NEB-003', nameAr: 'محمد علي الزهراني', nameEn: 'Mohammed Al-Zahrani',
                    nationalId: '3*********', nationality: 'سعودي', branchId: '3', department: 'الإنتاج', jobTitle: 'فني ألومنيوم',
                    employmentType: 'fulltime', status: 'active', joinDate: '2021-01-10', phone: '0500000003', salary: 9000,
                    transportAllowance: 800, notes: 'فرع جدة', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-hq-004', employeeNo: 'NEB-004', nameAr: 'عبدالله حسن', nameEn: 'Abdullah Hassan',
                    nationalId: '4*********', nationality: 'مصري', branchId: 'hq', department: 'الورشة', jobTitle: 'عامل إنتاج',
                    employmentType: 'daily', status: 'active', joinDate: '2023-05-01', phone: '0500000004', salary: 4500,
                    notes: 'عمال يومية — WPC', createdAt: now, updatedAt: now
                }
            ];
        }
        if (!hrVehicles.length) {
            const nextYear = String(new Date().getFullYear() + 1);
            hrVehicles = [
                {
                    id: 'veh-001', plateNo: 'أ ب ج 1234', make: 'تويوتا', model: 'هايلكس', year: '2022', color: 'أبيض',
                    type: 'pickup', branchId: 'hq', status: 'active', assignedEmployeeId: 'emp-hq-001',
                    insuranceExp: nextYear + '-06-30', inspectionExp: nextYear + '-03-15', registrationExp: nextYear + '-01-01',
                    mileage: 45200, fuelCard: 'FC-001', phone: '0501111001', gpsTracker: 'GPS-NEB-01', notes: 'سيارة إدارة المصنع'
                },
                {
                    id: 'veh-002', plateNo: 'د هـ و 5678', make: 'نيسان', model: 'أورفان', year: '2021', color: 'فضي',
                    type: 'van', branchId: '2', status: 'active', assignedEmployeeId: 'emp-riy-002',
                    insuranceExp: nextYear + '-08-20', inspectionExp: nextYear + '-05-10', mileage: 67800,
                    fuelCard: 'FC-002', notes: 'توصيل عروض — الرياض'
                },
                {
                    id: 'veh-003', plateNo: 'ز ح ط 9012', make: 'إيسوزو', model: 'NPR', year: '2019', color: 'أبيض',
                    type: 'truck', branchId: 'hq', status: 'maintenance', assignedEmployeeId: null,
                    insuranceExp: nextYear + '-12-01', inspectionExp: nextYear + '-11-01', mileage: 120500,
                    notes: 'شاحنة نقل أبواب — صيانة دورية'
                }
            ];
        }
        if (!hrLeaveRequests.length) {
            hrLeaveRequests = [
                {
                    id: 'lv-001', employeeId: 'emp-riy-002', employeeName: 'خالد سعد القحطاني',
                    type: 'annual', startDate: '2026-07-01', endDate: '2026-07-14', days: 14,
                    status: 'pending', note: 'إجازة سنوية', createdAt: now
                }
            ];
        }
        if (!hrVehicleTracking.length) {
            hrVehicleTracking = [
                {
                    id: 'vt-001', vehicleId: 'veh-002', plateNo: 'د هـ و 5678',
                    driverEmployeeNo: 'NEB-002', driverEmployeeId: 'emp-riy-002',
                    driverName: 'خالد سعد القحطاني', driverPhone: '0500000002', driverNationalId: '2*********',
                    driverType: 'employee', branchId: '2', assignedDate: now, assignedTime: '08:15',
                    destination: 'فرع الرياض — عميل', purpose: 'توصيل عينات أبواب',
                    odometerOut: 67800, odometerIn: null, status: 'on_road', notes: 'تسليم مندوب مبيعات',
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'vt-002', vehicleId: 'veh-001', plateNo: 'أ ب ج 1234',
                    driverEmployeeNo: 'NEB-001', driverEmployeeId: 'emp-hq-001',
                    driverName: 'أحمد محمد العتيبي', driverPhone: '0500000001', driverNationalId: '1*********',
                    driverType: 'employee', branchId: 'hq', assignedDate: '2026-06-10', assignedTime: '07:30',
                    returnDate: '2026-06-10', returnTime: '17:45', destination: 'مورد القصيم', purpose: 'استلام مواد',
                    odometerOut: 45100, odometerIn: 45200, status: 'returned', notes: '', createdAt: '2026-06-10', updatedAt: now
                }
            ];
        }
        syncVehicleCurrentDriversFromTracking();
    }

    function findEmployeeByNo(employeeNo) {
        const no = String(employeeNo || '').trim().toUpperCase();
        if (!no) return null;
        return hrEmployees.find(function(e) {
            return String(e.employeeNo || '').trim().toUpperCase() === no;
        }) || null;
    }

    function findVehicleByPlate(plateNo) {
        const p = String(plateNo || '').trim().replace(/\s+/g, ' ');
        if (!p) return null;
        return hrVehicles.find(function(v) {
            return String(v.plateNo || '').trim().replace(/\s+/g, ' ') === p;
        }) || null;
    }

    function syncVehicleCurrentDriversFromTracking() {
        hrVehicles.forEach(function(v) {
            const active = hrVehicleTracking.filter(function(t) {
                return t.vehicleId === v.id && t.status === 'on_road';
            }).sort(function(a, b) {
                return String(b.assignedDate + ' ' + (b.assignedTime || '')).localeCompare(String(a.assignedDate + ' ' + (a.assignedTime || '')));
            })[0];
            if (active) {
                v.currentDriverName = active.driverName;
                v.currentDriverEmployeeNo = active.driverEmployeeNo;
                v.currentDriverPhone = active.driverPhone;
                v.currentTrackingId = active.id;
            } else {
                v.currentDriverName = '';
                v.currentDriverEmployeeNo = '';
                v.currentDriverPhone = '';
                v.currentTrackingId = null;
            }
        });
    }

    function filterHrEmployees() {
        let list = hrEmployees.slice();
        if (hrBranchFilter) {
            list = list.filter(function(e) { return String(e.branchId) === String(hrBranchFilter); });
        }
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(e) {
                const hay = [
                    e.nameAr, e.nameEn, e.employeeNo, e.phone, e.phone2, e.jobTitle,
                    e.department, e.nationalId, e.email
                ].join(' ').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
        return list;
    }

    function filterHrVehicles() {
        let list = hrVehicles.slice();
        if (hrBranchFilter) {
            list = list.filter(function(v) { return String(v.branchId) === String(hrBranchFilter); });
        }
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(v) {
                const emp = hrEmployees.find(function(e) { return e.id === v.assignedEmployeeId; });
                const hay = [
                    v.plateNo, v.make, v.model, v.notes, emp && emp.nameAr
                ].join(' ').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
        return list;
    }

    function getEmployeeById(id) {
        return hrEmployees.find(function(e) { return e.id === id; }) || null;
    }

    function getVehicleById(id) {
        return hrVehicles.find(function(v) { return v.id === id; }) || null;
    }

    function formatHrDate(d) {
        if (!d) return '—';
        try {
            return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('ar-SA');
        } catch (e) { return d; }
    }

    function isExpiringSoon(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr + 'T12:00:00');
        const now = new Date();
        const diff = (d - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 60;
    }

    function isExpired(dateStr) {
        if (!dateStr) return false;
        return new Date(dateStr + 'T12:00:00') < new Date();
    }

    function expBadge(dateStr) {
        if (!dateStr) return '';
        if (isExpired(dateStr)) return '<span class="hr-exp-warning"><i class="fas fa-triangle-exclamation"></i> منتهي</span>';
        if (isExpiringSoon(dateStr)) return '<span class="hr-exp-warning"><i class="fas fa-clock"></i> قريب الانتهاء</span>';
        return '<span class="hr-exp-ok"><i class="fas fa-check"></i> ساري</span>';
    }

    function hrAudit(action, detail) {
        if (typeof addAuditLog === 'function') addAuditLog(action, detail);
    }

    function openHrPlatform() {
        if (!requireHrAccess()) return;
        loadHrData();
        renderHrPlatformPanel();
        const el = document.getElementById('hr-platform');
        if (el) el.classList.add('show');
    }

    function switchHrTab(tab) {
        hrActiveTab = tab || 'dashboard';
        hrEmployeeEditorId = null;
        hrVehicleEditorId = null;
        hrTrackingEditorId = null;
        renderHrPlatformPanel();
    }

    function setHrBranchFilter(val) {
        hrBranchFilter = val || '';
        renderHrPlatformPanel();
    }

    function setHrSearch(val) {
        hrSearchQuery = val || '';
        renderHrPlatformPanel();
    }

    function renderHrPlatformPanel() {
        const summary = document.getElementById('hr-platform-summary');
        const tabs = document.getElementById('hr-tab-bar');
        const content = document.getElementById('hr-platform-content');
        if (!content) return;

        const emps = filterHrEmployees();
        const vehs = filterHrVehicles();
        const activeEmps = hrEmployees.filter(function(e) { return e.status === 'active'; }).length;
        const onLeave = hrEmployees.filter(function(e) { return e.status === 'on_leave'; }).length;
        const assignedVeh = hrVehicles.filter(function(v) { return v.assignedEmployeeId && v.status === 'active'; }).length;
        const pendingLeave = hrLeaveRequests.filter(function(l) { return l.status === 'pending'; }).length;
        const onRoadCount = hrVehicleTracking.filter(function(t) { return t.status === 'on_road'; }).length;
        const expiringDocs = hrVehicles.filter(function(v) {
            return isExpiringSoon(v.insuranceExp) || isExpiringSoon(v.inspectionExp) || isExpired(v.insuranceExp);
        }).length;
        syncVehicleCurrentDriversFromTracking();

        if (summary) {
            summary.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + hrEmployees.length + '</strong><span>إجمالي الموظفين</span></div>' +
                '<div class="erp-stat"><strong>' + activeEmps + '</strong><span>نشطون</span></div>' +
                '<div class="erp-stat"><strong>' + hrVehicles.length + '</strong><span>سيارات الشركة</span></div>' +
                '<div class="erp-stat erp-stat--accent"><strong>' + onRoadCount + '</strong><span>سيارات خارجة الآن</span></div>' +
                '<div class="erp-stat"><strong>' + pendingLeave + '</strong><span>إجازات معلقة</span></div>' +
                (expiringDocs ? '<div class="erp-stat erp-stat--danger"><strong>' + expiringDocs + '</strong><span>تنبيه وثائق سيارات</span></div>' : '');
        }

        const tabDefs = [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة التحكم' },
            { id: 'employees', icon: 'fas fa-users', label: 'الموظفون والعمال' },
            { id: 'vehicles', icon: 'fas fa-car', label: 'سجل السيارات' },
            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'الإجازات' }
        ];
        if (canViewHrExecutiveReports()) {
            tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية' });
        }

        if (tabs) {
            tabs.innerHTML = tabDefs.map(function(t) {
                return '<button type="button" class="hr-tab-btn' + (hrActiveTab === t.id ? ' is-active' : '') +
                    '" onclick="switchHrTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
            }).join('');
        }

        const branchOpts = getHrBranches().map(function(b) {
            return '<option value="' + esc(b.id) + '"' + (String(hrBranchFilter) === String(b.id) ? ' selected' : '') + '>' + esc(b.label) + '</option>';
        }).join('');

        const toolbar =
            '<div class="hr-toolbar">' +
                '<label class="nebras-field"><span>الفرع</span><select onchange="setHrBranchFilter(this.value)">' + branchOpts + '</select></label>' +
                '<label class="nebras-field hr-search-input"><span>بحث</span><input type="search" placeholder="اسم · رقم · جوال · قسم…" value="' + esc(hrSearchQuery) +
                    '" oninput="setHrSearch(this.value)"></label>' +
            '</div>';

        let panelHtml = '';
        if (hrActiveTab === 'dashboard') panelHtml = renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);
        else if (hrActiveTab === 'employees') panelHtml = renderHrEmployeesPanel(emps);
        else if (hrActiveTab === 'vehicles') panelHtml = renderHrVehiclesPanel(vehs);
        else if (hrActiveTab === 'tracking') panelHtml = renderHrVehicleTrackingPanel();
        else if (hrActiveTab === 'leave') panelHtml = renderHrLeavePanel();
        else if (hrActiveTab === 'reports' && canViewHrExecutiveReports()) panelHtml = renderHrReportsPanel();
        else if (hrActiveTab === 'reports') {
            hrActiveTab = 'dashboard';
            panelHtml = renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);
        }

        content.innerHTML = toolbar + '<div class="hr-panels">' + panelHtml + '</div>';
    }

    function renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs) {
        const byBranch = {};
        hrEmployees.forEach(function(e) {
            const k = resolveHrBranchLabel(e.branchId);
            byBranch[k] = (byBranch[k] || 0) + 1;
        });
        const branchRows = Object.keys(byBranch).map(function(k) {
            return '<div class="hr-report-card"><strong>' + byBranch[k] + '</strong><span>' + esc(k) + '</span></div>';
        }).join('');

        const byDept = {};
        hrEmployees.forEach(function(e) {
            const k = e.department || 'غير محدد';
            byDept[k] = (byDept[k] || 0) + 1;
        });
        const deptRows = Object.keys(byDept).map(function(k) {
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + esc(k) + '</strong><span class="erp-row-tags"><span class="erp-tag">' + byDept[k] + ' موظف</span></span></div></article>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-people-roof"></i> منصة الموارد البشرية — موظفون · سيارات · تتبع · إجازات. <strong>صلاحياتك HR فقط</strong> — التقارير التنفيذية للإدارة الرئيسية.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + onLeave + '</strong><span>في إجازة حالياً</span></div>' +
                '<div class="hr-report-card"><strong>' + assignedVeh + '</strong><span>سيارات مُسنَدة</span></div>' +
                '<div class="hr-report-card"><strong>' + pendingLeave + '</strong><span>طلبات إجازة معلقة</span></div>' +
                '<div class="hr-report-card"><strong>' + expiringDocs + '</strong><span>تنبيهات وثائق مركبات</span></div>' +
            '</div>' +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-map-marker-alt"></i> توزيع الموظفين على الفروع</h4>' +
            '<div class="hr-report-grid">' + (branchRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
        '</div>';
    }

    function renderHrEmployeesPanel(list) {
        let editor = '';
        if (hrEmployeeEditorId !== null) editor = renderHrEmployeeEditor(hrEmployeeEditorId);

        const cards = list.map(function(e) {
            const st = HR_EMP_STATUS[e.status] || HR_EMP_STATUS.active;
            const veh = e.vehicleId ? getVehicleById(e.vehicleId) : null;
            const initials = (e.nameAr || '?').charAt(0);
            return '<article class="hr-emp-card ' + st.cls + '">' +
                '<div class="hr-emp-card-head">' +
                    '<span class="hr-emp-avatar">' + esc(initials) + '</span>' +
                    '<div><strong>' + esc(e.nameAr) + '</strong><small>' + esc(e.employeeNo) + ' · ' + esc(e.jobTitle || '') + '</small></div>' +
                '</div>' +
                '<div class="hr-emp-meta">' +
                    '<span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span>' +
                    '<span class="erp-tag">' + esc(HR_EMP_TYPES[e.employmentType] || e.employmentType) + '</span>' +
                    '<span class="erp-tag"><i class="fas fa-store"></i> ' + esc(resolveHrBranchLabel(e.branchId)) + '</span>' +
                    (e.department ? '<span class="erp-tag">' + esc(e.department) + '</span>' : '') +
                '</div>' +
                '<div class="hr-emp-contacts">' +
                    (e.phone ? '<div><i class="fas fa-mobile-screen"></i> ' + esc(e.phone) + (e.phone2 ? ' / ' + esc(e.phone2) : '') + '</div>' : '') +
                    (e.email ? '<div><i class="fas fa-envelope"></i> ' + esc(e.email) + '</div>' : '') +
                    (veh ? '<div><i class="fas fa-car"></i> ' + esc(veh.plateNo) + ' — ' + esc(veh.make) + ' ' + esc(veh.model) + '</div>' : '') +
                    (e.joinDate ? '<div><i class="fas fa-calendar"></i> منذ ' + formatHrDate(e.joinDate) + '</div>' : '') +
                '</div>' +
                '<div class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrEmployeeEditor(\'' + esc(e.id) + '\')"><i class="fas fa-pen"></i> تعديل</button>' +
                    '<button type="button" class="erp-tag" onclick="deleteHrEmployee(\'' + esc(e.id) + '\')"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</article>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrEmployeeEditor(null)"><i class="fas fa-user-plus"></i> موظف / عامل جديد</button>' +
            '</div>' +
            editor +
            (cards ? '<div class="hr-emp-grid">' + cards + '</div>' : '<p class="erp-empty">لا موظفين — أضيفي أول سجل.</p>') +
        '</div>';
    }

    function branchSelectHtml(selectedId, fieldId) {
        return getHrBranches().filter(function(b) { return b.id !== ''; }).map(function(b) {
            return '<option value="' + esc(b.id) + '"' + (String(selectedId) === String(b.id) ? ' selected' : '') + '>' + esc(b.label) + '</option>';
        }).join('');
    }

    function renderHrEmployeeEditor(id) {
        const e = id ? getEmployeeById(id) : {};
        const isEdit = !!id;
        const vehOpts = '<option value="">— بدون سيارة —</option>' + hrVehicles.map(function(v) {
            return '<option value="' + esc(v.id) + '"' + (e.vehicleId === v.id ? ' selected' : '') + '>' + esc(v.plateNo + ' — ' + v.make) + '</option>';
        }).join('');

        const statusOpts = Object.keys(HR_EMP_STATUS).map(function(k) {
            return '<option value="' + k + '"' + (e.status === k ? ' selected' : '') + '>' + HR_EMP_STATUS[k].label + '</option>';
        }).join('');

        const typeOpts = Object.keys(HR_EMP_TYPES).map(function(k) {
            return '<option value="' + k + '"' + (e.employmentType === k ? ' selected' : '') + '>' + HR_EMP_TYPES[k] + '</option>';
        }).join('');

        return '<div class="hr-editor-overlay" id="hr-emp-editor">' +
            '<h4><i class="fas fa-id-card"></i> ' + (isEdit ? 'تعديل موظف' : 'موظف / عامل جديد') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>رقم الموظف</span><input id="he-no" value="' + esc(e.employeeNo || '') + '" placeholder="NEB-100"></label>' +
                '<label class="nebras-field"><span>الاسم (عربي)</span><input id="he-name-ar" value="' + esc(e.nameAr || '') + '"></label>' +
                '<label class="nebras-field"><span>الاسم (إنجليزي)</span><input id="he-name-en" value="' + esc(e.nameEn || '') + '"></label>' +
                '<label class="nebras-field"><span>الهوية / الإقامة</span><input id="he-national" value="' + esc(e.nationalId || '') + '"></label>' +
                '<label class="nebras-field"><span>الجنسية</span><input id="he-nationality" value="' + esc(e.nationality || 'سعودي') + '"></label>' +
                '<label class="nebras-field"><span>الفرع</span><select id="he-branch">' + branchSelectHtml(e.branchId || 'hq') + '</select></label>' +
                '<label class="nebras-field"><span>القسم</span><input id="he-dept" value="' + esc(e.department || '') + '" placeholder="مبيعات · إنتاج · إدارة"></label>' +
                '<label class="nebras-field"><span>المسمى الوظيفي</span><input id="he-job" value="' + esc(e.jobTitle || '') + '"></label>' +
                '<label class="nebras-field"><span>نوع التوظيف</span><select id="he-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="he-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>تاريخ الالتحاق</span><input type="date" id="he-join" value="' + esc(e.joinDate || '') + '"></label>' +
                '<label class="nebras-field"><span>نهاية العقد</span><input type="date" id="he-contract-end" value="' + esc(e.contractEnd || '') + '"></label>' +
                '<label class="nebras-field"><span>جوال أساسي</span><input id="he-phone" value="' + esc(e.phone || '') + '" placeholder="05xxxxxxxx"></label>' +
                '<label class="nebras-field"><span>جوال إضافي</span><input id="he-phone2" value="' + esc(e.phone2 || '') + '"></label>' +
                '<label class="nebras-field"><span>البريد</span><input id="he-email" type="email" value="' + esc(e.email || '') + '"></label>' +
                '<label class="nebras-field"><span>جهة الطوارئ</span><input id="he-emg-name" value="' + esc(e.emergencyName || '') + '"></label>' +
                '<label class="nebras-field"><span>جوال الطوارئ</span><input id="he-emg-phone" value="' + esc(e.emergencyPhone || '') + '"></label>' +
                '<label class="nebras-field"><span>الراتب الأساسي</span><input type="number" id="he-salary" value="' + esc(e.salary || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بدل سكن</span><input type="number" id="he-housing" value="' + esc(e.housingAllowance || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بدل نقل</span><input type="number" id="he-transport" value="' + esc(e.transportAllowance || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>البنك</span><input id="he-bank" value="' + esc(e.bankName || '') + '"></label>' +
                '<label class="nebras-field"><span>IBAN</span><input id="he-iban" value="' + esc(e.iban || '') + '"></label>' +
                '<label class="nebras-field"><span>التأمينات (GOSI)</span><input id="he-gosi" value="' + esc(e.gosiNo || '') + '"></label>' +
                '<label class="nebras-field"><span>سيارة مُسنَدة</span><select id="he-vehicle">' + vehOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="he-notes" value="' + esc(e.notes || '') + '"></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrEmployee(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrEmployeeEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div>' +
        '</div>';
    }

    function openHrEmployeeEditor(id) {
        if (!requireHrAccess()) return;
        hrEmployeeEditorId = id;
        renderHrPlatformPanel();
        const ed = document.getElementById('hr-emp-editor');
        if (ed) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function cancelHrEmployeeEditor() {
        hrEmployeeEditorId = null;
        renderHrPlatformPanel();
    }

    function saveHrEmployee(id) {
        if (!requireHrAccess()) return;
        const nameAr = hrField('he-name-ar');
        const employeeNo = hrField('he-no');
        if (!nameAr || !employeeNo) { alert('الاسم ورقم الموظف مطلوبان.'); return; }

        const now = new Date().toISOString().slice(0, 10);
        const record = {
            id: id || ('emp-' + Date.now()),
            employeeNo: employeeNo,
            nameAr: nameAr,
            nameEn: hrField('he-name-en'),
            nationalId: hrField('he-national'),
            nationality: hrField('he-nationality'),
            branchId: hrField('he-branch') || 'hq',
            department: hrField('he-dept'),
            jobTitle: hrField('he-job'),
            employmentType: hrField('he-type') || 'fulltime',
            status: hrField('he-status') || 'active',
            joinDate: hrField('he-join'),
            contractEnd: hrField('he-contract-end'),
            phone: hrField('he-phone'),
            phone2: hrField('he-phone2'),
            email: hrField('he-email'),
            emergencyName: hrField('he-emg-name'),
            emergencyPhone: hrField('he-emg-phone'),
            salary: hrNum(hrField('he-salary')),
            housingAllowance: hrNum(hrField('he-housing')),
            transportAllowance: hrNum(hrField('he-transport')),
            bankName: hrField('he-bank'),
            iban: hrField('he-iban'),
            gosiNo: hrField('he-gosi'),
            vehicleId: hrField('he-vehicle') || null,
            notes: hrField('he-notes'),
            updatedAt: now
        };

        const oldVehId = id ? (getEmployeeById(id) || {}).vehicleId : null;
        const newVehId = record.vehicleId;

        if (id) {
            const idx = hrEmployees.findIndex(function(e) { return e.id === id; });
            if (idx >= 0) {
                record.createdAt = hrEmployees[idx].createdAt || now;
                hrEmployees[idx] = record;
            }
        } else {
            record.createdAt = now;
            hrEmployees.unshift(record);
        }

        if (oldVehId && oldVehId !== newVehId) {
            const ov = getVehicleById(oldVehId);
            if (ov && ov.assignedEmployeeId === record.id) {
                ov.assignedEmployeeId = null;
            }
        }
        if (newVehId) {
            const nv = getVehicleById(newVehId);
            if (nv) {
                hrVehicles.forEach(function(v) {
                    if (v.assignedEmployeeId === record.id && v.id !== newVehId) v.assignedEmployeeId = null;
                });
                nv.assignedEmployeeId = record.id;
            }
        }

        saveHrData();
        hrEmployeeEditorId = null;
        hrAudit('HR موظف', (id ? 'تعديل ' : 'إضافة ') + nameAr);
        renderHrPlatformPanel();
    }

    function deleteHrEmployee(id) {
        if (!requireHrAccess()) return;
        const e = getEmployeeById(id);
        if (!e || !confirm('حذف ' + e.nameAr + ' من سجلات HR؟')) return;
        hrEmployees = hrEmployees.filter(function(x) { return x.id !== id; });
        hrVehicles.forEach(function(v) {
            if (v.assignedEmployeeId === id) v.assignedEmployeeId = null;
        });
        hrLeaveRequests = hrLeaveRequests.filter(function(l) { return l.employeeId !== id; });
        saveHrData();
        hrAudit('HR حذف موظف', e.nameAr);
        renderHrPlatformPanel();
    }

    function renderHrVehiclesPanel(list) {
        let editor = '';
        if (hrVehicleEditorId !== null) editor = renderHrVehicleEditor(hrVehicleEditorId);

        const cards = list.map(function(v) {
            const st = HR_VEH_STATUS[v.status] || HR_VEH_STATUS.active;
            const emp = v.assignedEmployeeId ? getEmployeeById(v.assignedEmployeeId) : null;
            return '<article class="hr-vehicle-card">' +
                '<div class="plate-badge">' + esc(v.plateNo) + '</div>' +
                '<strong>' + esc(v.make) + ' ' + esc(v.model) + (v.year ? ' (' + esc(v.year) + ')' : '') + '</strong>' +
                '<div class="hr-emp-meta" style="margin-top:8px">' +
                    '<span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span>' +
                    '<span class="erp-tag">' + esc(HR_VEH_TYPES[v.type] || v.type || 'مركبة') + '</span>' +
                    '<span class="erp-tag"><i class="fas fa-store"></i> ' + esc(resolveHrBranchLabel(v.branchId)) + '</span>' +
                '</div>' +
                '<div class="hr-emp-contacts">' +
                    (v.currentDriverName ? '<div><i class="fas fa-user"></i> سائق حالي: ' + esc(v.currentDriverName) + (v.currentDriverEmployeeNo ? ' (' + esc(v.currentDriverEmployeeNo) + ')' : '') + '</div>' :
                        (emp ? '<div><i class="fas fa-user"></i> ' + esc(emp.nameAr) + '</div>' : '<div><i class="fas fa-user"></i> غير مُسنَدة</div>')) +
                    (v.mileage ? '<div><i class="fas fa-road"></i> ' + esc(String(v.mileage)) + ' كم</div>' : '') +
                    (v.insuranceExp ? '<div><i class="fas fa-shield"></i> تأمين ' + formatHrDate(v.insuranceExp) + ' ' + expBadge(v.insuranceExp) + '</div>' : '') +
                    (v.inspectionExp ? '<div><i class="fas fa-clipboard-check"></i> فحص ' + formatHrDate(v.inspectionExp) + ' ' + expBadge(v.inspectionExp) + '</div>' : '') +
                    (v.phone ? '<div><i class="fas fa-sim-card"></i> ' + esc(v.phone) + '</div>' : '') +
                '</div>' +
                '<div class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrVehicleEditor(\'' + esc(v.id) + '\')"><i class="fas fa-pen"></i> تعديل</button>' +
                    '<button type="button" class="erp-tag" onclick="deleteHrVehicle(\'' + esc(v.id) + '\')"><i class="fas fa-trash"></i></button>' +
                '</div>' +
            '</article>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrVehicleEditor(null)"><i class="fas fa-car-side"></i> سيارة جديدة</button>' +
            '</div>' +
            editor +
            (cards ? '<div class="hr-vehicle-grid">' + cards + '</div>' : '<p class="erp-empty">لا سيارات — أضيفي أول مركبة.</p>') +
        '</div>';
    }

    function renderHrVehicleEditor(id) {
        const v = id ? getVehicleById(id) : {};
        const empOpts = '<option value="">— غير مُسنَدة —</option>' + hrEmployees.map(function(e) {
            return '<option value="' + esc(e.id) + '"' + (v.assignedEmployeeId === e.id ? ' selected' : '') + '>' + esc(e.nameAr) + '</option>';
        }).join('');
        const statusOpts = Object.keys(HR_VEH_STATUS).map(function(k) {
            return '<option value="' + k + '"' + (v.status === k ? ' selected' : '') + '>' + HR_VEH_STATUS[k].label + '</option>';
        }).join('');
        const typeOpts = Object.keys(HR_VEH_TYPES).map(function(k) {
            return '<option value="' + k + '"' + (v.type === k ? ' selected' : '') + '>' + HR_VEH_TYPES[k] + '</option>';
        }).join('');

        return '<div class="hr-editor-overlay" id="hr-veh-editor">' +
            '<h4><i class="fas fa-car"></i> ' + (id ? 'تعديل سيارة' : 'سيارة جديدة') + '</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>رقم اللوحة</span><input id="hv-plate" value="' + esc(v.plateNo || '') + '"></label>' +
                '<label class="nebras-field"><span>الشركة المصنعة</span><input id="hv-make" value="' + esc(v.make || '') + '"></label>' +
                '<label class="nebras-field"><span>الموديل</span><input id="hv-model" value="' + esc(v.model || '') + '"></label>' +
                '<label class="nebras-field"><span>سنة الصنع</span><input id="hv-year" value="' + esc(v.year || '') + '"></label>' +
                '<label class="nebras-field"><span>اللون</span><input id="hv-color" value="' + esc(v.color || '') + '"></label>' +
                '<label class="nebras-field"><span>النوع</span><select id="hv-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الفرع</span><select id="hv-branch">' + branchSelectHtml(v.branchId || 'hq') + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="hv-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>الموظف المُسنَد</span><select id="hv-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>انتهاء التأمين</span><input type="date" id="hv-insurance" value="' + esc(v.insuranceExp || '') + '"></label>' +
                '<label class="nebras-field"><span>انتهاء الفحص</span><input type="date" id="hv-inspection" value="' + esc(v.inspectionExp || '') + '"></label>' +
                '<label class="nebras-field"><span>انتهاء الاستمارة</span><input type="date" id="hv-registration" value="' + esc(v.registrationExp || '') + '"></label>' +
                '<label class="nebras-field"><span>عداد الكيلومترات</span><input type="number" id="hv-mileage" value="' + esc(v.mileage || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بطاقة وقود</span><input id="hv-fuel" value="' + esc(v.fuelCard || '') + '"></label>' +
                '<label class="nebras-field"><span>شريحة / جوال المركبة</span><input id="hv-phone" value="' + esc(v.phone || '') + '"></label>' +
                '<label class="nebras-field"><span>GPS</span><input id="hv-gps" value="' + esc(v.gpsTracker || '') + '"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hv-notes" value="' + esc(v.notes || '') + '"></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrVehicle(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrVehicleEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div>' +
        '</div>';
    }

    function openHrVehicleEditor(id) {
        if (!requireHrAccess()) return;
        hrVehicleEditorId = id;
        renderHrPlatformPanel();
    }

    function cancelHrVehicleEditor() {
        hrVehicleEditorId = null;
        renderHrPlatformPanel();
    }

    function saveHrVehicle(id) {
        if (!requireHrAccess()) return;
        const plate = hrField('hv-plate');
        if (!plate) { alert('رقم اللوحة مطلوب.'); return; }

        const record = {
            id: id || ('veh-' + Date.now()),
            plateNo: plate,
            make: hrField('hv-make'),
            model: hrField('hv-model'),
            year: hrField('hv-year'),
            color: hrField('hv-color'),
            type: hrField('hv-type') || 'car',
            branchId: hrField('hv-branch') || 'hq',
            status: hrField('hv-status') || 'active',
            assignedEmployeeId: hrField('hv-employee') || null,
            insuranceExp: hrField('hv-insurance'),
            inspectionExp: hrField('hv-inspection'),
            registrationExp: hrField('hv-registration'),
            mileage: hrNum(hrField('hv-mileage')),
            fuelCard: hrField('hv-fuel'),
            phone: hrField('hv-phone'),
            gpsTracker: hrField('hv-gps'),
            notes: hrField('hv-notes')
        };

        if (id) {
            const idx = hrVehicles.findIndex(function(v) { return v.id === id; });
            if (idx >= 0) hrVehicles[idx] = record;
        } else {
            hrVehicles.unshift(record);
        }

        if (record.assignedEmployeeId) {
            const emp = getEmployeeById(record.assignedEmployeeId);
            if (emp) emp.vehicleId = record.id;
            hrVehicles.forEach(function(v) {
                if (v.id !== record.id && v.assignedEmployeeId === record.assignedEmployeeId) {
                    v.assignedEmployeeId = null;
                }
            });
        }

        saveHrData();
        hrVehicleEditorId = null;
        hrAudit('HR سيارة', (id ? 'تعديل ' : 'إضافة ') + plate);
        renderHrPlatformPanel();
    }

    function deleteHrVehicle(id) {
        if (!requireHrAccess()) return;
        const v = getVehicleById(id);
        if (!v || !confirm('حذف المركبة ' + v.plateNo + '؟')) return;
        hrEmployees.forEach(function(e) {
            if (e.vehicleId === id) e.vehicleId = null;
        });
        hrVehicles = hrVehicles.filter(function(x) { return x.id !== id; });
        saveHrData();
        hrAudit('HR حذف سيارة', v.plateNo);
        renderHrPlatformPanel();
    }

    function renderHrLeavePanel() {
        const empOpts = hrEmployees.map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.nameAr) + '</option>';
        }).join('');
        const typeOpts = Object.keys(HR_LEAVE_TYPES).map(function(k) {
            return '<option value="' + k + '">' + HR_LEAVE_TYPES[k] + '</option>';
        }).join('');

        const rows = hrLeaveRequests.map(function(l) {
            const st = HR_LEAVE_STATUS[l.status] || HR_LEAVE_STATUS.pending;
            const actions = l.status === 'pending'
                ? '<button type="button" class="erp-tag erp-tag--action" onclick="setHrLeaveStatus(\'' + esc(l.id) + '\',\'approved\')">موافقة</button>' +
                  '<button type="button" class="erp-tag" onclick="setHrLeaveStatus(\'' + esc(l.id) + '\',\'rejected\')">رفض</button>'
                : '';
            return '<tr>' +
                '<td>' + esc(l.employeeName || '—') + '</td>' +
                '<td>' + esc(HR_LEAVE_TYPES[l.type] || l.type) + '</td>' +
                '<td>' + formatHrDate(l.startDate) + ' — ' + formatHrDate(l.endDate) + '</td>' +
                '<td>' + esc(String(l.days || '')) + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td>' + actions + ' <button type="button" class="erp-tag" onclick="deleteHrLeave(\'' + esc(l.id) + '\')"><i class="fas fa-trash"></i></button></td>' +
            '</tr>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<div class="hr-editor-overlay">' +
                '<h4><i class="fas fa-calendar-plus"></i> طلب إجازة جديد</h4>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>الموظف</span><select id="hl-employee">' + empOpts + '</select></label>' +
                    '<label class="nebras-field"><span>نوع الإجازة</span><select id="hl-type">' + typeOpts + '</select></label>' +
                    '<label class="nebras-field"><span>من</span><input type="date" id="hl-start"></label>' +
                    '<label class="nebras-field"><span>إلى</span><input type="date" id="hl-end"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظة</span><input id="hl-note"></label>' +
                '</div>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addHrLeaveRequest()"><i class="fas fa-plus"></i> تسجيل طلب</button></div>' +
            '</div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr>' +
                '<th>الموظف</th><th>النوع</th><th>الفترة</th><th>الأيام</th><th>الحالة</th><th>إجراء</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="erp-empty">لا طلبات إجازة</td></tr>') + '</tbody></table></div>' +
        '</div>';
    }

    function addHrLeaveRequest() {
        if (!requireHrAccess()) return;
        const empId = hrField('hl-employee');
        const emp = getEmployeeById(empId);
        if (!emp) { alert('اختر موظفاً.'); return; }
        const start = hrField('hl-start');
        const end = hrField('hl-end');
        if (!start || !end) { alert('حددي فترة الإجازة.'); return; }
        const d1 = new Date(start + 'T12:00:00');
        const d2 = new Date(end + 'T12:00:00');
        const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

        hrLeaveRequests.unshift({
            id: 'lv-' + Date.now(),
            employeeId: empId,
            employeeName: emp.nameAr,
            type: hrField('hl-type') || 'annual',
            startDate: start,
            endDate: end,
            days: days,
            status: 'pending',
            note: hrField('hl-note'),
            createdAt: new Date().toISOString().slice(0, 10)
        });
        saveHrData();
        hrAudit('HR إجازة', 'طلب ' + emp.nameAr);
        renderHrPlatformPanel();
    }

    function setHrLeaveStatus(id, status) {
        if (!requireHrAccess()) return;
        const l = hrLeaveRequests.find(function(x) { return x.id === id; });
        if (!l) return;
        l.status = status;
        if (status === 'approved') {
            const emp = getEmployeeById(l.employeeId);
            if (emp) emp.status = 'on_leave';
        }
        saveHrData();
        hrAudit('HR إجازة', (status === 'approved' ? 'موافقة على ' : 'رفض ') + l.employeeName);
        renderHrPlatformPanel();
    }

    function deleteHrLeave(id) {
        if (!requireHrAccess()) return;
        hrLeaveRequests = hrLeaveRequests.filter(function(x) { return x.id !== id; });
        saveHrData();
        renderHrPlatformPanel();
    }

    function filterHrTracking() {
        let list = hrVehicleTracking.slice();
        if (hrBranchFilter) {
            list = list.filter(function(t) { return String(t.branchId) === String(hrBranchFilter); });
        }
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(t) {
                const hay = [
                    t.plateNo, t.driverEmployeeNo, t.driverName, t.driverPhone,
                    t.destination, t.purpose, t.notes
                ].join(' ').toLowerCase();
                return hay.indexOf(q) >= 0;
            });
        }
        return list.sort(function(a, b) {
            return String(b.assignedDate + ' ' + (b.assignedTime || '')).localeCompare(String(a.assignedDate + ' ' + (a.assignedTime || '')));
        });
    }

    function lookupHrDriverByEmployeeNo() {
        const emp = findEmployeeByNo(hrField('ht-driver-no'));
        if (!emp) return;
        const nameEl = document.getElementById('ht-driver-name');
        const phoneEl = document.getElementById('ht-driver-phone');
        const nationalEl = document.getElementById('ht-driver-national');
        const typeEl = document.getElementById('ht-driver-type');
        const empIdEl = document.getElementById('ht-driver-emp-id');
        if (nameEl) nameEl.value = emp.nameAr || '';
        if (phoneEl) phoneEl.value = emp.phone || '';
        if (nationalEl) nationalEl.value = emp.nationalId || '';
        if (typeEl) typeEl.value = 'employee';
        if (empIdEl) empIdEl.value = emp.id || '';
    }

    function lookupHrVehicleByPlate() {
        const veh = findVehicleByPlate(hrField('ht-plate'));
        if (!veh) return;
        const vehIdEl = document.getElementById('ht-vehicle-id');
        const branchEl = document.getElementById('ht-branch');
        const odoEl = document.getElementById('ht-odometer-out');
        if (vehIdEl) vehIdEl.value = veh.id || '';
        if (branchEl) branchEl.value = veh.branchId || 'hq';
        if (odoEl && veh.mileage) odoEl.value = String(veh.mileage);
    }

    function renderHrVehicleTrackingPanel() {
        syncVehicleCurrentDriversFromTracking();
        let editor = '';
        if (hrTrackingEditorId !== null) editor = renderHrTrackingEditor(hrTrackingEditorId);

        const onRoad = hrVehicles.filter(function(v) { return v.currentDriverName; });
        const activeCards = onRoad.map(function(v) {
            return '<article class="hr-tracking-active-card">' +
                '<div class="plate-badge">' + esc(v.plateNo) + '</div>' +
                '<strong><i class="fas fa-user"></i> ' + esc(v.currentDriverName) + '</strong>' +
                '<small>رقم السائق: ' + esc(v.currentDriverEmployeeNo || '—') + ' · جوال: ' + esc(v.currentDriverPhone || '—') + '</small>' +
                '<div class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrTrackingEditor(\'' + esc(v.currentTrackingId || '') + '\')"><i class="fas fa-pen"></i> تعديل السائق</button>' +
                    '<button type="button" class="erp-tag erp-tag--ok" onclick="returnHrVehicleFromTracking(\'' + esc(v.currentTrackingId || '') + '\')"><i class="fas fa-check"></i> تسجيل عودة</button>' +
                '</div></article>';
        }).join('');

        const rows = filterHrTracking().map(function(t) {
            const st = HR_TRACK_STATUS[t.status] || HR_TRACK_STATUS.on_road;
            return '<tr>' +
                '<td><strong>' + esc(t.plateNo) + '</strong></td>' +
                '<td>' + esc(t.driverEmployeeNo || '—') + '<br><small>' + esc(t.driverName) + '</small></td>' +
                '<td>' + esc(t.driverPhone || '—') + '</td>' +
                '<td>' + formatHrDate(t.assignedDate) + ' ' + esc(t.assignedTime || '') + '</td>' +
                '<td>' + esc(t.destination || '—') + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td>' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrTrackingEditor(\'' + esc(t.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                    (t.status === 'on_road' ? '<button type="button" class="erp-tag erp-tag--ok" onclick="returnHrVehicleFromTracking(\'' + esc(t.id) + '\')"><i class="fas fa-check"></i></button> ' : '') +
                    '<button type="button" class="erp-tag" onclick="deleteHrTracking(\'' + esc(t.id) + '\')"><i class="fas fa-trash"></i></button>' +
                '</td></tr>';
        }).join('');

        const driverTypeOpts = Object.keys(HR_DRIVER_TYPES).map(function(k) {
            return '<option value="' + k + '">' + HR_DRIVER_TYPES[k] + '</option>';
        }).join('');

        const quickForm = hrTrackingEditorId === null
            ? '<div class="hr-editor-overlay hr-tracking-quick-form">' +
                '<h4><i class="fas fa-car-side"></i> تسجيل خروج سيارة — رقم اللوحة + بيانات السائق (قابلة للتعديل لاحقاً)</h4>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>رقم اللوحة</span><input id="ht-plate" placeholder="أ ب ج 1234" onblur="lookupHrVehicleByPlate()"></label>' +
                    '<input type="hidden" id="ht-vehicle-id">' +
                    '<label class="nebras-field"><span>رقم السائق (موظف)</span><input id="ht-driver-no" placeholder="NEB-002" onblur="lookupHrDriverByEmployeeNo()"></label>' +
                    '<input type="hidden" id="ht-driver-emp-id">' +
                    '<label class="nebras-field"><span>اسم السائق</span><input id="ht-driver-name" placeholder="الاسم الكامل"></label>' +
                    '<label class="nebras-field"><span>جوال السائق</span><input id="ht-driver-phone" placeholder="05xxxxxxxx"></label>' +
                    '<label class="nebras-field"><span>هوية / إقامة السائق</span><input id="ht-driver-national"></label>' +
                    '<label class="nebras-field"><span>نوع السائق</span><select id="ht-driver-type">' + driverTypeOpts + '</select></label>' +
                    '<label class="nebras-field"><span>الفرع</span><select id="ht-branch">' + branchSelectHtml('hq') + '</select></label>' +
                    '<label class="nebras-field"><span>التاريخ</span><input type="date" id="ht-date" value="' + esc(new Date().toISOString().slice(0, 10)) + '"></label>' +
                    '<label class="nebras-field"><span>الوقت</span><input type="time" id="ht-time" value="' + esc(new Date().toTimeString().slice(0, 5)) + '"></label>' +
                    '<label class="nebras-field"><span>الوجهة</span><input id="ht-destination" placeholder="فرع · عميل · مورد"></label>' +
                    '<label class="nebras-field"><span>الغرض</span><input id="ht-purpose" placeholder="توصيل · استلام · مهمة"></label>' +
                    '<label class="nebras-field"><span>عداد الخروج (كم)</span><input type="number" id="ht-odometer-out" min="0"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="ht-notes"></label>' +
                '</div>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrTrackingQuick()"><i class="fas fa-location-dot"></i> تسجيل خروج</button></div>' +
            '</div>'
            : '';

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-shield-halved"></i> <strong>حوكمة تتبع السيارات:</strong> السائق ليس ثابتاً — سجّلي رقم اللوحة ورقم السائق وبياناته، وعدّلي أو بدّلي السائق في أي وقت. كل تعديل يُسجَّل في سجل العمليات.</p>' +
            (activeCards ? '<h4 class="hr-tracking-section-title"><i class="fas fa-road"></i> سيارات خارجة الآن</h4><div class="hr-tracking-active-grid">' + activeCards + '</div>' : '<p class="erp-empty">لا سيارات خارجة حالياً.</p>') +
            quickForm + editor +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-list"></i> سجل التتبع الكامل</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table hr-tracking-table"><thead><tr>' +
                '<th>اللوحة</th><th>السائق</th><th>الجوال</th><th>الخروج</th><th>الوجهة</th><th>الحالة</th><th>إجراء</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="7" class="erp-empty">لا سجلات تتبع</td></tr>') + '</tbody></table></div>' +
        '</div>';
    }

    function renderHrTrackingEditor(id) {
        const t = id ? hrVehicleTracking.find(function(x) { return x.id === id; }) : {};
        if (!t && id) return '';
        const driverTypeOpts = Object.keys(HR_DRIVER_TYPES).map(function(k) {
            return '<option value="' + k + '"' + (t.driverType === k ? ' selected' : '') + '>' + HR_DRIVER_TYPES[k] + '</option>';
        }).join('');
        const statusOpts = Object.keys(HR_TRACK_STATUS).map(function(k) {
            return '<option value="' + k + '"' + (t.status === k ? ' selected' : '') + '>' + HR_TRACK_STATUS[k].label + '</option>';
        }).join('');

        return '<div class="hr-editor-overlay" id="hr-tracking-editor">' +
            '<h4><i class="fas fa-pen-to-square"></i> تعديل سجل تتبع — تغيير السائق أو البيانات</h4>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>رقم اللوحة</span><input id="hte-plate" value="' + esc(t.plateNo || '') + '" onblur="lookupHrVehicleByPlateEdit()"></label>' +
                '<input type="hidden" id="hte-vehicle-id" value="' + esc(t.vehicleId || '') + '">' +
                '<label class="nebras-field"><span>رقم السائق</span><input id="hte-driver-no" value="' + esc(t.driverEmployeeNo || '') + '" onblur="lookupHrDriverByEmployeeNoEdit()"></label>' +
                '<input type="hidden" id="hte-driver-emp-id" value="' + esc(t.driverEmployeeId || '') + '">' +
                '<label class="nebras-field"><span>اسم السائق</span><input id="hte-driver-name" value="' + esc(t.driverName || '') + '"></label>' +
                '<label class="nebras-field"><span>جوال السائق</span><input id="hte-driver-phone" value="' + esc(t.driverPhone || '') + '"></label>' +
                '<label class="nebras-field"><span>هوية السائق</span><input id="hte-driver-national" value="' + esc(t.driverNationalId || '') + '"></label>' +
                '<label class="nebras-field"><span>نوع السائق</span><select id="hte-driver-type">' + driverTypeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الفرع</span><select id="hte-branch">' + branchSelectHtml(t.branchId || 'hq') + '</select></label>' +
                '<label class="nebras-field"><span>تاريخ الخروج</span><input type="date" id="hte-date" value="' + esc(t.assignedDate || '') + '"></label>' +
                '<label class="nebras-field"><span>وقت الخروج</span><input type="time" id="hte-time" value="' + esc(t.assignedTime || '') + '"></label>' +
                '<label class="nebras-field"><span>الوجهة</span><input id="hte-destination" value="' + esc(t.destination || '') + '"></label>' +
                '<label class="nebras-field"><span>الغرض</span><input id="hte-purpose" value="' + esc(t.purpose || '') + '"></label>' +
                '<label class="nebras-field"><span>عداد الخروج</span><input type="number" id="hte-odometer-out" value="' + esc(t.odometerOut || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>تاريخ العودة</span><input type="date" id="hte-return-date" value="' + esc(t.returnDate || '') + '"></label>' +
                '<label class="nebras-field"><span>وقت العودة</span><input type="time" id="hte-return-time" value="' + esc(t.returnTime || '') + '"></label>' +
                '<label class="nebras-field"><span>عداد العودة</span><input type="number" id="hte-odometer-in" value="' + esc(t.odometerIn || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="hte-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hte-notes" value="' + esc(t.notes || '') + '"></label>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrTracking(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ التعديل</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrTrackingEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div></div>';
    }

    function lookupHrDriverByEmployeeNoEdit() {
        const emp = findEmployeeByNo(hrField('hte-driver-no'));
        if (!emp) return;
        const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = val; };
        set('hte-driver-name', emp.nameAr || '');
        set('hte-driver-phone', emp.phone || '');
        set('hte-driver-national', emp.nationalId || '');
        set('hte-driver-type', 'employee');
        set('hte-driver-emp-id', emp.id || '');
    }

    function lookupHrVehicleByPlateEdit() {
        const veh = findVehicleByPlate(hrField('hte-plate'));
        if (!veh) return;
        const set = function(id, val) { const el = document.getElementById(id); if (el) el.value = val; };
        set('hte-vehicle-id', veh.id || '');
        set('hte-branch', veh.branchId || 'hq');
        if (!hrField('hte-odometer-out') && veh.mileage) set('hte-odometer-out', String(veh.mileage));
    }

    function openHrTrackingEditor(id) {
        if (!requireHrOps()) return;
        hrTrackingEditorId = id;
        renderHrPlatformPanel();
    }

    function cancelHrTrackingEditor() {
        hrTrackingEditorId = null;
        renderHrPlatformPanel();
    }

    function buildTrackingRecordFromForm(prefix, existingId) {
        const plate = hrField(prefix + 'plate');
        if (!plate) return null;
        let vehicleId = hrField(prefix + 'vehicle-id');
        const veh = findVehicleByPlate(plate);
        if (veh) vehicleId = veh.id;
        const now = new Date().toISOString().slice(0, 10);
        return {
            id: existingId || ('vt-' + Date.now()),
            vehicleId: vehicleId || null,
            plateNo: plate,
            driverEmployeeNo: hrField(prefix + 'driver-no'),
            driverEmployeeId: hrField(prefix + 'driver-emp-id') || null,
            driverName: hrField(prefix + 'driver-name'),
            driverPhone: hrField(prefix + 'driver-phone'),
            driverNationalId: hrField(prefix + 'driver-national'),
            driverType: hrField(prefix + 'driver-type') || 'employee',
            branchId: hrField(prefix + 'branch') || 'hq',
            assignedDate: hrField(prefix + 'date') || now,
            assignedTime: hrField(prefix + 'time') || '',
            destination: hrField(prefix + 'destination'),
            purpose: hrField(prefix + 'purpose'),
            odometerOut: hrNum(hrField(prefix + 'odometer-out')),
            odometerIn: prefix === 'hte-' ? (hrNum(hrField('hte-odometer-in')) || null) : null,
            returnDate: prefix === 'hte-' ? hrField('hte-return-date') : null,
            returnTime: prefix === 'hte-' ? hrField('hte-return-time') : null,
            status: prefix === 'hte-' ? (hrField('hte-status') || 'on_road') : 'on_road',
            notes: hrField(prefix + 'notes'),
            updatedAt: now,
            createdAt: existingId ? ((hrVehicleTracking.find(function(x) { return x.id === existingId; }) || {}).createdAt || now) : now
        };
    }

    function saveHrTrackingQuick() {
        if (!requireHrOps()) return;
        const plate = hrField('ht-plate');
        const driverName = hrField('ht-driver-name');
        if (!plate || !driverName) { alert('رقم اللوحة واسم السائق مطلوبان.'); return; }
        const record = buildTrackingRecordFromForm('ht-', null);
        if (!record) return;

        const veh = record.vehicleId ? getVehicleById(record.vehicleId) : findVehicleByPlate(plate);
        if (veh) {
            hrVehicleTracking.filter(function(t) {
                return t.vehicleId === veh.id && t.status === 'on_road';
            }).forEach(function(t) {
                t.status = 'returned';
                t.returnDate = record.assignedDate;
                t.notes = (t.notes ? t.notes + ' · ' : '') + 'أُغلق تلقائياً عند تسليم سائق جديد';
            });
            if (record.odometerOut > 0) veh.mileage = record.odometerOut;
        }

        hrVehicleTracking.unshift(record);
        saveHrData();
        syncVehicleCurrentDriversFromTracking();
        hrAudit('HR تتبع سيارة', 'خروج ' + plate + ' — سائق ' + record.driverName);
        renderHrPlatformPanel();
    }

    function saveHrTracking(id) {
        if (!requireHrOps()) return;
        if (!id) return;
        const record = buildTrackingRecordFromForm('hte-', id);
        if (!record || !record.driverName) { alert('اسم السائق مطلوب.'); return; }

        const idx = hrVehicleTracking.findIndex(function(x) { return x.id === id; });
        if (idx < 0) return;

        if (record.status === 'on_road' && record.vehicleId) {
            hrVehicleTracking.forEach(function(t, i) {
                if (i !== idx && t.vehicleId === record.vehicleId && t.status === 'on_road') {
                    t.status = 'returned';
                    t.returnDate = record.assignedDate;
                }
            });
        }

        const veh = record.vehicleId ? getVehicleById(record.vehicleId) : null;
        if (veh) {
            if (record.status === 'returned' && record.odometerIn > 0) veh.mileage = record.odometerIn;
            else if (record.odometerOut > 0 && record.status === 'on_road') veh.mileage = record.odometerOut;
        }

        hrVehicleTracking[idx] = record;
        saveHrData();
        syncVehicleCurrentDriversFromTracking();
        hrTrackingEditorId = null;
        hrAudit('HR تعديل تتبع', record.plateNo + ' — ' + record.driverName);
        renderHrPlatformPanel();
    }

    function returnHrVehicleFromTracking(id) {
        if (!requireHrOps()) return;
        const t = hrVehicleTracking.find(function(x) { return x.id === id; });
        if (!t || t.status !== 'on_road') return;
        const odoIn = prompt('عداد العودة (كم) — اختياري:', t.odometerOut ? String(t.odometerOut) : '');
        if (odoIn === null) return;
        const now = new Date();
        t.status = 'returned';
        t.returnDate = now.toISOString().slice(0, 10);
        t.returnTime = now.toTimeString().slice(0, 5);
        if (odoIn && !isNaN(parseFloat(odoIn))) {
            t.odometerIn = parseFloat(odoIn);
            const veh = t.vehicleId ? getVehicleById(t.vehicleId) : null;
            if (veh) veh.mileage = t.odometerIn;
        }
        t.updatedAt = t.returnDate;
        saveHrData();
        syncVehicleCurrentDriversFromTracking();
        hrAudit('HR عودة سيارة', t.plateNo + ' — ' + t.driverName);
        renderHrPlatformPanel();
    }

    function deleteHrTracking(id) {
        if (!requireHrOps()) return;
        const t = hrVehicleTracking.find(function(x) { return x.id === id; });
        if (!t || !confirm('حذف سجل التتبع — ' + t.plateNo + ' / ' + t.driverName + '؟')) return;
        hrVehicleTracking = hrVehicleTracking.filter(function(x) { return x.id !== id; });
        saveHrData();
        syncVehicleCurrentDriversFromTracking();
        hrAudit('HR حذف تتبع', t.plateNo);
        renderHrPlatformPanel();
    }

    function renderHrReportsPanel() {
        if (!canViewHrExecutiveReports()) {
            return '<div class="hr-panel is-active"><p class="erp-empty">التقارير التنفيذية — الإدارة الرئيسية فقط.</p></div>';
        }
        const byBranch = {};
        hrEmployees.forEach(function(e) {
            const k = resolveHrBranchLabel(e.branchId);
            if (!byBranch[k]) byBranch[k] = { total: 0, active: 0, salary: 0 };
            byBranch[k].total++;
            if (e.status === 'active') byBranch[k].active++;
            byBranch[k].salary += hrNum(e.salary) + hrNum(e.housingAllowance) + hrNum(e.transportAllowance);
        });

        const rows = Object.keys(byBranch).map(function(k) {
            const b = byBranch[k];
            return '<tr><td>' + esc(k) + '</td><td>' + b.total + '</td><td>' + b.active + '</td><td>' + (typeof formatSar === 'function' ? formatSar(b.salary) : b.salary.toFixed(0)) + '</td></tr>';
        }).join('');

        const onRoad = hrVehicleTracking.filter(function(t) { return t.status === 'on_road'; }).length;
        const trackRows = hrVehicleTracking.slice(0, 50).map(function(t) {
            return '<tr><td>' + esc(t.plateNo) + '</td><td>' + esc(t.driverName) + '</td><td>' + esc(t.driverEmployeeNo || '') + '</td><td>' + formatHrDate(t.assignedDate) + '</td><td>' + esc((HR_TRACK_STATUS[t.status] || {}).label || t.status) + '</td></tr>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-crown"></i> <strong>تقرير تنفيذي — الإدارة الرئيسية فقط:</strong> موظفون · رواتب تقديرية · تتبع السيارات. لا يظهر لموظف HR.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + hrEmployees.length + '</strong><span>موظف / عامل</span></div>' +
                '<div class="hr-report-card"><strong>' + hrVehicles.length + '</strong><span>سيارات</span></div>' +
                '<div class="hr-report-card"><strong>' + onRoad + '</strong><span>خارجة الآن</span></div>' +
                '<div class="hr-report-card"><strong>' + hrVehicleTracking.length + '</strong><span>سجلات تتبع</span></div>' +
            '</div>' +
            '<div class="erp-form-actions" style="margin-bottom:12px">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportHrReportCsv()"><i class="fas fa-file-csv"></i> تصدير موظفين CSV</button>' +
                '<button type="button" class="nebras-users-btn" onclick="exportHrTrackingCsv()"><i class="fas fa-file-csv"></i> تصدير تتبع CSV</button>' +
                '<button type="button" class="nebras-users-btn" onclick="printHrReport()"><i class="fas fa-print"></i> طباعة</button>' +
            '</div>' +
            '<div class="hr-leave-table-wrap" id="hr-report-print-area">' +
                '<h4>توزيع القوى العاملة</h4>' +
                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>الفرع</th><th>عدد الموظفين</th><th>نشطون</th><th>تكلفة رواتب تقديرية</th>' +
                '</tr></thead><tbody>' + (rows || '<tr><td colspan="4">لا بيانات</td></tr>') + '</tbody></table>' +
                '<h4 style="margin-top:16px">آخر سجلات تتبع السيارات</h4>' +
                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="5">لا سجلات</td></tr>') + '</tbody></table>' +
            '</div></div>';
    }

    function exportHrReportCsv() {
        if (!requireHrExecutiveReport()) return;
        const lines = ['الفرع,رقم الموظف,الاسم,القسم,المسمى,الجوال,الفرع,الحالة,الراتب'];
        hrEmployees.forEach(function(e) {
            lines.push([
                resolveHrBranchLabel(e.branchId),
                e.employeeNo, e.nameAr, e.department || '', e.jobTitle || '',
                e.phone || '', resolveHrBranchLabel(e.branchId),
                (HR_EMP_STATUS[e.status] || {}).label || e.status,
                hrNum(e.salary)
            ].map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','));
        });
        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-hr-employees-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        hrAudit('HR تقرير', 'تصدير CSV موظفين');
    }

    function exportHrTrackingCsv() {
        if (!requireHrExecutiveReport()) return;
        const lines = ['اللوحة,رقم السائق,اسم السائق,جوال,نوع السائق,تاريخ الخروج,الوجهة,الحالة,عداد خروج,عداد عودة'];
        hrVehicleTracking.forEach(function(t) {
            lines.push([
                t.plateNo, t.driverEmployeeNo || '', t.driverName, t.driverPhone || '',
                HR_DRIVER_TYPES[t.driverType] || t.driverType, t.assignedDate,
                t.destination || '', (HR_TRACK_STATUS[t.status] || {}).label || t.status,
                t.odometerOut || '', t.odometerIn || ''
            ].map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','));
        });
        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-hr-tracking-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        hrAudit('HR تقرير تنفيذي', 'تصدير CSV تتبع سيارات');
    }

    function printHrReport() {
        if (!requireHrExecutiveReport()) return;
        const area = document.getElementById('hr-report-print-area');
        if (!area) return;
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة للطباعة.'); return; }
        w.document.write('<html dir="rtl"><head><title>تقرير HR — نبراس</title><style>body{font-family:Tahoma,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#f0f0f0}</style></head><body>');
        w.document.write('<h2>مصنع نبراس — تقرير الموارد البشرية</h2><p>' + new Date().toLocaleString('ar-SA') + '</p>');
        w.document.write(area.innerHTML);
        w.document.write('</body></html>');
        w.document.close();
        w.print();
    }

    function isHrDepartmentAdmin(admin) {
        admin = admin || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!admin) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) return false;
        return admin.role === 'hr';
    }

    /** حوكمة صارمة — موظف HR يرى HR فقط على الداشبورد */
    function applyHrStrictDashboardGovernance(user) {
        user = user || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!user || !isStrictHrUser(user)) return;
        const dash = document.getElementById('admin-dashboard');
        if (dash) dash.classList.add('dashboard-hr-only');
        const hideNavIds = [
            'dash-nav-analytics', 'dash-nav-partners', 'dash-nav-ops', 'dash-nav-modules',
            'dash-nav-erp', 'dash-nav-platform', 'dash-nav-content', 'dash-nav-settings', 'dash-nav-official'
        ];
        hideNavIds.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const secondary = document.getElementById('dashboard-secondary-grid');
        if (secondary) secondary.innerHTML = '';
        ['dashboard-hub-intro', 'admin-analytics-hub', 'dashboard-partners-block', 'platform-hub-panel', 'erp-hub-panel'].forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('dashboard-section--role-hidden');
        });
        setTimeout(function() {
            if (typeof openHrPlatform === 'function') openHrPlatform();
        }, 500);
    }

    /* ——— تصدير للمنصة ——— */
    global.getHrEmployees = function() { loadHrData(); return hrEmployees; };
    global.getHrVehicles = function() { loadHrData(); return hrVehicles; };
    global.getHrLeaveRequests = function() { loadHrData(); return hrLeaveRequests; };
    global.getHrVehicleTracking = function() { loadHrData(); return hrVehicleTracking; };
    global.setHrEmployeesFromCloud = setHrEmployeesFromCloud;
    global.setHrVehiclesFromCloud = setHrVehiclesFromCloud;
    global.setHrLeaveFromCloud = setHrLeaveFromCloud;
    global.setHrVehicleTrackingFromCloud = setHrVehicleTrackingFromCloud;
    global.ensureHrData = loadHrData;
    global.openHrPlatform = openHrPlatform;
    global.renderHrPlatformPanel = renderHrPlatformPanel;
    global.switchHrTab = switchHrTab;
    global.setHrBranchFilter = setHrBranchFilter;
    global.setHrSearch = setHrSearch;
    global.openHrEmployeeEditor = openHrEmployeeEditor;
    global.cancelHrEmployeeEditor = cancelHrEmployeeEditor;
    global.saveHrEmployee = saveHrEmployee;
    global.deleteHrEmployee = deleteHrEmployee;
    global.openHrVehicleEditor = openHrVehicleEditor;
    global.cancelHrVehicleEditor = cancelHrVehicleEditor;
    global.saveHrVehicle = saveHrVehicle;
    global.deleteHrVehicle = deleteHrVehicle;
    global.addHrLeaveRequest = addHrLeaveRequest;
    global.setHrLeaveStatus = setHrLeaveStatus;
    global.deleteHrLeave = deleteHrLeave;
    global.exportHrReportCsv = exportHrReportCsv;
    global.exportHrTrackingCsv = exportHrTrackingCsv;
    global.printHrReport = printHrReport;
    global.canAccessHrPlatform = canAccessHr;
    global.canViewHrExecutiveReports = canViewHrExecutiveReports;
    global.isStrictHrUser = isStrictHrUser;
    global.isHrDepartmentAdmin = isHrDepartmentAdmin;
    global.applyHrStrictDashboardGovernance = applyHrStrictDashboardGovernance;
    global.saveHrTrackingQuick = saveHrTrackingQuick;
    global.saveHrTracking = saveHrTracking;
    global.openHrTrackingEditor = openHrTrackingEditor;
    global.cancelHrTrackingEditor = cancelHrTrackingEditor;
    global.returnHrVehicleFromTracking = returnHrVehicleFromTracking;
    global.deleteHrTracking = deleteHrTracking;
    global.lookupHrDriverByEmployeeNo = lookupHrDriverByEmployeeNo;
    global.lookupHrVehicleByPlate = lookupHrVehicleByPlate;
    global.lookupHrDriverByEmployeeNoEdit = lookupHrDriverByEmployeeNoEdit;
    global.lookupHrVehicleByPlateEdit = lookupHrVehicleByPlateEdit;

    loadHrData();
})(typeof window !== 'undefined' ? window : globalThis);
