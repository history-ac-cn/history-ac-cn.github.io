"""Check every page's resource budget and online/offline font contracts."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from font_profiles import article_profiles, profile_for, page_characters, dynamic_characters
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'preview'
FONT_DIR = SITE / 'assets/fonts'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = set()
        self.fonts = None
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'img') and attrs.get('src'):
            self.resources.add(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon'):
            self.resources.add(attrs['href'])
        if attrs.get('id') == 'site-fonts':
            self.fonts = attrs
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs)


def resolve(page, url):
    parsed = urlsplit(url)
    assert not parsed.scheme and not parsed.netloc, f'Unexpected external resource: {url}'
    resource = (page.parent / unquote(parsed.path)).resolve()
    assert resource.is_relative_to(SITE) and resource.is_file(), f'Missing resource: {resource}'
    return resource


manifest = json.loads((FONT_DIR / 'optimized/manifest.json').read_text())
coverage = set(map(ord, manifest['coverage']))
dynamic = dynamic_characters()
articles = article_profiles()
for filename, digest in manifest['originals'].items():
    assert hashlib.sha256((FONT_DIR / filename).read_bytes()).hexdigest() == digest, 'Original font changed.'
for name, profile in manifest['profiles'].items():
    css_path = FONT_DIR / 'optimized' / profile['css']
    css = css_path.read_text()
    assert css_path.stat().st_size < 1000 and css.count('@font-face') == 2
    assert 'unicode-range' not in css, 'Reading fonts must preserve continuous shaping runs.'
    assert 'data:' not in css and 'http' not in css
    assert set(map(ord, profile['characters'])) <= coverage
    for font in profile['fonts']:
        data = (css_path.parent / font['file']).read_bytes()
        assert len(data) == font['bytes'] and hashlib.sha256(data).hexdigest() == font['sha256']
        assert f'url("{font["file"]}")' in css
        assert 'font-weight:100 900' in css and 'font-display:swap' in css
    if name == 'search':
        assert next(font['file'] for font in profile['fonts'] if font['family'] == 'History Sans') == '../history-sans.woff2', 'Search needs the whole sans font for arbitrary excerpts/input.'

generated = json.loads((SITE / 'generated-files.json').read_text())
report = []
fallbacks = []
for relative in generated:
    if not relative.endswith('.html'):
        continue
    path = SITE / relative
    html = path.read_text()
    page = Page()
    page.feed(html)
    group = profile_for(relative, articles)
    profile = manifest['profiles'].get(group)
    needed = (page_characters(html) | dynamic) & coverage
    safe = profile and needed <= set(map(ord, profile['characters']))
    expected = f'/fonts/optimized/{profile["css"]}' if safe else '/fonts/fonts.css'
    assert page.fonts and page.fonts['href'].endswith(expected), f'{relative}: incorrect online fonts'
    assert page.fonts['data-file-href'].endswith('/fonts/embedded.css'), f'{relative}: no offline font fallback'
    assert not any(url.endswith('embedded.css') for url in page.resources), f'{relative}: online embedded fonts'
    loads_search = any(url.endswith('/search-index.js') for url in page.resources)
    assert loads_search == relative.startswith('search/'), f'{relative}: unexpected search index loading'
    assert all('defer' in script for script in page.scripts), f'{relative}: blocking external script'
    assert len(page.scripts) == (3 if loads_search else 2), f'{relative}: unexpected script request'
    resources = {resolve(path, url) for url in page.resources} | {path}
    font_css_path = resolve(path, page.fonts['href'])
    font_files = {resolve(font_css_path, url) for url in re.findall(r'url\("([^\"]+)"\)', font_css_path.read_text())}
    resources |= font_files
    total = sum(resource.stat().st_size for resource in resources)
    if not safe:
        fallbacks.append(relative)
    # New copy can use the safe whole-font fallback until profiles are refreshed.
    budget = (2_100_000 if loads_search else 1_650_000) if not safe else {
        'home': 450_000, 'about': 650_000, 'catalog': 650_000,
        '404': 350_000, 'history': 1_000_000, 'search': 1_750_000,
    }.get(group, 1_100_000)
    assert total < budget, f'{relative}: {total:,} resource bytes exceed {budget:,}; refresh font profiles or inspect resources.'
    assert path.stat().st_size < 170_000, f'{relative}: unexpectedly large HTML'
    for resource in resources:
        if resource.suffix == '.css':
            assert resource.stat().st_size < 80_000, f'{relative}: large render-blocking CSS'
    report.append({'page': relative, 'group': group, 'bytes': total, 'fontBytes': sum(font.stat().st_size for font in font_files), 'requests': len(resources)})

assert (SITE / 'assets/logo-header.webp').stat().st_size < 35_000
assert (SITE / 'assets/logo-about.webp').stat().st_size < 145_000
assert (SITE / 'assets/favicon.png').stat().st_size < 15_000
assert (SITE / 'assets/search-index.js').stat().st_size < 500_000
print(f'PASS: resource budgets for all {len(report)} pages, complete font profiles, deferred scripts, offline fonts and search-only index.')
for group in sorted({entry['group'] for entry in report}):
    entries = [entry for entry in report if entry['group'] == group]
    print(f'  {group}: {len(entries)} pages; {min(entry["bytes"] for entry in entries):,}–{max(entry["bytes"] for entry in entries):,} bytes before HTTP compression')
if fallbacks:
    print('Font preparation suggested (safe whole-font fallback): ' + ', '.join(fallbacks))
