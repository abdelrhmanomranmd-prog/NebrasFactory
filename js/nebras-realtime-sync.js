/**
 * نبراس — Realtime Shadow Mode (hrws151)
 * يستمع لتغييرات Supabase دون تعديل الواجهة حتى التفعيل الكامل.
 */
(function(global) {
    'use strict';

    const REALTIME_ENABLED = true;
    const REALTIME_SHADOW_LOG = false;
    let realtimeChannel = null;
    let lastRealtimeAt = 0;

    function getSupabaseClient() {
        if (typeof global.getNebrasSupabaseClient === 'function') return global.getNebrasSupabaseClient();
        if (global.supabaseClient) return global.supabaseClient;
        return null;
    }

    function onStoreChange(payload) {
        lastRealtimeAt = Date.now();
        const row = payload && payload.new ? payload.new : null;
        if (!row || !row.store_key) return;
        if (REALTIME_SHADOW_LOG && typeof console !== 'undefined') {
            console.info('[Nebras Realtime shadow]', row.store_key, row.updated_at || '');
        }
        if (!REALTIME_ENABLED) return;
        if (typeof global.applyNebrasRealtimeStorePatch === 'function') {
            global.applyNebrasRealtimeStorePatch(row.store_key, row.payload, row.updated_at);
        }
        if (typeof global.renderNebrasCloudStatusOrb === 'function') {
            global.renderNebrasCloudStatusOrb('ok', '✓ متزامن حي — ' + row.store_key);
        }
    }

    function startNebrasRealtimeSync() {
        if (!REALTIME_ENABLED && !REALTIME_SHADOW_LOG) return;
        const admin = typeof global.getNebrasCurrentAdmin === 'function' ? global.getNebrasCurrentAdmin() : null;
        if (!admin) return;
        const client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;
        stopNebrasRealtimeSync();
        realtimeChannel = client
            .channel('nebras-data-store-live')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'nebras_data_store'
            }, onStoreChange)
            .subscribe(function(status) {
                if (REALTIME_SHADOW_LOG) console.info('[Nebras Realtime]', status);
            });
    }

    function stopNebrasRealtimeSync() {
        if (realtimeChannel && typeof realtimeChannel.unsubscribe === 'function') {
            realtimeChannel.unsubscribe();
        }
        realtimeChannel = null;
    }

    function getNebrasRealtimeLastAt() {
        return lastRealtimeAt || 0;
    }

    global.NEBRAS_REALTIME_ENABLED = REALTIME_ENABLED;
    global.startNebrasRealtimeSync = startNebrasRealtimeSync;
    global.stopNebrasRealtimeSync = stopNebrasRealtimeSync;
    global.getNebrasRealtimeLastAt = getNebrasRealtimeLastAt;

})(typeof window !== 'undefined' ? window : globalThis);
