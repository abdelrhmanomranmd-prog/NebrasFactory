#!/usr/bin/env python3
"""Phase 13: payslips, mobile attendance, attachments, email reminders."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase13-panels.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p13 = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()

MARKER = '/* PHASE13_INJECTED */'
if MARKER in hr:
    start = hr.index(MARKER)
    end = hr.index('    function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


hr = sub(hr,
    '        ensureBuiltinHrPhase12Seed();\n        return { employees:',
    '        ensureBuiltinHrPhase12Seed();\n        loadHrPhase13Data();\n        processHrExpiryReminders();\n        return { employees:',
    'loadHrData phase13')

hr = sub(hr,
    '            saveHrPhase12Arrays();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    '            saveHrPhase12Arrays();\n            saveHrPhase13Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    'saveHrData phase13')

if 'let hrNotifications' not in hr:
    hr = sub(hr,
        "    let hrPayrollRuns = [];\n",
        "    let hrPayrollRuns = [];\n    let hrNotifications = [];\n    let hrNotifSettings = { remindDays: [30, 60], notifyEmail: '', lastScan: '' };\n    let pendingHrDocAttachment = null;\n",
        'phase13 vars')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER + '\n' + p13 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase13')

# --- renderHrAttendancePanel ---
OLD_ATT = """    function renderHrAttendancePanel() {
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
                '<td><button type="button" class="erp-tag" onclick="deleteHrAttendance(\\'' + esc(a.id) + '\\')"><i class="fas fa-trash"></i></button></td></tr>';
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
    }"""

NEW_ATT = r"""    function renderHrAttendancePanel() {
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
            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="hrMobileCheckInPrompt()"><i class="fas fa-mobile-screen"></i> حضور جوال (GPS)</button></div>' +
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
    }"""

hr = sub(hr, OLD_ATT, NEW_ATT, 'renderHrAttendancePanel v13')

hr = sub(hr,
    """            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            note: hrField('ha-note'), createdAt: date""",
    """            hours: calcAttHours(checkIn, checkOut), status: hrField('ha-status') || 'present',
            checkInMethod: hrField('ha-method') || 'manual', geoNote: '',
            note: hrField('ha-note'), createdAt: date""",
    'addHrAttendance method')

# Payroll rows with payslip button
hr = sub(hr,
    """            return '<tr><td>' + esc(it.employeeNo) + '</td><td>' + esc(it.employeeName) + '</td><td>' + esc(it.department) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.base) : it.base) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.housing + it.transport) : (it.housing + it.transport)) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.deductions) : it.deductions) + '</td>' +
                '<td><strong>' + (typeof formatSar === 'function' ? formatSar(it.net) : it.net) + '</strong></td></tr>';""",
    """            return '<tr><td>' + esc(it.employeeNo) + '</td><td>' + esc(it.employeeName) + '</td><td>' + esc(it.department) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.base) : it.base) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.housing + it.transport) : (it.housing + it.transport)) + '</td>' +
                '<td>' + (typeof formatSar === 'function' ? formatSar(it.deductions) : it.deductions) + '</td>' +
                '<td><strong>' + (typeof formatSar === 'function' ? formatSar(it.net) : it.net) + '</strong></td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="exportHrPayslipPdf(\\'' + esc(it.employeeId) + '\\')"><i class="fas fa-file-pdf"></i> قسيمة</button></td></tr>';""",
    'payroll payslip column')

hr = sub(hr,
    """                '<th>رقم</th><th>الاسم</th><th>القسم</th><th>أساسي</th><th>بدلات</th><th>خصومات</th><th>الصافي</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="7">لا موظفين</td></tr>')""",
    """                '<th>رقم</th><th>الاسم</th><th>القسم</th><th>أساسي</th><th>بدلات</th><th>خصومات</th><th>الصافي</th><th>قسيمة PDF</th>' +
            '</tr></thead><tbody>' + (rows || '<tr><td colspan="8">لا موظفين</td></tr>')""",
    'payroll table header')

hr = sub(hr,
    """                (canApprove ? '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollPdf()"><i class="fas fa-file-pdf"></i> PDF مسير الرواتب</button>' : '') +""",
    """                (canApprove ? '<button type="button" class="nebras-users-btn" onclick="exportHrPayrollPdf()"><i class="fas fa-file-pdf"></i> PDF مسير الرواتب</button>' : '') +
                '<button type="button" class="nebras-users-btn" onclick="exportAllHrPayslipsPdf()"><i class="fas fa-files"></i> قسائم فردية (الكل)</button>' +""",
    'payroll all payslips btn')

# Documents - attachment in quick form and table
hr = sub(hr,
    """                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hd-notes"></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDocumentQuick()"><i class="fas fa-plus"></i> إضافة</button></div></div>'""",
    """                '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hd-notes"></label>' +
                '<label class="nebras-field nebras-field--wide"><span>مرفق (PDF/صورة)</span><input type="file" accept="image/*,application/pdf" onchange="hrReadDocAttachment(this,\'new\')"><small id="hd-attach-hint" class="hr-attach-hint">حتى ~450 كيلوبايت</small></label>' +
            '</div><div class="erp-form-actions"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrDocumentQuick()"><i class="fas fa-plus"></i> إضافة</button></div></div>'""",
    'doc attach input')

