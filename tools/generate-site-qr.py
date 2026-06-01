#!/usr/bin/env python3
"""Generate PNG QR code for the Nebras public website."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'images', 'nebras-site-qr.png')
URL = 'https://www.nebrasplasticcompany.com'


def main():
    try:
        import qrcode
    except ImportError:
        print('Installing qrcode...')
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'qrcode[pil]', '-q'])
        import qrcode

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color='#0d2840', back_color='white')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT)
    print('OK:', OUT, '→', URL)


if __name__ == '__main__':
    main()
