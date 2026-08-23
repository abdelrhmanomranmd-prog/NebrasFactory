/**
 * نبراس — Realtime Live Sync (hrws223)
 * الزوار + الإدارة: تحديث فوري عند تغيير مفاتيح المحتوى العام في Supabase.
 */
(function(global) {
    'use strict';

    const REALTIME_ENABLED = true;
    const REALTIME_SHADOW_LOG = false;
    let realtimeChannel = null;
    let lastRealtimeAt = 0;
    let realtimeStarted = false;

    const PUBLIC_LIVE_KEYS = [
        'site_products', 'visitor_icons', 'dashboard_tiles', 'site_custom_sections',
        'about_pages', 'system_settings', 'branches', 'site_partners', 'site_certifications',
        'showroom_gallery', 'visitor_analytics', 'sales_price_list'
    ];

    function getSupabaseClient() {
        if (typeof global.getNebrasSupabaseClient === 'function') return global.getNebrasSupabaseClient();
        if (global.supabaseClient) return global.supabaseClient;
        return null;
    }

    function isPublicLiveKey(storeKey) {
        if (PUBLIC_LIVE_KEYS.indexOf(storeKey) >= 0) return true;
        if (global.NEBRAS_PUBLIC_STORE_KEYS && global.NEBRAS_PUBLIC_STORE_KEYS.indexOf(storeKey) >= 0) return true;
        return false;
    }

    function refreshUiForKey(storeKey) {
        if (isPublicLiveKey(storeKey) && typeof global.refreshPublicSiteFromGovernance === 'function') {
            global.refreshPublicSiteFromGovernance();
            return;
        }
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return;
        if (storeKey === 'dashboard_tiles' && typeof global.refreshAdminDashboardAfterGovernanceSync === 'function') {
            global.refreshAdminDashboardAfterGovernanceSync();
            return;
        }
        if (typeof global.renderDashboardCommandShell === 'function') {
            global.renderDashboardCommandShell(admin);
        }
    }

    function onStoreChange(payload) {
        lastRealtimeAt = Date.now();
        const row = payload && payload.new ? payload.new : null;
        if (!row || !row.store_key) return;
        if (REALTIME_SHADOW_LOG && typeof console !== 'undefined') {
            console.info('[Nebras Realtime]', row.store_key, row.updated_at || '');
        }
        if (!REALTIME_ENABLED) return;
        if (typeof global.isNebrasCloudHydrating === 'function' && global.isNebrasCloudHydrating()) return;
        if (typeof global.applyNebrasRealtimeStorePatch === 'function') {
            global.applyNebrasRealtimeStorePatch(row.store_key, row.payload, row.updated_at);
        } else if (typeof global.applyNebrasCloudRow === 'function') {
            global.applyNebrasCloudRow(row.store_key, row.payload, row.updated_at);
            try {
                if (typeof global.persistLocalGovernanceKeys === 'function') global.persistLocalGovernanceKeys();
            } catch (e) { /* ignore */ }
        }
        refreshUiForKey(row.store_key);
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
            if (admin) global.renderNebrasCloudStatusOrb('ok', '✓ متزامن حي');
        }
    }

    function startNebrasRealtimeSync() {
        if (!REALTIME_ENABLED && !REALTIME_SHADOW_LOG) return;
        if (realtimeStarted && realtimeChannel) return;
        const client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;
        stopNebrasRealtimeSync();
        realtimeChannel = client
            .channel('nebras-data-store-live-v2')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'nebras_data_store'
            }, onStoreChange)
            .subscribe(function(status) {
                if (status === 'SUBSCRIBED') realtimeStarted = true;
                if (REALTIME_SHADOW_LOG) console.info('[Nebras Realtime]', status);
            });
    }

    function stopNebrasRealtimeSync() {
        if (realtimeChannel && typeof realtimeChannel.unsubscribe === 'function') {
            realtimeChannel.unsubscribe();
        }
        realtimeChannel = null;
        realtimeStarted = false;
    }

    function getNebrasRealtimeLastAt() {
        return lastRealtimeAt || 0;
    }

    function isNebrasRealtimeActive() {
        return !!realtimeStarted;
    }

    global.NEBRAS_REALTIME_ENABLED = REALTIME_ENABLED;
    global.NEBRAS_REALTIME_PUBLIC_KEYS = PUBLIC_LIVE_KEYS;
    global.startNebrasRealtimeSync = startNebrasRealtimeSync;
    global.stopNebrasRealtimeSync = stopNebrasRealtimeSync;
    global.getNebrasRealtimeLastAt = getNebrasRealtimeLastAt;
    global.isNebrasRealtimeActive = isNebrasRealtimeActive;

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(startNebrasRealtimeSync, 1200);
        });
        if (document.readyState !== 'loading') {
            setTimeout(startNebrasRealtimeSync, 1200);
        }
    }

})(typeof window !== 'undefined' ? window : globalThis);
