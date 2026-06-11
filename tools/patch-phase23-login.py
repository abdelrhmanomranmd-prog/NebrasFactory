#!/usr/bin/env python3
"""Phase 23: Fix admin login + dashboard reveal."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
INJECT = os.path.join(ROOT, 'tools', 'phase23-login-fix.js')
CSS37 = os.path.join(ROOT, 'css', '37-admin-enterprise-unified.css')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT, encoding='utf-8') as f:
    p23 = f.read()
with open(CSS37, encoding='utf-8') as f:
    css = f.read()

MARKER = '/* PHASE23_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


if MARKER in plat:
    start = plat.index(MARKER)
    end = plat.index('        function buildCartBankPaymentHtmlCore(lang)', start)
    plat = plat[:start] + plat[end:]

plat = sub(plat,
    '        function buildCartBankPaymentHtmlCore(lang) {',
    MARKER + '\n' + p23 + '\n        function buildCartBankPaymentHtmlCore(lang) {',
    'inject phase23')

plat = sub(plat,
    """        function enforceAdminDashboardGate() {
            const dash = document.getElementById('admin-dashboard');
            if (!dash) return;
            if (currentAdmin) {
                dash.removeAttribute('hidden');
                dash.setAttribute('aria-hidden', 'false');
            } else {
                dash.classList.remove('show');
                dash.setAttribute('hidden', '');
                dash.setAttribute('aria-hidden', 'true');
            }
        }""",
    """        function enforceAdminDashboardGate() {
            const dash = document.getElementById('admin-dashboard');
            if (!dash) return;
            if (currentAdmin) {
                dash.classList.add('show');
                dash.removeAttribute('hidden');
                dash.setAttribute('aria-hidden', 'false');
            } else {
                dash.classList.remove('show');
                dash.setAttribute('hidden', '');
                dash.setAttribute('aria-hidden', 'true');
            }
        }""",
    'enforceAdminDashboardGate show class')

plat = sub(plat,
    """        function openAdminPanel(event) {
            event.preventDefault();
            if (currentAdmin) {
                showAdminDashboard(currentAdmin);
                return;
            }
            document.getElementById('admin-overlay').classList.add('show');
            document.getElementById('admin-status-message').textContent = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
        }""",
    """        function openAdminPanel(event) {
            event.preventDefault();
            if (currentAdmin) {
                showAdminDashboard(currentAdmin);
                if (typeof scrollToAdminDashboard === 'function') scrollToAdminDashboard();
                return;
            }
            document.getElementById('admin-overlay').classList.add('show');
            if (typeof setAdminLoginStatus === 'function') setAdminLoginStatus('', '');
            else document.getElementById('admin-status-message').textContent = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
            if (typeof bindAdminLoginForm === 'function') bindAdminLoginForm();
        }""",
    'openAdminPanel bind form')

plat = sub(plat,
    """        function loginAdmin() {
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            const status = document.getElementById('admin-status-message');
            const user = adminUsers.find(function(u) {
                return String(u.username || '').toUpperCase() === username.toUpperCase() && u.password === password;
            });

            const ui = siteText[currentLang || 'ar'] || siteText.ar;
            if (!username || !password) {
                status.textContent = ui.adminLoginEmpty || 'يرجى إدخال اسم المستخدم وكلمة المرور.';
                return;
            }

            if (user) {
                if (user.isActive === false) {
                    status.textContent = ui.adminLoginDisabled || 'هذا الحساب معطّل — تواصل مع الإدارة الرئيسية.';
                    addAuditLog('محاولة دخول معطّل', user.username + ' — حساب معطّل');
                    return;
                }
                if (isMainGovernanceAdmin(user)) {
                    user.isPrimary = true;
                    user.role = 'superadmin';
                    user.permissions = null;
                }
                const loginNow = new Date().toISOString();
                const uidx = adminUsers.findIndex(function(u) { return u.id === user.id; });
                if (uidx >= 0) {
                    adminUsers[uidx] = Object.assign({}, adminUsers[uidx], user, { lastLoginAt: loginNow, lastSeenAt: loginNow, isActive: true });
                    user = adminUsers[uidx];
                }
                currentAdmin = user;
                saveSystemData();
                if (typeof startAdminPresenceHeartbeat === 'function') startAdminPresenceHeartbeat(user);
                status.textContent = ui.adminLoginOk || 'تم تسجيل الدخول بنجاح.';
                if (typeof showNebrasAdminToast === 'function') {
                    showNebrasAdminToast('مرحباً ' + user.username + ' — ' + getRoleLabel(user.role), 'ok');
                }
                closeAdminOverlay();
                showAdminDashboard(user);
                setLanguage(currentLang || 'ar');
                addAuditLog('تسجيل دخول', 'دخول ناجح — ' + user.username + ' (' + getRoleLabel(user.role) + ')');
            } else {
                status.textContent = ui.adminLoginFail || 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
                addAuditLog('محاولة دخول فاشلة', 'اسم مستخدم: ' + username);
            }
        }""",
    """        async function loginAdmin() {
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            const loginBtn = document.getElementById('admin-login-btn');
            const ui = siteText[currentLang || 'ar'] || siteText.ar;

            if (!username || !password) {
                if (typeof setAdminLoginStatus === 'function') setAdminLoginStatus(ui.adminLoginEmpty || 'يرجى إدخال اسم المستخدم وكلمة المرور.', 'error');
                return;
            }

            if (loginBtn) loginBtn.disabled = true;
            let user = typeof resolveAdminLoginUser === 'function' ? resolveAdminLoginUser(username, password) : null;

            if (!user && supabaseClient && typeof loadFromNebrasCloud === 'function') {
                try {
                    await loadFromNebrasCloud();
                    user = typeof resolveAdminLoginUser === 'function' ? resolveAdminLoginUser(username, password) : null;
                } catch (e) { /* ignore */ }
            }

            if (user) {
                if (user.isActive === false) {
                    if (typeof setAdminLoginStatus === 'function') setAdminLoginStatus(ui.adminLoginDisabled || 'هذا الحساب معطّل — تواصل مع الإدارة الرئيسية.', 'error');
                    addAuditLog('محاولة دخول معطّل', user.username + ' — حساب معطّل');
                    if (loginBtn) loginBtn.disabled = false;
                    return;
                }
                if (isMainGovernanceAdmin(user)) {
                    user.isPrimary = true;
                    user.role = 'superadmin';
                    user.permissions = null;
                }
                const loginNow = new Date().toISOString();
                const uidx = adminUsers.findIndex(function(u) { return u.id === user.id; });
                if (uidx >= 0) {
                    adminUsers[uidx] = Object.assign({}, adminUsers[uidx], user, { lastLoginAt: loginNow, lastSeenAt: loginNow, isActive: true });
                    user = adminUsers[uidx];
                }
                currentAdmin = user;
                if (typeof syncAdminSessionClass === 'function') syncAdminSessionClass();
                saveSystemData();
                if (typeof startAdminPresenceHeartbeat === 'function') startAdminPresenceHeartbeat(user);
                if (typeof setAdminLoginStatus === 'function') setAdminLoginStatus(ui.adminLoginOk || 'تم تسجيل الدخول بنجاح.', 'ok');
                if (typeof showNebrasAdminToast === 'function') {
                    showNebrasAdminToast('مرحباً ' + user.username + ' — ' + getRoleLabel(user.role), 'ok');
                }
                closeAdminOverlay();
                showAdminDashboard(user);
                if (typeof scrollToAdminDashboard === 'function') scrollToAdminDashboard();
                setLanguage(currentLang || 'ar');
                addAuditLog('تسجيل دخول', 'دخول ناجح — ' + user.username + ' (' + getRoleLabel(user.role) + ')');
            } else {
                if (typeof setAdminLoginStatus === 'function') setAdminLoginStatus(ui.adminLoginFail || 'بيانات الدخول غير صحيحة. حاول مرة أخرى.', 'error');
                addAuditLog('محاولة دخول فاشلة', 'اسم مستخدم: ' + username);
            }
            if (loginBtn) loginBtn.disabled = false;
        }""",
    'loginAdmin async robust')

plat = sub(plat,
    '            enforceAdminDashboardGate();\n            initNebrasWelcomeAudioEarly();',
    '            enforceAdminDashboardGate();\n            if (typeof bindAdminLoginForm === "function") bindAdminLoginForm();\n            initNebrasWelcomeAudioEarly();',
    'bind login on DOMContentLoaded')

with open(PLATFORM_JS, 'w', encoding='utf-8') as f:
    f.write(plat)

LOGIN_CSS = """
/* Phase 23 — login status visibility */
.admin-modal--enterprise .admin-modal-body .status {
    min-height: 1.25em;
    margin-bottom: 10px;
    font-size: 0.88rem;
    font-weight: 600;
}
.admin-modal--enterprise .admin-modal-body .status--error { color: #fca5a5; }
.admin-modal--enterprise .admin-modal-body .status--ok { color: #6ee7b7; }
.admin-modal-actions button.primary:disabled { opacity: 0.65; cursor: wait; }
"""
if 'Phase 23 — login status' not in css:
    css += LOGIN_CSS
    with open(CSS37, 'w', encoding='utf-8') as f:
        f.write(css)
    print('OK: login status css')

print('Phase 23 login patch complete.')
