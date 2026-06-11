/* Phase 22 — Governance, period purge, quote access isolation */

    function repQuoteOwnedBy(entry, admin) {
        if (!entry || !admin) return false;
        if (entry.repUserId && admin.id && String(entry.repUserId) === String(admin.id)) return true;
        const user = String(admin.username || '').trim().toLowerCase();
        if (entry.repUsername && String(entry.repUsername).toLowerCase() === user) return true;
        if (entry.by && String(entry.by).toLowerCase() === user) return true;
        return false;
    }

    function assertQuoteAccess(entry, admin) {
        admin = admin || currentAdmin;
        if (!entry || !admin) return false;
        if (isMainGovernanceAdmin(admin)) return true;
        if (typeof isStrictSalesRep === 'function' && isStrictSalesRep(admin)) {
            return repQuoteOwnedBy(entry, admin);
        }
        if (typeof adminQuoteEntryVisible === 'function') return adminQuoteEntryVisible(entry, admin);
        if (typeof filterQuotesForAdmin === 'function') {
            const scoped = filterQuotesForAdmin([entry], admin);
            return scoped.length > 0;
        }
        return canManage('sales') || canManage('quotes');
    }

    async function assertQuoteEntryAccess(entryId) {
        const entry = await resolveSalesQuoteEntry(entryId);
        if (!entry) return null;
        if (!assertQuoteAccess(entry, currentAdmin)) {
            if (typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('لا صلاحية — هذا العرض خارج نطاقك.', 'error');
            } else {
                alert('لا صلاحية — هذا العرض خارج نطاقك.');
            }
            return null;
        }
        return entry;
    }

    function purgeAnalyticsByPeriod(category, period, skipConfirm) {
        if (!requireMainGovernanceAdmin()) return 0;
        period = period || 'daily';
        const periodLabel = period === 'daily' ? 'اليوم' : (period === 'monthly' ? 'هذا الشهر' : 'هذه السنة');
        const catLabel = {
            quotes: 'عروض الأسعار',
            visitors: 'الزوار',
            sales: 'المبيعات',
            complaints: 'الشكاوى (تقرير)',
            audit: 'سجل التدقيق'
        }[category] || category;
        if (!skipConfirm && !confirm('حذف تحليلات «' + catLabel + '» لـ ' + periodLabel + '؟ لا يمكن التراجع إلا من سلة الاستعادة (إن وُجدت).')) return 0;

        let removed = 0;
        if (category === 'quotes') {
            const inbox = loadSalesQuotesInbox();
            const keep = [];
            inbox.forEach(function(entry) {
                if (entry && matchesExecutiveReportPeriod(entry, period)) {
                    archiveAnalyticsRecord('quotes', entry.id || entry.quoteNo, entry, entry.quoteNo || entry.customerName);
                    removed++;
                } else {
                    keep.push(entry);
                }
            });
            saveSalesQuotesInbox(keep);
            displaySalesQuotesInbox();
        } else if (category === 'visitors') {
            ensureVisitorAnalytics();
            const keep = [];
            (visitorAnalytics.sessions || []).forEach(function(s) {
                if (s && matchesExecutiveReportPeriod({ at: s.startedAt || s.date || s.id }, period)) {
                    archiveAnalyticsRecord('visitors', s.id, s, s.id ? String(s.id).slice(-8) : 'زائر');
                    removed++;
                } else {
                    keep.push(s);
                }
            });
            visitorAnalytics.sessions = keep;
            saveVisitorAnalyticsLocal();
        } else if (category === 'sales') {
            const keep = [];
            (salesData || []).forEach(function(s) {
                if (s && matchesExecutiveReportPeriod(s, period)) {
                    archiveAnalyticsRecord('sales', s.id || s.quoteNo, s, s.customerName || s.product);
                    removed++;
                } else {
                    keep.push(s);
                }
            });
            salesData = keep;
            saveSystemData();
            displaySales();
        } else if (category === 'complaints') {
            Object.keys(complaints || {}).forEach(function(id) {
                const c = complaints[id];
                if (c && matchesExecutiveReportPeriod({ at: c.createdAt || c.date }, period)) {
                    archiveAnalyticsRecord('complaints', id, c, c.customerName || id);
                    delete complaints[id];
                    removed++;
                }
            });
            saveSystemData();
        } else if (category === 'audit') {
            const keep = [];
            (auditLogs || []).forEach(function(log) {
                if (log && matchesExecutiveReportPeriod({ at: log.atIso || log.at }, period)) {
                    removed++;
                } else {
                    keep.push(log);
                }
            });
            auditLogs = keep;
            saveSystemData();
            if (typeof displayAuditLog === 'function') displayAuditLog();
        }

        if (!skipConfirm) {
            addAuditLog('حذف تحليلات بالفترة', catLabel + ' — ' + periodLabel + ' (' + removed + ' سجل)');
            if (typeof showNebrasAdminToast === 'function') {
                showNebrasAdminToast('تم حذف ' + removed + ' سجل — ' + catLabel + ' / ' + periodLabel, 'ok');
            }
            renderAdminAnalyticsPanel();
            if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
        }
        return removed;
    }

    function purgeAllAnalyticsByPeriod(period) {
        if (!requireMainGovernanceAdmin()) return;
        const periodLabel = period === 'daily' ? 'اليوم' : (period === 'monthly' ? 'هذا الشهر' : 'هذه السنة');
        if (!confirm('حذف كل التحليلات لـ ' + periodLabel + ' (عروض · زوار · مبيعات · شكاوى · HR)؟ الإدارة الرئيسية فقط.')) return;
        let total = 0;
        ['quotes', 'visitors', 'sales', 'complaints'].forEach(function(cat) {
            total += purgeAnalyticsByPeriod(cat, period, true) || 0;
        });
        if (typeof purgeHrAnalyticsByPeriod === 'function') purgeHrAnalyticsByPeriod(period);
        addAuditLog('حذف تحليلات شاملة', periodLabel + ' — ' + total + ' سجل منصة');
        if (typeof showNebrasAdminToast === 'function') showNebrasAdminToast('تم حذف ' + total + ' سجل تحليلات — ' + periodLabel, 'ok');
        renderAdminAnalyticsPanel();
        if (typeof refreshDashboardExecutiveBi === 'function' && currentAdmin) refreshDashboardExecutiveBi(currentAdmin);
    }

    function buildAnalyticsGovernanceToolbarHtml() {
        if (!isMainGovernanceAdmin()) return '';
        return '<div class="analytics-governance-toolbar admin-only-ui" id="analytics-governance-toolbar">' +
            '<p class="analytics-governance-title"><i class="fas fa-shield-halved"></i> حوكمة التحليلات — الإدارة الرئيسية فقط (NEBRASFACTORY)</p>' +
            '<p class="analytics-governance-hint">حذف يومي / شهري / سنوي لمنع تراكم البيانات — كل عملية تُسجّل في التدقيق.</p>' +
            '<div class="analytics-governance-period-row">' +
                '<span class="analytics-governance-period-label"><i class="fas fa-calendar-day"></i> حذف بالفترة:</span>' +
                '<button type="button" class="analytics-period-btn" onclick="purgeAllAnalyticsByPeriod(\'daily\')"><i class="fas fa-sun"></i> اليوم</button>' +
                '<button type="button" class="analytics-period-btn" onclick="purgeAllAnalyticsByPeriod(\'monthly\')"><i class="fas fa-calendar"></i> هذا الشهر</button>' +
                '<button type="button" class="analytics-period-btn" onclick="purgeAllAnalyticsByPeriod(\'yearly\')"><i class="fas fa-calendar-alt"></i> هذه السنة</button>' +
            '</div>' +
            '<div class="analytics-governance-period-row analytics-governance-period-row--cats">' +
                '<button type="button" class="analytics-period-btn analytics-period-btn--cat" onclick="purgeAnalyticsByPeriod(\'quotes\',\'daily\')">عروض — يوم</button>' +
                '<button type="button" class="analytics-period-btn analytics-period-btn--cat" onclick="purgeAnalyticsByPeriod(\'quotes\',\'monthly\')">عروض — شهر</button>' +
                '<button type="button" class="analytics-period-btn analytics-period-btn--cat" onclick="purgeAnalyticsByPeriod(\'visitors\',\'monthly\')">زوار — شهر</button>' +
                '<button type="button" class="analytics-period-btn analytics-period-btn--cat" onclick="purgeAnalyticsByPeriod(\'sales\',\'monthly\')">مبيعات — شهر</button>' +
                '<button type="button" class="analytics-period-btn analytics-period-btn--cat" onclick="purgeAnalyticsByPeriod(\'audit\',\'monthly\')">تدقيق — شهر</button>' +
            '</div>' +
            '<div class="analytics-governance-btns">' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsQuotes()"><i class="fas fa-file-invoice"></i> إفراغ كل العروض</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsTransfers()"><i class="fas fa-receipt"></i> إفراغ الحوالات</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsCustomers()"><i class="fas fa-users"></i> إفراغ العملاء</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsVisitors()"><i class="fas fa-eye"></i> إفراغ الزوار</button>' +
                '<button type="button" class="analytics-clear-btn" onclick="clearAllAnalyticsComplaints()"><i class="fas fa-exclamation-circle"></i> إفراغ الشكاوى</button>' +
                '<button type="button" class="analytics-restore-btn analytics-restore-btn--all" onclick="restoreAllAnalyticsRecords()"><i class="fas fa-trash-restore"></i> Restore الكل</button>' +
                '<button type="button" class="analytics-delete-btn analytics-delete-btn--bin" onclick="emptyAnalyticsRestoreBin()"><i class="fas fa-trash"></i> سلة الاستعادة</button>' +
            '</div></div>';
    }

    function renderUserScopeLockBanner(user) {
        user = user || currentAdmin;
        if (!user || isMainGovernanceAdmin(user)) return '';
        const def = getRoleDefinition(user.isPrimary ? 'superadmin' : user.role) || {};
        const perms = getUserEffectivePermissions(user);
        const permLabels = perms.map(function(k) { return NEBRAS_PERMISSION_LABELS[k] || k; }).join(' · ') || '—';
        let scopeLine = '';
        if (user.assignedBranchCity) scopeLine = 'الفرع: ' + user.assignedBranchCity;
        else if (user.hrScopeDepartmentKey && typeof getHrFactoryDepts === 'function') {
            scopeLine = 'قسم HR: ' + (getHrFactoryDepts()[user.hrScopeDepartmentKey] || user.hrScopeDepartmentKey);
        } else if (typeof isStrictSalesRep === 'function' && isStrictSalesRep(user)) {
            scopeLine = 'مندوب مبيعات — عروضك فقط';
        }
        return '<div class="user-scope-lock-banner" role="status">' +
            '<i class="fas fa-user-lock"></i>' +
            '<div><strong>حسابك: ' + escapeHtmlAttr(user.username) + ' — ' + escapeHtmlAttr(def.labelAr || user.role) + '</strong>' +
            '<span>صلاحياتك: ' + escapeHtmlAttr(permLabels) + '</span>' +
            (scopeLine ? '<small>' + escapeHtmlAttr(scopeLine) + ' — لا ترى بيانات مستخدمين آخرين</small>' : '<small>لا ترى بيانات خارج صلاحياتك</small>') +
            '</div></div>';
    }
