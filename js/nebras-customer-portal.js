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

    function readCpSessionRaw() {
        try {
            const raw = localStorage.getItem(CP_SESSION_KEY);
            if (!raw) return null;
            const sess = JSON.parse(raw);
            return sess && sess.id ? sess : null;
        } catch (e) { return null; }
    }

    function buildCpSessionSnapshot(user) {
        if (!user) return null;
        return {
            id: user.id,
            username: user.username,
            displayName: user.displayName || user.username,
            phone: user.phone,
            portalAccess: user.portalAccess,
            assignedRepId: user.assignedRepId,
            assignedRepUsername: user.assignedRepUsername,
            assignedRepPhone: user.assignedRepPhone,
            customerType: user.customerType,
            commercialRegistration: user.commercialRegistration,
            taxId: user.taxId,
            isActive: user.isActive !== false
        };
    }

    function persistCpSession(patch) {
        if (!currentPortalCustomer) return;
        const prev = readCpSessionRaw() || {};
        const sess = Object.assign({
            id: currentPortalCustomer.id,
            username: currentPortalCustomer.username,
            at: Date.now(),
            view: 'dashboard',
            snapshot: buildCpSessionSnapshot(currentPortalCustomer)
        }, prev, patch || {});
        sess.id = currentPortalCustomer.id;
        if (!sess.snapshot) sess.snapshot = buildCpSessionSnapshot(currentPortalCustomer);
        try { localStorage.setItem(CP_SESSION_KEY, JSON.stringify(sess)); } catch (e) { /* ignore */ }
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
    const CP_CUSTOMER_TYPE_BUSINESS = 'business';
    const CP_CUSTOMER_TYPE_CASH = 'cash';

    function resolveCpCustomerType(user) {
        if (!user) return CP_CUSTOMER_TYPE_BUSINESS;
        if (user.customerType === CP_CUSTOMER_TYPE_CASH || user.customerType === CP_CUSTOMER_TYPE_BUSINESS) {
            return user.customerType;
        }
        if (user.commercialRegistration || user.taxId) return CP_CUSTOMER_TYPE_BUSINESS;
        return CP_CUSTOMER_TYPE_CASH;
    }

    function getCpCustomerTypeLabel(type) {
        return type === CP_CUSTOMER_TYPE_CASH ? 'نقدي شخصي' : 'مؤسسة';
    }

    function getCpEditorSelectedType() {
        const checked = document.querySelector('input[name="cp-e-type"]:checked');
        return checked && checked.value === CP_CUSTOMER_TYPE_CASH ? CP_CUSTOMER_TYPE_CASH : CP_CUSTOMER_TYPE_BUSINESS;
    }

    function syncCpEditorCustomerTypeFields() {
        const type = getCpEditorSelectedType();
        const bizBlock = document.getElementById('cp-e-business-fields');
        const hint = document.getElementById('cp-e-type-hint');
        const displayLabel = document.querySelector('#cp-e-display-label span');
        document.querySelectorAll('.cp-customer-type-option').forEach(function(lab) {
            const inp = lab.querySelector('input[name="cp-e-type"]');
            lab.classList.toggle('is-active', !!(inp && inp.checked));
        });
        if (bizBlock) bizBlock.hidden = type !== CP_CUSTOMER_TYPE_BUSINESS;
        if (hint) {
            hint.textContent = type === CP_CUSTOMER_TYPE_BUSINESS
                ? 'مؤسسة: السجل التجاري والرقم الضريبي والجوال مطلوبة لربط الفواتير الرسمية.'
                : 'عميل نقدي شخصي: يكفي رقم الجوال لربط العروض والطلبات — بدون سجل تجاري أو ضريبي.';
        }
        if (displayLabel) {
            displayLabel.textContent = type === CP_CUSTOMER_TYPE_BUSINESS ? 'اسم المؤسسة / الشركة' : 'اسم العميل';
        }
    }

    function buildCpCustomerTypeEditorHtml(user, pre) {
        pre = pre || {};
        const type = user ? resolveCpCustomerType(user) : (pre.customerType || CP_CUSTOMER_TYPE_BUSINESS);
        const isBusiness = type === CP_CUSTOMER_TYPE_BUSINESS;
        return '<fieldset class="cp-customer-type-fieldset">' +
            '<legend>نوع الحساب</legend>' +
            '<div class="cp-customer-type-options">' +
            '<label class="cp-customer-type-option' + (isBusiness ? ' is-active' : '') + '">' +
            '<input type="radio" name="cp-e-type" value="business"' + (isBusiness ? ' checked' : '') + ' onchange="syncCpEditorCustomerTypeFields()">' +
            '<span><i class="fas fa-building" aria-hidden="true"></i> مؤسسة</span></label>' +
            '<label class="cp-customer-type-option' + (!isBusiness ? ' is-active' : '') + '">' +
            '<input type="radio" name="cp-e-type" value="cash"' + (!isBusiness ? ' checked' : '') + ' onchange="syncCpEditorCustomerTypeFields()">' +
            '<span><i class="fas fa-user" aria-hidden="true"></i> عميل نقدي (شخصي)</span></label>' +
            '</div></fieldset>' +
            '<p id="cp-e-type-hint" class="cp-customer-type-hint">' + (isBusiness
                ? 'مؤسسة: السجل التجاري والرقم الضريبي والجوال مطلوبة لربط الفواتير الرسمية.'
                : 'عميل نقدي شخصي: يكفي رقم الجوال لربط العروض والطلبات — بدون سجل تجاري أو ضريبي.') + '</p>' +
            '<div id="cp-e-business-fields" class="cp-editor-business-fields"' + (isBusiness ? '' : ' hidden') + '>' +
            '<label class="nebras-field"><span>رقم السجل التجاري <em class="cp-req">*</em></span>' +
            '<input id="cp-e-cr" value="' + escAttr(user ? user.commercialRegistration : '') + '" placeholder="مثال: 1010xxxxxx" inputmode="numeric" autocomplete="off"></label>' +
            '<label class="nebras-field"><span>الرقم الضريبي (البطاقة الضريبية) <em class="cp-req">*</em></span>' +
            '<input id="cp-e-tax" value="' + escAttr(user ? user.taxId : '') + '" placeholder="3xxxxxxxxxx0003" inputmode="numeric" autocomplete="off"></label>' +
            '</div>';
    }

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
            quotes: 'عرض عروض الأسعار في البوابة',
            orders: 'عرض الطلبات وحالة التنفيذ',
            transfers: 'عرض الحوالات البنكية',
            journeys: 'مسار نبراس — متابعة الطلب (7 محطات)'
        };
        const hints = {
            quotes: 'يرى العميل عروضه المحفوظة فقط',
            orders: 'طلباته وحالات التجهيز والتسليم',
            transfers: 'إيصالات الحوالات المرفوعة',
            journeys: 'محطات الإنتاج حتى الاستلام بالـ QR'
        };
        const boxes = CP_DEFAULT_ACCESS.map(function(key) {
            const on = access.indexOf(key) >= 0 ? ' checked' : '';
            return '<label class="nebras-check cp-portal-access-item">' +
                '<input type="checkbox" id="cp-e-access-' + key + '"' + on + '>' +
                '<span class="cp-portal-access-item-text"><strong>' + esc(labels[key] || key) + '</strong>' +
                '<small>' + esc(hints[key] || '') + '</small></span></label>';
        }).join('');
        return '<div class="nebras-field nebras-field--full cp-portal-access-block">' +
            '<span class="cp-portal-access-title"><i class="fas fa-route"></i> مسار العميل في البوابة</span>' +
            '<p class="cp-portal-access-hint">حدّدي ما يظهر للعميل بعد تسجيل الدخول — يمكن تعديله لاحقاً من «مستخدمي العملاء».</p>' +
            '<div class="nebras-check-grid cp-portal-access-grid">' + boxes + '</div></div>';
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
    }

    async function verifyCpUserInCloud(username) {
        const un = String(username || '').trim().toLowerCase();
        if (!un || typeof global.secureCloudPull !== 'function' || typeof global.getNebrasSecureToken !== 'function') return false;
        if (!global.getNebrasSecureToken()) return false;
        try {
            const rows = await global.secureCloudPull(['customer_portal_users']);
            const row = rows && rows.find(function(r) { return r && r.store_key === 'customer_portal_users'; });
            const users = row && row.payload;
            if (!Array.isArray(users)) return false;
            return users.some(function(u) {
                return u && String(u.username || '').trim().toLowerCase() === un && u.isActive !== false;
            });
        } catch (e) {
            console.warn('verifyCpUserInCloud:', e);
            return false;
        }
    }

    async function verifyCpUserAbsentFromCloud(username) {
        const un = String(username || '').trim().toLowerCase();
        if (!un || typeof global.secureCloudPull !== 'function' || typeof global.getNebrasSecureToken !== 'function') return false;
        if (!global.getNebrasSecureToken()) return false;
        try {
            const rows = await global.secureCloudPull(['customer_portal_users']);
            const row = rows && rows.find(function(r) { return r && r.store_key === 'customer_portal_users'; });
            const users = row && row.payload;
            if (!Array.isArray(users)) return true;
            return !users.some(function(u) {
                return u && String(u.username || '').trim().toLowerCase() === un;
            });
        } catch (e) {
            console.warn('verifyCpUserAbsentFromCloud:', e);
            return false;
        }
    }

    async function persistCustomerPortalUsersToCloud(options) {
        options = options || {};
        if (typeof global.ensureNebrasCloudSessionReady === 'function') {
            const sessionOk = await global.ensureNebrasCloudSessionReady({
                promptReauth: options.promptReauth !== false
            });
            if (!sessionOk) return false;
        }
        let cloudOk = false;
        if (typeof global.persistNebrasCriticalStores === 'function') {
            cloudOk = await global.persistNebrasCriticalStores(['customer_portal_users', 'customer_portal_audit'], {
                showToast: !!options.showToast,
                promptReauth: options.promptReauth !== false
            });
        }
        if (!cloudOk) return false;
        if (options.verifyUsernameAbsent) {
            return await verifyCpUserAbsentFromCloud(options.verifyUsernameAbsent);
        }
        if (options.verifyUsername) {
            return await verifyCpUserInCloud(options.verifyUsername);
        }
        return true;
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
        if (user.role === 'superadmin' || user.role === 'manager' || user.role === 'sales_manager' || user.role === 'branch_manager') return true;
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
        if (ev && ev.preventDefault) ev.preventDefault();
        if (typeof global.closeMobileNav === 'function') global.closeMobileNav();
        if (currentPortalCustomer) {
            showCustomerPortalApp();
            return;
        }
        if (typeof global.revealPlatformLayer === 'function') {
            global.revealPlatformLayer('customer-portal-overlay');
        } else {
            const el = document.getElementById('customer-portal-overlay');
            if (el) {
                el.classList.add('show');
                el.removeAttribute('hidden');
                el.setAttribute('aria-hidden', 'false');
            }
            if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        }
        if (typeof global.clearStuckInteractionBlockers === 'function') global.clearStuckInteractionBlockers();
    }

    function closeCustomerPortalLogin() {
        if (typeof global.hidePlatformLayer === 'function') {
            global.hidePlatformLayer('customer-portal-overlay');
        } else {
            const el = document.getElementById('customer-portal-overlay');
            if (el) el.classList.remove('show');
            if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        }
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
            persistCpSession({ view: 'dashboard', username: user.username, snapshot: buildCpSessionSnapshot(user) });
            saveCpData();
            cpAudit('دخول عميل', user.username);
            closeCustomerPortalLogin();
            showCustomerPortalApp();
        })();
    }

    function logoutCustomerPortal() {
        const name = currentPortalCustomer ? currentPortalCustomer.username : '';
        currentPortalCustomer = null;
        document.body.classList.remove('customer-portal-open', 'customer-portal-store-active');
        cpRemoveStoreBackFab();
        try { localStorage.removeItem(CP_SESSION_KEY); } catch (e) { /* ignore */ }
        const app = document.getElementById('customer-portal-app');
        if (app) { app.hidden = true; app.classList.remove('show'); }
        if (typeof global.closeNebrasWorkspace === 'function') global.closeNebrasWorkspace();
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        if (name) cpAudit('خروج عميل', name);
    }

    async function restoreCustomerPortalSession() {
        loadCpData();
        const sess = readCpSessionRaw();
        if (!sess) return false;
        let user = customerPortalUsers.find(function(u) {
            return String(u.id) === String(sess.id) && u.isActive !== false;
        });
        if (!user && sess.username) {
            user = customerPortalUsers.find(function(u) {
                return u && u.isActive !== false &&
                    String(u.username || '').toLowerCase() === String(sess.username).toLowerCase();
            });
        }
        if (!user && sess.snapshot && sess.snapshot.id) {
            user = Object.assign({}, sess.snapshot);
            const idx = customerPortalUsers.findIndex(function(u) {
                return String(u.id) === String(user.id);
            });
            if (idx >= 0) {
                customerPortalUsers[idx] = Object.assign({}, customerPortalUsers[idx], user);
                user = customerPortalUsers[idx];
            } else {
                customerPortalUsers.push(user);
            }
            saveCpData();
        }
        if (!user && typeof hydrateCpUsersFromCloud === 'function') {
            try { await hydrateCpUsersFromCloud(); } catch (e) { /* ignore */ }
            user = customerPortalUsers.find(function(u) {
                return String(u.id) === String(sess.id) && u.isActive !== false;
            });
        }
        if (user) {
            currentPortalCustomer = user;
            return true;
        }
        return false;
    }

    async function resumeCustomerPortalAfterBootstrap() {
        const restored = await restoreCustomerPortalSession();
        if (!restored || !currentPortalCustomer) return false;
        const sess = readCpSessionRaw() || { view: 'dashboard' };
        const view = sess.view || 'dashboard';
        if (view === 'main-site') return false;
        if (typeof global.dismissBrandIntro === 'function') {
            try { global.dismissBrandIntro(); } catch (e) { /* ignore */ }
        }
        if (view === 'store') {
            cpOpenStoreFromPortal();
            return true;
        }
        showCustomerPortalApp();
        return true;
    }

    function showCustomerPortalApp() {
        if (!currentPortalCustomer) return;
        if (typeof global.closeMobileNav === 'function') global.closeMobileNav();
        document.body.classList.add('customer-portal-open');
        const loginOv = document.getElementById('customer-portal-overlay');
        if (loginOv) loginOv.classList.remove('show');
        const app = document.getElementById('customer-portal-app');
        if (app) {
            app.hidden = false;
            app.classList.add('show');
        }
        if (typeof global.revealPlatformLayer === 'function') {
            global.revealPlatformLayer('customer-portal-app');
        } else if (typeof global.syncPlatformInteractionLayers === 'function') {
            global.syncPlatformInteractionLayers();
        }
        if (typeof global.clearStuckInteractionBlockers === 'function') global.clearStuckInteractionBlockers();
        renderCustomerPortalDashboard();
    }

    function formatMoney(n) {
        if (typeof formatSar === 'function') return formatSar(Number(n) || 0);
        return (Number(n) || 0).toLocaleString('ar-SA') + ' ر.س';
    }

    function cpHasPortalAccess(user, key) {
        const access = (user && Array.isArray(user.portalAccess) && user.portalAccess.length)
            ? user.portalAccess : CP_DEFAULT_ACCESS;
        return access.indexOf(key) >= 0;
    }

    function resolveCpRepContact(portalUser) {
        if (!portalUser) return { name: '', phone: '', username: '' };
        let users = [];
        try { users = global.adminUsers || []; } catch (e) { /* ignore */ }
        let rep = null;
        if (portalUser.assignedRepId) {
            rep = users.find(function(r) { return r && String(r.id) === String(portalUser.assignedRepId); });
        }
        if (!rep && portalUser.assignedRepUsername) {
            const un = String(portalUser.assignedRepUsername).toLowerCase();
            rep = users.find(function(r) { return r && String(r.username || '').toLowerCase() === un; });
        }
        const phone = String(portalUser.assignedRepPhone || (rep && rep.phone) || '').trim();
        const username = portalUser.assignedRepUsername || (rep && rep.username) || '';
        const name = (rep && (rep.displayName || rep.username)) || username || 'مندوب المبيعات';
        return { rep: rep, name: name, phone: phone, username: username };
    }

    function getCpSystemPhones() {
        let settings = {};
        try { settings = global.systemSettings || (typeof systemSettings !== 'undefined' ? systemSettings : {}); } catch (e) { /* ignore */ }
        return {
            sales: String(settings.mainSalesPhone || '0555092383').trim(),
            customerService: String(settings.customerServicePhone || '0579394158').trim()
        };
    }

    function getCpSettingsSnapshot() {
        try { return global.systemSettings || (typeof systemSettings !== 'undefined' ? systemSettings : {}); } catch (e) { return {}; }
    }

    function getCpWpcDoorPriceSample() {
        let products = [];
        try {
            products = global.siteProducts || [];
            if (!products.length) {
                const raw = localStorage.getItem('nebrasSiteProducts');
                if (raw) products = JSON.parse(raw);
            }
        } catch (e) { products = []; }
        let minPrice = null;
        (products || []).forEach(function(p) {
            if (!p || p.visible === false) return;
            const isWpc = p.id === 'prod-wpc' || p.id === 'prod-wpc-raw' ||
                String(p.titleAr || '').indexOf('WPC') >= 0 || String(p.titleAr || '').indexOf('أبواب') >= 0;
            if (!isWpc) return;
            (p.variants || []).forEach(function(v) {
                const pr = Number(v && v.price);
                if (pr > 0 && (minPrice === null || pr < minPrice)) minPrice = pr;
            });
        });
        return minPrice;
    }

    function getCpPortalDiscountPct(portalUser) {
        if (portalUser) {
            const tier = computeCustomerLoyaltyScore(portalUser).tier;
            if (tier === 'vip') return 10;
            if (tier === 'trusted') return 7;
            if (tier === 'active') return 5;
        }
        const settings = getCpSettingsSnapshot();
        const minPct = Number(settings.quoteDiscountMinPct);
        const maxFromSettings = Number.isFinite(minPct) ? Math.max(0, 100 - minPct) : 30;
        return Math.min(5, maxFromSettings > 0 ? maxFromSettings : 5);
    }

    function getCpActivePromoCampaigns() {
        const settings = getCpSettingsSnapshot();
        const today = new Date().toISOString().slice(0, 10);
        return (settings.productPromoCampaigns || []).filter(function(c) {
            if (!c || c.enabled === false) return false;
            if (c.startDate && String(c.startDate) > today) return false;
            if (c.endDate && String(c.endDate) < today) return false;
            return (c.productIds && c.productIds.length) || String(c.labelAr || c.labelEn || '').trim();
        });
    }

    function cpQuoteStatusLabel(status) {
        const map = {
            new: 'جديد', reviewed: 'قيد المراجعة', sent: 'مُرسَل', accepted: 'مقبول',
            sold: 'تم البيع', archived: 'أرشيف', finalized: 'منفّذ', pending: 'بانتظار الرد'
        };
        const key = String(status || 'new').toLowerCase();
        return map[key] || String(status || 'جديد');
    }

    function cpOrderStatusLabel(status) {
        const map = {
            pending: 'قيد الانتظار', confirmed: 'مؤكد', production: 'قيد الإنتاج',
            delivered: 'مُستلَم', cancelled: 'ملغي'
        };
        const key = String(status || 'pending').toLowerCase();
        return map[key] || String(status || 'قيد الانتظار');
    }

    function buildCpPromoBoardHtml(portalUser) {
        const discountPct = getCpPortalDiscountPct(portalUser);
        const basePrice = getCpWpcDoorPriceSample();
        const discounted = basePrice ? Math.round(basePrice * (1 - discountPct / 100) * 100) / 100 : null;
        const campaigns = getCpActivePromoCampaigns();
        const campaignHtml = campaigns.slice(0, 3).map(function(c) {
            const label = String(c.labelAr || c.labelEn || 'عرض محدود').trim();
            const note = String(c.noteAr || c.noteEn || c.descriptionAr || '').trim();
            return '<article class="cp-promo-offer cp-promo-offer--highlight">' +
                '<strong><i class="fas fa-bolt"></i> ' + esc(label) + '</strong>' +
                (note ? '<span>' + esc(note) + '</span>' : '') +
            '</article>';
        }).join('');
        const priceHtml = basePrice
            ? '<div class="cp-promo-price-pill"><s>' + formatMoney(basePrice) + '</s><em>' + formatMoney(discounted) + '</em><span>قبل الضريبة · حسب عرضك</span></div>'
            : '<span>أسعار أبواب WPC — اطلبي عرضاً مخصصاً</span>';
        const rep = resolveCpRepContact(portalUser);
        const tier = portalUser ? computeCustomerLoyaltyScore(portalUser).tier : 'new';
        return '<section class="cp-promo-board" aria-label="لوحة الخصومات والعروض">' +
            '<div class="cp-promo-board__glow" aria-hidden="true"></div>' +
            '<div class="cp-promo-board__inner">' +
                '<div class="cp-promo-board__head">' +
                    '<span class="cp-promo-board__badge"><i class="fas fa-fire"></i> عروض حصرية للعملاء</span>' +
                    '<span class="cp-promo-board__tier cp-promo-board__tier--' + esc(tier) + '">خصمولاء ' + discountPct + '%</span>' +
                '</div>' +
                '<h3 class="cp-promo-board__title">أبواب WPC — أسعار المصنع مباشرة لحسابك</h3>' +
                '<p class="cp-promo-board__sub">ضمان 10 سنوات · مقاومة للماء 100% · توريد وتركيب · خصم كميات للمقاولين</p>' +
                '<div class="cp-promo-board__grid">' +
                    '<article class="cp-promo-offer cp-promo-offer--hero">' +
                        '<strong><i class="fas fa-door-open"></i> أبواب WPC جاهزة</strong>' + priceHtml +
                    '</article>' +
                    '<article class="cp-promo-offer"><strong><i class="fas fa-layer-group"></i> خصم كميات</strong>' +
                        '<span>مقاولون · شركات · معارض — خصم تصاعدي حسب حجم الطلب.</span></article>' +
                    '<article class="cp-promo-offer"><strong><i class="fas fa-building"></i> مشاريع ومجمعات</strong>' +
                        '<span>عروض NHC · SASO · توريد + تركيب · شروط دفع مرنة.</span></article>' +
                    campaignHtml +
                '</div>' +
                '<div class="cp-promo-board__foot">' +
                    '<button type="button" class="cp-promo-board__cta" onclick="cpOpenStoreFromPortal()"><i class="fas fa-store"></i> استكشفي المتجر والأسعار</button>' +
                    '<p class="cp-promo-ticker"><i class="fas fa-headset"></i> مندوبك: ' + esc(rep.name || 'المبيعات') +
                        (rep.phone ? ' · ' + esc(rep.phone) : '') + '</p>' +
                '</div>' +
            '</div></section>';
    }

    function buildCpWelcomeStripHtml(portalUser, tierMeta, d) {
        const tierLabel = { vip: 'عميل VIP ★', trusted: 'عميل موثوق', active: 'عميل نشط', new: 'عميل جديد' };
        const disc = getCpPortalDiscountPct(portalUser);
        const rep = resolveCpRepContact(portalUser);
        return '<section class="cp-welcome-strip">' +
            '<div class="cp-welcome-strip__badge cp-welcome-strip__badge--' + esc(tierMeta.tier) + '">' +
                '<i class="fas fa-shield-heart"></i> ' + esc(tierLabel[tierMeta.tier] || '') +
            '</div>' +
            '<div class="cp-welcome-strip__copy">' +
                '<strong>مرحباً بك في نبراس</strong>' +
                '<span>' + d.totalQuotes + ' عرض · ' + d.orders.length + ' طلب · خصمولاء حتى ' + disc + '%</span>' +
            '</div>' +
            (rep.phone
                ? '<button type="button" class="cp-welcome-strip__rep" onclick="cpDialAssignedRep()"><i class="fas fa-user-tie"></i> ' + esc(rep.name || 'المندوب') + '</button>'
                : '') +
        '</section>';
    }

    function buildCpRepSidebarCardHtml(portalUser) {
        const rep = resolveCpRepContact(portalUser);
        const phones = getCpSystemPhones();
        return '<section class="cp-sidebar-card cp-sidebar-card--rep" aria-label="فريق نبراس لخدمتك">' +
            '<h3><i class="fas fa-headset"></i> فريقك في نبراس</h3>' +
            '<div class="cp-rep-card">' +
                '<div class="cp-rep-card__row"><i class="fas fa-user-tie"></i><div><strong>المندوب</strong><span>' + esc(rep.name || 'يُحدَّد قريباً') + '</span></div></div>' +
                (rep.phone ? '<button type="button" class="cp-rep-card__btn" onclick="cpDialAssignedRep()"><i class="fas fa-phone"></i> ' + esc(rep.phone) + '</button>' : '') +
                '<div class="cp-rep-card__row"><i class="fas fa-user-shield"></i><div><strong>مدير المبيعات</strong><span dir="ltr">' + esc(phones.sales) + '</span></div></div>' +
                '<button type="button" class="cp-rep-card__btn cp-rep-card__btn--ghost" onclick="cpDialSalesManager()"><i class="fas fa-phone-volume"></i> اتصال</button>' +
            '</div></section>';
    }

    function buildCpBranchesRailHtml() {
        if (typeof global.ensureBuiltinBranches === 'function') global.ensureBuiltinBranches();
        const branches = (typeof global.getNebrasBranchesForEmpire === 'function'
            ? global.getNebrasBranchesForEmpire()
            : (typeof global.branchesData !== 'undefined' ? global.branchesData : [])) || [];
        const list = branches.filter(function(b) { return b && (b.city || b.cityAr); });
        if (!list.length) return '';
        const items = list.map(function(b) {
            const name = b.city || b.cityAr || '—';
            const phone = String(b.salesPhone || '').trim();
            const bid = Number(b.id);
            return '<article class="cp-branch-rail-item" data-branch-id="' + bid + '">' +
                '<strong><i class="fas fa-map-marker-alt"></i> ' + esc(name) + '</strong>' +
                (phone ? '<a class="cp-branch-rail-phone" href="tel:' + esc(phone) + '" dir="ltr">' + esc(phone) + '</a>' : '') +
                '<div class="cp-branch-rail-actions">' +
                    (phone ? '<button type="button" class="cp-branch-rail-btn" onclick="cpBranchDial(' + bid + ')" title="اتصال مباشر"><i class="fas fa-phone"></i></button>' : '') +
                    '<button type="button" class="cp-branch-rail-btn" onclick="cpBranchSmartRoute(' + bid + ')" title="تحويل ذكي"><i class="fas fa-route"></i></button>' +
                '</div></article>';
        }).join('');
        return '<section class="cp-sidebar-card cp-sidebar-card--branches" aria-label="فروع نبراس في المملكة">' +
            '<h3><i class="fas fa-map-marked-alt"></i> فروع نبراس</h3>' +
            '<p class="cp-sidebar-sub">تواصلي مع أقرب فرع — أرقام المبيعات محدّثة تلقائياً</p>' +
            '<div class="cp-branch-rail">' + items + '</div>' +
        '</section>';
    }

    function buildCpPromoRailHtml() {
        return '<section class="cp-sidebar-card cp-sidebar-card--promo" aria-label="عروض حصرية للعملاء">' +
            '<h3><i class="fas fa-tags"></i> عروض حصرية للعملاء</h3>' +
            '<ul class="cp-promo-list">' +
                '<li><i class="fas fa-percent"></i> خصم لعملاء الحساب المسجّل</li>' +
                '<li><i class="fas fa-door-open"></i> أبواب WPC جاهزة بأسعار المصنع</li>' +
                '<li><i class="fas fa-boxes-stacked"></i> خصم كميات للشركات والمقاولين</li>' +
                '<li><i class="fas fa-building"></i> عروض مشاريع ومجمعات سكنية</li>' +
            '</ul>' +
            '<button type="button" class="cp-promo-cta" onclick="cpOpenStoreFromPortal()"><i class="fas fa-store"></i> استكشف المتجر والأسعار</button>' +
        '</section>';
    }

    function cpBranchDial(branchId) {
        const branches = (typeof global.getNebrasBranchesForEmpire === 'function'
            ? global.getNebrasBranchesForEmpire() : []) || [];
        const b = branches.find(function(x) { return Number(x.id) === Number(branchId); });
        const phone = b && b.salesPhone ? String(b.salesPhone).trim() : '';
        if (!phone) { alert('لا يوجد رقم مبيعات لهذا الفرع.'); return; }
        if (typeof global.dialNumber === 'function') global.dialNumber(phone);
        else window.location.href = 'tel:' + phone;
    }

    function cpBranchSmartRoute(branchId) {
        const branches = (typeof global.getNebrasBranchesForEmpire === 'function'
            ? global.getNebrasBranchesForEmpire() : []) || [];
        const b = branches.find(function(x) { return Number(x.id) === Number(branchId); });
        if (!b) return;
        const city = b.city || b.cityAr || '';
        const phone = b.salesPhone || (typeof global.getNearestSalesNumber === 'function'
            ? (global.getNearestSalesNumber(city).phone || '') : '');
        if (!phone) { alert('لا يوجد رقم تحويل لهذا الفرع.'); return; }
        alert('تحويل ذكي — ' + city + '\n' + phone);
        if (typeof global.dialNumber === 'function') global.dialNumber(phone);
        else window.location.href = 'tel:' + phone;
    }

    function cpReturnToPortalDashboard() {
        if (typeof global.closeNebrasWorkspace === 'function' && document.body.classList.contains('nebras-workspace-active')) {
            document.body.classList.remove('customer-portal-store-active');
            global.closeNebrasWorkspace();
        }
        document.body.classList.remove('customer-portal-store-active');
        cpRemoveStoreBackFab();
        if (!currentPortalCustomer) return;
        persistCpSession({ view: 'dashboard' });
        document.body.classList.add('customer-portal-open');
        const app = document.getElementById('customer-portal-app');
        if (app) {
            app.hidden = false;
            app.classList.add('show');
            app.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        renderCustomerPortalDashboard();
        const body = document.getElementById('customer-portal-body');
        if (body) body.scrollTop = 0;
        window.scrollTo(0, 0);
    }

    function cpGoToMainSite() {
        document.body.classList.remove('customer-portal-store-active');
        cpRemoveStoreBackFab();
        if (typeof global.closeNebrasWorkspace === 'function') global.closeNebrasWorkspace();
        const app = document.getElementById('customer-portal-app');
        if (app) {
            app.hidden = true;
            app.classList.remove('show');
            app.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('customer-portal-open');
        persistCpSession({ view: 'main-site' });
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        try {
            if (window.location.hash) history.replaceState({}, '', window.location.pathname + window.location.search);
        } catch (e) { /* ignore */ }
        const home = document.getElementById('nav-home');
        if (home) home.click();
        else {
            const hero = document.getElementById('hero');
            if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo(0, 0);
        }
    }

    function cpEnsureStoreBackFab() {
        let fab = document.getElementById('cp-store-back-fab');
        if (!fab) {
            fab = document.createElement('button');
            fab.type = 'button';
            fab.id = 'cp-store-back-fab';
            fab.className = 'cp-store-back-fab';
            fab.setAttribute('aria-label', 'العودة للوحة حسابي');
            fab.innerHTML = '<i class="fas fa-gauge-high" aria-hidden="true"></i><span>لوحتي</span>';
            fab.addEventListener('click', function(ev) {
                if (ev) ev.preventDefault();
                cpReturnToPortalDashboard();
            });
            document.body.appendChild(fab);
        }
        fab.hidden = false;
        fab.classList.add('show');
    }

    function cpRemoveStoreBackFab() {
        const fab = document.getElementById('cp-store-back-fab');
        if (fab) {
            fab.classList.remove('show');
            fab.hidden = true;
        }
    }

    function cpOpenStoreFromPortal() {
        if (!currentPortalCustomer) return;
        persistCpSession({ view: 'store' });
        document.body.classList.add('customer-portal-store-active');
        const app = document.getElementById('customer-portal-app');
        if (app) {
            app.classList.remove('show');
            app.hidden = true;
            app.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('customer-portal-open');
        if (typeof global.openNebrasWorkspace === 'function') {
            global.openNebrasWorkspace({ pillar: 'store', view: 'catalog-all' });
        } else if (typeof global.openProductShop === 'function') {
            global.openProductShop();
        }
        cpEnsureStoreBackFab();
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    function buildCpShowcasesHtml() {
        return '<section class="cp-hero-strip" aria-label="نبراس — صمّم بابك وشركاؤنا">' +
            '<div class="cp-showcase-card cp-showcase-card--doors" id="cp-door-aside" role="button" tabindex="0" aria-label="صمّم بابك">' +
                '<span class="cp-showcase-chip cp-showcase-chip--doors"><i class="fas fa-pencil-ruler"></i> صمّم بابك</span>' +
                '<div class="cp-showcase-frame">' +
                    '<div class="nebras-mini-showcase nebras-mini-showcase--doors nebras-mini-showcase--hero nebras-mini-showcase--interactive" id="cp-door-showcase"></div>' +
                '</div>' +
            '</div>' +
            '<div class="cp-showcase-card cp-showcase-card--partners" aria-label="شركاؤنا">' +
                '<span class="cp-showcase-chip cp-showcase-chip--partners"><i class="fas fa-handshake"></i> شركاؤنا</span>' +
                '<div class="cp-showcase-frame">' +
                    '<div class="nebras-mini-showcase nebras-mini-showcase--partners" id="cp-partners-showcase"></div>' +
                '</div>' +
            '</div>' +
        '</section>';
    }

    function buildCpQuickActionsHtml(portalUser) {
        const phones = getCpSystemPhones();
        const rep = resolveCpRepContact(portalUser);
        const repPhone = rep.phone || phones.sales;
        const repLabel = rep.name ? ('المندوب: ' + rep.name) : 'مندوب المبيعات';
        return '<section class="cp-quick-actions cp-quick-actions--compact" aria-label="خدمات العميل">' +
            '<button type="button" class="cp-action-btn cp-action-btn--complaint" onclick="cpOpenComplaints()"><i class="fas fa-comment-dots"></i><span>الشكاوى</span><small>تقديم شكوى</small></button>' +
            '<button type="button" class="cp-action-btn cp-action-btn--service" onclick="cpDialCustomerService()"><i class="fas fa-headset"></i><span>خدمة العملاء</span><small>' + esc(phones.customerService) + '</small></button>' +
            '<button type="button" class="cp-action-btn cp-action-btn--sales" onclick="cpDialSalesManager()"><i class="fas fa-user-tie"></i><span>مدير المبيعات</span><small>' + esc(phones.sales) + '</small></button>' +
            '<button type="button" class="cp-action-btn cp-action-btn--rep" onclick="cpDialAssignedRep()"><i class="fas fa-id-badge"></i><span>' + esc(repLabel) + '</span><small>' + esc(repPhone || '—') + '</small></button>' +
            '<button type="button" class="cp-action-btn cp-action-btn--pdf" onclick="exportCustomerStatementPdf()"><i class="fas fa-file-pdf"></i><span>كشف حساب PDF</span><small>تقرير نبراس الرسمي</small></button>' +
        '</section>';
    }

    function wireCpPortalShowcases() {
        if (typeof global.refreshCustomerPortalShowcases === 'function') {
            global.refreshCustomerPortalShowcases();
        }
        const doorAside = document.getElementById('cp-door-aside');
        if (doorAside && doorAside.dataset.cpDoorWired !== '1') {
            doorAside.dataset.cpDoorWired = '1';
            function openDesigner() {
                if (typeof global.openNebrasWorkspace === 'function') {
                    global.openNebrasWorkspace({ pillar: 'store', view: 'door-designer' });
                }
            }
            doorAside.addEventListener('click', openDesigner);
            doorAside.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDesigner(); }
            });
        }
    }

    function cpOpenComplaints() {
        const u = currentPortalCustomer;
        if (typeof global.openCustomerComplaints === 'function') {
            global.openCustomerComplaints();
        } else if (typeof global.revealPlatformLayer === 'function') {
            global.revealPlatformLayer('complaint-overlay');
        } else {
            const ov = document.getElementById('complaint-overlay');
            if (ov) { ov.classList.add('show'); ov.setAttribute('aria-hidden', 'false'); }
        }
        if (u) {
            setTimeout(function() {
                const nameEl = document.getElementById('complaint-customer-name');
                const phoneEl = document.getElementById('complaint-customer-phone');
                const branchEl = document.getElementById('complaint-customer-branch');
                if (nameEl && !nameEl.value) nameEl.value = u.displayName || u.username || '';
                if (phoneEl && !phoneEl.value) phoneEl.value = u.phone || '';
                if (branchEl && !branchEl.value) branchEl.value = u.branchCity || '';
            }, 80);
        }
    }

    function cpDialCustomerService() {
        const p = getCpSystemPhones().customerService;
        if (typeof global.dialNumber === 'function') global.dialNumber(p);
        else window.location.href = 'tel:' + p;
    }

    function cpDialSalesManager() {
        const p = getCpSystemPhones().sales;
        if (typeof global.dialNumber === 'function') global.dialNumber(p);
        else window.location.href = 'tel:' + p;
    }

    function cpDialAssignedRep() {
        const rep = resolveCpRepContact(currentPortalCustomer);
        const p = rep.phone || getCpSystemPhones().sales;
        if (!p) { alert('لم يُحدَّد رقم المندوب بعد — تواصلي مع المبيعات.'); return; }
        if (typeof global.dialNumber === 'function') global.dialNumber(p);
        else window.location.href = 'tel:' + p;
    }

    function buildCustomerStatementReport(portalUser) {
        const d = collectPortalCustomerData(portalUser);
        let totalQuotes = 0;
        let totalOrders = 0;
        let totalTransfers = 0;
        d.quotes.forEach(function(q) { totalQuotes += Number(q.totalIncVat || q.total || 0); });
        d.orders.forEach(function(o) { totalOrders += Number(o.amount || o.total || 0); });
        d.transfers.forEach(function(t) { totalTransfers += Number(t.amount || 0); });
        const brandPrimary = typeof global.getNebrasBrandPrimary === 'function' ? global.getNebrasBrandPrimary('ar') : 'شركة مصنع نبراس لأبواب الـ WPC';
        const brandLegal = typeof global.getNebrasBrandLegal === 'function' ? global.getNebrasBrandLegal('ar') : 'شركة مصنع نبراس للبلاستيك';
        const rep = resolveCpRepContact(portalUser);
        const generatedAt = typeof global.formatNebrasDateTime === 'function'
            ? global.formatNebrasDateTime(Date.now(), 'ar')
            : new Date().toLocaleString('ar-SA');
        const quoteRows = d.quotes.slice(0, 25).map(function(q) {
            return [q.quoteNo || q.id || '—', formatMoney(q.totalIncVat || q.total || 0), String(q.status || 'جديد')];
        });
        const orderRows = d.orders.slice(0, 25).map(function(o) {
            return [o.orderNo || o.id || '—', String(o.status || 'pending'), formatMoney(o.amount || o.total || 0)];
        });
        const transferRows = d.transfers.slice(0, 25).map(function(t) {
            return [t.date || '—', formatMoney(t.amount || 0), t.bankAr || t.bank || '—'];
        });
        return {
            brandPrimary: brandPrimary,
            brandLegal: brandLegal,
            generatedAt: generatedAt,
            customerName: portalUser.displayName || portalUser.username || '—',
            customerPhone: portalUser.phone || '—',
            repName: rep.name || '—',
            repPhone: rep.phone || '—',
            summary: [
                ['عروض أسعار', String(d.totalQuotes), formatMoney(totalQuotes)],
                ['طلبات', String(d.totalOrders), formatMoney(totalOrders)],
                ['حوالات بنكية', String(d.totalTransfers), formatMoney(totalTransfers)],
                ['إجمالي تعاملات', '—', formatMoney(totalQuotes + totalOrders + totalTransfers)]
            ],
            quoteRows: quoteRows,
            orderRows: orderRows,
            transferRows: transferRows
        };
    }

    function buildCustomerStatementHtml(report) {
        function tableSection(title, headers, rows) {
            if (!rows.length) return '<section class="cp-statement-section"><h3>' + esc(title) + '</h3><p class="cp-statement-empty">لا سجلات.</p></section>';
            const head = '<tr>' + headers.map(function(h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
            const body = rows.map(function(row) {
                return '<tr>' + row.map(function(c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
            }).join('');
            return '<section class="cp-statement-section"><h3>' + esc(title) + '</h3><table class="cp-statement-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></section>';
        }
        const summaryRows = report.summary.map(function(r) {
            return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td><strong>' + esc(r[2]) + '</strong></td></tr>';
        }).join('');
        return '<div id="cp-statement-pdf-doc" class="cp-statement-pdf-doc" dir="rtl">' +
            '<header class="cp-statement-head">' +
                '<div class="cp-statement-brand">' +
                    '<strong>' + esc(report.brandPrimary) + '</strong>' +
                    '<span>' + esc(report.brandLegal) + '</span>' +
                '</div>' +
                '<h2>كشف حساب العميل</h2>' +
                '<p>تاريخ التقرير: ' + esc(report.generatedAt) + '</p>' +
            '</header>' +
            '<section class="cp-statement-meta">' +
                '<p><strong>العميل:</strong> ' + esc(report.customerName) + ' — ' + esc(report.customerPhone) + '</p>' +
                '<p><strong>المندوب:</strong> ' + esc(report.repName) + (report.repPhone ? ' — ' + esc(report.repPhone) : '') + '</p>' +
            '</section>' +
            '<section class="cp-statement-section"><h3>ملخص الحساب</h3><table class="cp-statement-table"><tbody>' + summaryRows + '</tbody></table></section>' +
            tableSection('عروض الأسعار', ['رقم العرض', 'المبلغ', 'الحالة'], report.quoteRows) +
            tableSection('الطلبات', ['رقم الطلب', 'الحالة', 'المبلغ'], report.orderRows) +
            tableSection('الحوالات البنكية', ['التاريخ', 'المبلغ', 'البنك'], report.transferRows) +
            '<footer class="cp-statement-foot">© ' + esc(report.brandLegal) + ' — كشف حساب استرشادي للعميل</footer>' +
        '</div>';
    }

    async function exportCustomerStatementPdf() {
        if (!currentPortalCustomer) return;
        const btn = document.querySelector('.cp-action-btn--pdf');
        if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
        let mount = document.getElementById('cp-statement-pdf-mount');
        if (!mount) {
            mount = document.createElement('div');
            mount.id = 'cp-statement-pdf-mount';
            mount.className = 'cp-statement-pdf-mount';
            mount.setAttribute('aria-hidden', 'true');
            document.body.appendChild(mount);
        }
        try {
            const report = buildCustomerStatementReport(currentPortalCustomer);
            mount.innerHTML = buildCustomerStatementHtml(report);
            const doc = document.getElementById('cp-statement-pdf-doc');
            if (!doc) throw new Error('statement-doc-missing');
            if (document.fonts && document.fonts.ready) {
                try { await document.fonts.ready; } catch (e) { /* ignore */ }
            }
            const loadCanvas = typeof global.loadHtml2CanvasLib === 'function' ? global.loadHtml2CanvasLib : null;
            const loadPdf = typeof global.loadJsPdfLib === 'function' ? global.loadJsPdfLib : null;
            if (!loadCanvas || !loadPdf) throw new Error('pdf-lib-missing');
            const html2canvas = await loadCanvas();
            const jsPDF = await loadPdf();
            const canvas = await html2canvas(doc, {
                scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false,
                width: doc.scrollWidth, height: doc.scrollHeight
            });
            const dataUrl = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgDims = typeof global.getDataUrlImageSize === 'function'
                ? await global.getDataUrlImageSize(dataUrl)
                : { w: canvas.width, h: canvas.height };
            const pxToMm = 0.264583;
            let imgW = imgDims.w * pxToMm;
            let imgH = imgDims.h * pxToMm;
            const ratio = Math.min(pageW / imgW, pageH / imgH, 1);
            imgW *= ratio;
            imgH *= ratio;
            pdf.addImage(dataUrl, 'PNG', (pageW - imgW) / 2, 0, imgW, imgH);
            const stamp = 'nebras-statement-' + String(currentPortalCustomer.username || 'customer') + '-' + new Date().toISOString().slice(0, 10) + '.pdf';
            pdf.save(stamp);
        } catch (err) {
            console.warn('Customer statement PDF failed:', err);
            alert('تعذّر إنشاء كشف الحساب — حاولي مرة أخرى بعد تحديث الصفحة.');
        } finally {
            if (mount) mount.innerHTML = '';
            if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
        }
    }

    async function cpResolveCustomerQuote(entryId) {
        const u = currentPortalCustomer;
        if (!u || !entryId) return null;
        const key = String(entryId).trim();
        function matchEntry(e) {
            if (!e) return false;
            return String(e.id) === key || String(e.quoteNo || '') === key || String(e.cloudId || '') === key;
        }
        let entry = null;
        try {
            const inbox = typeof loadSalesQuotesInbox === 'function' ? (loadSalesQuotesInbox() || []) : [];
            entry = inbox.find(matchEntry);
        } catch (e) { /* ignore */ }
        if (!entry && typeof global.fetchSalesQuotesFromCloud === 'function') {
            try {
                const cloud = await global.fetchSalesQuotesFromCloud();
                entry = (cloud || []).find(matchEntry);
            } catch (e) { /* ignore */ }
        }
        if (!entry || !entryBelongsToPortalCustomer(entry, u)) return null;
        return entry;
    }

    function ensureCpQuoteDetailOverlay() {
        let overlay = document.getElementById('cp-quote-detail-overlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'cp-quote-detail-overlay';
        overlay.className = 'cp-quote-detail-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="cp-quote-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cp-quote-detail-title">' +
            '<button type="button" class="cp-quote-detail-close" onclick="cpCloseQuoteDetail()" aria-label="إغلاق">&times;</button>' +
            '<div id="cp-quote-detail-body"></div></div>';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(ev) {
            if (ev.target === overlay) cpCloseQuoteDetail();
        });
        return overlay;
    }

    function buildCpQuoteLineHtml(line) {
        const qty = Number(line.qty) || 1;
        const price = Number(line.price != null ? line.price : line.unitPrice) || 0;
        const list = Number(line.listPrice) || price;
        const title = line.productAr || line.productTitle || line.productId || 'صنف';
        const specs = [line.color, line.size, line.type].filter(Boolean).join(' · ');
        const disc = list > price ? '<span class="cp-quote-line-disc">خصم ' + Math.round((1 - price / list) * 100) + '%</span>' : '';
        return '<li class="cp-quote-line">' +
            '<div class="cp-quote-line__main"><strong>' + esc(title) + '</strong>' +
            (specs ? '<small>' + esc(specs) + '</small>' : '') + '</div>' +
            '<div class="cp-quote-line__nums"><span>×' + qty + '</span><em>' + formatMoney(price * qty) + '</em>' + disc + '</div>' +
        '</li>';
    }

    async function cpViewQuote(entryId) {
        const entry = await cpResolveCustomerQuote(entryId);
        if (!entry) { alert('العرض غير متاح أو لا يخص حسابك.'); return; }
        const overlay = ensureCpQuoteDetailOverlay();
        const body = document.getElementById('cp-quote-detail-body');
        if (!body) return;
        const disc = quoteDiscountSummary(entry);
        const discBlock = disc
            ? '<div class="cp-quote-detail-disc"><i class="fas fa-tag"></i> خصم ' + disc.pct + '% · ' + formatMoney(disc.amount) + '</div>'
            : '';
        const lines = (entry.lines || []).map(buildCpQuoteLineHtml).join('');
        const pdfUrl = entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl || '';
        const docBlock = pdfUrl
            ? '<a class="cp-quote-detail-pdf" href="' + escAttr(pdfUrl) + '" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i> تحميل عرض السعر PDF</a>'
            : '';
        const entryKey = escAttr(String(entry.id || entry.quoteNo || ''));
        body.innerHTML =
            '<header class="cp-quote-detail-head">' +
                '<span class="cp-quote-detail-kicker"><i class="fas fa-file-invoice"></i> عرض سعر رسمي</span>' +
                '<h3 id="cp-quote-detail-title">' + esc(entry.quoteNo || entry.id || '—') + '</h3>' +
                '<p class="cp-quote-detail-meta">' + esc(cpQuoteStatusLabel(entry.status)) +
                    (entry.convertedToOrder ? ' · مُحوَّل لطلب' : '') + '</p>' +
            '</header>' +
            discBlock +
            '<div class="cp-quote-detail-totals">' +
                '<div><span>قبل الضريبة</span><strong>' + formatMoney(entry.subtotalExVat || entry.subtotal || 0) + '</strong></div>' +
                '<div><span>شامل الضريبة</span><strong class="cp-quote-detail-grand">' + formatMoney(entry.totalIncVat || entry.total || 0) + '</strong></div>' +
            '</div>' +
            (lines ? '<ul class="cp-quote-detail-lines">' + lines + '</ul>' : '<p class="cp-empty">لا أصناف مسجّلة في هذا العرض.</p>') +
            '<div class="cp-quote-detail-actions">' +
                '<button type="button" class="cp-quote-detail-btn cp-quote-detail-btn--primary" onclick="cpPreviewCustomerQuoteA4(\'' + entryKey.replace(/'/g, "\\'") + '\')"><i class="fas fa-eye"></i> معاينة A4 احترافية</button>' +
                docBlock +
                '<button type="button" class="cp-quote-detail-btn" onclick="cpDialAssignedRep()"><i class="fas fa-phone"></i> تواصلي مع المندوب</button>' +
            '</div>';
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    function cpCloseQuoteDetail() {
        const overlay = document.getElementById('cp-quote-detail-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    async function cpPreviewCustomerQuoteA4(entryId) {
        const entry = await cpResolveCustomerQuote(entryId);
        if (!entry) return;
        if (typeof global.openSalesQuoteA4Preview === 'function') {
            global.openSalesQuoteA4Preview(entry, { allowEmpty: true, customerPortal: true });
            return;
        }
        const pdfUrl = entry.quoteDocumentPdfUrl || entry.quoteDocumentCloudUrl || entry.quoteDocumentDataUrl || '';
        if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        else alert('معاينة A4 غير متاحة حالياً — تواصلي مع المبيعات.');
    }

    function wireCpQuoteRowClicks() {
        const host = document.getElementById('customer-portal-body');
        if (!host) return;
        host.querySelectorAll('.cp-row--clickable[data-cp-quote-id]').forEach(function(row) {
            if (row.dataset.cpQuoteWired === '1') return;
            row.dataset.cpQuoteWired = '1';
            function openQuote() { cpViewQuote(row.getAttribute('data-cp-quote-id')); }
            row.addEventListener('click', openQuote);
            row.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuote(); }
            });
        });
    }

    function quoteDiscountSummary(q) {
        if (!q) return null;
        const num = function(v) { return Number(v) || 0; };
        if (num(q.discountTotal) > 0) {
            return { amount: num(q.discountTotal), pct: num(q.discountPct) || 0 };
        }
        const lines = q.lines || [];
        let listTotal = 0;
        let netTotal = 0;
        lines.forEach(function(l) {
            const qty = Number(l.qty) || 1;
            const price = Number(l.price != null ? l.price : l.unitPrice) || 0;
            const list = Number(l.listPrice) || price;
            listTotal += list * qty;
            netTotal += price * qty;
        });
        if (listTotal <= netTotal) return null;
        return { amount: listTotal - netTotal, pct: Math.round(((listTotal - netTotal) / listTotal) * 100) };
    }

    function renderCustomerPortalDashboard() {
        const host = document.getElementById('customer-portal-body');
        const head = document.getElementById('customer-portal-head');
        if (!host || !currentPortalCustomer) return;
        const u = currentPortalCustomer;
        const d = collectPortalCustomerData(u);
        if (head) {
            head.innerHTML = '<div class="cp-head-inner cp-head-inner--premium">' +
                '<div class="cp-head-brand">' +
                    '<span class="cp-head-pill"><i class="fas fa-user-circle"></i> حساب العميل</span>' +
                    '<h2>مرحباً، ' + esc(u.displayName || u.username) + '</h2>' +
                    '<p>لوحتك الخاصة — عروضك · طلباتك · حوالاتك · خصوماتك</p>' +
                '</div>' +
                '<nav class="cp-head-nav" aria-label="تنقل حساب العميل">' +
                    '<button type="button" class="cp-head-nav__btn cp-head-nav__btn--active" onclick="cpReturnToPortalDashboard()"><i class="fas fa-gauge-high"></i><span>لوحتي</span></button>' +
                    '<button type="button" class="cp-head-nav__btn" onclick="cpGoToMainSite()"><i class="fas fa-home"></i><span>الرئيسية</span></button>' +
                    '<button type="button" class="cp-head-nav__btn" onclick="cpOpenStoreFromPortal()"><i class="fas fa-store"></i><span>المتجر</span></button>' +
                '</nav>' +
                '<button type="button" class="cp-logout-btn" onclick="logoutCustomerPortal()"><i class="fas fa-right-from-bracket"></i> خروج</button></div>';
        }
        const tierMeta = computeCustomerLoyaltyScore(u);
        const tierLabel = { vip: 'عميل VIP', trusted: 'عميل موثوق', active: 'عميل نشط', new: 'عميل جديد' };
        const journeyHtml = cpHasPortalAccess(u, 'journeys')
            ? '<section class="cp-panel cp-panel--journey"><h3><i class="fas fa-route"></i> مسار نبراس — طلبك</h3>' +
                (typeof global.renderCustomerJourneysHtml === 'function'
                    ? global.renderCustomerJourneysHtml(u)
                    : '<p class="cp-empty">مسار الطلب قيد التفعيل.</p>') +
            '</section>'
            : '';
        const quotesHtml = cpHasPortalAccess(u, 'quotes')
            ? '<section class="cp-panel cp-panel--quotes"><div class="cp-panel-head"><h3><i class="fas fa-file-invoice"></i> عروض الأسعار</h3>' +
                (d.quotesPending && d.quotesPending.length
                    ? '<span class="cp-panel-badge">' + d.quotesPending.length + ' بانتظار الرد</span>' : '') +
                '</div>' +
                (d.quotes.length ? '<div class="cp-list">' + d.quotes.slice(0, 20).map(function(q) {
                    const disc = quoteDiscountSummary(q);
                    const discHtml = disc
                        ? '<span class="cp-discount-badge"><i class="fas fa-tag"></i> خصم ' + disc.pct + '% · ' + formatMoney(disc.amount) + '</span>'
                        : '';
                    const qKey = escAttr(String(q.id || q.quoteNo || ''));
                    return '<article class="cp-row cp-row--clickable" role="button" tabindex="0" data-cp-quote-id="' + qKey + '" title="اضغطي لعرض التفاصيل">' +
                        '<div class="cp-row__lead"><strong>' + esc(q.quoteNo || q.id || '—') + '</strong>' +
                        '<small>' + esc(cpQuoteStatusLabel(q.status)) + (q.convertedToOrder ? ' · طلب OMS' : '') + '</small></div>' +
                        '<div class="cp-row__trail"><span class="cp-row__amount">' + formatMoney(q.totalIncVat || q.total || 0) + '</span>' +
                        discHtml + '<i class="fas fa-chevron-left cp-row__chev" aria-hidden="true"></i></div></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا عروض مسجّلة بعد — تواصلي مع مبيعات نبراس.</p>') +
            '</section>'
            : '';
        const ordersHtml = cpHasPortalAccess(u, 'orders')
            ? '<section class="cp-panel"><h3><i class="fas fa-truck"></i> الطلبات</h3>' +
                '<div class="cp-subtabs">' +
                    '<span class="cp-subtab">قيد التجهيز: ' + d.preparing.length + '</span>' +
                    '<span class="cp-subtab">مُستلَمة: ' + d.delivered.length + '</span>' +
                    '<span class="cp-subtab">تحتاج طلب: ' + d.quotesNeedOrder.length + '</span>' +
                '</div>' +
                (d.orders.length ? '<div class="cp-list">' + d.orders.slice(0, 20).map(function(o) {
                    return '<article class="cp-row"><div class="cp-row__lead"><strong>' + esc(o.orderNo || o.id) + '</strong>' +
                        '<small>' + esc(o.product || o.branch || '') + '</small></div>' +
                        '<span class="cp-row__status">' + esc(cpOrderStatusLabel(o.status)) + '</span></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا طلبات بعد.</p>') +
            '</section>'
            : '';
        const transfersHtml = cpHasPortalAccess(u, 'transfers')
            ? '<section class="cp-panel"><h3><i class="fas fa-building-columns"></i> حوالاتك البنكية</h3>' +
                (d.transfers.length ? '<div class="cp-list">' + d.transfers.slice(0, 15).map(function(t) {
                    return '<article class="cp-row"><strong>' + formatMoney(t.amount) + '</strong>' +
                        '<span>' + esc(t.bankAr || t.bank || '—') + '</span>' +
                        '<small>' + esc(t.date || '') + ' · ' + esc(t.refNo || t.quoteNo || '') + '</small></article>';
                }).join('') + '</div>' : '<p class="cp-empty">لا حوالات مسجّلة — ارفع إيصال الحوالة عند الدفع من السلة.</p>') +
            '</section>'
            : '';
        host.innerHTML =
            (typeof global.renderCustomerJourneyAlertsHtml === 'function' ? global.renderCustomerJourneyAlertsHtml(u) : '') +
            '<div class="cp-dashboard-shell">' +
                '<div class="cp-dashboard-main">' +
                    buildCpWelcomeStripHtml(u, tierMeta, d) +
                    '<div class="cp-stats cp-stats--premium cp-stats--top">' +
                        '<article class="cp-stat"><strong>' + d.totalQuotes + '</strong><span>عروض أسعار</span></article>' +
                        '<article class="cp-stat"><strong>' + d.preparing.length + '</strong><span>قيد التجهيز</span></article>' +
                        '<article class="cp-stat"><strong>' + d.delivered.length + '</strong><span>مُستلَمة</span></article>' +
                        '<article class="cp-stat cp-stat--tier cp-stat--' + tierMeta.tier + '"><strong>' + esc(tierLabel[tierMeta.tier] || '') + '</strong><span>تصنيفك</span></article>' +
                    '</div>' +
                    buildCpPromoBoardHtml(u) +
                    buildCpQuickActionsHtml(u) +
                    '<div class="cp-panels-grid">' +
                        journeyHtml + quotesHtml + ordersHtml + transfersHtml +
                    '</div>' +
                '</div>' +
                '<aside class="cp-dashboard-sidebar">' +
                    buildCpRepSidebarCardHtml(u) +
                    buildCpBranchesRailHtml() +
                '</aside>' +
            '</div>';
        wireCpQuoteRowClicks();
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
            const ctype = resolveCpCustomerType(u);
            return '<article class="nebras-user-card cp-gov-card">' +
                '<header class="nebras-user-card-head">' +
                    '<span class="nebras-user-avatar"><i class="fas fa-user-circle"></i></span>' +
                    '<div><strong>' + esc(u.displayName || u.username) + '</strong><small>' + esc(u.username) + '</small></div>' +
                    '<span class="cp-customer-type-badge cp-customer-type-badge--' + ctype + '">' + esc(getCpCustomerTypeLabel(ctype)) + '</span>' +
                '</header>' +
                (ctype === CP_CUSTOMER_TYPE_BUSINESS && (u.commercialRegistration || u.taxId)
                    ? '<span class="nebras-user-branch"><i class="fas fa-building"></i> سجل: ' + esc(u.commercialRegistration || '—') + ' · ضريبي: ' + esc(u.taxId || '—') + '</span>'
                    : '') +
                (u.phone ? '<span class="nebras-user-branch"><i class="fas fa-mobile-screen"></i> ' + esc(u.phone) + '</span>' : '') +
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
                    const phoneHint = r.phone ? (' — ' + r.phone) : '';
                    return '<option value="' + escAttr(r.id) + '"' + (sel ? ' selected' : '') + '>' + esc(r.displayName || r.username) + esc(phoneHint) + '</option>';
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
                    buildCpCustomerTypeEditorHtml(user, pre) +
                    '<label class="nebras-field" id="cp-e-display-label"><span>' + (resolveCpCustomerType(user || pre) === CP_CUSTOMER_TYPE_CASH ? 'اسم العميل' : 'اسم المؤسسة / الشركة') + '</span><input id="cp-e-display" value="' + escAttr(user ? user.displayName : (pre.displayName || '')) + '"></label>' +
                    '<label class="nebras-field"><span>اسم المستخدم</span><input id="cp-e-username" value="' + escAttr(user ? user.username : (pre.username || '')) + '"></label>' +
                    '<label class="nebras-field"><span>كلمة المرور</span><input id="cp-e-password" type="text" value="" placeholder="' + (isEdit ? 'اتركها فارغة للإبقاء' : 'مطلوبة') + '"></label>' +
                    '<label class="nebras-field"><span>الجوال <em class="cp-req">*</em></span><input id="cp-e-phone" value="' + escAttr(user ? user.phone : (pre.phone || '')) + '" inputmode="tel" placeholder="05xxxxxxxx"></label>' +
                    '<label class="nebras-field"><span>البريد (اختياري)</span><input id="cp-e-email" type="email" value="' + escAttr(user ? user.email : '') + '"></label>' +
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
            syncCpEditorCustomerTypeFields();
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
        let username = String((document.getElementById('cp-e-username') || {}).value || '').trim();
        const password = String((document.getElementById('cp-e-password') || {}).value || '').trim();
        const phone = String((document.getElementById('cp-e-phone') || {}).value || '').trim();
        const email = String((document.getElementById('cp-e-email') || {}).value || '').trim();
        const customerType = getCpEditorSelectedType();
        const commercialRegistration = String((document.getElementById('cp-e-cr') || {}).value || '').trim();
        const taxId = String((document.getElementById('cp-e-tax') || {}).value || '').trim();
        const crmCustomerId = String((document.getElementById('cp-e-crm') || {}).value || '').trim();
        const repEl = document.getElementById('cp-e-rep');
        const repId = repEl ? String(repEl.value || '').trim() : '';
        const phoneNorm = normPhone(phone);
        if (!phoneNorm || phoneNorm.length < 9) {
            alert('رقم الجوال مطلوب لربط العروض والطلبات.');
            return;
        }
        if (customerType === CP_CUSTOMER_TYPE_CASH && !username) {
            username = 'c' + phoneNorm.slice(-8);
        }
        if (!displayName || !username) { alert('الاسم واسم المستخدم مطلوبان.'); return; }
        if (customerType === CP_CUSTOMER_TYPE_BUSINESS) {
            if (!commercialRegistration) { alert('رقم السجل التجاري مطلوب لحسابات المؤسسات.'); return; }
            if (!taxId) { alert('الرقم الضريبي (البطاقة الضريبية) مطلوب لحسابات المؤسسات.'); return; }
        }
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
            customerType: customerType,
            commercialRegistration: customerType === CP_CUSTOMER_TYPE_BUSINESS ? commercialRegistration : '',
            taxId: customerType === CP_CUSTOMER_TYPE_BUSINESS ? taxId : '',
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
            payload.assignedRepPhone = String(admin.phone || '').trim();
        } else if (repId) {
            let repUser = null;
            try {
                repUser = (global.adminUsers || []).find(function(r) { return r && String(r.id) === repId; });
            } catch (e) { /* ignore */ }
            if (repUser) {
                payload.assignedRepId = repUser.id;
                payload.assignedRepUsername = repUser.username;
                payload.assignedRepPhone = String(repUser.phone || '').trim();
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
        const cloudOk = await persistCustomerPortalUsersToCloud({
            showToast: true,
            verifyUsername: username
        });
        if (!cloudOk) {
            if (cpEditorState.isEdit) {
                /* keep editor open */
            } else {
                customerPortalUsers = customerPortalUsers.filter(function(u) { return u.id !== payload.id; });
                saveCpData();
            }
            if (typeof global.showNebrasAdminToast === 'function') {
                global.showNebrasAdminToast('⚠️ حساب العميل محفوظ محلياً فقط — لن يعمل من جهاز آخر', 'error');
            }
            renderCustomerPortalGovernancePanel();
            return;
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

    function openCpUserEditorNew() {
        if (!canCreateCustomerPortalUser()) {
            alert('إنشاء حساب عميل — الإدارة أو مدير المبيعات أو مندوب المبيعات المخوّل.');
            return;
        }
        (async function() {
            if (typeof hydrateCpUsersFromCloud === 'function') {
                try { await hydrateCpUsersFromCloud(); } catch (e) { /* ignore */ }
            }
            renderCustomerPortalGovernancePanel();
            bindCpGovernanceToolbar();
            showCpAdminSection('customer-portal-governance');
            if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('customer-portal-governance');
            openCpUserEditor(undefined, {});
        })();
    }

    function openCpUserEditorFromQuote(customerName, phone) {
        openCpUserEditorForRep();
        setTimeout(function() {
            openCpUserEditor(undefined, {
                customerType: CP_CUSTOMER_TYPE_CASH,
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
        const deletedUser = Object.assign({}, u);
        const deletedUsername = u.username;
        customerPortalUsers.splice(index, 1);
        saveCpData();
        cpAudit('حذف حساب عميل', deletedUsername);
        if (typeof addAuditLog === 'function') addAuditLog('حذف حساب عميل', deletedUsername);
        const cloudOk = await persistCustomerPortalUsersToCloud({
            showToast: true,
            verifyUsernameAbsent: deletedUsername
        });
        if (!cloudOk) {
            customerPortalUsers.splice(index, 0, deletedUser);
            saveCpData();
            if (typeof global.showNebrasAdminToast === 'function') {
                global.showNebrasAdminToast('⚠️ لم يُحذف حساب العميل من السحابة', 'error');
            }
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
        if (!global.__cpWorkspaceCloseHooked && typeof global.closeNebrasWorkspace === 'function') {
            global.__cpWorkspaceCloseHooked = true;
            const origClose = global.closeNebrasWorkspace;
            global.closeNebrasWorkspace = function() {
                const restore = document.body.classList.contains('customer-portal-store-active');
                origClose.apply(this, arguments);
                if (restore && currentPortalCustomer) {
                    setTimeout(function() { cpReturnToPortalDashboard(); }, 0);
                }
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomerPortal);
    } else {
        setTimeout(initCustomerPortal, 0);
    }

    global.syncCpEditorCustomerTypeFields = syncCpEditorCustomerTypeFields;
    global.resolveCpCustomerType = resolveCpCustomerType;
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
    global.openCpUserEditorNew = openCpUserEditorNew;
    global.openCpUserEditorFromQuote = openCpUserEditorFromQuote;
    global.canCreateCustomerPortalUser = canCreateCustomerPortalUser;
    global.canManageCustomerPortalUsers = canManageCustomerPortalUsers;
    global.getCustomerPortalUsers = function() { loadCpData(); return customerPortalUsers; };
    global.refreshCustomerPortalDashboard = renderCustomerPortalDashboard;
    global.cpOpenComplaints = cpOpenComplaints;
    global.cpBranchDial = cpBranchDial;
    global.cpBranchSmartRoute = cpBranchSmartRoute;
    global.cpOpenStoreFromPortal = cpOpenStoreFromPortal;
    global.cpReturnToPortalDashboard = cpReturnToPortalDashboard;
    global.cpGoToMainSite = cpGoToMainSite;
    global.cpViewQuote = cpViewQuote;
    global.cpCloseQuoteDetail = cpCloseQuoteDetail;
    global.cpPreviewCustomerQuoteA4 = cpPreviewCustomerQuoteA4;
    global.resumeCustomerPortalAfterBootstrap = resumeCustomerPortalAfterBootstrap;
    global.hasActiveCustomerPortalSession = function() {
        return !!currentPortalCustomer || !!readCpSessionRaw();
    };
    global.getNebrasCurrentPortalCustomer = function() { return currentPortalCustomer; };

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
    global.exportCustomerStatementPdf = exportCustomerStatementPdf;
    global.cpOpenComplaints = cpOpenComplaints;
    global.cpDialCustomerService = cpDialCustomerService;
    global.cpDialSalesManager = cpDialSalesManager;
    global.cpDialAssignedRep = cpDialAssignedRep;
    global.resolveCpRepContact = resolveCpRepContact;
    global.entryBelongsToPortalCustomer = entryBelongsToPortalCustomer;

})(typeof window !== 'undefined' ? window : globalThis);
