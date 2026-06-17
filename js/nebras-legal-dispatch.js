/**
 * نبراس Legal — إرسال العقود: واتساب · بريد · تنزيل · نفاذ
 */
(function(global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getLegalContractById(id) {
        if (typeof getLegalContracts !== 'function') return null;
        const list = getLegalContracts();
        return list.find(function(c) { return c.id === id; }) || null;
    }

    function getLegalRentalById(id) {
        if (typeof getLegalRentals !== 'function') return null;
        const list = getLegalRentals();
        return list.find(function(r) { return r.id === id; }) || null;
    }

    function normalizeSaPhone(phone) {
        let p = String(phone || '').replace(/\D/g, '');
        if (p.indexOf('966') === 0) p = p.slice(3);
        if (p.indexOf('0') === 0) p = p.slice(1);
        return p.length >= 9 ? '966' + p : '';
    }

    function resolveLegalCompanyName(companyId) {
        if (typeof resolveLegalCompanyLabel === 'function') return resolveLegalCompanyLabel(companyId);
        return 'مصنع نبراس للبلاستيك';
    }

    function contractAttachmentUrl(rec) {
        if (!rec) return '';
        if (rec.attachmentCloudUrl) return rec.attachmentCloudUrl;
        if (rec.attachmentDataUrl) return rec.attachmentDataUrl;
        return '';
    }

    function buildContractDispatchMessage(rec, kind) {
        kind = kind || 'contract';
        const company = resolveLegalCompanyName(rec.companyId);
        const title = rec.title || 'عقد';
        const ref = rec.referenceNo ? ('رقم: ' + rec.referenceNo + '\n') : '';
        const party = rec.partyName ? ('الطرف: ' + rec.partyName + '\n') : '';
        const dates = (rec.startDate || rec.endDate)
            ? ('المدة: ' + (rec.startDate || '—') + ' → ' + (rec.endDate || '—') + '\n')
            : '';
        const attach = contractAttachmentUrl(rec);
        const attachLine = attach ? ('مرفق العقد: ' + attach + '\n') : '';
        const nafathLine = rec.nafathRequired && !rec.nafathVerified
            ? '\n⚠️ يتطلب التحقق عبر نفاذ (NAFAZ): https://www.iam.gov.sa/nafath\n'
            : '';
        return 'السلام عليكم،\n\n' +
            'من: ' + company + '\n' +
            (kind === 'rental' ? 'عقد إيجار — ' : 'عقد — ') + title + '\n' +
            ref + party + dates +
            attachLine +
            nafathLine +
            '\nمع تحيات إدارة الشؤون القانونية — نبراس';
    }

    function markLegalRecordSent(rec, channel, kind) {
        if (!rec) return;
        rec.lastSentAt = new Date().toISOString();
        rec.lastSentVia = channel;
        if (!rec.sendHistory) rec.sendHistory = [];
        rec.sendHistory.unshift({
            at: rec.lastSentAt,
            channel: channel,
            by: typeof getNebrasCurrentAdmin === 'function' && getNebrasCurrentAdmin()
                ? getNebrasCurrentAdmin().username : 'admin'
        });
        rec.sendHistory = rec.sendHistory.slice(0, 20);
        if (rec.status === 'draft') rec.status = 'sent';
        if (typeof saveLegalData === 'function') saveLegalData();
        if (typeof legalAudit === 'function') {
            legalAudit('إرسال عقد', (rec.title || '') + ' — ' + channel);
        }
    }

    function sendLegalContractWhatsApp(contractId, kind) {
        if (typeof requireLegalAccess === 'function' && !requireLegalAccess()) return;
        const rec = kind === 'rental' ? getLegalRentalById(contractId) : getLegalContractById(contractId);
        if (!rec) { alert('العقد غير موجود.'); return; }
        const phone = normalizeSaPhone(rec.partyPhone);
        const msg = buildContractDispatchMessage(rec, kind);
        const url = phone
            ? 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg)
            : 'https://wa.me/?text=' + encodeURIComponent(msg);
        window.open(url, '_blank', 'noopener');
        markLegalRecordSent(rec, 'whatsapp', kind);
        if (!phone) alert('لم يُدخل جوال الطرف — تم فتح واتساب بدون رقم. أضيفي الجوال في بيانات العقد.');
    }

    function sendLegalContractEmail(contractId, kind) {
        if (typeof requireLegalAccess === 'function' && !requireLegalAccess()) return;
        const rec = kind === 'rental' ? getLegalRentalById(contractId) : getLegalContractById(contractId);
        if (!rec) { alert('العقد غير موجود.'); return; }
        const to = String(rec.partyEmail || '').trim();
        const company = resolveLegalCompanyName(rec.companyId);
        const subject = (kind === 'rental' ? 'عقد إيجار — ' : 'عقد — ') + (rec.title || 'نبراس') + ' | ' + company;
        const body = buildContractDispatchMessage(rec, kind);
        const sendFn = typeof sendNebrasHrNotificationEmail === 'function' ? sendNebrasHrNotificationEmail : null;
        if (sendFn) {
            sendFn({ to: to || undefined, subject: subject, body: body, meta: { contractId: rec.id, kind: kind, type: 'legal-contract' } })
                .then(function() {
                    markLegalRecordSent(rec, 'email', kind);
                    if (typeof renderLegalPlatformPanelSafe === 'function') renderLegalPlatformPanelSafe();
                });
        } else {
            const mail = 'mailto:' + encodeURIComponent(to) +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);
            window.location.href = mail;
            markLegalRecordSent(rec, 'mailto', kind);
        }
    }

    function downloadLegalContractAttachment(contractId, kind) {
        const rec = kind === 'rental' ? getLegalRentalById(contractId) : getLegalContractById(contractId);
        if (!rec) { alert('العقد غير موجود.'); return; }
        const url = contractAttachmentUrl(rec);
        if (!url) { alert('لا يوجد مرفق للعقد — ارفعي PDF أو صورة أولاً.'); return; }
        const a = document.createElement('a');
        a.href = url;
        a.download = (rec.attachmentName || rec.title || 'nebras-contract') + (url.indexOf('.pdf') >= 0 ? '.pdf' : '');
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
    }

    function openLegalNafathForContract(contractId, kind) {
        if (typeof requireLegalAccess === 'function' && !requireLegalAccess()) return;
        const rec = kind === 'rental' ? getLegalRentalById(contractId) : getLegalContractById(contractId);
        if (!rec) return;
        rec.nafathRequired = true;
        rec.nafathRequestedAt = new Date().toISOString();
        if (typeof saveLegalData === 'function') saveLegalData();
        window.open('https://www.iam.gov.sa/nafath', '_blank', 'noopener');
        alert('تم فتح بوابة نفاذ الرسمية.\nبعد اكتمال التحقق من الطرف — فعّلي «تم التحقق عبر نفاذ» في العقد.');
        if (typeof renderLegalPlatformPanelSafe === 'function') renderLegalPlatformPanelSafe();
    }

    function markLegalNafathVerified(contractId, kind) {
        if (typeof requireLegalAccess === 'function' && !requireLegalAccess()) return;
        const rec = kind === 'rental' ? getLegalRentalById(contractId) : getLegalContractById(contractId);
        if (!rec) return;
        rec.nafathVerified = true;
        rec.nafathVerifiedAt = new Date().toISOString().slice(0, 10);
        if (typeof saveLegalData === 'function') saveLegalData();
        if (typeof legalAudit === 'function') legalAudit('نفاذ عقد', rec.title);
        if (typeof renderLegalPlatformPanelSafe === 'function') renderLegalPlatformPanelSafe();
        alert('تم تسجيل التحقق عبر نفاذ للعقد.');
    }

    function renderLegalContractDispatchCell(rec, kind) {
        kind = kind || 'contract';
        if (!rec || !rec.id) return '—';
        const sent = rec.lastSentAt
            ? '<small title="' + esc(rec.lastSentVia || '') + '"><i class="fas fa-paper-plane"></i> ' + esc((rec.lastSentAt || '').slice(0, 10)) + '</small> '
            : '';
        const nafathBadge = rec.nafathVerified
            ? '<span class="erp-tag erp-tag--ok" title="نفاذ"><i class="fas fa-fingerprint"></i></span> '
            : (rec.nafathRequired ? '<span class="erp-tag erp-tag--warn" title="نفاذ مطلوب"><i class="fas fa-fingerprint"></i></span> ' : '');
        return '<div class="legal-dispatch-actions">' + sent + nafathBadge +
            '<button type="button" class="erp-tag erp-tag--action" title="واتساب" onclick="sendLegalContractWhatsApp(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fab fa-whatsapp"></i></button> ' +
            '<button type="button" class="erp-tag erp-tag--action" title="بريد" onclick="sendLegalContractEmail(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fas fa-envelope"></i></button> ' +
            '<button type="button" class="erp-tag" title="تنزيل المرفق" onclick="downloadLegalContractAttachment(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fas fa-download"></i></button> ' +
            '<button type="button" class="erp-tag" title="طلب نفاذ" onclick="openLegalNafathForContract(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fas fa-fingerprint"></i></button>' +
            (rec.nafathRequired && !rec.nafathVerified
                ? ' <button type="button" class="erp-tag erp-tag--ok" title="تأكيد نفاذ" onclick="markLegalNafathVerified(\'' + esc(rec.id) + '\',\'' + kind + '\')"><i class="fas fa-check"></i></button>'
                : '') +
        '</div>';
    }

    global.sendLegalContractWhatsApp = sendLegalContractWhatsApp;
    global.sendLegalContractEmail = sendLegalContractEmail;
    global.downloadLegalContractAttachment = downloadLegalContractAttachment;
    global.openLegalNafathForContract = openLegalNafathForContract;
    global.markLegalNafathVerified = markLegalNafathVerified;
    global.renderLegalContractDispatchCell = renderLegalContractDispatchCell;
    global.buildContractDispatchMessage = buildContractDispatchMessage;

})(typeof window !== 'undefined' ? window : globalThis);
