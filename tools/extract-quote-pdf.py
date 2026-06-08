#!/usr/bin/env python3
import json
import os
import sys

import fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = os.path.join(ROOT, 'documents', 'quote-a4-reference-template.pdf')
if not os.path.isfile(pdf):
    pdf = r'c:\Users\abdel\OneDrive\Desktop\م صالح - جده - 935 .pdf'

os.makedirs(os.path.join(ROOT, 'documents'), exist_ok=True)
doc = fitz.open(pdf)
print('PAGES', doc.page_count)
for i in range(doc.page_count):
    page = doc.load_page(i)
    text = page.get_text('text')
    out_txt = os.path.join(ROOT, 'documents', f'quote-a4-page{i+1}-text.txt')
    with open(out_txt, 'w', encoding='utf-8') as f:
        f.write(text)
    out_png = os.path.join(ROOT, 'documents', f'quote-a4-static-page{i+1}.png')
    if i > 0:
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        pix.save(out_png)
    print('saved', os.path.basename(out_txt), 'chars', len(text))
    if i == 0:
        out_p1 = os.path.join(ROOT, 'documents', 'quote-a4-page1-reference.png')
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        pix.save(out_p1)
doc.close()
