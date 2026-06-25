#!/usr/bin/env python3
"""تصفير بيانات HR التجريبية من السحابة (الإنتاج)."""
import json
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'
HR_KEYS = [
    'hr_employees', 'hr_vehicles', 'hr_leave', 'hr_vehicle_tracking', 'hr_attendance',
    'hr_documents', 'hr_payroll', 'hr_companies', 'hr_travel', 'hr_deductions',
    'hr_advances', 'hr_vehicle_violations', 'hr_notifications', 'hr_notif_settings',
    'hr_email_queue', 'hr_shift_roster', 'hr_dept_activity', 'hr_gps_positions',
    'hr_gps_settings', 'hr_gps_consents',
]


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasHrPurge/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def main():
    print('=== PURGE DEMO HR CLOUD ===')
    login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login['token']
    rows = [{'store_key': k, 'payload': [] if k != 'hr_gps_settings' else {}} for k in HR_KEYS]
    res = api('POST', '/api/nebras-governance-persist', {'action': 'batch', 'rows': rows}, token=token)
    print('persist:', res)
    pull = api('GET', '/api/nebras-cloud?action=pull&keys=hr_employees,hr_vehicles', token=token)
    for row in pull.get('rows', []):
        p = row.get('payload')
        print(row['store_key'], ':', len(p) if isinstance(p, list) else p)
    print('DONE')
    return 0 if res.get('ok') else 1


if __name__ == '__main__':
    raise SystemExit(main())
