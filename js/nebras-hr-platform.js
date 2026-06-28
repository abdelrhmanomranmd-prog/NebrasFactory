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
    const HR_ATT_KEY = 'nebrasHrAttendance';
    const HR_DOC_KEY = 'nebrasHrDocuments';
    const HR_PAYROLL_KEY = 'nebrasHrPayroll';

    let hrEmployees = [];
    let hrVehicles = [];
    let hrLeaveRequests = [];
    let hrVehicleTracking = [];
    let hrAttendance = [];
    let hrDocuments = [];
    let hrPayrollRuns = [];
    let hrNotifications = [];
    let hrNotifSettings = { remindDays: [30, 60], notifyEmail: '', lastScan: '' };
    let pendingHrDocAttachment = null;
    let hrEmailQueue = [];
    let hrShiftRoster = [];
    let hrDeptActivity = [];
    let hrActiveTab = 'dashboard';
    let hrBranchFilter = '';
    let hrSearchQuery = '';
    let hrEmployeeEditorId = false;
    let hrVehicleEditorId = false;
    let hrTrackingEditorId = null;
    let hrDocEditorId = null;
    let hrPayrollMonth = '';
    let hrDataReady = false;
    let hrSearchDebounce = null;

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

    function loadHrData(force) {
        if (hrDataReady && !force) {
            return { employees: hrEmployees, vehicles: hrVehicles, leave: hrLeaveRequests, tracking: hrVehicleTracking, attendance: hrAttendance, documents: hrDocuments, payroll: hrPayrollRuns };
        }
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
        loadHrPhase12Arrays();
        if (!hrEmployees.length && typeof nebrasHasLocalGovernanceData === 'function' && !nebrasHasLocalGovernanceData() &&
            !(typeof global.NEBRAS_PRODUCTION_LIVE_MODE !== 'undefined' && global.NEBRAS_PRODUCTION_LIVE_MODE)) {
            ensureBuiltinHrSeed();
        }
        if (typeof loadHrGpsData === 'function') loadHrGpsData();
        if (!(typeof global.NEBRAS_PRODUCTION_LIVE_MODE !== 'undefined' && global.NEBRAS_PRODUCTION_LIVE_MODE) &&
            typeof seedDemoGpsIfNeeded === 'function') seedDemoGpsIfNeeded();
        if (typeof ensureTrackingGpsToken === 'function') {
            hrVehicleTracking.forEach(function(t) {
                if (t.status === 'on_road') ensureTrackingGpsToken(t);
            });
        }
        ensureBuiltinHrPhase12Seed();
        loadHrPhase13Data();
        try { processHrExpiryReminders(); } catch (e) { console.warn('HR reminders', e); }
        loadHrPhase14Data();
        loadHrPhase15Data();
        loadHrPhase17Data();
        ensureBuiltinHrPhase15Seed();
        if (typeof loadHrCompaniesData === 'function') loadHrCompaniesData();
        hrDataReady = true;
        if (typeof migrateHrRecordsCompanyId === 'function') migrateHrRecordsCompanyId();
        applyHrScopeDefaultsOnLogin();
        if (typeof global.enforceProductionBusinessCleanState === 'function') global.enforceProductionBusinessCleanState();
        return { employees: hrEmployees, vehicles: hrVehicles, leave: hrLeaveRequests, tracking: hrVehicleTracking, attendance: hrAttendance, documents: hrDocuments, payroll: hrPayrollRuns };
    }

    async function saveHrData() {
        const hrCloudKeys = [
            'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking',
            'hr_attendance', 'hr_documents', 'hr_payroll', 'hr_companies',
            'hr_travel', 'hr_deductions', 'hr_advances', 'hr_vehicle_violations',
            'hr_notifications', 'hr_notif_settings', 'hr_email_queue', 'hr_shift_roster', 'hr_dept_activity'
        ];
        if (global.NEBRAS_ODOO_WRITE_MODE && typeof global.nebrasOdooPersistKeys === 'function') {
            const cloudOk = await global.nebrasOdooPersistKeys(hrCloudKeys, { showToast: true, promptReauth: false });
            try {
                localStorage.setItem(HR_EMP_KEY, JSON.stringify(hrEmployees));
                localStorage.setItem(HR_VEH_KEY, JSON.stringify(hrVehicles));
                localStorage.setItem(HR_LEAVE_KEY, JSON.stringify(hrLeaveRequests));
                localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking));
                saveHrPhase12Arrays();
                saveHrPhase13Data();
                saveHrPhase14Data();
                saveHrPhase15Data();
                saveHrPhase17Data();
                try { localStorage.setItem('nebrasHrProductionMode', '1'); } catch (e) { /* ignore */ }
            } catch (err) { console.warn('HR local cache failed', err); }
            if (!cloudOk && typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('✗ لم يُحفظ HR على السيرفر — أعيدي المحاولة', 'error');
            }
            if (typeof updateCloudSafetyBanner === 'function') updateCloudSafetyBanner();
            return;
        }
        try {
            localStorage.setItem(HR_EMP_KEY, JSON.stringify(hrEmployees));
            localStorage.setItem(HR_VEH_KEY, JSON.stringify(hrVehicles));
            localStorage.setItem(HR_LEAVE_KEY, JSON.stringify(hrLeaveRequests));
            localStorage.setItem(HR_TRACK_KEY, JSON.stringify(hrVehicleTracking));
            saveHrPhase12Arrays();
            saveHrPhase13Data();
            saveHrPhase14Data();
            saveHrPhase15Data();
            saveHrPhase17Data();
            try { localStorage.setItem('nebrasHrProductionMode', '1'); } catch (e) { /* ignore */ }
        } catch (err) { console.warn('HR save failed', err); }
        if (typeof markLocalCloudMutationBatch === 'function') markLocalCloudMutationBatch(hrCloudKeys);
        if (typeof saveSystemData === 'function') saveSystemData({ skipCloud: true });
        if (typeof persistNebrasCriticalStores === 'function') {
            const cloudOk = await persistNebrasCriticalStores(hrCloudKeys, {
                showToast: true,
                promptReauth: false
            });
            if (!cloudOk && typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('⚠️ بيانات الموارد البشرية لم تُحفظ في السحابة — اضغطي «رفع الآن» أو أعيدي تسجيل الدخول', 'error');
            }
            if (typeof updateCloudSafetyBanner === 'function') updateCloudSafetyBanner();
        }
    }

    function setHrEmployeesFromCloud(v) {
        hrEmployees = Array.isArray(v) ? v : [];
        if (hrEmployees.length) {
            hrEmployees.forEach(mapEmployeeDepartmentKey);
        }
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

    function mapEmployeeDepartmentKey(emp) {
        if (!emp || emp.departmentKey) return;
        if (typeof HR_FACTORY_DEPTS === 'undefined') return;
        const hit = Object.keys(HR_FACTORY_DEPTS).find(function(k) {
            return emp.department === HR_FACTORY_DEPTS[k] || (emp.department && emp.department.indexOf(HR_FACTORY_DEPTS[k]) >= 0);
        });
        if (hit) emp.departmentKey = hit;
        else if (emp.department === 'الإدارة') emp.departmentKey = 'admin';
        else if (emp.department === 'المبيعات') emp.departmentKey = 'sales';
        else if (emp.department === 'الإنتاج') emp.departmentKey = 'production_alu';
        else if (emp.department === 'الورشة') emp.departmentKey = 'workshop';
    }

    function ensureBuiltinHrSeed() {
        if (typeof global.NEBRAS_PRODUCTION_LIVE_MODE !== 'undefined' && global.NEBRAS_PRODUCTION_LIVE_MODE) return;
        const now = new Date().toISOString().slice(0, 10);
        if (!hrEmployees.length) {
            hrEmployees = [
                {
                    id: 'emp-hq-001', employeeNo: 'NEB-001', nameAr: 'أحمد محمد العتيبي', nameEn: 'Ahmed Al-Otaibi',
                    nationalId: '1*********', nationality: 'سعودي', branchId: 'hq', departmentKey: 'admin', department: 'الإدارة', jobTitle: 'مدير مصنع',
                    employmentType: 'fulltime', status: 'active', joinDate: '2018-03-01', phone: '0500000001', phone2: '0160000001',
                    email: 'ahmed@nebras.factory', emergencyName: 'فاطمة العتيبي', emergencyPhone: '0500000099',
                    salary: 18000, housingAllowance: 3000, transportAllowance: 1500, bankName: 'الراجحي', iban: 'SA00****',
                    gosiNo: 'GOSI-001', vehicleId: 'veh-001', notes: 'المقر الرئيسي', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-riy-002', employeeNo: 'NEB-002', nameAr: 'خالد سعد القحطاني', nameEn: 'Khaled Al-Qahtani',
                    nationalId: '2*********', nationality: 'سعودي', branchId: '2', departmentKey: 'sales', department: 'المبيعات', jobTitle: 'مشرف مبيعات',
                    employmentType: 'fulltime', status: 'active', joinDate: '2020-06-15', phone: '0500000002', email: 'khaled@nebras.factory',
                    emergencyName: 'نورة القحطاني', emergencyPhone: '0500000088', salary: 12000, housingAllowance: 2000,
                    transportAllowance: 1000, vehicleId: 'veh-002', notes: 'فرع الرياض', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-jed-003', employeeNo: 'NEB-003', nameAr: 'محمد علي الزهراني', nameEn: 'Mohammed Al-Zahrani',
                    nationalId: '3*********', nationality: 'سعودي', branchId: '3', departmentKey: 'production_alu', department: 'الإنتاج', jobTitle: 'فني ألومنيوم',
                    employmentType: 'fulltime', status: 'active', joinDate: '2021-01-10', phone: '0500000003', salary: 9000,
                    transportAllowance: 800, notes: 'فرع جدة', createdAt: now, updatedAt: now
                },
                {
                    id: 'emp-hq-004', employeeNo: 'NEB-004', nameAr: 'عبدالله حسن', nameEn: 'Abdullah Hassan',
                    nationalId: '4*********', nationality: 'مصري', branchId: 'hq', departmentKey: 'workshop', department: 'الورشة', jobTitle: 'عامل إنتاج',
                    employmentType: 'daily', status: 'active', joinDate: '2023-05-01', phone: '0500000004', salary: 4500,
                    notes: 'عمال يومية — WPC', createdAt: now, updatedAt: now
                }
            ];
            saveHrData();
        }
        hrEmployees.forEach(mapEmployeeDepartmentKey);
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
        let list = applyHrScopeFilter(hrEmployees.slice(), 'employee');
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
        let list = applyHrScopeFilter(hrVehicles.slice(), 'vehicle');
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

    function getHrActor() {
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        return {
            userId: admin && admin.id ? String(admin.id) : '',
            username: admin && admin.username ? String(admin.username) : 'system',
            role: admin && admin.role ? String(admin.role) : ''
        };
    }

    function stampHrRecord(record, isNew) {
        if (!record || typeof record !== 'object') return record;
        const actor = getHrActor();
        const now = new Date().toISOString();
        record.updatedAt = now.slice(0, 10);
        record.updatedBy = actor.userId;
        record.updatedByUsername = actor.username;
        record.lastEditedBy = actor.username;
        if (isNew) {
            record.createdAt = record.createdAt || now.slice(0, 10);
            record.createdBy = actor.userId;
            record.createdByUsername = actor.username;
        }
        return record;
    }

    function formatHrRecordEditor(record) {
        if (!record) return '';
        const who = record.updatedByUsername || record.createdByUsername || '';
        if (!who) return '';
        const when = record.updatedAt || record.createdAt || '';
        return '<div class="hr-record-meta"><i class="fas fa-user-pen"></i> ' + esc(who) +
            (when ? ' · ' + formatHrDate(when) : '') + '</div>';
    }

    function hrAudit(action, detail) {
        const actor = getHrActor();
        const stamped = '[' + actor.username + '] ' + (detail || '');
        if (typeof addAuditLog === 'function') addAuditLog(action, stamped);
        if (typeof logHrDeptActivity === 'function') logHrDeptActivity(action, stamped);
    }

    function updateHrWorkspaceChrome() {
        const scope = getHrAdminScope();
        const scopeEl = document.getElementById('hr-ws-scope-label');
        const userEl = document.getElementById('hr-ws-user-pill');
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const companySuffix = (typeof getHrCompanyFilter === 'function' && getHrCompanyFilter() && typeof resolveHrCompanyLabel === 'function')
            ? (' · ' + resolveHrCompanyLabel(getHrCompanyFilter()))
            : ((typeof getActiveHrCompanies === 'function' && getActiveHrCompanies().length > 1) ? ' · مجموعة شركات' : '');
        if (scopeEl) scopeEl.textContent = (isStrictHrUser() ? 'نبراس HCM — ' : '') + (scope.label || 'موارد بشرية · قسمك فقط') + companySuffix;
        const brandEl = document.getElementById('hr-ws-brand-title');
        if (brandEl) brandEl.textContent = isStrictHrUser() ? ('نبراس HCM — إدارة مجموعة الشركات' + companySuffix) : ('منصة HR — مصنع نبراس WPC' + companySuffix);
        if (userEl && admin) {
            const cloudOk = typeof isNebrasCloudConnected === 'function' ? isNebrasCloudConnected() : false;
            const cloudCls = cloudOk ? 'is-live' : 'is-offline';
            const cloudTxt = cloudOk ? 'سحابة متصلة' : 'وضع محلي';
            userEl.innerHTML = '<span class="hr-ws-cloud-pill ' + cloudCls + '"><i class="fas fa-cloud"></i> ' + cloudTxt + '</span>' +
                '<i class="fas fa-user-shield"></i> ' + esc(admin.username || '') +
                (admin.role === 'hr' ? ' · HR' : '');
        }
    }

    function paintHrWorkspaceShell(message) {
        const summary = document.getElementById('hr-platform-summary');
        const content = document.getElementById('hr-platform-content');
        const msg = message || 'جاري تحميل نبراس HCM…';
        const hasPanel = content && content.querySelector('.hr-panel.is-active:not(#hr-static-fallback)');
        if (hasPanel) return;
        if (summary && !summary.querySelector('.erp-stat')) {
            summary.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong><i class="fas fa-spinner fa-spin"></i></strong><span>تحميل البيانات</span></div>' +
                '<div class="erp-stat"><strong>—</strong><span>موظفون</span></div>' +
                '<div class="erp-stat"><strong>—</strong><span>سيارات</span></div>';
        }
        if (content && !content.querySelector('.hr-panel.is-active')) {
            content.innerHTML = '<div class="hr-ws-loading"><i class="fas fa-spinner fa-spin"></i> ' + esc(msg) + '</div>';
        }
    }

    function initHrWorkspaceInteractions() {
        const root = document.getElementById('hr-platform');
        if (!root || root.__hrWsBound) return;
        root.__hrWsBound = true;
        root.addEventListener('click', function(ev) {
            const navBtn = ev.target.closest('[data-hr-tab]');
            if (navBtn) {
                ev.preventDefault();
                const tab = navBtn.getAttribute('data-hr-tab');
                if (tab) switchHrTab(tab);
                return;
            }
            const retryBtn = ev.target.closest('[data-hr-retry]');
            if (retryBtn) {
                ev.preventDefault();
                renderHrPlatformPanelSafe();
            }
        });
    }

    function scheduleHrWorkspaceRender(retries) {
        retries = retries == null ? 0 : retries;
        const run = function() {
            try {
                renderHrPlatformPanelSafe();
                const content = document.getElementById('hr-platform-content');
                const ok = content && content.querySelector('.hr-panel.is-active, .hr-ws-loading');
                if (!ok && retries < 6) {
                    setTimeout(function() { scheduleHrWorkspaceRender(retries + 1); }, 80 * (retries + 1));
                }
            } catch (e) {
                console.error('scheduleHrWorkspaceRender', e);
                if (retries < 6) setTimeout(function() { scheduleHrWorkspaceRender(retries + 1); }, 120);
            }
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(function() { requestAnimationFrame(run); });
        } else {
            setTimeout(run, 0);
        }
    }

    function renderHrWorkspaceSidebar(tabDefs) {
        const scope = getHrAdminScope();
        const head = document.querySelector('#hr-ws-sidebar .hr-ws-sidebar-head');
        if (head) {
            const hcm = isStrictHrUser();
            head.innerHTML = '<strong><i class="' + (hcm ? 'fas fa-people-roof' : esc(scope.icon || 'fas fa-sitemap')) + '"></i> ' + (hcm ? 'نبراس HCM' : 'وحدة التحكم') + '</strong>' +
                '<span>' + esc(scope.label) + ' — موظفون · رواتب · أسطول · سعودة</span>';
        }
        const navHost = document.getElementById('hr-ws-nav');
        if (navHost && tabDefs && tabDefs.length) {
            const groups = [];
            const groupMap = {};
            tabDefs.forEach(function(t) {
                const g = t.group || 'النظام';
                if (!groupMap[g]) { groupMap[g] = []; groups.push(g); }
                groupMap[g].push(t);
            });
            navHost.innerHTML = groups.map(function(g) {
                const items = groupMap[g].map(function(t) {
                    return '<button type="button" class="hr-ws-nav-item' + (hrActiveTab === t.id ? ' is-active' : '') +
                        '" data-hr-tab="' + esc(t.id) + '" onclick="switchHrTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
                }).join('');
                return '<div class="hr-ws-nav-group"><span class="hr-ws-nav-group-label">' + esc(g) + '</span>' + items + '</div>';
            }).join('');
        } else {
            document.querySelectorAll('#hr-ws-nav .hr-ws-nav-item, #hr-ws-sidebar .hr-ws-nav .hr-ws-nav-item').forEach(function(btn) {
                const tab = btn.getAttribute('data-hr-tab');
                btn.classList.toggle('is-active', tab === hrActiveTab);
            });
        }
    }

    function closeHrWorkspace() {
        const el = document.getElementById('hr-platform');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('hr-platform-open');
        if (typeof global !== 'undefined') global.__hrPanelReady = false;
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof currentAdmin !== 'undefined' && currentAdmin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('عودة للداشبورد', 'ok');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function showHrPlatformShell() {
        const el = document.getElementById('hr-platform');
        if (!el) {
            alert('تعذر فتح منصة HR — أعيدي تحميل الصفحة.');
            return false;
        }
        if (typeof closeAllAdminSections === 'function') {
            document.querySelectorAll('.admin-section.show').forEach(function(node) {
                if (node.id !== 'hr-platform') {
                    node.classList.remove('show');
                    node.setAttribute('aria-hidden', 'true');
                }
            });
        }
        const dash = document.getElementById('admin-dashboard');
        if (dash) {
            dash.classList.remove('show');
            dash.setAttribute('aria-hidden', 'true');
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('hr-platform-open');
        initHrWorkspaceInteractions();
        paintHrWorkspaceShell();
        updateHrWorkspaceChrome();
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        return true;
    }

    let hrRenderBusy = false;
    let hrRenderQueued = false;

    function renderHrPlatformPanelSafe() {
        if (hrRenderBusy) {
            hrRenderQueued = true;
            return false;
        }
        hrRenderBusy = true;
        try {
            const staticFb = document.getElementById('hr-static-fallback');
            if (staticFb) staticFb.remove();
            loadHrData();
            if (typeof loadHcmSuiteData === 'function') loadHcmSuiteData();
            renderHrWorkspaceSidebar(getHrTabDefinitions());
            updateHrWorkspaceChrome();
            renderHrPlatformPanel();
            if (typeof initHrFormEnterpriseFields === 'function') initHrFormEnterpriseFields(document.getElementById('hr-platform'));
            if (typeof global !== 'undefined') global.__hrPanelReady = true;
            return true;
        } catch (err) {
            console.error('renderHrPlatformPanel', err);
            const content = document.getElementById('hr-platform-content');
            const scopedEmps = applyHrScopeFilter(hrEmployees.slice(), 'employee');
            const scopedVehs = applyHrScopeFilter(hrVehicles.slice(), 'vehicle');
            const pendingLeave = applyHrScopeFilter(hrLeaveRequests.slice(), 'leave').filter(function(l) { return l.status === 'pending'; }).length;
            const activeEmps = scopedEmps.filter(function(e) { return e.status === 'active'; }).length;
            if (content) {
                content.innerHTML = '<div class="hr-panels">' + renderHrMinimalDashboard(scopedEmps, activeEmps, scopedVehs, pendingLeave) +
                    '<p class="erp-empty">تعذّر تحميل لوحة كاملة — عرض احتياطي. <button type="button" class="erp-tag erp-tag--action" data-hr-retry="1">إعادة المحاولة</button></p>' +
                    '<small>' + esc(String(err.message || err)) + '</small></div>';
            }
            return false;
        } finally {
            hrRenderBusy = false;
            if (hrRenderQueued) {
                hrRenderQueued = false;
                setTimeout(renderHrPlatformPanelSafe, 16);
            }
        }
    }

    function openHrPlatform() {
        if (!requireHrAccess()) return;
        hrActiveTab = hrActiveTab || 'dashboard';
        if (!showHrPlatformShell()) return;
        renderHrPlatformPanelSafe();
        scheduleHrWorkspaceRender(0);
        if (typeof startNebrasHrBoot === 'function') startNebrasHrBoot();
    }

    function switchHrTab(tab) {
        hrActiveTab = tab || 'dashboard';
        hrEmployeeEditorId = false;
        hrVehicleEditorId = false;
        hrTrackingEditorId = null;
        hrDocEditorId = null;
        renderHrPlatformPanelSafe();
    }

    function setHrBranchFilter(val) {
        hrBranchFilter = val || '';
        renderHrPlatformPanelSafe();
    }

    function setHrSearch(val) {
        hrSearchQuery = val || '';
        if (hrSearchDebounce) clearTimeout(hrSearchDebounce);
        hrSearchDebounce = setTimeout(function() { renderHrPlatformPanelSafe(); }, 220);
    }

    function getHrTabDefinitions() {
        const base = [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة التحكم', group: 'الرئيسية' },
            { id: 'companies', icon: 'fas fa-building-circle-check', label: 'الشركات — نبراس والشقيقة', group: 'الموارد البشرية' },
            { id: 'employees', icon: 'fas fa-users', label: 'الموظفون والعمال', group: 'الموارد البشرية' },
            { id: 'org-tree', icon: 'fas fa-sitemap', label: 'شجرة العمل', group: 'الموارد البشرية' },
            { id: 'documents', icon: 'fas fa-folder-open', label: 'المستندات والإقامات', group: 'الموارد البشرية' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'الإجازات', group: 'الموارد البشرية' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور وانصراف', group: 'الوقت والحضور' },
            { id: 'payroll', icon: 'fas fa-money-check-dollar', label: 'مسير الرواتب', group: 'الرواتب والمزايا' },
            { id: 'factory', icon: 'fas fa-industry', label: 'عمليات المصنع WPC', group: 'المصنع' },
            { id: 'fleet-hub', icon: 'fas fa-truck-fast', label: 'مركز الأسطول', group: 'إدارة الأسطول' },
            { id: 'vehicles', icon: 'fas fa-car', label: 'سجل السيارات', group: 'إدارة الأسطول' },
            { id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع السيارات', group: 'إدارة الأسطول' },
            { id: 'fleet-reps', icon: 'fas fa-user-tie', label: 'أسطول المندوبين', group: 'إدارة الأسطول' },
            { id: 'travel', icon: 'fas fa-plane', label: 'تذاكر السفر', group: 'الرواتب والمزايا' },
            { id: 'deductions', icon: 'fas fa-scale-balanced', label: 'الخصومات الديناميكية', group: 'الرواتب والمزايا' },
            { id: 'saudization', icon: 'fas fa-flag', label: 'السعودة والامتثال', group: 'الامتثال' },
            { id: 'alerts', icon: 'fas fa-bell', label: 'التنبيهات', group: 'الامتثال' },
            { id: 'governance', icon: 'fas fa-shield-halved', label: 'حوكمة القسم', group: 'الامتثال' },
            { id: 'activity', icon: 'fas fa-clock-rotate-left', label: 'سجل العمليات', group: 'الامتثال' }
        ];
        try {
            let tabDefs = base.slice();
            if (typeof getHcmTabExtensions === 'function') {
                getHcmTabExtensions().forEach(function(ext) {
                    if (!tabDefs.some(function(t) { return t.id === ext.id; })) tabDefs.push(ext);
                });
            }
            if (typeof getHrViolationsTabExtension === 'function') {
                const vExt = getHrViolationsTabExtension();
                if (!tabDefs.some(function(t) { return t.id === vExt.id; })) {
                    const trackIdx = tabDefs.findIndex(function(t) { return t.id === 'tracking'; });
                    if (trackIdx >= 0) tabDefs.splice(trackIdx + 1, 0, vExt);
                    else tabDefs.push(vExt);
                }
            }
            if (canViewHrExecutiveReports()) {
                tabDefs.push({ id: 'reports', icon: 'fas fa-file-export', label: 'تقارير الإدارة الرئيسية', group: 'الإدارة الرئيسية' });
            }
            if (typeof isHrTabAllowedForScope === 'function') {
                tabDefs = tabDefs.filter(function(t) {
                    if (t.id === 'companies') return typeof canManageHrCompanies === 'function' && canManageHrCompanies();
                    if (t.id === 'reports') return canViewHrExecutiveReports();
                    return isHrTabAllowedForScope(t.id);
                });
            }
            return tabDefs;
        } catch (e) {
            console.warn('getHrTabDefinitions', e);
            return base;
        }
    }

    function renderHrMinimalDashboard(scopedEmps, activeEmps, scopedVehs, pendingLeave) {
        const scope = getHrAdminScope();
        return '<div class="hr-panel is-active">' +
            '<div class="hr-command-hero"><div class="hr-command-hero-inner">' +
                '<span class="hr-command-pill"><i class="' + esc(scope.icon || 'fas fa-people-roof') + '"></i> ' + esc(scope.label) + '</span>' +
                '<h2 class="hr-command-title">' + (isStrictHrUser() ? 'نبراس HCM' : 'لوحة إدارة الموارد البشرية') + '</h2>' +
                '<p class="hr-command-sub">نظام حي — موظفون · سعودة · رواتب · خصومات · تذاكر سفر · أسطول وتتبع</p>' +
            '</div></div>' +
            '<div class="hr-command-kpi-ring">' +
                '<div class="hr-command-kpi"><strong>' + scopedEmps.length + '</strong><span>موظفون</span></div>' +
                '<div class="hr-command-kpi hr-command-kpi--ok"><strong>' + activeEmps + '</strong><span>نشطون</span></div>' +
                '<div class="hr-command-kpi"><strong>' + scopedVehs.length + '</strong><span>سيارات</span></div>' +
                '<div class="hr-command-kpi"><strong>' + pendingLeave + '</strong><span>إجازات معلقة</span></div>' +
            '</div>' +
            '<div class="hr-command-quick-row">' +
                '<button type="button" class="hr-command-quick-btn" onclick="openHrEmployeeEditor(null)"><i class="fas fa-user-plus"></i> إضافة موظف</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'attendance\')"><i class="fas fa-fingerprint"></i> حضور اليوم</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'payroll\')"><i class="fas fa-money-check-dollar"></i> مسير الرواتب</button>' +
                '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'vehicles\')"><i class="fas fa-car"></i> السيارات</button>' +
            '</div></div>';
    }

    function renderHrPlatformPanel() {
        const summary = document.getElementById('hr-platform-summary');
        const tabs = document.getElementById('hr-tab-bar');
        const content = document.getElementById('hr-platform-content');
        if (!content) {
            console.warn('HR: hr-platform-content missing');
            return;
        }
        try {
        const emps = filterHrEmployees();
        const vehs = filterHrVehicles();
        const scopedEmps = applyHrScopeFilter(hrEmployees.slice(), 'employee');
        const scopedVehs = applyHrScopeFilter(hrVehicles.slice(), 'vehicle');
        const scopedTeamIds = scopedEmps.map(function(e) { return e.id; });
        const activeEmps = scopedEmps.filter(function(e) { return e.status === 'active'; }).length;
        const onLeave = scopedEmps.filter(function(e) { return e.status === 'on_leave'; }).length;
        const assignedVeh = scopedVehs.filter(function(v) { return v.assignedEmployeeId && v.status === 'active'; }).length;
        const pendingLeave = applyHrScopeFilter(hrLeaveRequests.slice(), 'leave').filter(function(l) { return l.status === 'pending'; }).length;
        const onRoadCount = applyHrScopeFilter(hrVehicleTracking.filter(function(t) { return t.status === 'on_road'; }), 'tracking').length;
        const expiringDocs = scopedVehs.filter(function(v) {
            return isExpiringSoon(v.insuranceExp) || isExpiringSoon(v.inspectionExp) || isExpired(v.insuranceExp);
        }).length;
        const hrAlertsCount = collectHrAlerts().filter(function(a) {
            if (a.level !== 'danger' && a.level !== 'warn') return false;
            if (a.kind === 'doc' && a.id) {
                const d = hrDocuments.find(function(x) { return x.id === a.id; });
                return d && scopedTeamIds.indexOf(d.employeeId) >= 0;
            }
            return true;
        }).length;
        syncVehicleCurrentDriversFromTracking();
        const scope = getHrAdminScope();
        const scopeLabel = scope.mode !== 'full' ? scope.label : '';

        if (summary) {
            summary.innerHTML =
                (scopeLabel ? '<div class="erp-stat erp-stat--accent"><strong><i class="fas fa-lock"></i></strong><span>' + esc(scopeLabel) + '</span></div>' : '') +
                (typeof getHrCompanyFilter === 'function' && getHrCompanyFilter() ? '<div class="erp-stat erp-stat--accent"><strong><i class="fas fa-building"></i></strong><span>' + esc(typeof resolveHrCompanyLabel === 'function' ? resolveHrCompanyLabel(getHrCompanyFilter()) : '') + '</span></div>' : '') +
                '<div class="erp-stat erp-stat--accent"><strong>' + scopedEmps.length + '</strong><span>إجمالي الموظفين</span></div>' +
                '<div class="erp-stat"><strong>' + activeEmps + '</strong><span>نشطون</span></div>' +
                '<div class="erp-stat"><strong>' + scopedVehs.length + '</strong><span>سيارات' + (typeof getHrCompanyFilter === 'function' && getHrCompanyFilter() ? ' الشركة' : ' الشركة') + '</span></div>' +
                '<div class="erp-stat erp-stat--accent"><strong>' + onRoadCount + '</strong><span>سيارات خارجة الآن</span></div>' +
                '<div class="erp-stat"><strong>' + pendingLeave + '</strong><span>إجازات معلقة</span></div>' +
                (expiringDocs ? '<div class="erp-stat erp-stat--danger"><strong>' + expiringDocs + '</strong><span>تنبيه سيارات</span></div>' : '') +
                (hrAlertsCount ? '<div class="erp-stat erp-stat--danger"><strong>' + hrAlertsCount + '</strong><span>تنبيهات HR</span></div>' : '');
        }

        const tabDefs = getHrTabDefinitions();
        renderHrWorkspaceSidebar(tabDefs);
        if (tabs) {
            tabs.innerHTML = tabDefs.map(function(t) {
                return '<button type="button" class="hr-tab-btn' + (hrActiveTab === t.id ? ' is-active' : '') +
                    '" data-hr-tab="' + esc(t.id) + '" onclick="switchHrTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
            }).join('');
            tabs.hidden = false;
            tabs.removeAttribute('hidden');
        }

        const branchOpts = getHrBranches().map(function(b) {
            return '<option value="' + esc(b.id) + '"' + (String(hrBranchFilter) === String(b.id) ? ' selected' : '') + '>' + esc(b.label) + '</option>';
        }).join('');

        const companyToolbar = typeof renderHrCompanyFilterToolbar === 'function' ? renderHrCompanyFilterToolbar() : '';
        const companyCtx = (typeof getHrCompanyFilter === 'function' && getHrCompanyFilter() && typeof resolveHrCompanyLabel === 'function')
            ? '<div class="hr-company-ctx-banner"><i class="fas fa-filter"></i> تعرض بيانات: <strong>' + esc(resolveHrCompanyLabel(getHrCompanyFilter())) + '</strong>' +
                ' <button type="button" class="erp-tag" onclick="setHrCompanyFilter(\'\')"><i class="fas fa-xmark"></i> كل الشركات</button></div>'
            : '';
        const hrScope = typeof getHrAdminScope === 'function' ? getHrAdminScope() : { mode: 'full', branchId: '' };
        const lockBranchFilter = hrScope.branchId && hrScope.mode !== 'full' && hrScope.mode !== 'company';
        const toolbar =
            companyCtx +
            '<div class="hr-toolbar">' +
                companyToolbar +
                '<label class="nebras-field"><span>الفرع</span><select id="hr-branch-filter-select"' + (lockBranchFilter ? ' disabled title="فرعك المخصّص — ' + esc(hrScope.label || '') + '"' : '') + ' onchange="setHrBranchFilter(this.value)">' + branchOpts + '</select></label>' +
                '<label class="nebras-field hr-search-input"><span>بحث</span><input type="search" placeholder="اسم · رقم · جوال · قسم…" value="' + esc(hrSearchQuery) +
                    '" oninput="setHrSearch(this.value)"></label>' +
            '</div>';

        let panelHtml = '';
        if (hrActiveTab === 'dashboard') {
            try {
                panelHtml = (typeof isStrictHrUser === 'function' && isStrictHrUser())
                    ? renderHrScopedDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs)
                    : renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);
            } catch (dashErr) {
                console.error('HR dashboard', dashErr);
                panelHtml = renderHrMinimalDashboard(scopedEmps, activeEmps, scopedVehs, pendingLeave);
            }
        }
        else if (hrActiveTab === 'companies' && typeof renderHrCompaniesPanel === 'function') { try { panelHtml = renderHrCompaniesPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الشركات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'employees') { try { panelHtml = renderHrEmployeesPanel(emps); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الموظفون — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'org-tree') { try { panelHtml = renderHrOrgTreePanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">شجرة العمل — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'factory') { try { panelHtml = renderHrFactoryPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">المصنع — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'vehicles') { try { panelHtml = renderHrVehiclesPanel(vehs); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">السيارات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'tracking') { try { panelHtml = renderHrVehicleTrackingPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">التتبع — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'fleet-reps' && typeof renderHrSalesFleetPanel === 'function') { try { panelHtml = renderHrSalesFleetPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">أسطول المندوبين — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'attendance') { try { panelHtml = renderHrAttendancePanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الحضور — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'documents') { try { panelHtml = renderHrDocumentsPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">المستندات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'payroll') { try { panelHtml = renderHrPayrollPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الرواتب — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'alerts') { try { panelHtml = renderHrAlertsPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">التنبيهات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'leave') { try { panelHtml = renderHrLeavePanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الإجازات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'governance') { try { panelHtml = renderHrGovernancePanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الحوكمة — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'activity') { try { panelHtml = renderHrActivityPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">سجل العمليات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'travel' && typeof renderHrTravelPanel === 'function') { try { panelHtml = renderHrTravelPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">تذاكر السفر — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'deductions' && typeof renderHrDeductionsPanel === 'function') { try { panelHtml = renderHrDeductionsPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">الخصومات — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'advances' && typeof renderHrAdvancesPanel === 'function') { try { panelHtml = renderHrAdvancesPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">سلف بأقساط — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'fleet-hub' && typeof renderHrFleetHubPanel === 'function') { try { panelHtml = renderHrFleetHubPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">مركز الأسطول — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'violations' && typeof renderHrViolationsPanel === 'function') { try { panelHtml = renderHrViolationsPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">مخالفات المرور — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'saudization' && typeof renderHrSaudizationPanel === 'function') { try { panelHtml = renderHrSaudizationPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">السعودة — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'reports' && canViewHrExecutiveReports()) { try { panelHtml = renderHrReportsPanel(); } catch (e) { panelHtml = '<div class="hr-panel is-active"><p class="erp-empty">التقارير — ' + esc(e.message) + '</p></div>'; } }
        else if (hrActiveTab === 'reports') {
            hrActiveTab = 'dashboard';
            panelHtml = renderHrDashboard(onLeave, assignedVeh, pendingLeave, expiringDocs);
        }

        const scopeBanner = isStrictHrUser() && hrActiveTab !== 'dashboard' ? renderHrScopeBanner() : '';
        const govBanner = typeof renderHrDeptGovernorBanner === 'function' ? renderHrDeptGovernorBanner() : '';
        if (!panelHtml) {
            panelHtml = renderHrMinimalDashboard(scopedEmps, activeEmps, scopedVehs, pendingLeave);
        }
        content.innerHTML = govBanner + toolbar + scopeBanner + '<div class="hr-panels">' + panelHtml + '</div>';
        if (hrActiveTab === 'tracking' && typeof afterHrTrackingPanelPaint === 'function') afterHrTrackingPanelPaint();
        } catch (panelErr) {
            console.error('renderHrPlatformPanel inner', panelErr);
            content.innerHTML = '<div class="hr-panels">' + renderHrMinimalDashboard(
                applyHrScopeFilter(hrEmployees.slice(), 'employee'),
                hrEmployees.filter(function(e) { return e.status === 'active'; }).length,
                applyHrScopeFilter(hrVehicles.slice(), 'vehicle'),
                hrLeaveRequests.filter(function(l) { return l.status === 'pending'; }).length
            ) + '<p class="erp-empty"><button type="button" class="erp-tag erp-tag--action" data-hr-retry="1">إعادة التحميل</button></p></div>';
        }
    }

    function renderHrDeptGovernorBanner() {
        const scope = getHrAdminScope();
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        if (!admin) return '';
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin) && scope.mode === 'full') return '';
        return '<div class="hr-dept-governor-banner" role="status">' +
            '<i class="' + esc(scope.icon || 'fas fa-sitemap') + '"></i>' +
            '<div><strong>لوحة إدارة قسمك — ' + esc(scope.label) + '</strong>' +
            '<span>صلاحيات كاملة داخل نطاقك: شجرة العمل · موظفون · سعودة · إقامات · رواتب وبدلات · حضور · سيارات وتتبع (لوحة + جوال السائق + اللوحة). الإدارة الرئيسية فقط ترى كل الأقسام.</span></div></div>';
    }

    function renderHrDashboardAlertsBlock() {
        const alerts = collectHrAlerts().slice(0, 6);
        if (!alerts.length) return '';
        const items = alerts.map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : 'hr-alert--warn';
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span><strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p></article>';
        }).join('');
        return '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-bell"></i> تنبيهات عاجلة <button type="button" class="erp-tag erp-tag--action" onclick="switchHrTab(\'alerts\')">عرض الكل</button></h4><div class="hr-alerts-list hr-alerts-list--compact">' + items + '</div>';
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

        const multiCo = typeof renderHrMultiCompanyOverview === 'function' ? renderHrMultiCompanyOverview() : '';
        return '<div class="hr-panel is-active">' +
            multiCo +
            '<p class="hr-platform-note"><i class="fas fa-industry"></i> <strong>نبراس للأبواب WPC</strong> — موارد بشرية المصنع: إنتاج · ورديات · سعودة · حضور · رواتب. التقارير التنفيذية للإدارة الرئيسية.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + onLeave + '</strong><span>في إجازة حالياً</span></div>' +
                '<div class="hr-report-card"><strong>' + assignedVeh + '</strong><span>سيارات مُسنَدة</span></div>' +
                '<div class="hr-report-card"><strong>' + pendingLeave + '</strong><span>طلبات إجازة معلقة</span></div>' +
                '<div class="hr-report-card"><strong>' + expiringDocs + '</strong><span>تنبيهات وثائق مركبات</span></div>' +
            '</div>' +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-map-marker-alt"></i> توزيع الموظفين على الفروع</h4>' +
            '<div class="hr-report-grid">' + (branchRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            renderHrFactoryDashboardBlock() +
            '<h4 style="margin:14px 0 8px;color:#1a5276"><i class="fas fa-sitemap"></i> الأقسام</h4>' +
            '<div class="nebras-erp-list">' + (deptRows || '<p class="erp-empty">لا بيانات</p>') + '</div>' +
            renderHrDashboardAlertsBlock() +
        '</div>';
    }

    function renderHrEmployeesPanel(list) {
        let editor = '';
        if (hrEmployeeEditorId !== false) editor = renderHrEmployeeEditor(hrEmployeeEditorId);

        const cards = list.map(function(e) {
            const st = HR_EMP_STATUS[e.status] || HR_EMP_STATUS.active;
            const veh = e.vehicleId ? getVehicleById(e.vehicleId) : null;
            const initials = (e.nameAr || '?').charAt(0);
            return '<article class="hr-emp-card ' + st.cls + '">' +
                '<div class="hr-emp-card-head">' +
                    '<span class="hr-emp-avatar">' + esc(initials) + '</span>' +
                    '<div><strong>' + esc(e.nameAr) + '</strong><small>' + esc(e.employeeNo) + ' · ' + esc(e.jobTitle || '') + '</small></div>' +
                '</div>' +
                (typeof renderHrCompanyBadge === 'function' ? renderHrCompanyBadge(e.companyId) : '') +
                '<div class="hr-emp-meta">' +
                    '<span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span>' +
                    '<span class="erp-tag">' + esc(HR_EMP_TYPES[e.employmentType] || e.employmentType) + '</span>' +
                    (isEmployeeGosiDeductEnabled(e)
                        ? '<span class="hr-gosi-badge"><i class="fas fa-shield-halved"></i> GOSI</span>'
                        : '<span class="hr-gosi-badge hr-gosi-badge--exempt"><i class="fas fa-ban"></i> بدون تأمينات</span>') +
                    (e.nafathVerified ? '<span class="erp-tag erp-tag--ok"><i class="fas fa-fingerprint"></i> نفاذ</span>' : '') +
                    '<span class="erp-tag"><i class="fas fa-store"></i> ' + esc(resolveHrBranchLabel(e.branchId)) + '</span>' +
                    (e.department ? '<span class="erp-tag">' + esc(e.department) + '</span>' : '') +
                    (e.shiftId && typeof HR_SHIFTS !== 'undefined' && HR_SHIFTS[e.shiftId] ? '<span class="erp-tag"><i class="fas fa-clock"></i> ' + esc(HR_SHIFTS[e.shiftId].label) + '</span>' : '') +
                    (e.productionLine && typeof HR_PROD_LINES !== 'undefined' && HR_PROD_LINES[e.productionLine] ? '<span class="erp-tag"><i class="fas fa-layer-group"></i> ' + esc(HR_PROD_LINES[e.productionLine]) + '</span>' : '') +
                '</div>' +
                '<div class="hr-emp-contacts">' +
                    (e.phone ? '<div><i class="fas fa-mobile-screen"></i> ' + esc(e.phone) + (e.phone2 ? ' / ' + esc(e.phone2) : '') + '</div>' : '') +
                    (e.email ? '<div><i class="fas fa-envelope"></i> ' + esc(e.email) + '</div>' : '') +
                    (veh ? '<div><i class="fas fa-car"></i> ' + esc(veh.plateNo) + ' — ' + esc(veh.make) + ' ' + esc(veh.model) + '</div>' : '') +
                    (e.joinDate ? '<div><i class="fas fa-calendar"></i> منذ ' + formatHrDate(e.joinDate) + '</div>' : '') +
                    formatHrRecordEditor(e) +
                '</div>' +
                '<div class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="openHrEmployeeEditor(\'' + esc(e.id) + '\')"><i class="fas fa-pen"></i> تعديل</button>' +
                    '<button type="button" class="erp-tag" onclick="requestHrNafathVerification(\'' + esc(e.id) + '\')" title="طلب تحقق نفاذ"><i class="fas fa-fingerprint"></i> نفاذ</button>' +
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

    function branchSelectHtml(selectedId, options) {
        options = options || {};
        const scope = typeof getHrAdminScope === 'function' ? getHrAdminScope() : { mode: 'full', branchId: '' };
        let branches = getHrBranches().filter(function(b) { return b.id !== ''; });
        if (options.lockToScope && scope.branchId) {
            branches = branches.filter(function(b) { return String(b.id) === String(scope.branchId); });
        }
        const defaultId = options.lockToScope && scope.branchId ? scope.branchId : (selectedId || scope.branchId || 'hq');
        return branches.map(function(b) {
            return '<option value="' + esc(b.id) + '"' + (String(defaultId) === String(b.id) ? ' selected' : '') + '>' + esc(b.label) + '</option>';
        }).join('');
    }

    function applyHrBranchFieldLock(selectId) {
        const el = document.getElementById(selectId);
        if (!el) return;
        const scope = typeof getHrAdminScope === 'function' ? getHrAdminScope() : { mode: 'full', branchId: '' };
        const lock = scope.branchId && scope.mode !== 'full' && scope.mode !== 'company';
        if (lock) {
            el.value = scope.branchId;
            el.disabled = true;
            el.title = 'الفرع محدّد تلقائياً حسب صلاحياتك — ' + (scope.label || '');
        } else {
            el.disabled = false;
            el.removeAttribute('title');
        }
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

        const gosiDeductVal = e.gosiDeduct === false ? 'no' : 'yes';

        return '<div class="hr-editor-overlay" id="hr-emp-editor">' +
            '<h4><i class="fas fa-id-card"></i> ' + (isEdit ? 'تعديل موظف' : 'موظف / عامل جديد') + '</h4>' +
            '<div class="hr-form-sections">' +
            '<fieldset class="hr-form-section"><legend><i class="fas fa-fingerprint"></i> الهوية · الإقامة · نفاذ</legend>' +
            '<div class="erp-form-grid">' +
                (typeof renderHrCompanyFieldInForm === 'function' ? renderHrCompanyFieldInForm(e.companyId) : '') +
                '<label class="nebras-field"><span>رقم الموظف</span><input id="he-no" value="' + esc(e.employeeNo || '') + '" placeholder="NEB-100"></label>' +
                '<label class="nebras-field"><span>الاسم (عربي)</span><input id="he-name-ar" value="' + esc(e.nameAr || '') + '"></label>' +
                '<label class="nebras-field"><span>الاسم (إنجليزي)</span><input id="he-name-en" value="' + esc(e.nameEn || '') + '"></label>' +
                '<label class="nebras-field"><span>الهوية الوطنية / الإقامة</span><input id="he-national" value="' + esc(e.nationalId || e.iqamaNo || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم الحدود</span><input id="he-border" value="' + esc(e.borderNumber || '') + '" placeholder="للعمالة الجديدة"></label>' +
                '<label class="nebras-field"><span>انتهاء الإقامة</span><input type="date" id="he-iqama-expiry" value="' + esc(e.iqamaExpiry || '') + '"></label>' +
                '<label class="nebras-field"><span>الجنسية</span><input id="he-nationality" list="nebras-hr-nationalities" value="' + esc(e.nationality || 'سعودي') + '" placeholder="اختر أو اكتب الجنسية"></label>' +
                '<datalist id="nebras-hr-nationalities">' +
                    '<option value="سعودي"></option><option value="مصري"></option><option value="يمني"></option>' +
                    '<option value="سوداني"></option><option value="باكستاني"></option><option value="هندي"></option>' +
                    '<option value="بنغلاديشي"></option><option value="فلبيني"></option><option value="أردني"></option>' +
                    '<option value="سوري"></option><option value="لبناني"></option><option value="فلسطيني"></option>' +
                '</datalist>' +
                '<label class="nebras-field"><span>الفرع</span><select id="he-branch">' + branchSelectHtml(e.branchId || 'hq', { lockToScope: !isEdit }) + '</select></label>' +
                '<div class="nebras-field nebras-field--wide hr-nafath-row">' +
                    '<label class="nebras-field--inline"><input type="checkbox" id="he-nafath-verified"' + (e.nafathVerified ? ' checked' : '') + '> تم التحقق عبر نفاذ (NAFAZ)</label>' +
                    '<label class="nebras-field"><span>تاريخ التحقق</span><input type="date" id="he-nafath-date" value="' + esc(e.nafathVerifiedAt || '') + '"></label>' +
                '</div>' +
            '</div></fieldset>' +
            '<fieldset class="hr-form-section"><legend><i class="fas fa-briefcase"></i> الوظيفة والعقد</legend>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>قسم المصنع</span><select id="he-dept-key">' +
                    '<option value="">— اختر —</option>' +
                    Object.keys(typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.departmentKey || '') === k ? ' selected' : '') + '>' + (HR_FACTORY_DEPTS[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>المسمى الوظيفي</span><input id="he-job" value="' + esc(e.jobTitle || '') + '"></label>' +
                '<label class="nebras-field"><span>الوردية</span><select id="he-shift">' +
                    Object.keys(typeof HR_SHIFTS !== 'undefined' ? HR_SHIFTS : { admin: { label: 'إداري' } }).map(function(k) {
                        return '<option value="' + k + '"' + ((e.shiftId || 'admin') === k ? ' selected' : '') + '>' + ((HR_SHIFTS[k] || {}).label || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>خط الإنتاج</span><select id="he-line">' +
                    '<option value="">—</option>' +
                    Object.keys(typeof HR_PROD_LINES !== 'undefined' ? HR_PROD_LINES : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.productionLine || '') === k ? ' selected' : '') + '>' + (HR_PROD_LINES[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>المستوى</span><select id="he-skill">' +
                    Object.keys(typeof HR_SKILL_LEVELS !== 'undefined' ? HR_SKILL_LEVELS : {}).map(function(k) {
                        return '<option value="' + k + '"' + ((e.skillLevel || '') === k ? ' selected' : '') + '>' + (HR_SKILL_LEVELS[k] || k) + '</option>';
                    }).join('') +
                '</select></label>' +
                '<label class="nebras-field"><span>نهاية التجربة</span><input type="date" id="he-probation" value="' + esc(e.probationEnd || '') + '"></label>' +
                '<label class="nebras-field"><span>نوع التوظيف</span><select id="he-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="he-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>تاريخ الالتحاق</span><input type="date" id="he-join" value="' + esc(e.joinDate || '') + '"></label>' +
                '<label class="nebras-field"><span>نهاية العقد</span><input type="date" id="he-contract-end" value="' + esc(e.contractEnd || '') + '"></label>' +
            '</div></fieldset>' +
            '<fieldset class="hr-form-section"><legend><i class="fas fa-address-book"></i> التواصل</legend>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>جوال أساسي</span><input id="he-phone" value="' + esc(e.phone || '') + '" placeholder="05xxxxxxxx"></label>' +
                '<label class="nebras-field"><span>جوال إضافي</span><input id="he-phone2" value="' + esc(e.phone2 || '') + '"></label>' +
                '<label class="nebras-field"><span>البريد</span><input id="he-email" type="email" value="' + esc(e.email || '') + '"></label>' +
                '<label class="nebras-field"><span>جهة الطوارئ</span><input id="he-emg-name" value="' + esc(e.emergencyName || '') + '"></label>' +
                '<label class="nebras-field"><span>جوال الطوارئ</span><input id="he-emg-phone" value="' + esc(e.emergencyPhone || '') + '"></label>' +
            '</div></fieldset>' +
            '<fieldset class="hr-form-section"><legend><i class="fas fa-money-check-dollar"></i> الراتب · التأمينات · البنك</legend>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الراتب الأساسي</span><input type="number" id="he-salary" value="' + esc(e.salary || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بدل سكن</span><input type="number" id="he-housing" value="' + esc(e.housingAllowance || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بدل نقل</span><input type="number" id="he-transport" value="' + esc(e.transportAllowance || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>رقم اشتراك التأمينات (GOSI)</span><input id="he-gosi" value="' + esc(e.gosiNo || '') + '"></label>' +
                '<label class="nebras-field hr-gosi-toggle"><span>خصم التأمينات 9% في المسير؟</span>' +
                    '<select id="he-gosi-deduct">' +
                        '<option value="yes"' + (gosiDeductVal === 'yes' ? ' selected' : '') + '>نعم — خصم شهري</option>' +
                        '<option value="no"' + (gosiDeductVal === 'no' ? ' selected' : '') + '>لا — معفى من الخصم</option>' +
                    '</select></label>' +
                '<label class="nebras-field"><span>البنك</span><input id="he-bank" value="' + esc(e.bankName || '') + '"></label>' +
                '<label class="nebras-field"><span>IBAN</span><input id="he-iban" value="' + esc(e.iban || '') + '"></label>' +
                '<label class="nebras-field"><span>سيارة مُسنَدة</span><select id="he-vehicle">' + vehOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="he-notes" value="' + esc(e.notes || '') + '"></label>' +
            '</div></fieldset>' +
            '</div>' +
            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrEmployee(\'' + esc(id || '') + '\')"><i class="fas fa-save"></i> حفظ</button>' +
                (isEdit ? '<button type="button" class="nebras-users-btn" onclick="hrRegisterEmployeeBiometric(\'' + esc(id) + '\')"><i class="fas fa-fingerprint"></i> تسجيل بصمة</button>' +
                    (e.bioCredentialId ? '<span class="erp-tag erp-tag--ok"><i class="fas fa-check"></i> بصمة مسجّلة</span>' : '') : '') +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrEmployeeEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div>' +
        '</div>';
    }

    function openHrEmployeeEditor(id) {
        if (!requireHrAccess()) return;
        hrActiveTab = 'employees';
        hrEmployeeEditorId = id ? id : null;
        renderHrPlatformPanelSafe();
        setTimeout(function() {
            applyHrBranchFieldLock('he-branch');
            const ed = document.getElementById('hr-emp-editor');
            if (ed) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }

    function cancelHrEmployeeEditor() {
        hrEmployeeEditorId = false;
        renderHrPlatformPanelSafe();
    }

    function saveHrEmployee(id) {
        if (!requireHrAccess()) return;
        if (id) {
            const existing = getEmployeeById(id);
            if (existing && typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(existing, 'employee')) return;
        }
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
            iqamaNo: hrField('he-national'),
            iqamaExpiry: hrField('he-iqama-expiry'),
            borderNumber: hrField('he-border'),
            nafathVerified: !!(document.getElementById('he-nafath-verified') && document.getElementById('he-nafath-verified').checked),
            nafathVerifiedAt: hrField('he-nafath-date'),
            nationality: hrField('he-nationality'),
            companyId: (typeof resolveHrCompanyFromCombo === 'function' && document.getElementById('he-company-display'))
                ? resolveHrCompanyFromCombo('he-company-display', 'he-company')
                : ((document.getElementById('he-company') ? hrField('he-company') : '') || (typeof getHrCompanyIdForNewRecord === 'function' ? getHrCompanyIdForNewRecord() : 'comp-nebras')),
            branchId: hrField('he-branch') || getHrAdminScope().branchId || 'hq',
            departmentKey: hrField('he-dept-key'),
            department: (typeof HR_FACTORY_DEPTS !== 'undefined' && HR_FACTORY_DEPTS[hrField('he-dept-key')]) ? HR_FACTORY_DEPTS[hrField('he-dept-key')] : hrField('he-dept-key'),
            jobTitle: hrField('he-job'),
            shiftId: hrField('he-shift') || 'admin',
            productionLine: hrField('he-line') || '',
            skillLevel: hrField('he-skill') || 'operator',
            probationEnd: hrField('he-probation'),
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
            gosiDeduct: hrField('he-gosi-deduct') !== 'no',
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
                record.createdBy = hrEmployees[idx].createdBy || '';
                record.createdByUsername = hrEmployees[idx].createdByUsername || '';
                record.bioCredentialId = hrEmployees[idx].bioCredentialId || '';
                record.bioRegisteredAt = hrEmployees[idx].bioRegisteredAt || '';
                stampHrRecord(record, false);
                hrEmployees[idx] = record;
            }
        } else {
            if (typeof assertHrNewRecordInScope === 'function' && !assertHrNewRecordInScope(record)) return;
            stampHrRecord(record, true);
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
        hrEmployeeEditorId = false;
        hrAudit('HR موظف', (id ? 'تعديل ' : 'إضافة ') + nameAr);
        renderHrPlatformPanelSafe();
    }

    function deleteHrEmployee(id) {
        if (!requireHrAccess()) return;
        const e = getEmployeeById(id);
        if (!e || !confirm('حذف ' + e.nameAr + ' من سجلات HR؟')) return;
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(e, 'employee')) return;
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
        if (hrVehicleEditorId !== false) editor = renderHrVehicleEditor(hrVehicleEditorId);

        const cards = list.map(function(v) {
            const st = HR_VEH_STATUS[v.status] || HR_VEH_STATUS.active;
            const emp = v.assignedEmployeeId ? getEmployeeById(v.assignedEmployeeId) : null;
            return '<article class="hr-vehicle-card">' +
                (typeof renderHrCompanyBadge === 'function' ? renderHrCompanyBadge(v.companyId) : '') +
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
                (typeof renderHrCompanyFieldInVehicleForm === 'function' ? renderHrCompanyFieldInVehicleForm(v.companyId) : '') +
                '<label class="nebras-field"><span>رقم اللوحة</span><input id="hv-plate" value="' + esc(v.plateNo || '') + '"></label>' +
                '<label class="nebras-field"><span>الشركة المصنعة</span><input id="hv-make" value="' + esc(v.make || '') + '"></label>' +
                '<label class="nebras-field"><span>الموديل</span><input id="hv-model" value="' + esc(v.model || '') + '"></label>' +
                '<label class="nebras-field"><span>سنة الصنع</span><input id="hv-year" value="' + esc(v.year || '') + '"></label>' +
                '<label class="nebras-field"><span>اللون</span><input id="hv-color" value="' + esc(v.color || '') + '"></label>' +
                '<label class="nebras-field"><span>النوع</span><select id="hv-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>الفرع</span><select id="hv-branch">' + branchSelectHtml(v.branchId || 'hq', { lockToScope: !isEdit }) + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="hv-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field"><span>الموظف المُسنَد</span><select id="hv-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>انتهاء التأمين</span><input type="date" id="hv-insurance" value="' + esc(v.insuranceExp || '') + '"></label>' +
                '<label class="nebras-field"><span>انتهاء الفحص</span><input type="date" id="hv-inspection" value="' + esc(v.inspectionExp || '') + '"></label>' +
                '<label class="nebras-field"><span>انتهاء الاستمارة</span><input type="date" id="hv-registration" value="' + esc(v.registrationExp || '') + '"></label>' +
                '<label class="nebras-field"><span>عداد الكيلومترات</span><input type="number" id="hv-mileage" value="' + esc(v.mileage || '') + '" min="0"></label>' +
                '<label class="nebras-field"><span>بطاقة وقود</span><input id="hv-fuel" value="' + esc(v.fuelCard || '') + '"></label>' +
                '<label class="nebras-field"><span>شريحة / جوال المركبة</span><input id="hv-phone" value="' + esc(v.phone || '') + '"></label>' +
                '<label class="nebras-field"><span>رقم جهاز GPS (IMEI)</span><input id="hv-gps" value="' + esc(v.gpsTracker || '') + '" placeholder="867530012345678 — إلزامي للتتبع الحي"></label>' +
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
        hrActiveTab = 'vehicles';
        hrVehicleEditorId = id ? id : null;
        renderHrPlatformPanelSafe();
        setTimeout(function() {
            applyHrBranchFieldLock('hv-branch');
            const ed = document.getElementById('hr-veh-editor');
            if (ed) ed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }

    function cancelHrVehicleEditor() {
        hrVehicleEditorId = false;
        renderHrPlatformPanelSafe();
    }

    function saveHrVehicle(id) {
        if (!requireHrAccess()) return;
        if (id) {
            const existing = getVehicleById(id);
            if (existing && typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(existing, 'vehicle')) return;
        }
        const plate = hrField('hv-plate');
        if (!plate) { alert('رقم اللوحة مطلوب.'); return; }
        const scope = typeof getHrAdminScope === 'function' ? getHrAdminScope() : { branchId: '' };

        const record = {
            id: id || ('veh-' + Date.now()),
            plateNo: plate,
            companyId: (typeof resolveHrCompanyFromCombo === 'function' && document.getElementById('hv-company-display'))
                ? resolveHrCompanyFromCombo('hv-company-display', 'hv-company')
                : ((document.getElementById('hv-company') ? hrField('hv-company') : '') || (typeof getHrCompanyIdForNewRecord === 'function' ? getHrCompanyIdForNewRecord() : 'comp-nebras')),
            make: hrField('hv-make'),
            model: hrField('hv-model'),
            year: hrField('hv-year'),
            color: hrField('hv-color'),
            type: hrField('hv-type') || 'car',
            branchId: hrField('hv-branch') || scope.branchId || 'hq',
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

        if (!id && typeof assertHrNewRecordInScope === 'function' && !assertHrNewRecordInScope(record)) return;
        if (id && typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(record, 'vehicle')) return;

        if (id) {
            const idx = hrVehicles.findIndex(function(v) { return v.id === id; });
            if (idx >= 0) {
                record.createdAt = hrVehicles[idx].createdAt || record.createdAt;
                record.createdByUsername = hrVehicles[idx].createdByUsername || record.createdByUsername;
                stampHrRecord(record, false);
                hrVehicles[idx] = record;
            }
        } else {
            stampHrRecord(record, true);
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
        hrVehicleEditorId = false;
        hrAudit('HR سيارة', (id ? 'تعديل ' : 'إضافة ') + plate);
        renderHrPlatformPanelSafe();
    }

    function deleteHrVehicle(id) {
        if (!requireHrAccess()) return;
        const v = getVehicleById(id);
        if (!v || !confirm('حذف المركبة ' + v.plateNo + '؟')) return;
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(v, 'vehicle')) return;
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

        const rows = applyHrScopeFilter(hrLeaveRequests.slice(), 'leave').map(function(l) {
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

        const leaveRec = stampHrRecord({
            id: 'lv-' + Date.now(),
            employeeId: empId,
            employeeName: emp.nameAr,
            type: hrField('hl-type') || 'annual',
            startDate: start,
            endDate: end,
            days: days,
            status: 'pending',
            note: hrField('hl-note')
        }, true);
        hrLeaveRequests.unshift(leaveRec);
        saveHrData();
        hrAudit('HR إجازة', 'طلب ' + emp.nameAr);
        renderHrPlatformPanel();
    }

    function setHrLeaveStatus(id, status) {
        if (!requireHrAccess()) return;
        const l = hrLeaveRequests.find(function(x) { return x.id === id; });
        if (!l) return;
        l.status = status;
        stampHrRecord(l, false);
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
        let list = applyHrScopeFilter(hrVehicleTracking.slice(), 'tracking');
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
            const trip = v.currentTrackingId ? hrVehicleTracking.find(function(t) { return t.id === v.currentTrackingId; }) : null;
            const pos = typeof getLatestGpsForVehicle === 'function' ? getLatestGpsForVehicle(v.id, v.currentTrackingId) : null;
            const mapHref = pos
                ? ('https://www.google.com/maps?q=' + encodeURIComponent(pos.lat + ',' + pos.lng))
                : '';
            const gpsMeta = pos
                ? ('<span class="erp-tag erp-tag--ok"><i class="fas fa-satellite-dish"></i> GPS حي — ' + (typeof formatGpsAge === 'function' ? formatGpsAge(pos.recordedAt) : '') + '</span>')
                : (v.gpsTracker ? '<span class="erp-tag">IMEI: ' + esc(v.gpsTracker) + ' — بانتظار إشارة</span>' : '<span class="erp-tag erp-tag--danger">لا جهاز GPS — أضيفي IMEI في سجل السيارة</span>');
            return '<article class="hr-tracking-active-card">' +
                '<div class="plate-badge">' + esc(v.plateNo) + '</div>' +
                '<strong><i class="fas fa-user"></i> ' + esc(v.currentDriverName) + '</strong>' +
                '<small>رقم السائق: ' + esc(v.currentDriverEmployeeNo || '—') + ' · جوال: ' + esc(v.currentDriverPhone || '—') + '</small>' +
                '<div class="hr-gps-card-meta">' + gpsMeta + '</div>' +
                (mapHref ? '<a class="hr-gps-link" target="_blank" rel="noopener" href="' + mapHref + '"><i class="fas fa-location-crosshairs"></i> موقع GPS موثّق</a>' : '') +
                (trip && trip.gpsShareToken ? '<button type="button" class="erp-tag erp-tag--action" onclick="copyDriverGpsLink(\'' + esc(trip.gpsShareToken) + '\')"><i class="fas fa-mobile-screen"></i> رابط جوال السائق</button>' : '') +
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
                '<td>' + esc(t.driverPhone || '—') +
                    (t.driverPhone ? ' <a class="hr-gps-link" href="tel:' + esc(String(t.driverPhone).replace(/\s/g, '')) + '" title="اتصال السائق"><i class="fas fa-phone"></i></a>' : '') +
                '</td>' +
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

        const gpsLive = typeof renderHrGpsLiveSection === 'function' ? renderHrGpsLiveSection() : '';

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-shield-halved"></i> <strong>حوكمة تتبع السيارات:</strong> السائق ليس ثابتاً — سجّلي رقم اللوحة ورقم السائق وبياناته، وعدّلي أو بدّلي السائق في أي وقت. كل تعديل يُسجَّل في سجل العمليات.</p>' +
            gpsLive +
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

        if (typeof ensureTrackingGpsToken === 'function') ensureTrackingGpsToken(record);
        stampHrRecord(record, true);
        hrVehicleTracking.unshift(record);
        saveHrData();
        syncVehicleCurrentDriversFromTracking();
        hrAudit('HR تتبع سيارة', 'خروج ' + plate + ' — سائق ' + record.driverName);
        if (record.gpsShareToken && typeof buildDriverGpsShareUrl === 'function') {
            hrAudit('HR رابط GPS سائق', plate + ' — ' + buildDriverGpsShareUrl(record.gpsShareToken));
        }
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
        if (typeof requireHrRecordInScope === 'function' && !requireHrRecordInScope(t, 'tracking')) return;
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
            return '<tr><td>' + esc(t.plateNo) + '</td><td>' + esc(t.driverName) + '</td><td>' + (t.driverPhone ? '<a href="tel:' + esc(t.driverPhone) + '">' + esc(t.driverPhone) + '</a>' : '—') + '</td><td>' + esc(t.driverEmployeeNo || '') + '</td><td>' + formatHrDate(t.assignedDate) + '</td><td>' + esc((HR_TRACK_STATUS[t.status] || {}).label || t.status) + '</td></tr>';
        }).join('');

        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-crown"></i> <strong>تقرير تنفيذي — الإدارة الرئيسية فقط:</strong> موظفون · رواتب تقديرية · تتبع السيارات. لا يظهر لموظف HR.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + hrEmployees.length + '</strong><span>موظف / عامل</span></div>' +
                '<div class="hr-report-card"><strong>' + hrAttendance.length + '</strong><span>سجلات حضور</span></div>' +
                '<div class="hr-report-card"><strong>' + hrDocuments.length + '</strong><span>مستندات</span></div>' +
                '<div class="hr-report-card"><strong>' + hrVehicles.length + '</strong><span>سيارات</span></div>' +
                '<div class="hr-report-card"><strong>' + onRoad + '</strong><span>خارجة الآن</span></div>' +
                '<div class="hr-report-card"><strong>' + collectHrAlerts().filter(function(a) { return a.level !== 'info'; }).length + '</strong><span>تنبيهات</span></div>' +
            '</div>' +
            '<div class="erp-form-actions" style="margin-bottom:12px">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="exportHrReportCsv()"><i class="fas fa-file-csv"></i> تصدير موظفين CSV</button>' +
                '<button type="button" class="nebras-users-btn" onclick="exportHrTrackingCsv()"><i class="fas fa-file-csv"></i> تصدير تتبع CSV</button>' +
                '<button type="button" class="nebras-users-btn" onclick="switchHrTab(\'payroll\');setTimeout(function(){exportHrPayrollPdf();},400)"><i class="fas fa-file-pdf"></i> PDF مسير الرواتب</button>' +
                '<button type="button" class="nebras-users-btn" onclick="printHrReport()"><i class="fas fa-print"></i> طباعة</button>' +
                '<button type="button" class="nebras-users-btn analytics-period-btn" onclick="purgeHrAnalyticsByPeriod(\'daily\')"><i class="fas fa-sun"></i> حذف حضور — اليوم</button>' +
                '<button type="button" class="nebras-users-btn analytics-period-btn" onclick="purgeHrAnalyticsByPeriod(\'monthly\')"><i class="fas fa-calendar"></i> حذف حضور — الشهر</button>' +
            '</div>' +
            '<div class="hr-leave-table-wrap" id="hr-report-print-area">' +
                '<h4>توزيع القوى العاملة</h4>' +
                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>الفرع</th><th>عدد الموظفين</th><th>نشطون</th><th>تكلفة رواتب تقديرية</th>' +
                '</tr></thead><tbody>' + (rows || '<tr><td colspan="4">لا بيانات</td></tr>') + '</tbody></table>' +
                '<h4 style="margin-top:16px">آخر سجلات تتبع السيارات</h4>' +
                '<table class="hr-leave-table"><thead><tr>' +
                    '<th>اللوحة</th><th>السائق</th><th>جوال السائق</th><th>رقم السائق</th><th>التاريخ</th><th>الحالة</th>' +
                '</tr></thead><tbody>' + (trackRows || '<tr><td colspan="6">لا سجلات</td></tr>') + '</tbody></table>' +
                (function() {
                    const period = typeof executiveReportPeriod !== 'undefined' ? executiveReportPeriod : 'monthly';
                    const matrix = typeof buildHrDeptGovernanceMatrix === 'function' ? buildHrDeptGovernanceMatrix(period, '') : [];
                    const govRows = matrix.map(function(r) {
                        return '<tr><td>' + esc(r.cells[0]) + '</td><td>' + esc(r.cells[1]) + '</td><td>' + esc(r.cells[2]) + '</td><td>' + esc(r.cells[3]) + '</td></tr>';
                    }).join('');
                    const acts = (typeof getHrDeptActivity === 'function' ? getHrDeptActivity() : []).slice(0, 20).map(function(a) {
                        return '<tr><td>' + formatHrDate(a.date) + ' ' + esc(a.time || '') + '</td><td>' + esc(a.username || '') + '</td>' +
                            '<td>' + esc(a.scopeLabel || '') + '</td><td>' + esc(a.action) + ' — ' + esc(a.detail) + '</td></tr>';
                    }).join('');
                    return '<h4 style="margin-top:16px">حوكمة HR — الأقسام × الفروع (يومي/شهري في التقارير التنفيذية)</h4>' +
                        '<table class="hr-leave-table"><thead><tr><th>قسم HR</th><th>الفرع</th><th>القوى العاملة</th><th>مؤشرات</th></tr></thead><tbody>' +
                        (govRows || '<tr><td colspan="4">لا بيانات</td></tr>') + '</tbody></table>' +
                        '<h4 style="margin-top:16px">سجل عمليات مسؤولي HR</h4>' +
                        '<table class="hr-leave-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>النطاق</th><th>العملية</th></tr></thead><tbody>' +
                        (acts || '<tr><td colspan="4">لا عمليات</td></tr>') + '</tbody></table>';
                })() +
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

/* PHASE12_INJECTED */
/* Phase 12 HR panels — injected into nebras-hr-platform.js */

    const HR_ATT_STATUS = {
        present: { label: 'حاضر', tag: 'erp-tag--ok' },
        late: { label: 'متأخر', tag: '' },
        absent: { label: 'غائب', tag: 'erp-tag--danger' },
        half: { label: 'نصف يوم', tag: '' },
        on_leave: { label: 'إجازة', tag: '' }
    };

    const HR_DOC_TYPES = {
        iqama: 'إقامة / هوية',
        contract: 'عقد عمل',
        insurance: 'تأمين طبي',
        license: 'رخصة قيادة',
        passport: 'جواز سفر',
        gosi: 'تأمينات GOSI',
        other: 'أخرى'
    };

    function loadHrPhase12Arrays() {
        try {
            const a = localStorage.getItem(HR_ATT_KEY);
            hrAttendance = a ? JSON.parse(a) : [];
            if (!Array.isArray(hrAttendance)) hrAttendance = [];
        } catch (e) { hrAttendance = []; }
        try {
            const d = localStorage.getItem(HR_DOC_KEY);
            hrDocuments = d ? JSON.parse(d) : [];
            if (!Array.isArray(hrDocuments)) hrDocuments = [];
        } catch (e) { hrDocuments = []; }
        try {
            const p = localStorage.getItem(HR_PAYROLL_KEY);
            hrPayrollRuns = p ? JSON.parse(p) : [];
            if (!Array.isArray(hrPayrollRuns)) hrPayrollRuns = [];
        } catch (e) { hrPayrollRuns = []; }
    }

    function saveHrPhase12Arrays() {
        try {
            localStorage.setItem(HR_ATT_KEY, JSON.stringify(hrAttendance));
            localStorage.setItem(HR_DOC_KEY, JSON.stringify(hrDocuments));
            localStorage.setItem(HR_PAYROLL_KEY, JSON.stringify(hrPayrollRuns));
        } catch (e) { console.warn('HR phase12 save', e); }
    }

    function setHrAttendanceFromCloud(v) {
        hrAttendance = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_ATT_KEY, JSON.stringify(hrAttendance)); } catch (e) { /* ignore */ }
    }

    function setHrDocumentsFromCloud(v) {
        hrDocuments = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_DOC_KEY, JSON.stringify(hrDocuments)); } catch (e) { /* ignore */ }
    }

    function setHrPayrollFromCloud(v) {
        hrPayrollRuns = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_PAYROLL_KEY, JSON.stringify(hrPayrollRuns)); } catch (e) { /* ignore */ }
    }

    function ensureBuiltinHrPhase12Seed() {
        if (typeof global.NEBRAS_PRODUCTION_LIVE_MODE !== 'undefined' && global.NEBRAS_PRODUCTION_LIVE_MODE) return;
        const today = new Date().toISOString().slice(0, 10);
        const month = today.slice(0, 7);
        if (!hrAttendance.length) {
            hrAttendance = [
                { id: 'att-001', employeeId: 'emp-hq-001', employeeNo: 'NEB-001', employeeName: 'أحمد محمد العتيبي', branchId: 'hq', date: today, checkIn: '07:45', checkOut: '16:30', hours: 8.75, status: 'present', note: '', createdAt: today },
                { id: 'att-002', employeeId: 'emp-riy-002', employeeNo: 'NEB-002', employeeName: 'خالد سعد القحطاني', branchId: '2', date: today, checkIn: '08:20', checkOut: '17:00', hours: 8.67, status: 'late', note: 'تأخر 20 دقيقة', createdAt: today },
                { id: 'att-003', employeeId: 'emp-jed-003', employeeNo: 'NEB-003', employeeName: 'محمد علي الزهراني', branchId: '3', date: today, checkIn: '', checkOut: '', hours: 0, status: 'on_leave', note: 'إجازة معلقة', createdAt: today }
            ];
        }
        if (!hrDocuments.length) {
            const nextYear = String(new Date().getFullYear() + 1);
            hrDocuments = [
                { id: 'doc-001', employeeId: 'emp-hq-001', employeeNo: 'NEB-001', employeeName: 'أحمد محمد العتيبي', branchId: 'hq', type: 'iqama', title: 'إقامة — أحمد', docNo: 'IQ-1001', issueDate: '2024-01-01', expiryDate: nextYear + '-12-31', notes: 'ساري', createdAt: today },
                { id: 'doc-002', employeeId: 'emp-riy-002', employeeNo: 'NEB-002', employeeName: 'خالد سعد القحطاني', branchId: '2', type: 'contract', title: 'عقد عمل', docNo: 'CTR-2020-02', issueDate: '2020-06-15', expiryDate: '2027-06-14', notes: '', createdAt: today },
                { id: 'doc-003', employeeId: 'emp-hq-004', employeeNo: 'NEB-004', employeeName: 'عبدالله حسن', branchId: 'hq', type: 'iqama', title: 'إقامة عامل', docNo: 'IQ-2004', issueDate: '2023-05-01', expiryDate: '2026-08-15', notes: 'تنبيه قريب', createdAt: today },
                { id: 'doc-004', employeeId: 'emp-hq-001', employeeNo: 'NEB-001', employeeName: 'أحمد محمد العتيبي', branchId: 'hq', type: 'insurance', title: 'تأمين طبي', docNo: 'INS-001', issueDate: '2025-01-01', expiryDate: '2026-12-31', notes: '', createdAt: today }
            ];
        }
        if (!hrPayrollRuns.length) {
            hrPayrollRuns = [{
                id: 'pay-' + month, month: month, branchId: '', status: 'draft',
                items: [], createdAt: today, note: 'مسودة تلقائية'
            }];
        }
        if (!hrPayrollMonth) hrPayrollMonth = month;
    }

    function calcAttHours(checkIn, checkOut, stdHours) {
        if (!checkIn || !checkOut) return 0;
        const p = function(t) {
            const parts = String(t).split(':');
            return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
        };
        return Math.max(0, Math.round((p(checkOut) - p(checkIn)) * 100) / 100);
    }

    function enrichAttendanceRecord(rec) {
        if (!rec) return rec;
        const emp = getEmployeeById(rec.employeeId);
        const sh = emp && emp.shiftId && typeof HR_SHIFTS !== 'undefined' ? HR_SHIFTS[emp.shiftId] : null;
        const std = sh ? sh.stdHours : 8;
        if (rec.hours > 0) rec.overtimeHours = calcOvertimeHours(rec.hours, std);
        return rec;
    }

    function filterHrAttendance() {
        let list = applyHrScopeFilter(hrAttendance.slice(), 'attendance');
        if (hrBranchFilter) list = list.filter(function(a) { return String(a.branchId) === String(hrBranchFilter); });
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(a) {
                return (a.employeeName + ' ' + a.employeeNo + ' ' + a.date).toLowerCase().indexOf(q) >= 0;
            });
        }
        return list.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
    }

    function filterHrDocuments() {
        let list = applyHrScopeFilter(hrDocuments.slice(), 'document');
        if (hrBranchFilter) list = list.filter(function(d) { return String(d.branchId) === String(hrBranchFilter); });
        if (hrSearchQuery) {
            const q = hrSearchQuery.toLowerCase();
            list = list.filter(function(d) {
                return (d.employeeName + ' ' + d.title + ' ' + d.docNo).toLowerCase().indexOf(q) >= 0;
            });
        }
        return list;
    }

    function getHrPayrollMonth() {
        if (!hrPayrollMonth) hrPayrollMonth = new Date().toISOString().slice(0, 7);
        return hrPayrollMonth;
    }

    function isEmployeeGosiDeductEnabled(emp) {
        if (!emp) return false;
        if (emp.gosiDeduct === false) return false;
        return true;
    }

    function buildPayrollItemsForMonth(month, branchId) {
        if (typeof loadHcmSuiteData === 'function') loadHcmSuiteData();
        let emps = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status === 'active' || e.status === 'on_leave'; }), 'employee');
        if (branchId) emps = emps.filter(function(e) { return String(e.branchId) === String(branchId); });
        return emps.map(function(e) {
            const base = hrNum(e.salary);
            const housing = hrNum(e.housingAllowance);
            const transport = hrNum(e.transportAllowance);
            const gross = base + housing + transport;
            const gosiEnabled = isEmployeeGosiDeductEnabled(e);
            const gosiDed = gosiEnabled ? Math.round(base * 0.09 * 100) / 100 : 0;
            const extras = (typeof computeHrPayrollExtras === 'function') ? computeHrPayrollExtras(e.id, month) : { dynamicDed: 0, dedLines: [] };
            const dynamicDed = hrNum(extras.dynamicDed);
            const totalDed = Math.round((gosiDed + dynamicDed) * 100) / 100;
            const net = Math.max(0, gross - totalDed);
            return {
                employeeId: e.id, employeeNo: e.employeeNo, employeeName: e.nameAr,
                branchId: e.branchId, department: e.department || '', jobTitle: e.jobTitle || '',
                base: base, housing: housing, transport: transport, gross: gross,
                gosiEnabled: gosiEnabled, gosiDed: gosiDed, dynamicDed: dynamicDed, deductions: totalDed, dedLines: extras.dedLines || [], net: net
            };
        });
    }

    function renderHrAttendancePanel() {
        const today = new Date().toISOString().slice(0, 10);
        const empOpts = hrEmployees.map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const statusOpts = Object.keys(HR_ATT_STATUS).map(function(k) {
            return '<option value="' + k + '">' + HR_ATT_STATUS[k].label + '</option>';
        }).join('');
        const methodOpts = Object.keys(HR_ATT_METHOD).map(function(k) {
            return '<option value="' + k + '">' + HR_ATT_METHOD[k] + '</option>';
        }).join('');
        const quickCards = hrEmployees.filter(function(e) { return e.status === 'active'; }).slice(0, 12).map(function(e) {
            const att = findTodayAttendance(e.id);
            return '<article class="hr-att-quick-card">' +
                '<strong>' + esc(e.nameAr) + '</strong><small>' + esc(e.employeeNo) + '</small>' +
                '<div class="hr-emp-actions">' +
                    '<button type="button" class="erp-tag erp-tag--ok" onclick="hrQuickCheckIn(\'' + esc(e.id) + '\',\'manual\')"><i class="fas fa-right-to-bracket"></i> دخول</button>' +
                    '<button type="button" class="erp-tag" onclick="hrQuickCheckOut(\'' + esc(e.id) + '\')"><i class="fas fa-right-from-bracket"></i> خروج</button>' +
                '</div>' +
                (att && att.checkIn ? '<small>اليوم: ' + esc(att.checkIn) + (att.checkOut ? ' → ' + esc(att.checkOut) : '') + '</small>' : '') +
            '</article>';
        }).join('');
        const rows = filterHrAttendance().map(function(a) {
            const st = HR_ATT_STATUS[a.status] || HR_ATT_STATUS.present;
            const meth = HR_ATT_METHOD[a.checkInMethod] || a.checkInMethod || '—';
            return '<tr><td>' + formatHrDate(a.date) + '</td><td>' + esc(a.employeeNo) + '<br><small>' + esc(a.employeeName) + '</small></td>' +
                '<td>' + esc(a.checkIn || '—') + '</td><td>' + esc(a.checkOut || '—') + '</td><td>' + esc(String(a.hours || 0)) + '</td>' +
                '<td><span class="erp-tag">' + esc(meth) + '</span></td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td><button type="button" class="erp-tag" onclick="deleteHrAttendance(\'' + esc(a.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-fingerprint"></i> حضور وانصراف — يدوي · جوال/GPS · بصمة. استخدمي «حضور جوال» لتسجيل برقم الموظف.</p>' +
            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="hrMobileCheckInPrompt()"><i class="fas fa-mobile-screen"></i> حضور جوال (GPS)</button>' +
                '<button type="button" class="nebras-users-btn" onclick="hrBiometricCheckInPrompt()"><i class="fas fa-fingerprint"></i> حضور بصمة</button>' +
            '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-bolt"></i> دخول / خروج سريع — اليوم</h4>' +
            '<div class="hr-att-quick-grid">' + (quickCards || '<p class="erp-empty">لا موظفين نشطين</p>') + '</div>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-plus"></i> تسجيل حضور يدوي</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="ha-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>التاريخ</span><input type="date" id="ha-date" value="' + today + '"></label>' +
                '<label class="nebras-field"><span>دخول</span><input type="time" id="ha-in" value="08:00"></label>' +
                '<label class="nebras-field"><span>خروج</span><input type="time" id="ha-out"></label>' +
                '<label class="nebras-field"><span>طريقة التسجيل</span><select id="ha-method">' + methodOpts + '</select></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="ha-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظة</span><input id="ha-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addHrAttendance()"><i class="fas fa-save"></i> حفظ</button></div></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>دخول</th><th>خروج</th><th>ساعات</th><th>الطريقة</th><th>الحالة</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="8" class="erp-empty">لا سجلات حضور</td></tr>') + '</tbody></table></div></div>';
    }

    function addHrAttendance() {
        if (!requireHrOps()) return;
        const empId = hrField('ha-employee');
        const emp = getEmployeeById(empId);
        if (!emp) { alert('اختر موظفاً.'); return; }
        const checkIn = hrField('ha-in');
        const checkOut = hrField('ha-out');
        const date = hrField('ha-date') || new Date().toISOString().slice(0, 10);
        const rec = {
            id: 'att-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
            branchId: emp.branchId || 'hq', date: date, checkIn: checkIn, checkOut: checkOut,
            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            checkInMethod: hrField('ha-method') || 'manual', geoNote: '',
            note: hrField('ha-note'), createdAt: date
        };
        enrichAttendanceRecord(rec);
        hrAttendance.unshift(rec);
        saveHrData();
        hrAudit('HR حضور', emp.nameAr + ' — ' + date);
        renderHrPlatformPanel();
    }

    function deleteHrAttendance(id) {
        if (!requireHrOps()) return;
        hrAttendance = hrAttendance.filter(function(x) { return x.id !== id; });
        saveHrData();
        renderHrPlatformPanel();
    }

    function renderHrDocumentsPanel() {
        let editor = hrDocEditorId !== null ? renderHrDocEditor(hrDocEditorId) : '';
        const typeOpts = Object.keys(HR_DOC_TYPES).map(function(k) {
            return '<option value="' + k + '">' + HR_DOC_TYPES[k] + '</option>';
        }).join('');
        const empOpts = hrEmployees.map(function(e) {
            return '<option value="' + esc(e.id) + '">' + esc(e.employeeNo + ' — ' + e.nameAr) + '</option>';
        }).join('');
        const rows = filterHrDocuments().map(function(d) {
            const exp = expBadge(d.expiryDate);
            return '<tr><td>' + esc(HR_DOC_TYPES[d.type] || d.type) + '</td><td>' + esc(d.employeeName) + '<br><small>' + esc(d.employeeNo) + '</small></td>' +
                '<td>' + esc(d.docNo || '—') + '</td><td>' + formatHrDate(d.expiryDate) + ' ' + exp + '</td>' +
                '<td>' + (d.attachmentName || d.attachmentCloudUrl ? '<button type="button" class="erp-tag erp-tag--ok" onclick="viewHrDocumentAttachment(\'' + esc(d.id) + '\')" title="' + esc(d.attachmentCloudUrl ? 'سحابة' : 'محلي') + '"><i class="fas fa-paperclip"></i>' + (d.attachmentCloudUrl ? ' ☁' : '') + '</button> ' : '') +
                '<button type="button" class="erp-tag erp-tag--action" onclick="openHrDocEditor(\'' + esc(d.id) + '\')"><i class="fas fa-pen"></i></button> ' +
                (canViewHrExecutiveReports() ? '<button type="button" class="erp-tag" onclick="sendHrDocumentReminder(\'' + esc(d.id) + '\')"><i class="fas fa-envelope"></i></button> ' : '') +
                '<button type="button" class="erp-tag" onclick="deleteHrDocument(\'' + esc(d.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        const quickForm = hrDocEditorId === null
            ? '<div class="hr-editor-overlay"><h4><i class="fas fa-file-circle-plus"></i> مستند جديد</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="hd-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>نوع المستند</span><select id="hd-type">' + typeOpts + '</select></label>' +
                '<label class="nebras-field"><span>العنوان</span><input id="hd-title" placeholder="إقامة · عقد · تأمين"></label>' +
                '<label class="nebras-field"><span>رقم الوثيقة</span><input id="hd-no"></label>' +
                '<label class="nebras-field"><span>تاريخ الإصدار</span><input type="date" id="hd-issue"></label>' +
                '<label class="nebras-field"><span>تاريخ الانتهاء</span><input type="date" id="hd-expiry"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hd-notes"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفق (PDF/صورة)</span><input type="file" accept="image/*,application/pdf" onchange="hrReadDocAttachment(this,\'new\')"><small id="hd-attach-hint" class="hr-attach-hint">حتى ~450 كيلوبايت</small></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDocumentQuick()"><i class="fas fa-plus"></i> إضافة</button></div></div>'
            : '';
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-folder-open"></i> مستندات الموظفين — إقامة · عقود · تأمين · رخص — مع تنبيهات الانتهاء.</p>' +
            quickForm + editor +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>النوع</th><th>الموظف</th><th>رقم الوثيقة</th><th>الانتهاء</th><th>مرفق · إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="erp-empty">لا مستندات</td></tr>') + '</tbody></table></div></div>';
    }

    function renderHrDocEditor(id) {
        const d = hrDocuments.find(function(x) { return x.id === id; }) || {};
        const typeOpts = Object.keys(HR_DOC_TYPES).map(function(k) {
            return '<option value="' + k + '"' + (d.type === k ? ' selected' : '') + '>' + HR_DOC_TYPES[k] + '</option>';
        }).join('');
        return '<div class="hr-editor-overlay" id="hr-doc-editor"><h4><i class="fas fa-pen"></i> تعديل مستند</h4><div class="erp-form-grid">' +
            '<label class="nebras-field"><span>نوع المستند</span><select id="hde-type">' + typeOpts + '</select></label>' +
            '<label class="nebras-field"><span>العنوان</span><input id="hde-title" value="' + esc(d.title || '') + '"></label>' +
            '<label class="nebras-field"><span>رقم الوثيقة</span><input id="hde-no" value="' + esc(d.docNo || '') + '"></label>' +
            '<label class="nebras-field"><span>تاريخ الإصدار</span><input type="date" id="hde-issue" value="' + esc(d.issueDate || '') + '"></label>' +
            '<label class="nebras-field"><span>تاريخ الانتهاء</span><input type="date" id="hde-expiry" value="' + esc(d.expiryDate || '') + '"></label>' +
            '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hde-notes" value="' + esc(d.notes || '') + '"></label>' +
            '<label class="nebras-field nebras-field--wide"><span>مرفق جديد</span><input type="file" accept="image/*,application/pdf" onchange="hrReadDocAttachment(this,\'edit\')"><small id="hde-attach-hint" class="hr-attach-hint">' + (d.attachmentName ? esc(d.attachmentName) : 'اختياري') + '</small></label>' +
        '</div><div class="erp-form-actions">' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDocumentEdit(\'' + esc(id) + '\')"><i class="fas fa-save"></i> حفظ</button>' +
            '<button type="button" class="nebras-users-btn" onclick="cancelHrDocEditor()"><i class="fas fa-xmark"></i> إلغاء</button></div></div>';
    }

    function openHrDocEditor(id) { if (!requireHrOps()) return; hrDocEditorId = id; renderHrPlatformPanel(); }
    function cancelHrDocEditor() { hrDocEditorId = null; renderHrPlatformPanel(); }

    function saveHrDocumentQuick() {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(hrField('hd-employee'));
        if (!emp) { alert('اختر موظفاً.'); return; }
        const today = new Date().toISOString().slice(0, 10);
        hrDocuments.unshift({
            id: 'doc-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
            branchId: emp.branchId || 'hq', type: hrField('hd-type') || 'other', title: hrField('hd-title') || HR_DOC_TYPES[hrField('hd-type')],
            docNo: hrField('hd-no'), issueDate: hrField('hd-issue'), expiryDate: hrField('hd-expiry'),
            notes: hrField('hd-notes'), createdAt: today,
            attachmentName: pendingHrDocAttachment ? pendingHrDocAttachment.name : '',
            attachmentDataUrl: pendingHrDocAttachment ? pendingHrDocAttachment.dataUrl : '',
            attachmentCloudUrl: pendingHrDocAttachment ? (pendingHrDocAttachment.cloudUrl || '') : '',
            attachmentMime: pendingHrDocAttachment ? pendingHrDocAttachment.mime : ''
        });
        pendingHrDocAttachment = null;
        saveHrData();
        hrAudit('HR مستند', 'إضافة ' + emp.nameAr);
        renderHrPlatformPanel();
    }

    function saveHrDocumentEdit(id) {
        if (!requireHrOps()) return;
        const d = hrDocuments.find(function(x) { return x.id === id; });
        if (!d) return;
        d.type = hrField('hde-type') || d.type;
        d.title = hrField('hde-title');
        d.docNo = hrField('hde-no');
        d.issueDate = hrField('hde-issue');
        d.expiryDate = hrField('hde-expiry');
        d.notes = hrField('hde-notes');
        if (pendingHrDocAttachment) {
            d.attachmentName = pendingHrDocAttachment.name;
            d.attachmentDataUrl = pendingHrDocAttachment.dataUrl;
            d.attachmentCloudUrl = pendingHrDocAttachment.cloudUrl || d.attachmentCloudUrl || '';
            d.attachmentMime = pendingHrDocAttachment.mime;
            pendingHrDocAttachment = null;
        }
        saveHrData();
        hrDocEditorId = null;
        hrAudit('HR مستند', 'تعديل ' + d.employeeName);
        renderHrPlatformPanel();
    }

    function deleteHrDocument(id) {
        if (!requireHrOps()) return;
        const d = hrDocuments.find(function(x) { return x.id === id; });
        if (!d || !confirm('حذف مستند ' + d.title + '؟')) return;
        hrDocuments = hrDocuments.filter(function(x) { return x.id !== id; });
        saveHrData();
        renderHrPlatformPanel();
    }

    function renderHrPayrollPanel() {
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        const totalNet = items.reduce(function(s, i) { return s + i.net; }, 0);
        const totalGross = items.reduce(function(s, i) { return s + i.gross; }, 0);
        const canApprove = canViewHrExecutiveReports();
        const rows = items.map(function(it) {
            const dedDetail = (it.dedLines && it.dedLines.length)
                ? '<small title="' + esc(it.dedLines.map(function(d) { return d.label + ': ' + d.amount; }).join(' · ')) + '">' +
                    (it.gosiEnabled ? 'GOSI ' + it.gosiDed : 'بدون GOSI') + (it.dynamicDed ? ' + خصومات ' + it.dynamicDed : '') + '</small>'
                : (it.gosiEnabled ? '' : '<small>معفى تأمينات</small>');
            return '<tr><td>' + esc(it.employeeNo) + '</td><td>' + esc(it.employeeName) + '</td><td>' + esc(it.department) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.base) : it.base) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.housing + it.transport) : (it.housing + it.transport)) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.deductions) : it.deductions) + dedDetail + '</td>' +
                '<td><strong>' + (typeof formatSar === 'function' ? formatSar(it.net) : it.net) + '</strong></td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="exportHrPayslipPdf(\'' + esc(it.employeeId) + '\')"><i class="fas fa-file-pdf"></i> قسيمة</button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-money-check-dollar"></i> <strong>مسير رواتب HCM</strong> — أساسي + بدلات − GOSI 9% (اختياري لكل موظف) − خصومات ديناميكية وتذاكر سفر وسلف' +
            (canApprove ? ' · الإدارة الرئيسية تعتمد وتصدّر PDF/Excel/مدد' : ' · تصدير Excel ومدد متاح لـ HR') + '.</p>' +
            '<div class="hr-toolbar">' +
                '<label class="nebras-field"><span>الشهر</span><input type="month" id="hp-month" value="' + esc(month) + '" onchange="setHrPayrollMonth(this.value)"></label>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrPayrollDraft()"><i class="fas fa-save"></i> حفظ مسودة</button>' +
                '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollExcel()"><i class="fas fa-file-excel"></i> Excel مسير الرواتب</button>' +
                '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollMudad()"><i class="fas fa-building-columns"></i> ملف مدد (WPS)</button>' +
                '<a href="https://mudad.sa" target="_blank" rel="noopener" class="nebras-users-btn" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> فتح منصة مدد</a>' +
                (canApprove ? '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollPdf()"><i class="fas fa-file-pdf"></i> PDF مسير الرواتب</button>' : '') +
                '<button type="button" class="nebras-users-btn" onclick="exportAllHrPayslipsPdf()"><i class="fas fa-files"></i> قسائم فردية (الكل)</button>' +
            '</div>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + items.length + '</strong><span>موظف في المسير</span></div>' +
                '<div class="hr-report-card"><strong>' + (typeof formatSar === 'function' ? formatSar(totalGross) : totalGross) + '</strong><span>إجمالي مستحقات</span></div>' +
                '<div class="hr-report-card"><strong>' + (typeof formatSar === 'function' ? formatSar(totalNet) : totalNet) + '</strong><span>صافي بعد كل الخصومات</span></div>' +
            '</div>' +
            '<div class="hr-leave-table-wrap" id="hr-payroll-print-area"><table class="hr-leave-table"><thead><tr>' +
                '<th>رقم</th><th>الاسم</th><th>القسم</th><th>أساسي</th><th>بدلات</th><th>خصومات</th><th>الصافي</th><th>قسيمة PDF</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="8">لا موظفين</td></tr>') + '</tbody></table></div></div>';
    }

    function setHrPayrollMonth(val) {
        hrPayrollMonth = val || new Date().toISOString().slice(0, 7);
        renderHrPlatformPanel();
    }

    function saveHrPayrollDraft() {
        if (!requireHrOps()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        const existing = hrPayrollRuns.findIndex(function(p) { return p.month === month && String(p.branchId || '') === String(hrBranchFilter || ''); });
        const record = {
            id: 'pay-' + month + (hrBranchFilter ? '-' + hrBranchFilter : ''),
            month: month, branchId: hrBranchFilter || '', status: 'draft',
            items: items, createdAt: new Date().toISOString().slice(0, 10), note: 'مسودة HR'
        };
        if (existing >= 0) hrPayrollRuns[existing] = record;
        else hrPayrollRuns.unshift(record);
        if (typeof applyHrAdvancePayrollDeductions === 'function') {
            applyHrAdvancePayrollDeductions(month, items);
        }
        saveHrData();
        hrAudit('HR مسير رواتب', 'مسودة ' + month);
        alert('تم حفظ مسودة مسير رواتب ' + month);
    }

    function exportHrPayrollPdf() {
        if (!requireHrExecutiveReport()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        const area = document.getElementById('hr-payroll-print-area');
        if (!area) { alert('افتحي تبويب مسير الرواتب أولاً.'); return; }
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة.'); return; }
        const totalNet = items.reduce(function(s, i) { return s + i.net; }, 0);
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>مسير رواتب ' + month + '</title>' +
            '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#1a365d}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#e8f0f8}.foot{margin-top:20px;font-weight:bold}</style></head><body>');
        w.document.write('<h1>مصنع نبراس — مسير رواتب ' + month + '</h1>');
        w.document.write('<p>تاريخ الطباعة: ' + new Date().toLocaleString('ar-SA') + '</p>');
        w.document.write(area.innerHTML);
        w.document.write('<p class="foot">إجمالي الصافي: ' + totalNet.toFixed(2) + ' ر.س</p>');
        w.document.write('<p style="font-size:10px;color:#666">هذا المستند للإدارة الرئيسية — سري</p></body></html>');
        w.document.close();
        w.print();
        hrAudit('HR مسير رواتب', 'PDF ' + month);
    }

    function hrPayrollDownloadBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(function() { URL.revokeObjectURL(a.href); }, 4000);
    }

    function getHrPayrollCompanyMeta() {
        const companyId = typeof getHrCompanyFilter === 'function' ? getHrCompanyFilter() : '';
        const company = companyId && typeof getHrCompanyById === 'function'
            ? getHrCompanyById(companyId)
            : (typeof getHrCompanyById === 'function' ? getHrCompanyById('comp-nebras') : null);
        return company || {
            nameAr: 'مصنع نبراس للبلاستيك',
            crNumber: '',
            mudadEstablishmentId: '',
            gosiSubscriptionNo: '',
            payrollBankCode: ''
        };
    }

    function exportHrPayrollExcel() {
        if (!requireHrOps()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        if (!items.length) { alert('لا موظفين في مسير هذا الشهر.'); return; }
        const company = getHrPayrollCompanyMeta();
        const headers = ['رقم الموظف', 'الاسم', 'الهوية/الإقامة', 'IBAN', 'القسم', 'الأساسي', 'بدل سكن', 'بدل نقل', 'إجمالي مستحقات', 'GOSI 9%', 'معفى تأمينات', 'خصومات أخرى', 'إجمالي خصومات', 'الصافي', 'الشهر'];
        const rows = items.map(function(it) {
            const emp = getEmployeeById(it.employeeId) || {};
            return [
                it.employeeNo, it.employeeName, emp.nationalId || '', emp.iban || '',
                it.department, it.base, it.housing, it.transport, it.gross,
                it.gosiDed, it.gosiEnabled ? 'لا' : 'نعم', it.dynamicDed, it.deductions, it.net, month
            ];
        });
        const totalNet = items.reduce(function(s, i) { return s + i.net; }, 0);
        rows.push(['', '', '', '', 'الإجمالي', '', '', '', '', '', '', '', totalNet.toFixed(2), month]);
        let tableHtml = '<table border="1"><thead><tr>' +
            headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.forEach(function(row) {
            tableHtml += '<tr>' + row.map(function(c) { return '<td>' + esc(String(c == null ? '' : c)) + '</td>'; }).join('') + '</tr>';
        });
        tableHtml += '</tbody></table>';
        const html = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>' +
            '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">' +
            '<head><meta charset="UTF-8"></head><body dir="rtl">' +
            '<h2>مسير رواتب — ' + esc(company.nameAr) + ' — ' + esc(month) + '</h2>' +
            '<p>تاريخ التصدير: ' + new Date().toLocaleString('ar-SA') + '</p>' +
            tableHtml + '</body></html>';
        const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        hrPayrollDownloadBlob(blob, 'nebras-payroll-' + month + '.xls');
        hrAudit('HR مسير رواتب', 'Excel ' + month);
        alert('تم تنزيل مسير الرواتب Excel لشهر ' + month);
    }

    function exportHrPayrollMudad() {
        if (!requireHrOps()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        if (!items.length) { alert('لا موظفين في مسير هذا الشهر.'); return; }
        const company = getHrPayrollCompanyMeta();
        if (!company.mudadEstablishmentId && !confirm('لم يُدخل رقم منشأة مدد في بيانات الشركة — هل تريد المتابعة؟')) return;
        const payDate = month + '-28';
        const totalNet = Math.round(items.reduce(function(s, i) { return s + i.net; }, 0) * 100) / 100;
        const header = [
            'HDR',
            company.mudadEstablishmentId || company.crNumber || '',
            company.payrollBankCode || '',
            payDate,
            month.replace('-', ''),
            String(items.length),
            totalNet.toFixed(2),
            company.gosiSubscriptionNo || ''
        ].join('\t');
        const lines = [header];
        items.forEach(function(it, idx) {
            const emp = getEmployeeById(it.employeeId) || {};
            const otherAllow = hrNum(it.transport);
            lines.push([
                'EMP',
                String(idx + 1),
                emp.nationalId || '',
                it.employeeName || '',
                emp.iban || '',
                company.payrollBankCode || '',
                hrNum(it.base).toFixed(2),
                hrNum(it.housing).toFixed(2),
                otherAllow.toFixed(2),
                hrNum(it.deductions).toFixed(2),
                hrNum(it.net).toFixed(2),
                (it.employeeNo || '') + '-' + month,
                payDate
            ].join('\t'));
        });
        const csvBody = lines.join('\n');
        const blob = new Blob(['\ufeff' + csvBody], { type: 'text/tab-separated-values;charset=utf-8' });
        hrPayrollDownloadBlob(blob, 'nebras-mudad-wps-' + month + '.txt');
        hrAudit('HR مسير رواتب', 'مدد WPS ' + month);
        alert('تم تنزيل ملف مدد/WPS لشهر ' + month + '.\n\nالخطوات:\n1) افتحي منصة مدد (الزر أعلاه)\n2) ارفعي الملف .txt\n3) تأكدي من تطابق إجمالي الصافي: ' + totalNet.toFixed(2) + ' ر.س');
    }

    function renderHrAlertsPanel() {
        const alerts = collectHrAlerts();
        const danger = alerts.filter(function(a) { return a.level === 'danger'; }).length;
        const warn = alerts.filter(function(a) { return a.level === 'warn'; }).length;
        const rows = alerts.map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : (a.level === 'warn' ? 'hr-alert--warn' : 'hr-alert--info');
            let action = '';
            if (canViewHrExecutiveReports() && a.kind === 'doc' && a.id) {
                action = '<button type="button" class="erp-tag" onclick="sendHrDocumentReminder(\'' + esc(a.id) + '\')"><i class="fas fa-envelope"></i> تنبيه بريد</button>';
            }
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span>' +
                '<strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p>' + action + '</article>';
        }).join('');
        const notifRows = hrNotifications.slice(0, 20).map(function(n) {
            return '<tr><td>' + formatHrDate(n.date) + '</td><td>' + esc(n.employeeName || '') + '</td><td>' + esc(n.docTitle || '') + '</td>' +
                '<td>' + esc(String(n.daysLeft != null ? n.daysLeft : '')) + '</td><td>' + esc(n.status || '') + '</td></tr>';
        }).join('');
        const webhookVal = esc(hrNotifSettings.emailWebhookUrl || '');
        const govActions = canViewHrExecutiveReports()
            ? '<div class="hr-editor-overlay" style="margin-bottom:12px"><h4><i class="fas fa-envelope"></i> بريد API + احتياطي mailto</h4>' +
                '<label class="nebras-field nebras-field--wide"><span>Webhook URL (اختياري)</span><input id="hr-email-webhook" value="' + webhookVal + '" placeholder="https://..."></label>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn" onclick="saveHrEmailWebhookSetting()"><i class="fas fa-save"></i> حفظ Webhook</button>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="sendAllHrExpiryReminders()"><i class="fas fa-envelope-open-text"></i> تقرير بريد — كل المنتهية قريباً</button></div></div>'
            : '';
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-bell"></i> تنبيهات تلقائية + تذكيرات إقامة/عقود — مسح يومي · بريد للإدارة الرئيسية.</p>' +
            govActions +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card hr-report-card--danger"><strong>' + danger + '</strong><span>منتهي / عاجل</span></div>' +
                '<div class="hr-report-card"><strong>' + warn + '</strong><span>ينتهي خلال 60 يوم</span></div>' +
                '<div class="hr-report-card"><strong>' + alerts.length + '</strong><span>تنبيهات نشطة</span></div>' +
                '<div class="hr-report-card"><strong>' + hrNotifications.length + '</strong><span>سجل تذكيرات</span></div>' +
            '</div>' +
            '<div class="hr-alerts-list">' + (rows || '<p class="erp-empty">لا تنبيهات — كل شيء ساري.</p>') + '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-clock-rotate-left"></i> سجل التذكيرات (30/60 يوم)</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>المستند</th><th>أيام متبقية</th><th>الحالة</th></tr></thead><tbody>' +
            (notifRows || '<tr><td colspan="5" class="erp-empty">لا سجل بعد</td></tr>') + '</tbody></table></div></div>';
    }

/* PHASE13_INJECTED */
/* Phase 13 — payslips, mobile attendance, doc attachments, expiry reminders */

    const HR_ATT_METHOD = {
        manual: 'يدوي',
        mobile: 'جوال / GPS',
        biometric: 'بصمة / جهاز'
    };

    const HR_NOTIF_KEY = 'nebrasHrNotifications';
    const HR_NOTIF_SETTINGS_KEY = 'nebrasHrNotifSettings';
    const HR_DOC_ATTACH_MAX = 480000;

    function loadHrPhase13Data() {
        try {
            const n = localStorage.getItem(HR_NOTIF_KEY);
            hrNotifications = n ? JSON.parse(n) : [];
            if (!Array.isArray(hrNotifications)) hrNotifications = [];
        } catch (e) { hrNotifications = []; }
        try {
            const s = localStorage.getItem(HR_NOTIF_SETTINGS_KEY);
            const parsed = s ? JSON.parse(s) : null;
            hrNotifSettings = parsed && typeof parsed === 'object' ? parsed : { remindDays: [30, 60], notifyEmail: '', lastScan: '' };
        } catch (e) { hrNotifSettings = { remindDays: [30, 60], notifyEmail: '', lastScan: '' }; }
        if (typeof PRIMARY_RECOVERY_EMAIL !== 'undefined' && !hrNotifSettings.notifyEmail) {
            hrNotifSettings.notifyEmail = PRIMARY_RECOVERY_EMAIL;
        }
    }

    function saveHrPhase13Data() {
        try {
            localStorage.setItem(HR_NOTIF_KEY, JSON.stringify(hrNotifications));
            localStorage.setItem(HR_NOTIF_SETTINGS_KEY, JSON.stringify(hrNotifSettings));
        } catch (e) { console.warn('HR phase13 save', e); }
    }

    function setHrNotificationsFromCloud(v) {
        hrNotifications = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_NOTIF_KEY, JSON.stringify(hrNotifications)); } catch (e) { /* ignore */ }
    }

    function setHrNotifSettingsFromCloud(v) {
        if (v && typeof v === 'object') hrNotifSettings = v;
        try { localStorage.setItem(HR_NOTIF_SETTINGS_KEY, JSON.stringify(hrNotifSettings)); } catch (e) { /* ignore */ }
    }

    function getHrNotifyEmail() {
        if (hrNotifSettings.notifyEmail) return hrNotifSettings.notifyEmail;
        if (typeof PRIMARY_RECOVERY_EMAIL !== 'undefined') return PRIMARY_RECOVERY_EMAIL;
        return '';
    }

    function processHrExpiryReminders() {
        const today = new Date().toISOString().slice(0, 10);
        if (hrNotifSettings.lastScan === today) return;
        hrDocuments.forEach(function(d) {
            if (!d.expiryDate) return;
            const exp = new Date(d.expiryDate + 'T12:00:00');
            const days = Math.round((exp - new Date()) / (1000 * 60 * 60 * 24));
            const thresholds = hrNotifSettings.remindDays || [30, 60];
            thresholds.forEach(function(th) {
                if (days === th || (days < th && days >= th - 2)) {
                    const exists = hrNotifications.some(function(n) {
                        return n.docId === d.id && n.threshold === th && n.date === today;
                    });
                    if (!exists) {
                        hrNotifications.unshift({
                            id: 'hn-' + Date.now() + '-' + th,
                            docId: d.id, employeeName: d.employeeName, docTitle: d.title,
                            expiryDate: d.expiryDate, threshold: th, daysLeft: days,
                            date: today, status: 'pending', channel: 'system'
                        });
                    }
                }
            });
        });
        hrNotifSettings.lastScan = today;
        saveHrPhase13Data();
    }

    function sendHrDocumentReminder(docId) {
        if (!canViewHrExecutiveReports()) {
            alert('إرسال تنبيهات الإقامة — الإدارة الرئيسية فقط.');
            return;
        }
        const d = hrDocuments.find(function(x) { return x.id === docId; });
        if (!d) return;
        const subject = 'تنبيه HR — انتهاء ' + (HR_DOC_TYPES[d.type] || d.type) + ' — ' + d.employeeName;
        const body =
            'مصنع نبراس — تنبيه موارد بشرية\n\n' +
            'الموظف: ' + d.employeeName + ' (' + d.employeeNo + ')\n' +
            'المستند: ' + (d.title || '') + '\n' +
            'رقم الوثيقة: ' + (d.docNo || '') + '\n' +
            'تاريخ الانتهاء: ' + d.expiryDate + '\n\n' +
            'يرجى المتابعة مع قسم HR.';
        sendNebrasHrNotificationEmail({
            subject: subject,
            body: body,
            meta: { docId: d.id, type: 'doc-expiry' }
        }).then(function(entry) {
            hrNotifications.unshift({
                id: 'hn-sent-' + Date.now(), docId: d.id, employeeName: d.employeeName,
                docTitle: d.title, expiryDate: d.expiryDate, date: new Date().toISOString().slice(0, 10),
                status: entry.status || 'sent', channel: entry.channel || 'email'
            });
            saveHrData();
            hrAudit('HR تنبيه إقامة', (entry.channel || 'بريد') + ' — ' + d.employeeName);
            renderHrPlatformPanel();
        });
    }

    function sendAllHrExpiryReminders() {
        if (!canViewHrExecutiveReports()) return;
        const urgent = hrDocuments.filter(function(d) {
            if (!d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 60;
        });
        if (!urgent.length) { alert('لا مستندات تنتهي خلال 60 يوم.'); return; }
        const lines = urgent.map(function(d) {
            return '- ' + d.employeeName + ': ' + (HR_DOC_TYPES[d.type] || d.type) + ' ينتهي ' + d.expiryDate;
        }).join('\n');
        sendNebrasHrNotificationEmail({
            subject: 'تقرير تنبيهات HR — مستندات تنتهي قريباً',
            body: 'مصنع نبراس — تنبيهات المستندات:\n\n' + lines,
            meta: { type: 'bulk-expiry', count: urgent.length }
        }).then(function() {
            hrAudit('HR تنبيهات جماعية', urgent.length + ' مستند');
        });
    }

    function hrReadDocAttachment(input, mode) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > HR_DOC_ATTACH_MAX) {
            alert('الملف كبير — الحد الأقصى ~450 كيلوبايت. استخدمي PDF مضغوط أو صورة أصغر.');
            input.value = '';
            return;
        }
        const hint = document.getElementById('hd-attach-hint') || document.getElementById('hde-attach-hint');
        if (hint) hint.textContent = 'جاري المعالجة…';
        const reader = new FileReader();
        reader.onload = function(ev) {
            pendingHrDocAttachment = { name: file.name, dataUrl: ev.target.result, mime: file.type, cloudUrl: '' };
            if (hint) hint.textContent = '✓ محلي: ' + file.name;
            if (typeof uploadNebrasMediaFile === 'function') {
                if (hint) hint.textContent = 'جاري الرفع للسحابة…';
                uploadNebrasMediaFile(file).then(function(url) {
                    if (url && pendingHrDocAttachment && pendingHrDocAttachment.name === file.name) {
                        pendingHrDocAttachment.cloudUrl = url;
                        if (hint) hint.textContent = '✓ سحابة: ' + file.name;
                        pendingHrDocAttachment.dataUrl = '';
                    }
                }).catch(function() {
                    if (hint) hint.textContent = '✓ محلي (فشل السحابة): ' + file.name;
                });
            }
        };
        reader.readAsDataURL(file);
    }

    function viewHrDocumentAttachment(docId) {
        const d = hrDocuments.find(function(x) { return x.id === docId; });
        const src = d && (d.attachmentCloudUrl || d.attachmentDataUrl);
        if (!d || !src) { alert('لا مرفق لهذا المستند.'); return; }
        if (d.attachmentCloudUrl && d.attachmentCloudUrl.indexOf('http') === 0) {
            window.open(d.attachmentCloudUrl, '_blank');
            return;
        }
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة.'); return; }
        if (d.attachmentMime && d.attachmentMime.indexOf('pdf') >= 0) {
            w.document.write('<iframe src="' + src + '" style="width:100%;height:100%;border:0"></iframe>');
        } else {
            w.document.write('<img src="' + src + '" style="max-width:100%">');
        }
        w.document.close();
    }

    function findTodayAttendance(empId) {
        const today = new Date().toISOString().slice(0, 10);
        return hrAttendance.find(function(a) {
            return a.employeeId === empId && a.date === today;
        }) || null;
    }

    function hrQuickCheckIn(empId, method) {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(empId);
        if (!emp) return;
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date().toTimeString().slice(0, 5);
        let existing = findTodayAttendance(empId);
        if (existing && existing.checkIn) {
            alert(emp.nameAr + ' سجّل دخولاً اليوم عند ' + existing.checkIn);
            return;
        }
        const geoNote = method === 'mobile' ? 'GPS' : '';
        if (existing) {
            existing.checkIn = now;
            existing.checkInMethod = method || 'manual';
            existing.status = 'present';
            if (geoNote) existing.geoNote = geoNote;
        } else {
            hrAttendance.unshift({
                id: 'att-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
                branchId: emp.branchId || 'hq', date: today, checkIn: now, checkOut: '', hours: 0,
                status: 'present', checkInMethod: method || 'manual', geoNote: geoNote,
                note: '', createdAt: today
            });
        }
        saveHrData();
        hrAudit('HR حضور دخول', emp.nameAr + ' — ' + (HR_ATT_METHOD[method] || method));
        renderHrPlatformPanel();
    }

    function hrQuickCheckOut(empId) {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(empId);
        if (!emp) return;
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date().toTimeString().slice(0, 5);
        let existing = findTodayAttendance(empId);
        if (!existing || !existing.checkIn) {
            alert('لا يوجد تسجيل دخول اليوم لـ ' + emp.nameAr);
            return;
        }
        existing.checkOut = now;
        existing.hours = calcAttHours(existing.checkIn, now);
        enrichAttendanceRecord(existing);
        saveHrData();
        hrAudit('HR حضور خروج', emp.nameAr);
        renderHrPlatformPanel();
    }

    function hrMobileCheckInPrompt() {
        if (!requireHrOps()) return;
        const no = prompt('رقم الموظف للحضور عبر الجوال:', '');
        if (!no) return;
        const emp = findEmployeeByNo(no);
        if (!emp) { alert('رقم موظف غير موجود.'); return; }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
                const rec = findTodayAttendance(emp.id);
                const geo = pos.coords.latitude.toFixed(4) + ',' + pos.coords.longitude.toFixed(4);
                hrQuickCheckIn(emp.id, 'mobile');
                const r = findTodayAttendance(emp.id);
                if (r) { r.geoNote = geo; saveHrData(); }
            }, function() {
                hrQuickCheckIn(emp.id, 'mobile');
            }, { timeout: 8000 });
        } else {
            hrQuickCheckIn(emp.id, 'mobile');
        }
    }

    function buildHrPayslipHtml(item, month) {
        const fmt = typeof formatSar === 'function' ? formatSar : function(v) { return v + ' ر.س'; };
        return '<div class="hr-payslip-page">' +
            '<div class="hr-payslip-head"><img src="images/logo.png" alt="" onerror="this.style.display=\'none\'" style="height:40px">' +
            '<div><h2>مصنع نبراس للبلاستيك</h2><p>قسيمة راتب — ' + esc(month) + '</p></div></div>' +
            '<table class="hr-payslip-meta"><tr><td>الموظف</td><td><strong>' + esc(item.employeeName) + '</strong></td></tr>' +
            '<tr><td>رقم الموظف</td><td>' + esc(item.employeeNo) + '</td></tr>' +
            '<tr><td>القسم</td><td>' + esc(item.department || '—') + '</td></tr>' +
            '<tr><td>المسمى</td><td>' + esc(item.jobTitle || '—') + '</td></tr>' +
            '<tr><td>الفرع</td><td>' + esc(resolveHrBranchLabel(item.branchId)) + '</td></tr></table>' +
            '<table class="hr-payslip-lines"><tr><th>البند</th><th>المبلغ</th></tr>' +
            '<tr><td>الراتب الأساسي</td><td>' + fmt(item.base) + '</td></tr>' +
            '<tr><td>بدل سكن</td><td>' + fmt(item.housing) + '</td></tr>' +
            '<tr><td>بدل نقل</td><td>' + fmt(item.transport) + '</td></tr>' +
            '<tr><td><strong>إجمالي المستحقات</strong></td><td><strong>' + fmt(item.gross) + '</strong></td></tr>' +
            '<tr><td>خصم GOSI (9%)</td><td>' + fmt(item.deductions) + '</td></tr>' +
            '<tr class="hr-payslip-net"><td><strong>صافي الراتب</strong></td><td><strong>' + fmt(item.net) + '</strong></td></tr></table>' +
            '<p class="hr-payslip-foot">هذا المستند صادر من منصة HR — مصنع نبراس · ' + new Date().toLocaleDateString('ar-SA') + '</p></div>';
    }

    function exportHrPayslipPdf(employeeId) {
        if (!requireHrOps()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        const item = items.find(function(i) { return i.employeeId === employeeId; });
        if (!item) { alert('الموظف غير موجود في مسير هذا الشهر.'); return; }
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة.'); return; }
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>قسيمة ' + item.employeeNo + '</title>' +
            '<style>.hr-payslip-page{font-family:Tahoma,sans-serif;padding:24px;max-width:520px;margin:0 auto;color:#1a365d}' +
            '.hr-payslip-head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #2980b9;padding-bottom:12px;margin-bottom:16px}' +
            '.hr-payslip-head h2{margin:0;font-size:16px}.hr-payslip-meta,.hr-payslip-lines{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}' +
            '.hr-payslip-meta td,.hr-payslip-lines td,.hr-payslip-lines th{border:1px solid #ddd;padding:8px}.hr-payslip-lines th{background:#e8f0f8}' +
            '.hr-payslip-net td{background:#f0f8ff}.hr-payslip-foot{font-size:10px;color:#666;margin-top:20px}</style></head><body>');
        w.document.write(buildHrPayslipHtml(item, month));
        w.document.write('</body></html>');
        w.document.close();
        w.print();
        hrAudit('HR قسيمة راتب', item.employeeName + ' — ' + month);
    }

    function exportAllHrPayslipsPdf() {
        if (!requireHrExecutiveReport()) return;
        const month = getHrPayrollMonth();
        const items = buildPayrollItemsForMonth(month, hrBranchFilter);
        if (!items.length) { alert('لا موظفين.'); return; }
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>قسائم ' + month + '</title>' +
            '<style>.hr-payslip-page{font-family:Tahoma,sans-serif;padding:24px;page-break-after:always}.hr-payslip-head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #2980b9;padding-bottom:12px}' +
            'table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}td,th{border:1px solid #ccc;padding:6px}th{background:#e8f0f8}</style></head><body>');
        items.forEach(function(it) { w.document.write(buildHrPayslipHtml(it, month)); });
        w.document.write('</body></html>');
        w.document.close();
        w.print();
        hrAudit('HR قسائم جماعية', month + ' — ' + items.length);
    }

/* PHASE14_INJECTED */
/* Phase 14 — biometric WebAuthn, Supabase doc upload, email queue API, executive HR report */

    const HR_EMAIL_QUEUE_KEY = 'nebrasHrEmailQueue';

    function loadHrPhase14Data() {
        try {
            const q = localStorage.getItem(HR_EMAIL_QUEUE_KEY);
            hrEmailQueue = q ? JSON.parse(q) : [];
            if (!Array.isArray(hrEmailQueue)) hrEmailQueue = [];
        } catch (e) { hrEmailQueue = []; }
        if (!hrNotifSettings.emailWebhookUrl && typeof systemSettings !== 'undefined' && systemSettings.hrEmailWebhookUrl) {
            hrNotifSettings.emailWebhookUrl = systemSettings.hrEmailWebhookUrl;
        }
    }

    function saveHrPhase14Data() {
        try {
            localStorage.setItem(HR_EMAIL_QUEUE_KEY, JSON.stringify(hrEmailQueue));
        } catch (e) { console.warn('HR phase14 save', e); }
    }

    function setHrEmailQueueFromCloud(v) {
        hrEmailQueue = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_EMAIL_QUEUE_KEY, JSON.stringify(hrEmailQueue)); } catch (e) { /* ignore */ }
    }

    function hrBufferToBase64Url(buf) {
        const bytes = new Uint8Array(buf);
        let str = '';
        bytes.forEach(function(b) { str += String.fromCharCode(b); });
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function hrBase64UrlToBuffer(b64) {
        const pad = '='.repeat((4 - (b64.length % 4)) % 4);
        const str = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(str);
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    function hrBiometricSupported() {
        return !!(window.PublicKeyCredential && navigator.credentials && window.crypto && crypto.getRandomValues);
    }

    async function sendNebrasHrNotificationEmail(opts) {
        opts = opts || {};
        const to = opts.to || getHrNotifyEmail();
        const subject = opts.subject || 'تنبيه HR — مصنع نبراس';
        const body = opts.body || '';
        const entry = {
            id: 'he-' + Date.now(),
            to: to,
            subject: subject,
            body: body,
            meta: opts.meta || {},
            status: 'queued',
            channel: 'queue',
            createdAt: new Date().toISOString()
        };
        hrEmailQueue.unshift(entry);

        const webhook = hrNotifSettings.emailWebhookUrl ||
            (typeof systemSettings !== 'undefined' ? systemSettings.hrEmailWebhookUrl : '') || '';

        if (webhook) {
            try {
                const res = await fetch(webhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: to,
                        subject: subject,
                        body: body,
                        source: 'nebras-hr',
                        meta: entry.meta
                    })
                });
                if (res.ok) {
                    entry.status = 'sent';
                    entry.channel = 'api';
                } else {
                    entry.status = 'api-failed';
                    entry.channel = 'api';
                }
            } catch (err) {
                entry.status = 'api-failed';
                entry.error = String(err && err.message ? err.message : err);
                entry.channel = 'api';
            }
        }

        if (entry.status === 'queued' || entry.status === 'api-failed') {
            const mail = 'mailto:' + encodeURIComponent(to) +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);
            window.location.href = mail;
            entry.status = entry.status === 'api-failed' ? 'api-failed-mailto' : 'mailto';
            entry.channel = entry.channel === 'api' ? 'api+mailto' : 'mailto';
        }

        saveHrData();
        return entry;
    }

    function saveHrEmailWebhookSetting() {
        if (!canViewHrExecutiveReports()) return;
        const el = document.getElementById('hr-email-webhook');
        if (el) hrNotifSettings.emailWebhookUrl = String(el.value || '').trim();
        saveHrData();
        hrAudit('HR إعداد بريد', 'Webhook API');
        alert('تم حفظ رابط Webhook — التنبيهات تُرسل عبر API ثم mailto احتياطي.');
        renderHrPlatformPanel();
    }

    async function hrRegisterEmployeeBiometric(empId) {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(empId);
        if (!emp) return;
        if (!hrBiometricSupported()) {
            alert('المتصفح لا يدعم البصمة — استخدمي Chrome/Edge مع Windows Hello أو Touch ID.');
            return;
        }
        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);
            const cred = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: 'نبراس HR', id: window.location.hostname || 'localhost' },
                    user: {
                        id: new TextEncoder().encode(emp.id),
                        name: emp.employeeNo,
                        displayName: emp.nameAr
                    },
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
                    authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'platform' },
                    timeout: 60000
                }
            });
            if (cred && cred.rawId) {
                emp.bioCredentialId = hrBufferToBase64Url(cred.rawId);
                emp.bioRegisteredAt = new Date().toISOString().slice(0, 10);
                saveHrData();
                hrAudit('HR بصمة', 'تسجيل ' + emp.nameAr);
                alert('تم تسجيل البصمة لـ ' + emp.nameAr);
                renderHrPlatformPanel();
            }
        } catch (err) {
            alert('تعذّر تسجيل البصمة: ' + (err && err.message ? err.message : 'أعدي المحاولة'));
        }
    }

    async function hrBiometricCheckInPrompt() {
        if (!requireHrOps()) return;
        const no = prompt('رقم الموظف للحضور بالبصمة:', '');
        if (!no) return;
        const emp = findEmployeeByNo(no);
        if (!emp) { alert('رقم موظف غير موجود.'); return; }

        if (emp.bioCredentialId && hrBiometricSupported()) {
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge: challenge,
                        allowCredentials: [{
                            id: hrBase64UrlToBuffer(emp.bioCredentialId),
                            type: 'public-key'
                        }],
                        userVerification: 'required',
                        timeout: 60000
                    }
                });
                if (assertion) {
                    hrQuickCheckIn(emp.id, 'biometric');
                    const r = findTodayAttendance(emp.id);
                    if (r) { r.bioVerified = true; saveHrData(); }
                    return;
                }
            } catch (err) {
                alert('فشل التحقق بالبصمة — ' + (err && err.message ? err.message : 'أعدي المحاولة'));
                return;
            }
        }

        if (confirm(emp.nameAr + ' — لم تُسجَّل بصمة بعد. تسجيل الآن؟')) {
            await hrRegisterEmployeeBiometric(emp.id);
        } else {
            hrQuickCheckIn(emp.id, 'biometric');
        }
    }

