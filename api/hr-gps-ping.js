/**
 * استقبال موقع GPS من جوال السائق — يُحفظ في Supabase عبر SERVICE_ROLE فقط
 */
const sec = require('./lib/nebras-security');

async function loadStore(url, key, storeKey) {
    const row = await sec.fetchStoreRow(url, key, storeKey);
    return row ? row.payload : null;
}

async function saveStore(url, key, storeKey, payload) {
    const result = await sec.upsertStoreRows(url, key, [{ store_key: storeKey, payload: payload }]);
    return !!(result && result.ok);
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
        const body = sec.parseBody(req);
        const token = String(body.token || '').trim();
        const lat = Number(body.lat);
        const lng = Number(body.lng);
        if (!token || isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ ok: false, error: 'token, lat, lng required' });
            return;
        }
        const { url, key, invalidKey } = sec.supabaseServiceConfig();
        if (!url || !key) {
            res.status(503).json({
                ok: false,
                error: invalidKey === 'non_ascii_service_key' ? 'invalid_service_key_encoding' : 'service_unavailable'
            });
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
        const saved = await saveStore(url, key, 'hr_gps_positions', posList);
        if (!saved) {
            res.status(500).json({ ok: false, error: 'save_failed' });
            return;
        }
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
