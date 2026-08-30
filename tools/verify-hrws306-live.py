#!/usr/bin/env python3
"""Verify hrws306 — white diamond grid, fast login, server-first persist."""
import sys
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'


def fetch(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'NebrasVerify/1', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def fetch_text(path):
    return fetch(path).decode('utf-8', 'replace')


def main():
    html = fetch_text('/')
    js = fetch_text('/js/nebras-platform.js?v=hrws306')
    theme = fetch_text('/css/20-profile-2026-theme.css?v=hrws306')
    artistry = fetch_text('/css/66-nebras-navy-white-artistry.css?v=hrws306')
    workspace = fetch_text('/css/09-nebras-workspace.css?v=hrws306')
    login = js.split('async function loginAdmin()')[1].split('const DASHBOARD_ROLE_FOCUS')[0]

    checks = {
        'deploy_hrws306': 'data-nebras-deploy="hrws306"' in html,
        'theme_on_body': 'nebras-profile-2026-theme' in html,
        'theme_css_v': 'css/20-profile-2026-theme.css?v=hrws306' in html,
        'grid_theme': 'background-size: 22px 22px' in theme and '#f7f8fb' in theme,
        'grid_artistry': 'background-size: 22px 22px' in artistry,
        'header_transparent': 'body.nebras-profile-2026-theme header' in theme and 'background: transparent' in theme,
        'workspace_grid': 'background-size: 22px 22px' in workspace,
        'dashboard_before_session': 'showAdminDashboard(user)' in login and login.find('showAdminDashboard(user)') < login.find('establishNebrasSecureSession'),
        'session_background': 'secure session background' in login,
        'lang_deferred': ', 2000)' in login,
        'server_first': 'const NEBRAS_SERVER_FIRST_MODE = true' in js,
    }
    ok = all(checks.values())
    for k, v in checks.items():
        print(('PASS' if v else 'FAIL'), k)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
