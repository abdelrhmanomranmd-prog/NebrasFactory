/**
 * نبراس HCM — تتبع GPS حي للأسطول
 * جهاز GPS (IMEI) · جوال السائق · Traccar · خريطة موثّقة
 */
(function(global) {
    'use strict';

    const HR_GPS_POS_KEY = 'nebrasHrGpsPositions';
    const HR_GPS_SETTINGS_KEY = 'nebrasHrGpsSettings';
    const GPS_HISTORY_MAX = 800;
    let hrGpsPositions = [];
    let hrGpsSettings = {
        enabled: true,
        pollIntervalSec: 25,
        mobilePingSec: 45,
        traccarUrl: '',
        traccarUser: '',
        traccarPass: '',
        traccarProxy: '/api/hr-gps-traccar',
        lastSyncAt: '',
        lastSyncStatus: '',
        lastSyncCount: 0
    };
    let hrGpsPollTimer = null;
    let hrGpsMapInstance = null;
    let hrGpsMapMarkers = {};

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadHrGpsData() {
        try {
            const p = localStorage.getItem(HR_GPS_POS_KEY);
            hrGpsPositions = p ? JSON.parse(p) : [];
            if (!Array.isArray(hrGpsPositions)) hrGpsPositions = [];
        } catch (e) { hrGpsPositions = []; }
        try {
            const s = localStorage.getItem(HR_GPS_SETTINGS_KEY);
            if (s) {
                const parsed = JSON.parse(s);
                if (parsed && typeof parsed === 'object') hrGpsSettings = Object.assign({}, hrGpsSettings, parsed);
            }
        } catch (e) { /* ignore */ }
    }

    function saveHrGpsData() {
        try {
            localStorage.setItem(HR_GPS_POS_KEY, JSON.stringify(hrGpsPositions.slice(0, GPS_HISTORY_MAX)));
            localStorage.setItem(HR_GPS_SETTINGS_KEY, JSON.stringify(hrGpsSettings));
        } catch (e) { console.warn('HR GPS save', e); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function setHrGpsPositionsFromCloud(v) {
        hrGpsPositions = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_GPS_POS_KEY, JSON.stringify(hrGpsPositions)); } catch (e) { /* ignore */ }
    }

    function setHrGpsSettingsFromCloud(v) {
        if (v && typeof v === 'object') hrGpsSettings = Object.assign({}, hrGpsSettings, v);
        try { localStorage.setItem(HR_GPS_SETTINGS_KEY, JSON.stringify(hrGpsSettings)); } catch (e) { /* ignore */ }
    }

    function randomGpsToken() {
        const a = Math.random().toString(36).slice(2, 10);
        const b = Date.now().toString(36);
        return 'neb-gps-' + b + a;
    }

    function ensureTrackingGpsToken(tracking) {
        if (!tracking) return '';
        if (!tracking.gpsShareToken) tracking.gpsShareToken = randomGpsToken();
        return tracking.gpsShareToken;
    }

    function buildDriverGpsShareUrl(token) {
        const base = (global.location && global.location.origin) ? global.location.origin : 'https://www.nebrasplasticcompany.com';
        return base + '/#neb-driver-gps=' + encodeURIComponent(token);
    }

    function getLatestGpsForVehicle(vehicleId, trackingId) {
        loadHrGpsData();
        let list = hrGpsPositions.slice();
        if (trackingId) list = list.filter(function(p) { return p.trackingId === trackingId; });
        else if (vehicleId) list = list.filter(function(p) { return p.vehicleId === vehicleId; });
        list.sort(function(a, b) { return String(b.recordedAt || '').localeCompare(String(a.recordedAt || '')); });
        return list[0] || null;
    }

    function formatGpsAge(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        const sec = Math.round((Date.now() - d.getTime()) / 1000);
        if (sec < 60) return 'الآن (' + sec + ' ث)';
        if (sec < 3600) return 'منذ ' + Math.round(sec / 60) + ' د';
        return 'منذ ' + Math.round(sec / 3600) + ' س';
    }

    function mapsCoordsUrl(lat, lng) {
        return 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
    }

    function recordGpsPosition(payload) {
        loadHrGpsData();
        if (!payload || payload.lat == null || payload.lng == null) return null;
        const actor = typeof getHrActor === 'function' ? getHrActor() : { username: payload.username || 'system' };
        const entry = {
            id: 'gp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            vehicleId: payload.vehicleId || null,
            trackingId: payload.trackingId || null,
            plateNo: payload.plateNo || '',
            driverPhone: payload.driverPhone || '',
            driverName: payload.driverName || '',
            deviceImei: payload.deviceImei || '',
            lat: Number(payload.lat),
            lng: Number(payload.lng),
            accuracy: payload.accuracy != null ? Number(payload.accuracy) : null,
            speed: payload.speed != null ? Number(payload.speed) : null,
            heading: payload.heading != null ? Number(payload.heading) : null,
            source: payload.source || 'manual',
            recordedAt: payload.recordedAt || new Date().toISOString(),
            recordedBy: actor.username || payload.username || 'system'
        };
        hrGpsPositions.unshift(entry);
        if (hrGpsPositions.length > GPS_HISTORY_MAX) hrGpsPositions.length = GPS_HISTORY_MAX;
        saveHrGpsData();
        if (typeof hrAudit === 'function') {
            hrAudit('HR GPS موقع', (entry.plateNo || entry.deviceImei || 'مركبة') + ' — ' + entry.lat.toFixed(5) + ',' + entry.lng.toFixed(5) + ' [' + entry.source + ']');
        }
        return entry;
    }

    function ingestGpsPositionsBatch(list) {
        if (!Array.isArray(list) || !list.length) return 0;
        let n = 0;
        list.forEach(function(p) {
            if (p && p.lat != null && p.lng != null) {
                recordGpsPosition(p);
                n++;
            }
        });
        return n;
    }

    function getScopedLiveGpsMarkers() {
        loadHrGpsData();
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        const tracking = typeof getHrVehicleTracking === 'function' ? getHrVehicleTracking() : [];
        const scopedVeh = typeof applyHrScopeFilter === 'function'
            ? applyHrScopeFilter(vehs.slice(), 'vehicle') : vehs;
        const scopedIds = scopedVeh.map(function(v) { return v.id; });
        const onRoad = tracking.filter(function(t) {
            return t.status === 'on_road' && (!t.vehicleId || scopedIds.indexOf(t.vehicleId) >= 0);
        });
        const markers = [];
        onRoad.forEach(function(t) {
            const pos = getLatestGpsForVehicle(t.vehicleId, t.id);
            const veh = t.vehicleId ? scopedVeh.find(function(v) { return v.id === t.vehicleId; }) : null;
            markers.push({
                tracking: t,
                vehicle: veh,
                position: pos,
                plateNo: t.plateNo,
                driverName: t.driverName,
                driverPhone: t.driverPhone,
                deviceImei: veh ? veh.gpsTracker : ''
            });
        });
        scopedVeh.filter(function(v) { return v.gpsTracker; }).forEach(function(v) {
            if (markers.some(function(m) { return m.vehicle && m.vehicle.id === v.id; })) return;
            const pos = getLatestGpsForVehicle(v.id, null);
            if (pos) markers.push({ tracking: null, vehicle: v, position: pos, plateNo: v.plateNo, driverName: v.currentDriverName || '', driverPhone: v.currentDriverPhone || '', deviceImei: v.gpsTracker });
        });
        return markers;
    }

    function ensureLeaflet() {
        return new Promise(function(resolve, reject) {
            if (global.L && global.L.map) { resolve(); return; }
            if (!document.querySelector('link[data-nebras-leaflet]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.setAttribute('data-nebras-leaflet', '1');
                document.head.appendChild(link);
            }
            const existing = document.querySelector('script[data-nebras-leaflet]');
            if (existing) {
                existing.addEventListener('load', function() { resolve(); });
                existing.addEventListener('error', reject);
                return;
            }
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.async = true;
            s.setAttribute('data-nebras-leaflet', '1');
            s.onload = function() { resolve(); };
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    function paintHrGpsLiveMap() {
        const host = document.getElementById('hr-gps-live-map');
        if (!host) return;
        ensureLeaflet().then(function() {
            const markers = getScopedLiveGpsMarkers();
            const center = markers.length && markers[0].position
                ? [markers[0].position.lat, markers[0].position.lng]
                : [26.326, 43.975];
            if (!hrGpsMapInstance) {
                hrGpsMapInstance = global.L.map(host, { scrollWheelZoom: true }).setView(center, 11);
                global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap'
                }).addTo(hrGpsMapInstance);
            } else {
                hrGpsMapInstance.setView(center, hrGpsMapInstance.getZoom());
            }
            Object.keys(hrGpsMapMarkers).forEach(function(k) {
                hrGpsMapInstance.removeLayer(hrGpsMapMarkers[k]);
            });
            hrGpsMapMarkers = {};
            markers.forEach(function(m, idx) {
                if (!m.position) return;
                const popup = '<strong>' + esc(m.plateNo) + '</strong><br>' + esc(m.driverName || '—') +
                    '<br><small>' + esc(m.driverPhone || '') + '</small><br>' +
                    '<a href="' + mapsCoordsUrl(m.position.lat, m.position.lng) + '" target="_blank" rel="noopener">فتح في خرائط Google</a>';
                const mk = global.L.marker([m.position.lat, m.position.lng]).addTo(hrGpsMapInstance).bindPopup(popup);
                hrGpsMapMarkers['m' + idx] = mk;
            });
            setTimeout(function() { if (hrGpsMapInstance) hrGpsMapInstance.invalidateSize(); }, 200);
        }).catch(function(e) { console.warn('Leaflet', e); });
    }

    function renderHrGpsLiveSection() {
        loadHrGpsData();
        const markers = getScopedLiveGpsMarkers();
        const withPos = markers.filter(function(m) { return m.position; });
        const rows = markers.map(function(m) {
            const pos = m.position;
            const live = pos && (Date.now() - new Date(pos.recordedAt).getTime()) < 5 * 60 * 1000;
            const srcLabel = pos ? ({ mobile: 'جوال السائق', traccar: 'جهاز GPS', device: 'جهاز GPS', manual: 'يدوي' }[pos.source] || pos.source) : '—';
            return '<tr class="' + (live ? 'hr-gps-row--live' : '') + '">' +
                '<td><strong>' + esc(m.plateNo) + '</strong>' + (m.deviceImei ? '<br><small>IMEI: ' + esc(m.deviceImei) + '</small>' : '') + '</td>' +
                '<td>' + esc(m.driverName || '—') + '<br><small>' + esc(m.driverPhone || '—') + '</small></td>' +
                '<td>' + (pos ? '<span class="erp-tag ' + (live ? 'erp-tag--ok' : '') + '">' + srcLabel + '</span><br>' +
                    formatGpsAge(pos.recordedAt) + '<br><small>' + pos.lat.toFixed(5) + ', ' + pos.lng.toFixed(5) + '</small>' : '<span class="erp-tag erp-tag--danger">لا إشارة GPS</span>') + '</td>' +
                '<td>' + (pos ? '<a class="hr-gps-link" target="_blank" rel="noopener" href="' + mapsCoordsUrl(pos.lat, pos.lng) + '"><i class="fas fa-map-location-dot"></i> خرائط</a>' : '—') +
                    (m.tracking && m.tracking.gpsShareToken ? ' <button type="button" class="erp-tag erp-tag--action" onclick="copyDriverGpsLink(\'' + esc(m.tracking.gpsShareToken) + '\')"><i class="fas fa-link"></i> رابط السائق</button>' : '') +
                '</td></tr>';
        }).join('');

        return '<div class="hr-gps-live-block">' +
            '<div class="hr-gps-doc-banner">' +
                '<i class="fas fa-satellite-dish"></i>' +
                '<div><strong>تتبع GPS موثّق — مثل برامج الأساطيل</strong>' +
                '<p>① جهاز GPS في السيارة (IMEI في سجل المركبة) · ② جوال السائق عبر رابط مشاركة · ③ مزامنة Traccar. كل نقطة موقع تُسجَّل بوقتها ومصدرها في السجل.</p></div></div>' +
            '<div class="hr-gps-map-wrap"><div id="hr-gps-live-map" class="hr-gps-live-map" role="img" aria-label="خريطة تتبع الأسطول"></div></div>' +
            '<div class="hr-gps-live-meta">' +
                '<span><i class="fas fa-circle text-live"></i> ' + withPos.length + ' مركبة بإحداثيات</span>' +
                '<span>آخر مزامنة: ' + esc(hrGpsSettings.lastSyncAt ? formatGpsAge(hrGpsSettings.lastSyncAt) : '—') + '</span>' +
                '<button type="button" class="nebras-users-btn" onclick="syncHrGpsNow()"><i class="fas fa-rotate"></i> تحديث GPS الآن</button>' +
            '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-list"></i> حالة التتبع الحي — لوحة · جوال · جهاز</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>المركبة</th><th>السائق / الجوال</th><th>آخر إشارة</th><th>إجراء</th></tr></thead><tbody>' +
            (rows || '<tr><td colspan="4" class="erp-empty">لا مركبات خارجة — سجّلي خروج سيارة ثم فعّلي رابط جوال السائق أو جهاز GPS</td></tr>') +
            '</tbody></table></div>' +
            renderHrGpsSettingsBlock() +
        '</div>';
    }

    function renderHrGpsSettingsBlock() {
        if (typeof isMainGovernanceAdmin === 'function' && !isMainGovernanceAdmin()) return '';
        return '<details class="hr-gps-settings"><summary><i class="fas fa-gear"></i> إعدادات GPS / Traccar (الإدارة الرئيسية)</summary>' +
            '<div class="erp-form-grid">' +
                '<label class="nebras-field"><span>رابط Traccar</span><input id="hgps-traccar-url" value="' + esc(hrGpsSettings.traccarUrl) + '" placeholder="https://gps.example.com"></label>' +
                '<label class="nebras-field"><span>مستخدم Traccar</span><input id="hgps-traccar-user" value="' + esc(hrGpsSettings.traccarUser) + '"></label>' +
                '<label class="nebras-field"><span>كلمة Traccar</span><input type="password" id="hgps-traccar-pass" value="' + esc(hrGpsSettings.traccarPass) + '"></label>' +
                '<label class="nebras-field"><span>تحديث كل (ثانية)</span><input type="number" id="hgps-poll-sec" min="15" value="' + esc(hrGpsSettings.pollIntervalSec || 25) + '"></label>' +
            '</div>' +
            '<p class="nebras-editor-hint">اربطي IMEI كل سيارة في سجل المركبة · Traccar يُزامَن عبر السيرفر لتجنب CORS.</p>' +
            '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrGpsSettings()"><i class="fas fa-save"></i> حفظ إعدادات GPS</button>' +
            '</details>';
    }

    function saveHrGpsSettings() {
        loadHrGpsData();
        hrGpsSettings.traccarUrl = (document.getElementById('hgps-traccar-url') || {}).value || '';
        hrGpsSettings.traccarUser = (document.getElementById('hgps-traccar-user') || {}).value || '';
        hrGpsSettings.traccarPass = (document.getElementById('hgps-traccar-pass') || {}).value || '';
        hrGpsSettings.pollIntervalSec = Math.max(15, parseInt((document.getElementById('hgps-poll-sec') || {}).value, 10) || 25);
        saveHrGpsData();
        if (typeof hrAudit === 'function') hrAudit('HR GPS إعدادات', 'حفظ Traccar');
        alert('تم حفظ إعدادات GPS.');
    }

    function syncHrGpsFromTraccar() {
        loadHrGpsData();
        if (!hrGpsSettings.traccarUrl || !hrGpsSettings.traccarUser) {
            hrGpsSettings.lastSyncStatus = 'لم يُضبط Traccar';
            saveHrGpsData();
            return Promise.resolve(0);
        }
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        const proxy = hrGpsSettings.traccarProxy || '/api/hr-gps-traccar';
        return fetch(proxy, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                traccarUrl: hrGpsSettings.traccarUrl,
                traccarUser: hrGpsSettings.traccarUser,
                traccarPass: hrGpsSettings.traccarPass,
                devices: vehs.filter(function(v) { return v.gpsTracker; }).map(function(v) {
                    return { imei: v.gpsTracker, vehicleId: v.id, plateNo: v.plateNo };
                })
            })
        }).then(function(r) { return r.json(); }).then(function(data) {
            let n = 0;
            if (data && Array.isArray(data.positions)) {
                data.positions.forEach(function(p) {
                    recordGpsPosition({
                        vehicleId: p.vehicleId,
                        plateNo: p.plateNo,
                        deviceImei: p.imei,
                        lat: p.lat,
                        lng: p.lng,
                        speed: p.speed,
                        heading: p.course,
                        source: 'traccar',
                        recordedAt: p.recordedAt || new Date().toISOString()
                    });
                    n++;
                });
            }
            hrGpsSettings.lastSyncAt = new Date().toISOString();
            hrGpsSettings.lastSyncStatus = data.error || ('OK — ' + n + ' موقع');
            hrGpsSettings.lastSyncCount = n;
            saveHrGpsData();
            return n;
        }).catch(function(err) {
            hrGpsSettings.lastSyncAt = new Date().toISOString();
            hrGpsSettings.lastSyncStatus = String(err.message || err);
            saveHrGpsData();
            return 0;
        });
    }

    function syncHrGpsNow() {
        syncHrGpsFromTraccar().then(function() {
            if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
            else paintHrGpsLiveMap();
        });
    }

    function startHrGpsLivePoll() {
        stopHrGpsLivePoll();
        loadHrGpsData();
        const sec = Math.max(15, hrGpsSettings.pollIntervalSec || 25);
        hrGpsPollTimer = setInterval(function() {
            const hrOpen = document.getElementById('hr-platform');
            if (!hrOpen || !hrOpen.classList.contains('show')) return;
            syncHrGpsFromTraccar().then(function() {
                if (document.getElementById('hr-gps-live-map')) paintHrGpsLiveMap();
            });
        }, sec * 1000);
    }

    function stopHrGpsLivePoll() {
        if (hrGpsPollTimer) { clearInterval(hrGpsPollTimer); hrGpsPollTimer = null; }
    }

    function copyDriverGpsLink(token) {
        const url = buildDriverGpsShareUrl(token);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function() {
                alert('تم نسخ رابط تتبع جوال السائق:\n' + url + '\n\nأرسليه للسائق على واتساب — يفتح الموقع ويرسل GPS تلقائياً.');
            });
        } else {
            prompt('رابط تتبع السائق — انسخيه:', url);
        }
    }

    function postDriverGpsPing(token, coords) {
        return fetch('/api/hr-gps-ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                lat: coords.lat,
                lng: coords.lng,
                accuracy: coords.accuracy,
                speed: coords.speed,
                heading: coords.heading,
                driverPhone: coords.driverPhone || ''
            })
        }).then(function(r) { return r.json(); });
    }

    var driverGpsWatchId = null;

    function openDriverGpsOverlay(token) {
        token = decodeURIComponent(String(token || '').trim());
        if (!token) return;
        var overlay = document.getElementById('neb-driver-gps-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neb-driver-gps-overlay';
            overlay.className = 'neb-driver-gps-overlay';
            overlay.innerHTML =
                '<div class="neb-driver-gps-card">' +
                    '<h2><i class="fas fa-location-crosshairs"></i> نبراس — تتبع السائق</h2>' +
                    '<p id="neb-driver-gps-status">جاري تفعيل GPS…</p>' +
                    '<p id="neb-driver-gps-coords" class="neb-driver-gps-coords"></p>' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="neb-driver-gps-start">تفعيل التتبع</button>' +
                    '<p class="neb-driver-gps-legal">بموافقتك يُرسل موقعك لإدارة أسطول نبراس أثناء المهمة فقط — موثّق في النظام.</p>' +
                '</div>';
            document.body.appendChild(overlay);
            document.getElementById('neb-driver-gps-start').addEventListener('click', function() {
                startDriverGpsWatch(token);
            });
        }
        overlay.classList.add('show');
        overlay.setAttribute('data-token', token);
    }

    function startDriverGpsWatch(token) {
        var statusEl = document.getElementById('neb-driver-gps-status');
        var coordsEl = document.getElementById('neb-driver-gps-coords');
        if (!navigator.geolocation) {
            if (statusEl) statusEl.textContent = 'المتصفح لا يدعم GPS — استخدمي Chrome على الجوال.';
            return;
        }
        if (statusEl) statusEl.textContent = 'التتبع نشط — لا تغلقي الصفحة أثناء المهمة';
        if (driverGpsWatchId != null) navigator.geolocation.clearWatch(driverGpsWatchId);
        var lastPing = 0;
        driverGpsWatchId = navigator.geolocation.watchPosition(function(pos) {
            var c = pos.coords;
            if (coordsEl) coordsEl.textContent = c.latitude.toFixed(5) + ', ' + c.longitude.toFixed(5) + ' · دقة ±' + Math.round(c.accuracy) + 'م';
            var now = Date.now();
            if (now - lastPing < 40000) return;
            lastPing = now;
            postDriverGpsPing(token, {
                lat: c.latitude,
                lng: c.longitude,
                accuracy: c.accuracy,
                speed: c.speed,
                heading: c.heading
            }).then(function(res) {
                if (statusEl && res && res.ok) statusEl.textContent = 'تم إرسال الموقع — ' + new Date().toLocaleTimeString('ar-SA');
            }).catch(function() {
                if (statusEl) statusEl.textContent = 'تعذّر الإرسال — تحققي من الشبكة';
            });
        }, function(err) {
            if (statusEl) statusEl.textContent = 'رفض GPS: ' + (err.message || err.code);
        }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    }

    function checkDriverGpsHash() {
        var hash = (global.location && global.location.hash) || '';
        var m = hash.match(/#neb-driver-gps=([^&]+)/);
        if (m) openDriverGpsOverlay(m[1]);
    }

    function afterHrTrackingPanelPaint() {
        if (document.getElementById('hr-gps-live-map')) {
            setTimeout(paintHrGpsLiveMap, 80);
            startHrGpsLivePoll();
        }
    }

    function seedDemoGpsIfNeeded() {
        loadHrGpsData();
        if (hrGpsPositions.length) return;
        const vehs = typeof getHrVehicles === 'function' ? getHrVehicles() : [];
        vehs.slice(0, 2).forEach(function(v, i) {
            recordGpsPosition({
                vehicleId: v.id,
                plateNo: v.plateNo,
                deviceImei: v.gpsTracker,
                lat: 26.326 + i * 0.02,
                lng: 43.975 + i * 0.015,
                source: 'device',
                recordedAt: new Date().toISOString()
            });
        });
    }

    global.loadHrGpsData = loadHrGpsData;
    global.saveHrGpsData = saveHrGpsData;
    global.setHrGpsPositionsFromCloud = setHrGpsPositionsFromCloud;
    global.setHrGpsSettingsFromCloud = setHrGpsSettingsFromCloud;
    global.getHrGpsPositions = function() { loadHrGpsData(); return hrGpsPositions; };
    global.getHrGpsSettings = function() { loadHrGpsData(); return hrGpsSettings; };
    global.recordGpsPosition = recordGpsPosition;
    global.ensureTrackingGpsToken = ensureTrackingGpsToken;
    global.buildDriverGpsShareUrl = buildDriverGpsShareUrl;
    global.getLatestGpsForVehicle = getLatestGpsForVehicle;
    global.renderHrGpsLiveSection = renderHrGpsLiveSection;
    global.paintHrGpsLiveMap = paintHrGpsLiveMap;
    global.syncHrGpsNow = syncHrGpsNow;
    global.syncHrGpsFromTraccar = syncHrGpsFromTraccar;
    global.saveHrGpsSettings = saveHrGpsSettings;
    global.copyDriverGpsLink = copyDriverGpsLink;
    global.startHrGpsLivePoll = startHrGpsLivePoll;
    global.stopHrGpsLivePoll = stopHrGpsLivePoll;
    global.afterHrTrackingPanelPaint = afterHrTrackingPanelPaint;
    global.checkDriverGpsHash = checkDriverGpsHash;
    global.seedDemoGpsIfNeeded = seedDemoGpsIfNeeded;
    global.formatGpsAge = formatGpsAge;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            checkDriverGpsHash();
            loadHrGpsData();
        });
    } else {
        checkDriverGpsHash();
        loadHrGpsData();
    }
    global.addEventListener('hashchange', checkDriverGpsHash);

})(typeof window !== 'undefined' ? window : globalThis);
