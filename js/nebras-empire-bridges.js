/**
 * نبراس — جسور الإمبراطورية (Odoo-like bridges بين الأقسام)
 * HR ↔ ERP · مبيعات ↔ مسار نبراس · عروض ↔ CRM · سلة ↔ بوابة العميل
 */
(function(global) {
    'use strict';

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function bridgeQuoteToCrm(entry) {
        if (!entry || typeof global.getCrmCustomers !== 'function') return false;
        const customers = global.getCrmCustomers() || [];
        const phone = String(entry.phone || '').replace(/\D/g, '');
        const exists = customers.find(function(c) {
            return c && String(c.phone || '').replace(/\D/g, '') === phone && phone.length >= 9;
        });
        if (exists) return false;
        if (typeof global.addCrmCustomer !== 'function') return false;
        global.addCrmCustomer({
            nameAr: entry.customerName || 'عميل متجر',
            phone: entry.phone || '',
            email: entry.email || '',
            city: entry.city || '',
            source: 'store-cart',
            quoteNo: entry.quoteNo || '',
            notes: 'جسر تلقائي من السلة — ' + (entry.quoteType || 'quote')
        });
        return true;
    }

    function bridgeQuoteToJourney(entry) {
        if (!entry || typeof global.createJourneyFromQuote !== 'function') return null;
        return global.createJourneyFromQuote(entry, {
            note: 'جسر تلقائي — طلب من المتجر الإلكتروني',
            estimatedReadyDate: ''
        });
    }

    function bridgeHrToProduction() {
        const emps = typeof global.getHrEmployees === 'function' ? global.getHrEmployees() : [];
        const prod = global.erpProduction || [];
        const prodDepts = emps.filter(function(e) {
            return e && (String(e.departmentKey || '').indexOf('production') >= 0 || String(e.department || '').indexOf('إنتاج') >= 0);
        });
        return { employees: prodDepts.length, productionLogs: prod.length, linked: Math.min(prodDepts.length, prod.length) };
    }

    function bridgePortalFromCart(profile) {
        if (!profile || !profile.phone) return null;
        if (typeof global.findCustomerPortalUserByPhone !== 'function') return null;
        return global.findCustomerPortalUserByPhone(profile.phone);
    }

    function runEmpireBridgeOnQuoteSubmit(entry) {
        if (!entry) return;
        try {
            if (entry.quoteType === 'order' && typeof global.createJourneyFromQuote === 'function') {
                global.createJourneyFromQuote(entry, { note: 'أوردر متجر — مسار تلقائي' });
            }
            bridgeQuoteToCrm(entry);
            const portal = bridgePortalFromCart({ phone: entry.phone, customerName: entry.customerName });
            if (portal && !entry.portalUserId) {
                entry.portalUserId = portal.id;
                const inbox = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
                const idx = inbox.findIndex(function(e) { return e && e.id === entry.id; });
                if (idx >= 0) {
                    inbox[idx].portalUserId = portal.id;
                    if (typeof global.saveSalesQuotesInbox === 'function') global.saveSalesQuotesInbox(inbox);
                }
            }
        } catch (e) {
            console.warn('Empire bridge:', e);
        }
    }

    function renderEmpireBridgesPanel() {
        const body = document.getElementById('empire-bridges-body');
        if (!body) return;
        const hrLink = bridgeHrToProduction();
        const journeys = typeof global.getNebrasOrderJourneys === 'function' ? (global.getNebrasOrderJourneys() || []).length : 0;
        const quotes = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox().length : 0;
        const bridges = [
            { icon: 'fa-shopping-cart', title: 'المتجر → المبيعات', desc: 'السلة · عرض 4 صفحات · واتساب · سحابة', status: 'live' },
            { icon: 'fa-route', title: 'المبيعات → مسار نبراس', desc: 'اعتماد العرض → إنتاج → مستودع → استلام', status: journeys > 0 ? 'live' : 'ready' },
            { icon: 'fa-people-roof', title: 'HR → ERP إنتاج', desc: hrLink.employees + ' موظف إنتاج · ' + hrLink.productionLogs + ' سجل', status: hrLink.linked > 0 ? 'live' : 'ready' },
            { icon: 'fa-handshake', title: 'السلة → CRM', desc: 'عميل جديد تلقائي من الطلب', status: 'live' },
            { icon: 'fa-user-circle', title: 'السلة → بوابة العميل', desc: 'ربط بالجوال إن وُجد حساب', status: 'live' },
            { icon: 'fa-calculator', title: 'المبيعات → المحاسبة', desc: 'حوالات بنكية · إيصالات · PDF', status: 'live' },
            { icon: 'fa-industry', title: 'الألومنيوم · WPC', desc: 'أقسام مستقلة · مخزون · عروض', status: 'live' },
            { icon: 'fa-cloud', title: 'السحابة → كل الأقسام', desc: quotes + ' عرض · 64 مخزن Supabase', status: 'live' }
        ];
        body.innerHTML =
            '<p class="scm-hint"><i class="fas fa-link"></i> جسور Odoo-like — كل قسم مرتبط بالتالي في سلسلة نبراس</p>' +
            '<div class="eb-bridge-grid">' + bridges.map(function(b) {
                return '<article class="eb-bridge-card eb-bridge-card--' + b.status + '">' +
                    '<header><i class="fas ' + b.icon + '"></i><strong>' + esc(b.title) + '</strong></header>' +
                    '<p>' + esc(b.desc) + '</p>' +
                    '<span class="erp-tag' + (b.status === 'live' ? ' erp-tag--ok' : '') + '">' + (b.status === 'live' ? 'يعمل' : 'جاهز') + '</span></article>';
            }).join('') + '</div>' +
            '<div class="workspace-actions-row">' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openNebrasDataWarehouse===\'function\'&&openNebrasDataWarehouse()"><i class="fas fa-database"></i> مستودع البيانات</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openOrderJourneyOps===\'function\'&&openOrderJourneyOps()"><i class="fas fa-route"></i> مسار نبراس</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openHrPlatform===\'function\'&&openHrPlatform()"><i class="fas fa-people-roof"></i> HR</button>' +
            '<button type="button" class="workspace-action-btn" onclick="typeof openCrmPlatform===\'function\'&&openCrmPlatform()"><i class="fas fa-handshake"></i> CRM</button>' +
            '</div>';
    }

    function openNebrasEmpireBridges() {
        const admin = global.getNebrasCurrentAdmin && global.getNebrasCurrentAdmin();
        if (!admin) { alert('سجّلي الدخول أولاً.'); return; }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('empire-bridges-hub');
        if (el) { el.classList.add('show'); el.setAttribute('aria-hidden', 'false'); }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('empire-bridges-hub');
        renderEmpireBridgesPanel();
    }

    function closeNebrasEmpireBridges() {
        const el = document.getElementById('empire-bridges-hub');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.runEmpireBridgeOnQuoteSubmit = runEmpireBridgeOnQuoteSubmit;
    global.openNebrasEmpireBridges = openNebrasEmpireBridges;
    global.closeNebrasEmpireBridges = closeNebrasEmpireBridges;
    global.renderEmpireBridgesPanel = renderEmpireBridgesPanel;
    global.bridgeQuoteToCrm = bridgeQuoteToCrm;
    global.bridgeQuoteToJourney = bridgeQuoteToJourney;

})(typeof window !== 'undefined' ? window : globalThis);
