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
        for key in ['href','src','data-file-href','data-redirect-href']:
            if key in a: self.references.append((tag,key,a[key],a.get('rel','')))
        if tag=='script':
            self.in_script=True
            if a.get('type')!='application/ld+json' and (a.get('type')=='module' or 'src' not in a): self.modules.append(a)
    def handle_endtag(self,tag):
        if tag=='script': self.in_script=False
    def handle_data(self,d):
        if not self.in_script: self.text.append(d)
parsed={}
generated=json.loads((SITE/'generated-files.json').read_text())
for p in (SITE / name for name in generated if name.endswith('.html')):
    parser=Page(); parser.feed(p.read_text()); parsed[p.resolve()]=parser
    if parser.modules: errors.append(f'Nonportable runtime: {p.relative_to(SITE)}')
    if parser.html_attrs.get('lang')!='zh-CN': errors.append(f'Missing language: {p}')
    if 'main' not in parser.ids: errors.append(f'Missing main: {p}')
for p,parser in parsed.items():
    for tag,key,url,rel_value in parser.references:
        if tag=='base': continue
        if tag=='a' and key=='href' and not urlsplit(url).scheme:
            assert not re.search(r'(?:^|/)index(?:\.html)?(?:[?#]|$)',url), 'Online link should be clean: ' + url
        parts=urlsplit(url)
        if parts.scheme or parts.netloc:
            if key=='src': errors.append(f'External dependency: {url}')
            elif tag=='link':
                # Canonical and author links are crawl metadata, not resources the
                # browser must download for the portable copy to work.
                rel=set(rel_value.lower().split())
                if not rel.intersection({'canonical','author'}): errors.append(f'External dependency: {url}')
            continue
        if url.startswith('/'): errors.append(f'Absolute local reference: {p.name}: {url}'); continue
        dest=(p.parent / unquote(parts.path)).resolve() if parts.path else p
        if dest.is_dir(): dest=dest/'index.html'
        if not dest.is_file(): errors.append(f'Missing file: {p.relative_to(SITE)} -> {url}'); continue
        if parts.fragment and dest in parsed and unquote(parts.fragment) not in parsed[dest].ids:
            errors.append(f'Missing anchor: {p.relative_to(SITE)} -> {url}')
recovered=json.loads((ROOT/'site/content/articles.json').read_text())
assert len(recovered)==83
articles=[a for a in recovered+json.loads((ROOT/'site/content/additions.json').read_text()) if a['id']!='196']
def unwrap_source(line):
    pairs={'（':'）','(':')'}
    return line[1:-1].strip() if line and pairs.get(line[0])==line[-1] else line
for a in articles:
    p=SITE/'archives'/a['id']/'index.html'
    if not p.exists(): errors.append(f'Missing restored article {a["id"]}')
    elif re.sub(r'\s+','', a['title']) not in re.sub(r'\s+','', ''.join(parsed[p.resolve()].text)): errors.append(f'Missing title {a["id"]}')
    else:
        body=re.search(r'<div class="prose" id="article-body">(.*?)</div>',p.read_text(),re.S)
        content=Page(); content.feed(re.sub(r'<h2[^>]*data-chronicle-month="true"[^>]*>.*?</h2>', '', body[1] if body else '', flags=re.S))
        markup=p.read_text()
        assert re.search(r'<div[^>]*class="archive-notice"[^>]*hidden',markup), 'Archive note must remain frozen and hidden'
        assert re.search(r'<div[^>]*class="article-source"[^>]*hidden',markup), 'Source panel must remain frozen and hidden'
        assert '旧站存档 · 2021.04.19' not in markup
        expected_lines=[line.strip() for line in re.split(r'\n+',a['text']) if line.strip()]
        sources=[unwrap_source(line) for line in expected_lines if re.match(r'^[（(]?来源[：:]',line)]
        events=[line for line in expected_lines if not re.match(r'^[（(]?来源[：:]',line)]
        expected='\n'.join(sources+events)
        if re.sub(r'\s+','', ''.join(content.text)) != re.sub(r'\s+','',expected): errors.append(f'Altered or truncated content {a["id"]}')
        if re.search(r'（\d{4}年）',a['title']) and sources:
            source_position=markup.find('class="chronicle-source"')
            event_position=markup.find('class="chronicle-event"')
            if source_position < 0 or event_position < 0 or source_position > event_position:
                errors.append(f'Source is not first in chronicle {a["id"]}')
font_css=(SITE/'assets/fonts/embedded.css').read_text()
assert font_css.count('data:font/woff2;base64,')==2
assert 'https://' not in font_css
assert 'src="preview/assets/site.js"' in (ROOT/'index.html').read_text()
root_parser=Page(); root_parser.feed((ROOT/'index.html').read_text())
for tag,key,url,_ in root_parser.references:
    parts=urlsplit(url)
    if not parts.scheme and not parts.netloc and parts.path:
        dest=ROOT / unquote(parts.path)
        if dest.is_dir(): dest=dest/'index.html'
        assert dest.is_file(), 'Root entry broken: ' + url
assert (SITE/'assets/search-index.js').is_file()
modern=(SITE/'archives/category/现代史·大事记/index.html').read_text()
assert 'chronicle-opening' in modern and 'chronicle-intro' in modern
assert modern.count('分钟阅读')==61, 'All 61 years from 1949 to 2009 must be present'
assert 'data-file-href="../../71/index.html"' in modern, 'Chronicle category must link 2007 to article 71'
assert (SITE/'archives/71/index.html').is_file(), 'Article 71 must publish the 2007 chronicle'
assert not (SITE/'archives/2007').exists(), 'The former 2007 route must fall through to 404'
assert not (SITE/'archives/196').exists(), 'Retired chronicle overview must not be published'
assert '"id":"196"' not in (SITE/'assets/search-index.js').read_text(), 'Retired chronicle overview must not be searchable'
assert '"id":"71"' in (SITE/'assets/search-index.js').read_text(), 'The 2007 chronicle must be searchable as article 71'
assert '"id":"2007"' not in (SITE/'assets/search-index.js').read_text(), 'The former 2007 article ID must not be searchable'
assert 'data-retired-article-href=' in (SITE/'404.html').read_text(), 'Legacy article redirect must be available from the 404 page'
assert '存档暂缺' not in modern and '2007 年暂缺' not in modern
assert '以下按原站内容整理' not in modern
about=(SITE/'about/index.html').read_text()
assert '高中时期写的的那段「关于」' in about and '恢复的存档文章' in about
assert '旧站的那段「关于」' not in about and '今天，我们仍然相信这段话背后的愿望' not in about
assert '旧站“关于”页面说明，' not in about
assert '2007 年暂缺' not in about and '目前没有恢复出' not in about
assert '中国历史学习网（Chinese History Learning Network）是一个没有任何广告的非盈利性质网站' in about
if errors:
    print('\n'.join(errors)); raise SystemExit(f'{len(errors)} portable checks failed')
print(f'PASS: {len(parsed)} HTML pages; all local assets, links and anchors resolve; all {len(articles)} published articles present (83 recovered records retained); two embedded fonts; no module scripts or network dependencies.')
