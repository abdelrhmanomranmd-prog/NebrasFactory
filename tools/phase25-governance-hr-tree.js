/* Phase 25 — Cloud-delete guard + analytics hardening + HR org tree */

    let nebrasGovernanceMutationAt = 0;

    function markGovernanceMutation() {
        nebrasGovernanceMutationAt = Date.now();
    }

    function shouldSkipStaleCloudGovernanceRow(storeKey) {
        if (storeKey !== 'analytics_governance' && storeKey !== 'sales_quotes_inbox') return false;
        return (Date.now() - nebrasGovernanceMutationAt) < 45000;
    }

    function wrapAnalyticsGovernanceHandler(fnName, fn) {
        return function() {
            try {
                if (typeof requireMainGovernanceAdmin === 'function' && !requireMainGovernanceAdmin()) return;
                return fn.apply(this, arguments);
            } catch (err) {
                console.error(fnName, err);
                if (typeof showNebrasAdminToast === 'function') {
                    showNebrasAdminToast('خطأ في «' + fnName + '» — ' + (err && err.message ? err.message : 'أعيدي المحاولة'), 'error');
                } else {
                    alert('خطأ في «' + fnName + '» — أعيدي تحميل الصفحة.');
                }
            }
        };
    }

    async function clearAllAnalyticsTransfersAsync() {
        if (!requireMainGovernanceAdmin()) return;
        const all = await mergeAllQuotesForGovernanceAsync();
        const transferEntries = all.filter(function(e) {
            return e && (e.transferReceiptDataUrl || e.transferDeclared);
        });
        if (!transferEntries.length) { alert('لا حوالات لإفراغها.'); return; }
        if (!confirm('إفراغ تقرير الحوالات (' + transferEntries.length + ')؟')) return;
        transferEntries.forEach(function(entry) { archiveAnalyticsQuoteKeys(entry); });
        const keep = loadSalesQuotesInbox().filter(function(e) {
            return !e || (!e.transferReceiptDataUrl && !e.transferDeclared);
        });
        saveSalesQuotesInbox(keep);
        markGovernanceMutation();
        finalizeAnalyticsGovernanceMutation('إفراغ الحوالات', String(transferEntries.length));
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم إفراغ ' + transferEntries.length + ' حوالة', 'ok');
        displaySalesQuotesInbox();
        renderAdminAnalyticsPanel();
    }

    function clearAllAnalyticsTransfers() {
        clearAllAnalyticsTransfersAsync().catch(function(err) {
            console.warn('clearAllAnalyticsTransfers', err);
            alert('تعذّر إفراغ الحوالات.');
        });
    }

    async function clearAllAnalyticsCustomersAsync() {
        if (!requireMainGovernanceAdmin()) return;
        const all = await mergeAllQuotesForGovernanceAsync();
        if (!all.length && !(salesData || []).length) { alert('لا بيانات عملاء لإفراغها.'); return; }
        if (!confirm('إفراغ تقرير العملاء؟ (' + all.length + ' عرض + ' + (salesData || []).length + ' مبيعات)')) return;
        all.forEach(function(entry) { archiveAnalyticsQuoteKeys(entry); });
        (salesData || []).slice().forEach(function(s) {
            archiveAnalyticsRecord('sales', s.id || s.quoteNo, s, s.customerName || s.product);
        });
        saveSalesQuotesInbox([]);
        salesData = [];
        markGovernanceMutation();
        finalizeAnalyticsGovernanceMutation('إفراغ العملاء', String(all.length));
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم إفراغ تقرير العملاء', 'ok');
        displaySales();
        renderAdminAnalyticsPanel();
    }

    function clearAllAnalyticsCustomers() {
        clearAllAnalyticsCustomersAsync().catch(function(err) {
            console.warn('clearAllAnalyticsCustomers', err);
            alert('تعذّر إفراغ العملاء.');
        });
    }
