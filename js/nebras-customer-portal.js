/**
 * نبراس — بوابة العملاء (Customer Portal)
 * كل عميل: مستخدم خاص · لوحة عروضه · طلباته · حوالاته · خصوصية كاملة
 * الإنشاء: الإدارة الرئيسية + مدير المبيعات + مدير الفرع + مندوب المبيعات (createCustomerUser)
 */
(function(global) {
    'use strict';

    const CP_USERS_KEY = 'nebrasCustomerPortalUsers';
    const CP_AUDIT_KEY = 'nebrasCustomerPortalAudit';
    const CP_SESSION_KEY = 'nebrasCustomerPortalSession';

    let customerPortalUsers = [];
    let customerPortalAudit = [];
    let currentPortalCustomer = null;
    let cpEditorState = null;
    let cpDataReady = false;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

    function normPhone(p) {
        return String(p || '').replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(-9);
    }
    function normText(t) {
        return String(t || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function hashPw(pw) {
        if (typeof global.storeNebrasPasswordValue === 'function') return global.storeNebrasPasswordValue(pw);
        return String(pw || '');
    }
    function verifyPw(stored, input) {
        if (typeof global.verifyNebrasPassword === 'function') return global.verifyNebrasPassword(stored, input);
        return String(stored) === String(input);
    }

    function loadCpData() {
        if (cpDataReady) return;
        try {
            const u = localStorage.getItem(CP_USERS_KEY);
            customerPortalUsers = u ? JSON.parse(u) : [];
            if (!Array.isArray(customerPortalUsers)) customerPortalUsers = [];
        } catch (e) { customerPortalUsers = []; }
        try {
            const a = localStorage.getItem(CP_AUDIT_KEY);
            customerPortalAudit = a ? JSON.parse(a) : [];
            if (!Array.isArray(customerPortalAudit)) customerPortalAudit = [];
        } catch (e) { customerPortalAudit = []; }
        cpDataReady = true;
    }

    const CP_DEFAULT_ACCESS = ['quotes', 'orders', 'transfers', 'journeys'];

    function readCpPortalAccessFromEditor(user) {
        const base = (user && Array.isArray(user.portalAccess) && user.portalAccess.length)
            ? user.portalAccess.slice() : CP_DEFAULT_ACCESS.slice();
        if (!canManageCustomerPortalUsers()) return base;
        const picked = [];
        CP_DEFAULT_ACCESS.forEach(function(key) {
            const el = document.getElementById('cp-e-access-' + key);
            if (!el || el.checked) picked.push(key);
        });
        return picked.length ? picked : CP_DEFAULT_ACCESS.slice();
    }

    function buildCpAccessFieldsHtml(user) {
        if (!canManageCustomerPortalUsers()) return '';
        const access = (user && Array.isArray(user.portalAccess) && user.portalAccess.length)
            ? user.portalAccess : CP_DEFAULT_ACCESS;
        const labels = {
            quotes: 'عرض عروض الأسعار',
            orders: 'عرض الطلبات',
            transfers: 'عرض الحوالات',
            journeys: 'تتبع رحلة الطلب'
        };
        const boxes = CP_DEFAULT_ACCESS.map(function(key) {
            const on = access.indexOf(key) >= 0 ? ' checked' : '';
            return '<label class="nebras-check"><input type="checkbox" id="cp-e-access-' + key + '"' + on + '> ' + esc(labels[key] || key) + '</label>';
        }).join('');
        return '<div class="nebras-field nebras-field--full"><span>صلاحيات بوابة العميل</span><div class="nebras-check-grid">' + boxes + '</div></div>';
    }

    async function hydrateCpUsersFromCloud() {
        if (typeof global.ensureNebrasCloudSessionReady === 'function' &&
            typeof global.getNebrasSecureToken === 'function' && !global.getNebrasSecureToken()) {
            try { await global.ensureNebrasCloudSessionReady({ promptReauth: false }); } catch (e) { /* ignore */ }
        }
        if (typeof global.secureCloudPull !== 'function' || typeof global.getNebrasSecureToken !== 'function') return false;
        if (!global.getNebrasSecureToken()) return false;
        try {
            const rows = await global.secureCloudPull(['customer_portal_users']);
            const row = (rows || []).find(function(r) { return r && r.store_key === 'customer_portal_users'; });
            if (row && Array.isArray(row.payload)) {
                setCustomerPortalUsersFromCloud(row.payload);
                return true;
            }
        } catch (e) { console.warn('hydrateCpUsersFromCloud:', e); }
        return false;
    }

    function saveCpData() {
        try { localStorage.setItem(CP_USERS_KEY, JSON.stringify(customerPortalUsers)); } catch (e) { /* ignore */ }
        if (typeof global.markLocalCloudMutationBatch === 'function') {
            global.markLocalCloudMutationBatch(['customer_portal_users']);
        }
        if (typeof global.markSensitiveCloudPending === 'function') global.markSensitiveCloudPending();
        if (typeof global.syncNebrasCloudInBackground === 'function') global.syncNebrasCloudInBackground();
    }

    function saveCpAuditLocal() {
        try { localStorage.setItem(CP_AUDIT_KEY, JSON.stringify(customerPortalAudit.slice(0, 500))); } catch (e) { /* ignore */ }
    }

    function cpAudit(action, detail) {
        customerPortalAudit.unshift({
            id: 'cpa-' + Date.now(),
            at: new Date().toISOString(),
            action: action,
            detail: detail || '',
            by: currentPortalCustomer ? currentPortalCustomer.username : (typeof currentAdmin !== 'undefined' && currentAdmin ? currentAdmin.username : 'system')
        });
        saveCpAuditLocal();
    }

    function resolveCpAdminUser(user) {
        if (user) return user;
        if (typeof global.getNebrasCurrentAdmin === 'function') {
            const fromPlatform = global.getNebrasCurrentAdmin();
            if (fromPlatform) return fromPlatform;
        }
        try {
            if (typeof currentAdmin !== 'undefined' && currentAdmin) return currentAdmin;
        } catch (e) { /* ignore */ }
        return null;
    }

    function canManageCustomerPortalUsers(user) {
        user = resolveCpAdminUser(user);
        if (!user) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(user)) return true;
        if (user.role === 'sales_manager' || user.role === 'branch_manager') return true;
        if (typeof canManage === 'function' && canManage('customerPortal', user)) return true;
        return false;
    }

    function canCreateCustomerPortalUser(user) {
        user = resolveCpAdminUser(user);
        if (!user) return false;
        if (canManageCustomerPortalUsers(user)) return true;
        if (typeof canManage === 'function' && canManage('createCustomerUser', user)) return true;
        return user.role === 'sales_rep';
    }

    function cpManagerBranchId() {
        const u = resolveCpAdminUser();
        if (!u) return '';
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(u)) return '';
        if (typeof getAdminAssignedBranchId === 'function') {
            const bid = getAdminAssignedBranchId(u);
            if (bid != null) return String(bid);
        }
        return '';
    }

    function filterCpUsersForManager(list) {
        const admin = resolveCpAdminUser();
        if (admin && admin.role === 'sales_rep') {
            const repId = String(admin.id || '');
            const repUser = String(admin.username || '').toLowerCase();
            return (list || []).filter(function(u) {
                if (String(u.assignedRepId || '') === repId) return true;
                if (String(u.assignedRepUsername || '').toLowerCase() === repUser) return true;
                if (!u.assignedRepId && !u.assignedRepUsername && String(u.createdBy || '').toLowerCase() === repUser) return true;
                return false;
            });
        }
        const bid = cpManagerBranchId();
        if (!bid) return list || [];
        return (list || []).filter(function(u) {
            return !u.branchId || String(u.branchId) === bid;
        });
    }

    function getBranchSalesRepsForCp() {
        let users = [];
        try {
            if (typeof global.adminUsers !== 'undefined' && Array.isArray(global.adminUsers)) users = global.adminUsers;
        } catch (e) { /* ignore */ }
        const bid = cpManagerBranchId();
        return users.filter(function(u) {
            if (!u || u.role !== 'sales_rep' || u.isActive === false) return false;
            if (!bid) return true;
            const ub = u.assignedBranchId != null ? String(u.assignedBranchId) : (u.branchId != null ? String(u.branchId) : '');
            return !ub || ub === bid;
        });
    }

    function entryBelongsToPortalCustomer(entry, portalUser) {
        if (!entry || !portalUser) return false;
        if (entry.portalUserId && entry.portalUserId === portalUser.id) return true;
        if (portalUser.crmCustomerId && entry.crmCustomerId === portalUser.crmCustomerId) return true;
        const pPhone = normPhone(portalUser.phone);
        const ePhone = normPhone(entry.phone || entry.customerPhone || entry.mobile);
        if (pPhone && ePhone && pPhone === ePhone) return true;
        const pName = normText(portalUser.displayName || portalUser.nameAr);
        const eName = normText(entry.customerName || entry.customer || entry.name);
        if (pName && eName && (eName.indexOf(pName) >= 0 || pName.indexOf(eName) >= 0)) return true;
        return false;
    }

    function collectPortalCustomerData(portalUser) {
        loadCpData();
        const quotes = [];
        const orders = [];
        const transfers = [];
        try {
            const inbox = typeof loadSalesQuotesInbox === 'function' ? (loadSalesQuotesInbox() || []) : [];
            inbox.forEach(function(q) {
                if (entryBelongsToPortalCustomer(q, portalUser)) quotes.push(q);
            });
        } catch (e) { /* ignore */ }
        try {
            const ords = typeof global.getNebrasErpOrders === 'function'
                ? (global.getNebrasErpOrders() || [])
                : (typeof erpOrders !== 'undefined' ? (erpOrders || []) : []);
            ords.forEach(function(o) {
                if (entryBelongsToPortalCustomer(o, portalUser)) orders.push(o);
            });
        } catch (e) { /* ignore */ }
        try {
            const tr = typeof global.getNebrasErpTransfers === 'function'
                ? (global.getNebrasErpTransfers() || [])
                : (typeof erpTransfers !== 'undefined' ? (erpTransfers || []) : []);
            tr.forEach(function(t) {
                if (entryBelongsToPortalCustomer(t, portalUser)) transfers.push(t);
            });
        } catch (e) { /* ignore */ }
        const delivered = orders.filter(function(o) { return o.status === 'delivered'; });
        const preparing = orders.filter(function(o) {
            return o.status === 'pending' || o.status === 'confirmed' || o.status === 'production';
        });
        const quotesNeedOrder = quotes.filter(function(q) {
            return !q.convertedToOrder && (q.status === 'sold' || q.quoteType === 'sale' || q.status === 'accepted');
        });
        const quotesPending = quotes.filter(function(q) {
            return q.status === 'new' || q.status === 'reviewed' || !q.status;
        });
        return {
            quotes: quotes,
            orders: orders,
            transfers: transfers,
            delivered: delivered,
            preparing: preparing,
            quotesNeedOrder: quotesNeedOrder,
            quotesPending: quotesPending,
            totalQuotes: quotes.length,
            totalOrders: orders.length,
            totalTransfers: transfers.length
        };
    }

    function computeCustomerLoyaltyScore(portalUser) {
        const d = collectPortalCustomerData(portalUser);
        let revenue = 0;
        d.quotes.forEach(function(q) { revenue += Number(q.totalIncVat || q.total || 0); });
        d.orders.forEach(function(o) { revenue += Number(o.amount || o.total || 0); });
        const score = d.totalQuotes * 2 + d.totalOrders * 8 + d.totalTransfers * 4 + Math.floor(revenue / 5000);
        const tier = score >= 40 ? 'vip' : (score >= 20 ? 'trusted' : (score >= 8 ? 'active' : 'new'));
        return { score: score, tier: tier, revenue: revenue, data: d };
    }

    function buildCustomerLoyaltyRankings() {
        loadCpData();
        return filterCpUsersForManager(customerPortalUsers)
            .filter(function(u) { return u.isActive !== false; })
            .map(function(u) {
                const loyalty = computeCustomerLoyaltyScore(u);
                return {
                    user: u,
                    score: loyalty.score,
                    tier: loyalty.tier,
                    revenue: loyalty.revenue,
                    quotes: loyalty.data.totalQuotes,
                    orders: loyalty.data.totalOrders,
                    transfers: loyalty.data.totalTransfers
                };
            })
            .sort(function(a, b) { return b.score - a.score; });
    }

    /* ---------- تسجيل دخول العميل ---------- */
    function openCustomerPortalLogin(ev) {
        if (ev) ev.preventDefault();
        if (currentPortalCustomer) {
            showCustomerPortalApp();
            return;
        }
        const el = document.getElementById('customer-portal-overlay');
        if (el) el.classList.add('show');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function closeCustomerPortalLogin() {
        const el = document.getElementById('customer-portal-overlay');
        if (el) el.classList.remove('show');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function loginCustomerPortal() {
        loadCpData();
        const username = String((document.getElementById('cp-login-username') || {}).value || '').trim();
        const password = String((document.getElementById('cp-login-password') || {}).value || '').trim();
        const status = document.getElementById('cp-login-status');
        if (!username || !password) {
            if (status) status.textContent = 'أدخل اسم المستخدم وكلمة المرور.';
            return;
        }
        (async function() {
            let user = null;
            if (typeof global.securePortalLogin === 'function') {
                try {
                    const api = await global.securePortalLogin(username, password);
                    if (api && api.ok && api.user) {
                        const idx = customerPortalUsers.findIndex(function(u) {
                            return u && String(u.id) === String(api.user.id);
                        });
                        if (idx >= 0) {
                            customerPortalUsers[idx] = Object.assign({}, customerPortalUsers[idx], api.user);
                            user = customerPortalUsers[idx];
                        } else {
                            user = api.user;
                            customerPortalUsers.push(user);
                        }
                        saveCpData();
                    }
                } catch (apiErr) { console.warn('portal API login:', apiErr); }
            }
            if (!user) {
                user = customerPortalUsers.find(function(u) {
                    return String(u.username || '').toLowerCase() === username.toLowerCase() && u.isActive !== false;
                });
                if (!user || !verifyPw(user.password, password)) {
                    if (status) status.textContent = 'بيانات الدخول غير صحيحة.';
                    cpAudit('محاولة دخول فاشلة', username);
                    return;
                }
            }
            user.lastLoginAt = new Date().toISOString();
            currentPortalCustomer = user;
            try { localStorage.setItem(CP_SESSION_KEY, JSON.stringify({ id: user.id, at: Date.now() })); } catch (e) { /* ignore */ }
            saveCpData();
            cpAudit('دخول عميل', user.username);
            closeCustomerPortalLogin();
            showCustomerPortalApp();
        })();
    }

    function logoutCustomerPortal() {
        const name = currentPortalCustomer ? currentPortalCustomer.username : '';
        currentPortalCustomer = null;
        try { localStorage.removeItem(CP_SESSION_KEY); } catch (e) { /* ignore */ }
        const app = document.getElementById('customer-portal-app');
        if (app) { app.hidden = true; app.classList.remove('show'); }
        document.body.classList.remove('customer-portal-open');
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        if (name) cpAudit('خروج عميل', name);
    }

    function restoreCustomerPortalSession() {
        loadCpData();
        try {
            const raw = localStorage.getItem(CP_SESSION_KEY);
            if (!raw) return;
            const sess = JSON.parse(raw);
            if (!sess || !sess.id) return;
            const user = customerPortalUsers.find(function(u) { return u.id === sess.id && u.isActive !== false; });
            if (user) currentPortalCustomer = user;
        } catch (e) { /* ignore */ }
    }

    function showCustomerPortalApp() {
        if (!currentPortalCustomer) return;
        document.body.classList.add('customer-portal-open');
        const app = document.getElementById('customer-portal-app');
        if (app) { app.hidden = false; app.classList.add('show'); }
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        renderCustomerPortalDashboard();
    }

    function formatMoney(n) {
        if (typeof formatSar === 'function') return formatSar(Number(n) || 0);
        return (Number(n) || 0).toLocaleString('ar-SA') + ' ر.س';
    }

    function renderCustomerPortalDashboard() {
        const host = document.getElementById('customer-portal-body');
        const head = document.getElementById('customer-portal-head');
        if (!host || !currentPortalCustomer) return;
        const u = currentPortalCustomer;
        const d = collectPortalCustomerData(u);
        if (head) {
            head.innerHTML = '<div class="cp-head-inner">' +
                '<span class="cp-head-pill"><i class="fas fa-user-circle"></i> حساب العميل</span>' +
                '<h2>مرحباً، ' + esc(u.displayName || u.username) + '</h2>' +
                '<p>لوحتك الخاصة — عروضك · طلباتك · حوالاتك فقط</p>' +
                '<button type="button" class="cp-logout-btn" onclick="logoutCustomerPortal()"><i class="fas fa-right-from-bracket"></i> خروج</button></div>';
        }
        const tierMeta = computeCustomerLoyaltyScore(u);
        const tierLabel = { vip: 'عميل VIP', trusted: 'عميل موثوق', active: 'عميل نشط', new: 'عميل جديد' };
        host.innerHTML =
            (typeof global.renderCustomerJourneyAlertsHtml === 'function' ? global.renderCustomerJourneyAlertsHtml(u) : '') +
            '<div class="cp-stats">' +
                '<article class="cp-stat"><strong>' + d.totalQuotes + '</strong><span>عروض أسعار</span></article>' +
                '<article class="cp-stat"><strong>' + d.preparing.length + '</strong><span>قيد التجهيز</span></article>' +
                '<article class="cp-stat"><strong>' + d.delivered.length + '</strong><span>مُستلَمة</span></article>' +
                '<article class="cp-stat cp-stat--tier cp-stat--' + tierMeta.tier + '"><strong>' + esc(tierLabel[tierMeta.tier] || '') + '</strong><span>تصنيفك</span></article>' +
            '</div>' +
            '<section class="cp-panel cp-panel--journey"><h3><i class="fas fa-route"></i> مسار نبراس — طلبك</h3>' +
                (typeof global.renderCustomerJourneysHtml === 'function'
                    ? global.renderCustomerJourneysHtml(u)
                    : '<p class="cp-empty">مسار الطلب قيد التفعيل.</p>') +
            '</section>' +
            '<section class="cp-panel"><h3><i class="fas fa-file-invoice"></i> عروض الأسعار</h3>' +
                (d.quotes.length ? '<div class="cp-list">' + d.quotes.slice(0, 20).map(function(q) {
                    return '<article class="cp-row"><strong>' + esc(q.quoteNo || q.id || '—') + '</strong>' +
                        '<span>' + formatMoney(q.totalIncVat || q.total || 0) + '</span>' +
                        '<small>' + esc(q.status || 'جديد') + (q.convertedToOrder ? ' · طلب OMS' : '') + '</small></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا عروض مسجّلة بعد — تواصلي مع مبيعات نبراس.</p>') +
            '</section>' +
            '<section class="cp-panel"><h3><i class="fas fa-truck"></i> الطلبات</h3>' +
                '<div class="cp-subtabs">' +
                    '<span class="cp-subtab">قيد التجهيز: ' + d.preparing.length + '</span>' +
                    '<span class="cp-subtab">مُستلَمة: ' + d.delivered.length + '</span>' +
                    '<span class="cp-subtab">تحتاج طلب: ' + d.quotesNeedOrder.length + '</span>' +
                '</div>' +
                (d.orders.length ? '<div class="cp-list">' + d.orders.slice(0, 20).map(function(o) {
                    return '<article class="cp-row"><strong>' + esc(o.orderNo || o.id) + '</strong>' +
                        '<span>' + esc(o.status || 'pending') + '</span>' +
                        '<small>' + esc(o.product || o.branch || '') + '</small></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا طلبات بعد.</p>') +
            '</section>' +
            '<section class="cp-panel"><h3><i class="fas fa-building-columns"></i> حوالاتك البنكية</h3>' +
                (d.transfers.length ? '<div class="cp-list">' + d.transfers.slice(0, 15).map(function(t) {
                    return '<article class="cp-row"><strong>' + formatMoney(t.amount) + '</strong>' +
                        '<span>' + esc(t.bankAr || t.bank || '—') + '</span>' +
                        '<small>' + esc(t.date || '') + ' · ' + esc(t.refNo || t.quoteNo || '') + '</small></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا حوالات مسجّلة — ارفع إيصال الحوالة عند الدفع من السلة.</p>') +
            '</section>';
        if (typeof global.markJourneysReadyViewed === 'function') global.markJourneysReadyViewed(u);
    }

    function bindCpGovernanceToolbar() {
        const root = document.getElementById('customer-portal-governance');
        if (!root) return;
        const newBtn = root.querySelector('[data-cp-action="new-user"]');
        const loyaltyBtn = root.querySelector('[data-cp-action="loyalty"]');
        if (newBtn) {
            newBtn.onclick = function(ev) {
                if (ev) ev.preventDefault();
                openCpUserEditor();
            };
        }
        if (loyaltyBtn) {
            loyaltyBtn.onclick = function(ev) {
                if (ev) ev.preventDefault();
                openCustomerLoyaltyAnalytics();
            };
        }
    }

    function showCpAdminSection(sectionId) {
        const el = document.getElementById(sectionId);
        if (!el) return null;
        if (typeof closeAllAdminSections === 'function') closeAllAdminSections();
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        return el;
    }

    /* ---------- إدارة مستخدمي العملاء (الإدارة + مدير المبيعات) ---------- */
    function openCustomerPortalGovernance() {
        if (!canManageCustomerPortalUsers()) {
            alert('إنشاء مستخدمي العملاء — الإدارة الرئيسية ومدير المبيعات/مدير الفرع فقط.');
            return;
        }
        (async function() {
            if (typeof hydrateCpUsersFromCloud === 'function') {
                try { await hydrateCpUsersFromCloud(); } catch (e) { /* ignore */ }
            }
            renderCustomerPortalGovernancePanel();
            bindCpGovernanceToolbar();
            showCpAdminSection('customer-portal-governance');
        })();
    }

    function renderCustomerPortalGovernancePanel() {
        loadCpData();
        const list = document.getElementById('cp-gov-list');
        const stats = document.getElementById('cp-gov-stats');
        const users = filterCpUsersForManager(customerPortalUsers);
        if (stats) {
            stats.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + users.length + '</strong><span>عملاء مسجّلون</span></div>' +
                '<div class="erp-stat"><strong>' + users.filter(function(u) { return u.isActive !== false; }).length + '</strong><span>نشطون</span></div>' +
                '<div class="erp-stat"><strong>' + buildCustomerLoyaltyRankings().filter(function(r) { return r.tier === 'vip' || r.tier === 'trusted'; }).length + '</strong><span>VIP / موثوق</span></div>';
        }
        if (!list) return;
        if (!users.length) {
            list.innerHTML = '<p class="nebras-users-empty">لا مستخدمي عملاء — أضيفي أول حساب عميل.</p>';
            return;
        }
        list.innerHTML = users.map(function(u, idx) {
            const globalIdx = customerPortalUsers.indexOf(u);
            const loyalty = computeCustomerLoyaltyScore(u);
            return '<article class="nebras-user-card cp-gov-card">' +
                '<header class="nebras-user-card-head">' +
                    '<span class="nebras-user-avatar"><i class="fas fa-user-circle"></i></span>' +
                    '<div><strong>' + esc(u.displayName || u.username) + '</strong><small>' + esc(u.username) + '</small></div>' +
                '</header>' +
                '<span class="nebras-user-branch"><i class="fas fa-chart-line"></i> ' + loyalty.data.totalQuotes + ' عروض · ' + loyalty.data.totalOrders + ' طلبات · ' + esc(loyalty.tier) + '</span>' +
                (u.assignedRepUsername ? '<span class="nebras-user-branch"><i class="fas fa-user-tie"></i> مندوب: ' + esc(u.assignedRepUsername) + '</span>' : '') +
                (Array.isArray(u.portalAccess) && u.portalAccess.length < 4
                    ? '<span class="nebras-user-branch"><i class="fas fa-key"></i> صلاحيات: ' + esc(u.portalAccess.join(' · ')) + '</span>'
                    : '') +
                '<footer class="nebras-user-card-foot">' +
                    '<button class="nebras-user-act" onclick="openCpUserEditor(' + globalIdx + ')"><i class="fas fa-pen"></i> تعديل</button>' +
                    '<button class="nebras-user-act nebras-user-act--danger" onclick="deleteCpUser(' + globalIdx + ')"><i class="fas fa-trash"></i> حذف</button>' +
                '</footer></article>';
        }).join('');
    }

    function openCpUserEditor(index, prefill) {
        loadCpData();
        if (!canCreateCustomerPortalUser()) {
            alert('إنشاء حساب عميل — الإدارة أو مدير المبيعات أو مندوب المبيعات المخوّل.');
            return;
        }
        const isEdit = typeof index === 'number' && customerPortalUsers[index];
        if (isEdit && !canManageCustomerPortalUsers()) {
            alert('تعديل حسابات العملاء — مدير المبيعات أو الإدارة فقط.');
            return;
        }
        if (isEdit) {
            const u = customerPortalUsers[index];
            if (!filterCpUsersForManager([u]).length) {
                alert('لا يمكنك تعديل عميل خارج فرعك.');
                return;
            }
        }
        const user = isEdit ? customerPortalUsers[index] : null;
        const bid = cpManagerBranchId();
        const branches = typeof global.getNebrasBranchesForEmpire === 'function'
            ? (global.getNebrasBranchesForEmpire() || [])
            : (typeof branchesData !== 'undefined' ? (branchesData || []) : []);
        const branch = bid
            ? branches.find(function(b) { return String(b.id) === bid; })
            : null;
        const admin = resolveCpAdminUser();
        cpEditorState = {
            index: isEdit ? index : -1,
            isEdit: !!isEdit,
            id: user ? user.id : ('CP-' + Date.now()),
            branchId: user ? user.branchId : (bid || (admin && admin.branchId) || null),
            branchCity: user ? user.branchCity : (branch ? (branch.city || branch.cityAr) : (admin && admin.assignedBranchCity) || '')
        };
        const host = document.getElementById('cp-gov-editor');
        if (!host) return;
        host.hidden = false;
        const pre = prefill || {};
        let crmSelect = '<option value="">— ربط CRM (اختياري) —</option>';
        if (typeof getCrmCustomers === 'function') {
            (getCrmCustomers() || []).forEach(function(c) {
                const sel = user && user.crmCustomerId === c.id ? ' selected' : '';
                crmSelect += '<option value="' + escAttr(c.id) + '"' + sel + '>' + esc(c.name) + (c.phone ? ' — ' + esc(c.phone) : '') + '</option>';
            });
        }
        let repSelect = '';
        const isRep = admin && admin.role === 'sales_rep';
        if (!isRep && canManageCustomerPortalUsers()) {
            const reps = getBranchSalesRepsForCp();
            repSelect = '<label class="nebras-field"><span>المندوب المسؤول</span><select id="cp-e-rep">' +
                '<option value="">— اختر مندوب المبيعات —</option>' +
                reps.map(function(r) {
                    const sel = (user && String(user.assignedRepId) === String(r.id)) ||
                        (user && String(user.assignedRepUsername || '').toLowerCase() === String(r.username || '').toLowerCase()) ? ' selected' : '';
                    return '<option value="' + escAttr(r.id) + '"' + (sel ? ' selected' : '') + '>' + esc(r.displayName || r.username) + '</option>';
                }).join('') + '</select></label>';
        }
        host.innerHTML =
            '<div class="nebras-editor-card">' +
                '<div class="nebras-editor-bar" style="--role-accent:#1a6fa8">' +
                    '<span class="nebras-editor-role-icon"><i class="fas fa-user-circle"></i></span>' +
                    '<div><h3>' + (isEdit ? 'تعديل حساب عميل' : 'حساب عميل جديد') + '</h3>' +
                    '<p>لوحة خاصة — عروض · طلبات · حوالات — خصوصية كاملة</p></div>' +
                    '<button type="button" class="nebras-editor-x" onclick="cancelCpUserEditor()"><i class="fas fa-xmark"></i></button>' +
                '</div>' +
                '<div class="nebras-editor-grid">' +
                    '<label class="nebras-field"><span>اسم العرض</span><input id="cp-e-display" value="' + escAttr(user ? user.displayName : (pre.displayName || '')) + '"></label>' +
                    '<label class="nebras-field"><span>اسم المستخدم</span><input id="cp-e-username" value="' + escAttr(user ? user.username : (pre.username || '')) + '"></label>' +
                    '<label class="nebras-field"><span>كلمة المرور</span><input id="cp-e-password" type="text" value="" placeholder="' + (isEdit ? 'اتركها فارغة للإبقاء' : 'مطلوبة') + '"></label>' +
                    '<label class="nebras-field"><span>الجوال (لربط العروض)</span><input id="cp-e-phone" value="' + escAttr(user ? user.phone : (pre.phone || '')) + '"></label>' +
                    '<label class="nebras-field"><span>البريد</span><input id="cp-e-email" type="email" value="' + escAttr(user ? user.email : '') + '"></label>' +
                    '<label class="nebras-field"><span>ربط CRM</span><select id="cp-e-crm">' + crmSelect + '</select></label>' +
                    repSelect +
                    buildCpAccessFieldsHtml(user) +
                    '<label class="nebras-field"><span>الفرع</span><input readonly value="' + escAttr(cpEditorState.branchCity || 'المجموعة') + '"></label>' +
                '</div>' +
                '<div class="nebras-editor-footer">' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveCpUserFromEditor()"><i class="fas fa-floppy-disk"></i> حفظ</button>' +
                    '<button type="button" class="nebras-users-btn" onclick="cancelCpUserEditor()">إلغاء</button>' +
                '</div></div>';
        requestAnimationFrame(function() {
            host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            const modal = host.closest('.admin-modal');
            if (modal) modal.scrollTop = Math.max(0, host.offsetTop - 72);
        });
    }

    function cancelCpUserEditor() {
        cpEditorState = null;
        const host = document.getElementById('cp-gov-editor');
        if (host) { host.hidden = true; host.innerHTML = ''; }
    }

    async function saveCpUserFromEditor() {
        if (!cpEditorState || !canCreateCustomerPortalUser()) return;
        if (cpEditorState.isEdit && !canManageCustomerPortalUsers()) {
            alert('تعديل حسابات العملاء — مدير المبيعات أو الإدارة فقط.');
            return;
        }
        const displayName = String((document.getElementById('cp-e-display') || {}).value || '').trim();
        const username = String((document.getElementById('cp-e-username') || {}).value || '').trim();
        const password = String((document.getElementById('cp-e-password') || {}).value || '').trim();
        const phone = String((document.getElementById('cp-e-phone') || {}).value || '').trim();
        const email = String((document.getElementById('cp-e-email') || {}).value || '').trim();
        const crmCustomerId = String((document.getElementById('cp-e-crm') || {}).value || '').trim();
        const repEl = document.getElementById('cp-e-rep');
        const repId = repEl ? String(repEl.value || '').trim() : '';
        if (!displayName || !username) { alert('الاسم واسم المستخدم مطلوبان.'); return; }
        if (!cpEditorState.isEdit && !password) { alert('كلمة المرور مطلوبة للحساب الجديد.'); return; }
        const dup = customerPortalUsers.some(function(u, i) {
            return String(u.username).toLowerCase() === username.toLowerCase() && i !== cpEditorState.index;
        });
        if (dup) { alert('اسم المستخدم مستخدم مسبقاً.'); return; }
        const admin = resolveCpAdminUser();
        const portalAccess = readCpPortalAccessFromEditor(cpEditorState.isEdit ? customerPortalUsers[cpEditorState.index] : null);
        const payload = {
            id: cpEditorState.id,
            username: username,
            displayName: displayName,
            phone: phone,
            email: email,
            crmCustomerId: crmCustomerId || null,
            branchId: cpEditorState.branchId,
            branchCity: cpEditorState.branchCity,
            portalAccess: portalAccess,
            isActive: true,
            createdBy: admin ? admin.username : 'system',
            updatedAt: new Date().toISOString()
        };
        if (admin && admin.role === 'sales_rep') {
            payload.assignedRepId = admin.id;
            payload.assignedRepUsername = admin.username;
        } else if (repId) {
            let repUser = null;
            try {
                repUser = (global.adminUsers || []).find(function(r) { return r && String(r.id) === repId; });
            } catch (e) { /* ignore */ }
            if (repUser) {
                payload.assignedRepId = repUser.id;
                payload.assignedRepUsername = repUser.username;
            }
        }
        if (password) payload.password = hashPw(password);
        else if (cpEditorState.isEdit) payload.password = customerPortalUsers[cpEditorState.index].password;
        if (cpEditorState.isEdit) {
            customerPortalUsers[cpEditorState.index] = Object.assign({}, customerPortalUsers[cpEditorState.index], payload);
            cpAudit('تعديل حساب عميل', username);
            if (typeof addAuditLog === 'function') addAuditLog('تعديل حساب عميل', username);
        } else {
            payload.createdAt = new Date().toISOString();
            payload.password = hashPw(password);
            customerPortalUsers.push(payload);
            cpAudit('إنشاء حساب عميل', username);
            if (typeof addAuditLog === 'function') addAuditLog('إنشاء حساب عميل', username + ' — ' + displayName);
        }
        saveCpData();
        let cloudOk = false;
        if (typeof global.persistNebrasCriticalStores === 'function') {
            cloudOk = await global.persistNebrasCriticalStores(['customer_portal_users', 'customer_portal_audit'], { showToast: true });
        }
        if (!cloudOk && typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('⚠️ حساب العميل محفوظ محلياً فقط — لن يعمل من جهاز آخر حتى يُرفع للسحابة', 'error');
        }
        cancelCpUserEditor();
        renderCustomerPortalGovernancePanel();
    }

    function openCpUserEditorForRep() {
        if (!canCreateCustomerPortalUser()) {
            alert('إنشاء حساب عميل — مندوب المبيعات المخوّل فقط.');
            return;
        }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('customer-portal-governance');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('customer-portal-governance');
        renderCustomerPortalGovernancePanel();
        bindCpGovernanceToolbar();
        openCpUserEditor(undefined, {});
    }

    function openCpUserEditorFromQuote(customerName, phone) {
        openCpUserEditorForRep();
        setTimeout(function() {
            openCpUserEditor(undefined, {
                displayName: customerName || '',
                phone: phone || '',
                username: phone ? ('c' + String(phone).replace(/\D/g, '').slice(-8)) : ''
            });
        }, 80);
    }

    async function deleteCpUser(index) {
        if (!canManageCustomerPortalUsers()) {
            alert('حذف مستخدمي العملاء — الإدارة الرئيسية ومدير المبيعات/مدير الفرع فقط.');
            return;
        }
        const u = customerPortalUsers[index];
        if (!u || !filterCpUsersForManager([u]).length) {
            alert('لا يمكنك حذف عميل خارج فرعك.');
            return;
        }
        if (!confirm('حذف حساب العميل ' + u.username + '؟')) return;
        customerPortalUsers.splice(index, 1);
        saveCpData();
        cpAudit('حذف حساب عميل', u.username);
        if (typeof addAuditLog === 'function') addAuditLog('حذف حساب عميل', u.username);
        if (typeof global.persistNebrasCriticalStores === 'function') {
            await global.persistNebrasCriticalStores(['customer_portal_users', 'customer_portal_audit'], { showToast: true });
        }
        renderCustomerPortalGovernancePanel();
    }

    /* ---------- تحليل ولاء العملاء (الإدارة + مدير المبيعات) ---------- */
    function openCustomerLoyaltyAnalytics() {
        if (!canManageCustomerPortalUsers()) {
            alert('تحليل العملاء — الإدارة الرئيسية ومدير المبيعات/مدير الفرع فقط.');
            return;
        }
        const gov = document.getElementById('customer-portal-governance');
        if (gov) {
            gov.classList.remove('show');
            gov.setAttribute('aria-hidden', 'true');
        }
        cancelCpUserEditor();
        renderCustomerLoyaltyPanel();
        showCpAdminSection('customer-loyalty-analytics');
    }

    function renderCustomerLoyaltyPanel() {
        const body = document.getElementById('cp-loyalty-body');
        const summary = document.getElementById('cp-loyalty-summary');
        if (!body) return;
        const ranks = buildCustomerLoyaltyRankings();
        if (summary) {
            summary.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + ranks.length + '</strong><span>عملاء ببوابة</span></div>' +
                '<div class="erp-stat erp-stat--ok"><strong>' + ranks.filter(function(r) { return r.tier === 'vip'; }).length + '</strong><span>VIP — خصم مقترح</span></div>' +
                '<div class="erp-stat"><strong>' + ranks.filter(function(r) { return r.tier === 'trusted'; }).length + '</strong><span>موثوقون</span></div>' +
                '<div class="erp-stat"><strong>' + ranks.slice(0, 5).reduce(function(s, r) { return s + r.quotes; }, 0) + '</strong><span>عروض Top 5</span></div>';
        }
        const toolbar =
            '<div class="scm-panel-toolbar cp-gov-toolbar">' +
                '<button type="button" class="nebras-users-btn" onclick="openCustomerPortalGovernance()"><i class="fas fa-arrow-right"></i> رجوع لمستخدمي العملاء</button>' +
            '</div>';
        if (!ranks.length) {
            body.innerHTML = toolbar + '<p class="erp-empty">أنشئي حسابات العملاء أولاً من «مستخدمي العملاء».</p>';
            return;
        }
        body.innerHTML = toolbar +
            '<p class="cp-loyalty-hint"><i class="fas fa-percent"></i> العملاء VIP والموثوقون — مرشّحون لخصم ولاء من الإدارة أو مدير المبيعات.</p>' +
            '<div class="erp-table-wrap"><table class="erp-table cp-loyalty-table"><thead><tr>' +
            '<th>العميل</th><th>التصنيف</th><th>النقاط</th><th>عروض</th><th>طلبات</th><th>حوالات</th><th>إيراد تقديري</th></tr></thead><tbody>' +
            ranks.map(function(r) {
                const tierAr = { vip: 'VIP ★', trusted: 'موثوق', active: 'نشط', new: 'جديد' };
                const cls = r.tier === 'vip' ? 'erp-tag--ok' : (r.tier === 'trusted' ? 'erp-tag--accent' : '');
                return '<tr><td><strong>' + esc(r.user.displayName || r.user.username) + '</strong><br><small>' + esc(r.user.phone || '') + '</small></td>' +
                    '<td><span class="erp-tag ' + cls + '">' + esc(tierAr[r.tier] || r.tier) + '</span></td>' +
                    '<td>' + r.score + '</td><td>' + r.quotes + '</td><td>' + r.orders + '</td><td>' + r.transfers + '</td>' +
                    '<td>' + formatMoney(r.revenue) + '</td></tr>';
            }).join('') + '</tbody></table></div>';
    }

    function setCustomerPortalUsersFromCloud(v) {
        customerPortalUsers = Array.isArray(v) ? v : [];
        cpDataReady = true;
        try { localStorage.setItem(CP_USERS_KEY, JSON.stringify(customerPortalUsers)); } catch (e) { /* ignore */ }
    }
    function setCustomerPortalAuditFromCloud(v) {
        customerPortalAudit = Array.isArray(v) ? v : [];
        try { localStorage.setItem(CP_AUDIT_KEY, JSON.stringify(customerPortalAudit)); } catch (e) { /* ignore */ }
    }

    function initCustomerPortal() {
        restoreCustomerPortalSession();
        if (currentPortalCustomer) showCustomerPortalApp();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomerPortal);
    } else {
        setTimeout(initCustomerPortal, 0);
    }

    global.openCustomerPortalLogin = openCustomerPortalLogin;
    global.closeCustomerPortalLogin = closeCustomerPortalLogin;
    global.loginCustomerPortal = loginCustomerPortal;
    global.logoutCustomerPortal = logoutCustomerPortal;
    global.openCustomerPortalGovernance = openCustomerPortalGovernance;
    global.openCustomerLoyaltyAnalytics = openCustomerLoyaltyAnalytics;
    global.openCpUserEditor = openCpUserEditor;
    global.cancelCpUserEditor = cancelCpUserEditor;
    global.saveCpUserFromEditor = saveCpUserFromEditor;
    global.deleteCpUser = deleteCpUser;
    global.openCpUserEditorForRep = openCpUserEditorForRep;
    global.openCpUserEditorFromQuote = openCpUserEditorFromQuote;
    global.canCreateCustomerPortalUser = canCreateCustomerPortalUser;
    global.canManageCustomerPortalUsers = canManageCustomerPortalUsers;
    global.getCustomerPortalUsers = function() { loadCpData(); return customerPortalUsers; };

    function findCustomerPortalUserByPhone(phone) {
        loadCpData();
        const norm = String(phone || '').replace(/\D/g, '').slice(-9);
        if (norm.length < 9) return null;
        return customerPortalUsers.find(function(u) {
            return u && u.isActive !== false && String(u.phone || u.username || '').replace(/\D/g, '').slice(-9) === norm;
        }) || null;
    }
    global.findCustomerPortalUserByPhone = findCustomerPortalUserByPhone;
    global.getCustomerPortalAudit = function() { loadCpData(); return customerPortalAudit; };
    global.buildCustomerLoyaltyRankings = buildCustomerLoyaltyRankings;
    global.hydrateCpUsersFromCloud = hydrateCpUsersFromCloud;
    global.setCustomerPortalUsersFromCloud = setCustomerPortalUsersFromCloud;
    global.setCustomerPortalAuditFromCloud = setCustomerPortalAuditFromCloud;
    global.collectPortalCustomerData = collectPortalCustomerData;
    global.entryBelongsToPortalCustomer = entryBelongsToPortalCustomer;

})(typeof window !== 'undefined' ? window : globalThis);
