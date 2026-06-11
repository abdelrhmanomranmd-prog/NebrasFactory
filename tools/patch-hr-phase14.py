#!/usr/bin/env python3
"""Phase 14: biometric, cloud doc upload, email API queue, executive HR reports."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HR_JS = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'hr-phase14-panels.js')

with open(HR_JS, encoding='utf-8') as f:
    hr = f.read()
with open(INJECT, encoding='utf-8') as f:
    p14 = f.read()
with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER14 = '/* PHASE14_INJECTED */'
if MARKER14 in hr:
    start = hr.index(MARKER14)
    end = hr.index('    function isHrDepartmentAdmin(admin)', start)
    hr = hr[:start] + hr[end:]


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


# Fix duplicate phase13 lets (syntax fix)
hr = sub(hr,
    """    let hrNotifications = [];
    let hrNotifSettings = { remindDays: [30, 60], notifyEmail: '', lastScan: '' };
    let pendingHrDocAttachment = null;

    function loadHrPhase13Data() {""",
    """    function loadHrPhase13Data() {""",
    'remove duplicate phase13 lets')

# load/save phase14
hr = sub(hr,
    '        processHrExpiryReminders();\n        return { employees:',
    '        processHrExpiryReminders();\n        loadHrPhase14Data();\n        return { employees:',
    'loadHrData phase14')

hr = sub(hr,
    '            saveHrPhase13Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    '            saveHrPhase13Data();\n            saveHrPhase14Data();\n        } catch (err) { console.warn(\'HR save failed\', err); }',
    'saveHrData phase14')

if 'let hrEmailQueue' not in hr:
    hr = sub(hr,
        '    let pendingHrDocAttachment = null;\n',
        '    let pendingHrDocAttachment = null;\n    let hrEmailQueue = [];\n',
        'phase14 vars')

hr = sub(hr,
    '    function isHrDepartmentAdmin(admin) {',
    MARKER14 + '\n' + p14 + '\n    function isHrDepartmentAdmin(admin) {',
    'inject phase14')

# Attendance toolbar — biometric button
hr = sub(hr,
    """            '<div class="hr-toolbar"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="hrMobileCheckInPrompt()"><i class="fas fa-mobile-screen"></i> حضور جوال (GPS)</button></div>' +""",
    """            '<div class="hr-toolbar">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="hrMobileCheckInPrompt()"><i class="fas fa-mobile-screen"></i> حضور جوال (GPS)</button>' +
                '<button type="button" class="nebras-users-btn" onclick="hrBiometricCheckInPrompt()"><i class="fas fa-fingerprint"></i> حضور بصمة</button>' +
            '</div>' +""",
    'attendance biometric btn')

# Employee editor — register biometric
hr = sub(hr,
    """            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrEmployee(\\'' + esc(id || '') + '\\')"><i class="fas fa-save"></i> حفظ</button>' +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrEmployeeEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div>' +
        '</div>';""",
    """            '<div class="erp-form-actions">' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrEmployee(\\'' + esc(id || '') + '\\')"><i class="fas fa-save"></i> حفظ</button>' +
                (isEdit ? '<button type="button" class="nebras-users-btn" onclick="hrRegisterEmployeeBiometric(\\'' + esc(id) + '\\')"><i class="fas fa-fingerprint"></i> تسجيل بصمة</button>' +
                    (e.bioCredentialId ? '<span class="erp-tag erp-tag--ok"><i class="fas fa-check"></i> بصمة مسجّلة</span>' : '') : '') +
                '<button type="button" class="nebras-users-btn" onclick="cancelHrEmployeeEditor()"><i class="fas fa-xmark"></i> إلغاء</button>' +
            '</div>' +
        '</div>';""",
    'employee biometric btn')

# saveHrEmployee — preserve bio fields
hr = sub(hr,
    """        if (id) {
            const idx = hrEmployees.findIndex(function(e) { return e.id === id; });
            if (idx >= 0) {
                record.createdAt = hrEmployees[idx].createdAt || now;
                hrEmployees[idx] = record;
            }
        } else {""",
    """        if (id) {
            const idx = hrEmployees.findIndex(function(e) { return e.id === id; });
            if (idx >= 0) {
                record.createdAt = hrEmployees[idx].createdAt || now;
                record.bioCredentialId = hrEmployees[idx].bioCredentialId || '';
                record.bioRegisteredAt = hrEmployees[idx].bioRegisteredAt || '';
                hrEmployees[idx] = record;
            }
        } else {""",
    'saveHrEmployee bio preserve')

# saveHrDocumentQuick — cloud url
hr = sub(hr,
    """            attachmentName: pendingHrDocAttachment ? pendingHrDocAttachment.name : '',
            attachmentDataUrl: pendingHrDocAttachment ? pendingHrDocAttachment.dataUrl : '',
            attachmentMime: pendingHrDocAttachment ? pendingHrDocAttachment.mime : ''""",
    """            attachmentName: pendingHrDocAttachment ? pendingHrDocAttachment.name : '',
            attachmentDataUrl: pendingHrDocAttachment ? pendingHrDocAttachment.dataUrl : '',
            attachmentCloudUrl: pendingHrDocAttachment ? (pendingHrDocAttachment.cloudUrl || '') : '',
            attachmentMime: pendingHrDocAttachment ? pendingHrDocAttachment.mime : ''""",
    'saveHrDocumentQuick cloud')

hr = sub(hr,
    """        if (pendingHrDocAttachment) {
            d.attachmentName = pendingHrDocAttachment.name;
            d.attachmentDataUrl = pendingHrDocAttachment.dataUrl;
            d.attachmentMime = pendingHrDocAttachment.mime;
            pendingHrDocAttachment = null;
        }""",
    """        if (pendingHrDocAttachment) {
            d.attachmentName = pendingHrDocAttachment.name;
            d.attachmentDataUrl = pendingHrDocAttachment.dataUrl;
            d.attachmentCloudUrl = pendingHrDocAttachment.cloudUrl || d.attachmentCloudUrl || '';
            d.attachmentMime = pendingHrDocAttachment.mime;
            pendingHrDocAttachment = null;
        }""",
    'saveHrDocumentEdit cloud')

# Replace hrReadDocAttachment
OLD_READ = r"""    function hrReadDocAttachment(input, mode) {
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
    }"""

NEW_READ = r"""    function hrReadDocAttachment(input, mode) {
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
                    }
                }).catch(function() {
                    if (hint) hint.textContent = '✓ محلي (فشل السحابة): ' + file.name;
                });
            }
        };
        reader.readAsDataURL(file);
    }"""

hr = sub(hr, OLD_READ, NEW_READ, 'hrReadDocAttachment cloud')

OLD_VIEW = r"""    function viewHrDocumentAttachment(docId) {
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
    }"""

NEW_VIEW = r"""    function viewHrDocumentAttachment(docId) {
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
    }"""

hr = sub(hr, OLD_VIEW, NEW_VIEW, 'viewHrDocumentAttachment cloud')

# Email reminders — API queue
OLD_REM = r"""    function sendHrDocumentReminder(docId) {
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
    }"""

NEW_REM = r"""    function sendHrDocumentReminder(docId) {
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
    }"""

hr = sub(hr, OLD_REM, NEW_REM, 'sendHrDocumentReminder api')

OLD_ALL = r"""    function sendAllHrExpiryReminders() {
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
    }"""

NEW_ALL = r"""    function sendAllHrExpiryReminders() {
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
    }"""

hr = sub(hr, OLD_ALL, NEW_ALL, 'sendAllHrExpiryReminders api')

# Alerts panel — webhook setting
OLD_ALERTS_TAIL = """        const govActions = canViewHrExecutiveReports()
            ? '<div class="erp-form-actions" style="margin-bottom:12px"><button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="sendAllHrExpiryReminders()"><i class="fas fa-envelope-open-text"></i> تقرير بريد — كل المنتهية قريباً</button></div>'
            : '';"""

NEW_ALERTS_TAIL = """        const webhookVal = esc(hrNotifSettings.emailWebhookUrl || '');
        const govActions = canViewHrExecutiveReports()
            ? '<div class="hr-editor-overlay" style="margin-bottom:12px"><h4><i class="fas fa-envelope"></i> بريد API + احتياطي mailto</h4>' +
                '<label class="nebras-field nebras-field--wide"><span>Webhook URL (اختياري)</span><input id="hr-email-webhook" value="' + webhookVal + '" placeholder="https://..."></label>' +
                '<div class="erp-form-actions"><button type="button" class="nebras-users-btn" onclick="saveHrEmailWebhookSetting()"><i class="fas fa-save"></i> حفظ Webhook</button>' +
                '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="sendAllHrExpiryReminders()"><i class="fas fa-envelope-open-text"></i> تقرير بريد — كل المنتهية قريباً</button></div></div>'
            : '';"""

hr = sub(hr, OLD_ALERTS_TAIL, NEW_ALERTS_TAIL, 'alerts webhook ui')

# Doc table — cloud indicator
hr = sub(hr,
    """                '<td>' + (d.attachmentName ? '<button type="button" class="erp-tag erp-tag--ok" onclick="viewHrDocumentAttachment(\\'' + esc(d.id) + '\\')"><i class="fas fa-paperclip"></i></button> ' : '') +""",
    """                '<td>' + (d.attachmentName || d.attachmentCloudUrl ? '<button type="button" class="erp-tag erp-tag--ok" onclick="viewHrDocumentAttachment(\\'' + esc(d.id) + '\\')" title="' + esc(d.attachmentCloudUrl ? 'سحابة' : 'محلي') + '"><i class="fas fa-paperclip"></i>' + (d.attachmentCloudUrl ? ' ☁' : '') + '</button> ' : '') +""",
    'doc cloud badge')

# Exports
hr = sub(hr,
    '    global.sendAllHrExpiryReminders = sendAllHrExpiryReminders;\n',
    """    global.sendAllHrExpiryReminders = sendAllHrExpiryReminders;
    global.getHrEmailQueue = function() { loadHrData(); return hrEmailQueue; };
    global.setHrEmailQueueFromCloud = setHrEmailQueueFromCloud;
    global.sendNebrasHrNotificationEmail = sendNebrasHrNotificationEmail;
    global.hrBiometricCheckInPrompt = hrBiometricCheckInPrompt;
    global.hrRegisterEmployeeBiometric = hrRegisterEmployeeBiometric;
    global.buildHrExecutiveReportData = buildHrExecutiveReportData;
    global.saveHrEmailWebhookSetting = saveHrEmailWebhookSetting;
