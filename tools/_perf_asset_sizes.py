# -*- coding: utf-8 -*-
import re
import time
import urllib.request
from pathlib import Path

base = "https://www.nebrasplasticcompany.com"
t0 = time.time()
html = urllib.request.urlopen(base + "/", timeout=40).read().decode("utf-8", "replace")
print("html_ms", int((time.time() - t0) * 1000), "bytes", len(html))
m = re.search(r'data-nebras-deploy="([^"]+)"', html)
v = m.group(1) if m else "x"
print("deploy", v)
scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
print("script_count", len(scripts))
css = re.findall(r'href="([^"]+\.css[^"]*)"', html)
print("css_count", len(css))
total = 0
for p in scripts:
    if p.startswith("http"):
        url = p
        label = p.split("/")[-1][:40]
    else:
        url = base + "/" + p.lstrip("/")
        if "?v=" not in url and "hrws" not in url:
            url = url + ("&" if "?" in url else "?") + "v=" + v
        label = p.split("?")[0]
    try:
        t1 = time.time()
        b = len(urllib.request.urlopen(url, timeout=40).read())
        total += b
        print(f"{b:8d}  {int((time.time()-t1)*1000):4d}ms  {label}")
    except Exception as e:
        print("ERR", label, e)
print("TOTAL_JS_BYTES", total)
