/**
 * نبراس — مركز الإمبراطورية
 * الواجهة الخارجية · ERP · HR · Legal · فروع · شركاء · حوكمة كل قسم
 */
(function(global) {
    'use strict';

    const EMPIRE_VERSION = '2.1';
    const EMPIRE_CODENAME = 'NebrasEmpire';

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function canViewEmpireHub() {
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
        if (typeof canManage === 'function' && (canManage('erp') || canManage('hr') || canManage('legal') || canManage('accounting') || canManage('customerService') || canManage('audit'))) return true;
        return false;
    }

    function getEmpireExternalModules() {
        return [
            { id: 'site', icon: 'fas fa-globe', label: 'الموقع الرسمي', desc: 'واجهة الزوار — السعودية · العرب · العالم', handler: null, url: 'https://www.nebrasplasticcompany.com' },
            { id: 'showroom', icon: 'fas fa-images', label: 'معرض نبراس', desc: 'أبواب WPC · خزائن · CNC · مشاريع NHC', handler: 'openShowroomHub', perm: 'content' },
            { id: 'profile', icon: 'fas fa-book-open', label: 'البروفايل التعريفي', desc: '24 صفحة — دليل الشركة للعملاء', handler: 'openCompanyProfileHub', perm: 'content' },
            { id: 'store', icon: 'fas fa-store', label: 'المتجر والكتالوج', desc: 'منتجات · أسعار · أضف للسلة', handler: 'openSiteContentManager', perm: 'content' },
            { id: 'callback', icon: 'fas fa-phone-volume', label: 'نبراس يتصل بك', desc: 'Leads من الزوار → الإدارة والفروع', handler: 'openCallbackLeadsAdmin', perm: 'sales' },
            { id: 'certs', icon: 'fas fa-award', label: 'الاعتمادات', desc: 'شهادات وثقة للسوق', handler: 'openCertificationsHub', perm: 'content' }
        ];
    }

    function getEmpireInternalPlatforms() {
        return [
            { id: 'erp', icon: 'fas fa-cubes', label: 'Nebras ERP', desc: 'مخزون · إنتاج · مبيعات · طلبات · محاسبة', handler: 'scrollErpHub', perm: 'erp', color: '#0a4d8c' },
            { id: 'hr', icon: 'fas fa-people-roof', label: 'نبراس HCM', desc: 'موظفون · رواتب · سعودة · أسطول · GPS · شركات شريكة', handler: 'openHrPlatform', perm: 'hr', color: '#2980b9' },
            { id: 'legal', icon: 'fas fa-scale-balanced', label: 'نبراس Legal', desc: 'عقود · قضايا · امتثال · PDPL · شراكات', handler: 'openLegalPlatform', perm: 'legal', color: '#6c3483' },
            { id: 'crm', icon: 'fas fa-handshake', label: 'نبراس CRM', desc: 'عملاء · Pipeline · فرص · Leads', handler: 'openCrmPlatform', perm: 'customerService', color: '#1a6fa8' },
            { id: 'accounting', icon: 'fas fa-calculator', label: 'نبراس Accounting', desc: 'حسابات · تحويلات · مبيعات · PDF', handler: 'openAccountingPlatform', perm: 'accounting', color: '#8e44ad' },
            { id: 'users', icon: 'fas fa-users-cog', label: 'المستخدمون والصلاحيات', desc: 'كل قسم · كل فرع · RBAC', handler: 'openUserManagement', perm: 'users', color: '#2c3e50' },
            { id: 'branches', icon: 'fas fa-map-marked-alt', label: 'شبكة الفروع', desc: 'المقر + فروع المملكة', handler: 'openBranchesManagement', perm: 'branches', color: '#16a085' },
            { id: 'analytics', icon: 'fas fa-chart-pie', label: 'ذكاء الأعمال BI', desc: 'تحليلات · تقارير تنفيذية', handler: 'openExecutiveReports', perm: 'audit', color: '#8e44ad' },
            { id: 'cloud', icon: 'fas fa-cloud', label: 'السحابة والمزامنة', desc: 'Supabase — كل مخازن الإمبراطورية', handler: 'openCloudGovernance', perm: 'users', color: '#1a6fa8' },
            { id: 'data-warehouse', icon: 'fas fa-database', label: 'مستودع البيانات', desc: 'Excel · PDF · JSON — كل التخزين الديناميكي', handler: 'openNebrasDataWarehouse', perm: 'audit', color: '#155e94' },
            { id: 'empire-bridges', icon: 'fas fa-link', label: 'جسور الإمبراطورية', desc: 'Odoo-like — متجر · CRM · مسار نبراس · HR', handler: 'openNebrasEmpireBridges', perm: 'erp', color: '#16a085' },
            { id: 'audit', icon: 'fas fa-clipboard-check', label: 'سجل العمليات', desc: 'تدقيق كل إجراء إداري', handler: 'openAuditLog', perm: 'audit', color: '#c0392b' }
        ];
    }

    function getEmpireDeptWorkspaces() {
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const role = admin ? admin.role : '';
        const all = [
            { roles: ['superadmin', 'manager'], icon: 'fas fa-crown', label: 'الإدارة الرئيسية', desc: 'تحكم كامل — كل الفروع والأقسام والشركاء', handlers: ['scrollErpHub', 'openHrPlatform', 'openLegalPlatform', 'openExecutiveReports'] },
            { roles: ['hr'], icon: 'fas fa-people-roof', label: 'موارد بشرية', desc: 'إدارة كاملة — نبراس + الشركات الشريكة', handlers: ['openHrPlatform'] },
            { roles: ['legal'], icon: 'fas fa-scale-balanced', label: 'شؤون قانونية', desc: 'عقود · قضايا · امتثال المجموعة', handlers: ['openLegalPlatform'] },
            { roles: ['sales_manager', 'branch_manager'], icon: 'fas fa-chart-line', label: 'مبيعات الفرع', desc: 'CRM · عروض · طلبات · فريق المندوبين · ألومنيوم', handlers: ['openCrmPlatform', 'openRepQuoteBuilder', 'openErpOrders', 'openBranchTeamManagement', 'openAluminumDepartment'] },
            { roles: ['sales_rep'], icon: 'fas fa-file-signature', label: 'مندوب مبيعات', desc: 'عروض أسعار فقط — PDF للعملاء', handlers: ['openRepQuoteBuilder'] },
            { roles: ['accountant', 'accounting_manager'], icon: 'fas fa-calculator', label: 'قسم الحسابات', desc: 'تحويلات · مبيعات · PDF', handlers: ['openAccountingPlatform', 'openErpProcurement'] },
            { roles: ['inventory_manager', 'warehouse_manager'], icon: 'fas fa-warehouse', label: 'مخزون ومستودع', desc: 'SKU · جرد · تحويلات', handlers: ['openErpInventory', 'openErpWarehouseTransfers'] },
            { roles: ['production_manager', 'wpc_manager'], icon: 'fas fa-door-closed', label: 'إنتاج WPC', desc: 'مصنع الأبواب — مخزون · إنتاج · عروض', handlers: ['openWpcProductionDepartment'] },
            { roles: ['aluminum_manager'], icon: 'fas fa-industry', label: 'قسم الألومنيوم', desc: 'مخزون · إنتاج · عروض ALU', handlers: ['openAluminumDepartment'] },
            { roles: ['branch_manager'], icon: 'fas fa-store', label: 'لوحة الفرع', desc: 'مبيعات · فريق · طلبات فرعك', handlers: ['openBranchCommandCenter', 'openBranchTeamManagement'] }
        ];
        if (!role) return all.slice(0, 3);
        const mine = all.filter(function(w) { return w.roles.indexOf(role) >= 0; });
        return mine.length ? mine : all.filter(function(w) { return w.roles.indexOf('manager') >= 0; });
    }

    function buildEmpireReadiness() {
        const items = [];
        const cloudOk = typeof isNebrasCloudConnected === 'function' ? isNebrasCloudConnected() : false;
        items.push({ ok: cloudOk, label: 'السحابة Supabase متصلة', weight: 2 });

        const companies = typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies() : [];
        items.push({ ok: companies.length >= 1, label: 'سجل الشركات (نبراس الأم)', weight: 1 });
        items.push({ ok: companies.length >= 2, label: 'شركة شريكة مسجّلة (مثل أمواج اللدائن)', weight: 1 });

        const emps = typeof getHrEmployees === 'function' ? getHrEmployees() : [];
        items.push({ ok: emps.length > 0, label: 'موظفون في HR', weight: 1 });

        const contracts = typeof getLegalContracts === 'function' ? getLegalContracts() : [];
        items.push({ ok: contracts.length > 0, label: 'عقود في Legal', weight: 1 });

        const crmCust = typeof getCrmCustomers === 'function' ? getCrmCustomers() : [];
        items.push({ ok: crmCust.length > 0, label: 'عملاء في CRM', weight: 1 });

        const branches = typeof getNebrasBranchesForEmpire === 'function' ? getNebrasBranchesForEmpire().length : 0;
        items.push({ ok: branches > 0, label: 'فروع مسجّلة', weight: 1 });

        items.push({ ok: !!(typeof currentAdmin !== 'undefined' && currentAdmin), label: 'جلسة إدارية محكومة', weight: 1 });

        let totalW = 0, doneW = 0;
        items.forEach(function(i) {
            totalW += i.weight;
            if (i.ok) doneW += i.weight;
        });
        const pct = totalW ? Math.round((doneW / totalW) * 100) : 0;
        return { items: items, pct: pct, done: items.filter(function(i) { return i.ok; }).length, total: items.length };
    }

    function invokeHandler(handler) {
        if (!handler) return;
        if (typeof global[handler] === 'function') global[handler]();
        else if (typeof window[handler] === 'function') window[handler]();
    }

    function canOpenEmpireModule(mod) {
        if (mod.url) return true;
        if (mod.perm && typeof canManage === 'function' && !canManage(mod.perm)) {
            if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin()) return true;
            return false;
        }
        return true;
    }

    function renderEmpireModuleCards(modules, cssClass) {
        return modules.map(function(m) {
            const ok = canOpenEmpireModule(m);
            const click = m.url
                ? 'window.open(\'' + esc(m.url) + '\',\'_blank\')'
                : (m.handler ? 'invokeEmpireHandler(\'' + esc(m.handler) + '\')' : '');
            return '<button type="button" class="empire-module-card' + (cssClass ? ' ' + cssClass : '') + (ok ? '' : ' empire-module-card--locked') + '"' +
                (ok && click ? ' onclick="' + click + '"' : '') +
                (m.color ? ' style="--empire-accent:' + esc(m.color) + '"' : '') + '>' +
                '<i class="' + esc(m.icon) + '"></i>' +
                '<strong>' + esc(m.label) + '</strong>' +
                '<small>' + esc(m.desc) + '</small></button>';
        }).join('');
    }

    function renderEmpireBranchesBlock() {
        const branches = typeof getNebrasBranchesForEmpire === 'function' ? getNebrasBranchesForEmpire() : [];
        const hq = '<article class="empire-branch-chip empire-branch-chip--hq"><i class="fas fa-industry"></i> المقر الرئيسي — القصيم</article>';
        const rows = branches.map(function(b) {
            const name = b.city || b.cityAr || b.city_en || ('فرع ' + b.id);
            return '<article class="empire-branch-chip"><i class="fas fa-store"></i> ' + esc(name) + '</article>';
        }).join('');
        return hq + rows;
    }

    function renderEmpirePartnersBlock() {
        const companies = typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies() : [];
        const partners = companies.filter(function(c) { return !c.isPrimary; });
        if (!partners.length) {
            return '<p class="empire-empty-hint"><i class="fas fa-handshake"></i> أضيفي الشركات الشريكة من <button type="button" class="erp-tag erp-tag--action" onclick="invokeEmpireHandler(\'openHrPlatform\');setTimeout(function(){switchHrTab(\'companies\')},400)">HR → الشركات</button></p>';
        }
        return partners.map(function(c) {
            return '<article class="empire-partner-chip">' +
                '<strong>' + esc(c.nameAr) + '</strong>' +
                '<small>س.ت: ' + esc(c.crNumber || '—') + '</small>' +
                '<div class="empire-partner-actions">' +
                    '<button type="button" class="erp-tag erp-tag--action" onclick="invokeEmpireHandler(\'openHrPlatform\');setHrCompanyFilter(\'' + esc(c.id) + '\')"><i class="fas fa-people-roof"></i> HR</button>' +
                    '<button type="button" class="erp-tag" onclick="invokeEmpireHandler(\'openLegalPlatform\');setLegalCompanyFilter(\'' + esc(c.id) + '\')"><i class="fas fa-scale-balanced"></i> Legal</button>' +
                '</div></article>';
        }).join('');
    }

    function renderEmpireRoleWorkspace() {
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const workspaces = getEmpireDeptWorkspaces();
        const roleLabel = admin ? (admin.role || '—') : '—';
        const scopeLabel = typeof getHrAdminScope === 'function' ? (getHrAdminScope(admin) || {}).label : '';
        const cards = workspaces.map(function(w) {
            const btns = (w.handlers || []).map(function(h) {
                return '<button type="button" class="erp-tag erp-tag--action" onclick="invokeEmpireHandler(\'' + esc(h) + '\')"><i class="' + esc(w.icon) + '"></i> ' + esc(h.replace('open', '').replace('scroll', '')) + '</button>';
            }).join(' ');
            return '<article class="empire-ws-card"><i class="' + esc(w.icon) + '"></i><div><strong>' + esc(w.label) + '</strong><p>' + esc(w.desc) + '</p>' + btns + '</div></article>';
        }).join('');
        return '<div class="empire-ws-head"><span class="empire-ws-pill"><i class="fas fa-user-shield"></i> ' + esc(admin ? admin.username : '—') + ' · ' + esc(roleLabel) + '</span>' +
            (scopeLabel ? '<span class="empire-ws-scope">' + esc(scopeLabel) + '</span>' : '') + '</div>' +
            '<div class="empire-ws-grid">' + cards + '</div>';
    }

    function renderNebrasEmpireHubPanel() {
        const panel = document.getElementById('empire-hub-panel');
        if (!panel) return;
        if (!canViewEmpireHub()) {
            panel.innerHTML = '<p class="erp-empty">مركز الإمبراطورية — الإدارة الرئيسية أو مديرو الأقسام.</p>';
            return;
        }

        const rep = buildEmpireReadiness();
        const admin = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        const storeCount = typeof getNebrasCloudStoreCount === 'function' ? getNebrasCloudStoreCount() : '40+';
        const erpRef = typeof NEBRAS_ERP_PUBLIC !== 'undefined' ? NEBRAS_ERP_PUBLIC : null;
        const erpMods = erpRef && erpRef.modules ? erpRef.modules.filter(function(m) { return m.status === 'live'; }).length : 18;

        const checklist = rep.items.map(function(i) {
            return '<div class="empire-check-item' + (i.ok ? ' is-ok' : '') + '"><i class="fas fa-' + (i.ok ? 'circle-check' : 'circle') + '"></i> ' + esc(i.label) + '</div>';
        }).join('');

        panel.innerHTML =
            '<div class="empire-hub-hero">' +
                '<div class="empire-hub-hero-glow"></div>' +
                '<div class="empire-hub-hero-inner">' +
                    '<span class="empire-codename"><i class="fas fa-crown"></i> ' + EMPIRE_CODENAME + ' v' + EMPIRE_VERSION + '</span>' +
                    '<h2>إمبراطورية نبراس — منصة متكاملة داخلية وخارجية</h2>' +
                    '<p>واجهة للعالم · ERP للمصنع · HCM للموارد · Legal للقانون · فروع · شركاء — كل قسم له برنامجه ولوحته</p>' +
                '</div>' +
            '</div>' +
            '<div class="empire-readiness">' +
                '<div class="empire-readiness-head"><strong>جاهزية الإمبراطورية: ' + rep.pct + '%</strong><span>' + rep.done + '/' + rep.total + ' بنود</span></div>' +
                '<div class="empire-readiness-bar"><span style="width:' + rep.pct + '%"></span></div>' +
                '<div class="empire-checklist">' + checklist + '</div>' +
            '</div>' +
            '<div class="empire-kpi-ring">' +
                '<div class="empire-kpi"><strong>' + storeCount + '</strong><span>مخزن سحابة</span></div>' +
                '<div class="empire-kpi"><strong>' + erpMods + '</strong><span>وحدة ERP حية</span></div>' +
                '<div class="empire-kpi"><strong>' + (typeof getActiveHrCompanies === 'function' ? getActiveHrCompanies().length : 1) + '</strong><span>شركات المجموعة</span></div>' +
                '<div class="empire-kpi"><strong>' + (typeof getNebrasBranchesForEmpire === 'function' ? getNebrasBranchesForEmpire().length + 1 : 1) + '</strong><span>فروع + المقر</span></div>' +
            '</div>' +
            '<section class="empire-section">' +
                '<h3><i class="fas fa-globe-americas"></i> الواجهة الخارجية — دليل نبراس للسوق السعودي والعالم</h3>' +
                '<p class="empire-section-desc">ما يراه العملاء والزوار — واجهة احترافية تُدار بالكامل من الإدارة الرئيسية</p>' +
                '<div class="empire-module-grid empire-module-grid--external">' + renderEmpireModuleCards(getEmpireExternalModules(), 'empire-card--external') + '</div>' +
            '</section>' +
            '<section class="empire-section">' +
                '<h3><i class="fas fa-server"></i> المنصات الداخلية — ERP · HR · Legal · حوكمة</h3>' +
                '<p class="empire-section-desc">برامج إدارية لكل مسؤول — الإدارة الرئيسية والفروع والشركات الشريكة</p>' +
                '<div class="empire-module-grid">' + renderEmpireModuleCards(getEmpireInternalPlatforms()) + '</div>' +
            '</section>' +
            '<section class="empire-section">' +
                '<h3><i class="fas fa-sitemap"></i> مساحة عملك — قسمك · فرعك · صلاحياتك</h3>' +
                renderEmpireRoleWorkspace() +
            '</section>' +
            '<div class="empire-split">' +
                '<section class="empire-section empire-section--half">' +
                    '<h3><i class="fas fa-map-marked-alt"></i> شبكة الفروع</h3>' +
                    '<div class="empire-branch-grid">' + renderEmpireBranchesBlock() + '</div>' +
                '</section>' +
                '<section class="empire-section empire-section--half">' +
                    '<h3><i class="fas fa-handshake"></i> الشركات الشريكة</h3>' +
                    '<div class="empire-partner-grid">' + renderEmpirePartnersBlock() + '</div>' +
                '</section>' +
            '</div>' +
            '<div class="workspace-actions-row empire-quick-actions">' +
                '<button type="button" class="workspace-action-btn workspace-action-btn--primary" onclick="invokeEmpireHandler(\'openNebrasDataWarehouse\')"><i class="fas fa-database"></i> مستودع البيانات</button>' +
                '<button type="button" class="workspace-action-btn" onclick="invokeEmpireHandler(\'openNebrasEmpireBridges\')"><i class="fas fa-link"></i> جسور الإمبراطورية</button>' +
                '<button type="button" class="workspace-action-btn" onclick="invokeEmpireHandler(\'openOrderJourneyOps\')"><i class="fas fa-route"></i> مسار نبراس</button>' +
            '</div>' +
            '<p class="empire-footer-note"><i class="fas fa-shield-halved"></i> كل عملية · كل مستخدم · كل فرع · كل شركة — محكوم · موثّق · مزامَن سحابياً. هذه هي إمبراطورية نبراس.</p>';
    }

    function openNebrasEmpireHub() {
        if (!canViewEmpireHub()) {
            alert('مركز الإمبراطورية — الإدارة الرئيسية أو مديرو المنصة.');
            return;
        }
        if (typeof scrollToDashboardSection === 'function') scrollToDashboardSection('empire-hub-panel');
        else {
            const el = document.getElementById('empire-hub-panel');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
        renderNebrasEmpireHubPanel();
    }

    function invokeEmpireHandler(handler) {
        invokeHandler(handler);
    }

    global.renderNebrasEmpireHubPanel = renderNebrasEmpireHubPanel;
    global.openNebrasEmpireHub = openNebrasEmpireHub;
    global.invokeEmpireHandler = invokeEmpireHandler;
    global.canViewEmpireHub = canViewEmpireHub;
    global.buildEmpireReadiness = buildEmpireReadiness;
    global.EMPIRE_CODENAME = EMPIRE_CODENAME;
    global.EMPIRE_VERSION = EMPIRE_VERSION;

})(typeof window !== 'undefined' ? window : globalThis);
