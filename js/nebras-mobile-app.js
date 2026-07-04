/**
 * نبراس — تطبيق الجوال المتكامل
 * تركيز: عملاء · مناديب · مدير مبيعات · متجر · معرض · عروض أسعار
 * يعمل كـ PWA و Capacitor — نفس السحابة والـ API (تحديث تلقائي مع المنصة)
 */
(function(global) {
    'use strict';

    const APP_MODE_KEY = 'nebrasAppMode';
    let appActive = false;
    let activeTabId = 'home';

    function isCapacitorNative() {
        try {
            return !!(global.Capacitor && global.Capacitor.isNativePlatform && global.Capacitor.isNativePlatform());
        } catch (e) { return false; }
    }

    function detectAppMode() {
        try {
            if (/[?&]app=1(?:&|$)/.test(global.location.search)) {
                localStorage.setItem(APP_MODE_KEY, '1');
                return true;
            }
            if (localStorage.getItem(APP_MODE_KEY) === '1') return true;
            if (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) return true;
            if (isCapacitorNative()) return true;
        } catch (e) { /* ignore */ }
        return false;
    }

    function getAdmin() {
        try {
            return typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        } catch (e) { return null; }
    }

    function getPortalCustomer() {
        try {
            return typeof global.getNebrasCurrentPortalCustomer === 'function' ? global.getNebrasCurrentPortalCustomer() : null;
        } catch (e) { return null; }
    }

    function resolveAppPersona() {
        const portal = getPortalCustomer();
        if (portal) return 'customer';
        const admin = getAdmin();
        if (!admin) return 'public';
        if (admin.role === 'sales_rep' && typeof global.isStrictSalesRep === 'function' && global.isStrictSalesRep(admin)) {
            return 'rep';
        }
        if (admin.role === 'sales_manager' || admin.role === 'branch_manager') return 'manager';
        if (admin.role === 'sales_rep') return 'rep';
        return 'staff';
    }

    function getAppTabsForPersona(persona) {
        if (persona === 'customer') {
            return [
                { id: 'home', icon: 'fa-house', label: 'الرئيسية' },
                { id: 'store', icon: 'fa-store', label: 'المتجر' },
                { id: 'showroom', icon: 'fa-images', label: 'المعرض' },
                { id: 'account', icon: 'fa-gauge-high', label: 'لوحتي' },
                { id: 'quote', icon: 'fa-file-invoice-dollar', label: 'عروضي', primary: true }
            ];
        }
        if (persona === 'rep') {
            return [
                { id: 'home', icon: 'fa-house', label: 'الرئيسية' },
                { id: 'store', icon: 'fa-store', label: 'المتجر' },
                { id: 'quotes', icon: 'fa-file-signature', label: 'عروضي' },
                { id: 'customers', icon: 'fa-user-plus', label: 'عملاء' },
                { id: 'panel', icon: 'fa-briefcase', label: 'لوحتي', primary: true }
            ];
        }
        if (persona === 'manager') {
            return [
                { id: 'home', icon: 'fa-house', label: 'الرئيسية' },
                { id: 'store', icon: 'fa-store', label: 'المتجر' },
                { id: 'quotes', icon: 'fa-inbox', label: 'العروض' },
                { id: 'team', icon: 'fa-users', label: 'الفريق' },
                { id: 'panel', icon: 'fa-chart-line', label: 'لوحتي', primary: true }
            ];
        }
        return [
            { id: 'home', icon: 'fa-house', label: 'الرئيسية' },
            { id: 'store', icon: 'fa-store', label: 'المتجر' },
            { id: 'showroom', icon: 'fa-images', label: 'المعرض' },
            { id: 'account', icon: 'fa-user-circle', label: 'حسابي' },
            { id: 'quote', icon: 'fa-file-invoice-dollar', label: 'عرض سعر', primary: true }
        ];
    }

    function setActiveTab(tabId) {
        activeTabId = tabId || 'home';
        const bar = document.getElementById('nebras-app-tabbar');
        if (!bar) return;
        bar.querySelectorAll('.nebras-app-tab').forEach(function(btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-tab') === activeTabId);
        });
    }

    function renderAppTabBar() {
        if (!appActive) return;
        const bar = document.getElementById('nebras-app-tabbar');
        if (!bar) return;
        const persona = resolveAppPersona();
        const tabs = getAppTabsForPersona(persona);
        bar.innerHTML = tabs.map(function(tab) {
            const cls = 'nebras-app-tab' + (tab.primary ? ' nebras-app-tab--primary' : '') + (tab.id === activeTabId ? ' is-active' : '');
            return '<button type="button" class="' + cls + '" data-tab="' + tab.id + '" onclick="nebrasAppTabClick(\'' + tab.id + '\')">' +
                '<i class="fas ' + tab.icon + '" aria-hidden="true"></i>' +
                '<span>' + tab.label + '</span></button>';
        }).join('');
        bar.hidden = false;
        bar.setAttribute('aria-hidden', 'false');
    }

    function appCloseOverlays() {
        if (typeof global.closeCartDrawer === 'function') global.closeCartDrawer();
        if (typeof global.closeNebrasWorkspace === 'function' && document.body.classList.contains('nebras-workspace-active')) {
            global.closeNebrasWorkspace();
        }
        if (typeof global.closeMobileNav === 'function') global.closeMobileNav();
    }

    function appGoHome() {
        appCloseOverlays();
        const persona = resolveAppPersona();
        if (persona === 'customer' && typeof global.cpReturnToPortalDashboard === 'function') {
            global.cpReturnToPortalDashboard();
            setActiveTab('account');
            return;
        }
        if ((persona === 'rep' || persona === 'manager') && getAdmin()) {
            if (typeof global.scrollToAdminDashboard === 'function') global.scrollToAdminDashboard();
            setActiveTab('panel');
            return;
        }
        document.body.classList.remove('customer-portal-open', 'customer-portal-store-active');
        const hero = document.getElementById('hero');
        if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else global.scrollTo(0, 0);
        setActiveTab('home');
    }

    function appOpenStore() {
        appCloseOverlays();
        const portal = getPortalCustomer();
        if (portal && typeof global.cpOpenStoreFromPortal === 'function') {
            global.cpOpenStoreFromPortal();
        } else if (typeof global.openNebrasWorkspace === 'function') {
            global.openNebrasWorkspace({ pillar: 'store', view: 'catalog-all' });
        }
        setActiveTab('store');
    }

    function appOpenShowroom() {
        appCloseOverlays();
        if (typeof global.openNebrasWorkspace === 'function') {
            global.openNebrasWorkspace({ pillar: 'showroom', view: 'showroom-hub' });
        }
        setActiveTab('showroom');
    }

    function appOpenAccount() {
        appCloseOverlays();
        if (typeof global.openCustomerPortalLogin === 'function') global.openCustomerPortalLogin();
        setActiveTab('account');
    }

    function appOpenQuote() {
        appCloseOverlays();
        const portal = getPortalCustomer();
        if (portal) {
            if (typeof global.openCustomerPortalLogin === 'function') global.openCustomerPortalLogin();
            setActiveTab('account');
            return;
        }
        if (typeof global.confirmAndOpenQuote === 'function') global.confirmAndOpenQuote();
        setActiveTab('quote');
    }

    function appOpenRepQuotes() {
        appCloseOverlays();
        const admin = getAdmin();
        if (!admin) {
            if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
            return;
        }
        if (typeof global.isStrictSalesRep === 'function' && global.isStrictSalesRep(admin) && typeof global.openRepMyQuotes === 'function') {
            global.openRepMyQuotes();
        } else if (typeof global.openRepQuoteBuilder === 'function') {
            global.openRepQuoteBuilder();
        }
        setActiveTab('quotes');
    }

    function appOpenNewCustomer() {
        appCloseOverlays();
        const admin = getAdmin();
        if (!admin) {
            if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
            return;
        }
        if (typeof global.openCpUserEditorNew === 'function') global.openCpUserEditorNew();
        setActiveTab('customers');
    }

    function appOpenStaffPanel() {
        appCloseOverlays();
        const admin = getAdmin();
        if (!admin) {
            if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
            setActiveTab('panel');
            return;
        }
        if (typeof global.showAdminDashboard === 'function') {
            /* showAdminDashboard is internal — use openAdminPanel path */
        }
        if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
        setActiveTab('panel');
    }

    function appOpenSalesInbox() {
        appCloseOverlays();
        const admin = getAdmin();
        if (!admin) {
            if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
            return;
        }
        if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
        setTimeout(function() {
            const inbox = document.getElementById('sales-quotes-inbox') || document.getElementById('rep-quote-builder');
            if (inbox) {
                inbox.classList.add('show');
                inbox.setAttribute('aria-hidden', 'false');
                inbox.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (typeof global.displaySalesQuotesInbox === 'function') global.displaySalesQuotesInbox();
        }, 120);
        setActiveTab('quotes');
    }

    function appOpenBranchTeam() {
        appCloseOverlays();
        const admin = getAdmin();
        if (!admin) {
            if (typeof global.openAdminPanel === 'function') global.openAdminPanel();
            return;
        }
        if (typeof global.openBranchTeamManagement === 'function') global.openBranchTeamManagement();
        setActiveTab('team');
    }

    function nebrasAppTabClick(tabId) {
        switch (tabId) {
            case 'home': appGoHome(); break;
            case 'store': appOpenStore(); break;
            case 'showroom': appOpenShowroom(); break;
            case 'account': appOpenAccount(); break;
            case 'quote': appOpenQuote(); break;
            case 'quotes': appOpenRepQuotes(); break;
            case 'customers': appOpenNewCustomer(); break;
            case 'panel': appOpenStaffPanel(); break;
            case 'team': appOpenBranchTeam(); break;
            default: appGoHome();
        }
    }

    function applyAppChrome() {
        if (!appActive) return;
        document.body.classList.add('nebras-native-app');
        document.documentElement.classList.add('nebras-app-root');
        if (typeof global.dismissBrandIntro === 'function') {
            try { global.dismissBrandIntro(); } catch (e) { /* ignore */ }
        }
        if (typeof global.syncMobileCommerceBar === 'function') global.syncMobileCommerceBar();
        renderAppTabBar();
    }

    function initNebrasMobileApp() {
        appActive = detectAppMode();
        if (!appActive) return;
        applyAppChrome();
        document.addEventListener('nebras-session-restored', function() {
            renderAppTabBar();
        });
        const bootWatch = setInterval(function() {
            if (document.body.classList.contains('nebras-ready')) {
                clearInterval(bootWatch);
                applyAppChrome();
            }
        }, 200);
        setTimeout(function() { clearInterval(bootWatch); }, 12000);
        global.addEventListener('resize', renderAppTabBar, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNebrasMobileApp);
    } else {
        initNebrasMobileApp();
    }

    global.initNebrasMobileApp = initNebrasMobileApp;
    global.refreshNebrasAppTabBar = renderAppTabBar;
    global.isNebrasNativeApp = function() { return appActive; };
    global.nebrasAppTabClick = nebrasAppTabClick;
    global.nebrasAppGoHome = appGoHome;
    global.nebrasAppOpenStore = appOpenStore;
    global.nebrasAppOpenShowroom = appOpenShowroom;

})(typeof window !== 'undefined' ? window : globalThis);
