#!/usr/bin/env python3
"""Check each profile slide fits A4 without overflow or excessive empty space."""
import http.server
import json
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'nebras-company-profile-2026.html')
A4_H_PX = 1123  # 297mm @ 96dpi


def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(('127.0.0.1', 0), handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, port


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('SKIP: playwright not installed')
        sys.exit(0)

    os.chdir(ROOT)
    httpd, port = start_server()
    url = f'http://127.0.0.1:{port}/nebras-company-profile-2026.html'

    js = """
    () => {
      const pages = [...document.querySelectorAll('.bp-page')];
      return pages.map((pg, i) => {
        const label = pg.querySelector('.bp-topbar-page')?.textContent?.trim()
          || pg.querySelector('.bp-toc-head h1')?.textContent?.trim()
          || pg.className.replace(/bp-page\\s*/g, '').trim()
          || ('page-' + (i + 1));
        const kids = [...pg.children].filter(c =>
          !c.classList.contains('bp-slab-bg') &&
          !c.classList.contains('bp-page-deco') &&
          !c.classList.contains('bp-watermark')
        );
        let overflowKids = 0;
        kids.forEach(k => {
          const r = k.getBoundingClientRect();
          const pr = pg.getBoundingClientRect();
          if (r.bottom > pr.bottom + 2 || r.top < pr.top - 2) overflowKids++;
        });
        const scrollH = pg.scrollHeight;
        const clientH = pg.clientHeight;
        const foot = pg.querySelector('.bp-page-foot, .bp-back-foot');
        const footRect = foot ? foot.getBoundingClientRect() : null;
        const pgRect = pg.getBoundingClientRect();
        const gapBottom = footRect ? (pgRect.bottom - footRect.bottom) : 0;
        return {
          index: i + 1,
          label,
          scrollH,
          clientH,
          overflow: scrollH - clientH,
          overflowKids,
          gapBottom: Math.round(gapBottom),
          classes: pg.className
        };
      });
    }
    """

    errors = []
    warnings = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width': 794, 'height': A4_H_PX})
            page.goto(url, wait_until='networkidle', timeout=180000)
            page.wait_for_timeout(1500)
            rows = page.evaluate(js)
            browser.close()
    finally:
        httpd.shutdown()

    print('=== PROFILE SLIDE FIT CHECK ===')
    for r in rows:
        status = 'OK'
        if r['overflow'] > 8 or r['overflowKids'] > 0:
            status = 'OVERFLOW'
            errors.append(r)
        elif r['gapBottom'] > 80:
            status = 'GAP'
            warnings.append(r)
        print(f"  [{r['index']:02d}] {status:8s} overflow={r['overflow']:4d}px gap={r['gapBottom']:3d}px kids={r['overflowKids']} | {r['label']}")

    print(f"\nERRORS: {len(errors)}")
    print(f"WARNINGS: {len(warnings)}")
    if errors:
        print('OVERFLOW PAGES:', ', '.join(str(e['index']) for e in errors))
        sys.exit(1)
    print('RESULT: PASS')
    sys.exit(0)


if __name__ == '__main__':
    main()
