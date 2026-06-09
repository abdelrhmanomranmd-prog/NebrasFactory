#!/usr/bin/env python3
"""Wrap profile inner-slide content in .bp-slide-mid for stable layout."""
import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'nebras-company-profile-2026.html')

SKIP_CLASSES = ('bp-page--cover', 'bp-page--opener', 'bp-page--back')


def patch_section(section: str) -> str:
    if 'bp-slide-mid' in section:
        return section
    if any(c in section for c in SKIP_CLASSES):
        return section
    if 'bp-page--inner' not in section and 'bp-page--toc' not in section and 'bp-page--contact' not in section:
        return section

    # Find first header (topbar or toc-head)
    m = re.search(r'(<header class="bp-(?:topbar|toc-head))', section)
    if not m:
        return section
    header_start = m.start()

    foot = section.rfind('<footer class="bp-page-foot"')
    if foot == -1:
        foot = section.rfind('<footer class="bp-back-foot"')
    if foot == -1:
        return section

    # Find end of opening header tag block
    header_end = section.find('</header>', header_start)
    if header_end == -1:
        # toc-head is not header tag - use toc-head div end
        header_end = section.find('</header>', header_start)
    if header_end == -1:
        return section
    header_end += len('</header>')

    before = section[:header_end]
    mid = section[header_end:foot]
    after = section[foot:]

    if not mid.strip():
        return section

    indented = '\n        '.join(line for line in mid.strip().split('\n'))
    wrapped = f'\n        <div class="bp-slide-mid">\n        {indented}\n        </div>\n    '
    return before + wrapped + after


def main():
    with open(HTML, encoding='utf-8') as f:
        text = f.read()

    parts = re.split(r'(?=    <!-- \d+)', text)
    out = [parts[0]]
    changed = 0
    for part in parts[1:]:
        sec_match = re.search(r'(<section class="bp-page[^>]*>.*?</section>)', part, re.S)
        if not sec_match:
            out.append(part)
            continue
        section = sec_match.group(1)
        new_section = patch_section(section)
        if new_section != section:
            changed += 1
        out.append(part.replace(section, new_section, 1))

    result = ''.join(out)
    with open(HTML, 'w', encoding='utf-8', newline='\n') as f:
        f.write(result)
    print(f'Patched {changed} sections in {HTML}')


if __name__ == '__main__':
    main()
