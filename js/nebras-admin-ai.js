/**
 * نبراس — مساعد Claude للإدارة الرئيسية
 */
(function(global) {
    'use strict';

    function isMainAdmin() {
        return typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(global.getNebrasCurrentAdmin && global.getNebrasCurrentAdmin());
    }

    function apiBase() {
        if (typeof global.NEBRAS_API_BASE === 'string' && global.NEBRAS_API_BASE) return global.NEBRAS_API_BASE;
        return '';
    }

    function buildAiContext() {
        const parts = [];
        try {
            if (typeof global.siteProducts !== 'undefined' && global.siteProducts) {
                parts.push('منتجات نشطة: ' + global.siteProducts.filter(function(p) { return p && p.visible !== false; }).length);
            }
            if (typeof global.adminUsers !== 'undefined' && global.adminUsers) {
                parts.push('مستخدمون إداريون: ' + global.adminUsers.length);
            }
        } catch (e) { /* ignore */ }
        return parts.join(' · ');
    }

    async function askNebrasAdminAi(prompt) {
        const token = typeof global.getNebrasSecureToken === 'function' ? global.getNebrasSecureToken() : '';
        if (!token) return { ok: false, error: 'login_required' };
        const res = await fetch(apiBase() + '/api/nebras-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ prompt: prompt, context: buildAiContext() })
        });
        return res.json();
    }

    function renderAdminAiPanel() {
        const body = document.getElementById('admin-ai-body');
        const status = document.getElementById('admin-ai-status');
        if (!body) return;
        if (!isMainAdmin()) {
            body.innerHTML = '<p class="erp-empty">مساعد Claude — الإدارة الرئيسية فقط (NEBRASFACTORY).</p>';
            return;
        }
        body.innerHTML =
            '<p class="scm-hint"><i class="fas fa-robot"></i> مساعد Claude — إدخال بيانات · تصنيف أصناف · صياغة محتوى · إرشاد إدارة الموقع</p>' +
            '<textarea id="admin-ai-prompt" class="admin-ai-prompt" rows="4" placeholder="مثال: صنّف لي أصناف الألومنيوم (بروفيل · صفائح · زاوية) مع مقاسات وSKU مقترحة..."></textarea>' +
            '<div class="workspace-actions-row">' +
            '<button type="button" class="workspace-action-btn workspace-action-btn--primary" id="admin-ai-send-btn"><i class="fas fa-paper-plane"></i> اسألي Claude</button>' +
            '<button type="button" class="workspace-action-btn" onclick="exportStoreCatalogCsv()"><i class="fas fa-file-csv"></i> تصدير المتجر CSV</button>' +
            '</div>' +
            '<pre id="admin-ai-reply" class="admin-ai-reply" aria-live="polite"></pre>';
        const btn = document.getElementById('admin-ai-send-btn');
        const promptEl = document.getElementById('admin-ai-prompt');
        const replyEl = document.getElementById('admin-ai-reply');
        if (btn && promptEl && replyEl) {
            btn.onclick = async function() {
                const p = promptEl.value.trim();
                if (!p) return;
                if (status) status.textContent = 'جاري التفكير...';
                replyEl.textContent = '';
                btn.disabled = true;
                try {
                    const data = await askNebrasAdminAi(p);
                    if (data.ok && data.reply) {
                        replyEl.textContent = data.reply;
                        if (status) status.textContent = 'تم';
                    } else if (data.error === 'ai_not_configured') {
                        replyEl.textContent = 'أضيفي ANTHROPIC_API_KEY في Vercel ثم أعيدي النشر.';
                        if (status) status.textContent = 'غير مُعد';
                    } else if (data.error === 'login_required') {
                        replyEl.textContent = 'سجّلي دخول الإدارة أولاً لتفعيل الجلسة الآمنة.';
                        if (status) status.textContent = 'يلزم دخول';
                    } else {
                        replyEl.textContent = 'تعذّر الاتصال بـ Claude: ' + (data.error || 'خطأ');
                        if (status) status.textContent = 'فشل';
                    }
                } catch (e) {
                    replyEl.textContent = 'خطأ شبكة: ' + e.message;
                    if (status) status.textContent = 'فشل';
                }
                btn.disabled = false;
            };
        }
    }

    function openNebrasAdminAi() {
        if (!isMainAdmin()) {
            alert('مساعد Claude — الإدارة الرئيسية فقط.');
            return;
        }
        if (typeof global.closeAllAdminSections === 'function') global.closeAllAdminSections();
        const el = document.getElementById('admin-ai-assistant');
        if (el) {
            el.classList.add('show');
            el.setAttribute('aria-hidden', 'false');
        }
        if (typeof global.revealPlatformLayer === 'function') global.revealPlatformLayer('admin-ai-assistant');
        renderAdminAiPanel();
    }

    function closeNebrasAdminAi() {
        const el = document.getElementById('admin-ai-assistant');
        if (el) {
            el.classList.remove('show');
            el.setAttribute('aria-hidden', 'true');
        }
        if (typeof global.syncPlatformInteractionLayers === 'function') global.syncPlatformInteractionLayers();
    }

    global.openNebrasAdminAi = openNebrasAdminAi;
    global.closeNebrasAdminAi = closeNebrasAdminAi;
    global.renderAdminAiPanel = renderAdminAiPanel;

})(typeof window !== 'undefined' ? window : globalThis);
