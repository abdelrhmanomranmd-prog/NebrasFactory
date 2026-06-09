#!/usr/bin/env python3
"""Profile slide check under print/PDF layout (A4 exact)."""
import http.server
import os
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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
        return

    os.chdir(ROOT)
    httpd, port = start_server()
    url = f'http://127.0.0.1:{port}/nebras-company-profile-2026.html'

    js = """
    () => {
      const pages = [...document.querySelectorAll('.bp-page')];
      const out = [];
      pages.forEach((pg, i) => {
        const label = pg.querySelector('.bp-topbar-page')?.textContent?.trim() || ('p' + (i+1));
        const kids = [...pg.children].filter(c =>
          !['bp-slab-bg','bp-page-deco','bp-watermark'].some(x => c.classList.contains(x))
        );
        let overlaps = [];
        for (let a = 0; a < kids.length; a++) {
          for (let b = a + 1; b < kids.length; b++) {
            const ra = kids[a].getBoundingClientRect();
            const rb = kids[b].getBoundingClientRect();
            const inter = !(ra.bottom <= rb.top + 1 || rb.bottom <= ra.top + 1);
            if (inter && Math.abs(ra.top - rb.top) > 2) {
              overlaps.push([kids[a].className.slice(0,30), kids[b].className.slice(0,30)]);
            }
          }
        }
        const pr = pg.getBoundingClientRect();
        const hidden = kids.filter(k => {
          const r = k.getBoundingClientRect();
          return r.bottom > pr.bottom + 1 || r.top < pr.top - 1;
        }).map(k => k.className.slice(0,40));
        const main = kids.filter(k => !k.classList.contains('bp-page-foot') && !k.classList.contains('bp-topbar'));
        const topEl = main[0], botEl = main[main.length-1];
        const used = botEl && topEl ? (botEl.getBoundingClientRect().bottom - topEl.getBoundingClientRect().top) : 0;
        const fillPct = pr.height ? Math.round((used / pr.height) * 100) : 0;
        out.push({ index: i+1, label, hidden: hidden.length, fillPct, overlaps: overlaps.length, scroll: pg.scrollHeight - pg.clientHeight });
      });
      return out;
    }
    """

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.emulate_media(media='print')
            page.set_viewport_size({'width': 794, 'height': 1123})
            page.goto(url, wait_until='networkidle', timeout=180000)
            page.wait_for_timeout(2000)
            rows = page.evaluate(js)
            browser.close()
    finally:
        httpd.shutdown()

    print('=== PROFILE PRINT LAYOUT ===')
    bad = []
    for r in rows:
        flag = []
        if r['hidden']: flag.append('hidden=' + str(r['hidden']))
        if r['overlaps']: flag.append('overlap=' + str(r['overlaps']))
        if r['scroll'] > 5: flag.append('scroll+' + str(r['scroll']))
        if r['fillPct'] < 72: flag.append('fill=' + str(r['fillPct']) + '%')
        status = 'WARN' if flag else 'OK'
        if flag: bad.append(r)
        print(f"  [{r['index']:02d}] {status:4s} fill={r['fillPct']:3d}% {' '.join(flag)} | {r['label']}")
    print(f"ISSUES: {len(bad)}")
    sys.exit(1 if any(r['hidden'] or r['overlaps'] or r['scroll'] > 5 for r in rows) else 0)


if __name__ == '__main__':
    main()
