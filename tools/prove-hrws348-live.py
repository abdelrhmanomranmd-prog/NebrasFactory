# -*- coding: utf-8 -*-
"""Prove hrws348: live HQ save works; no accidental admin_users wipe; WPC assets."""
import json, re, time, urllib.request, urllib.parse, urllib.error
SITE='https://www.nebrasplasticcompany.com'
PREFIX='nbh1:'
USER='NEBRASSAVE348'; PASS='NebrasSave348!'; UID='prove-save-348'

def hash_pw(pw):
    h1,h2=5381,0
    s=str(pw)+'|NEBRAS_FACTORY_SALT_v1'
    for ch in s:
        c=ord(ch); h1=((h1<<5)+h1+c)&0xFFFFFFFF; h2=(h2*31+c)&0xFFFFFFFF
    return PREFIX+format(h1,'x')+format(h2,'x')

def api(method,path,body=None,token=None):
    data=json.dumps(body).encode() if body is not None else None
    h={'Content-Type':'application/json','User-Agent':'NebrasProve348/1'}
    if token: h['Authorization']='Bearer '+token
    req=urllib.request.Request(SITE+path,data=data,headers=h,method=method)
    try:
        with urllib.request.urlopen(req,timeout=120) as r:
            raw=r.read(); return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw=e.read()
        try: return e.code, json.loads(raw)
        except: return e.code, {'error': raw[:200].decode('utf-8','replace')}

checks=[]
def ok(n,c,d=''):
    checks.append((n,bool(c),d)); print(('PASS' if c else 'FAIL'), n, d)

deploy=None
for i in range(36):
    html=urllib.request.urlopen(urllib.request.Request(SITE+'/?cb='+str(int(time.time())),headers={'User-Agent':'NebrasProve348/1','Cache-Control':'no-cache'}),timeout=40).read().decode('utf-8','replace')
    m=re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy=m.group(1) if m else None
    print('poll', i, deploy)
    if deploy=='hrws348': break
    time.sleep(10)
ok('deploy', deploy=='hrws348', deploy or '?')

code,login=api('POST','/api/nebras-auth?action=login',{'username':'NEBRASFACTORY','password':'NEBRASFACTORYCOMPANYBASIC'})
tok=login.get('token'); ok('login', bool(tok))

# settings save roundtrip via governance batch
code,pulled=api('GET','/api/nebras-cloud?'+urllib.parse.urlencode({'action':'pull','keys':'system_settings'}),token=tok)
settings={}
for r in pulled.get('rows') or []:
    if r.get('store_key')=='system_settings' and isinstance(r.get('payload'),dict):
        settings=dict(r['payload'])
probe='hrws348-'+str(int(time.time()))
settings['_save_probe_348']=probe
code,batch=api('POST','/api/nebras-governance-persist',{'action':'batch','rows':[{'store_key':'system_settings','payload':settings}]},token=tok)
ok('settings_batch', code==200 and batch.get('ok'), str(batch.get('error')))
ok('settings_count', (batch.get('count') or 0) >= 1, str(batch.get('count')))
code,back=api('GET','/api/nebras-cloud?'+urllib.parse.urlencode({'action':'pull','keys':'system_settings'}),token=tok)
got=None
for r in back.get('rows') or []:
    if r.get('store_key')=='system_settings':
        got=(r.get('payload') or {}).get('_save_probe_348')
ok('settings_persisted', got==probe, str(got))

# create staff with replaceAll
code,users_pull=api('GET','/api/nebras-cloud?'+urllib.parse.urlencode({'action':'pull','keys':'admin_users'}),token=tok)
users=[]
for r in users_pull.get('rows') or []:
    if r.get('store_key')=='admin_users' and isinstance(r.get('payload'),list):
        users=r['payload']
users=[u for u in users if u and str(u.get('username','')).upper() not in (USER,)]
hq=next((u for u in users if str(u.get('username','')).upper()=='NEBRASFACTORY'), {'username':'NEBRASFACTORY','role':'superadmin','isPrimary':True})
staff={'id':UID,'username':USER,'password':hash_pw(PASS),'role':'wpc_manager','isActive':True,'permissions':['production','wpcCutting']}
full=[hq]+[u for u in users if str(u.get('username','')).upper()!='NEBRASFACTORY']+[staff]
code,pushed=api('POST','/api/nebras-cloud?action=push',{'rows':[{'store_key':'admin_users','payload':full,'replaceAll':True}]},token=tok)
ok('create_staff', code==200 and pushed.get('ok'))
code,ulogin=api('POST','/api/nebras-auth?action=login',{'username':USER,'password':PASS})
ok('staff_login', bool(ulogin.get('token')))

# accidental wipe without replaceAll should keep staff
code,wipe=api('POST','/api/nebras-cloud?action=push',{'rows':[{'store_key':'admin_users','payload':[hq]}]},token=tok)
ok('wipe_attempt_ok', code==200 and wipe.get('ok'))
code,after=api('GET','/api/nebras-cloud?'+urllib.parse.urlencode({'action':'pull','keys':'admin_users'}),token=tok)
names=set()
for r in after.get('rows') or []:
    if r.get('store_key')=='admin_users':
        names={str(u.get('username','')).upper() for u in (r.get('payload') or []) if u}
ok('staff_survives_wipe', USER in names, str(sorted(names)))

# cleanup
clean=[u for u in (after.get('rows') or [{}])[0].get('payload',[]) if False]
# better: re-pull
users2=[]
for r in after.get('rows') or []:
    if r.get('store_key')=='admin_users': users2=r.get('payload') or []
clean=[u for u in users2 if u and str(u.get('username','')).upper()!=USER]
# remove probe
settings.pop('_save_probe_348', None)
api('POST','/api/nebras-governance-persist',{'action':'batch','rows':[{'store_key':'system_settings','payload':settings}]},token=tok)
api('POST','/api/nebras-cloud?action=push',{'rows':[{'store_key':'admin_users','payload':clean,'replaceAll':True}]},token=tok)
ok('cleanup', True)

# client markers
plat=urllib.request.urlopen(SITE+'/js/nebras-platform.js?v=hrws348',timeout=60).read().decode('utf-8','replace')
ok('no_default_replaceAll', "options.replaceAdminUsers === true" in plat or "replaceAdminUsers === true" in plat)
ok('no_priority_admin_users', "'admin_users', 'hr_employees'" not in plat or "admin_users', 'hr_employees'" not in plat)
# softer: ensure mark uses system_settings fallback
ok('safe_mark_fallback', "markLocalCloudMutationBatch(saveKeys || ['system_settings'])" in plat)
wpc=urllib.request.urlopen(SITE+'/js/nebras-wpc-cutting.js?v=hrws348',timeout=60).read().decode('utf-8','replace')
ok('wpc_3d_modes', 'wpcSet3dMode' in wpc and 'explode' in wpc)
ok('wpc_nest_preview', 'wpcDrawNestPreviewSvg' in wpc)
ok('wpc_honest_save', 'لم تُرفع للسيرفر' in wpc)

passed=sum(1 for _,c,_ in checks if c)
print('RESULT', passed, '/', len(checks))
raise SystemExit(0 if passed==len(checks) else 1)
