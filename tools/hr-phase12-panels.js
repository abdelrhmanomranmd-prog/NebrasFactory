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

    function calcAttHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;
        const p = function(t) {
            const parts = String(t).split(':');
            return (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0) / 60;
        };
        return Math.max(0, Math.round((p(checkOut) - p(checkIn)) * 100) / 100);
    }

    function collectHrAlerts() {
        const alerts = [];
        const today = new Date();
        hrDocuments.forEach(function(d) {
            if (!d.expiryDate) return;
            const exp = new Date(d.expiryDate + 'T12:00:00');
            const days = Math.round((exp - today) / (1000 * 60 * 60 * 24));
            const typeLabel = HR_DOC_TYPES[d.type] || d.type;
            if (days < 0) {
                alerts.push({ level: 'danger', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' منتهي منذ ' + Math.abs(days) + ' يوم', id: d.id, kind: 'doc' });
            } else if (days <= 60) {
                alerts.push({ level: 'warn', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' ينتهي خلال ' + days + ' يوم', id: d.id, kind: 'doc' });
            }
        });
        hrVehicles.forEach(function(v) {
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
        hrLeaveRequests.filter(function(l) { return l.status === 'pending'; }).forEach(function(l) {
            alerts.push({ level: 'info', cat: 'إجازة', ref: l.employeeName, detail: 'طلب إجازة معلق', id: l.id, kind: 'leave' });
        });
        return alerts.sort(function(a, b) {
            const ord = { danger: 0, warn: 1, info: 2 };
            return (ord[a.level] || 9) - (ord[b.level] || 9);
        });
    }

    function filterHrAttendance() {
        let list = hrAttendance.slice();
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
        let list = hrDocuments.slice();
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

    function buildPayrollItemsForMonth(month, branchId) {
        let emps = hrEmployees.filter(function(e) { return e.status === 'active' || e.status === 'on_leave'; });
        if (branchId) emps = emps.filter(function(e) { return String(e.branchId) === String(branchId); });
        return emps.map(function(e) {
            const base = hrNum(e.salary);
            const housing = hrNum(e.housingAllowance);
            const transport = hrNum(e.transportAllowance);
            const gross = base + housing + transport;
            const gosiDed = Math.round(base * 0.09 * 100) / 100;
            const net = Math.max(0, gross - gosiDed);
            return {
                employeeId: e.id, employeeNo: e.employeeNo, employeeName: e.nameAr,
                branchId: e.branchId, department: e.department || '', jobTitle: e.jobTitle || '',
                base: base, housing: housing, transport: transport, gross: gross,
                deductions: gosiDed, net: net
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
        const rows = filterHrAttendance().map(function(a) {
            const st = HR_ATT_STATUS[a.status] || HR_ATT_STATUS.present;
            return '<tr><td>' + formatHrDate(a.date) + '</td><td>' + esc(a.employeeNo) + '<br><small>' + esc(a.employeeName) + '</small></td>' +
                '<td>' + esc(a.checkIn || '—') + '</td><td>' + esc(a.checkOut || '—') + '</td><td>' + esc(String(a.hours || 0)) + '</td>' +
                '<td><span class="erp-tag ' + (st.tag || '') + '">' + esc(st.label) + '</span></td>' +
                '<td><button type="button" class="erp-tag" onclick="deleteHrAttendance(\'' + esc(a.id) + '\')"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-fingerprint"></i> حضور وانصراف يومي — تسجيل دخول وخروج لكل موظف وعامل في كل الفروع.</p>' +
            '<div class="hr-editor-overlay"><h4><i class="fas fa-plus"></i> تسجيل حضور</h4><div class="erp-form-grid">' +
                '<label class="nebras-field"><span>الموظف</span><select id="ha-employee">' + empOpts + '</select></label>' +
                '<label class="nebras-field"><span>التاريخ</span><input type="date" id="ha-date" value="' + today + '"></label>' +
                '<label class="nebras-field"><span>دخول</span><input type="time" id="ha-in" value="08:00"></label>' +
                '<label class="nebras-field"><span>خروج</span><input type="time" id="ha-out"></label>' +
                '<label class="nebras-field"><span>الحالة</span><select id="ha-status">' + statusOpts + '</select></label>' +
                '<label class="nebras-field nebras-field--wide"><span>ملاحظة</span><input id="ha-note"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="addHrAttendance()"><i class="fas fa-save"></i> حفظ</button></div></div>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>دخول</th><th>خروج</th><th>ساعات</th><th>الحالة</th><th></th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="7" class="erp-empty">لا سجلات حضور</td></tr>') + '</tbody></table></div></div>';
    }

    function addHrAttendance() {
        if (!requireHrOps()) return;
        const empId = hrField('ha-employee');
        const emp = getEmployeeById(empId);
        if (!emp) { alert('اختر موظفاً.'); return; }
        const checkIn = hrField('ha-in');
        const checkOut = hrField('ha-out');
        const date = hrField('ha-date') || new Date().toISOString().slice(0, 10);
        hrAttendance.unshift({
            id: 'att-' + Date.now(), employeeId: emp.id, employeeNo: emp.employeeNo, employeeName: emp.nameAr,
            branchId: emp.branchId || 'hq', date: date, checkIn: checkIn, checkOut: checkOut,
            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            note: hrField('ha-note'), createdAt: date
        });
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
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openHrDocEditor(\'' + esc(d.id) + '\')"><i class="fas fa-pen"></i></button> ' +
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
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDocumentQuick()"><i class="fas fa-plus"></i> إضافة</button></div></div>'
            : '';
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-folder-open"></i> مستندات الموظفين — إقامة · عقود · تأمين · رخص — مع تنبيهات الانتهاء.</p>' +
            quickForm + editor +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>النوع</th><th>الموظف</th><th>رقم الوثيقة</th><th>الانتهاء</th><th>إجراء</th></tr></thead><tbody>' +
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
            notes: hrField('hd-notes'), createdAt: today
        });
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
            return '<tr><td>' + esc(it.employeeNo) + '</td><td>' + esc(it.employeeName) + '</td><td>' + esc(it.department) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.base) : it.base) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.housing + it.transport) : (it.housing + it.transport)) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.deductions) : it.deductions) + '</td>' +
                '<td><strong>' + (typeof formatSar === 'function' ? formatSar(it.net) : it.net) + '</strong></td></tr>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-money-check-dollar"></i> مسير رواتب شهري — HR يُعدّ المسودة' +
            (canApprove ? ' · الإدارة الرئيسية تعتمد وتصدّر PDF' : ' (التصدير PDF للإدارة الرئيسية فقط)') + '.</p>' +
            '<div class="hr-toolbar">' +
                '<label class="nebras-field"><span>الشهر</span><input type="month" id="hp-month" value="' + esc(month) + '" onchange="setHrPayrollMonth(this.value)"></label>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrPayrollDraft()"><i class="fas fa-save"></i> حفظ مسودة</button>' +
                (canApprove ? '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollPdf()"><i class="fas fa-file-pdf"></i> PDF مسير الرواتب</button>' : '') +
            '</div>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card"><strong>' + items.length + '</strong><span>موظف في المسير</span></div>' +
                '<div class="hr-report-card"><strong>' + (typeof formatSar === 'function' ? formatSar(totalGross) : totalGross) + '</strong><span>إجمالي مستحقات</span></div>' +
                '<div class="hr-report-card"><strong>' + (typeof formatSar === 'function' ? formatSar(totalNet) : totalNet) + '</strong><span>صافي بعد خصم GOSI 9%</span></div>' +
            '</div>' +
            '<div class="hr-leave-table-wrap" id="hr-payroll-print-area"><table class="hr-leave-table"><thead><tr>' +
                '<th>رقم</th><th>الاسم</th><th>القسم</th><th>أساسي</th><th>بدلات</th><th>خصومات</th><th>الصافي</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="7">لا موظفين</td></tr>') + '</tbody></table></div></div>';
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

    function renderHrAlertsPanel() {
        const alerts = collectHrAlerts();
        const danger = alerts.filter(function(a) { return a.level === 'danger'; }).length;
        const warn = alerts.filter(function(a) { return a.level === 'warn'; }).length;
        const rows = alerts.map(function(a) {
            const cls = a.level === 'danger' ? 'hr-alert--danger' : (a.level === 'warn' ? 'hr-alert--warn' : 'hr-alert--info');
            return '<article class="hr-alert-row ' + cls + '"><span class="hr-alert-cat">' + esc(a.cat) + '</span>' +
                '<strong>' + esc(a.ref) + '</strong><p>' + esc(a.detail) + '</p></article>';
        }).join('');
        return '<div class="hr-panel is-active">' +
            '<p class="hr-platform-note"><i class="fas fa-bell"></i> تنبيهات تلقائية — انتهاء إقامات · عقود · تأمين · وثائق سيارات · إجازات معلقة.</p>' +
            '<div class="hr-report-grid">' +
                '<div class="hr-report-card hr-report-card--danger"><strong>' + danger + '</strong><span>منتهي / عاجل</span></div>' +
                '<div class="hr-report-card"><strong>' + warn + '</strong><span>ينتهي خلال 60 يوم</span></div>' +
                '<div class="hr-report-card"><strong>' + alerts.length + '</strong><span>إجمالي التنبيهات</span></div>' +
            '</div>' +
            '<div class="hr-alerts-list">' + (rows || '<p class="erp-empty">لا تنبيهات — كل شيء ساري.</p>') + '</div></div>';
    }
