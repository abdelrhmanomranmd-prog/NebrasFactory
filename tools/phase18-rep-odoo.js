/* Phase 18 — Sales rep quotes-only + rep quote library + Odoo-like persistence helpers */

    const ANALYTICS_GOVERNANCE_KEY = 'nebrasAnalyticsGovernance';

    function normalizeAdminUserRecord(user, index) {
        const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
        const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
            PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
        let perms = Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null;
        if (role === 'sales_rep' && !isPrimary) perms = ['quotes'];
        return {
            id: user && user.id ? user.id : 'user-' + Date.now() + '-' + index,
            username: user && user.username ? user.username : 'user' + (index + 1),
            password: user && user.password ? user.password : 'ChangeMe123',
            role: role,
            permissions: perms,
            assignedBranchCity: (user && user.assignedBranchCity) ? String(user.assignedBranchCity).trim() : '',
            assignedBranchId: user && user.assignedBranchId != null && user.assignedBranchId !== '' ? user.assignedBranchId : null,
            hrScopeBranchId: user && user.hrScopeBranchId ? String(user.hrScopeBranchId).trim() : '',
            hrScopeDepartmentKey: user && user.hrScopeDepartmentKey ? String(user.hrScopeDepartmentKey).trim() : '',
            isPrimary: !!isPrimary
        };
    }

    function canAccessQuoteDocumentOps() {
        return canManage('sales') || canManage('quotes');
    }

    function isStrictSalesRep(admin) {
        admin = admin || currentAdmin;
        return !!(admin && admin.role === 'sales_rep' && !admin.isPrimary && !isMainGovernanceAdmin(admin));
    }

    function repQuoteOwnedBy(entry, admin) {
        if (!entry || !admin) return false;
        const user = String(admin.username || '').trim().toLowerCase();
        if (entry.repUsername && String(entry.repUsername).toLowerCase() === user) return true;
        if (entry.by && String(entry.by).toLowerCase() === user) return true;
        return false;
    }

    function getRepQuoteHistory(admin) {
        admin = admin || currentAdmin;
        const inbox = (typeof loadSalesQuotesInbox === 'function') ? (loadSalesQuotesInbox() || []) : [];
        return inbox.filter(function(e) {
            return (e.quoteKind === 'rep-built' || e.quoteType === 'quote') && repQuoteOwnedBy(e, admin);
        }).sort(function(a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
    }

    async function getMergedRepQuoteHistory(admin) {
        admin = admin || currentAdmin;
        let cloud = [];
        try {
            if (typeof fetchSalesQuotesFromCloud === 'function') cloud = await fetchSalesQuotesFromCloud();
        } catch (e) { cloud = []; }
        const local = (typeof loadSalesQuotesInbox === 'function') ? (loadSalesQuotesInbox() || []) : [];
        const merged = [];
        const seen = {};
        cloud.concat(local).forEach(function(e) {
            const key = e.quoteNo || e.id;
            if (!key || seen[key]) return;
            if (!repQuoteOwnedBy(e, admin)) return;
            seen[key] = true;
            merged.push(e);
        });
        return merged.sort(function(a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });
    }

    function renderRepMyQuotesSection() {
        const history = getRepQuoteHistory(currentAdmin);
        if (!history.length) {
            return '<div class="rep-quotes-library"><h4><i class="fas fa-folder-open"></i> عروضي المحفوظة</h4><p class="erp-empty">لا عروض محفوظة بعد — أنشئ عرضاً واحفظه أو نزّل PDF.</p></div>';
        }
        const rows = history.slice(0, 30).map(function(e) {
            const key = String(e.id).replace(/'/g, "\\'");
            const when = typeof formatNebrasDateTime === 'function' ? formatNebrasDateTime(e.at, currentLang) : (e.at || '');
            const total = typeof formatSar === 'function' ? formatSar(e.totalIncVat || e.total || 0) : String(e.totalIncVat || e.total || 0);
            return '<tr><td><strong>' + escapeHtmlAttr(e.quoteNo || '—') + '</strong></td>' +
                '<td>' + escapeHtmlAttr(e.customerName || '—') + '</td>' +
                '<td>' + escapeHtmlAttr(when) + '</td>' +
                '<td>' + escapeHtmlAttr(total) + '</td>' +
                '<td class="rep-quotes-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="previewRepQuoteEntryA4(\'' + key + '\')"><i class="fas fa-eye"></i></button>' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="downloadRepQuoteEntryPdf(\'' + key + '\')"><i class="fas fa-file-pdf"></i></button>' +
                '</td></tr>';
        }).join('');
        return '<div class="rep-quotes-library">' +
            '<h4><i class="fas fa-folder-open"></i> عروضي المحفوظة <span class="rep-quotes-count">' + history.length + '</span></h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table rep-quotes-table"><thead><tr>' +
            '<th>رقم العرض</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th>إجراء</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    }

    async function previewRepQuoteEntryA4(entryId) {
        if (!requirePermission('quotes', 'صلاحية عروض الأسعار مطلوبة.')) return;
        const entry = await resolveSalesQuoteEntry(entryId);
        if (!entry || !repQuoteOwnedBy(entry, currentAdmin)) {
            alert('العرض غير موجود أو لا يخصك.');
            return;
        }
        openSalesQuoteA4Preview(entry, { allowEmpty: true, repAccess: true });
    }

    async function downloadRepQuoteEntryPdf(entryId) {
        if (!requirePermission('quotes', 'صلاحية عروض الأسعار مطلوبة.')) return;
        const entry = await resolveSalesQuoteEntry(entryId);
        if (!entry || !repQuoteOwnedBy(entry, currentAdmin)) {
            alert('العرض غير موجود أو لا يخصك.');
            return;
        }
        const snap = snapshotQuoteRenderContext();
        try {
            applySalesEntryToQuoteRender(entry, { allowEmpty: true });
            const rendered = await ensureQuoteA4Rendered({ allowEmpty: true });
            if (!rendered) { alert('تعذّر تجهيز المستند.'); return; }
            const pdfBlob = await captureQuoteA4AsPdfBlob();
            if (!pdfBlob) { alert('تعذّر إنشاء PDF.'); return; }
            triggerQuoteFileDownload(pdfBlob, (entry.quoteNo || 'quote') + '-a4-4pages.pdf');
            addAuditLog('تصدير PDF عرض مندوب', (entry.quoteNo || entryId));
        } catch (pdfErr) {
            console.warn('downloadRepQuoteEntryPdf failed:', pdfErr);
            alert('تعذّر تنزيل PDF.');
        } finally {
            restoreQuoteRenderContext(snap);
            const overlay = document.getElementById('quote-print-overlay');
            if (overlay) overlay.classList.remove('show');
            setSalesQuotePreviewMode(false);
        }
    }

    function openRepMyQuotes() {
        if (!requirePermission('quotes')) return;
        openRepQuoteBuilder();
        setTimeout(function() {
            const lib = document.querySelector('.rep-quotes-library');
            if (lib) lib.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }

    function loadQuoteRegistryForCloud() {
        return loadQuoteRegistry();
    }

    function setQuoteRegistryFromCloud(v) {
        try {
            const reg = v && typeof v === 'object' ? v : { byDate: {} };
            if (!reg.byDate || typeof reg.byDate !== 'object') reg.byDate = {};
            saveQuoteRegistry(reg);
        } catch (e) { console.warn('quote registry cloud set', e); }
    }

    function persistAnalyticsGovernanceLocal() {
        try {
            ensureAnalyticsGovernance();
            localStorage.setItem(ANALYTICS_GOVERNANCE_KEY, JSON.stringify(analyticsGovernance));
        } catch (e) { console.warn('analytics governance local save', e); }
    }

    function loadAnalyticsGovernanceLocal() {
        try {
            const raw = localStorage.getItem(ANALYTICS_GOVERNANCE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    analyticsGovernance = parsed;
                    ensureAnalyticsGovernance();
                }
            }
        } catch (e) { console.warn('analytics governance local load', e); }
    }