hr = sub(hr,
    """            return '<tr><td>' + esc(HR_DOC_TYPES[d.type] || d.type) + '</td><td>' + esc(d.employeeName) + '<br><small>' + esc(d.employeeNo) + '</small></td>' +
                '<td>' + esc(d.docNo || '—') + '</td><td>' + formatHrDate(d.expiryDate) + ' ' + exp + '</td>' +
                '<td><button type="button" class="erp-tag erp-tag--action" onclick="openHrDocEditor(\\'' + esc(d.id) + '\\')"><i class="fas fa-pen"></i></button> ' +
                '<button type="button" class="erp-tag" onclick="deleteHrDocument(\\'' + esc(d.id) + '\\')"><i class="fas fa-trash"></i></button></td></tr>';""",
    """            return '<tr><td>' + esc(HR_DOC_TYPES[d.type] || d.type) + '</td><td>' + esc(d.employeeName) + '<br><small>' + esc(d.employeeNo) + '</small></td>' +
                '<td>' + esc(d.docNo || '—') + '</td><td>' + formatHrDate(d.expiryDate) + ' ' + exp + '</td>' +
                '<td>' + (d.attachmentName ? '<button type="button" class="erp-tag erp-tag--ok" onclick="viewHrDocumentAttachment(\\'' + esc(d.id) + '\\')"><i class="fas fa-paperclip"></i></button> ' : '') +
                '<button type="button" class="erp-tag erp-tag--action" onclick="openHrDocEditor(\\'' + esc(d.id) + '\\')"><i class="fas fa-pen"></i></button> ' +
                (canViewHrExecutiveReports() ? '<button type="button" class="erp-tag" onclick="sendHrDocumentReminder(\\'' + esc(d.id) + '\\')"><i class="fas fa-envelope"></i></button> ' : '') +
                '<button type="button" class="erp-tag" onclick="deleteHrDocument(\\'' + esc(d.id) + '\\')"><i class="fas fa-trash"></i></button></td></tr>';""",
    'doc table attachments')

hr = sub(hr,
    """            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>النوع</th><th>الموظف</th><th>رقم الوثيقة</th><th>الانتهاء</th><th>إجراء</th></tr></thead><tbody>'""",
    """            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>النوع</th><th>الموظف</th><th>رقم الوثيقة</th><th>الانتهاء</th><th>مرفق · إجراء</th></tr></thead><tbody>'""",
    'doc table header')

hr = sub(hr,
    """            '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hde-notes" value="' + esc(d.notes || '') + '"></label>' +
        '</div><div class="erp-form-actions">' +""",
    """            '<label class="nebras-field nebras-field--wide"><span>ملاحظات</span><input id="hde-notes" value="' + esc(d.notes || '') + '"></label>' +
            '<label class="nebras-field nebras-field--wide"><span>مرفق جديد</span><input type="file" accept="image/*,application/pdf" onchange="hrReadDocAttachment(this,\\'edit\\')"><small id="hde-attach-hint" class="hr-attach-hint">' + (d.attachmentName ? esc(d.attachmentName) : 'اختياري') + '</small></label>' +
        '</div><div class="erp-form-actions">' +""",
    'doc editor attach')

