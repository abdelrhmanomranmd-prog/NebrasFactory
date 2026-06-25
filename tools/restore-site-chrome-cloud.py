#!/usr/bin/env python3
"""استعادة واجهة الموقع في السحابة — شركاء · فروع (ليست بيانات تجريبية)."""
import json
import urllib.error
import urllib.request

SITE = 'https://www.nebrasplasticcompany.com'

SITE_PARTNERS = [
    {'id': 'partner-amana-qassim', 'nameAr': 'أمانة منطقة القصيم', 'nameEn': 'Al-Qassim Municipality',
     'logoUrl': 'images/partners/partner-amana-qassim.png', 'linkUrl': '', 'sortOrder': 1, 'visible': True, 'logoOnly': True},
    {'id': 'partner-najd-chemicals', 'nameAr': 'كيمياء نجد التجارية', 'nameEn': 'Najd Chemicals Trading',
     'logoUrl': 'images/partners/partner-najd-chemicals.png', 'linkUrl': '', 'sortOrder': 2, 'visible': True, 'logoOnly': True},
    {'id': 'partner-trading-industry', 'nameAr': 'تجارة وصناعة ومقاولات', 'nameEn': 'Trading, Industry & Contracting',
     'logoUrl': 'images/partners/partner-trading-industry.png', 'linkUrl': '', 'sortOrder': 3, 'visible': True, 'logoOnly': True},
    {'id': 'partner-golden-materials', 'nameAr': 'شركة المواد الذهبية — إعمار الأسطورة', 'nameEn': 'Golden Materials Company',
     'logoUrl': 'images/partners/partner-golden-materials.png', 'linkUrl': '', 'sortOrder': 4, 'visible': True, 'logoOnly': True},
    {'id': 'partner-amwaj-polymeric', 'nameAr': 'مصنع أمواج اللدائن', 'nameEn': 'Amwaj Polymeric',
     'logoUrl': 'images/partners/partner-amwaj-polymeric.png', 'linkUrl': '', 'sortOrder': 5, 'visible': True, 'logoOnly': True},
    {'id': 'partner-aramco', 'nameAr': 'أرامكو السعودية', 'nameEn': 'Saudi Aramco',
     'logoUrl': 'images/partners/partner-aramco.png', 'linkUrl': '', 'sortOrder': 6, 'visible': True, 'logoOnly': True},
    {'id': 'partner-traffic', 'nameAr': 'الأمن العام — المرور', 'nameEn': 'Saudi Traffic Department',
     'logoUrl': 'images/partners/partner-traffic.png', 'linkUrl': '', 'sortOrder': 7, 'visible': True, 'logoOnly': True},
    {'id': 'partner-red-crescent', 'nameAr': 'هيئة الهلال الأحمر السعودي', 'nameEn': 'Saudi Red Crescent Authority',
     'logoUrl': 'images/partners/partner-red-crescent.png', 'linkUrl': '', 'sortOrder': 8, 'visible': True, 'logoOnly': True},
    {'id': 'partner-national-guard', 'nameAr': 'وزارة الحرس الوطني', 'nameEn': 'Ministry of National Guard',
     'logoUrl': 'images/partners/partner-national-guard.png', 'linkUrl': '', 'sortOrder': 9, 'visible': True, 'logoOnly': True},
    {'id': 'partner-housing', 'nameAr': 'وزارة الإسكان', 'nameEn': 'Ministry of Housing',
     'logoUrl': 'images/partners/partner-housing.png', 'linkUrl': '', 'sortOrder': 10, 'visible': True, 'logoOnly': True},
    {'id': 'partner-health', 'nameAr': 'وزارة الصحة', 'nameEn': 'Ministry of Health',
     'logoUrl': 'images/partners/partner-health.png', 'linkUrl': '', 'sortOrder': 11, 'visible': True, 'logoOnly': True},
    {'id': 'partner-qassim-university', 'nameAr': 'جامعة القصيم', 'nameEn': 'Qassim University',
     'logoUrl': 'images/partners/partner-qassim-university.png', 'linkUrl': '', 'sortOrder': 12, 'visible': True, 'logoOnly': True},
    {'id': 'partner-police', 'nameAr': 'الأمن العام — الشرطة', 'nameEn': 'Saudi Public Security',
     'logoUrl': 'images/partners/partner-police.png', 'linkUrl': '', 'sortOrder': 13, 'visible': True, 'logoOnly': True},
]

BRANCHES = [
    {'id': 1, 'city': 'القصيم - الفرع الرئيسي', 'city_en': 'Qassim — Main Branch', 'city_zh': '盖西姆（总部）',
     'salesPhone': '0555092383', 'image': 'branch-qassim-main.jpg'},
    {'id': 2, 'city': 'الرياض', 'city_en': 'Riyadh', 'city_zh': '利雅得', 'salesPhone': '0536694464', 'image': 'branch-riyadh.jpg'},
    {'id': 3, 'city': 'المدينة', 'city_en': 'Madinah', 'city_zh': '麦地那', 'salesPhone': '0558358306', 'image': 'branch-madinah.webp'},
    {'id': 4, 'city': 'الأحساء', 'city_en': 'Al-Ahsa', 'city_zh': '艾赫萨', 'salesPhone': '0558818530', 'image': 'branch-ahsa.jpg'},
    {'id': 5, 'city': 'خميس مشيط', 'city_en': 'Khamis Mushait', 'city_zh': '海米斯穆谢特', 'salesPhone': '0554501661', 'image': 'branch-khamis-mushait.jpg'},
    {'id': 6, 'city': 'تبوك', 'city_en': 'Tabuk', 'city_zh': '塔布ك', 'salesPhone': '0555278214', 'image': 'branch-tabuk.jpg'},
    {'id': 7, 'city': 'جدة', 'city_en': 'Jeddah', 'city_zh': '吉达', 'salesPhone': '96655710226', 'image': 'branch-jeddah.jpg'},
]


def api(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {'Content-Type': 'application/json', 'User-Agent': 'NebrasChromeRestore/1'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(SITE + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def main():
    print('=== RESTORE SITE CHROME ===')
    login = api('POST', '/api/nebras-auth?action=login', {
        'username': 'NEBRASFACTORY',
        'password': 'NEBRASFACTORYCOMPANYBASIC'
    })
    token = login['token']
    rows = [
        {'store_key': 'site_partners', 'payload': SITE_PARTNERS},
        {'store_key': 'branches', 'payload': BRANCHES},
    ]
    res = api('POST', '/api/nebras-governance-persist', {'action': 'batch', 'rows': rows}, token=token)
    print('persist:', res)
    try:
        pull = api('GET', '/api/nebras-cloud?action=pull&keys=site_partners,branches', token=token)
        for row in pull.get('rows', []):
            p = row.get('payload')
            print(row['store_key'], ':', len(p) if isinstance(p, list) else p)
    except urllib.error.HTTPError as err:
        print('pull skipped:', err.code, err.reason)
    print('DONE')
    return 0 if res.get('ok') else 1


if __name__ == '__main__':
    raise SystemExit(main())
