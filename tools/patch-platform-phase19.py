#!/usr/bin/env python3
"""Phase 19: High user governance — active/online, password reset, audit, persistence."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATFORM_JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
CSS_FILE = os.path.join(ROOT, 'css', '27-governance-users.css')
INDEX_HTML = os.path.join(ROOT, 'index.html')
INJECT = os.path.join(ROOT, 'tools', 'phase19-governance-users.js')

with open(PLATFORM_JS, encoding='utf-8') as f:
    plat = f.read()
with open(INJECT, encoding='utf-8') as f:
    p19 = f.read()
with open(CSS_FILE, encoding='utf-8') as f:
    css = f.read()
with open(INDEX_HTML, encoding='utf-8') as f:
    html = f.read()

MARKER = '/* PHASE19_INJECTED */'


def sub(text, old, new, label):
    if old not in text:
        print(f'MISSING [{label}]')
        sys.exit(1)
    print(f'OK: {label}')
    return text.replace(old, new, 1)


if MARKER in plat:
    start = plat.index(MARKER)
    end = plat.index('        function openCustomerComplaints()', start)
    plat = plat[:start] + plat[end:]

plat = sub(plat,
    '        function openCustomerComplaints() {',
    MARKER + '\n' + p19 + '\n        function openCustomerComplaints() {',
    'inject phase19')

# Remove duplicate normalizeAdminUserRecord from phase18 (phase19 replaces it)
OLD_NORM = """    function normalizeAdminUserRecord(user, index) {
        const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
        const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
            PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
        let perms = Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null;
        if (role === 'sales_rep' && !isPrimary) perms = ['quotes'];
        return {
            id: user && user.id ? user.id : 'user-' + Date.now() + '-' + index,
            username: user && user.username ? user.username : 'user' + (index + 1),
            password: user && user.password ? user.password : 'ChangeMe123',
            role: role,
            permissions: perms,
            assignedBranchCity: (user && user.assignedBranchCity) ? String(user.assignedBranchCity).trim() : '',
            assignedBranchId: user && user.assignedBranchId != null && user.assignedBranchId !== '' ? user.assignedBranchId : null,
            hrScopeBranchId: user && user.hrScopeBranchId ? String(user.hrScopeBranchId).trim() : '',
            hrScopeDepartmentKey: user && user.hrScopeDepartmentKey ? String(user.hrScopeDepartmentKey).trim() : '',
            isPrimary: !!isPrimary
        };
    }

