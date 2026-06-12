/**
 * بروكسي Traccar — جلب آخر مواقع أجهزة GPS (IMEI) لتجنب CORS من المتصفح
 */
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'POST only' });
        return;
    }
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const base = String(body.traccarUrl || '').replace(/\/$/, '');
        const user = String(body.traccarUser || '');
        const pass = String(body.traccarPass || '');
        const devices = Array.isArray(body.devices) ? body.devices : [];
        if (!base || !user || !devices.length) {
            res.status(400).json({ error: 'traccarUrl, traccarUser, devices required', positions: [] });
            return;
        }
        const auth = Buffer.from(user + ':' + pass).toString('base64');
        const devRes = await fetch(base + '/api/devices', {
            headers: { Authorization: 'Basic ' + auth, Accept: 'application/json' }
        });
        if (!devRes.ok) {
            res.status(502).json({ error: 'Traccar devices HTTP ' + devRes.status, positions: [] });
            return;
        }
        const traccarDevices = await devRes.json();
        const positions = [];
        for (let i = 0; i < devices.length; i++) {
            const want = devices[i];
            const imei = String(want.imei || '').trim();
            if (!imei) continue;
            const dev = traccarDevices.find(function(d) {
                return String(d.uniqueId || d.uniqueid || '') === imei;
            });
            if (!dev || !dev.id) continue;
            const posRes = await fetch(base + '/api/positions?deviceId=' + encodeURIComponent(dev.id), {
                headers: { Authorization: 'Basic ' + auth, Accept: 'application/json' }
            });
            if (!posRes.ok) continue;
            const posArr = await posRes.json();
            const pos = Array.isArray(posArr) && posArr.length ? posArr[0] : null;
            if (!pos || pos.latitude == null) continue;
            positions.push({
                vehicleId: want.vehicleId,
                plateNo: want.plateNo,
                imei: imei,
                lat: pos.latitude,
                lng: pos.longitude,
                speed: pos.speed,
                course: pos.course,
                recordedAt: pos.fixTime || pos.deviceTime || new Date().toISOString()
            });
        }
        res.status(200).json({ positions: positions, count: positions.length });
    } catch (err) {
        res.status(500).json({ error: String(err.message || err), positions: [] });
    }
};
