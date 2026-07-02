#!/usr/bin/env python3
"""Verify live quote page1 header + storage health markers."""
import re
import urllib.request

BASE = "https://www.nebrasplasticcompany.com"


def fetch(path, cache_bust=False):
    url = BASE + path
    if cache_bust and "?" not in path:
        url += "?_=" + str(__import__("time").time())
    req = urllib.request.Request(url, headers={
        "User-Agent": "NebrasVerify/179",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    })
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace"), r.status


def main():
    html, _ = fetch("/index.html", cache_bust=True)
    deploy = re.search(r'data-nebras-deploy="([^"]+)"', html)
    deploy_v = deploy.group(1) if deploy else "?"
    print("deploy:", deploy_v)
    print("quote css linked:", "19-quote-official-a4" in html)
    print("hrws179 in index:", "hrws179" in html)

    js, _ = fetch("/js/nebras-platform.js", cache_bust=True)
    checks = [
        ("html branded band", "quote-official-branded-band" in js),
        ("ensureQuoteOfficialPage1Header", "ensureQuoteOfficialPage1Header" in js),
        ("injectQuoteOfficialA4CriticalStyles", "injectQuoteOfficialA4CriticalStyles" in js),
        ("verifyQuoteA4AssetsHealth", "verifyQuoteA4AssetsHealth" in js),
        ("calcQuoteLineTotals", "calcQuoteLineTotals" in js),
        ("runQuoteA4HealthCheckForAdmin", "runQuoteA4HealthCheckForAdmin" in js),
    ]
    for label, ok in checks:
        print(label + ":", "OK" if ok else "MISSING")

    css, _ = fetch("/css/19-quote-official-a4.css", cache_bust=True)
    print("branded-band css:", ".quote-official-branded-band" in css)
    print("overflow visible fix:", "overflow: visible" in css)

    for asset in [
        "/documents/quote-a4-static-page2.png",
        "/documents/quote-a4-static-page3.png",
        "/documents/quote-a4-static-page4.png",
    ]:
        try:
            req = urllib.request.Request(
                BASE + asset, method="HEAD",
                headers={"User-Agent": "NebrasVerify/179", "Cache-Control": "no-cache"},
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                print(asset, r.status)
        except Exception as e:
            print(asset, "ERR", e)

    if deploy_v == "hrws179":
        print("\nLIVE STATUS: hrws179 deployed OK")
        return 0
    print("\nLIVE STATUS: still on", deploy_v, "— upload index.html + js/nebras-platform.js + css/19-quote-official-a4.css")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
