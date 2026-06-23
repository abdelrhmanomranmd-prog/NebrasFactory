/**
 * نبراس يتصل بك — طلب اتصال فوري من الزائر → الإدارة الرئيسية والفروع
 */
(function(global) {
    'use strict';

    const CALLBACK_LEADS_KEY = 'nebrasCallbackLeads';
    let callbackLeads = [];

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadCallbackLeads() {
        try {
            const raw = localStorage.getItem(CALLBACK_LEADS_KEY);
            callbackLeads = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(callbackLeads)) callbackLeads = [];
        } catch (e) {
            callbackLeads = [];
        }
        return callbackLeads;
    }

    function saveCallbackLeads(options) {
        options = options || {};
        try {
            localStorage.setItem(CALLBACK_LEADS_KEY, JSON.stringify(callbackLeads));
        } catch (e) { /* ignore */ }
        if (!options.skipCloud && typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function resolveBranchIdFromSelection(branchKey) {
        if (!branchKey || branchKey === 'hq') return null;
        const id = parseInt(branchKey, 10);
        if (!isNaN(id) && typeof branchesData !== 'undefined' && Array.isArray(branchesData)) {
            const found = branchesData.find(function(b) { return b && Number(b.id) === id; });
            if (found) return id;
        }
        return null;
    }

    function getBranchLabelFromLead(lead) {
        if (!lead) return '—';
        if (lead.branchId != null && typeof getBranchNameById === 'function') {
            return getBranchNameById(lead.branchId, 'ar') || lead.city || '—';
        }
        return lead.city || 'القصيم — المقر';
    }

    function filterCallbackLeadsForAdmin(leads, admin) {
        if (typeof filterQuotesForAdmin === 'function' && typeof getAdminAssignedBranchId === 'function') {
            const bid = getAdminAssignedBranchId(admin);
            if (bid == null) return leads || [];
            return (leads || []).filter(function(lead) {
                return typeof entryMatchesBranchId === 'function' ? entryMatchesBranchId(lead, bid) : true;
            });
        }
        return leads || [];
    }

    function populateCallbackBranchSelect() {
        const sel = document.getElementById('callback-branch-select');
        if (!sel) return;
        const branches = (typeof branchesData !== 'undefined' && Array.isArray(branchesData)) ? branchesData : [];
        let html = '<option value="hq">القصيم — المقر الرئيسي (عنيزة)</option>';
        branches.forEach(function(b) {
            if (!b || !b.id) return;
            const name = (typeof getBranchDisplayName === 'function') ? getBranchDisplayName(b, 'ar') : (b.city || '');
            html += '<option value="' + esc(String(b.id)) + '">' + esc(name) + '</option>';
        });
        sel.innerHTML = html;
    }

    function openNebrasCallbackConcierge() {
        const overlay = document.getElementById('nebras-callback-overlay');
        const form = document.getElementById('nebras-callback-form-wrap');
        const success = document.getElementById('nebras-callback-success-wrap');
        if (!overlay) return;
        populateCallbackBranchSelect();
        if (form) form.hidden = false;
        if (success) success.hidden = true;
        const status = document.getElementById('nebras-callback-status');
        if (status) status.textContent = '';
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        const nameInput = document.getElementById('callback-visitor-name');
        if (nameInput) nameInput.focus();
    }

    function closeNebrasCallbackConcierge() {
        const overlay = document.getElementById('nebras-callback-overlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
    }

    async function submitNebrasCallbackLead() {
        const nameEl = document.getElementById('callback-visitor-name');
        const phoneEl = document.getElementById('callback-visitor-phone');
        const branchEl = document.getElementById('callback-branch-select');
        const needEl = document.getElementById('callback-visitor-need');
        const statusEl = document.getElementById('nebras-callback-status');
        const name = nameEl ? String(nameEl.value || '').trim() : '';
        const phone = phoneEl ? String(phoneEl.value || '').trim() : '';
        const branchKey = branchEl ? String(branchEl.value || 'hq') : 'hq';
        const need = needEl ? String(needEl.value || '').trim() : '';
        if (!name || name.length < 2) {
            if (statusEl) statusEl.textContent = 'يرجى إدخال الاسم.';
            return;
        }
        if (!phone || phone.replace(/\D/g, '').length < 9) {
            if (statusEl) statusEl.textContent = 'يرجى إدخال رقم جوال صحيح.';
            return;
        }
        const branchId = resolveBranchIdFromSelection(branchKey);
        const branch = branchId != null && typeof branchesData !== 'undefined'
            ? branchesData.find(function(b) { return b && Number(b.id) === branchId; })
            : null;
        const city = branch ? (branch.city || '') : 'عنيزة — المقر';
        const lead = {
            id: 'cb-' + Date.now(),
            customerName: name,
            phone: phone,
            city: city,
            branchId: branchId,
            need: need,
            status: 'new',
            createdAt: Date.now(),
            sessionId: (typeof getVisitorSessionId === 'function') ? getVisitorSessionId() : ''
        };
        loadCallbackLeads();
        callbackLeads.unshift(lead);
        try {
            localStorage.setItem(CALLBACK_LEADS_KEY, JSON.stringify(callbackLeads));
        } catch (e) { /* ignore */ }

        let cloudOk = false;
        if (typeof global.submitNebrasVisitorIntake === 'function') {
            const cloudRes = await global.submitNebrasVisitorIntake('callback_lead', lead);
            cloudOk = !!(cloudRes && cloudRes.ok);
            if (statusEl) {
                statusEl.textContent = cloudOk
                    ? '✓ تم إرسال طلبك للإدارة — سيتواصل معك الفريق قريباً.'
                    : 'تم حفظ طلبك محلياً — تحققي من الاتصال بالإنترنت.';
            }
        } else if (typeof schedulePushToNebrasCloud === 'function') {
            schedulePushToNebrasCloud();
        }
        if (typeof addAuditLog === 'function') addAuditLog('طلب اتصال زائر', name + ' · ' + phone + ' · ' + city);
        const form = document.getElementById('nebras-callback-form-wrap');
        const success = document.getElementById('nebras-callback-success-wrap');
        const card = document.getElementById('nebras-callback-success-card');
        if (form) form.hidden = true;
        if (success) success.hidden = false;
        if (card) {
            card.innerHTML =
                '<p><strong>الاسم:</strong> ' + esc(name) + '</p>' +
                '<p><strong>الجوال:</strong> <span dir="ltr">' + esc(phone) + '</span></p>' +
                '<p><strong>الفرع:</strong> ' + esc(city) + '</p>' +
                (need ? '<p><strong>الاحتياج:</strong> ' + esc(need) + '</p>' : '') +
                '<p class="nebras-callback-promise">فريق المبيعات أو خدمة العملاء سيتواصل معك قريباً.</p>';
        }
        if (typeof renderAdminAnalyticsPanel === 'function' && typeof currentAdmin !== 'undefined' && currentAdmin) {
            renderAdminAnalyticsPanel();
        }
    }

    function markCallbackLeadStatus(leadId, status) {
        if (typeof requirePermission === 'function' && !requirePermission('sales') && !requirePermission('customerService')) return;
        loadCallbackLeads();
        const lead = callbackLeads.find(function(l) { return l && l.id === leadId; });
        if (!lead) return;
        lead.status = status;
        lead.updatedAt = Date.now();
        saveCallbackLeads();
        if (typeof renderAdminAnalyticsPanel === 'function') renderAdminAnalyticsPanel();
    }

    function buildCallbackLeadsReportHtml(admin) {
        loadCallbackLeads();
        const scoped = filterCallbackLeadsForAdmin(callbackLeads, admin);
        if (!scoped.length) {
            return '<p class="analytics-empty">لا طلبات اتصال بعد — سيظهر هنا عندما يطلب الزائر «نبراس يتصل بك».</p>';
        }
        const rows = scoped.map(function(lead) {
            const st = lead.status || 'new';
            const stLabel = st === 'called' ? 'تم الاتصال' : (st === 'done' ? 'مكتمل' : 'جديد');
            const date = (typeof formatNebrasDateTime === 'function')
                ? formatNebrasDateTime(new Date(lead.createdAt || 0), 'ar', { dateStyle: 'short', timeStyle: 'short' })
                : new Date(lead.createdAt || 0).toLocaleString('ar-SA');
            return '<tr>' +
                '<td>' + esc(date) + '</td>' +
                '<td><strong>' + esc(lead.customerName) + '</strong><br><span dir="ltr">' + esc(lead.phone) + '</span></td>' +
                '<td>' + esc(getBranchLabelFromLead(lead)) + '</td>' +
                '<td>' + esc(lead.need || '—') + '</td>' +
                '<td><span class="callback-lead-status callback-lead-status--' + esc(st) + '">' + esc(stLabel) + '</span></td>' +
                '<td class="scm-row-actions">' +
                '<button type="button" onclick="markCallbackLeadStatus(\'' + esc(lead.id) + '\',\'called\')">اتصلت</button> ' +
                '<button type="button" onclick="markCallbackLeadStatus(\'' + esc(lead.id) + '\',\'done\')">تم</button></td></tr>';
        }).join('');
        return '<table class="callback-leads-table"><thead><tr>' +
            '<th>التاريخ</th><th>العميل</th><th>الفرع</th><th>الاحتياج</th><th>الحالة</th><th>إجراء</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function openCallbackLeadsAdmin() {
        if (typeof openAdminAnalytics === 'function') {
            openAdminAnalytics();
            setTimeout(function() {
                const el = document.getElementById('callback-leads-panel');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 400);
        }
    }

    function initNebrasCallbackConcierge() {
        loadCallbackLeads();
        const fab = document.getElementById('nebras-callback-fab');
        if (fab && !fab.dataset.bound) {
            fab.dataset.bound = '1';
            fab.addEventListener('click', openNebrasCallbackConcierge);
        }
        const overlay = document.getElementById('nebras-callback-overlay');
        if (overlay && !overlay.dataset.bound) {
            overlay.dataset.bound = '1';
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) closeNebrasCallbackConcierge();
            });
        }
    }

    global.CALLBACK_LEADS_KEY = CALLBACK_LEADS_KEY;
    global.loadCallbackLeads = loadCallbackLeads;
    global.saveCallbackLeads = saveCallbackLeads;
    global.getCallbackLeads = function() { loadCallbackLeads(); return callbackLeads.slice(); };
    global.setCallbackLeadsFromCloud = function(data) {
        if (Array.isArray(data)) callbackLeads = data;
    };
    global.openNebrasCallbackConcierge = openNebrasCallbackConcierge;
    global.closeNebrasCallbackConcierge = closeNebrasCallbackConcierge;
    global.submitNebrasCallbackLead = submitNebrasCallbackLead;
    global.markCallbackLeadStatus = markCallbackLeadStatus;
    global.buildCallbackLeadsReportHtml = buildCallbackLeadsReportHtml;
    global.filterCallbackLeadsForAdmin = filterCallbackLeadsForAdmin;
    global.openCallbackLeadsAdmin = openCallbackLeadsAdmin;
    global.initNebrasCallbackConcierge = initNebrasCallbackConcierge;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNebrasCallbackConcierge);
    } else {
        initNebrasCallbackConcierge();
    }
})(typeof window !== 'undefined' ? window : globalThis);
