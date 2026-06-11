/* Phase 24 — Analytics purge (cloud+local) + HR platform open reliability */

    function closeAllAdminSections() {
        document.querySelectorAll('.admin-section.show').forEach(function(el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        });
        document.body.classList.remove('hr-platform-open');
    }

    async function mergeAllQuotesForGovernanceAsync() {
        const local = typeof loadSalesQuotesInbox === 'function' ? loadSalesQuotesInbox() : [];
        let cloud = [];
        if (typeof fetchSalesQuotesFromCloud === 'function') {
            try { cloud = await fetchSalesQuotesFromCloud(); } catch (e) { cloud = []; }
        }
        const merged = [];
        const seen = {};
        cloud.concat(local).forEach(function(e) {
            if (!e) return;
            const key = String(e.quoteNo || e.id || '').trim();
            if (!key || seen[key]) return;
            seen[key] = true;
            merged.push(e);
        });
        return merged;
    }

    function archiveAnalyticsQuoteKeys(entry) {
        if (!entry || typeof archiveAnalyticsRecord !== 'function') return;
        const label = entry.quoteNo || entry.customerName || entry.id || 'عرض';
        const keys = [];
        ['id', 'quoteNo', 'cloudId'].forEach(function(field) {
            const k = entry[field];
            if (k && keys.indexOf(String(k)) < 0) keys.push(String(k));
        });
        if (!keys.length) return;
        keys.forEach(function(k) {
            archiveAnalyticsRecord('quotes', k, entry, label);
        });
    }

    function finalizeAnalyticsGovernanceMutation(actionLabel, detail) {
        if (typeof persistAnalyticsGovernanceLocal === 'function') persistAnalyticsGovernanceLocal();
        if (typeof saveSystemData === 'function') saveSystemData();
        if (actionLabel && typeof addAuditLog === 'function') addAuditLog(actionLabel, detail || '');
        if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    async function purgeAnalyticsQuotesByPeriod(period, skipConfirm) {
        if (!requireMainGovernanceAdmin()) return 0;
        const all = await mergeAllQuotesForGovernanceAsync();
        let removed = 0;
        all.forEach(function(entry) {
            if (!entry || !matchesExecutiveReportPeriod(entry, period)) return;
            const key = entry.id || entry.quoteNo;
            if (key && typeof isAnalyticsItemDeleted === 'function' && isAnalyticsItemDeleted('quotes', key)) return;
            archiveAnalyticsQuoteKeys(entry);
            removed++;
        });
        const keepLocal = (typeof loadSalesQuotesInbox === 'function' ? loadSalesQuotesInbox() : []).filter(function(entry) {
            return !(entry && matchesExecutiveReportPeriod(entry, period));
        });
        if (typeof saveSalesQuotesInbox === 'function') saveSalesQuotesInbox(keepLocal);
        if (typeof displaySalesQuotesInbox === 'function') displaySalesQuotesInbox();
        finalizeAnalyticsGovernanceMutation('حذف عروض بالفترة', String(removed));
        return removed;
    }

    async function clearAllAnalyticsQuotesAsync() {
        if (!requireMainGovernanceAdmin()) return;
        const all = await mergeAllQuotesForGovernanceAsync();
        if (!all.length) {
            alert('لا عروض أسعار لإفراغها.');
            return;
        }
        if (!confirm('إفراغ كل عروض الأسعار من التقارير (' + all.length + ')؟ تُحفظ في سلة الاستعادة.')) return;
        all.forEach(function(entry) { archiveAnalyticsQuoteKeys(entry); });
        if (typeof saveSalesQuotesInbox === 'function') saveSalesQuotesInbox([]);
        if (typeof displaySalesQuotesInbox === 'function') displaySalesQuotesInbox();
        finalizeAnalyticsGovernanceMutation('إفراغ كل العروض', String(all.length));
        if (typeof showNebrasAdminToast === 'function') {
            showNebrasAdminToast('تم إفراغ ' + all.length + ' عرض سعر من التحليلات', 'ok');
        }
        if (typeof renderAdminAnalyticsPanel === 'function') renderAdminAnalyticsPanel();
        if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
    }

    function clearAllAnalyticsQuotes() {
        clearAllAnalyticsQuotesAsync().catch(function(err) {
            console.warn('clearAllAnalyticsQuotes', err);
            alert('تعذّر إفراغ العروض — أعيدي تحميل الصفحة وحاولي مرة أخرى.');
        });
    }
