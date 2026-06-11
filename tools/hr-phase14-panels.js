/* Phase 14 — biometric WebAuthn, Supabase doc upload, email queue API, executive HR report */

    const HR_EMAIL_QUEUE_KEY = 'nebrasHrEmailQueue';
    let hrEmailQueue = [];

    function loadHrPhase14Data() {
        try {
            const q = localStorage.getItem(HR_EMAIL_QUEUE_KEY);
            hrEmailQueue = q ? JSON.parse(q) : [];
            if (!Array.isArray(hrEmailQueue)) hrEmailQueue = [];
        } catch (e) { hrEmailQueue = []; }
        if (!hrNotifSettings.emailWebhookUrl && typeof systemSettings !== 'undefined' && systemSettings.hrEmailWebhookUrl) {
            hrNotifSettings.emailWebhookUrl = systemSettings.hrEmailWebhookUrl;
        }
    }

    function saveHrPhase14Data() {
        try {
            localStorage.setItem(HR_EMAIL_QUEUE_KEY, JSON.stringify(hrEmailQueue));
        } catch (e) { console.warn('HR phase14 save', e); }
    }

    function setHrEmailQueueFromCloud(v) {
        hrEmailQueue = Array.isArray(v) ? v : [];
        try { localStorage.setItem(HR_EMAIL_QUEUE_KEY, JSON.stringify(hrEmailQueue)); } catch (e) { /* ignore */ }
    }

    function hrBufferToBase64Url(buf) {
        const bytes = new Uint8Array(buf);
        let str = '';
        bytes.forEach(function(b) { str += String.fromCharCode(b); });
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function hrBase64UrlToBuffer(b64) {
        const pad = '='.repeat((4 - (b64.length % 4)) % 4);
        const str = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(str);
        const out = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
        return out;
    }

    function hrBiometricSupported() {
        return !!(window.PublicKeyCredential && navigator.credentials && window.crypto && crypto.getRandomValues);
    }

    async function sendNebrasHrNotificationEmail(opts) {
        opts = opts || {};
        const to = opts.to || getHrNotifyEmail();
        const subject = opts.subject || 'تنبيه HR — مصنع نبراس';
        const body = opts.body || '';
        const entry = {
            id: 'he-' + Date.now(),
            to: to,
            subject: subject,
            body: body,
            meta: opts.meta || {},
            status: 'queued',
            channel: 'queue',
            createdAt: new Date().toISOString()
        };
        hrEmailQueue.unshift(entry);

        const webhook = hrNotifSettings.emailWebhookUrl ||
            (typeof systemSettings !== 'undefined' ? systemSettings.hrEmailWebhookUrl : '') || '';

        if (webhook) {
            try {
                const res = await fetch(webhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: to,
                        subject: subject,
                        body: body,
                        source: 'nebras-hr',
                        meta: entry.meta
                    })
                });
                if (res.ok) {
                    entry.status = 'sent';
                    entry.channel = 'api';
                } else {
                    entry.status = 'api-failed';
                    entry.channel = 'api';
                }
            } catch (err) {
                entry.status = 'api-failed';
                entry.error = String(err && err.message ? err.message : err);
                entry.channel = 'api';
            }
        }

        if (entry.status === 'queued' || entry.status === 'api-failed') {
            const mail = 'mailto:' + encodeURIComponent(to) +
                '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);
            window.location.href = mail;
            entry.status = entry.status === 'api-failed' ? 'api-failed-mailto' : 'mailto';
            entry.channel = entry.channel === 'api' ? 'api+mailto' : 'mailto';
        }

        saveHrData();
        return entry;
    }

    function saveHrEmailWebhookSetting() {
        if (!canViewHrExecutiveReports()) return;
        const el = document.getElementById('hr-email-webhook');
        if (el) hrNotifSettings.emailWebhookUrl = String(el.value || '').trim();
        saveHrData();
        hrAudit('HR إعداد بريد', 'Webhook API');
        alert('تم حفظ رابط Webhook — التنبيهات تُرسل عبر API ثم mailto احتياطي.');
        renderHrPlatformPanel();
    }

    async function hrRegisterEmployeeBiometric(empId) {
        if (!requireHrOps()) return;
        const emp = getEmployeeById(empId);
        if (!emp) return;
        if (!hrBiometricSupported()) {
            alert('المتصفح لا يدعم البصمة — استخدمي Chrome/Edge مع Windows Hello أو Touch ID.');
            return;
        }
        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);
            const cred = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: 'نبراس HR', id: window.location.hostname || 'localhost' },
                    user: {
                        id: new TextEncoder().encode(emp.id),
                        name: emp.employeeNo,
                        displayName: emp.nameAr
                    },
                    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
                    authenticatorSelection: { userVerification: 'required', authenticatorAttachment: 'platform' },
                    timeout: 60000
                }
            });
            if (cred && cred.rawId) {
                emp.bioCredentialId = hrBufferToBase64Url(cred.rawId);
                emp.bioRegisteredAt = new Date().toISOString().slice(0, 10);
                saveHrData();
                hrAudit('HR بصمة', 'تسجيل ' + emp.nameAr);
                alert('تم تسجيل البصمة لـ ' + emp.nameAr);
                renderHrPlatformPanel();
            }
        } catch (err) {
            alert('تعذّر تسجيل البصمة: ' + (err && err.message ? err.message : 'أعدي المحاولة'));
        }
    }

    async function hrBiometricCheckInPrompt() {
        if (!requireHrOps()) return;
        const no = prompt('رقم الموظف للحضور بالبصمة:', '');
        if (!no) return;
        const emp = findEmployeeByNo(no);
        if (!emp) { alert('رقم موظف غير موجود.'); return; }

        if (emp.bioCredentialId && hrBiometricSupported()) {
            try {
                const challenge = new Uint8Array(32);
                crypto.getRandomValues(challenge);
                const assertion = await navigator.credentials.get({
                    publicKey: {
                        challenge: challenge,
                        allowCredentials: [{
                            id: hrBase64UrlToBuffer(emp.bioCredentialId),
                            type: 'public-key'
                        }],
                        userVerification: 'required',
                        timeout: 60000
                    }
                });
                if (assertion) {
                    hrQuickCheckIn(emp.id, 'biometric');
                    const r = findTodayAttendance(emp.id);
                    if (r) { r.bioVerified = true; saveHrData(); }
                    return;
                }
            } catch (err) {
                alert('فشل التحقق بالبصمة — ' + (err && err.message ? err.message : 'أعدي المحاولة'));
                return;
            }
        }

        if (confirm(emp.nameAr + ' — لم تُسجَّل بصمة بعد. تسجيل الآن؟')) {
            await hrRegisterEmployeeBiometric(emp.id);
        } else {
            hrQuickCheckIn(emp.id, 'biometric');
        }
    }

    function buildHrExecutiveReportData(period, branchId) {
        loadHrData();
        const scopeBranch = function(entry) {
            if (branchId == null || branchId === '') return true;
            const bid = String(branchId);
            if (bid === 'hq') return String(entry.branchId) === 'hq';
            return String(entry.branchId) === bid;
        };
        const scopePeriod = function(entry) {
            const raw = entry.date || entry.createdAt;
            if (!raw) return false;
            if (typeof matchesExecutiveReportPeriod === 'function') {
                return matchesExecutiveReportPeriod({ date: raw }, period);
            }
            const dd = new Date(String(raw).length === 10 ? raw + 'T12:00:00' : raw);
            if (isNaN(dd.getTime())) return false;
            const now = new Date();
            if (period === 'daily') return dd.toDateString() === now.toDateString();
            if (period === 'monthly') return dd.getFullYear() === now.getFullYear() && dd.getMonth() === now.getMonth();
            if (period === 'yearly') return dd.getFullYear() === now.getFullYear();
            return true;
        };

        const att = hrAttendance.filter(function(a) { return scopeBranch(a) && scopePeriod(a); });
        const emps = hrEmployees.filter(scopeBranch);
        const activeEmps = emps.filter(function(e) { return e.status === 'active'; }).length;
        const withCheckIn = att.filter(function(a) { return a.checkIn; }).length;
        const bioCount = att.filter(function(a) { return a.checkInMethod === 'biometric' || a.bioVerified; }).length;
        const mobileCount = att.filter(function(a) { return a.checkInMethod === 'mobile'; }).length;
        const onRoad = hrVehicleTracking.filter(function(t) {
            return t.status === 'on_road' && scopeBranch(t);
        }).length;
        const expDocs = hrDocuments.filter(function(d) {
            if (!scopeBranch(d) || !d.expiryDate) return false;
            const days = Math.round((new Date(d.expiryDate + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24));
            return days <= 60;
        }).length;

        const rows = att.slice(0, 12).map(function(a) {
            const meth = (typeof HR_ATT_METHOD !== 'undefined' && HR_ATT_METHOD[a.checkInMethod]) || a.checkInMethod || '—';
            return [
                a.date,
                (a.employeeNo || '') + ' — ' + (a.employeeName || ''),
                (a.checkIn || '—') + ' → ' + (a.checkOut || '—'),
                meth
            ];
        });

        return {
            kpis: [
                { label: 'موظفون', val: emps.length },
                { label: 'نشطون', val: activeEmps },
                { label: 'سجلات حضور', val: att.length },
                { label: 'دخول مسجّل', val: withCheckIn },
                { label: 'بصمة / GPS', val: bioCount + ' / ' + mobileCount },
                { label: 'سيارات خارجة', val: onRoad },
                { label: 'مستندات قريبة الانتهاء', val: expDocs }
            ],
            rows: rows
        };
    }
