/**
 * نبراس — حماية التخزين السحابي (Enterprise)
 * إعادة محاولة · تنبيه قبل الإغلاق · نبض دوري · استعادة عند عودة الشبكة
 */
(function(global) {
    'use strict';

    const HEARTBEAT_MS = 45000;
    const RETRY_DELAYS = [600, 1500, 4000];
    let heartbeatTimer = null;
    let safetyInited = false;
    let lastFlushAttemptAt = 0;

    function sleep(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    function hasPendingCloudWork() {
        if (typeof global.hasPendingLocalCloudMutations === 'function' && global.hasPendingLocalCloudMutations()) {
            return true;
        }
        if (typeof global.hasSensitiveCloudPending === 'function' && global.hasSensitiveCloudPending()) {
            return true;
        }
        return false;
    }

    function updateCloudSafetyBanner() {
        const banner = document.getElementById('nebras-cloud-safety-banner');
        if (!banner) return;
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            return;
        }
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) {
            banner.hidden = true;
            return;
        }
        const pending = hasPendingCloudWork();
        const online = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
        if (!pending && online) {
            banner.hidden = true;
            banner.className = 'nebras-cloud-safety-banner admin-only-ui';
            return;
        }
        banner.hidden = false;
        if (!online) {
            banner.className = 'nebras-cloud-safety-banner nebras-cloud-safety-banner--offline admin-only-ui';
            banner.innerHTML = '<i class="fas fa-wifi-slash"></i> <strong>لا اتصال</strong> — البيانات محفوظة محلياً. عند عودة الشبكة سيتم الرفع تلقائياً. لا تغلقي الصفحة قبل ظهور «متزامن».';
        } else if (pending) {
            banner.className = 'nebras-cloud-safety-banner nebras-cloud-safety-banner--pending admin-only-ui';
            banner.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> <strong>رفع معلّق</strong> — جاري الحفظ في السحابة… أو اضغطي «رفع الآن». ' +
                '<button type="button" class="nebras-cloud-safety-btn" onclick="nebrasCloudSafetyFlushNow()">رفع الآن</button>';
        }
    }

    async function nebrasCloudSafetyFlushNow() {
        if (Date.now() - lastFlushAttemptAt < 3000) return;
        lastFlushAttemptAt = Date.now();
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return;
        if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
            global.renderNebrasLiveCloudRibbon('saving');
        }
        let ok = false;
        if (typeof global.flushPushToNebrasCloud === 'function') {
            ok = await global.flushPushToNebrasCloud({ showCloudToast: true, silentCloud: false });
        }
        if (!ok && typeof global.persistNebrasCriticalStores === 'function') {
            ok = await global.persistNebrasCriticalStores([
                'admin_users', 'hr_employees', 'hr_vehicles', 'site_products',
                'erp_inventory', 'sales_quotes_inbox', 'crm_customers', 'system_settings'
            ], { showToast: true, promptReauth: true });
        }
        if (typeof global.renderNebrasLiveCloudRibbon === 'function') {
            global.renderNebrasLiveCloudRibbon(ok ? 'ok' : 'error', ok ? '✓ محفوظ في السحابة' : '✗ فشل — أعيدي المحاولة');
        }
        updateCloudSafetyBanner();
        return ok;
    }

    async function nebrasCloudSafetyHeartbeat() {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin || !hasPendingCloudWork()) {
            updateCloudSafetyBanner();
            return;
        }
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) {
            return;
        }
        if (typeof navigator.onLine === 'boolean' && !navigator.onLine) {
            updateCloudSafetyBanner();
            return;
        }
        if (typeof global.flushPushToNebrasCloud === 'function') {
            await global.flushPushToNebrasCloud({ silentCloud: true }).catch(function() { return false; });
        }
        updateCloudSafetyBanner();
    }

    async function nebrasCloudPushWithRetry(fn, label) {
        label = label || 'cloud';
        for (let i = 0; i < RETRY_DELAYS.length + 1; i++) {
            try {
                const ok = await fn();
                if (ok) return true;
            } catch (err) {
                console.warn('[Nebras Cloud Safety]', label, 'attempt', i + 1, err);
            }
            if (i < RETRY_DELAYS.length) await sleep(RETRY_DELAYS[i]);
        }
        return false;
    }

    function onBeforeUnload(e) {
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin || !hasPendingCloudWork()) return;
        e.preventDefault();
        e.returnValue = 'لديك بيانات لم تُرفع للسحابة بعد — انتظري حتى يظهر «محفوظ سحابياً» قبل إغلاق الصفحة.';
        return e.returnValue;
    }

    function initNebrasCloudSafety() {
        if (safetyInited) return;
        safetyInited = true;
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('online', function() {
            updateCloudSafetyBanner();
            nebrasCloudSafetyHeartbeat();
        });
        window.addEventListener('offline', updateCloudSafetyBanner);
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') nebrasCloudSafetyHeartbeat();
        });
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(nebrasCloudSafetyHeartbeat, HEARTBEAT_MS);
        updateCloudSafetyBanner();
    }

    function stopNebrasCloudSafety() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        safetyInited = false;
    }

    global.initNebrasCloudSafety = initNebrasCloudSafety;
    global.stopNebrasCloudSafety = stopNebrasCloudSafety;
    global.nebrasCloudSafetyFlushNow = nebrasCloudSafetyFlushNow;
    global.nebrasCloudPushWithRetry = nebrasCloudPushWithRetry;
    global.updateCloudSafetyBanner = updateCloudSafetyBanner;
    global.hasPendingCloudWork = hasPendingCloudWork;

})(typeof window !== 'undefined' ? window : globalThis);
