/**
 * نبراس — تحميل كسول لوحدات الإدارات (hrws224)
 * لا يُحمّل HR/ALU/WPC إلا عند الحاجة أو بعد دخول الإدارة (بدون إثقال الزائر).
 */
(function (global) {
    'use strict';

    var VER = 'hrws224';
    var loaded = Object.create(null);
    var inflight = Object.create(null);
    var bundleDone = Object.create(null);
    var bundleWait = Object.create(null);
    var prefetchStarted = false;

    var BUNDLES = {
        aluminum: ['js/nebras-aluminum-cutting.js'],
        wpc: ['js/nebras-wpc-cutting.js'],
        hr: [
            'js/nebras-hr-hcm-suite.js',
            'js/nebras-hr-advances.js',
            'js/nebras-hr-violations.js',
            'js/nebras-hr-gps-tracker.js',
            'js/nebras-hr-companies.js',
            'js/nebras-hr-platform.js',
            'js/nebras-hr-boot.js'
        ],
        legal: [
            'js/nebras-legal-platform.js',
            'js/nebras-legal-dispatch.js'
        ],
        crm: ['js/nebras-crm-platform.js'],
        accounting: ['js/nebras-accounting-platform.js'],
        empire: [
            'js/nebras-erp-command-center.js',
            'js/nebras-empire-bridges.js',
            'js/nebras-empire-hub.js'
        ],
        adminTools: [
            'js/nebras-admin-ai.js',
            'js/nebras-site-database.js',
            'js/nebras-data-warehouse.js',
            'js/nebras-media-admin.js'
        ]
    };

    /** ترتيب التحميل الكسول — الأخف أولاً؛ aluminum ثقيل (~2MB) دائماً آخر */
    var PREFETCH_LIGHT = ['wpc', 'crm', 'legal', 'accounting', 'adminTools', 'empire', 'hr'];
    var PREFETCH_HEAVY = ['aluminum'];

    var STUBS = [
        { name: 'openAluminumCutting', bundle: 'aluminum' },
        { name: 'openWpcCutting', bundle: 'wpc' },
        { name: 'openLegalPlatform', bundle: 'legal' },
        { name: 'openCrmPlatform', bundle: 'crm' },
        { name: 'openAccountingPlatform', bundle: 'accounting' },
        { name: 'openNebrasEmpireHub', bundle: 'empire' },
        { name: 'openNebrasAdminAi', bundle: 'adminTools' },
        { name: 'openNebrasDataWarehouse', bundle: 'adminTools' },
        { name: 'openNebrasEmpireBridges', bundle: 'empire' },
        { name: 'openPlatformIntegrationHub', bundle: 'empire' }
    ];

    function withVer(path) {
        if (!path) return path;
        return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + VER;
    }

    function loadScriptOnce(path) {
        if (loaded[path]) return Promise.resolve();
        if (inflight[path]) return inflight[path];
        inflight[path] = new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-nebras-lazy="' + path + '"]');
            if (existing) {
                if (loaded[path]) {
                    resolve();
                    return;
                }
                existing.addEventListener('load', function () {
                    loaded[path] = true;
                    delete inflight[path];
                    resolve();
                });
                existing.addEventListener('error', function () {
                    delete inflight[path];
                    reject(new Error('lazy-script-fail:' + path));
                });
                return;
            }
            var s = document.createElement('script');
            s.src = withVer(path);
            s.async = true;
            s.setAttribute('data-nebras-lazy', path);
            s.onload = function () {
                loaded[path] = true;
                delete inflight[path];
                resolve();
            };
            s.onerror = function () {
                delete inflight[path];
                reject(new Error('lazy-script-fail:' + path));
            };
            (document.head || document.documentElement).appendChild(s);
        });
        return inflight[path];
    }

    function loadBundle(name) {
        if (bundleDone[name]) return Promise.resolve(true);
        if (bundleWait[name]) return bundleWait[name];
        var list = BUNDLES[name] || [];
        bundleWait[name] = list.reduce(function (chain, path) {
            return chain.then(function () { return loadScriptOnce(path); });
        }, Promise.resolve()).then(function () {
            bundleDone[name] = true;
            delete bundleWait[name];
            return true;
        }).catch(function (err) {
            delete bundleWait[name];
            throw err;
        });
        return bundleWait[name];
    }

    function ensureNebrasDeptBundle(name) {
        return loadBundle(name);
    }

    function installStub(entry) {
        var fnName = entry.name;
        var bundle = entry.bundle;
        var current = global[fnName];
        if (typeof current === 'function' && !current.__nebrasLazyStub) return;

        function stub() {
            var args = arguments;
            var self = stub;
            return ensureNebrasDeptBundle(bundle).then(function () {
                var real = global[fnName];
                if (typeof real === 'function' && real !== self) {
                    return real.apply(global, args);
                }
                if (typeof global.showNebrasAdminToast === 'function') {
                    global.showNebrasAdminToast('تعذّر تحميل الوحدة — أعيدي المحاولة', 'warn');
                }
                return null;
            }).catch(function (err) {
                console.error('[Nebras lazy]', fnName, err);
                if (typeof global.showNebrasAdminToast === 'function') {
                    global.showNebrasAdminToast('تعذّر تحميل الوحدة — تحققي من الاتصال', 'err');
                } else {
                    alert('تعذّر تحميل الوحدة — تحققي من الاتصال وأعيدي المحاولة.');
                }
                return null;
            });
        }
        stub.__nebrasLazyStub = true;
        global[fnName] = stub;
    }

    function installAllStubs() {
        STUBS.forEach(installStub);
    }

    function adminPrefetchQueue() {
        var admin = typeof global.currentAdmin !== 'undefined' ? global.currentAdmin : null;
        var role = admin && admin.role ? admin.role : '';
        if (role === 'aluminum_manager') {
            return ['aluminum'];
        }
        if (role === 'wpc_manager' || role === 'production_manager') {
            return ['wpc'];
        }
        if (role === 'superadmin' || role === 'manager') {
            return PREFETCH_LIGHT.concat(PREFETCH_HEAVY);
        }
        return ['wpc', 'crm', 'legal'];
    }

    function prefetchBundlesSequential(names) {
        if (!names || !names.length) return;
        var i = 0;
        function next() {
            if (i >= names.length) return;
            var name = names[i++];
            loadBundle(name).catch(function () { /* soft */ }).then(function () {
                var gap = name === 'aluminum' || name === 'hr' ? 2500 : 1200;
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(next, { timeout: gap + 2000 });
                } else {
                    setTimeout(next, gap);
                }
            });
        }
        next();
    }

    function prefetchNebrasAdminDepts() {
        if (prefetchStarted) return;
        if (document.visibilityState === 'hidden') return;
        prefetchStarted = true;
        prefetchBundlesSequential(adminPrefetchQueue());
    }

    function schedulePrefetch() {
        /* hrws224: لا prefetch للزائر — فقط بعد جلسة إدارة + تأخير idle */
        window.addEventListener('nebras-admin-session', function () {
            setTimeout(function () {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(prefetchNebrasAdminDepts, { timeout: 15000 });
                } else {
                    setTimeout(prefetchNebrasAdminDepts, 4000);
                }
            }, 3000);
        });
    }

    installAllStubs();
    schedulePrefetch();

    global.ensureNebrasDeptBundle = ensureNebrasDeptBundle;
    global.prefetchNebrasAdminDepts = prefetchNebrasAdminDepts;
    global.__NEBRAS_DEPT_LAZY__ = VER;
})(typeof window !== 'undefined' ? window : globalThis);