""",
    'exports phase14')

with open(HR_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(hr)

# Platform — executive HR section
if "buildHrExecutiveReportData" not in plat:
    plat = sub(plat,
        """            pushSection('crm', 'خدمة العملاء', 'fas fa-headset', [
                { label: 'تذاكر', val: crmList.length },
                { label: 'جديدة', val: crmList.filter(function(c) { return c.status === 'new'; }).length },
                { label: 'مندوبون', val: teamReps.length }
            ], crmList.slice(0, 8).map(function(c) {
                return [c.id || '—', c.customerName || '—', c.status || '—', c.branch || '—'];
            }));

            return {""",
        """            pushSection('crm', 'خدمة العملاء', 'fas fa-headset', [
                { label: 'تذاكر', val: crmList.length },
                { label: 'جديدة', val: crmList.filter(function(c) { return c.status === 'new'; }).length },
                { label: 'مندوبون', val: teamReps.length }
            ], crmList.slice(0, 8).map(function(c) {
                return [c.id || '—', c.customerName || '—', c.status || '—', c.branch || '—'];
            }));

            if (typeof buildHrExecutiveReportData === 'function') {
                const hrExec = buildHrExecutiveReportData(period, branchId);
                pushSection('hr', 'الموارد البشرية', 'fas fa-people-roof', hrExec.kpis, hrExec.rows);
            }

            return {""",
        'executive hr section')

# index.html — HR dept filter
if '<option value="hr">' not in html:
    html = sub(html,
        '                    <option value="crm">خدمة العملاء</option>\n                </select>',
        '                    <option value="crm">خدمة العملاء</option>\n                    <option value="hr">الموارد البشرية</option>\n                </select>',
        'index hr dept option')
    with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

# Cloud sync — hr_email_queue
if "'hr_email_queue'" not in plat:
    plat = sub(plat,
        """            { key: 'hr_notif_settings', get: function() {
                return typeof getHrNotifSettings === 'function' ? getHrNotifSettings() : {};
            }, set: function(v) {
                if (typeof setHrNotifSettingsFromCloud === 'function') setHrNotifSettingsFromCloud(v);
            }},""",
        """            { key: 'hr_notif_settings', get: function() {
                return typeof getHrNotifSettings === 'function' ? getHrNotifSettings() : {};
            }, set: function(v) {
                if (typeof setHrNotifSettingsFromCloud === 'function') setHrNotifSettingsFromCloud(v);
            }},
            { key: 'hr_email_queue', get: function() {
                return typeof getHrEmailQueue === 'function' ? getHrEmailQueue() : [];
            }, set: function(v) {
                if (typeof setHrEmailQueueFromCloud === 'function') setHrEmailQueueFromCloud(v);
            }},""",
        'cloud phase14')
    plat = sub(plat,
        "'hr_payroll', 'hr_notifications', 'hr_notif_settings'];",
        "'hr_payroll', 'hr_notifications', 'hr_notif_settings', 'hr_email_queue'];",
        'erpKeys phase14')
    with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(plat)

print('PHASE14 PATCH COMPLETE')
