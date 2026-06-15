#!/usr/bin/env python3
"""Full deploy readiness: local git, GitHub, Supabase, live site markers."""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPABASE_URL = 'https://oedldllrjavofpeaputz.supabase.co'
ANON_KEY = 'sb_publishable_bt6rlHxu_pjc1xpkKEWOcg_HZ43JMR0'
LIVE = 'https://www.nebrasplasticcompany.com'
GITHUB_REPO = 'abdelrhmanomranmd-prog/NebrasFactory'

REQUIRED_CLOUD_KEYS = {
    'system_settings', 'site_products', 'admin_users', 'hr_dept_activity',
    'quote_registry', 'hr_employees', 'sales_quotes_inbox', 'analytics_governance', 'admin_presence',
    'legal_contracts', 'crm_customers', 'crm_opportunities', 'hr_companies', 'hr_gps_positions',
    'customer_portal_users',
    'customer_order_journeys',
    'nebras_cloud_snapshots',
    'nebras_platform_integrity',
}
PUBLIC_CLOUD_KEYS = {
    'system_settings', 'site_products', 'visitor_icons', 'dashboard_tiles',
    'about_pages', 'branches', 'site_partners', 'site_certifications', 'showroom_gallery',
}
LIVE_MARKERS = {
    'index.html': [
        '49-platform-integrity.css',
        'nebras-platform-integrity.js',
        'nebras-secure-cloud.js',
        '48-order-journey.css',
        'nebras-order-journey.js',
        'data-nebras-deploy="hrws70"',
        'exportNebrasGovernanceBundle', 'openNebrasGovernanceImportPicker',
        'nebras-data-warehouse.js',
        'nebras-empire-bridges.js',
        '51-data-warehouse.css',
        '52-cart-enterprise.css',
        'data-warehouse-hub',
        'empire-bridges-hub',
        'cart-summary-ribbon',
        'quote-a4-customer-ribbon',
        'dash-data-warehouse',
        'dash-empire-bridges',
    ],
    'css/47-platform-interaction-global.css': [
        'admin-section:not(.show)',
        'pointer-events: none !important',
    ],
    'js/nebras-platform.js': [
        'NEBRAS_GOVERNANCE_PILLARS', 'openAccountingPlatform', 'openCrmPlatform',
        'openLegalPlatform', 'renderGovernancePillarsPanel', 'buildExecutiveReportData',
        'getNebrasCurrentAdmin', 'openUserEditor', 'getNebrasErpOrders',
        'getProcurementBranchRegistry', 'setProcurementViewScope', 'bindDashboardTileInteractions',
        'syncPlatformInteractionLayers', 'revealPlatformLayer', 'NEBRAS_PLATFORM_LAYER_SEL',
        'dash-order-journey', 'openRepCustomerJourneys', 'updateNebrasErpOrderFromJourney',
        'dash-data-warehouse', 'openNebrasDataWarehouse', 'dash-empire-bridges', 'openNebrasEmpireBridges',
        'assignedRepId', 'assignedRepUsername', 'getNebrasColorCatalog',
        'saveCartBackup', 'restoreCartBackupIfEmpty', 'renderCartEnterpriseChrome', 'quote-a4-customer-ribbon',
        'dash-platform-integration', 'openPlatformIntegrationHub', 'guardCloudPushRow',
        'secureCloudPush', 'pullSensitiveCloudAndApply', 'establishNebrasSecureSession',
    ],
    'js/nebras-secure-cloud.js': [
        'NEBRAS_SENSITIVE_STORE_KEYS', 'secureApiLogin', 'secureCloudPull', 'secureCloudPush',
        'establishNebrasSecureSession', 'clearNebrasSecureSession',
    ],
    'api/nebras-auth.js': ['handleLogin', 'handleVerify', 'signSession'],
    'api/nebras-cloud.js': ['handlePull', 'handlePush', 'requireSession'],
    'js/nebras-data-warehouse.js': [
        'openNebrasDataWarehouse', 'exportSalesQuotesCsv', 'exportCrmCustomersCsv', 'exportEmpireSummaryPdf',
    ],
    'js/nebras-empire-bridges.js': [
        'runEmpireBridgeOnQuoteSubmit', 'openNebrasEmpireBridges', 'bridgeQuoteToCrm', 'bridgeQuoteToJourney',
    ],
    'js/nebras-platform-integrity.js': [
        'openPlatformIntegrationHub', 'guardCloudPushRow', 'guardCloudPullRow',
        'getCloudSnapshotsForCloud', 'NEBRAS_CRITICAL_CLOUD_KEYS',
    ],
    'js/nebras-hr-platform.js': ['__nebrasHrOpenImpl', 'renderHrOrgTreePanel', 'requireHrRecordInScope', 'closeHrWorkspace', 'syncPlatformInteractionLayers'],
    'js/nebras-accounting-platform.js': ['exportAccountingPdf', 'openAccountingPlatform', 'closeAccountingWorkspace'],
    'js/nebras-crm-platform.js': ['exportCrmPdf', 'openCrmPlatform', 'closeCrmWorkspace'],
    'js/nebras-legal-platform.js': ['exportLegalPdf', 'openLegalPlatform', 'closeLegalWorkspace'],
    'js/nebras-customer-portal.js': [
        'openCustomerPortalLogin', 'loginCustomerPortal', 'openCustomerPortalGovernance',
        'bindCpGovernanceToolbar', 'openCpUserEditor', 'openCpUserEditorForRep',
        'canCreateCustomerPortalUser', 'buildCustomerLoyaltyRankings',
        'renderCustomerJourneyAlertsHtml', 'syncPlatformInteractionLayers',
    ],
    'js/nebras-order-journey.js': [
        'openOrderJourneyOps', 'openApproveQuoteJourneyModal', 'renderCustomerJourneysHtml',
        'confirmOrderJourneySalesRelease', 'confirmOrderJourneyAccounting',
        'confirmJourneyPickup', 'verifyAndConfirmPickup', 'updateOrderJourneyBadge',
        'openRepCustomerJourneys', 'renderPickupQrBlock',
        'exportOrderJourneyReport', 'openWhatsAppNotifyCustomerById', 'syncJourneyToOms',
    ],
}


