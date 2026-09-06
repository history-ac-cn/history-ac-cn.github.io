"""Check every page, local reference, original article ID, and portable runtime contract."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re
ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'preview'
errors = []
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.references=[]; self.ids=set(); self.modules=[]; self.text=[]; self.in_script=False; self.html_attrs={}
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='html': self.html_attrs=a
        if 'id' in a: self.ids.add(a['id'])
        for key in ['href','src']:
            if key in a: self.references.append((tag,key,a[key]))
        if tag=='script':
            self.in_script=True
            if a.get('type')=='module' or 'src' not in a: self.modules.append(a)
    def handle_endtag(self,tag):
        if tag=='script': self.in_script=False
    def handle_data(self,d):
        if not self.in_script: self.text.append(d)
parsed={}
for p in SITE.rglob('*.html'):
    parser=Page(); parser.feed(p.read_text()); parsed[p.resolve()]=parser
    if parser.modules: errors.append(f'Nonportable runtime: {p.relative_to(SITE)}')
    if parser.html_attrs.get('lang')!='zh-CN': errors.append(f'Missing language: {p}')
    if 'main' not in parser.ids: errors.append(f'Missing main: {p}')
for p,parser in parsed.items():
    for tag,key,url in parser.references:
        if tag=='base': continue
        parts=urlsplit(url)
        if parts.scheme or parts.netloc:
            if key=='src' or tag=='link': errors.append(f'External dependency: {url}')
            continue
        if url.startswith('/'): errors.append(f'Absolute local reference: {p.name}: {url}'); continue
        dest=(p.parent / unquote(parts.path)).resolve() if parts.path else p
        if not dest.is_file(): errors.append(f'Missing file: {p.relative_to(SITE)} -> {url}'); continue
        if parts.fragment and dest in parsed and unquote(parts.fragment) not in parsed[dest].ids:
            errors.append(f'Missing anchor: {p.relative_to(SITE)} -> {url}')
articles=json.loads((ROOT/'site/content/articles.json').read_text())
assert len(articles)==83
for a in articles:
    p=SITE/'archives'/a['id']/'index.html'
    if not p.exists(): errors.append(f'Missing restored article {a["id"]}')
    elif re.sub(r'\s+','', a['title']) not in re.sub(r'\s+','', ''.join(parsed[p.resolve()].text)): errors.append(f'Missing title {a["id"]}')
    else:
        body=re.search(r'<div class="prose" id="article-body">(.*?)</div>',p.read_text(),re.S)
        content=Page(); content.feed(body[1] if body else '')
        if re.sub(r'\s+','', ''.join(content.text)) != re.sub(r'\s+','',a['text']): errors.append(f'Altered or truncated content {a["id"]}')
font_css=(SITE/'assets/fonts/embedded.css').read_text()
assert font_css.count('data:font/woff2;base64,')==2
assert 'https://' not in font_css
assert 'src="preview/assets/site.js"' in (ROOT/'index.html').read_text()
root_parser=Page(); root_parser.feed((ROOT/'index.html').read_text())
for tag,key,url in root_parser.references:
    parts=urlsplit(url)
    if not parts.scheme and not parts.netloc and parts.path:
        assert (ROOT / unquote(parts.path)).is_file(), 'Root entry broken: ' + url
assert (SITE/'assets/search-index.js').is_file()
if errors:
    print('\n'.join(errors)); raise SystemExit(f'{len(errors)} portable checks failed')
print(f'PASS: {len(parsed)} HTML pages; all local assets, links and anchors resolve; all 83 articles present; two embedded fonts; no module scripts or network dependencies.')