/* PHASE15_INJECTED */
/* Phase 15 — Nebras WPC Factory HR: shifts, production lines, Saudization, factory ops */

    const HR_SHIFT_ROSTER_KEY = 'nebrasHrShiftRoster';

    const HR_FACTORY_DEPTS = {
        admin: 'الإدارة والمكتب',
        production_wpc: 'إنتاج WPC',
        production_alu: 'خط الألومنيوم',
        workshop: 'الورشة والتشغيل',
        mechanical_workshop: 'ورشة ميكانيكا',
        warehouse: 'المستودع واللوجستيات',
        workers_housing: 'سكن العمال',
        quality: 'الجودة والفحص',
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

    function getTodayShiftRoster(date) {
        const d = date || new Date().toISOString().slice(0, 10);
        return hrShiftRoster.filter(function(r) { return r.date === d; });
    }

    function ensureBuiltinHrPhase15Seed() {
        if (typeof global.NEBRAS_PRODUCTION_LIVE_MODE !== 'undefined' && global.NEBRAS_PRODUCTION_LIVE_MODE) return;
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

    function renderHrOrgTreePanel() {
        loadHrData();
        const team = applyHrScopeFilter(hrEmployees.filter(function(e) { return e.status !== 'terminated'; }), 'employee');
        const depts = typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {};
        const deptKeys = Object.keys(depts);
        const byDept = {};
        deptKeys.forEach(function(k) { byDept[k] = []; });
        team.forEach(function(e) {
            const k = e.departmentKey || 'admin';
            if (!byDept[k]) byDept[k] = [];
            byDept[k].push(e);
        });
        const branchLabel = function(e) {
            return typeof resolveHrBranchLabel === 'function' ? resolveHrBranchLabel(e.branchId) : (e.branchId || '—');
        };
        const treeHtml = deptKeys.map(function(dk) {
            const list = byDept[dk] || [];
            if (!list.length) return '';
            const cards = list.map(function(e) {
                const skill = (typeof HR_SKILL_LEVELS !== 'undefined' && e.skillLevel && HR_SKILL_LEVELS[e.skillLevel]) ? HR_SKILL_LEVELS[e.skillLevel] : (e.jobTitle || '—');
                return '<div class="hr-org-node" role="treeitem">' +
                    '<div class="hr-org-node-head"><strong>' + esc(e.nameAr || e.nameEn || '—') + '</strong>' +
                    '<span class="erp-tag">' + esc(e.employeeNo || '') + '</span></div>' +
                    '<p class="hr-org-node-meta">' + esc(skill) + ' · ' + esc(branchLabel(e)) + '</p>' +
                    '<div class="hr-org-node-actions">' +
                        '<button type="button" class="erp-tag erp-tag--action" onclick="openHrEmployeeEditor(\'' + esc(e.id) + '\')"><i class="fas fa-pen"></i> تعديل</button>' +
                        (e.assignedVehicleId ? '<span class="erp-tag"><i class="fas fa-car"></i> سيارة</span>' : '') +
                    '</div></div>';
            }).join('');
            return '<section class="hr-org-branch" role="group" aria-label="' + esc(depts[dk]) + '">' +
                '<header class="hr-org-branch-head"><i class="fas fa-folder-tree"></i><h4>' + esc(depts[dk]) + '</h4>' +
                '<span class="hr-org-count">' + list.length + ' موظف</span></header>' +
                '<div class="hr-org-children" role="group">' + cards + '</div></section>';
        }).join('');

        return '<div class="hr-panel is-active hr-org-tree-panel">' +
            '<div class="hr-org-tree-intro">' +
                '<h4><i class="fas fa-sitemap"></i> شجرة العمل — هيكل المصنع</h4>' +
                '<p>بناء الشجرة: أضيفي موظفين وحددي <strong>قسم المصنع</strong> و<strong>المسمى</strong> من تبويب الموظفون — تظهر تلقائياً هنا حسب القسم والفرع.</p>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="openHrEmployeeEditor()"><i class="fas fa-user-plus"></i> إضافة موظف للشجرة</button>' +
            '</div>' +
            '<div class="hr-org-tree-root" role="tree">' +
                (treeHtml || '<p class="erp-empty">لا موظفين في نطاقك — ابدئي بإضافة موظف وتحديد قسمه.</p>') +
            '</div></div>';
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

/* PHASE16_INJECTED */
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

    function isHrGovernorScope(scope) {
        scope = scope || getHrAdminScope();
        return scope.departmentKey === 'hr';
    }

    function employeeMatchesHrScope(emp, scope) {
        if (!emp) return false;
        scope = scope || getHrAdminScope();
        if (scope.mode === 'restricted') return false;
        if (scope.mode === 'company' && scope.companyId) {
            return typeof resolveRecordCompanyId === 'function' && resolveRecordCompanyId(emp) === String(scope.companyId);
        }
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (isHrGovernorScope(scope)) {
            if (scope.branchId && String(emp.branchId) !== String(scope.branchId)) return false;
            return true;
        }
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
        if (scope.mode === 'restricted') return false;
        if (scope.mode === 'company' && scope.companyId) {
            return typeof resolveRecordCompanyId === 'function' && resolveRecordCompanyId(veh) === String(scope.companyId);
        }
        if (scope.mode === 'full' || scope.mode === 'company') return true;
        if (scope.branchId && String(veh.branchId) !== String(scope.branchId)) return false;
        if (isHrGovernorScope(scope)) return true;
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
        let result = list;
        if (scope.mode !== 'full' && !(scope.mode === 'company' && !scope.companyId)) {
            result = list.filter(function(item) {
                if (kind === 'employee') return employeeMatchesHrScope(item, scope);
                if (kind === 'vehicle') return vehicleMatchesHrScope(item, scope);
                if (kind === 'tracking') return trackingMatchesHrScope(item, scope);
                if (kind === 'attendance' || kind === 'document' || kind === 'leave') {
                    return employeeMatchesHrScope(getEmployeeById(item.employeeId), scope);
                }
                if (kind === 'violation') {
                    const emp = item.driverEmployeeId ? getEmployeeById(item.driverEmployeeId) : null;
                    if (emp) return employeeMatchesHrScope(emp, scope);
                    return vehicleMatchesHrScope({ branchId: item.branchId, companyId: item.companyId }, scope);
                }
                return true;
            });
        }
        if (typeof getHrCompanyFilter === 'function' && getHrCompanyFilter()) {
            const cf = getHrCompanyFilter();
            if (kind === 'employee' || kind === 'vehicle') {
                result = typeof applyHrCompanyFilter === 'function' ? applyHrCompanyFilter(result) : result;
            } else if (kind === 'leave' || kind === 'attendance' || kind === 'document') {
                result = result.filter(function(item) {
                    const emp = getEmployeeById(item.employeeId);
                    return emp && typeof resolveRecordCompanyId === 'function' && resolveRecordCompanyId(emp) === String(cf);
                });
            } else if (kind === 'tracking' || kind === 'violation') {
                result = result.filter(function(t) {
                    if (kind === 'violation' && t.companyId && String(t.companyId) === String(cf)) return true;
                    const veh = t.vehicleId ? getVehicleById(t.vehicleId) : null;
                    if (veh && typeof resolveRecordCompanyId === 'function' && resolveRecordCompanyId(veh) === String(cf)) return true;
                    const emp = (t.driverEmployeeId || t.employeeId) ? getEmployeeById(t.driverEmployeeId || t.employeeId) : null;
                    return emp && typeof resolveRecordCompanyId === 'function' && resolveRecordCompanyId(emp) === String(cf);
                });
            }
        }
        return result;
    }

    function getHrScopedEmployeeIds() {
        return applyHrScopeFilter(hrEmployees, 'employee').map(function(e) { return e.id; });
    }

    function isHrTabAllowedForScope(tabId) {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return true;
        if (isHrGovernorScope(scope)) return tabId !== 'reports' || canViewHrExecutiveReports();
        if (tabId === 'governance') return true;
        if (tabId === 'reports') return canViewHrExecutiveReports();
        if (scope.departmentKey) {
            const prodDepts = ['production_wpc', 'production_alu', 'workshop', 'quality'];
            if (tabId === 'factory' && prodDepts.indexOf(scope.departmentKey) < 0) return false;
            const fleetDepts = ['installation', 'warehouse', 'sales', 'admin', 'maintenance', 'hr'];
            const fleetTabs = ['vehicles', 'tracking', 'fleet-reps', 'violations', 'fleet-hub'];
            if (fleetTabs.indexOf(tabId) >= 0 && fleetDepts.indexOf(scope.departmentKey) < 0) return false;
        }
        if (tabId === 'fleet-reps' && typeof isHrFleetRepsTabAllowed === 'function') return isHrFleetRepsTabAllowed();
        return true;
    }

    function renderHrScopeBanner() {
        const scope = getHrAdminScope();
        if (scope.mode === 'full') return '';
        const sub = scope.hrGovernor
            ? 'مدير موارد بشرية — إدارة كاملة: موظفون · رواتب · إقامات · سيارات · سعودة داخل نطاقك'
            : 'خصوصية القسم — لا تظهر بيانات أقسام أو فروع أخرى';
        return '<div class="hr-scope-banner"><i class="' + esc(scope.icon) + '"></i>' +
            '<div><strong>نطاقك: ' + esc(scope.label) + '</strong>' +
            '<span>' + sub + '</span></div></div>';
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

        const quickTabs = [];
        if (typeof canManageHrCompanies === 'function' && canManageHrCompanies()) {
            quickTabs.push({ id: 'companies', icon: 'fas fa-building-circle-check', label: 'الشركات' });
        }
        quickTabs.push(
            { id: 'employees', icon: 'fas fa-users', label: 'الفريق' },
            { id: 'attendance', icon: 'fas fa-fingerprint', label: 'حضور' },
            { id: 'payroll', icon: 'fas fa-money-check-dollar', label: 'رواتب' },
            { id: 'documents', icon: 'fas fa-folder-open', label: 'إقامات' },
            { id: 'leave', icon: 'fas fa-calendar-days', label: 'إجازات' },
            { id: 'saudization', icon: 'fas fa-flag', label: 'سعودة' },
            { id: 'fleet-hub', icon: 'fas fa-truck-fast', label: 'مركز الأسطول' },
            { id: 'violations', icon: 'fas fa-traffic-light', label: 'مخالفات' },
            { id: 'travel', icon: 'fas fa-plane', label: 'تذاكر سفر' },
            { id: 'deductions', icon: 'fas fa-scale-balanced', label: 'خصومات' }
        );
        if (isHrTabAllowedForScope('vehicles')) quickTabs.push({ id: 'vehicles', icon: 'fas fa-car', label: 'سيارات' });
        if (isHrTabAllowedForScope('tracking')) quickTabs.push({ id: 'tracking', icon: 'fas fa-location-dot', label: 'تتبع' });
        if (isHrTabAllowedForScope('fleet-reps')) quickTabs.push({ id: 'fleet-reps', icon: 'fas fa-user-tie', label: 'المندوبون' });
        if (isHrTabAllowedForScope('factory')) quickTabs.push({ id: 'factory', icon: 'fas fa-industry', label: 'المصنع' });
        quickTabs.push({ id: 'org-tree', icon: 'fas fa-sitemap', label: 'شجرة العمل' });
        quickTabs.push({ id: 'governance', icon: 'fas fa-shield-halved', label: 'حوكمة' });

        const quickHtml = quickTabs.map(function(t) {
            return '<button type="button" class="hr-command-quick-btn" onclick="switchHrTab(\'' + t.id + '\')"><i class="' + t.icon + '"></i> ' + esc(t.label) + '</button>';
        }).join('');

        const multiCo = typeof renderHrMultiCompanyOverview === 'function' ? renderHrMultiCompanyOverview() : '';
        return '<div class="hr-panel is-active">' +
            multiCo +
            renderHrScopeBanner() +
            '<div class="hr-command-hero">' +
                '<div class="hr-command-hero-glow"></div>' +
                '<div class="hr-command-hero-inner">' +
                    '<span class="hr-command-pill"><i class="' + esc(scope.icon) + '"></i> ' + esc(scope.label) + '</span>' +
                    '<h2 class="hr-command-title">' + (isStrictHrUser() ? 'نبراس HCM — إدارة الموارد البشرية والأسطول' : 'مسؤول إدارة وحوكمة القسم') + '</h2>' +
                    '<p class="hr-command-sub">' + (isStrictHrUser()
                        ? 'برنامج كامل مثل جسر HCM — موظفون · سعودة · إقامات · رواتب وبدلات · خصومات · تذاكر سفر · سيارات وتتبع GPS'
                        : 'تدير منظومة HR وموظفي أقسامك داخل نطاقك — صلاحيات كاملة · خصوصية قسمك') + '</p>' +
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

/* PHASE17_INJECTED */
/* Phase 17 — HR dept governor + activity log + executive daily/monthly governance reports */

    const HR_DEPT_ACTIVITY_KEY = 'nebrasHrDeptActivity';

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
        if (hrDeptActivity.length > 5000) hrDeptActivity.length = 5000;
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
        if (scope.mode === 'full' || scope.mode === 'company') return hrDeptActivity.slice();
        if (isHrGovernorScope(scope)) {
            if (!scope.branchId) return hrDeptActivity.slice();
            return hrDeptActivity.filter(function(a) {
                return !a.branchId || String(a.branchId) === String(scope.branchId);
            });
        }
        return hrDeptActivity.filter(function(a) {
            if (scope.departmentKey && a.departmentKey !== scope.departmentKey) return false;
            if (scope.branchId && String(a.branchId || '') !== String(scope.branchId)) return false;
            return true;
        });
    }

    function renderHrActivityPanel() {
        const scope = getHrAdminScope();
        const acts = filterHrDeptActivityForScope().slice(0, 80);
        const rows = acts.map(function(a) {
            return '<tr><td>' + formatHrDate(a.date) + ' ' + esc(a.time || '') + '</td>' +
                '<td><strong>' + esc(a.username || '—') + '</strong></td>' +
                '<td>' + esc(a.action) + '</td>' +
                '<td>' + esc(a.detail) + '</td>' +
                '<td>' + esc(a.scopeLabel || '—') + '</td></tr>';
        }).join('');
        const onlineHr = typeof global.getNebrasHrUsers === 'function' ? global.getNebrasHrUsers() : [];
        const hrUserRows = onlineHr.map(function(u) {
            return '<tr><td><strong>' + esc(u.username) + '</strong></td><td>' + esc(u.scopeLabel || '—') + '</td>' +
                '<td>' + (u.online ? '<span class="erp-tag erp-tag--ok">متصل</span>' : '<span class="erp-tag">غير متصل</span>') +
                (u.isActive === false ? ' <span class="erp-tag erp-tag--danger">معطّل</span>' : '') + '</td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<div class="hr-command-hero"><div class="hr-command-hero-inner">' +
                '<span class="hr-command-pill"><i class="fas fa-clock-rotate-left"></i> سجل العمليات</span>' +
                '<h2 class="hr-command-title">من فعل ماذا — مثل جسر و Odoo</h2>' +
                '<p class="hr-command-sub">كل إدخال أو تعديل في HR يُسجَّل باسم المستخدم — ' + esc(scope.label) + '</p>' +
            '</div></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-people-roof"></i> مستخدمو HR في النظام (' + onlineHr.length + ')</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>المستخدم</th><th>النطاق</th><th>الحالة</th></tr></thead><tbody>' +
            (hrUserRows || '<tr><td colspan="3" class="erp-empty">لا مستخدمي HR — أنشئيهم من إدارة المستخدمين (الإدارة الرئيسية)</td></tr>') +
            '</tbody></table></div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-list-check"></i> آخر العمليات (' + acts.length + ')</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th><th>النطاق</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="5" class="erp-empty">لا عمليات بعد — أضيفي موظفاً أو سيارة لتظهر هنا باسمك</td></tr>') +
            '</tbody></table></div></div>';
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

/* PHASE20_HR_INJECTED */
/* Phase 20 — HR fleet + sales rep monitoring */

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

/* PHASE22_HR_INJECTED */
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
        if (isHrGovernorScope(scope)) {
            if (scope.branchId && String(record.branchId) !== String(scope.branchId)) {
                alert('لا يمكنك إضافة سجل لفرع خارج نطاقك.');
                return false;
            }
            return true;
        }
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
            if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(admin)) {
                return { mode: 'full', branchId: '', departmentKey: '', label: 'الإدارة الرئيسية — كل الفروع والأقسام', icon: 'fas fa-crown' };
            }
            if (admin.role === 'manager' || admin.role === 'superadmin') {
                if (typeof canManage === 'function' && canManage('hr', admin)) {
                    return { mode: 'full', branchId: '', departmentKey: '', label: 'مدير عمليات — HR', icon: 'fas fa-industry' };
                }
            }
            if (typeof canManage === 'function' && canManage('hr', admin)) {
                const roleDef = typeof getRoleDefinition === 'function' ? getRoleDefinition(admin.role) : null;
                if (roleDef && roleDef.branchScoped && (admin.assignedBranchCity || admin.assignedBranchId != null)) {
                    const bid = String(admin.hrScopeBranchId || '').trim() ||
                        (admin.assignedBranchCity ? branchCityToHrBranchId(admin.assignedBranchCity) : '') ||
                        String(admin.assignedBranchId || '');
                    if (bid) {
                        return {
                            mode: 'branch',
                            branchId: bid,
                            departmentKey: '',
                            label: 'HR فرع — ' + (admin.assignedBranchCity || resolveHrBranchLabel(bid)),
                            icon: 'fas fa-people-roof'
                        };
                    }
                }
                return { mode: 'full', branchId: '', departmentKey: '', label: 'صلاحية HR — كل الفروع والأقسام', icon: 'fas fa-people-roof' };
            }
            return { mode: 'restricted', branchId: '', departmentKey: '', label: 'نطاق HR غير معيّن — تواصلي مع الإدارة', icon: 'fas fa-lock' };
        }
        let branchId = String(admin.hrScopeBranchId || '').trim();
        if (!branchId && admin.assignedBranchCity) branchId = branchCityToHrBranchId(admin.assignedBranchCity);
        const departmentKey = String(admin.hrScopeDepartmentKey || '').trim();
        const companyId = String(admin.hrScopeCompanyId || '').trim();
        if (companyId && strictHr && !departmentKey) {
            return {
                mode: 'company',
                branchId: branchId,
                departmentKey: departmentKey,
                companyId: companyId,
                label: 'موارد بشرية — ' + (typeof resolveHrCompanyLabel === 'function' ? resolveHrCompanyLabel(companyId) : companyId),
                icon: 'fas fa-building-circle-check',
                hrGovernor: false
            };
        }
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
        if (departmentKey === 'hr' && strictHr) {
            label = branchId
                ? ('موارد بشرية — ' + resolveHrBranchLabel(branchId) + ' · إدارة كاملة')
                : 'موارد بشرية — إدارة كاملة للمصنع';
            icon = 'fas fa-people-roof';
        } else if (!label) {
            label = strictHr ? 'موارد بشرية — نطاقك' : 'نطاق محدّد';
        }
        const mode = departmentKey === 'hr' && strictHr
            ? (branchId ? 'branch' : 'company')
            : (departmentKey ? 'department' : (branchId ? 'branch' : (strictHr ? 'restricted' : 'company')));
        return { mode: mode, branchId: branchId, departmentKey: departmentKey, label: label, icon: icon, hrGovernor: departmentKey === 'hr' };
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
        if (typeof renderHrAdminCommandCenter === 'function') renderHrAdminCommandCenter(user);
        const cmdTitle = document.getElementById('dashboard-command-title');
        const cmdSub = document.getElementById('dashboard-command-subtitle');
        if (cmdTitle) cmdTitle.textContent = 'HR — نبراس WPC';
        if (cmdSub) {
            const sc = typeof getHrAdminScope === 'function' ? getHrAdminScope(user) : null;
            cmdSub.textContent = sc ? sc.label : 'منصة الموارد البشرية';
        }
    }

    function applyHrScopeDefaultsOnLogin() {
        const scope = getHrAdminScope();
        if (scope.mode !== 'full' && scope.branchId && !hrBranchFilter) {
            hrBranchFilter = scope.branchId;
        }
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
    global.__nebrasHrOpenImpl = openHrPlatform;
    global.openHrPlatform = openHrPlatform;
    global.paintHrWorkspaceShell = paintHrWorkspaceShell;
    global.scheduleHrWorkspaceRender = scheduleHrWorkspaceRender;
    global.initHrWorkspaceInteractions = initHrWorkspaceInteractions;
    if (typeof global.bindNebrasHrPlatformGlobals === 'function') global.bindNebrasHrPlatformGlobals();
    initHrWorkspaceInteractions();
    global.renderHrPlatformPanel = renderHrPlatformPanel;
    global.renderHrPlatformPanelSafe = renderHrPlatformPanelSafe;
    global.closeHrWorkspace = closeHrWorkspace;
    global.openHrWorkspace = openHrPlatform;
    global.getHrTabDefinitions = getHrTabDefinitions;
    global.purgeHrAnalyticsByPeriod = purgeHrAnalyticsByPeriod;
    global.requireHrRecordInScope = requireHrRecordInScope;
    global.renderHrSalesFleetPanel = renderHrSalesFleetPanel;
    global.switchHrTab = switchHrTab;
    global.requestHrNafathVerification = requestHrNafathVerification;
    global.isEmployeeGosiDeductEnabled = isEmployeeGosiDeductEnabled;
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
    global.getHrAttendance = function() { loadHrData(); return hrAttendance; };
    global.getHrDocuments = function() { loadHrData(); return hrDocuments; };
    global.getHrPayrollRuns = function() { loadHrData(); return hrPayrollRuns; };
    global.setHrAttendanceFromCloud = setHrAttendanceFromCloud;
    global.setHrDocumentsFromCloud = setHrDocumentsFromCloud;
    global.setHrPayrollFromCloud = setHrPayrollFromCloud;
    global.addHrAttendance = addHrAttendance;
    global.deleteHrAttendance = deleteHrAttendance;
    global.saveHrDocumentQuick = saveHrDocumentQuick;
    global.saveHrDocumentEdit = saveHrDocumentEdit;
    global.openHrDocEditor = openHrDocEditor;
    global.cancelHrDocEditor = cancelHrDocEditor;
    global.deleteHrDocument = deleteHrDocument;
    global.setHrPayrollMonth = setHrPayrollMonth;
    global.saveHrPayrollDraft = saveHrPayrollDraft;
    global.exportHrPayrollPdf = exportHrPayrollPdf;
    global.exportHrPayrollExcel = exportHrPayrollExcel;
    global.exportHrPayrollMudad = exportHrPayrollMudad;
    global.getHrNotifications = function() { loadHrData(); return hrNotifications; };
    global.getHrNotifSettings = function() { loadHrData(); return hrNotifSettings; };
    global.setHrNotificationsFromCloud = setHrNotificationsFromCloud;
    global.setHrNotifSettingsFromCloud = setHrNotifSettingsFromCloud;
    global.hrQuickCheckIn = hrQuickCheckIn;
    global.hrQuickCheckOut = hrQuickCheckOut;
    global.hrMobileCheckInPrompt = hrMobileCheckInPrompt;
    global.hrReadDocAttachment = hrReadDocAttachment;
    global.viewHrDocumentAttachment = viewHrDocumentAttachment;
    global.exportHrPayslipPdf = exportHrPayslipPdf;
    global.exportAllHrPayslipsPdf = exportAllHrPayslipsPdf;
    global.sendHrDocumentReminder = sendHrDocumentReminder;
    global.sendAllHrExpiryReminders = sendAllHrExpiryReminders;
    global.getHrEmailQueue = function() { loadHrData(); return hrEmailQueue; };
    global.setHrEmailQueueFromCloud = setHrEmailQueueFromCloud;
    function requestHrNafathVerification(employeeId) {
        if (!requireHrAccess()) return;
        const emp = getEmployeeById(employeeId);
        if (!emp) { alert('الموظف غير موجود.'); return; }
        if (!emp.nationalId && !emp.iqamaNo) {
            alert('أدخلي رقم الهوية أو الإقامة في ملف الموظف أولاً.');
            openHrEmployeeEditor(employeeId);
            return;
        }
        emp.nafathStatus = 'pending';
        emp.nafathRequestedAt = new Date().toISOString();
        saveHrData();
        hrAudit('HR نفاذ', 'طلب تحقق — ' + emp.nameAr);
        window.open('https://www.iam.gov.sa/nafath', '_blank', 'noopener');
        alert('تم فتح بوابة نفاذ الرسمية.\n\nبعد اكتمال التحقق:\n1. افتحي تعديل الموظف\n2. فعّلي «تم التحقق عبر نفاذ»\n3. احفظي — تُرفع للسحابة تلقائياً');
    }

    global.sendNebrasHrNotificationEmail = sendNebrasHrNotificationEmail;
    global.hrBiometricCheckInPrompt = hrBiometricCheckInPrompt;
    global.hrRegisterEmployeeBiometric = hrRegisterEmployeeBiometric;
    global.buildHrExecutiveReportData = buildHrExecutiveReportData;
    global.saveHrEmailWebhookSetting = saveHrEmailWebhookSetting;
    global.getHrShiftRoster = function() { loadHrData(); return hrShiftRoster; };
    global.setHrShiftRosterFromCloud = setHrShiftRosterFromCloud;
    global.renderHrOrgTreePanel = renderHrOrgTreePanel;
    global.renderHrFactoryPanel = renderHrFactoryPanel;
    global.addHrShiftRoster = addHrShiftRoster;
    global.deleteHrShiftRoster = deleteHrShiftRoster;
    global.exportHrFactoryCsv = exportHrFactoryCsv;
    global.calcSaudizationStats = calcSaudizationStats;
    global.getHrAdminScope = getHrAdminScope;
    global.branchCityToHrBranchId = branchCityToHrBranchId;
    global.getHrFactoryDepts = function() { return typeof HR_FACTORY_DEPTS !== 'undefined' ? HR_FACTORY_DEPTS : {}; };
    global.renderHrAdminCommandCenter = renderHrAdminCommandCenter;
    global.renderHrScopedDashboard = renderHrScopedDashboard;
    global.employeeMatchesHrScope = employeeMatchesHrScope;
    global.vehicleMatchesHrScope = vehicleMatchesHrScope;
    global.isHrDeptGovernor = isHrDeptGovernor;
    global.stampHrRecord = stampHrRecord;
    global.getHrActor = getHrActor;
    global.renderHrGovernancePanel = renderHrGovernancePanel;
    global.buildHrDeptGovernanceMatrix = buildHrDeptGovernanceMatrix;
    global.exportHrGovernanceCsv = exportHrGovernanceCsv;
    global.getHrDeptActivity = getHrDeptActivity;
    global.setHrDeptActivityFromCloud = setHrDeptActivityFromCloud;

    try { loadHrData(); } catch (bootErr) { console.error('HR boot loadHrData', bootErr); }
})(typeof window !== 'undefined' ? window : globalThis);
