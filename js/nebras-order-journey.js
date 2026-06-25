/**
 * نبراس — مسار الطلب (Order Journey)
 * 7 محطات: طلب → موافقة مبيعات → إنتاج → ورشة → مستودع → تأكيد مالي → جاهز للاستلام
 * تاريخ التسليم المتوقع يُحدد عند اعتماد العرض من مدير/مندوب المبيعات
 */
(function(global) {
    'use strict';

    const JOURNEYS_KEY = 'nebrasCustomerOrderJourneys';
    const STAGES = [
        { id: 'quote_submitted', labelAr: 'طلب', icon: 'fa-file-invoice', perm: null },
        { id: 'sales_approved', labelAr: 'موافقة مبيعات', icon: 'fa-handshake', perm: 'sales' },
        { id: 'production', labelAr: 'إنتاج', icon: 'fa-industry', perm: 'production' },
        { id: 'workshop', labelAr: 'ورشة', icon: 'fa-screwdriver-wrench', perm: 'production' },
        { id: 'warehouse', labelAr: 'مستودع', icon: 'fa-warehouse', perm: 'warehouse' },
        { id: 'financial_confirmed', labelAr: 'تأكيد مالي', icon: 'fa-file-invoice-dollar', perm: 'accounting' },
        { id: 'ready_for_pickup', labelAr: 'جاهز للاستلام', icon: 'fa-box-open', perm: 'sales' }
    ];

    let journeys = [];
    let journeysReady = false;
    let approveModalState = null;

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

    function resolveAdmin() {
        if (typeof global.getNebrasCurrentAdmin === 'function') return global.getNebrasCurrentAdmin();
        try { if (typeof currentAdmin !== 'undefined') return currentAdmin; } catch (e) { /* ignore */ }
        return null;
    }

    function isMainGov(user) {
        return typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(user);
    }

    function canPerm(key, user) {
        user = user || resolveAdmin();
        if (!user) return false;
        if (isMainGov(user)) return true;
        if (typeof global.canManage === 'function') return global.canManage(key, user);
        return false;
    }

    function canOrderJourney(user) {
        user = user || resolveAdmin();
        if (!user) return false;
        if (isMainGov(user)) return true;
        if (canPerm('orderJourney', user)) return true;
        return STAGES.some(function(st) {
            return st.perm && canPerm(st.perm, user);
        });
    }

    function adminBranchId(user) {
        user = user || resolveAdmin();
        if (!user) return '';
        if (isMainGov(user)) return '';
        if (typeof global.getAdminAssignedBranchId === 'function') {
            const bid = global.getAdminAssignedBranchId(user);
            if (bid != null) return String(bid);
        }
        return user.branchId ? String(user.branchId) : '';
    }

    function loadJourneys() {
        if (journeysReady) return journeys;
        try {
            const raw = localStorage.getItem(JOURNEYS_KEY);
            journeys = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(journeys)) journeys = [];
        } catch (e) { journeys = []; }
        journeysReady = true;
        return journeys;
    }

    function saveJourneys() {
        try { localStorage.setItem(JOURNEYS_KEY, JSON.stringify(journeys)); } catch (e) { /* ignore */ }
        if (typeof global.markLocalCloudMutation === 'function') {
            global.markLocalCloudMutation('customer_order_journeys');
        }
        if (typeof global.markSensitiveCloudPending === 'function') global.markSensitiveCloudPending();
        if (typeof global.saveSystemData === 'function') {
            global.saveSystemData({ urgentCloud: true, skipMutationMark: true });
        } else if (typeof global.syncNebrasCloudInBackground === 'function') {
            global.syncNebrasCloudInBackground();
        }
        updateOrderJourneyBadge();
    }

    function setJourneysFromCloud(v) {
        journeys = Array.isArray(v) ? v : [];
        journeysReady = true;
        try { localStorage.setItem(JOURNEYS_KEY, JSON.stringify(journeys)); } catch (e) { /* ignore */ }
    }

    function actorLabel() {
        const a = resolveAdmin();
        return a ? (a.displayName || a.username || a.role || 'admin') : 'system';
    }

    function stageIndex(id) {
        return STAGES.findIndex(function(s) { return s.id === id; });
    }

    function initStageMap() {
        const map = {};
        STAGES.forEach(function(st) {
            map[st.id] = { status: 'pending', at: null, by: null };
        });
        return map;
    }

    function findPortalUserByQuote(entry) {
        if (!entry || typeof global.getCustomerPortalUsers !== 'function') return null;
        const users = global.getCustomerPortalUsers() || [];
        if (entry.portalUserId) {
            const byId = users.find(function(u) { return u.id === entry.portalUserId; });
            if (byId) return byId;
        }
        const phone = String(entry.phone || '').replace(/\D/g, '').slice(-9);
        if (phone) {
            const byPhone = users.find(function(u) {
                return String(u.phone || '').replace(/\D/g, '').slice(-9) === phone;
            });
            if (byPhone) return byPhone;
        }
        const name = String(entry.customerName || '').trim().toLowerCase();
        if (name) {
            const byName = users.find(function(u) {
                const dn = String(u.displayName || u.username || '').trim().toLowerCase();
                return dn === name || dn.indexOf(name) >= 0 || name.indexOf(dn) >= 0;
            });
            if (byName) return byName;
        }
        return null;
    }

    function journeyBelongsToPortalUser(j, portalUser) {
        if (!j || !portalUser) return false;
        if (j.portalUserId && j.portalUserId === portalUser.id) return true;
        if (typeof global.entryBelongsToPortalCustomer === 'function') {
            return global.entryBelongsToPortalCustomer(j, portalUser);
        }
        const pPhone = String(portalUser.phone || '').replace(/\D/g, '').slice(-9);
        const jPhone = String(j.phone || '').replace(/\D/g, '').slice(-9);
        if (pPhone && jPhone && pPhone === jPhone) return true;
        return false;
    }

    function journeyVisibleToAdmin(j, admin) {
        admin = admin || resolveAdmin();
        if (!admin || !j) return false;
        if (isMainGov(admin)) return true;
        const bid = adminBranchId(admin);
        if (!bid) return true;
        return !j.branchId || String(j.branchId) === bid;
    }

    function getJourneysForPortalUser(portalUser) {
        loadJourneys();
        return journeys.filter(function(j) { return journeyBelongsToPortalUser(j, portalUser); })
            .sort(function(a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    }

    function getJourneysForAdmin(admin) {
        loadJourneys();
        admin = admin || resolveAdmin();
        return journeys.filter(function(j) { return journeyVisibleToAdmin(j, admin); })
            .sort(function(a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    }

    function appendJourneyEvent(j, type, messageAr) {
        if (!j) return;
        if (!Array.isArray(j.events)) j.events = [];
        j.events.unshift({
            id: 'evt-' + Date.now(),
            at: new Date().toISOString(),
            type: type,
            messageAr: messageAr,
            by: actorLabel()
        });
        if (j.events.length > 40) j.events = j.events.slice(0, 40);
    }

    function makePickupCode(j) {
        if (j.pickupCode) return j.pickupCode;
        const seed = String(j.quoteNo || j.id || Date.now()).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const tail = seed.slice(-4) || String(Date.now()).slice(-4);
        j.pickupCode = 'NB-PK-' + tail + '-' + String(Math.floor(1000 + Math.random() * 9000));
        return j.pickupCode;
    }

    function buildPickupQrUrl(payload) {
        const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=' + encodeURIComponent(data);
    }

    function findJourneyByPickupCode(code) {
        loadJourneys();
        const norm = String(code || '').trim().toUpperCase();
        if (!norm) return null;
        return journeys.find(function(j) {
            return String(j.pickupCode || '').toUpperCase() === norm;
        }) || null;
    }

    function journeyNeedsAdminAction(j, admin) {
        admin = admin || resolveAdmin();
        if (!j || j.pickedUp) return false;
        const cur = computeCurrentStage(j);
        if (j.readyForPickup && !j.pickedUp && (canPerm('warehouse', admin) || canPerm('sales', admin))) return true;
        if (cur === 'production' && canPerm('production', admin)) return true;
        if (cur === 'workshop' && canPerm('production', admin)) return true;
        if (cur === 'warehouse' && canPerm('warehouse', admin)) return true;
        const whDone = j.stages && j.stages.warehouse && j.stages.warehouse.status === 'done';
        if (whDone && !j.salesReleaseApproved && canPerm('sales', admin)) return true;
        if (whDone && !j.accountingConfirmed && canPerm('accounting', admin)) return true;
        return false;
    }

    function countJourneyPendingForAdmin(admin) {
        return getJourneysForAdmin(admin).filter(function(j) {
            return journeyNeedsAdminAction(j, admin);
        }).length;
    }

    function updateOrderJourneyBadge() {
        const admin = resolveAdmin();
        const badge = document.getElementById('nav-journey-badge');
        if (!badge || !admin) return;
        if (!canOrderJourney(admin)) {
            badge.hidden = true;
            badge.textContent = '';
            return;
        }
        const count = countJourneyPendingForAdmin(admin);
        badge.textContent = count > 0 ? String(count) : '';
        badge.hidden = count <= 0;
        document.querySelectorAll('[data-journey-badge]').forEach(function(el) {
            el.textContent = count > 0 ? String(count) : '';
            el.hidden = count <= 0;
        });
    }

    function normSaPhone(phone) {
        let p = String(phone || '').replace(/\D/g, '');
        if (p.startsWith('966')) return p;
        if (p.startsWith('0')) p = p.slice(1);
        if (p.length === 9) return '966' + p;
        return p;
    }

    function buildWhatsAppReadyMessage(j) {
        const code = j.pickupCode || makePickupCode(j);
        const date = j.estimatedReadyDate ? formatDateAr(j.estimatedReadyDate) : '';
        return 'مرحباً ' + (j.customerName || 'عميلنا') + ' — مصنع نبراس للبلاستيك\n' +
            'طلبك جاهز للاستلام ✅\n' +
            'عرض: ' + (j.quoteNo || '') + '\n' +
            (date ? 'التسليم المتوقع: ' + date + '\n' : '') +
            'رمز الاستلام: ' + code + '\n' +
            'أحضري الرمز أو QR من بوابة العميل عند الاستلام.';
    }

    function openWhatsAppNotifyCustomer(j) {
        if (!j) return;
        const phone = normSaPhone(j.phone);
        if (!phone || phone.length < 11) {
            alert('لا رقم جوال صالح للعميل — أضيفيه في بيانات العرض.');
            return;
        }
        const text = encodeURIComponent(buildWhatsAppReadyMessage(j));
        window.open('https://wa.me/' + phone + '?text=' + text, '_blank', 'noopener,noreferrer');
        j.whatsappNotifiedAt = new Date().toISOString();
        appendJourneyEvent(j, 'whatsapp', 'إرسال واتساب — جاهز للاستلام');
        saveJourneys();
    }

    function syncJourneyToOms(j) {
        if (!j || typeof global.updateNebrasErpOrderFromJourney !== 'function') return;
        global.updateNebrasErpOrderFromJourney(j);
    }

    function exportOrderJourneyReport() {
        const admin = resolveAdmin();
        const items = getJourneysForAdmin(admin);
        const win = window.open('', '_blank', 'noopener,noreferrer');
        if (!win) { alert('فعّلي النوافذ المنبثقة للتقرير.'); return; }
        const rows = items.map(function(j) {
            return '<tr><td>' + esc(j.quoteNo || j.id) + '</td><td>' + esc(j.customerName || '') + '</td><td>' + esc(j.phone || '') +
                '</td><td>' + esc(stageLabelAr(computeCurrentStage(j))) + '</td><td>' + esc(formatDateAr(j.estimatedReadyDate)) +
                '</td><td>' + esc(j.pickupCode || '—') + '</td><td>' + (j.pickedUp ? 'مُستلَم' : (j.readyForPickup ? 'جاهز' : 'قيد التنفيذ')) + '</td></tr>';
        }).join('');
        win.document.write('<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير مسار نبراس</title>' +
            '<style>body{font-family:Tahoma,sans-serif;padding:24px}h1{color:#0a4d8c}table{width:100%;border-collapse:collapse;margin-top:16px}' +
            'th,td{border:1px solid #ccc;padding:8px;text-align:right}th{background:#0a4d8c;color:#fff}</style></head><body>' +
            '<h1>مسار نبراس — تقرير الطلبات</h1><p>تاريخ: ' + new Date().toLocaleString('ar-SA') + '</p>' +
            '<table><thead><tr><th>العرض</th><th>العميل</th><th>الجوال</th><th>المرحلة</th><th>تسليم متوقع</th><th>رمز الاستلام</th><th>الحالة</th></tr></thead><tbody>' +
            rows + '</tbody></table></body></html>');
        win.document.close();
        win.focus();
        win.print();
    }

    function pushCustomerReadyNotification(j) {
        if (!j || !j.readyForPickup) return;
        makePickupCode(j);
        j.customerNotifiedAt = new Date().toISOString();
        if (!Array.isArray(j.notifications)) j.notifications = [];
        j.notifications.unshift({
            id: 'ntf-' + Date.now(),
            at: j.customerNotifiedAt,
            type: 'ready_for_pickup',
            titleAr: 'طلبك جاهز للاستلام',
            bodyAr: 'عرض ' + (j.quoteNo || '') + ' — أحضري رمز الاستلام أو QR من بوابة العميل.',
            readAt: null
        });
        appendJourneyEvent(j, 'ready', 'إشعار جاهز للاستلام — رمز ' + j.pickupCode);
        syncJourneyToOms(j);
    }

    function getCustomerReadyAlerts(portalUser) {
        return getJourneysForPortalUser(portalUser).filter(function(j) {
            return j.readyForPickup && !j.pickedUp && !j.customerViewedReadyAt;
        });
    }

    function markJourneysReadyViewed(portalUser) {
        if (!portalUser) return;
        let changed = false;
        getJourneysForPortalUser(portalUser).forEach(function(j) {
            if (j.readyForPickup && !j.customerViewedReadyAt) {
                j.customerViewedReadyAt = new Date().toISOString();
                changed = true;
            }
        });
        if (changed) saveJourneys();
    }

    function renderCustomerJourneyAlertsHtml(portalUser) {
        const alerts = getCustomerReadyAlerts(portalUser);
        if (!alerts.length) return '';
        return '<div class="noj-cp-alerts">' + alerts.map(function(j) {
            return '<div class="noj-cp-alert noj-cp-alert--ready">' +
                '<i class="fas fa-bell"></i>' +
                '<div><strong>طلبك جاهز للاستلام!</strong>' +
                '<p>عرض ' + esc(j.quoteNo || j.id) + ' — توجهي للمستودع مع رمز الاستلام أدناه.</p></div></div>';
        }).join('') + '</div>';
    }

    function renderPickupQrBlock(j) {
        if (!j.readyForPickup || j.pickedUp) return '';
        const code = makePickupCode(j);
        const qrPayload = JSON.stringify({ v: 1, type: 'nebras-pickup', code: code, journeyId: j.id, quoteNo: j.quoteNo || '' });
        const qrUrl = buildPickupQrUrl(qrPayload);
        const loc = j.journeyNote || j.branchCity || 'مستودع نبراس';
        return '<div class="noj-pickup-card">' +
            '<div class="noj-pickup-card-head"><i class="fas fa-qrcode"></i><strong>رمز استلام الطلب</strong></div>' +
            '<img class="noj-pickup-qr" src="' + escAttr(qrUrl) + '" alt="QR استلام" loading="lazy">' +
            '<p class="noj-pickup-code" dir="ltr">' + esc(code) + '</p>' +
            '<p class="noj-pickup-hint"><i class="fas fa-location-dot"></i> ' + esc(loc) + '</p>' +
            '<p class="noj-pickup-hint"><i class="fas fa-id-card"></i> أظهري هذا الرمز أو QR عند الاستلام</p>' +
        '</div>';
    }

    function computeCurrentStage(j) {
        if (!j || !j.stages) return 'quote_submitted';
        if (j.pickedUp) return 'picked_up';
        if (j.readyForPickup) return 'ready_for_pickup';
        let lastDone = 'quote_submitted';
        STAGES.forEach(function(st) {
            const rec = j.stages[st.id];
            if (rec && rec.status === 'done') lastDone = st.id;
        });
        const nextIdx = stageIndex(lastDone) + 1;
        if (nextIdx < STAGES.length) return STAGES[nextIdx].id;
        return lastDone;
    }

    function tryFinalizeReadyForPickup(j) {
        if (!j) return;
        const wasReady = !!j.readyForPickup;
        const wh = j.stages.warehouse;
        if (!wh || wh.status !== 'done') return;
        if (!j.salesReleaseApproved || !j.accountingConfirmed) return;
        j.stages.financial_confirmed = j.stages.financial_confirmed || {};
        if (j.stages.financial_confirmed.status !== 'done') {
            j.stages.financial_confirmed.status = 'done';
            j.stages.financial_confirmed.at = new Date().toISOString();
            j.stages.financial_confirmed.by = 'dual-approval';
        }
        j.stages.ready_for_pickup = j.stages.ready_for_pickup || {};
        j.stages.ready_for_pickup.status = 'done';
        j.stages.ready_for_pickup.at = new Date().toISOString();
        j.stages.ready_for_pickup.by = actorLabel();
        j.readyForPickup = true;
        j.currentStage = 'ready_for_pickup';
        if (!wasReady) {
            pushCustomerReadyNotification(j);
            if (typeof global.showNebrasAdminToast === 'function') {
                global.showNebrasAdminToast('جاهز للاستلام — ' + (j.quoteNo || j.id) + ' · رمز ' + j.pickupCode, 'ok');
            }
            if (typeof global.addAuditLog === 'function') {
                global.addAuditLog('جاهز للاستلام — مسار نبراس', (j.quoteNo || j.id) + ' · ' + j.pickupCode);
            }
        }
    }

    function createJourneyFromQuote(entry, opts) {
        opts = opts || {};
        loadJourneys();
        if (!entry) return null;
        const existing = journeys.find(function(j) {
            return j.quoteId === entry.id || (entry.quoteNo && j.quoteNo === entry.quoteNo);
        });
        if (existing) return existing;

        const portalUser = findPortalUserByQuote(entry);
        const now = new Date().toISOString();
        const stages = initStageMap();
        stages.quote_submitted = { status: 'done', at: entry.at || now, by: entry.by || 'customer' };
        stages.sales_approved = {
            status: 'done',
            at: now,
            by: actorLabel(),
            estimatedReadyDate: opts.estimatedReadyDate || ''
        };

        const journey = {
            id: 'NOJ-' + Date.now(),
            quoteId: entry.id,
            quoteNo: entry.quoteNo || '',
            orderId: entry.orderId || null,
            orderNo: entry.orderNo || null,
            portalUserId: portalUser ? portalUser.id : (entry.portalUserId || null),
            customerName: entry.customerName || '',
            phone: entry.phone || '',
            branchId: entry.branchId || adminBranchId() || null,
            branchCity: entry.assignedBranchCity || entry.city || '',
            salesRepId: entry.repUserId || null,
            salesRepUsername: entry.repUsername || '',
            amount: Number(entry.totalIncVat || entry.total || 0),
            estimatedReadyDate: opts.estimatedReadyDate || '',
            currentStage: 'production',
            stages: stages,
            salesReleaseApproved: false,
            salesReleaseAt: null,
            salesReleaseBy: null,
            accountingConfirmed: false,
            accountingConfirmedAt: null,
            accountingConfirmedBy: null,
            journeyNote: opts.note || '',
            pickedUp: false,
            pickedUpAt: null,
            pickedUpBy: null,
            pickupCode: null,
            events: [],
            notifications: [],
            customerViewedReadyAt: null,
            readyForPickup: false,
            customerNotifiedAt: null,
            createdAt: now,
            updatedAt: now,
            createdBy: actorLabel()
        };
        journeys.unshift(journey);
        appendJourneyEvent(journey, 'created', 'بدء مسار نبراس — تسليم متوقع ' + (journey.estimatedReadyDate || '—'));
        saveJourneys();
        if (typeof global.addAuditLog === 'function') {
            global.addAuditLog('بدء مسار نبراس', (journey.quoteNo || journey.id) + ' — تسليم متوقع ' + (journey.estimatedReadyDate || '—'));
        }
        return journey;
    }

    function formatDateAr(d) {
        if (!d) return '—';
        try {
            return new Date(d + 'T12:00:00').toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return String(d);
        }
    }

    function renderJourneyTrack(j, compact) {
        const cur = computeCurrentStage(j);
        const curIdx = stageIndex(cur);
        const ready = !!j.readyForPickup;
        return '<div class="noj-track-wrap' + (compact ? ' noj-track-wrap--compact' : '') + '">' +
            '<div class="noj-track" role="list">' +
            STAGES.map(function(st, idx) {
                const rec = (j.stages && j.stages[st.id]) || {};
                let cls = 'noj-station';
                if (rec.status === 'done' || (ready && st.id === 'ready_for_pickup')) cls += ' noj-station--done';
                if (st.id === 'ready_for_pickup' && ready) cls += ' noj-station--ready';
                else if (idx === curIdx && !ready) cls += ' noj-station--active';
                else if (rec.status === 'done') cls += ' noj-station--done';
                return '<div class="' + cls + '" role="listitem">' +
                    '<div class="noj-station-dot"><i class="fas ' + st.icon + '"></i></div>' +
                    '<span class="noj-station-label">' + esc(st.labelAr) + '</span></div>';
            }).join('') +
            '</div></div>';
    }

    function renderCustomerJourneysHtml(portalUser) {
        const list = getJourneysForPortalUser(portalUser);
        if (!list.length) {
            return '<p class="cp-empty">لا مسارات طلب بعد — عند اعتماد عرض السعر يظهر مسار نبراس هنا.</p>';
        }
        return list.map(function(j) {
            const ready = j.readyForPickup && !j.pickedUp;
            const picked = j.pickedUp;
            const badge = picked
                ? '<span class="noj-badge noj-badge--done"><i class="fas fa-circle-check"></i> تم الاستلام</span>'
                : (ready
                    ? '<span class="noj-badge noj-badge--ready"><i class="fas fa-bell"></i> جاهز للاستلام</span>'
                    : '<span class="noj-badge"><i class="fas fa-route"></i> قيد التنفيذ</span>');
            return '<article class="noj-card">' +
                '<div class="noj-card-head"><strong>' + esc(j.quoteNo || j.id) + '</strong>' + badge + '</div>' +
                (j.estimatedReadyDate
                    ? '<div class="noj-eta"><i class="fas fa-calendar-check"></i> التسليم المتوقع: <strong>' + esc(formatDateAr(j.estimatedReadyDate)) + '</strong></div>'
                    : '') +
                renderJourneyTrack(j, true) +
                renderPickupQrBlock(j) +
                (picked ? '<p class="noj-picked-msg"><i class="fas fa-check-double"></i> تم استلام الطلب — شكراً لتعاملك مع نبراس</p>' : '') +
                '<p class="cp-empty" style="margin:0.5rem 0 0;font-size:0.82rem;">المبلغ: ' +
                (typeof global.formatSar === 'function' ? global.formatSar(j.amount) : j.amount) + '</p>' +
            '</article>';
        }).join('');
    }

    function ensureApproveModal() {
        let el = document.getElementById('noj-approve-overlay');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'noj-approve-overlay';
        el.className = 'noj-approve-overlay';
        el.innerHTML = '<div class="noj-approve-modal" role="dialog" aria-modal="true">' +
            '<h3><i class="fas fa-route"></i> اعتماد العرض وبدء مسار نبراس</h3>' +
            '<p>حدّدي تاريخ التسليم المتوقع للعميل — يظهر في بوابة العميل بعد الاعتماد.</p>' +
            '<div id="noj-approve-body"></div></div>';
        document.body.appendChild(el);
        el.addEventListener('click', function(ev) {
            if (ev.target === el) closeApproveQuoteJourneyModal();
        });
        return el;
    }

    function closeApproveQuoteJourneyModal() {
        const el = document.getElementById('noj-approve-overlay');
        if (el) el.classList.remove('show');
        approveModalState = null;
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    function openApproveQuoteJourneyModal(entryId) {
        if (!canPerm('sales')) {
            alert('اعتماد العرض — مدير المبيعات أو صلاحية المبيعات مطلوبة.');
            return;
        }
        const inbox = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
        const entry = inbox.find(function(e) { return e.id === entryId; });
        if (!entry) { alert('لم يُعثر على العرض.'); return; }
        approveModalState = { entryId: entryId, entry: entry };
        const overlay = ensureApproveModal();
        const body = document.getElementById('noj-approve-body');
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 14);
        const dateStr = defaultDate.toISOString().slice(0, 10);
        const portalHint = findPortalUserByQuote(entry)
            ? '<p class="scm-hint"><i class="fas fa-user-check"></i> مربوط بحساب بوابة العميل.</p>'
            : '<p class="scm-hint"><i class="fas fa-user-plus"></i> لا حساب بوابة — يمكن للمندوب إنشاء حساب من «مستخدمي العملاء».</p>';
        if (body) {
            body.innerHTML = portalHint +
                '<div class="erp-form-grid">' +
                    '<label class="nebras-field"><span>رقم العرض</span><input readonly value="' + escAttr(entry.quoteNo || entry.id) + '"></label>' +
                    '<label class="nebras-field"><span>العميل</span><input readonly value="' + escAttr(entry.customerName || '') + '"></label>' +
                    '<label class="nebras-field"><span>تاريخ التسليم المتوقع *</span><input type="date" id="noj-approve-date" value="' + escAttr(dateStr) + '" required></label>' +
                    '<label class="nebras-field nebras-field--wide"><span>ملاحظة للعميل (اختياري)</span><input type="text" id="noj-approve-note" placeholder="مثال: التسليم من مستودى الرياض"></label>' +
                '</div>' +
                '<div class="noj-approve-actions">' +
                    '<button type="button" class="nebras-users-btn nebras-users-btn--primary" onclick="submitApproveQuoteJourney()"><i class="fas fa-check"></i> اعتماد وبدء المسار</button>' +
                    '<button type="button" class="nebras-users-btn" onclick="closeApproveQuoteJourneyModal()">إلغاء</button>' +
                '</div>';
        }
        overlay.classList.add('show');
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    async function submitApproveQuoteJourney() {
        if (!approveModalState || !approveModalState.entry) return;
        const dateEl = document.getElementById('noj-approve-date');
        const noteEl = document.getElementById('noj-approve-note');
        const estimatedReadyDate = dateEl ? String(dateEl.value || '').trim() : '';
        if (!estimatedReadyDate) { alert('تاريخ التسليم المتوقع مطلوب.'); return; }
        const entry = approveModalState.entry;
        const entryId = approveModalState.entryId;
        const note = noteEl ? String(noteEl.value || '').trim() : '';

        entry.status = 'accepted';
        entry.quoteType = 'sale';
        entry.estimatedReadyDate = estimatedReadyDate;
        entry.journeyNote = note;
        entry.approvedAt = new Date().toISOString();
        entry.approvedBy = actorLabel();

        const inbox = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
        const local = inbox.find(function(e) { return e.id === entryId; });
        if (local) Object.assign(local, entry);
        if (typeof global.saveSalesQuotesInbox === 'function') global.saveSalesQuotesInbox(inbox);

        if (typeof global.registerQuoteAsSale === 'function') global.registerQuoteAsSale(entry);
        if (!entry.convertedToOrder && typeof global.convertQuoteToOrder === 'function' && canPerm('orders')) {
            await global.convertQuoteToOrder(entryId, { silent: true });
            const refreshed = typeof global.loadSalesQuotesInbox === 'function' ? global.loadSalesQuotesInbox() : [];
            const upd = refreshed.find(function(e) { return e.id === entryId; });
            if (upd) Object.assign(entry, upd);
        }

        createJourneyFromQuote(entry, { estimatedReadyDate: estimatedReadyDate, note: note });
        closeApproveQuoteJourneyModal();
        if (typeof global.displaySalesQuotesInbox === 'function') global.displaySalesQuotesInbox();
        if (typeof global.showNebrasAdminToast === 'function') {
            global.showNebrasAdminToast('تم اعتماد العرض وبدء مسار نبراس — التسليم المتوقع ' + formatDateAr(estimatedReadyDate), 'ok');
        } else {
            alert('تم اعتماد العرض وبدء مسار نبراس.');
        }
    }

    function advanceOrderJourneyStage(journeyId) {
        loadJourneys();
        const j = journeys.find(function(x) { return x.id === journeyId; });
        if (!j) { alert('لم يُعثر على المسار.'); return; }
        if (!journeyVisibleToAdmin(j)) { alert('هذا المسار خارج نطاق فرعك.'); return; }
        const cur = computeCurrentStage(j);
        const st = STAGES.find(function(s) { return s.id === cur; });
        if (!st) return;
        if (st.perm && !canPerm(st.perm)) {
            alert('صلاحية «' + st.labelAr + '» مطلوبة.');
            return;
        }
        if (cur === 'ready_for_pickup') {
            alert('المسار مكتمل — جاهز للاستلام.');
            return;
        }
        if (cur === 'financial_confirmed') {
            alert('استخدمي «تأكيد المبلغ كاملاً» من المحاسب.');
            return;
        }
        j.stages[cur] = j.stages[cur] || {};
        j.stages[cur].status = 'done';
        j.stages[cur].at = new Date().toISOString();
        j.stages[cur].by = actorLabel();
        j.currentStage = computeCurrentStage(j);
        j.updatedAt = new Date().toISOString();
        if (cur === 'warehouse') {
            j.pendingRelease = true;
        }
        appendJourneyEvent(j, 'stage', 'إكمال مرحلة: ' + st.labelAr);
        syncJourneyToOms(j);
        saveJourneys();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('مسار نبراس — ' + st.labelAr, j.quoteNo || j.id);
        renderOrderJourneyOpsPanel();
    }

    function confirmOrderJourneySalesRelease(journeyId) {
        if (!canPerm('sales')) {
            alert('اعتماد الإطلاق — مدير المبيعات فقط.');
            return;
        }
        loadJourneys();
        const j = journeys.find(function(x) { return x.id === journeyId; });
        if (!j || !journeyVisibleToAdmin(j)) return;
        const wh = j.stages.warehouse;
        if (!wh || wh.status !== 'done') {
            alert('أكملي مرحلة المستودع أولاً.');
            return;
        }
        j.salesReleaseApproved = true;
        j.salesReleaseAt = new Date().toISOString();
        j.salesReleaseBy = actorLabel();
        j.updatedAt = new Date().toISOString();
        tryFinalizeReadyForPickup(j);
        saveJourneys();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('مسار نبراس — اعتماد إطلاق مبيعات', j.quoteNo || j.id);
        renderOrderJourneyOpsPanel();
    }

    function confirmOrderJourneyAccounting(journeyId) {
        if (!canPerm('accounting')) {
            alert('تأكيد المبلغ — المحاسب فقط.');
            return;
        }
        loadJourneys();
        const j = journeys.find(function(x) { return x.id === journeyId; });
        if (!j || !journeyVisibleToAdmin(j)) return;
        const wh = j.stages.warehouse;
        if (!wh || wh.status !== 'done') {
            alert('أكملي مرحلة المستودع أولاً.');
            return;
        }
        if (!confirm('تأكيد استلام المبلغ كاملاً (' + (typeof global.formatSar === 'function' ? global.formatSar(j.amount) : j.amount) + ')؟')) return;
        j.accountingConfirmed = true;
        j.accountingConfirmedAt = new Date().toISOString();
        j.accountingConfirmedBy = actorLabel();
        j.stages.financial_confirmed = j.stages.financial_confirmed || {};
        j.stages.financial_confirmed.status = 'done';
        j.stages.financial_confirmed.at = new Date().toISOString();
        j.stages.financial_confirmed.by = actorLabel();
        j.updatedAt = new Date().toISOString();
        tryFinalizeReadyForPickup(j);
        saveJourneys();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('مسار نبراس — تأكيد مالي', j.quoteNo || j.id);
        renderOrderJourneyOpsPanel();
    }

    function confirmJourneyPickup(journeyId) {
        if (!canPerm('warehouse') && !canPerm('sales') && !isMainGov()) {
            alert('تأكيد الاستلام — المستودع أو المبيعات.');
            return;
        }
        loadJourneys();
        const j = journeys.find(function(x) { return x.id === journeyId; });
        if (!j || !journeyVisibleToAdmin(j)) return;
        if (!j.readyForPickup) { alert('الطلب ليس جاهزاً للاستلام بعد.'); return; }
        if (j.pickedUp) { alert('تم تسجيل الاستلام مسبقاً.'); return; }
        if (!confirm('تأكيد استلام العميل لـ ' + (j.quoteNo || j.id) + '؟')) return;
        j.pickedUp = true;
        j.pickedUpAt = new Date().toISOString();
        j.pickedUpBy = actorLabel();
        j.updatedAt = new Date().toISOString();
        appendJourneyEvent(j, 'picked_up', 'تم استلام الطلب من العميل');
        syncJourneyToOms(j);
        saveJourneys();
        if (typeof global.addAuditLog === 'function') global.addAuditLog('استلام عميل — مسار نبراس', (j.quoteNo || j.id) + ' · ' + (j.pickupCode || ''));
        if (typeof global.showNebrasAdminToast === 'function') global.showNebrasAdminToast('تم تأكيد استلام ' + (j.quoteNo || j.id), 'ok');
        renderOrderJourneyOpsPanel();
    }

    function verifyAndConfirmPickup() {
        const input = document.getElementById('noj-pickup-scan-input');
        const code = input ? String(input.value || '').trim() : '';
        if (!code) { alert('أدخلي رمز الاستلام أو امسحي QR.'); return; }
        let j = findJourneyByPickupCode(code);
        if (!j && code.indexOf('nebras-pickup') >= 0) {
            try {
                const parsed = JSON.parse(code);
                if (parsed && parsed.code) j = findJourneyByPickupCode(parsed.code);
                if (!j && parsed && parsed.journeyId) {
                    j = journeys.find(function(x) { return x.id === parsed.journeyId; });
                }
            } catch (e) { /* ignore */ }
        }
        if (!j) { alert('رمز غير صالح — تحققي من الرمز أو QR.'); return; }
        if (!journeyVisibleToAdmin(j)) { alert('هذا الطلب خارج نطاق فرعك.'); return; }
        confirmJourneyPickup(j.id);
        if (input) input.value = '';
    }

    function getJourneysForSalesRep(admin) {
        loadJourneys();
        admin = admin || resolveAdmin();
        if (!admin) return [];
        const uname = String(admin.username || '').toLowerCase();
        return journeys.filter(function(j) {
            return String(j.salesRepUsername || '').toLowerCase() === uname ||
                String(j.salesRepId || '') === String(admin.id || '');
        }).sort(function(a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    }

    function openRepCustomerJourneys() {
        const admin = resolveAdmin();
        if (!admin || admin.role !== 'sales_rep') {
            alert('مسارات عملائي — مندوب المبيعات فقط.');
            return;
        }
        openOrderJourneyOps();
        const list = document.getElementById('order-journey-ops-list');
        const stats = document.getElementById('order-journey-ops-stats');
        const items = getJourneysForSalesRep(admin);
        if (stats) {
            stats.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + items.length + '</strong><span>مسارات عملائي</span></div>' +
                '<div class="erp-stat erp-stat--ok"><strong>' + items.filter(function(j) { return j.readyForPickup && !j.pickedUp; }).length + '</strong><span>جاهز للاستلام</span></div>';
        }
        if (!list) return;
        if (!items.length) {
            list.innerHTML = '<p class="erp-empty">لا مسارات لعروضك بعد — بعد اعتماد العرض يظهر المسار هنا.</p>';
            return;
        }
        list.innerHTML = items.map(function(j) {
            return '<article class="erp-row"><div class="erp-row-main"><strong>' + esc(j.quoteNo || j.id) + '</strong>' +
                '<small>' + esc(j.customerName || '') + ' · ' + esc(stageLabelAr(computeCurrentStage(j))) +
                (j.estimatedReadyDate ? ' · تسليم: ' + esc(formatDateAr(j.estimatedReadyDate)) : '') + '</small>' +
                renderJourneyTrack(j, true) + '</div></article>';
        }).join('');
    }

    function stageLabelAr(id) {
        const st = STAGES.find(function(s) { return s.id === id; });
        return st ? st.labelAr : id;
    }

    function renderOrderJourneyOpsPanel() {
        const list = document.getElementById('order-journey-ops-list');
        const stats = document.getElementById('order-journey-ops-stats');
        if (!list) return;
        const admin = resolveAdmin();
        const items = getJourneysForAdmin(admin);
        const active = items.filter(function(j) { return !j.readyForPickup && !j.pickedUp; }).length;
        const ready = items.filter(function(j) { return j.readyForPickup && !j.pickedUp; }).length;
        const picked = items.filter(function(j) { return j.pickedUp; }).length;
        if (stats) {
            stats.innerHTML =
                '<div class="erp-stat erp-stat--accent"><strong>' + items.length + '</strong><span>إجمالي المسارات</span></div>' +
                '<div class="erp-stat"><strong>' + active + '</strong><span>قيد التنفيذ</span></div>' +
                '<div class="erp-stat erp-stat--ok"><strong>' + ready + '</strong><span>جاهز للاستلام</span></div>' +
                '<div class="erp-stat"><strong>' + picked + '</strong><span>مُستلَم</span></div>';
        }
        if (!items.length) {
            list.innerHTML = '<p class="erp-empty">لا مسارات بعد — اعتمادي عرضاً من صندوق المبيعات لبدء مسار نبراس.</p>';
            return;
        }
        list.innerHTML = items.map(function(j) {
            const cur = computeCurrentStage(j);
            const key = escAttr(j.id);
            let actions = '';
            if (!j.readyForPickup && cur !== 'sales_approved' && cur !== 'quote_submitted') {
                const st = STAGES.find(function(s) { return s.id === cur; });
                if (st && (!st.perm || canPerm(st.perm))) {
                    actions += '<button type="button" class="erp-tag erp-tag--action" onclick="advanceOrderJourneyStage(\'' + key + '\')"><i class="fas fa-forward"></i> إكمال: ' + esc(st.labelAr) + '</button>';
                }
            }
            const whDone = j.stages.warehouse && j.stages.warehouse.status === 'done';
            if (whDone && !j.salesReleaseApproved && canPerm('sales')) {
                actions += '<button type="button" class="erp-tag erp-tag--action" onclick="confirmOrderJourneySalesRelease(\'' + key + '\')"><i class="fas fa-handshake"></i> اعتماد إطلاق (مبيعات)</button>';
            }
            if (whDone && !j.accountingConfirmed && canPerm('accounting')) {
                actions += '<button type="button" class="erp-tag erp-tag--action" onclick="confirmOrderJourneyAccounting(\'' + key + '\')"><i class="fas fa-coins"></i> تأكيد المبلغ كاملاً</button>';
            }
            if (j.readyForPickup && !j.pickedUp && (canPerm('warehouse') || canPerm('sales'))) {
                actions += '<button type="button" class="erp-tag erp-tag--action erp-tag--ok" onclick="confirmJourneyPickup(\'' + key + '\')"><i class="fas fa-box-open"></i> تأكيد استلام العميل</button>';
            }
            if (j.readyForPickup && !j.pickedUp && canPerm('sales') && j.phone) {
                actions += '<button type="button" class="erp-tag erp-tag--action" onclick="openWhatsAppNotifyCustomerById(\'' + key + '\')"><i class="fab fa-whatsapp"></i> واتساب العميل</button>';
            }
            const statusBadge = j.pickedUp
                ? '<span class="noj-badge noj-badge--done"><i class="fas fa-circle-check"></i> مُستلَم</span>'
                : (j.readyForPickup
                    ? '<span class="noj-badge noj-badge--ready"><i class="fas fa-bell"></i> جاهز للاستلام</span>'
                    : '<span class="noj-badge">المرحلة: ' + esc(stageLabelAr(cur)) + '</span>');
            const pickupInfo = j.pickupCode && j.readyForPickup && !j.pickedUp
                ? '<small class="noj-pickup-inline" dir="ltr"><i class="fas fa-qrcode"></i> ' + esc(j.pickupCode) + '</small>'
                : '';
            return '<article class="erp-row noj-ops-row">' +
                '<div class="erp-row-main">' +
                    '<strong>' + esc(j.quoteNo || j.id) + '</strong> ' + statusBadge +
                    '<small>' + esc(j.customerName || '') + ' · ' + esc(j.phone || '') +
                    (j.estimatedReadyDate ? ' · تسليم متوقع: ' + esc(formatDateAr(j.estimatedReadyDate)) : '') +
                    pickupInfo + '</small>' +
                    renderJourneyTrack(j, true) +
                    '<div class="noj-ops-actions">' + actions + '</div>' +
                '</div></article>';
        }).join('');
    }

    function openOrderJourneyOps() {
        if (!canOrderJourney()) {
            alert('مسار نبراس — صلاحية المبيعات أو الإنتاج أو المستودع أو المحاسبة مطلوبة.');
            return;
        }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('order-journey-ops');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('order-journey-ops');
        else if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
        renderOrderJourneyOpsPanel();
    }

    function openWhatsAppNotifyCustomerById(journeyId) {
        loadJourneys();
        const j = journeys.find(function(x) { return x.id === journeyId; });
        if (!j) return;
        openWhatsAppNotifyCustomer(j);
    }

    function closeOrderJourneyOps() {
        const el = document.getElementById('order-journey-ops');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.openOrderJourneyOps = openOrderJourneyOps;
    global.closeOrderJourneyOps = closeOrderJourneyOps;
    global.renderOrderJourneyOpsPanel = renderOrderJourneyOpsPanel;
    global.openApproveQuoteJourneyModal = openApproveQuoteJourneyModal;
    global.closeApproveQuoteJourneyModal = closeApproveQuoteJourneyModal;
    global.submitApproveQuoteJourney = submitApproveQuoteJourney;
    global.advanceOrderJourneyStage = advanceOrderJourneyStage;
    global.confirmOrderJourneySalesRelease = confirmOrderJourneySalesRelease;
    global.confirmOrderJourneyAccounting = confirmOrderJourneyAccounting;
    global.getNebrasOrderJourneys = function() { return loadJourneys(); };
    global.setNebrasOrderJourneysFromCloud = setJourneysFromCloud;
    global.renderCustomerJourneysHtml = renderCustomerJourneysHtml;
    global.createJourneyFromQuote = createJourneyFromQuote;
    global.getJourneysForPortalUser = getJourneysForPortalUser;
    global.canOrderJourney = canOrderJourney;
    global.updateOrderJourneyBadge = updateOrderJourneyBadge;
    global.confirmJourneyPickup = confirmJourneyPickup;
    global.verifyAndConfirmPickup = verifyAndConfirmPickup;
    global.openRepCustomerJourneys = openRepCustomerJourneys;
    global.renderCustomerJourneyAlertsHtml = renderCustomerJourneyAlertsHtml;
    global.markJourneysReadyViewed = markJourneysReadyViewed;
    global.countJourneyPendingForAdmin = countJourneyPendingForAdmin;
    global.exportOrderJourneyReport = exportOrderJourneyReport;
    global.openWhatsAppNotifyCustomerById = openWhatsAppNotifyCustomerById;
    global.syncJourneyToOms = syncJourneyToOms;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(updateOrderJourneyBadge, 500);
        });
    } else {
        setTimeout(updateOrderJourneyBadge, 500);
    }

})(typeof window !== 'undefined' ? window : globalThis);
