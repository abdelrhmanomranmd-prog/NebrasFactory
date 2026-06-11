/* Phase 13 — payslips, mobile attendance, doc attachments, expiry reminders */

    const HR_ATT_METHOD = {
        manual: 'يدوي',
        mobile: 'جوال / GPS',
        biometric: 'بصمة / جهاز'
    };

    const HR_NOTIF_KEY = 'nebrasHrNotifications';
    const HR_NOTIF_SETTINGS_KEY = 'nebrasHrNotifSettings';
    const HR_DOC_ATTACH_MAX = 480000;

    let hrNotifications = [];
    let hrNotifSettings = { remindDays: [30, 60], notifyEmail: '', lastScan: '' };
    let pendingHrDocAttachment = null;

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
        const email = getHrNotifyEmail();
        const subject = encodeURIComponent('تنبيه HR — انتهاء ' + (HR_DOC_TYPES[d.type] || d.type) + ' — ' + d.employeeName);
        const body = encodeURIComponent(
            'مصنع نبراس — تنبيه موارد بشرية\n\n' +
            'الموظف: ' + d.employeeName + ' (' + d.employeeNo + ')\n' +
            'المستند: ' + (d.title || '') + '\n' +
            'رقم الوثيقة: ' + (d.docNo || '') + '\n' +
            'تاريخ الانتهاء: ' + d.expiryDate + '\n\n' +
            'يرجى المتابعة مع قسم HR.'
        );
        const mail = 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + body;
        window.location.href = mail;
        hrNotifications.unshift({
            id: 'hn-sent-' + Date.now(), docId: d.id, employeeName: d.employeeName,
            docTitle: d.title, expiryDate: d.expiryDate, date: new Date().toISOString().slice(0, 10),
            status: 'sent', channel: 'email'
        });
        saveHrData();
        hrAudit('HR تنبيه إقامة', 'بريد — ' + d.employeeName);
    }

    function sendAllHrExpiryReminders() {
        if (!canViewHrExecutiveReports()) return;
        const urgent = hrDocuments.filter(function(d) {
            if (!d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days >= 0 && days <= 60;
        });
        if (!urgent.length) { alert('لا مستندات تنتهي خلال 60 يوم.'); return; }
        const email = getHrNotifyEmail();
        const lines = urgent.map(function(d) {
            return '- ' + d.employeeName + ': ' + (HR_DOC_TYPES[d.type] || d.type) + ' ينتهي ' + d.expiryDate;
        }).join('%0A');
        const subject = encodeURIComponent('تقرير تنبيهات HR — مستندات تنتهي قريباً');
        const body = encodeURIComponent('مصنع نبراس — تنبيهات المستندات:%0A%0A') + lines;
        window.location.href = 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + body;
        hrAudit('HR تنبيهات جماعية', urgent.length + ' مستند');
    }

    function hrReadDocAttachment(input, mode) {
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        if (file.size > HR_DOC_ATTACH_MAX) {
            alert('الملف كبير — الحد الأقصى ~450 كيلوبايت. استخدمي PDF مضغوط أو صورة أصغر.');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function(ev) {
            pendingHrDocAttachment = { name: file.name, dataUrl: ev.target.result, mime: file.type };
            const hint = document.getElementById('hd-attach-hint') || document.getElementById('hde-attach-hint');
            if (hint) hint.textContent = '✓ مرفق: ' + file.name;
        };
        reader.readAsDataURL(file);
    }

    function viewHrDocumentAttachment(docId) {
        const d = hrDocuments.find(function(x) { return x.id === docId; });
        if (!d || !d.attachmentDataUrl) { alert('لا مرفق لهذا المستند.'); return; }
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة.'); return; }
        if (d.attachmentMime && d.attachmentMime.indexOf('pdf') >= 0) {
            w.document.write('<iframe src="' + d.attachmentDataUrl + '" style="width:100%;height:100%;border:0"></iframe>');
        } else {
            w.document.write('<img src="' + d.attachmentDataUrl + '" style="max-width:100%">');
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