hr = sub(hr,
    """            notes: hrField('hd-notes'), createdAt: today
        });
        saveHrData();""",
    """            notes: hrField('hd-notes'), createdAt: today,
            attachmentName: pendingHrDocAttachment ? pendingHrDocAttachment.name : '',
            attachmentDataUrl: pendingHrDocAttachment ? pendingHrDocAttachment.dataUrl : '',
            attachmentMime: pendingHrDocAttachment ? pendingHrDocAttachment.mime : ''
        });
        pendingHrDocAttachment = null;
        saveHrData();""",
    'saveHrDocumentQuick attach')

hr = sub(hr,
    """        d.notes = hrField('hde-notes');
        saveHrData();""",
    """        d.notes = hrField('hde-notes');
        if (pendingHrDocAttachment) {
            d.attachmentName = pendingHrDocAttachment.name;
            d.attachmentDataUrl = pendingHrDocAttachment.dataUrl;
            d.attachmentMime = pendingHrDocAttachment.mime;
            pendingHrDocAttachment = null;
        }
        saveHrData();""",
    'saveHrDocumentEdit attach')

# Alerts panel enhanced
OLD_ALERTS = """    function renderHrAlertsPanel() {
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
    }"""

NEW_ALERTS = r"""    function renderHrAlertsPanel() {
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
        const govActions = canViewHrExecutiveReports()
            ? '<div class="erp-form-actions" style="margin-bottom:12px"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="sendAllHrExpiryReminders()"><i class="fas fa-envelope-open-text"></i> تقرير بريد — كل المنتهية قريباً</button></div>'
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
    }"""

hr = sub(hr, OLD_ALERTS, NEW_ALERTS, 'renderHrAlertsPanel v13')

# collectHrAlerts - add doc id for email
hr = sub(hr,
    """                alerts.push({ level: 'danger', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' منتهي منذ ' + Math.abs(days) + ' يوم', id: d.id, kind: 'doc' });
            } else if (days <= 60) {
                alerts.push({ level: 'warn', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' ينتهي خلال ' + days + ' يوم', id: d.id, kind: 'doc' });""",
    """                alerts.push({ level: 'danger', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' منتهي منذ ' + Math.abs(days) + ' يوم', id: d.id, kind: 'doc' });
            } else if (days <= 60) {
                alerts.push({ level: 'warn', cat: 'مستند', ref: d.employeeName, detail: typeLabel + ' ينتهي خلال ' + days + ' يوم', id: d.id, kind: 'doc' });""",
    'collectHrAlerts id - noop check')

# Exports
hr = sub(hr,
    '    global.exportHrPayrollPdf = exportHrPayrollPdf;\n',
    """    global.exportHrPayrollPdf = exportHrPayrollPdf;
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
""",
    'exports phase13')

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# Platform cloud
if "'hr_notifications'" not in plat:
    plat = sub(plat,
        """            { key: 'hr_payroll', get: function() {
                return typeof getHrPayrollRuns === 'function' ? getHrPayrollRuns() : [];
            }, set: function(v) {
                if (typeof setHrPayrollFromCloud === 'function') setHrPayrollFromCloud(v);
            }},""",
        """            { key: 'hr_payroll', get: function() {
                return typeof getHrPayrollRuns === 'function' ? getHrPayrollRuns() : [];
            }, set: function(v) {
                if (typeof setHrPayrollFromCloud === 'function') setHrPayrollFromCloud(v);
            }},
            { key: 'hr_notifications', get: function() {
                return typeof getHrNotifications === 'function' ? getHrNotifications() : [];
            }, set: function(v) {
                if (typeof setHrNotificationsFromCloud === 'function') setHrNotificationsFromCloud(v);
            }},
            { key: 'hr_notif_settings', get: function() {
                return typeof getHrNotifSettings === 'function' ? getHrNotifSettings() : {};
            }, set: function(v) {
                if (typeof setHrNotifSettingsFromCloud === 'function') setHrNotifSettingsFromCloud(v);
            }},""",
        'cloud phase13')
    plat = sub(plat,
        "'hr_vehicle_tracking', 'hr_attendance', 'hr_documents', 'hr_payroll'];",
        "'hr_vehicle_tracking', 'hr_attendance', 'hr_documents', 'hr_payroll', 'hr_notifications', 'hr_notif_settings'];",
        'erpKeys phase13')
    with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(plat)

print('PHASE13 PATCH COMPLETE')
