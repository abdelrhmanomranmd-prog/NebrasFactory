/**
 * نبراس HCM — تتبع GPS حي للأسطول
 * جهاز GPS (IMEI) · جوال السائق · Traccar · خريطة موثّقة
 */
(function(global) {
    'use strict';

    const HR_GPS_POS_KEY = 'nebrasHrGpsPositions';
    const HR_GPS_SETTINGS_KEY = 'nebrasHrGpsSettings';
    const HR_GPS_CONSENTS_KEY = 'nebrasHrGpsConsents';
    const GPS_HISTORY_MAX = 800;
    const DEFAULT_LEGAL_CONSENT_AR = 'أوافق على إرسال موقعي الجغرافي لإدارة أسطول مصنع نبراس WPC أثناء المهمة الرسمية فقط، وفق سياسة الخصوصية ونظام حماية البيانات الشخصية في المملكة.';
    let hrGpsPositions = [];
    let hrGpsConsents = [];
    let hrGpsSettings = {
        enabled: true,
        provider: 'pending',
        pollIntervalSec: 25,
        mobilePingSec: 45,
        traccarUrl: '',
        traccarUser: '',
        traccarPass: '',
        traccarProxy: '/api/hr-gps-traccar',
        factoryLat: '26.326',
        factoryLng: '43.975',
        companyNameAr: 'مصنع نبراس WPC',
        legalConsentAr: DEFAULT_LEGAL_CONSENT_AR,
        retentionDays: 90,
        setupNotes: '',
        demoSeedEnabled: false,
        checklist: {
            devicesInstalled: false,
            simCardsActive: false,
            employeePolicySigned: false,
            hrTrainingDone: false
        },
        lastSyncAt: '',
        lastSyncStatus: '',
        lastSyncCount: 0,
        lastTestAt: '',
        lastTestStatus: ''
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
        try {
            const c = localStorage.getItem(HR_GPS_CONSENTS_KEY);
            hrGpsConsents = c ? JSON.parse(c) : [];
            if (!Array.isArray(hrGpsConsents)) hrGpsConsents = [];
        } catch (e) { hrGpsConsents = []; }
        const days = hrGpsSettings.retentionDays || 90;
        const cut = Date.now() - days * 86400000;
        const before = hrGpsPositions.length;
        hrGpsPositions = hrGpsPositions.filter(function(p) {
            const t = new Date(p.recordedAt || 0).getTime();
            return !isNaN(t) && t >= cut;
        });
        if (hrGpsPositions.length < before) {
            try { localStorage.setItem(HR_GPS_POS_KEY, JSON.stringify(hrGpsPositions.slice(0, GPS_HISTORY_MAX))); } catch (e) { /* ignore */ }
        }
    }

    function saveHrGpsData() {
        try {
            localStorage.setItem(HR_GPS_POS_KEY, JSON.stringify(hrGpsPositions.slice(0, GPS_HISTORY_MAX)));
            localStorage.setItem(HR_GPS_SETTINGS_KEY, JSON.stringify(hrGpsSettings));
            localStorage.setItem(HR_GPS_CONSENTS_KEY, JSON.stringify(hrGpsConsents.slice(0, 500)));
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

    function setHrGpsConsentsFromCloud(v) {
        hrGpsConsents = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_GPS_CONSENTS_KEY, JSON.stringify(hrGpsConsents)); } catch (e) { /* ignore */ }
    }

    function canEditGpsSetup() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof isStrictHrUser === 'function' && isStrictHrUser()) return true;
        return false;
    }

    function recordDriverGpsConsent(payload) {
        loadHrGpsData();
        hrGpsConsents.unshift({
            id: 'gc-' + Date.now(),
            token: payload.token || '',
            plateNo: payload.plateNo || '',
            driverName: payload.driverName || '',
            driverPhone: payload.driverPhone || '',
            consentedAt: new Date().toISOString(),
            userAgent: payload.userAgent || '',
            legalText: hrGpsSettings.legalConsentAr || DEFAULT_LEGAL_CONSENT_AR
        });
        if (hrGpsConsents.length > 500) hrGpsConsents.length = 500;
        saveHrGpsData();
    }

    function buildGpsReadinessReport() {
        loadHrGpsData();
        const vehs = typeof applyHrScopeFilter === 'function'
            ? applyHrScopeFilter((typeof getHrVehicles === 'function' ? getHrVehicles() : []).slice(), 'vehicle')
            : (typeof getHrVehicles === 'function' ? getHrVehicles() : []);
        const withImei = vehs.filter(function(v) { return String(v.gpsTracker || '').trim().length >= 10; });
        const cloudOk = typeof isNebrasCloudConnected === 'function' ? isNebrasCloudConnected() : false;
        const traccarCfg = !!(hrGpsSettings.traccarUrl && hrGpsSettings.traccarUser);
        const lastSyncOk = hrGpsSettings.lastSyncStatus && hrGpsSettings.lastSyncStatus.indexOf('OK') === 0;
        const cl = hrGpsSettings.checklist || {};
        const items = [
            { key: 'cloud', ok: cloudOk, label: 'السحابة (Supabase) متصلة — مزامنة مواقع السائق', hint: cloudOk ? 'جاهز' : 'فعّلي Supabase في المنصة' },
            { key: 'imei', ok: vehs.length > 0 && withImei.length === vehs.length, label: 'IMEI لكل سيارة (' + withImei.length + '/' + vehs.length + ')', hint: 'أدخلي IMEI في الجدول أدناه' },
            { key: 'traccar', ok: traccarCfg && lastSyncOk, label: 'Traccar / سيرفر GPS مُضبط ومُزامَن', hint: traccarCfg ? (lastSyncOk ? 'مزامنة ناجحة' : 'اضغطي اختبار الاتصال') : 'أدخلي رابط Traccar عند الجاهزية' },
            { key: 'devices', ok: !!cl.devicesInstalled, label: 'أجهزة GPS مُركّبة فعلياً في السيارات', hint: 'خارج المنصة — ثبّتي عند التركيب' },
            { key: 'sim', ok: !!cl.simCardsActive, label: 'شرائح SIM نشطة للأجهزة', hint: 'خارج المنصة — STC/Mobily/Zain' },
            { key: 'policy', ok: !!cl.employeePolicySigned, label: 'سياسة تتبع موقّعة من الموظفين', hint: 'نموذج موافقة HR + نظام PDPL' },
            { key: 'training', ok: !!cl.hrTrainingDone, label: 'فريق HR مدرّب على التتبع والسجل', hint: 'تدريب داخلي' }
        ];
        const done = items.filter(function(i) { return i.ok; }).length;
        const pct = items.length ? Math.round((done / items.length) * 100) : 0;
        return { items: items, done: done, total: items.length, pct: pct, vehs: vehs, withImei: withImei };
    }

    function saveVehicleImeiQuick(vehicleId, imei) {
        if (!canEditGpsSetup()) { alert('لا صلاحية لتعديل IMEI.'); return; }
        if (typeof getHrVehicles !== 'function' || typeof saveHrData !== 'function') return;
        const vehs = getHrVehicles();
        const v = vehs.find(function(x) { return x.id === vehicleId; });
        if (!v) return;
        v.gpsTracker = String(imei || '').trim();
        if (typeof stampHrRecord === 'function') stampHrRecord(v, false);
        saveHrData();
        if (typeof hrAudit === 'function') hrAudit('HR GPS IMEI', v.plateNo + ' → ' + (v.gpsTracker || '—'));
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function toggleGpsChecklistItem(key, on) {
        if (!canEditGpsSetup()) return;
        loadHrGpsData();
        if (!hrGpsSettings.checklist) hrGpsSettings.checklist = {};
        hrGpsSettings.checklist[key] = !!on;
        saveHrGpsData();
        if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
    }

    function testHrGpsTraccarConnection() {
        loadHrGpsData();
        saveHrGpsSettings(true);
        return syncHrGpsFromTraccar(true).then(function(n) {
            hrGpsSettings.lastTestAt = new Date().toISOString();
            hrGpsSettings.lastTestStatus = hrGpsSettings.lastSyncStatus || ('مواقع: ' + n);
            saveHrGpsData();
            alert('نتيجة الاختبار:\n' + (hrGpsSettings.lastTestStatus || '—'));
            if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
            return n;
        });
    }

    function pullHrGpsFromCloud() {
        if (typeof syncLoadFromNebrasCloudNow !== 'function') return Promise.resolve();
        return syncLoadFromNebrasCloudNow().then(function() {
            loadHrGpsData();
            if (typeof renderHrPlatformPanelSafe === 'function') renderHrPlatformPanelSafe();
        }).catch(function() { /* ignore */ });
    }

    function exportHrGpsLogCsv() {
        loadHrGpsData();
        const lines = ['الوقت,المصدر,اللوحة,IMEI,السائق,الجوال,خط العرض,خط الطول,الدقة,السرعة,سجّل بواسطة'];
        hrGpsPositions.slice(0, 500).forEach(function(p) {
            lines.push([
                p.recordedAt || '', p.source || '', p.plateNo || '', p.deviceImei || '',
                p.driverName || '', p.driverPhone || '', p.lat, p.lng,
                p.accuracy != null ? p.accuracy : '', p.speed != null ? p.speed : '', p.recordedBy || ''
            ].join(','));
        });
        const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'nebras-gps-log-' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        if (typeof hrAudit === 'function') hrAudit('HR GPS تصدير', lines.length - 1 + ' سجل');
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
            loadHrGpsData();
            const defLat = parseFloat(hrGpsSettings.factoryLat) || 26.326;
            const defLng = parseFloat(hrGpsSettings.factoryLng) || 43.975;
            const center = markers.length && markers[0].position
                ? [markers[0].position.lat, markers[0].position.lng]
                : [defLat, defLng];
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

    function renderHrGpsSetupWizard() {
        const rep = buildGpsReadinessReport();
        const canEdit = canEditGpsSetup();
        const checklistRows = rep.items.map(function(item) {
            const manualKeys = { devices: 'devicesInstalled', sim: 'simCardsActive', policy: 'employeePolicySigned', training: 'hrTrainingDone' };
            const manualKey = manualKeys[item.key];
            const manualBox = manualKey && canEdit
                ? '<label class="hr-gps-check-manual"><input type="checkbox"' + ((hrGpsSettings.checklist || {})[manualKey] ? ' checked' : '') +
                    ' onchange="toggleGpsChecklistItem(\'' + manualKey + '\', this.checked)"> تمّ</label>'
                : '';
            return '<div class="hr-gps-check-item' + (item.ok ? ' is-ok' : ' is-pending') + '">' +
                '<span class="hr-gps-check-icon"><i class="fas fa-' + (item.ok ? 'circle-check' : 'circle') + '"></i></span>' +
                '<div><strong>' + esc(item.label) + '</strong><small>' + esc(item.hint) + '</small></div>' + manualBox + '</div>';
        }).join('');

        const imeiRows = rep.vehs.map(function(v) {
            return '<tr><td><strong>' + esc(v.plateNo) + '</strong><br><small>' + esc((v.make || '') + ' ' + (v.model || '')) + '</small></td>' +
                '<td>' + (canEdit
                    ? '<input class="hr-gps-imei-input" id="imei-' + esc(v.id) + '" value="' + esc(v.gpsTracker || '') + '" placeholder="867530012345678">'
                    : esc(v.gpsTracker || '—')) + '</td>' +
                '<td>' + (canEdit
                    ? '<button type="button" class="erp-tag erp-tag--action" onclick="saveVehicleImeiQuick(\'' + esc(v.id) + '\', document.getElementById(\'imei-' + esc(v.id) + '\').value)"><i class="fas fa-save"></i> حفظ</button>'
                    : '—') + '</td></tr>';
        }).join('');

        const providerOpts = ['pending', 'traccar', 'mobile_only', 'both'].map(function(k) {
            const labels = { pending: '— لم يُحدد بعد —', traccar: 'Traccar / جهاز GPS', mobile_only: 'جوال السائق فقط', both: 'جهاز + جوال معاً' };
            return '<option value="' + k + '"' + (hrGpsSettings.provider === k ? ' selected' : '') + '>' + (labels[k] || k) + '</option>';
        }).join('');

        const settingsBlock = canEdit
            ? '<div class="hr-gps-setup-form">' +
                '<h4><i class="fas fa-sliders"></i> إعدادات GPS — أدخلي البيانات يدوياً عند الجاهزية</h4>' +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>مزود التتبع</span><select id="hgps-provider">' + providerOpts + '</select></label>' +
                    '<label class="nebras-field"><span>اسم الشركة (للموافقة القانونية)</span><input id="hgps-company" value="' + esc(hrGpsSettings.companyNameAr || '') + '"></label>' +
                    '<label class="nebras-field"><span>رابط Traccar / GPS Server</span><input id="hgps-traccar-url" value="' + esc(hrGpsSettings.traccarUrl) + '" placeholder="https://gps.yourserver.com"></label>' +
                    '<label class="nebras-field"><span>مستخدم Traccar</span><input id="hgps-traccar-user" value="' + esc(hrGpsSettings.traccarUser) + '"></label>' +
                    '<label class="nebras-field"><span>كلمة Traccar</span><input type="password" id="hgps-traccar-pass" value="' + esc(hrGpsSettings.traccarPass) + '" placeholder="••••••"></label>' +
                    '<label class="nebras-field"><span>تحديث تلقائي (ثانية)</span><input type="number" id="hgps-poll-sec" min="15" value="' + esc(hrGpsSettings.pollIntervalSec || 25) + '"></label>' +
                    '<label class="nebras-field"><span>احتفاظ السجل (يوم)</span><input type="number" id="hgps-retention" min="30" value="' + esc(hrGpsSettings.retentionDays || 90) + '"></label>' +
                    '<label class="nebras-field"><span>خط عرض المصنع</span><input id="hgps-lat" value="' + esc(hrGpsSettings.factoryLat || '26.326') + '"></label>' +
                    '<label class="nebras-field"><span>خط طول المصنع</span><input id="hgps-lng" value="' + esc(hrGpsSettings.factoryLng || '43.975') + '"></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>نص موافقة السائق (قانوني)</span><textarea id="hgps-legal" rows="3">' + esc(hrGpsSettings.legalConsentAr || DEFAULT_LEGAL_CONSENT_AR) + '</textarea></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظات الإعداد</span><input id="hgps-notes" value="' + esc(hrGpsSettings.setupNotes || '') + '" placeholder="رقم مزود الأجهزة · تاريخ التركيب…"></label>' +
                '</div>' +
                '<div class="erp-form-actions">' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="saveHrGpsSettings()"><i class="fas fa-save"></i> حفظ ورفع للسحابة</button>' +
                    '<button type="button" class="nebras-users-btn" onclick="testHrGpsTraccarConnection()"><i class="fas fa-plug"></i> اختبار Traccar</button>' +
                    '<button type="button" class="nebras-users-btn" onclick="pullHrGpsFromCloud()"><i class="fas fa-cloud-download-alt"></i> تحميل من السحابة</button>' +
                    '<button type="button" class="nebras-users-btn" onclick="exportHrGpsLogCsv()"><i class="fas fa-file-csv"></i> تصدير سجل GPS</button>' +
                '</div>' +
                (hrGpsSettings.lastTestStatus ? '<p class="hr-gps-sync-status"><i class="fas fa-info-circle"></i> آخر اختبار: ' + esc(hrGpsSettings.lastTestStatus) + '</p>' : '') +
                (hrGpsSettings.lastSyncStatus ? '<p class="hr-gps-sync-status">آخر مزامنة: ' + esc(hrGpsSettings.lastSyncStatus) + ' — ' + formatGpsAge(hrGpsSettings.lastSyncAt) + '</p>' : '') +
            '</div>'
            : '<p class="nebras-editor-hint">إعدادات GPS — الإدارة الرئيسية أو HR فقط.</p>';

        return '<div class="hr-gps-setup-wizard">' +
            '<div class="hr-gps-readiness-head">' +
                '<div><strong>جاهزية التتبع: ' + rep.pct + '%</strong><span>' + rep.done + ' / ' + rep.total + ' متطلبات مكتملة</span></div>' +
                '<div class="hr-gps-readiness-bar"><span style="width:' + rep.pct + '%"></span></div>' +
            '</div>' +
            '<div class="hr-gps-checklist">' + checklistRows + '</div>' +
            '<h4 class="hr-tracking-section-title"><i class="fas fa-microchip"></i> سجل أجهزة GPS (IMEI) — ربط يدوي بكل سيارة</h4>' +
            '<div class="hr-leave-table-wrap"><table class="hr-leave-table"><thead><tr><th>السيارة</th><th>IMEI الجهاز</th><th>حفظ</th></tr></thead><tbody>' +
            (imeiRows || '<tr><td colspan="3" class="erp-empty">أضيفي سيارات من سجل المركبات أولاً</td></tr>') +
            '</tbody></table></div>' +
            settingsBlock +
            '<details class="hr-gps-legal-doc"><summary><i class="fas fa-scale-balanced"></i> ما ينقصك خارج المنصة (قانوني + عملي 100%)</summary>' +
                '<ul class="hr-gps-legal-list">' +
                    '<li><strong>أجهزة GPS:</strong> شراء وتركيب جهاز في كل سيارة (IMEI 15 رقم) — Concox · Teltonika · أو ما يتوافق مع Traccar.</li>' +
                    '<li><strong>شريحة SIM:</strong> شريحة بيانات لكل جهاز (STC/Mobily) — بدونها لا يصل الموقع للسيرفر.</li>' +
                    '<li><strong>سيرفر Traccar:</strong> استضافة Traccar (سحابة أو سيرفركم) — أدخلي الرابط هنا عند الجاهزية.</li>' +
                    '<li><strong>موافقة الموظف:</strong> نموذج موافقة خطي/إلكتروني على تتبع الموقع أثناء العمل — نظام PDPL السعودي.</li>' +
                    '<li><strong>سياسة خصوصية:</strong> فقرة في دليل الموظف عن جمع الموقع والغرض (إدارة الأسطول فقط).</li>' +
                    '<li><strong>Supabase Service Key:</strong> في Vercel لـ <code>api/hr-gps-ping</code> — لاستقبال موقع السائق من الجوال.</li>' +
                '</ul></details>' +
        '</div>';
    }

    function renderHrGpsLiveSection() {
        loadHrGpsData();
        const setup = renderHrGpsSetupWizard();
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

        const consentCount = hrGpsConsents.length;
        return '<div class="hr-gps-live-block">' + setup +
            '<div class="hr-gps-doc-banner">' +
                '<i class="fas fa-satellite-dish"></i>' +
                '<div><strong>تتبع GPS موثّق — مثل برامج الأساطيل</strong>' +
                '<p>① IMEI في الجدول أعلاه · ② حفظ إعدادات Traccar · ③ اختبار الاتصال · ④ رابط جوال السائق. موافقات مسجّلة: ' + consentCount + '.</p></div></div>' +
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
        '</div>';
    }

    function saveHrGpsSettings(silent) {
        loadHrGpsData();
        const g = function(id) { const el = document.getElementById(id); return el ? el.value : null; };
        if (g('hgps-traccar-url') != null) hrGpsSettings.traccarUrl = g('hgps-traccar-url') || '';
        if (g('hgps-traccar-user') != null) hrGpsSettings.traccarUser = g('hgps-traccar-user') || '';
        if (g('hgps-traccar-pass') != null) hrGpsSettings.traccarPass = g('hgps-traccar-pass') || '';
        if (g('hgps-poll-sec') != null) hrGpsSettings.pollIntervalSec = Math.max(15, parseInt(g('hgps-poll-sec'), 10) || 25);
        if (g('hgps-provider') != null) hrGpsSettings.provider = g('hgps-provider') || 'pending';
        if (g('hgps-company') != null) hrGpsSettings.companyNameAr = g('hgps-company') || '';
        if (g('hgps-retention') != null) hrGpsSettings.retentionDays = Math.max(30, parseInt(g('hgps-retention'), 10) || 90);
        if (g('hgps-lat') != null) hrGpsSettings.factoryLat = g('hgps-lat') || '26.326';
        if (g('hgps-lng') != null) hrGpsSettings.factoryLng = g('hgps-lng') || '43.975';
        if (g('hgps-legal') != null) hrGpsSettings.legalConsentAr = g('hgps-legal') || DEFAULT_LEGAL_CONSENT_AR;
        if (g('hgps-notes') != null) hrGpsSettings.setupNotes = g('hgps-notes') || '';
        saveHrGpsData();
        if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
        if (typeof hrAudit === 'function') hrAudit('HR GPS إعدادات', 'حفظ — ' + (hrGpsSettings.provider || ''));
        if (!silent) alert('تم حفظ إعدادات GPS ورفعها للسحابة.');
    }

    function syncHrGpsFromTraccar(isTest) {
        loadHrGpsData();
        if (hrGpsSettings.provider === 'mobile_only') {
            hrGpsSettings.lastSyncStatus = 'وضع جوال السائق فقط — لا Traccar';
            saveHrGpsData();
            return Promise.resolve(0);
        }
        if (!hrGpsSettings.traccarUrl || !hrGpsSettings.traccarUser) {
            hrGpsSettings.lastSyncStatus = 'لم يُضبط Traccar — أدخلي البيانات في الإعدادات';
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
                driverPhone: coords.driverPhone || '',
                consented: !!coords.consented,
                userAgent: coords.userAgent || ''
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
                    '<label class="neb-driver-gps-consent"><input type="checkbox" id="neb-driver-gps-agree"> <span id="neb-driver-gps-legal-text">موافقة تتبع الموقع</span></label>' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" id="neb-driver-gps-start" disabled>تفعيل التتبع</button>' +
                    '<p class="neb-driver-gps-legal">يُسجَّل وقت الموافقة ويُحفظ في سجل HR — نظام PDPL.</p>' +
                '</div>';
            document.body.appendChild(overlay);
        }
        var agree = document.getElementById('neb-driver-gps-agree');
        var startBtn = document.getElementById('neb-driver-gps-start');
        if (agree) agree.checked = false;
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.onclick = function() {
                if (!agree || !agree.checked) return;
                startDriverGpsWatch(token);
            };
        }
        if (agree && startBtn) {
            agree.onchange = function() { startBtn.disabled = !agree.checked; };
        }
        var legalEl = document.getElementById('neb-driver-gps-legal-text');
        if (legalEl) {
            loadHrGpsData();
            legalEl.textContent = hrGpsSettings.legalConsentAr || DEFAULT_LEGAL_CONSENT_AR;
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
        var consentLogged = false;
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
                heading: c.heading,
                consented: true,
                userAgent: navigator.userAgent || ''
            }).then(function(res) {
                if (statusEl && res && res.ok) {
                    statusEl.textContent = 'تم إرسال الموقع — ' + new Date().toLocaleTimeString('ar-SA');
                    if (!consentLogged && res.plateNo) {
                        consentLogged = true;
                        recordDriverGpsConsent({
                            token: token,
                            plateNo: res.plateNo,
                            driverName: res.driverName || '',
                            driverPhone: res.driverPhone || '',
                            userAgent: navigator.userAgent || ''
                        });
                    }
                }
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
        loadHrGpsData();
        if (document.getElementById('hr-gps-live-map')) {
            setTimeout(paintHrGpsLiveMap, 80);
            startHrGpsLivePoll();
        }
        if (typeof isNebrasCloudConnected === 'function' && isNebrasCloudConnected()) {
            loadHrGpsData();
        }
    }

    function seedDemoGpsIfNeeded() {
        loadHrGpsData();
        if (!hrGpsSettings.demoSeedEnabled || hrGpsPositions.length) return;
    }

    function purgeOldGpsPositions() {
        loadHrGpsData();
        const days = hrGpsSettings.retentionDays || 90;
        const cut = Date.now() - days * 86400000;
        const before = hrGpsPositions.length;
        hrGpsPositions = hrGpsPositions.filter(function(p) {
            const t = new Date(p.recordedAt || 0).getTime();
            return !isNaN(t) && t >= cut;
        });
        if (hrGpsPositions.length < before) saveHrGpsData();
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
    global.setHrGpsConsentsFromCloud = setHrGpsConsentsFromCloud;
    global.getHrGpsConsents = function() { loadHrGpsData(); return hrGpsConsents; };
    global.saveVehicleImeiQuick = saveVehicleImeiQuick;
    global.toggleGpsChecklistItem = toggleGpsChecklistItem;
    global.testHrGpsTraccarConnection = testHrGpsTraccarConnection;
    global.pullHrGpsFromCloud = pullHrGpsFromCloud;
    global.exportHrGpsLogCsv = exportHrGpsLogCsv;
    global.buildGpsReadinessReport = buildGpsReadinessReport;
    global.recordDriverGpsConsent = recordDriverGpsConsent;
    global.purgeOldGpsPositions = purgeOldGpsPositions;

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
