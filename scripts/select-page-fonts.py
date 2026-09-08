"""Select safe, prepared font profiles without font-processing dependencies."""
from font_profiles import ROOT, FONT_DIR, article_profiles, profile_for, page_characters, dynamic_characters
from pathlib import Path
import hashlib
import json
import re
import sys


def main():
    site = Path(sys.argv[1])
    # Work from this build's page list, never from user files in the output tree.
    pages = json.loads(sys.stdin.read())
    manifest = json.loads((FONT_DIR / 'optimized/manifest.json').read_text())
    for name, digest in manifest['originals'].items():
        if hashlib.sha256((FONT_DIR / name).read_bytes()).hexdigest() != digest:
            raise SystemExit('Original fonts changed. Run scripts/optimize-page-fonts.py after refreshing fonts.')
    coverage = set(map(ord, manifest['coverage']))
    dynamic = dynamic_characters()
    articles = article_profiles()
    counts = {}
    for relative in pages:
        if not relative.endswith('.html'):
            continue
        page = site / relative
        html = page.read_text()
        group = profile_for(relative, articles)
        profile = manifest['profiles'].get(group)
        needed = (page_characters(html) | dynamic) & coverage
        # New copy must never lose existing glyphs or split shaping runs. Use
        # the original font pair until the optional preparation step is rerun.
        safe = profile and needed <= set(map(ord, profile['characters']))
        css = f'optimized/{profile["css"]}' if safe else 'fonts.css'
        html, changed = re.subn(r'(?<=assets/fonts/)(?:optimized/[^"<>]+|fonts(?:-home)?\.css)(?=")', css, html)
        assert changed == 1, f'{relative}: missing or duplicated font stylesheet'
        page.write_text(html)
        counts[group if safe else 'full-font fallback'] = counts.get(group if safe else 'full-font fallback', 0) + 1
    print('Page fonts: ' + ', '.join(f'{group} {count}' for group, count in sorted(counts.items())))


if __name__ == '__main__':
    main()
