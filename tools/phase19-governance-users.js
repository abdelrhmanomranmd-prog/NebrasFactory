/* Phase 19 — High governance: user lifecycle, presence, audit, persistence */

    const ADMIN_PRESENCE_KEY = 'nebrasAdminPresence';
    const ADMIN_PRESENCE_ONLINE_MS = 3 * 60 * 1000;
    const AUDIT_LOG_MAX = 1000;
    let adminPresence = {};
    let adminPresenceTimer = null;

    function loadAdminPresenceLocal() {
        try {
            const raw = localStorage.getItem(ADMIN_PRESENCE_KEY);
            adminPresence = raw ? JSON.parse(raw) : {};
            if (!adminPresence || typeof adminPresence !== 'object') adminPresence = {};
        } catch (e) { adminPresence = {}; }
    }

    function saveAdminPresenceLocal() {
        try {
            localStorage.setItem(ADMIN_PRESENCE_KEY, JSON.stringify(adminPresence));
        } catch (e) { console.warn('admin presence save', e); }
    }

    function setAdminPresenceFromCloud(v) {
        adminPresence = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
        try { localStorage.setItem(ADMIN_PRESENCE_KEY, JSON.stringify(adminPresence)); } catch (e) { /* ignore */ }
    }

    function getAdminPresenceForCloud() {
        loadAdminPresenceLocal();
        return adminPresence;
    }

    function touchAdminPresence(user) {
        if (!user || !user.id) return;
        loadAdminPresenceLocal();
        const now = new Date().toISOString();
        adminPresence[user.id] = {
            userId: user.id,
            username: user.username,
            role: user.role,
            lastSeenAt: now,
            lastLoginAt: user.lastLoginAt || now
        };
        saveAdminPresenceLocal();
        const idx = adminUsers.findIndex(function(u) { return u.id === user.id; });
        if (idx >= 0) {
            adminUsers[idx] = Object.assign({}, adminUsers[idx], { lastSeenAt: now });
        }
    }

    function clearAdminPresence(user) {
        if (!user || !user.id) return;
        loadAdminPresenceLocal();
        delete adminPresence[user.id];
        saveAdminPresenceLocal();
    }

    function isUserOnline(user) {
        if (!user || !user.id) return false;
        loadAdminPresenceLocal();
        const p = adminPresence[user.id];
        if (!p || !p.lastSeenAt) return false;
        const t = new Date(p.lastSeenAt).getTime();
        return !isNaN(t) && (Date.now() - t) < ADMIN_PRESENCE_ONLINE_MS;
    }

    function formatUserLastSeen(user) {
        if (!user) return '—';
        if (isUserOnline(user)) return 'متصل الآن';
        const raw = user.lastSeenAt || (adminPresence[user.id] || {}).lastSeenAt;
        if (!raw) return 'لم يُسجَّل';
        return typeof formatNebrasDateTime === 'function' ? formatNebrasDateTime(raw, currentLang || 'ar') : String(raw);
    }

    function startAdminPresenceHeartbeat(user) {
        stopAdminPresenceHeartbeat();
        if (!user) return;
        touchAdminPresence(user);
        adminPresenceTimer = setInterval(function() {
            if (!currentAdmin) { stopAdminPresenceHeartbeat(); return; }
            touchAdminPresence(currentAdmin);
            saveAdminPresenceLocal();
            schedulePushToNebrasCloud();
        }, 60000);
    }

    function stopAdminPresenceHeartbeat() {
        if (adminPresenceTimer) {
            clearInterval(adminPresenceTimer);
            adminPresenceTimer = null;
        }
    }

    function persistAdminUserRecord(userId, patch) {
        const idx = adminUsers.findIndex(function(u) { return u.id === userId; });
        if (idx < 0) return;
        adminUsers[idx] = Object.assign({}, adminUsers[idx], patch, { updatedAt: new Date().toISOString() });
        saveSystemData();
    }

    function normalizeAdminUserRecord(user, index) {
        const role = user && allowedRoles.includes(String(user.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'manager';
        const isPrimary = user && (user.isPrimary === true || PRIMARY_GOVERNANCE_ADMIN_IDS.indexOf(user.id) >= 0 ||
            PRIMARY_GOVERNANCE_USERNAMES.indexOf(String(user.username || '').toUpperCase()) >= 0);
        let perms = Array.isArray(user && user.permissions) ? user.permissions.filter(Boolean) : null;
        if (role === 'sales_rep' && !isPrimary) perms = ['quotes'];
        const now = new Date().toISOString();
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
            isPrimary: !!isPrimary,
            isActive: user && user.isActive === false ? false : true,
            lastLoginAt: user && user.lastLoginAt ? user.lastLoginAt : '',
            lastSeenAt: user && user.lastSeenAt ? user.lastSeenAt : '',
            createdAt: user && user.createdAt ? user.createdAt : now,
            updatedAt: user && user.updatedAt ? user.updatedAt : now,
            createdBy: user && user.createdBy ? user.createdBy : ''
        };
    }

    function addAuditLogGoverned(action, details, actorUser) {
        const admin = actorUser || currentAdmin;
        const username = admin ? String(admin.username || '') : 'system';
        const role = admin ? String(admin.role || '') : '';
        const actor = admin ? (username + ' (' + role + ')') : 'system';
        const now = new Date();
        auditLogs.unshift({
            id: Date.now(),
            action: action,
            details: details,
            actor: actor,
            username: username,
            role: role,
            at: formatNebrasDateTime(now, 'ar'),
            atIso: now.toISOString()
        });
        if (auditLogs.length > AUDIT_LOG_MAX) auditLogs.length = AUDIT_LOG_MAX;
        saveSystemData();
        if (typeof displayAuditLog === 'function') displayAuditLog();
    }

    function renderGovernanceUsersStrip() {
        if (!isMainGovernanceAdmin(currentAdmin)) return '';
        const active = adminUsers.filter(function(u) { return u.isActive !== false; }).length;
        const inactive = adminUsers.length - active;
        const online = adminUsers.filter(function(u) { return isUserOnline(u); }).length;
        return '<div class="gov-users-strip">' +
            '<div class="gov-users-strip-stat"><strong>' + adminUsers.length + '</strong><span>مستخدمون</span></div>' +
            '<div class="gov-users-strip-stat gov-users-strip-stat--ok"><strong>' + active + '</strong><span>نشطون</span></div>' +
            '<div class="gov-users-strip-stat gov-users-strip-stat--warn"><strong>' + inactive + '</strong><span>معطّلون</span></div>' +
            '<div class="gov-users-strip-stat gov-users-strip-stat--live"><strong>' + online + '</strong><span>متصلون الآن</span></div>' +
            '<button type="button" class="gov-users-strip-btn" onclick="openUserManagement()"><i class="fas fa-users-cog"></i> إدارة المستخدمين</button>' +
        '</div>';
    }

    function renderRoleSpecializationBanner(user) {
        user = user || currentAdmin;
        if (!user) return '';
        const def = getRoleDefinition(user.isPrimary ? 'superadmin' : user.role) || {};
        const perms = getUserEffectivePermissions(user);
        const permLabels = user.isPrimary
            ? 'كل صلاحيات المنصة — الإدارة الرئيسية'
            : (perms.map(function(k) { return NEBRAS_PERMISSION_LABELS[k] || k; }).join(' · ') || 'بدون صلاحيات');
        const scope = user.assignedBranchCity
            ? 'فرع: ' + user.assignedBranchCity
            : (user.hrScopeDepartmentKey && typeof getHrFactoryDepts === 'function'
                ? 'قسم HR: ' + (getHrFactoryDepts()[user.hrScopeDepartmentKey] || user.hrScopeDepartmentKey)
                : 'نطاق المنصة حسب دورك');
        return '<div class="gov-role-specialization" style="--role-accent:' + (def.accent || '#0a4d8c') + '">' +
            '<i class="' + (def.icon || 'fas fa-user-shield') + '"></i>' +
            '<div><strong>' + escapeHtmlAttr(user.username) + ' — ' + escapeHtmlAttr(def.labelAr || user.role) + '</strong>' +
            '<span>اختصاصك: ' + escapeHtmlAttr(permLabels) + '</span>' +
            '<small>' + escapeHtmlAttr(scope) + '</small></div></div>';
    }

    function renderUserStatsGoverned() {
        const host = document.getElementById('nebras-users-stats');
        if (!host) return;
        const total = adminUsers.length;
        const primary = adminUsers.filter(function(u) { return u.isPrimary; }).length;
        const active = adminUsers.filter(function(u) { return u.isActive !== false; }).length;
        const inactive = total - active;
        const online = adminUsers.filter(function(u) { return isUserOnline(u); }).length;
        const branchScoped = adminUsers.filter(function(u) { return !u.isPrimary && String(u.assignedBranchCity || '').trim(); }).length;
        const stats = [
            { icon: 'fas fa-users', label: 'إجمالي المستخدمين', val: total },
            { icon: 'fas fa-circle-check', label: 'نشطون', val: active, cls: 'nebras-users-stat--ok' },
            { icon: 'fas fa-ban', label: 'معطّلون', val: inactive, cls: inactive ? 'nebras-users-stat--warn' : '' },
            { icon: 'fas fa-signal', label: 'متصلون الآن', val: online, cls: 'nebras-users-stat--live' },
            { icon: 'fas fa-crown', label: 'إدارة رئيسية', val: primary },
            { icon: 'fas fa-store', label: 'مخصّصون لفروع', val: branchScoped }
        ];
        host.innerHTML = stats.map(function(s) {
            return '<div class="nebras-users-stat ' + (s.cls || '') + '"><i class="' + s.icon + '"></i><strong>' + s.val + '</strong><span>' + s.label + '</span></div>';
        }).join('') +
        '<div class="gov-users-presence-table-wrap"><table class="gov-users-presence-table"><thead><tr>' +
            '<th>المستخدم</th><th>الدور</th><th>الحالة</th><th>الاتصال</th><th>آخر دخول</th>' +
        '</tr></thead><tbody>' +
        adminUsers.map(function(u) {
            const def = getRoleDefinition(u.isPrimary ? 'superadmin' : u.role) || {};
            const status = u.isActive === false
                ? '<span class="gov-user-badge gov-user-badge--off">معطّل</span>'
                : '<span class="gov-user-badge gov-user-badge--on">نشط</span>';
            const online = isUserOnline(u)
                ? '<span class="gov-user-badge gov-user-badge--live"><i class="fas fa-circle"></i> متصل</span>'
                : '<span class="gov-user-badge gov-user-badge--away">غير متصل</span>';
            const lastLogin = u.lastLoginAt
                ? (typeof formatNebrasDateTime === 'function' ? formatNebrasDateTime(u.lastLoginAt, currentLang || 'ar') : u.lastLoginAt)
                : '—';
            return '<tr><td><strong>' + escapeHtmlAttr(u.username) + '</strong></td>' +
                '<td>' + escapeHtmlAttr(def.labelAr || u.role) + '</td>' +
                '<td>' + status + '</td><td>' + online + '</td><td>' + escapeHtmlAttr(lastLogin) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    function displayUsersGoverned() {
        const list = document.getElementById('users-list');
        renderUserStatsGoverned();
        if (!list) return;
        if (!adminUsers.length) {
            list.innerHTML = '<p class="nebras-users-empty">لا يوجد مستخدمون بعد — أضيفي أول مستخدم لفريق العمل.</p>';
            return;
        }
        const isGov = isMainGovernanceAdmin();
        list.innerHTML = adminUsers.map(function(user, index) {
            const def = getRoleDefinition(user.isPrimary ? 'superadmin' : user.role) || {};
            const accent = def.accent || '#0a4d8c';
            const perms = getUserEffectivePermissions(user);
            const permChips = user.isPrimary
                ? '<span class="nebras-user-chip nebras-user-chip--all"><i class="fas fa-infinity"></i> كل الصلاحيات</span>'
                : (perms.length
                    ? perms.map(function(k) {
                        const meta = NEBRAS_PERMISSION_META[k] || {};
                        return '<span class="nebras-user-chip"><i class="' + (meta.icon || 'fas fa-check') + '"></i> ' + (NEBRAS_PERMISSION_LABELS[k] || k) + '</span>';
                      }).join('')
                    : '<span class="nebras-user-chip nebras-user-chip--none">بدون صلاحيات</span>');
            const branchTag = String(user.assignedBranchCity || '').trim()
                ? '<span class="nebras-user-branch"><i class="fas fa-store"></i> فرع ' + escapeHtmlAttr(user.assignedBranchCity) + '</span>'
                : '<span class="nebras-user-branch nebras-user-branch--all"><i class="fas fa-globe"></i> كل الفروع</span>';
            const statusRow = '<div class="nebras-user-status-row">' +
                (user.isActive === false
                    ? '<span class="gov-user-badge gov-user-badge--off"><i class="fas fa-ban"></i> معطّل</span>'
                    : '<span class="gov-user-badge gov-user-badge--on"><i class="fas fa-check"></i> نشط</span>') +
                (isUserOnline(user)
                    ? '<span class="gov-user-badge gov-user-badge--live"><i class="fas fa-circle"></i> متصل</span>'
                    : '<span class="gov-user-badge gov-user-badge--away">آخر ظهور: ' + escapeHtmlAttr(formatUserLastSeen(user)) + '</span>') +
            '</div>';
            let actions = '<button class="nebras-user-act" onclick="editUser(' + index + ')"><i class="fas fa-pen"></i> تعديل</button>';
            if (!user.isPrimary && isGov) {
                actions += '<button class="nebras-user-act" onclick="adminResetUserPassword(' + index + ')"><i class="fas fa-key"></i> كلمة المرور</button>';
                actions += '<button class="nebras-user-act" onclick="toggleUserActive(' + index + ')"><i class="fas fa-power-off"></i> ' +
                    (user.isActive === false ? 'تفعيل' : 'تعطيل') + '</button>';
                actions += '<button class="nebras-user-act" onclick="recreateUserInSameRole(' + index + ')"><i class="fas fa-clone"></i> مستخدم جديد بنفس القسم</button>';
                actions += '<button class="nebras-user-act nebras-user-act--danger" onclick="deleteUser(' + index + ')"><i class="fas fa-trash"></i> حذف</button>';
            }
            const inactiveCls = user.isActive === false ? ' nebras-user-card--inactive' : '';
            return '<article class="nebras-user-card' + inactiveCls + '" style="--role-accent:' + accent + '">' +
                '<header class="nebras-user-card-head">' +
                    '<span class="nebras-user-avatar"><i class="' + (def.icon || 'fas fa-user') + '"></i></span>' +
                    '<div class="nebras-user-id"><strong>' + escapeHtmlAttr(user.username || '') + '</strong><span>' + escapeHtmlAttr(user.id || '') + '</span></div>' +
                    (user.isPrimary ? '<span class="nebras-user-primary"><i class="fas fa-crown"></i> رئيسي</span>' : '') +
                '</header>' +
                statusRow +
                '<div class="nebras-user-role"><i class="' + (def.icon || 'fas fa-user') + '"></i> ' + escapeHtmlAttr(def.labelAr || user.role || '') + '</div>' +
                branchTag +
                '<div class="nebras-user-perms">' + permChips + '</div>' +
                '<footer class="nebras-user-card-foot">' + actions + '</footer>' +
            '</article>';
        }).join('');
    }

    function toggleUserActive(index) {
        if (!requirePermission('users')) return;
        if (!isMainGovernanceAdmin()) { alert('تعطيل/تفعيل المستخدمين — الإدارة الرئيسية فقط.'); return; }
        const user = adminUsers[index];
        if (!user || user.isPrimary) return;
        const next = user.isActive === false;
        adminUsers[index] = Object.assign({}, user, { isActive: next, updatedAt: new Date().toISOString() });
        if (!next) clearAdminPresence(user);
        saveSystemData();
        addAuditLogGoverned(next ? 'تفعيل مستخدم' : 'تعطيل مستخدم', user.username + ' — ' + getRoleLabel(user.role));
        displayUsersGoverned();
    }

    function adminResetUserPassword(index) {
        if (!requirePermission('users')) return;
        if (!isMainGovernanceAdmin()) { alert('إعادة تعيين كلمة المرور — الإدارة الرئيسية فقط.'); return; }
        const user = adminUsers[index];
        if (!user || user.isPrimary) return;
        const pwd = prompt('كلمة المرور الجديدة للمستخدم «' + user.username + '»:');
        if (pwd === null) return;
        if (!String(pwd).trim()) { alert('كلمة المرور لا يمكن أن تكون فارغة.'); return; }
        adminUsers[index] = Object.assign({}, user, { password: String(pwd).trim(), updatedAt: new Date().toISOString() });
        saveSystemData();
        addAuditLogGoverned('إعادة تعيين كلمة مرور', 'بواسطة الإدارة الرئيسية — ' + user.username);
        alert('تم تحديث كلمة المرور — يُحفظ في النظام والسحابة فوراً.');
        displayUsersGoverned();
    }

    function recreateUserInSameRole(index) {
        if (!requirePermission('users')) return;
        if (!isMainGovernanceAdmin()) { alert('إنشاء مستخدم بنفس القسم — الإدارة الرئيسية فقط.'); return; }
        const source = adminUsers[index];
        if (!source || source.isPrimary) return;
        nebrasUserEditorState = {
            index: -1,
            isEdit: false,
            isPrimary: false,
            id: 'EMP-' + Date.now(),
            username: '',
            password: '',
            role: source.role,
            assignedBranchCity: source.assignedBranchCity || '',
            hrScopeBranchId: source.hrScopeBranchId || '',
            hrScopeDepartmentKey: source.hrScopeDepartmentKey || '',
            permissions: (rolePermissions[source.role] || []).slice()
        };
        renderUserEditorForm();
        const editor = document.getElementById('nebras-user-editor');
        if (editor) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        addAuditLogGoverned('قالب مستخدم جديد', 'نفس دور ' + source.username + ' — ' + getRoleLabel(source.role));
    }
