"""Check shipped resource budgets and online/offline font loading contracts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'preview'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = set()
        self.fonts = None
        self.skip = False
        self.text = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style'):
            self.skip = True
        if tag in ('script', 'img') and attrs.get('src'):
            self.resources.add(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon'):
            self.resources.add(attrs['href'])
        if attrs.get('id') == 'site-fonts':
            self.fonts = attrs

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.text += data


def points(ranges):
    result = set()
    for part in ranges.split(','):
        bounds = part.removeprefix('U+').split('-')
        result.update(range(int(bounds[0], 16), int(bounds[-1], 16) + 1))
    return result


generated = json.loads((SITE / 'generated-files.json').read_text())
for relative in generated:
    if not relative.endswith('.html'):
        continue
    page = Page()
    page.feed((SITE / relative).read_text())
    expected_fonts = '/fonts/fonts-home.css' if relative == 'index.html' else '/fonts/fonts.css'
    assert page.fonts and page.fonts['href'].endswith(expected_fonts), f'{relative}: incorrect online fonts'
    assert page.fonts['data-file-href'].endswith('/fonts/embedded.css'), f'{relative}: no offline font fallback'
    assert not any(url.endswith('embedded.css') for url in page.resources), f'{relative}: online embedded fonts'
    loads_search = any(url.endswith('/search-index.js') for url in page.resources)
    assert loads_search == relative.startswith('search/'), f'{relative}: unexpected search index loading'

font_dir = SITE / 'assets/fonts'
css = (font_dir / 'fonts-home.css').read_text()
assert (font_dir / 'fonts.css').stat().st_size < 1000
assert len(css.encode()) < 32_000, 'Font declarations must remain small and render without embedded font data.'
assert 'data:' not in css and 'http' not in css
subsets = json.loads((font_dir / 'subsets.json').read_text())
originals = json.loads((font_dir / 'manifest.json').read_text())
for original in originals:
    parts = [p for p in subsets if p['family'] == original['family']]
    coverage = set()
    for part in parts:
        chars = points(part['unicodeRange'])
        assert not coverage & chars, 'Font subsets must not overlap.'
        coverage |= chars
        data = (font_dir / part['file']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == part['sha256']
        assert len(data) == part['bytes'] and len(chars) == part['glyphs']
        assert f'url("{part["file"]}")' in css
    assert len(coverage) == original['glyphs'], 'Font segmentation must retain all existing characters.'

home = Page()
home.feed((SITE / 'index.html').read_text())
resources = {(SITE / unquote(urlsplit(url).path)).resolve() for url in home.resources}
home_chars = set(map(ord, home.text))
for part in subsets:
    if home_chars & points(part['unicodeRange']):
        resources.add((font_dir / part['file']).resolve())
resources.add(SITE / 'index.html')
total = sum(file.stat().st_size for file in resources)
assert total < 450_000, f'Homepage needs {total:,} bytes; refresh common font subsets or inspect new resources.'
for resource in resources:
    if resource.suffix == '.css':
        assert resource.stat().st_size < 80_000, 'Unexpectedly large render-blocking CSS.'
assert (SITE / 'assets/logo-header.webp').stat().st_size < 35_000
assert (SITE / 'assets/logo-about.webp').stat().st_size < 145_000
assert (SITE / 'assets/favicon.png').stat().st_size < 15_000
print(f'PASS: homepage resources {total:,} bytes before HTTP compression; small CSS, on-demand font subsets, offline fallback, and search-only index.')
