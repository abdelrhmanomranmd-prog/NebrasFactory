/**
 * استقبال موقع GPS من جوال السائق — يُحفظ في Supabase nebras_data_store
 */
const SUPABASE_FALLBACK_URL = 'https://oedldllrjavofpeaputz.supabase.co';
const SUPABASE_FALLBACK_ANON = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0';

function supabaseConfig() {
    const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_FALLBACK_URL).replace(/\/$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_FALLBACK_ANON;
    return { url, key: String(key).trim() };
}

function headers(key) {
    return {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };
}

async function loadStore(url, key, storeKey) {
    const res = await fetch(url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(storeKey) + '&select=payload&limit=1', {
        headers: headers(key)
    });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows.length) return null;
    return rows[0].payload;
}

async function saveStore(url, key, storeKey, payload) {
    await fetch(url + '/rest/v1/nebras_data_store?store_key=eq.' + encodeURIComponent(storeKey), {
        method: 'DELETE',
        headers: headers(key)
    });
    const res = await fetch(url + '/rest/v1/nebras_data_store', {
        method: 'POST',
        headers: headers(key),
        body: JSON.stringify({ store_key: storeKey, payload: payload, updated_at: new Date().toISOString() })
    });
    return res.ok;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'POST only' });
        return;
    }
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const token = String(body.token || '').trim();
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        if (!token || isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ ok: false, error: 'token, lat, lng required' });
            return;
        }
        const { url, key } = supabaseConfig();
        if (!url || !key) {
            res.status(503).json({ ok: false, error: 'Supabase not configured' });
            return;
        }
        const tracking = await loadStore(url, key, 'hr_vehicle_tracking');
        const list = Array.isArray(tracking) ? tracking : [];
        const trip = list.find(function(t) { return t.gpsShareToken === token && t.status === 'on_road'; });
        if (!trip) {
            res.status(404).json({ ok: false, error: 'Invalid or expired driver token' });
            return;
        }
        if (body.consented) {
            const settings = await loadStore(url, key, 'hr_gps_settings');
            const legalText = (settings && settings.legalConsentAr) || 'موافقة تتبع الموقع أثناء المهمة';
            const consents = await loadStore(url, key, 'hr_gps_consents');
            const consentList = Array.isArray(consents) ? consents : [];
            const already = consentList.some(function(c) {
                return c.token === token && c.plateNo === (trip.plateNo || '');
            });
            if (!already) {
                consentList.unshift({
                    id: 'gc-' + Date.now(),
                    token: token,
                    plateNo: trip.plateNo || '',
                    driverName: trip.driverName || '',
                    driverPhone: body.driverPhone || trip.driverPhone || '',
                    consentedAt: new Date().toISOString(),
                    userAgent: String(body.userAgent || '').slice(0, 500),
                    legalText: legalText
                });
                if (consentList.length > 500) consentList.length = 500;
                await saveStore(url, key, 'hr_gps_consents', consentList);
            }
        }
        const positions = await loadStore(url, key, 'hr_gps_positions');
        const posList = Array.isArray(positions) ? positions : [];
        const entry = {
            id: 'gp-' + Date.now(),
            vehicleId: trip.vehicleId || null,
            trackingId: trip.id,
            plateNo: trip.plateNo || '',
            driverPhone: body.driverPhone || trip.driverPhone || '',
            driverName: trip.driverName || '',
            lat: lat,
            lng: lng,
            accuracy: body.accuracy != null ? Number(body.accuracy) : null,
            speed: body.speed != null ? Number(body.speed) : null,
            heading: body.heading != null ? Number(body.heading) : null,
            source: 'mobile',
            recordedAt: new Date().toISOString(),
            recordedBy: 'driver-mobile'
        };
        posList.unshift(entry);
        if (posList.length > 800) posList.length = 800;
        await saveStore(url, key, 'hr_gps_positions', posList);
        res.status(200).json({
            ok: true,
            plateNo: trip.plateNo,
            driverName: trip.driverName || '',
            driverPhone: body.driverPhone || trip.driverPhone || '',
            recordedAt: entry.recordedAt
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err.message || err) });
    }
};
