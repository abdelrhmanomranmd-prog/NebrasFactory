#!/usr/bin/env python3
"""Verify empire governance: roles, branch scoping, sales manager flow, HQ dashboard."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = os.path.join(ROOT, 'js', 'nebras-platform.js')
CRM = os.path.join(ROOT, 'js', 'nebras-crm-platform.js')
HR = os.path.join(ROOT, 'js', 'nebras-hr-platform.js')
INDEX = os.path.join(ROOT, 'index.html')
ERRORS = []


def err(m):
    ERRORS.append(m)


def main():
    with open(JS, encoding='utf-8') as f:
        js = f.read()
    with open(CRM, encoding='utf-8') as f:
        crm = f.read()
    with open(HR, encoding='utf-8') as f:
        hr = f.read()
    with open(INDEX, encoding='utf-8') as f:
        html = f.read()

    required = (
        'NEBRAS_ROLE_DEFINITIONS', 'sales_manager', 'sales_rep', 'branch_manager',
        'wpc_manager', 'aluminum_manager', 'accounting_manager', 'canManageBranchTeam',
        'userBelongsToBranchTeam', 'openBranchTeamManagement', 'saveBranchRepFromEditor',
        'deleteBranchRep', 'filterErpEntriesForAdmin', 'assertErpEntryInAdminScope',
        'adminQuoteEntryVisible', 'assertQuoteAccess', 'repQuoteOwnedBy',
        'collectEmpireGovernanceStats', 'renderGovernanceEmpireOverviewStrip',
        'NEBRAS_GOVERNANCE_PILLARS', 'renderGovernancePillarsPanel', 'buildExecutiveReportData',
        'openExecutiveReports', 'openBranchCommandCenter', 'openSalesManagement',
        'openRepQuoteBuilder', 'isMainGovernanceAdmin',
    )
    for sym in required:
        if sym not in js:
            err(f'Missing governance symbol: {sym}')

    if 'dashboard-empire-overview-strip' not in html:
        err('dashboard-empire-overview-strip missing in index.html')

    if 'requireCrmRecordInScope' not in crm:
        err('CRM branch scope guard missing: requireCrmRecordInScope')
    if 'requireHrRecordInScope' not in hr:
        err('HR scope guard missing: requireHrRecordInScope')

    sm = re.search(r"sales_manager:\s*\{[^}]+\}", js, re.S)
    if not sm or 'branchScoped' not in sm.group(0):
        err('sales_manager must be branchScoped')
    if 'permissions: [\'quotes\']' not in js or 'quotesOnly' not in js:
        err('sales_rep quotes-only role incomplete')

    if 'openSalesManagement' not in js or 'openBranchTeamManagement' not in js:
        err('Sales manager branch flow incomplete')

    print('=== NEBRAS EMPIRE GOVERNANCE ===')
    print(f'ERRORS: {len(ERRORS)}')
    for e in ERRORS:
        print(f'  ERROR: {e}')
    if ERRORS:
        print('RESULT: FAILED')
        sys.exit(1)
    print('RESULT: PASS')
    sys.exit(0)


if __name__ == '__main__':
    main()
