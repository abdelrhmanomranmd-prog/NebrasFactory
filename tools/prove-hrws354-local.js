const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sec = require('../api/lib/nebras-security');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function testScopes() {
    assert(sec.verifyNebrasPassword(sec.FALLBACK_HQ_USERS[0].password, 'NEBRASFACTORYCOMPANYBASIC'));
    const base = { sub: 'u1', username: 'HR1', role: 'hr_manager', exp: Date.now() + 60000 };
    const live = {
        id: 'u1',
        username: 'HR1',
        role: 'hr_manager',
        permissions: ['hr'],
        hrScopeBranchId: 1,
        hrScopeDepartmentKey: 'production',
        hrScopeCompanyId: 'nebras'
    };
    const sess = sec.sessionWithLiveUser(base, live);
    assert.equal(sess.hrScopeDepartmentKey, 'production');
    const rows = [
        { id: 'ok', branchId: 1, departmentKey: 'production', companyId: 'nebras' },
        { id: 'wrong-branch', branchId: 2, departmentKey: 'production', companyId: 'nebras' },
        { id: 'wrong-dept', branchId: 1, departmentKey: 'sales', companyId: 'nebras' },
        { id: 'wrong-company', branchId: 1, departmentKey: 'production', companyId: 'partner' }
    ];
    assert.deepEqual(sec.filterPayloadForBranchSession('hr_employees', rows, sess).map((x) => x.id), ['ok']);
    assert.deepEqual(sec.filterPayloadForBranchSession('hr_employees', rows, { role: 'hr_manager' }), []);

    const legalSess = sec.sessionWithLiveUser(
        { sub: 'l1', username: 'LEGAL1', role: 'legal_manager', exp: Date.now() + 60000 },
        { id: 'l1', username: 'LEGAL1', role: 'legal_manager', permissions: ['legal'], legalScopeCompanyId: 'nebras' }
    );
    const legalRows = [
        { id: 'legal-ok', companyId: 'nebras' },
        { id: 'legal-other', companyId: 'partner' }
    ];
    assert.deepEqual(sec.filterPayloadForBranchSession('legal_contracts', legalRows, legalSess).map((x) => x.id), ['legal-ok']);
    assert.deepEqual(sec.filterPayloadForBranchSession('legal_contracts', legalRows, { role: 'legal_manager' }), []);

    const merged = sec.mergeBranchScopedStorePayload(
        'hr_employees',
        [{ id: 'ok', branchId: 1, departmentKey: 'production', companyId: 'nebras', name: 'new' }],
        [
            { id: 'ok', branchId: 1, departmentKey: 'production', companyId: 'nebras', name: 'old' },
            { id: 'other', branchId: 2, departmentKey: 'production', companyId: 'nebras' }
        ],
        sess
    );
    assert.equal(merged.length, 2);
    assert.equal(merged.find((x) => x.id === 'ok').name, 'new');
    assert(merged.some((x) => x.id === 'other'));
}

function testStaticGuards() {
    const platform = read('js/nebras-platform.js');
    const lazyCss = read('js/nebras-admin-css-lazy.js');
    const lazyDept = read('js/nebras-dept-lazy.js');
    const index = read('index.html');
    const rls = read('supabase/027-admin-content-readonly-rls.sql');
    const auth = read('api/nebras-auth.js');
    const cloud = read('api/nebras-cloud.js');
    const governance = read('api/nebras-governance-persist.js');

    assert(!platform.includes('onclick="onDashboardTileClick'));
    assert(platform.includes("observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: false })"));
    assert(platform.includes('salesQuotesCloudInFlight'));
    assert(platform.includes('dashboard-hq-organizer'));
    assert(platform.includes('function ensureErpOperationsData()'));
    assert(!platform.includes("password: 'NEBRASFACTORYCOMPANYBASIC'"));
    assert(lazyCss.includes('Promise.all(ADMIN_CSS.map(loadOne))'));
    assert(lazyCss.includes('css/68-hq-dashboard-organizer.css'));
    assert(!/adminCore:\s*\[\s*['"]js\/nebras-odoo-write\.js/.test(lazyDept));
    assert(index.includes('data-nebras-deploy="hrws354"'));
    assert(auth.includes('sessionWithLiveUser'));
    assert(cloud.includes('validateActiveSession'));
    assert(governance.includes("error: 'batch_rejected'"));
    assert(!/create policy[\s\S]*for insert to anon/i.test(rls));
    assert(!/create policy[\s\S]*for update to anon/i.test(rls));
}

testScopes();
testStaticGuards();
console.log('PASS hrws354 local governance, layers, performance, and HQ organization');