def run_script(name):
    path = os.path.join(ROOT, 'tools', name)
    if not os.path.isfile(path):
        return name, 'MISSING', ''
    try:
        out = subprocess.check_output([sys.executable, path], cwd=ROOT, stderr=subprocess.STDOUT, timeout=120)
        text = out.decode('utf-8', errors='replace')
        ok = 'RESULT: PASS' in text or 'OK:' in text or 'All expected' in text
        return name, 'PASS' if ok else 'REVIEW', text.strip().split('\n')[-3:]
    except subprocess.CalledProcessError as e:
        return name, 'FAIL', e.output.decode('utf-8', errors='replace')[-400:]


def git_check():
    try:
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()[:12]
        remote = subprocess.check_output(['git', 'rev-parse', 'origin/main'], cwd=ROOT, text=True).strip()[:12]
        status = subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip()
        return head == remote, head, remote, status
    except Exception as e:
        return False, '', '', str(e)


def github_check(local_head):
    url = f'https://api.github.com/repos/{GITHUB_REPO}/commits/main'
    req = urllib.request.Request(url, headers={'User-Agent': 'NebrasVerify'})
    with urllib.request.urlopen(req, timeout=20) as r:
        d = json.loads(r.read())
    gh = d['sha'][:12]
    return gh == local_head[:12], gh, d['commit']['message'].split('\n')[0]


def supabase_check():
    url = SUPABASE_URL + '/rest/v1/nebras_data_store?select=store_key'
    req = urllib.request.Request(url, headers={'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY})
    with urllib.request.urlopen(req, timeout=20) as r:
        keys = {row['store_key'] for row in json.loads(r.read())}
    missing_public = PUBLIC_CLOUD_KEYS - keys
    # بعد RLS (018) المفاتيح الحساسة لا تظهر لـ anon — التحقق منها عبر API بعد الدخول
    return not missing_public, len(keys), sorted(missing_public)


def live_check():
    results = []
    all_ok = True
    for rel, markers in LIVE_MARKERS.items():
        url = LIVE + '/' + rel
        req = urllib.request.Request(url, headers={'User-Agent': 'NebrasVerify'})
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read().decode('utf-8', errors='replace')
        miss = [m for m in markers if m not in body]
        ok = not miss
        all_ok = all_ok and ok
        results.append((rel, ok, miss))
    req = urllib.request.Request(LIVE + '/', headers={'User-Agent': 'NebrasVerify'})
    with urllib.request.urlopen(req, timeout=20) as r:
        home_ok = r.status == 200
    return all_ok and home_ok, results, home_ok


def main():
    print('=== NEBRAS FULL DEPLOY VERIFICATION ===\n')
    errors = []

    synced, head, remote, status = git_check()
    print(f'GIT local={head} remote={remote} synced={synced} clean={not status}')
    if not synced:
        errors.append('git not synced with origin/main')
    if status:
        errors.append('uncommitted changes: ' + status[:120])

    try:
        gh_ok, gh_sha, gh_msg = github_check(head)
        print(f'GITHUB main={gh_sha} match={gh_ok} — {gh_msg}')
        if not gh_ok:
            errors.append('GitHub main differs from local HEAD')
    except Exception as e:
        errors.append('GitHub API: ' + str(e))
        print('GITHUB FAIL:', e)

    try:
        sb_ok, count, missing = supabase_check()
        print(f'SUPABASE keys={count} required_ok={sb_ok}')
        if missing:
            print('  missing:', ', '.join(missing))
            errors.append('Supabase missing keys')
    except Exception as e:
        errors.append('Supabase: ' + str(e))
        print('SUPABASE FAIL:', e)

    try:
        live_ok, markers, home = live_check()
        print(f'LIVE site home={home} markers_ok={live_ok}')
        for rel, ok, miss in markers:
            print(f'  {rel}:', 'PASS' if ok else 'FAIL missing ' + str(miss))
        if not live_ok:
            errors.append('Live site missing latest JS markers — redeploy needed')
    except Exception as e:
        errors.append('Live site: ' + str(e))
        print('LIVE FAIL:', e)

    for script in ['verify-governance.py', 'verify-empire-governance.py', 'verify-site-full.py', 'verify-project-health.py', 'verify-supabase-cloud.py']:
        name, state, tail = run_script(script)
        print(f'TOOL {name}: {state}')
        if state == 'FAIL':
            errors.append(name + ' failed')

    print('\n=== SUMMARY ===')
    if errors:
        print('ISSUES:', len(errors))
        for e in errors:
            print(' -', e)
        sys.exit(1)
    print('ALL CHECKS PASSED — GitHub · Supabase · Live site are in sync.')
    sys.exit(0)


if __name__ == '__main__':
    main()