"""
if OLD_NORM in plat:
    plat = plat.replace(OLD_NORM, '', 1)
    print('OK: remove phase18 normalizeAdminUserRecord duplicate')

# Wire addAuditLog to governed version
plat = sub(plat,
    """        function addAuditLog(action, details) {
            const actor = currentAdmin ? `${currentAdmin.username} (${currentAdmin.role})` : 'system';
            auditLogs.unshift({
                id: Date.now(),
                action,
                details,
                actor,
                at: formatNebrasDateTime(new Date(), 'ar')
            });
            if (auditLogs.length > 200) {
                auditLogs = auditLogs.slice(0, 200);
            }
            saveSystemData();
            displayAuditLog();
        }""",
    """        function addAuditLog(action, details, actorUser) {
            if (typeof addAuditLogGoverned === 'function') {
                addAuditLogGoverned(action, details, actorUser);
                return;
            }
            const actor = currentAdmin ? (currentAdmin.username + ' (' + currentAdmin.role + ')') : 'system';
            auditLogs.unshift({ id: Date.now(), action: action, details: details, actor: actor, at: formatNebrasDateTime(new Date(), 'ar') });
            saveSystemData();
            if (typeof displayAuditLog === 'function') displayAuditLog();
        }""",
    'addAuditLog governed')

# Login — active check, lastLogin, failed audit, presence
plat = sub(plat,
    """            if (user) {
                if (isMainGovernanceAdmin(user)) {
                    user.isPrimary = true;
                    user.role = 'superadmin';
                    user.permissions = null;
                }
                currentAdmin = user;
                status.textContent = ui.adminLoginOk || 'تم تسجيل الدخول بنجاح.';
                closeAdminOverlay();
                showAdminDashboard(user);
                setLanguage(currentLang || 'ar');
                addAuditLog('تسجيل دخول', `دخول ناجح بواسطة ${user.username}`);
            } else {
                status.textContent = ui.adminLoginFail || 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
            }""",
    """            if (user) {
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
                closeAdminOverlay();
                showAdminDashboard(user);
                setLanguage(currentLang || 'ar');
                addAuditLog('تسجيل دخول', 'دخول ناجح — ' + user.username + ' (' + getRoleLabel(user.role) + ')');
            } else {
                status.textContent = ui.adminLoginFail || 'بيانات الدخول غير صحيحة. حاول مرة أخرى.';
                addAuditLog('محاولة دخول فاشلة', 'اسم مستخدم: ' + username);
            }""",
    'login governance')

# Logout presence
plat = sub(plat,
    """        function logoutAdmin() {
            if (currentAdmin) {
                addAuditLog('تسجيل خروج', `خروج المستخدم ${currentAdmin.username}`);
            }
            if (dashboardClockTimer) {""",
    """        function logoutAdmin() {
            if (currentAdmin) {
                if (typeof clearAdminPresence === 'function') clearAdminPresence(currentAdmin);
                if (typeof stopAdminPresenceHeartbeat === 'function') stopAdminPresenceHeartbeat();
                addAuditLog('تسجيل خروج', 'خروج — ' + currentAdmin.username);
                saveSystemData();
            }
            if (dashboardClockTimer) {""",
    'logout presence')

# showAdminDashboard — load presence
plat = sub(plat,
    """        function showAdminDashboard(user) {
            document.getElementById('admin-dashboard').classList.add('show');
            ensureDashboardGovernanceHandlers();""",
    """        function showAdminDashboard(user) {
            if (typeof loadAdminPresenceLocal === 'function') loadAdminPresenceLocal();
            document.getElementById('admin-dashboard').classList.add('show');
            ensureDashboardGovernanceHandlers();""",
    'showAdminDashboard presence')

# renderDashboardCommandShell — role specialization + gov strip
plat = sub(plat,
    """            const clock = document.getElementById('dashboard-command-clock');
            if (clock) clock.textContent = formatDashboardClockNow();""",
    """            const clock = document.getElementById('dashboard-command-clock');
            if (clock) clock.textContent = formatDashboardClockNow();

            const specHost = document.getElementById('dashboard-role-specialization');
            if (specHost && typeof renderRoleSpecializationBanner === 'function') {
                specHost.innerHTML = renderRoleSpecializationBanner(user);
            }
            const govStrip = document.getElementById('dashboard-gov-users-strip');
            if (govStrip && typeof renderGovernanceUsersStrip === 'function') {
                govStrip.innerHTML = isMainGovernanceAdmin(user) ? renderGovernanceUsersStrip() : '';
                govStrip.hidden = !isMainGovernanceAdmin(user);
            }""",
    'dashboard specialization strip')

# displayUsers / renderUserStats
plat = sub(plat,
    '        function renderUserStats() {\n            const host = document.getElementById(\'nebras-users-stats\');',
    '        function renderUserStats() {\n            if (typeof renderUserStatsGoverned === \'function\') { renderUserStatsGoverned(); return; }\n            const host = document.getElementById(\'nebras-users-stats\');',
    'renderUserStats governed')

plat = sub(plat,
    '        function displayUsers() {\n            const list = document.getElementById(\'users-list\');\n            renderUserStats();',
    '        function displayUsers() {\n            if (typeof displayUsersGoverned === \'function\') { displayUsersGoverned(); return; }\n            const list = document.getElementById(\'users-list\');\n            renderUserStats();',
    'displayUsers governed')

# saveUserFromEditor — isActive, timestamps, createdBy
plat = sub(plat,
    """                adminUsers[st.index] = Object.assign({}, existing, {
                    id: st.isPrimary ? existing.id : id,
                    username: username,
                    password: password,
                    role: st.isPrimary ? 'superadmin' : st.role,
                    permissions: st.isPrimary ? null : st.permissions.slice(),
                    assignedBranchCity: st.isPrimary ? '' : st.assignedBranchCity,
                    hrScopeBranchId: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeBranchId || ''),
                    hrScopeDepartmentKey: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeDepartmentKey || ''),
                    isPrimary: !!st.isPrimary
                });""",
    """                adminUsers[st.index] = Object.assign({}, existing, {
                    id: st.isPrimary ? existing.id : id,
                    username: username,
                    password: password,
                    role: st.isPrimary ? 'superadmin' : st.role,
                    permissions: st.isPrimary ? null : st.permissions.slice(),
                    assignedBranchCity: st.isPrimary ? '' : st.assignedBranchCity,
                    hrScopeBranchId: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeBranchId || ''),
                    hrScopeDepartmentKey: st.isPrimary || st.role !== 'hr' ? '' : (st.hrScopeDepartmentKey || ''),
                    isPrimary: !!st.isPrimary,
                    isActive: existing.isActive !== false,
                    updatedAt: new Date().toISOString()
                });""",
    'save user edit metadata')

plat = sub(plat,
    """                adminUsers.push({
                    id: id, username: username, password: password,
                    role: st.role, permissions: st.permissions.slice(),
                    assignedBranchCity: st.assignedBranchCity,
                    hrScopeBranchId: st.role === 'hr' ? (st.hrScopeBranchId || '') : '',
                    hrScopeDepartmentKey: st.role === 'hr' ? (st.hrScopeDepartmentKey || '') : '',
                    isPrimary: false
                });""",
    """                const nowIso = new Date().toISOString();
                adminUsers.push({
                    id: id, username: username, password: password,
                    role: st.role, permissions: st.permissions.slice(),
                    assignedBranchCity: st.assignedBranchCity,
                    hrScopeBranchId: st.role === 'hr' ? (st.hrScopeBranchId || '') : '',
                    hrScopeDepartmentKey: st.role === 'hr' ? (st.hrScopeDepartmentKey || '') : '',
                    isPrimary: false, isActive: true,
                    createdAt: nowIso, updatedAt: nowIso,
                    createdBy: currentAdmin ? currentAdmin.username : ''
                });""",
    'save user create metadata')

# Remove dead prompt editUser block
DEAD_EDIT = """        function editUser(index) {
            if (!requirePermission('users', 'هذه العملية متاحة فقط لمسؤولي المستخدمين.')) return;
            const user = adminUsers[index];
            if (!user) return;
            if (user.isPrimary && !isMainGovernanceAdmin()) {
                alert('تعديل حساب الإدارة الرئيسية — للإدارة الرئيسية فقط.');
                return;
            }
            const newId = user.isPrimary ? user.id : prompt('معرف الموظف (ID):', user.id || '');
            if (newId === null) return;
            const username = prompt('تعديل اسم المستخدم:', user.username);
            let password = user.password;
            if (user.isPrimary) {
                password = user.password;
                alert('كلمة مرور الإدارة الرئيسية لا تُعدَّل من هنا.');
            } else {
                const pwdPrompt = prompt('تعديل كلمة المرور:', user.password);
                if (pwdPrompt === null) return;
                password = pwdPrompt.trim();
            }
            let normalizedRole = user.role;
            let permissions = user.permissions;
            if (!user.isPrimary) {
                const role = prompt('تعديل الدور (manager/hr):', user.role);
                if (role === null) return;
                normalizedRole = role.trim().toLowerCase();
                if (normalizedRole === 'superadmin') {
                    alert('لا Super Admin فرعي — استخدم manager مع صلاحيات مخصصة.');
                    return;
                }
                if (!allowedRoles.includes(normalizedRole)) {
                    alert('الدور غير صحيح. manager / hr');
                    return;
                }
                const permHelp = Object.keys(NEBRAS_PERMISSION_LABELS).join(', ');
                const permsRaw = prompt('صلاحيات مخصصة:\\n' + permHelp, (user.permissions || rolePermissions[normalizedRole] || []).join(','));
                if (permsRaw === null) return;
                permissions = parseAdminPermissionsInput(permsRaw, normalizedRole);
            }
            let assignedBranchCity = user.assignedBranchCity || '';
            if (!user.isPrimary) {
                const branchPrompt = prompt('مدينة/فرع التخصيص (فارغ = وصول كامل):', assignedBranchCity);
                if (branchPrompt === null) return;
                assignedBranchCity = String(branchPrompt || '').trim();
            }
            if (username && password) {
                const idVal = user.isPrimary ? user.id : String(newId).trim();
                adminUsers[index] = Object.assign({}, user, {
                    id: idVal,
                    username: username.trim(),
                    password: password,
                    role: user.isPrimary ? 'superadmin' : normalizedRole,
                    permissions: user.isPrimary ? null : permissions,
                    assignedBranchCity: user.isPrimary ? '' : assignedBranchCity,
                    isPrimary: !!user.isPrimary
                });
                saveSystemData();
                displayUsers();
                addAuditLog('تعديل مستخدم', 'تم تعديل المستخدم ' + username);
            }
        }

"""
if DEAD_EDIT in plat:
    plat = plat.replace(DEAD_EDIT, '', 1)
    print('OK: remove dead editUser prompts')

# Cloud admin_presence
if 'admin_presence' not in plat:
    plat = sub(plat,
        """            { key: 'quote_registry', get: function() {
                return typeof loadQuoteRegistryForCloud === 'function' ? loadQuoteRegistryForCloud() : { byDate: {} };
            }, set: function(v) {
                if (typeof setQuoteRegistryFromCloud === 'function') setQuoteRegistryFromCloud(v);
            }},""",
        """            { key: 'quote_registry', get: function() {
                return typeof loadQuoteRegistryForCloud === 'function' ? loadQuoteRegistryForCloud() : { byDate: {} };
            }, set: function(v) {
                if (typeof setQuoteRegistryFromCloud === 'function') setQuoteRegistryFromCloud(v);
            }},
            { key: 'admin_presence', get: function() {
                return typeof getAdminPresenceForCloud === 'function' ? getAdminPresenceForCloud() : {};
            }, set: function(v) {
                if (typeof setAdminPresenceFromCloud === 'function') setAdminPresenceFromCloud(v);
            }},""",
        'cloud admin_presence')

# saveSystemData — persist presence local
plat = sub(plat,
    '            if (typeof persistAnalyticsGovernanceLocal === \'function\') persistAnalyticsGovernanceLocal();',
    '            if (typeof persistAnalyticsGovernanceLocal === \'function\') persistAnalyticsGovernanceLocal();\n            if (typeof saveAdminPresenceLocal === \'function\') saveAdminPresenceLocal();',
    'save presence local')

plat = sub(plat,
    '            if (typeof loadAnalyticsGovernanceLocal === \'function\') loadAnalyticsGovernanceLocal();',
    '            if (typeof loadAnalyticsGovernanceLocal === \'function\') loadAnalyticsGovernanceLocal();\n            if (typeof loadAdminPresenceLocal === \'function\') loadAdminPresenceLocal();',
    'load presence local')

# Window exports
EXPORTS = """
        window.toggleUserActive = toggleUserActive;
        window.adminResetUserPassword = adminResetUserPassword;
        window.recreateUserInSameRole = recreateUserInSameRole;
        window.displayUsersGoverned = displayUsersGoverned;
"""

if 'window.toggleUserActive' not in plat:
    plat = sub(plat,
        '        window.normalizeAdminUserRecord = normalizeAdminUserRecord;',
        '        window.normalizeAdminUserRecord = normalizeAdminUserRecord;' + EXPORTS,
        'exports phase19')

with open(PLATFORM_JS, 'w', encoding='utf-8', newline='\n') as f:
    f.write(plat)

# index — dashboard governance hosts
if 'dashboard-role-specialization' not in html:
    html = sub(html,
        '            <div class="dashboard-quick-actions" id="dashboard-quick-actions"></div>',
        '            <div id="dashboard-role-specialization" class="dashboard-role-specialization"></div>\n            <div id="dashboard-gov-users-strip" class="dashboard-gov-users-strip" hidden></div>\n            <div class="dashboard-quick-actions" id="dashboard-quick-actions"></div>',
        'index dashboard gov hosts')
    with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

# user management subtitle
if 'متصلون الآن' not in html:
    html = sub(html,
        '                        <p class="nebras-users-sub">حوكمة كاملة — الإدارة الرئيسية تنشئ فريق العمل وتحدد دور وصلاحية كل مستخدم (مبيعات · محاسبة · مخزون · إنتاج · مستودع · فروع · مندوبون).</p>',
        '                        <p class="nebras-users-sub">حوكمة عالية — كل مستخدم باسم مستخدم وكلمة سر · نشط/معطّل · متصلون الآن · إعادة تعيين كلمة المرور · حذف وإعادة إنشاء لنفس القسم. كل تعديل يُحفظ فوراً محلياً وفي Supabase مع سجل تدقيق باسم المنفّذ.</p>',
        'index users subtitle')
    with open(INDEX_HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)

# CSS
if '.gov-user-badge' not in css:
    css += """

/* Phase 19 — User governance */
.gov-user-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
}
.gov-user-badge--on { background: #e8f8ef; color: #1e7e45; }
.gov-user-badge--off { background: #fdecea; color: #c0392b; }
.gov-user-badge--live { background: #e3f2fd; color: #1565c0; }
.gov-user-badge--live i { font-size: 0.5rem; animation: gov-pulse 1.2s infinite; }
.gov-user-badge--away { background: #f4f6f8; color: #6a7888; }
@keyframes gov-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.nebras-user-card--inactive { opacity: 0.72; border-style: dashed; }
.nebras-user-status-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }

.nebras-users-stat--ok strong { color: #1e7e45; }
.nebras-users-stat--warn strong { color: #c0392b; }
.nebras-users-stat--live strong { color: #1565c0; }

.gov-users-presence-table-wrap {
    grid-column: 1 / -1;
    margin-top: 12px;
    overflow-x: auto;
    border: 1px solid var(--nu-line, #e2e8f0);
    border-radius: 12px;
    background: #fff;
}
.gov-users-presence-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
}
.gov-users-presence-table th,
.gov-users-presence-table td {
    padding: 10px 12px;
    text-align: right;
    border-bottom: 1px solid #eef2f6;
}
.gov-users-presence-table th { background: #f8fafc; color: #1a5276; }

.gov-users-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin: 10px 0 14px;
    border-radius: 12px;
    border: 1px solid #d4e4f7;
    background: linear-gradient(135deg, #f0f7ff 0%, #fff 100%);
}
.gov-users-strip-stat strong { display: block; font-size: 1.2rem; color: #1a5276; }
.gov-users-strip-stat span { font-size: 0.75rem; color: #5a6b7a; }
.gov-users-strip-stat--ok strong { color: #1e7e45; }
.gov-users-strip-stat--warn strong { color: #c0392b; }
.gov-users-strip-stat--live strong { color: #1565c0; }
.gov-users-strip-btn {
    margin-right: auto;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #2980b9;
    background: #2980b9;
    color: #fff;
    cursor: pointer;
    font-size: 0.82rem;
}

.dashboard-role-specialization { margin: 0 0 10px; }
.gov-role-specialization {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    border-right: 4px solid var(--role-accent, #0a4d8c);
    background: #fff;
}
.gov-role-specialization > i { font-size: 1.4rem; color: var(--role-accent); margin-top: 2px; }
.gov-role-specialization strong { display: block; color: #1a365d; }
.gov-role-specialization span { font-size: 0.85rem; color: #4a5568; }
.gov-role-specialization small { display: block; font-size: 0.78rem; color: #718096; margin-top: 4px; }
"""
    with open(CSS_FILE, 'w', encoding='utf-8', newline='\n') as f:
        f.write(css)
    print('OK: css governance users')

# Fix typo in phase19 inject file
with open(INJECT, encoding='utf-8') as f:
    inj = f.read()
inj = inj.replace('hrScopeBranchKey', 'hrScopeBranchId')
with open(INJECT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(inj)

# supabase key seed
sb_path = os.path.join(ROOT, 'supabase', '008-phase17-18-cloud-keys.sql')
with open(sb_path, encoding='utf-8') as f:
    sb = f.read()
if 'admin_presence' not in sb:
    sb = sb.replace(
        "  ('quote_registry', '{\"byDate\":{}}'::jsonb)\n",
        "  ('quote_registry', '{\"byDate\":{}}'::jsonb),\n  ('admin_presence', '{}'::jsonb)\n"
    )
    with open(sb_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(sb)
    print('OK: sql admin_presence')

# push-supabase script
push_path = os.path.join(ROOT, 'tools', 'push-supabase-cloud-keys.py')
with open(push_path, encoding='utf-8') as f:
    push = f.read()
if "'admin_presence'" not in push:
    push = push.replace("'callback_leads': [],", "'callback_leads': [],\n    'admin_presence': {},")
    with open(push_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(push)
    print('OK: push script admin_presence')

print('PHASE19 PATCH COMPLETE')
