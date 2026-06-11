/* Phase 20 — Executive BI charts for main administration */

    function renderNebrasBiChart(items, emptyMsg) {
        items = items || [];
        if (!items.length) return '<p class="analytics-empty">' + escapeHtmlAttr(emptyMsg || 'لا بيانات') + '</p>';
        const max = Math.max.apply(null, items.map(function(x) { return Number(x.val) || 0; }).concat([1]));
        const bars = items.map(function(it) {
            const pct = Math.round((Number(it.val) || 0) / max * 100);
            return '<div class="nebras-bi-bar-row">' +
                '<span class="nebras-bi-bar-label">' + escapeHtmlAttr(it.label) + '</span>' +
                '<div class="nebras-bi-bar-track"><div class="nebras-bi-bar-fill" style="width:' + pct + '%"></div></div>' +
                '<strong class="nebras-bi-bar-val">' + escapeHtmlAttr(String(it.val)) + '</strong></div>';
        }).join('');
        return '<div class="nebras-bi-chart">' + bars + '</div>';
    }

    /* buildMainAdminExecutiveBiHtml — moved to phase21-admin-polish.js */

    function collectFleetStatsForBi() {
        let onRoad = 0, total = 0;
        try {
            if (typeof getHrVehicles === 'function') total = getHrVehicles().length;
            if (typeof getHrVehicleTracking === 'function') {
                onRoad = getHrVehicleTracking().filter(function(t) { return t.status === 'on_road'; }).length;
            }
        } catch (e) { /* ignore */ }
        return { onRoad: onRoad, total: total };
    }

    function collectSalesRepStatsForBi() {
        const reps = adminUsers.filter(function(u) { return u.role === 'sales_rep'; }).length;
        let repQuotes = 0;
        try {
            const inbox = typeof loadSalesQuotesInbox === 'function' ? (loadSalesQuotesInbox() || []) : [];
            repQuotes = inbox.filter(function(q) { return q.quoteKind === 'rep-built' || q.repUsername; }).length;
        } catch (e) { /* ignore */ }
        return { reps: reps, repQuotes: repQuotes };
    }
