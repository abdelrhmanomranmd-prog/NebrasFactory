import re
import urllib.request

c = urllib.request.urlopen('https://www.nebrasplasticcompany.com/', timeout=45).read().decode('utf-8', 'replace')
m = re.search(r'data-nebras-deploy="([^"]+)"', c)
print('deploy:', m.group(1) if m else 'not found')
m2 = re.search(r'nebras-platform\.js\?v=([^"]+)', c)
print('js:', m2.group(1) if m2 else 'n/a')
