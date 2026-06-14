/**
 * نبراس — منصة CRM
 * عملاء موحّدون · Pipeline · فرص · أنشطة · استيراد من Leads وخدمة العملاء
 */
(function(global) {
    'use strict';

    const CRM_CUSTOMERS_KEY = 'nebrasCrmCustomers';
    const CRM_OPPS_KEY = 'nebrasCrmOpportunities';
    const CRM_ACTIVITIES_KEY = 'nebrasCrmActivities';
    const CRM_AUDIT_KEY = 'nebrasCrmAudit';

    let crmCustomers = [];
    let crmOpportunities = [];
    let crmActivities = [];
    let crmAudit = [];
    let crmActiveTab = 'dashboard';
    let crmEditor = { kind: '', id: null };
    let crmPipelineFilter = '';
    let crmDataReady = false;

    const CRM_STAGES = {
        lead: { label: 'عميل محتمل', color: '#95a5a6', prob: 10 },
        qualified: { label: 'مؤهّل', color: '#3498db', prob: 25 },
        proposal: { label: 'عرض سعر', color: '#9b59b6', prob: 50 },
        negotiation: { label: 'تفاوض', color: '#f39c12', prob: 70 },
        won: { label: 'فوز', color: '#27ae60', prob: 100 },
        lost: { label: 'خسارة', color: '#e74c3c', prob: 0 }
    };

    const CRM_STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    const CRM_SOURCES = {
        website: 'الموقع',
        callback: 'نبراس يتصل بك',
        whatsapp: 'واتساب',
        referral: 'إحالة',
        exhibition: 'معرض',
        branch: 'فرع',
        customer_service: 'خدمة العملاء',
        other: 'أخرى'
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

    function crmActor() {
        const u = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        return { username: u ? (u.username || 'admin') : 'system', branchId: u ? (u.assignedBranchId || '') : '' };
    }

    function canAccessCrm(user) {
        user = user || (typeof currentAdmin !== 'undefined' ? currentAdmin : null);
        if (!user) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(user)) return true;
        if (typeof canManage === 'function') {
            return canManage('customerService', user) || canManage('sales', user) || canManage('quotes', user);
        }
        return false;
    }

    function requireCrmAccess() {
        if (!canAccessCrm()) {
            alert('صلاحية CRM غير متاحة لحسابك.');
            return false;
        }
        return true;
    }

    function crmScopeBranchId() {
        const u = typeof currentAdmin !== 'undefined' ? currentAdmin : null;
        if (!u) return '';
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(u)) return '';
        return String(u.assignedBranchId || '');
    }

    function filterCrmByBranch(list) {
        const bid = crmScopeBranchId();
        if (!bid) return list;
        return (list || []).filter(function(r) {
            return !r.branchId || String(r.branchId) === bid;
        });
    }

    function crmRecordInScope(record) {
        if (!record) return false;
        if (typeof isMainGovernanceAdmin === 'function' && isMainGovernanceAdmin(currentAdmin)) return true;
        const bid = crmScopeBranchId();
        if (!bid) return true;
        return !record.branchId || String(record.branchId) === bid;
    }

    function requireCrmRecordInScope(record) {
        if (!requireCrmAccess()) return false;
        if (!crmRecordInScope(record)) {
            alert('خارج نطاقك — هذا السجل لفرع آخر.');
            return false;
        }
        return true;
    }

    function crmAuditLog(action, detail) {
        const actor = crmActor();
        const entry = {
            id: 'crm-a-' + Date.now(),
            action: action,
            detail: detail || '',
            username: actor.username,
            recordedAt: new Date().toISOString()
        };
        crmAudit.unshift(entry);
        if (crmAudit.length > 500) crmAudit.length = 500;
        try { localStorage.setItem(CRM_AUDIT_KEY, JSON.stringify(crmAudit)); } catch (e) { /* ignore */ }
        if (typeof addAuditLog === 'function') addAuditLog(action, '[CRM] ' + (detail || ''));
    }

    function loadCrmData(force) {
        if (crmDataReady && !force) return;
        try {
            crmCustomers = JSON.parse(localStorage.getItem(CRM_CUSTOMERS_KEY) || '[]');
            crmOpportunities = JSON.parse(localStorage.getItem(CRM_OPPS_KEY) || '[]');
            crmActivities = JSON.parse(localStorage.getItem(CRM_ACTIVITIES_KEY) || '[]');
            crmAudit = JSON.parse(localStorage.getItem(CRM_AUDIT_KEY) || '[]');
        } catch (e) {
            crmCustomers = []; crmOpportunities = []; crmActivities = []; crmAudit = [];
        }
        if (!Array.isArray(crmCustomers)) crmCustomers = [];
        if (!Array.isArray(crmOpportunities)) crmOpportunities = [];
        if (!Array.isArray(crmActivities)) crmActivities = [];
        if (!Array.isArray(crmAudit)) crmAudit = [];
        crmDataReady = true;
    }

    function saveCrmData() {
        try {
            localStorage.setItem(CRM_CUSTOMERS_KEY, JSON.stringify(crmCustomers));
            localStorage.setItem(CRM_OPPS_KEY, JSON.stringify(crmOpportunities));
            localStorage.setItem(CRM_ACTIVITIES_KEY, JSON.stringify(crmActivities));
            localStorage.setItem(CRM_AUDIT_KEY, JSON.stringify(crmAudit));
        } catch (e) { console.warn('CRM save', e); }
        if (typeof saveSystemData === 'function') saveSystemData();
        else if (typeof schedulePushToNebrasCloud === 'function') schedulePushToNebrasCloud();
    }

    function setCrmCustomersFromCloud(v) { crmCustomers = Array.isArray(v) ? v : []; saveCrmData(); }
    function setCrmOpportunitiesFromCloud(v) { crmOpportunities = Array.isArray(v) ? v : []; saveCrmData(); }
    function setCrmActivitiesFromCloud(v) { crmActivities = Array.isArray(v) ? v : []; saveCrmData(); }
    function setCrmAuditFromCloud(v) { crmAudit = Array.isArray(v) ? v : []; saveCrmData(); }

    function formatCrmDate(d) {
        if (!d) return '—';
        try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('ar-SA'); } catch (e) { return d; }
    }

    function formatCrmMoney(n) {
        const v = Number(n) || 0;
        return v.toLocaleString('ar-SA') + ' ر.س';
    }

    function newCrmId(prefix) {
        return (prefix || 'crm') + '-' + Date.now() + '-' + Math.floor(Math.random() * 9999);
    }

    function findCrmCustomer(id) {
        return crmCustomers.find(function(c) { return c.id === id; }) || null;
    }

    function findCrmOpportunity(id) {
        return crmOpportunities.find(function(o) { return o.id === id; }) || null;
    }

    function resolveCrmCustomerLabel(id) {
        const c = findCrmCustomer(id);
        if (!c) return '—';
        return c.company ? (c.company + ' — ' + c.name) : c.name;
    }

    function normalizePhone(p) {
        return String(p || '').replace(/\D/g, '').slice(-9);
    }

    function findCustomerByPhoneOrEmail(phone, email) {
        const ph = normalizePhone(phone);
        const em = String(email || '').trim().toLowerCase();
        return crmCustomers.find(function(c) {
            if (ph && normalizePhone(c.phone) === ph) return true;
            if (em && String(c.email || '').trim().toLowerCase() === em) return true;
            return false;
        }) || null;
    }

    function getCrmKpis() {
        const customers = filterCrmByBranch(crmCustomers);
        const opps = filterCrmByBranch(crmOpportunities);
        const openOpps = opps.filter(function(o) { return o.stage !== 'won' && o.stage !== 'lost'; });
        const won = opps.filter(function(o) { return o.stage === 'won'; });
        const pipelineValue = openOpps.reduce(function(s, o) { return s + (Number(o.amount) || 0); }, 0);
        const wonValue = won.reduce(function(s, o) { return s + (Number(o.amount) || 0); }, 0);
        return {
            customers: customers.length,
            openOpps: openOpps.length,
            pipelineValue: pipelineValue,
            wonValue: wonValue,
            activities: filterCrmByBranch(crmActivities).length
        };
    }

    function renderCrmNav() {
        const nav = document.getElementById('crm-ws-nav');
        if (!nav) return;
        const tabs = [
            { id: 'dashboard', icon: 'fas fa-gauge-high', label: 'لوحة CRM' },
            { id: 'customers', icon: 'fas fa-address-book', label: 'قاعدة العملاء' },
            { id: 'pipeline', icon: 'fas fa-columns', label: 'Pipeline' },
            { id: 'activities', icon: 'fas fa-list-check', label: 'الأنشطة' },
            { id: 'import', icon: 'fas fa-file-import', label: 'استيراد' }
        ];
        nav.innerHTML = tabs.map(function(t) {
            const active = crmActiveTab === t.id ? ' is-active' : '';
            return '<button type="button" class="hr-ws-nav-btn' + active + '" onclick="switchCrmTab(\'' + t.id + '\')">' +
                '<i class="' + t.icon + '"></i><span>' + t.label + '</span></button>';
        }).join('');
    }

    function renderCrmSummary() {
        const strip = document.getElementById('crm-platform-summary');
        if (!strip) return;
        const k = getCrmKpis();
        strip.innerHTML =
            '<div class="erp-stat erp-stat--accent"><strong>' + k.customers + '</strong><span>عملاء</span></div>' +
            '<div class="erp-stat"><strong>' + k.openOpps + '</strong><span>فرص مفتوحة</span></div>' +
            '<div class="erp-stat"><strong>' + formatCrmMoney(k.pipelineValue) + '</strong><span>قيمة Pipeline</span></div>' +
            '<div class="erp-stat erp-stat--ok"><strong>' + formatCrmMoney(k.wonValue) + '</strong><span>فوز</span></div>';
    }

    function renderCrmDashboard() {
        const k = getCrmKpis();
        const recent = filterCrmByBranch(crmOpportunities).slice(0, 8);
        return '<div class="crm-command-hero">' +
            '<div class="crm-command-hero-inner">' +
            '<span class="hr-command-pill crm-pill"><i class="fas fa-handshake"></i> نبراس CRM</span>' +
            '<h2 class="hr-command-title">علاقات العملاء والمبيعات</h2>' +
            '<p class="hr-command-sub">قاعدة عملاء موحّدة · Pipeline · فرص · ربط عروض الأسعار وLeads</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" style="margin-top:12px" onclick="exportCrmPdf()"><i class="fas fa-file-pdf"></i> تقرير PDF للقسم</button>' +
            '</div></div>' +
            '<div class="crm-dash-grid">' +
            '<article class="crm-dash-card"><h3><i class="fas fa-users"></i> العملاء</h3><strong>' + k.customers + '</strong></article>' +
            '<article class="crm-dash-card"><h3><i class="fas fa-bullseye"></i> فرص مفتوحة</h3><strong>' + k.openOpps + '</strong></article>' +
            '<article class="crm-dash-card"><h3><i class="fas fa-coins"></i> Pipeline</h3><strong>' + formatCrmMoney(k.pipelineValue) + '</strong></article>' +
            '<article class="crm-dash-card crm-dash-card--ok"><h3><i class="fas fa-trophy"></i> فوز</h3><strong>' + formatCrmMoney(k.wonValue) + '</strong></article>' +
            '</div>' +
            '<div class="crm-recent-block"><h3>آخر الفرص</h3>' +
            (recent.length ? '<div class="erp-table-wrap"><table class="erp-table"><thead><tr><th>الفرصة</th><th>العميل</th><th>المرحلة</th><th>القيمة</th></tr></thead><tbody>' +
                recent.map(function(o) {
                    const st = CRM_STAGES[o.stage] || CRM_STAGES.lead;
                    return '<tr><td>' + esc(o.title) + '</td><td>' + esc(resolveCrmCustomerLabel(o.customerId)) + '</td>' +
                        '<td><span class="crm-stage-pill" style="--crm-color:' + st.color + '">' + st.label + '</span></td>' +
                        '<td>' + formatCrmMoney(o.amount) + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                : '<p class="erp-empty">لا توجد فرص بعد — أضيفي عميلاً ثم فرصة في Pipeline.</p>') +
            '</div>';
    }

    function renderCrmCustomersPanel() {
        if (crmEditor.kind === 'customer') {
            const c = crmEditor.id ? findCrmCustomer(crmEditor.id) : null;
            const bid = crmScopeBranchId();
            return '<div class="crm-editor">' +
                '<h3>' + (c ? 'تعديل عميل' : 'عميل جديد') + '</h3>' +
                '<div class="crm-form-grid">' +
                '<label>الاسم<input id="crm-c-name" value="' + escAttr(c ? c.name : '') + '"></label>' +
                '<label>الشركة<input id="crm-c-company" value="' + escAttr(c ? c.company : '') + '"></label>' +
                '<label>الجوال<input id="crm-c-phone" value="' + escAttr(c ? c.phone : '') + '"></label>' +
                '<label>البريد<input id="crm-c-email" type="email" value="' + escAttr(c ? c.email : '') + '"></label>' +
                '<label>المدينة<input id="crm-c-city" value="' + escAttr(c ? c.city : '') + '"></label>' +
                '<label>المصدر<select id="crm-c-source">' + Object.keys(CRM_SOURCES).map(function(k) {
                    const sel = c && c.source === k ? ' selected' : '';
                    return '<option value="' + k + '"' + sel + '>' + CRM_SOURCES[k] + '</option>';
                }).join('') + '</select></label>' +
                '<label class="crm-form-full">ملاحظات<textarea id="crm-c-notes" rows="3">' + esc(c ? c.notes : '') + '</textarea></label>' +
                '</div>' +
                '<div class="crm-editor-actions">' +
                '<button type="button" class="erp-btn" onclick="cancelCrmEditor()">إلغاء</button>' +
                '<button type="button" class="erp-btn erp-btn--primary" onclick="saveCrmCustomer()"><i class="fas fa-floppy-disk"></i> حفظ</button>' +
                '</div></div>';
        }
        const list = filterCrmByBranch(crmCustomers);
        const toolbar = '<div class="crm-toolbar">' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="openCrmCustomerEditor()"><i class="fas fa-user-plus"></i> عميل جديد</button>' +
            '<span class="crm-toolbar-meta">' + list.length + ' عميل</span></div>';
        const rows = list.length ? list.map(function(c) {
            return '<article class="crm-customer-row">' +
                '<div class="crm-customer-main">' +
                '<strong>' + esc(c.name) + '</strong>' +
                (c.company ? '<span class="crm-customer-co">' + esc(c.company) + '</span>' : '') +
                '<small>' + esc(c.phone || '—') + ' · ' + esc(c.city || '—') + ' · ' + (CRM_SOURCES[c.source] || c.source || '—') + '</small>' +
                '</div>' +
                '<div class="crm-customer-actions">' +
                '<button type="button" class="erp-tag erp-tag--action" onclick="openCrmOpportunityEditor(null,\'' + escAttr(c.id) + '\')"><i class="fas fa-bullseye"></i> فرصة</button>' +
                '<button type="button" class="erp-tag" onclick="openCrmCustomerEditor(\'' + escAttr(c.id) + '\')"><i class="fas fa-pen"></i></button>' +
                '<button type="button" class="erp-tag erp-tag--danger" onclick="deleteCrmCustomer(\'' + escAttr(c.id) + '\')"><i class="fas fa-trash"></i></button>' +
                '</div></article>';
        }).join('') : '<p class="erp-empty">لا يوجد عملاء — أضيفي أول عميل أو استوردي من Leads.</p>';
        return toolbar + '<div class="crm-customer-list">' + rows + '</div>';
    }

    function renderCrmPipelinePanel() {
        const opps = filterCrmByBranch(crmOpportunities);
        const cols = CRM_STAGE_ORDER.filter(function(s) { return s !== 'lost' || !crmPipelineFilter; }).map(function(stage) {
            const meta = CRM_STAGES[stage];
            const items = opps.filter(function(o) { return o.stage === stage; });
            const total = items.reduce(function(s, o) { return s + (Number(o.amount) || 0); }, 0);
            return '<div class="crm-pipeline-col" data-stage="' + stage + '">' +
                '<header class="crm-pipeline-col-head" style="--crm-color:' + meta.color + '">' +
                '<strong>' + meta.label + '</strong><span>' + items.length + ' · ' + formatCrmMoney(total) + '</span></header>' +
                '<div class="crm-pipeline-cards">' +
                items.map(function(o) {
                    return '<article class="crm-opp-card" draggable="true" data-opp-id="' + escAttr(o.id) + '">' +
                        '<strong>' + esc(o.title) + '</strong>' +
                        '<small>' + esc(resolveCrmCustomerLabel(o.customerId)) + '</small>' +
                        '<span class="crm-opp-amount">' + formatCrmMoney(o.amount) + '</span>' +
                        '<div class="crm-opp-card-actions">' +
                        '<button type="button" class="erp-tag erp-tag--action" onclick="moveCrmOpportunityStage(\'' + escAttr(o.id) + '\',\'' + escAttr(getNextStage(stage)) + '\')"><i class="fas fa-arrow-left"></i></button>' +
                        '<button type="button" class="erp-tag" onclick="openCrmOpportunityEditor(\'' + escAttr(o.id) + '\')"><i class="fas fa-pen"></i></button>' +
                        '</div></article>';
                }).join('') +
                '</div></div>';
        }).join('');
        let editor = '';
        if (crmEditor.kind === 'opportunity') {
            const o = crmEditor.id ? findCrmOpportunity(crmEditor.id) : null;
            const custOpts = filterCrmByBranch(crmCustomers).map(function(c) {
                const sel = (o && o.customerId === c.id) || crmEditor.customerId === c.id ? ' selected' : '';
                return '<option value="' + escAttr(c.id) + '"' + sel + '>' + esc(c.name) + (c.company ? ' — ' + esc(c.company) : '') + '</option>';
            }).join('');
            editor = '<div class="crm-editor crm-editor--inline">' +
                '<h3>' + (o ? 'تعديل فرصة' : 'فرصة جديدة') + '</h3>' +
                '<div class="crm-form-grid">' +
                '<label>العنوان<input id="crm-o-title" value="' + escAttr(o ? o.title : '') + '"></label>' +
                '<label>العميل<select id="crm-o-customer"><option value="">— اختر —</option>' + custOpts + '</select></label>' +
                '<label>القيمة (ر.س)<input id="crm-o-amount" type="number" min="0" value="' + escAttr(o ? o.amount : '') + '"></label>' +
                '<label>المرحلة<select id="crm-o-stage">' + CRM_STAGE_ORDER.map(function(k) {
                    const sel = o && o.stage === k ? ' selected' : '';
                    return '<option value="' + k + '"' + sel + '>' + CRM_STAGES[k].label + '</option>';
                }).join('') + '</select></label>' +
                '<label class="crm-form-full">ملاحظات<textarea id="crm-o-notes" rows="2">' + esc(o ? o.notes : '') + '</textarea></label>' +
                '</div>' +
                '<div class="crm-editor-actions">' +
                '<button type="button" class="erp-btn" onclick="cancelCrmEditor()">إلغاء</button>' +
                '<button type="button" class="erp-btn erp-btn--primary" onclick="saveCrmOpportunity()"><i class="fas fa-floppy-disk"></i> حفظ</button>' +
                '</div></div>';
        }
        return '<div class="crm-toolbar">' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="openCrmOpportunityEditor()"><i class="fas fa-plus"></i> فرصة جديدة</button>' +
            '<label class="crm-toggle-lost"><input type="checkbox" id="crm-show-lost"' + (crmPipelineFilter ? ' checked' : '') + ' onchange="toggleCrmLostColumn()"> إظهار الخسارة</label>' +
            '</div>' + editor + '<div class="crm-pipeline-board">' + cols + '</div>';
    }

    function getNextStage(stage) {
        const i = CRM_STAGE_ORDER.indexOf(stage);
        if (i < 0 || i >= CRM_STAGE_ORDER.length - 2) return stage;
        return CRM_STAGE_ORDER[i + 1];
    }

    function renderCrmActivitiesPanel() {
        const acts = filterCrmByBranch(crmActivities).slice(0, 80);
        const toolbar = '<div class="crm-toolbar">' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="openCrmActivityEditor()"><i class="fas fa-plus"></i> نشاط</button></div>';
        if (crmEditor.kind === 'activity') {
            const custOpts = filterCrmByBranch(crmCustomers).map(function(c) {
                return '<option value="' + escAttr(c.id) + '">' + esc(c.name) + '</option>';
            }).join('');
            return toolbar + '<div class="crm-editor">' +
                '<h3>نشاط جديد</h3>' +
                '<div class="crm-form-grid">' +
                '<label>العميل<select id="crm-a-customer"><option value="">—</option>' + custOpts + '</select></label>' +
                '<label>النوع<select id="crm-a-type"><option value="call">مكالمة</option><option value="visit">زيارة</option><option value="email">بريد</option><option value="whatsapp">واتساب</option><option value="meeting">اجتماع</option></select></label>' +
                '<label class="crm-form-full">التفاصيل<textarea id="crm-a-detail" rows="3"></textarea></label>' +
                '</div>' +
                '<div class="crm-editor-actions">' +
                '<button type="button" class="erp-btn" onclick="cancelCrmEditor()">إلغاء</button>' +
                '<button type="button" class="erp-btn erp-btn--primary" onclick="saveCrmActivity()">حفظ</button></div></div>';
        }
        const rows = acts.length ? acts.map(function(a) {
            return '<article class="crm-activity-row">' +
                '<span class="crm-activity-type"><i class="fas fa-circle-dot"></i> ' + esc(a.type || 'نشاط') + '</span>' +
                '<div><strong>' + esc(resolveCrmCustomerLabel(a.customerId)) + '</strong><p>' + esc(a.detail) + '</p>' +
                '<small>' + formatCrmDate(a.recordedAt) + ' · ' + esc(a.username || '') + '</small></div></article>';
        }).join('') : '<p class="erp-empty">لا أنشطة مسجّلة.</p>';
        return toolbar + '<div class="crm-activity-list">' + rows + '</div>';
    }

    function renderCrmImportPanel() {
        let csCount = 0;
        let leadCount = 0;
        try {
            if (typeof customerServiceData !== 'undefined' && Array.isArray(customerServiceData)) csCount = customerServiceData.length;
        } catch (e) { /* ignore */ }
        if (typeof window.getCallbackLeads === 'function') {
            const leads = window.getCallbackLeads() || [];
            leadCount = leads.length;
        }
        return '<div class="crm-import-hero">' +
            '<h3><i class="fas fa-file-import"></i> استيراد إلى CRM</h3>' +
            '<p>دمج استفسارات خدمة العملاء وLeads «نبراس يتصل بك» في قاعدة العملاء الموحّدة دون تكرار (حسب الجوال/البريد).</p>' +
            '</div>' +
            '<div class="crm-import-grid">' +
            '<article class="crm-import-card">' +
            '<h4>خدمة العملاء</h4><p>' + csCount + ' سجل متاح</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="importCrmFromCustomerService()"><i class="fas fa-headset"></i> استيراد</button>' +
            '</article>' +
            '<article class="crm-import-card">' +
            '<h4>نبراس يتصل بك</h4><p>' + leadCount + ' Lead</p>' +
            '<button type="button" class="erp-btn erp-btn--primary" onclick="importCrmFromCallbackLeads()"><i class="fas fa-phone-volume"></i> استيراد</button>' +
            '</article>' +
            '</div>';
    }

    function renderCrmPlatformPanel() {
        loadCrmData();
        renderCrmNav();
        renderCrmSummary();
        const pill = document.getElementById('crm-ws-user-pill');
        if (pill) {
            const a = crmActor();
            pill.textContent = a.username + (crmScopeBranchId() ? ' · فرع' : ' · المجموعة');
        }
        const content = document.getElementById('crm-platform-content');
        if (!content) return;
        let panel = '';
        if (crmActiveTab === 'dashboard') panel = renderCrmDashboard();
        else if (crmActiveTab === 'customers') panel = renderCrmCustomersPanel();
        else if (crmActiveTab === 'pipeline') panel = renderCrmPipelinePanel();
        else if (crmActiveTab === 'activities') panel = renderCrmActivitiesPanel();
        else if (crmActiveTab === 'import') panel = renderCrmImportPanel();
        content.innerHTML = '<div class="hr-panel is-active crm-panel">' + panel + '</div>';
        bindCrmPipelineDrag();
    }

    function bindCrmPipelineDrag() {
        const cards = document.querySelectorAll('.crm-opp-card[draggable]');
        const cols = document.querySelectorAll('.crm-pipeline-col');
        cards.forEach(function(card) {
            card.addEventListener('dragstart', function(e) {
                e.dataTransfer.setData('text/plain', card.getAttribute('data-opp-id') || '');
            });
        });
        cols.forEach(function(col) {
            col.addEventListener('dragover', function(e) { e.preventDefault(); col.classList.add('crm-pipeline-col--over'); });
            col.addEventListener('dragleave', function() { col.classList.remove('crm-pipeline-col--over'); });
            col.addEventListener('drop', function(e) {
                e.preventDefault();
                col.classList.remove('crm-pipeline-col--over');
                const id = e.dataTransfer.getData('text/plain');
                const stage = col.getAttribute('data-stage');
                if (id && stage) moveCrmOpportunityStage(id, stage);
            });
        });
    }

    function renderCrmPlatformPanelSafe() {
        try { renderCrmPlatformPanel(); return true; }
        catch (e) {
            console.error('renderCrmPlatformPanel', e);
            const content = document.getElementById('crm-platform-content');
            if (content) content.innerHTML = '<p class="erp-empty">تعذّر تحميل CRM — ' + esc(e.message) + '</p>';
            return false;
        }
    }

    function showCrmPlatformShell() {
        const el = document.getElementById('crm-platform');
        if (!el) { alert('تعذر فتح CRM — أعيدي تحميل الصفحة.'); return false; }
        if (typeof closeAllAdminSections === 'function') {
            document.querySelectorAll('.admin-section.show').forEach(function(n) {
                if (n.id !== 'crm-platform') { n.classList.remove('show'); n.setAttribute('aria-hidden', 'true'); }
            });
        }
        el.classList.add('show');
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('crm-platform-open');
        if (typeof ensureAdminPanelExitChrome === 'function') ensureAdminPanelExitChrome();
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
        return true;
    }

    function closeCrmWorkspace() {
        const el = document.getElementById('crm-platform');
        if (el) { el.classList.remove('show'); el.setAttribute('aria-hidden', 'true'); }
        document.body.classList.remove('crm-platform-open');
        const dash = document.getElementById('admin-dashboard');
        if (dash && typeof currentAdmin !== 'undefined' && currentAdmin) {
            dash.classList.add('show');
            dash.removeAttribute('hidden');
            dash.setAttribute('aria-hidden', 'false');
        }
        if (typeof syncPlatformInteractionLayers === 'function') syncPlatformInteractionLayers();
    }

    function openCrmPlatform() {
        if (!requireCrmAccess()) return;
        crmActiveTab = crmActiveTab || 'dashboard';
        if (!showCrmPlatformShell()) return;
        renderCrmPlatformPanelSafe();
    }

    function switchCrmTab(tab) {
        crmActiveTab = tab || 'dashboard';
        crmEditor = { kind: '', id: null };
        renderCrmPlatformPanelSafe();
    }

    function openCrmCustomerEditor(id) {
        crmEditor = { kind: 'customer', id: id || null };
        crmActiveTab = 'customers';
        renderCrmPlatformPanelSafe();
    }

    function openCrmOpportunityEditor(id, customerId) {
        crmEditor = { kind: 'opportunity', id: id || null, customerId: customerId || '' };
        crmActiveTab = 'pipeline';
        renderCrmPlatformPanelSafe();
    }

    function openCrmActivityEditor() {
        crmEditor = { kind: 'activity', id: null };
        crmActiveTab = 'activities';
        renderCrmPlatformPanelSafe();
    }

    function cancelCrmEditor() {
        crmEditor = { kind: '', id: null };
        renderCrmPlatformPanelSafe();
    }

    function toggleCrmLostColumn() {
        const cb = document.getElementById('crm-show-lost');
        crmPipelineFilter = cb && cb.checked ? 'show-lost' : '';
        renderCrmPlatformPanelSafe();
    }

    /** جسر تلقائي من المتجر/السلة */
    function addCrmCustomer(data) {
        loadCrmData();
        if (!data) return null;
        const phone = String(data.phone || '').replace(/\D/g, '');
        if (phone.length >= 9) {
            const dup = crmCustomers.find(function(c) {
                return c && String(c.phone || '').replace(/\D/g, '') === phone;
            });
            if (dup) return dup;
        }
        const now = new Date().toISOString();
        const cust = {
            id: newCrmId('cust'),
            name: data.nameAr || data.name || 'عميل متجر',
            company: data.company || '',
            phone: data.phone || '',
            email: data.email || '',
            city: data.city || '',
            source: data.source || 'store-cart',
            notes: (data.notes || '') + (data.quoteNo ? ' — عرض ' + data.quoteNo : ''),
            branchId: data.branchId || crmScopeBranchId() || null,
            createdAt: now,
            updatedAt: now
        };
        crmCustomers.unshift(cust);
        saveCrmData();
        crmAuditLog('جسر متجر → CRM', cust.name);
        return cust;
    }

    function saveCrmCustomer() {
        if (!requireCrmAccess()) return;
        const name = String((document.getElementById('crm-c-name') || {}).value || '').trim();
        if (!name) { alert('الاسم مطلوب.'); return; }
        const now = new Date().toISOString();
        const bid = crmScopeBranchId();
        const payload = {
            name: name,
            company: String((document.getElementById('crm-c-company') || {}).value || '').trim(),
            phone: String((document.getElementById('crm-c-phone') || {}).value || '').trim(),
            email: String((document.getElementById('crm-c-email') || {}).value || '').trim(),
            city: String((document.getElementById('crm-c-city') || {}).value || '').trim(),
            source: String((document.getElementById('crm-c-source') || {}).value || 'other'),
            notes: String((document.getElementById('crm-c-notes') || {}).value || '').trim(),
            branchId: bid || null,
            updatedAt: now
        };
        if (crmEditor.id) {
            const existing = findCrmCustomer(crmEditor.id);
            if (existing && !requireCrmRecordInScope(existing)) return;
            const idx = crmCustomers.findIndex(function(c) { return c.id === crmEditor.id; });
            if (idx >= 0) {
                crmCustomers[idx] = Object.assign({}, crmCustomers[idx], payload);
                crmAuditLog('تعديل عميل CRM', name);
            }
        } else {
            crmCustomers.unshift(Object.assign({ id: newCrmId('cust'), createdAt: now }, payload));
            crmAuditLog('إضافة عميل CRM', name);
        }
        saveCrmData();
        crmEditor = { kind: '', id: null };
        renderCrmPlatformPanelSafe();
    }

    function deleteCrmCustomer(id) {
        if (!requireCrmAccess()) return;
        const existing = findCrmCustomer(id);
        if (existing && !requireCrmRecordInScope(existing)) return;
        if (!confirm('حذف العميل وجميع فرصه؟')) return;
        crmCustomers = crmCustomers.filter(function(c) { return c.id !== id; });
        crmOpportunities = crmOpportunities.filter(function(o) { return o.customerId !== id; });
        crmActivities = crmActivities.filter(function(a) { return a.customerId !== id; });
        crmAuditLog('حذف عميل CRM', id);
        saveCrmData();
        renderCrmPlatformPanelSafe();
    }

    function saveCrmOpportunity() {
        if (!requireCrmAccess()) return;
        const title = String((document.getElementById('crm-o-title') || {}).value || '').trim();
        const customerId = String((document.getElementById('crm-o-customer') || {}).value || '').trim();
        if (!title || !customerId) { alert('العنوان والعميل مطلوبان.'); return; }
        const now = new Date().toISOString();
        const bid = crmScopeBranchId();
        const payload = {
            title: title,
            customerId: customerId,
            amount: Number((document.getElementById('crm-o-amount') || {}).value) || 0,
            stage: String((document.getElementById('crm-o-stage') || {}).value || 'lead'),
            notes: String((document.getElementById('crm-o-notes') || {}).value || '').trim(),
            branchId: bid || null,
            probability: (CRM_STAGES[String((document.getElementById('crm-o-stage') || {}).value)] || {}).prob || 10,
            updatedAt: now
        };
        if (crmEditor.id) {
            const existing = crmOpportunities.find(function(o) { return o.id === crmEditor.id; });
            if (existing && !requireCrmRecordInScope(existing)) return;
            const idx = crmOpportunities.findIndex(function(o) { return o.id === crmEditor.id; });
            if (idx >= 0) {
                crmOpportunities[idx] = Object.assign({}, crmOpportunities[idx], payload);
                crmAuditLog('تعديل فرصة CRM', title);
            }
        } else {
            crmOpportunities.unshift(Object.assign({
                id: newCrmId('opp'),
                createdAt: now,
                createdBy: crmActor().username
            }, payload));
            crmAuditLog('فرصة CRM جديدة', title);
        }
        saveCrmData();
        crmEditor = { kind: '', id: null };
        renderCrmPlatformPanelSafe();
    }

    function moveCrmOpportunityStage(id, stage) {
        if (!requireCrmAccess()) return;
        if (!CRM_STAGES[stage]) return;
        const idx = crmOpportunities.findIndex(function(o) { return o.id === id; });
        if (idx < 0) return;
        if (!requireCrmRecordInScope(crmOpportunities[idx])) return;
        crmOpportunities[idx] = Object.assign({}, crmOpportunities[idx], {
            stage: stage,
            probability: CRM_STAGES[stage].prob,
            updatedAt: new Date().toISOString()
        });
        crmAuditLog('نقل فرصة CRM', crmOpportunities[idx].title + ' → ' + CRM_STAGES[stage].label);
        saveCrmData();
        renderCrmPlatformPanelSafe();
    }

    function saveCrmActivity() {
        const customerId = String((document.getElementById('crm-a-customer') || {}).value || '').trim();
        const detail = String((document.getElementById('crm-a-detail') || {}).value || '').trim();
        if (!detail) { alert('أدخلي تفاصيل النشاط.'); return; }
        const actor = crmActor();
        crmActivities.unshift({
            id: newCrmId('act'),
            customerId: customerId,
            type: String((document.getElementById('crm-a-type') || {}).value || 'call'),
            detail: detail,
            branchId: crmScopeBranchId() || null,
            username: actor.username,
            recordedAt: new Date().toISOString()
        });
        crmAuditLog('نشاط CRM', detail.slice(0, 80));
        saveCrmData();
        crmEditor = { kind: '', id: null };
        renderCrmPlatformPanelSafe();
    }

    function upsertCrmCustomerFromLead(data) {
        const phone = data.phone || data.mobile || '';
        const email = data.email || '';
        let existing = findCustomerByPhoneOrEmail(phone, email);
        if (existing) return existing;
        const now = new Date().toISOString();
        const c = {
            id: newCrmId('cust'),
            name: data.name || data.contactName || 'عميل',
            company: data.company || '',
            phone: phone,
            email: email,
            city: data.city || '',
            source: data.source || 'other',
            notes: data.notes || '',
            branchId: data.branchId || crmScopeBranchId() || null,
            createdAt: now,
            updatedAt: now
        };
        crmCustomers.unshift(c);
        return c;
    }

    function importCrmFromCustomerService() {
        loadCrmData();
        let imported = 0;
        const list = (typeof customerServiceData !== 'undefined' && Array.isArray(customerServiceData)) ? customerServiceData : [];
        list.forEach(function(row) {
            const before = crmCustomers.length;
            upsertCrmCustomerFromLead({
                name: row.name || row.customerName || 'عميل',
                phone: row.phone || row.mobile,
                email: row.email,
                city: row.city,
                source: 'customer_service',
                notes: row.message || row.subject || ''
            });
            if (crmCustomers.length > before) imported++;
        });
        saveCrmData();
        crmAuditLog('استيراد CRM', 'خدمة العملاء: ' + imported + ' جديد');
        alert('تم استيراد ' + imported + ' عميل جديد من خدمة العملاء.');
        crmActiveTab = 'customers';
        renderCrmPlatformPanelSafe();
    }

    function importCrmFromCallbackLeads() {
        loadCrmData();
        let imported = 0;
        const leads = typeof window.getCallbackLeads === 'function' ? (window.getCallbackLeads() || []) : [];
        leads.forEach(function(row) {
            const before = crmCustomers.length;
            upsertCrmCustomerFromLead({
                name: row.name || row.fullName || 'Lead',
                phone: row.phone || row.mobile,
                city: row.city,
                source: 'callback',
                notes: row.productInterest || row.note || ''
            });
            if (crmCustomers.length > before) {
                imported++;
                const cust = crmCustomers[0];
                crmOpportunities.unshift({
                    id: newCrmId('opp'),
                    customerId: cust.id,
                    title: 'Lead — ' + (row.productInterest || 'استفسار'),
                    stage: 'lead',
                    amount: 0,
                    probability: 10,
                    branchId: cust.branchId,
                    notes: 'مستورد من نبراس يتصل بك',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: crmActor().username
                });
            }
        });
        saveCrmData();
        crmAuditLog('استيراد CRM', 'Callback leads: ' + imported);
        alert('تم استيراد ' + imported + ' Lead كعملاء وفرص.');
        crmActiveTab = 'pipeline';
        renderCrmPlatformPanelSafe();
    }

    function exportCrmPdf() {
        if (!requireCrmAccess()) return;
        loadCrmData();
        const k = getCrmKpis();
        const cust = filterCrmByBranch(crmCustomers);
        const opps = filterCrmByBranch(crmOpportunities);
        const w = window.open('', '_blank');
        if (!w) { alert('فعّلي النوافذ المنبثقة للطباعة/PDF.'); return; }
        let body = '<h1>تقرير CRM — نبراس</h1><p>عملاء: ' + k.customers + ' · فرص مفتوحة: ' + k.openOpps +
            ' · Pipeline: ' + formatCrmMoney(k.pipelineValue) + ' · فوز: ' + formatCrmMoney(k.wonValue) + '</p>';
        body += '<h2>العملاء</h2><table><tr><th>الاسم</th><th>الشركة</th><th>الجوال</th><th>المدينة</th></tr>';
        cust.slice(0, 50).forEach(function(c) {
            body += '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.company) + '</td><td>' + esc(c.phone) + '</td><td>' + esc(c.city) + '</td></tr>';
        });
        body += '</table><h2>Pipeline</h2><table><tr><th>الفرصة</th><th>المرحلة</th><th>القيمة</th><th>العميل</th></tr>';
        opps.slice(0, 50).forEach(function(o) {
            const st = (CRM_STAGES[o.stage] || CRM_STAGES.lead).label;
            body += '<tr><td>' + esc(o.title) + '</td><td>' + esc(st) + '</td><td>' + formatCrmMoney(o.amount) + '</td><td>' + esc(resolveCrmCustomerLabel(o.customerId)) + '</td></tr>';
        });
        body += '</table><p class="foot">مستند داخلي — CRM · نبراس</p>';
        w.document.write('<html dir="rtl"><head><meta charset="utf-8"><title>نبراس CRM</title>' +
            '<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#1a365d}h1{font-size:18px}h2{font-size:14px;margin-top:20px}' +
            'table{width:100%;border-collapse:collapse;margin-top:10px;font-size:11px}th,td{border:1px solid #ccc;padding:6px;text-align:right}th{background:#e8f0f8}.foot{margin-top:24px;font-size:10px;color:#666}</style></head><body>');
        w.document.write(body);
        w.document.write('</body></html>');
        w.document.close();
        w.print();
        crmAuditLog('تقرير CRM PDF', cust.length + ' عملاء');
    }

    global.openCrmPlatform = openCrmPlatform;
    global.closeCrmWorkspace = closeCrmWorkspace;
    global.switchCrmTab = switchCrmTab;
    global.openCrmCustomerEditor = openCrmCustomerEditor;
    global.openCrmOpportunityEditor = openCrmOpportunityEditor;
    global.openCrmActivityEditor = openCrmActivityEditor;
    global.cancelCrmEditor = cancelCrmEditor;
    global.addCrmCustomer = addCrmCustomer;
    global.saveCrmCustomer = saveCrmCustomer;
    global.deleteCrmCustomer = deleteCrmCustomer;
    global.saveCrmOpportunity = saveCrmOpportunity;
    global.moveCrmOpportunityStage = moveCrmOpportunityStage;
    global.saveCrmActivity = saveCrmActivity;
    global.toggleCrmLostColumn = toggleCrmLostColumn;
    global.importCrmFromCustomerService = importCrmFromCustomerService;
    global.importCrmFromCallbackLeads = importCrmFromCallbackLeads;
    global.canAccessCrmPlatform = canAccessCrm;
    global.loadCrmData = loadCrmData;
    global.getCrmCustomers = function() { loadCrmData(); return crmCustomers; };
    global.getCrmOpportunities = function() { loadCrmData(); return crmOpportunities; };
    global.getCrmActivities = function() { loadCrmData(); return crmActivities; };
    global.getCrmAudit = function() { loadCrmData(); return crmAudit; };
    global.setCrmCustomersFromCloud = setCrmCustomersFromCloud;
    global.setCrmOpportunitiesFromCloud = setCrmOpportunitiesFromCloud;
    global.setCrmActivitiesFromCloud = setCrmActivitiesFromCloud;
    global.setCrmAuditFromCloud = setCrmAuditFromCloud;
    global.renderCrmPlatformPanelSafe = renderCrmPlatformPanelSafe;
    global.exportCrmPdf = exportCrmPdf;

})(typeof window !== 'undefined' ? window : globalThis);
