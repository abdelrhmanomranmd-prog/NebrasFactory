/**
 * نبراس — حارس التخزين المحلي والسحابي
 * سعة كبيرة · منع فقدان البيانات · تقليل base64 في JSON
 */
(function(global) {
    'use strict';

    const WARN_BYTES = 4 * 1024 * 1024;

    function nebrasJsonBytes(val) {
        try {
            if (typeof Blob !== 'undefined') return new Blob([JSON.stringify(val)]).size;
            return JSON.stringify(val).length;
        } catch (e) { return 0; }
    }

    function stripRecordBase64(record, fields) {
        if (!record || typeof record !== 'object') return record;
        const out = Object.assign({}, record);
        fields.forEach(function(f) {
            if (out.attachmentCloudUrl && out[f]) out[f] = '';
        });
        return out;
    }

    function stripArrayBase64(arr, fields) {
        if (!Array.isArray(arr)) return arr;
        return arr.map(function(r) { return stripRecordBase64(r, fields); });
    }

    const CLOUD_STRIP_KEYS = {
        hr_documents: ['attachmentDataUrl'],
        legal_contracts: ['attachmentDataUrl'],
        legal_cases: ['attachmentDataUrl'],
        legal_compliance: ['attachmentDataUrl'],
        legal_rentals: ['attachmentDataUrl'],
        legal_policies: ['attachmentDataUrl']
    };

    function slimNebrasCloudPayload(storeKey, payload) {
        const fields = CLOUD_STRIP_KEYS[storeKey];
        if (!fields) return payload;
        return stripArrayBase64(payload, fields);
    }

    function nebrasPersistLocal(key, val) {
        const json = JSON.stringify(val);
        try {
            localStorage.setItem(key, json);
            return true;
        } catch (e) {
            const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22 || String(e.message || '').indexOf('quota') >= 0);
            if (!isQuota) {
                console.warn('[Nebras Storage]', key, e);
                return false;
            }
            console.warn('[Nebras Storage] Quota — محاولة تخفيف', key);
            if (typeof global.showNebrasAdminToast === 'function') {
                global.showNebrasAdminToast('تنبيه تخزين: المساحة المحلية ممتلئة — البيانات محفوظة في السحابة. نظّفي المرفقات القديمة أو استخدمي التصدير.', 'warn');
            }
            try {
                if (key.indexOf('hr') >= 0 || key.indexOf('legal') >= 0 || key.indexOf('Legal') >= 0) {
                    const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                    if (Array.isArray(parsed)) {
                        const slim = parsed.map(function(r) {
                            const c = Object.assign({}, r);
                            if (c.attachmentDataUrl && c.attachmentCloudUrl) c.attachmentDataUrl = '';
                            return c;
                        });
                        localStorage.setItem(key, JSON.stringify(slim));
                        return true;
                    }
                }
            } catch (e2) { /* ignore */ }
            return false;
        }
    }

    function nebrasStorageHealthReport() {
        const report = { keys: [], totalBytes: 0, warn: false };
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                const v = localStorage.getItem(k) || '';
                const bytes = v.length * 2;
                report.totalBytes += bytes;
                if (bytes > 50000) report.keys.push({ key: k, kb: Math.round(bytes / 1024) });
            }
            report.warn = report.totalBytes > WARN_BYTES;
        } catch (e) { /* ignore */ }
        return report;
    }

    global.nebrasJsonBytes = nebrasJsonBytes;
    global.nebrasPersistLocal = nebrasPersistLocal;
    global.slimNebrasCloudPayload = slimNebrasCloudPayload;
    global.stripArrayBase64 = stripArrayBase64;
    global.nebrasStorageHealthReport = nebrasStorageHealthReport;

})(typeof window !== 'undefined' ? window : globalThis);
