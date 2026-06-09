#!/usr/bin/env python3
"""Generate Nebras company profile PDF from nebras-company-profile-2026.html."""
import http.server
import os
import socket
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'nebras-company-profile-2026.html')
OUT = os.path.join(ROOT, 'documents', 'nebras-company-profile-2026.pdf')


def ensure_playwright():
    try:
        from playwright.sync_api import sync_playwright
        return sync_playwright
    except ImportError:
        print('Playwright غير مثبت.')
        print('بديل فوري: افتح nebras-company-profile-2026.html ثم «حفظ PDF / طباعة»')
        print('أو ثبّت يدوياً: pip install playwright && playwright install chromium')
        sys.exit(2)


def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(('127.0.0.1', 0), handler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, port


def main():
    if not os.path.isfile(HTML):
        print('ERROR: missing', HTML)
        sys.exit(1)

    sync_playwright = ensure_playwright()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)

    os.chdir(ROOT)
    httpd, port = start_server()
    url = f'http://127.0.0.1:{port}/nebras-company-profile-2026.html'

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(url, wait_until='networkidle', timeout=180000)
            page.wait_for_timeout(2000)
            page.pdf(
                path=OUT,
                format='A4',
                print_background=True,
                margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'},
                prefer_css_page_size=True,
            )
            browser.close()
    finally:
        httpd.shutdown()

    size_kb = os.path.getsize(OUT) // 1024
    print('OK:', OUT, f'({size_kb} KB)')
    print('Source:', HTML)


if __name__ == '__main__':
    main()
