"""Reproducibly extract archived WordPress articles without executing archived HTML."""
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class Clean(HTMLParser):
    allowed = {'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a'}
    def __init__(self):
        super().__init__(); self.parts = []; self.text = []; self.headings = []; self.heading = None; self.blocked = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'script', 'style', 'iframe'}: self.blocked += 1
        if self.blocked: return
        if tag not in self.allowed: return
        extra = ''
        if tag == 'a':
            url = attrs.get('href', '')
            match = re.search(r'/archives/(\d+)', url)
            if match: url = '/archives/' + match[1] + '/'
            elif url.startswith('https://www.history.ac.cn/archives/category/'):
                url = url.replace('https://www.history.ac.cn', '').rstrip('/') + '/'
            elif url.startswith('http'):
                url = 'https://web.archive.org/web/20210419051634/' + url
            else: url = '#'
            extra = ' href="' + html.escape(url, quote=True) + '"'
        if tag in {'h2', 'h3', 'h4'}:
            self.heading = {'id': 'section-' + str(len(self.headings)), 'title': ''}
            self.headings.append(self.heading); extra = ' id="' + self.heading['id'] + '"'
        self.parts.append('<' + tag + extra + '>')
    def handle_endtag(self, tag):
        if tag in {'script', 'style', 'iframe'}: self.blocked = max(0, self.blocked - 1); return
        if self.blocked: return
        if tag in self.allowed and tag != 'br': self.parts.append('</' + tag + '>')
        if tag in {'p', 'li', 'h2', 'h3', 'h4'}: self.text.append('\n')
        if tag in {'h2', 'h3', 'h4'}: self.heading = None
    def handle_data(self, data):
        if self.blocked: return
        self.parts.append(html.escape(data)); self.text.append(data)
        if self.heading is not None: self.heading['title'] += data

source = (ROOT / 'recovery/home-20210419051634.html').read_text()
articles = []
for block in re.findall(r'<article\b.*?</article>', source, re.S):
    id = re.search(r'id="post-(\d+)"', block)[1]
    title = html.unescape(re.sub('<[^>]+>', '', re.search(r'<h2 class="entry-title">(.*?)</h2>', block, re.S)[1]))
    body = re.search(r'<div class="entry-content">(.*?)</div><!-- .entry-content -->', block, re.S)[1]
    # Turn existing bold section labels into semantic headings; wording stays intact.
    body = re.sub(r'<p class="has-medium-font-size"><strong>(.*?)</strong>.*?</p>', r'<h2>\1</h2>', body, flags=re.S)
    parser = Clean(); parser.feed(body)
    text = re.sub(r'[ \t\xa0]+', ' ', ''.join(parser.text)).strip()
    category = html.unescape(re.search(r'rel="category tag">(.*?)</a>', block)[1])
    paragraphs = [p.strip() for p in text.split('\n') if p.strip() and not p.strip().startswith('来源')]
    articles.append({'id': id, 'title': title, 'category': category, 'html': ''.join(parser.parts).strip(), 'text': text, 'excerpt': (paragraphs[0][:100] if paragraphs else ''), 'headings': parser.headings, 'minutes': max(1, round(len(text) / 500)), 'source': '中华人民共和国年鉴' if '中华人民共和国年鉴' in text else '旧站存档', 'archiveUrl': 'https://web.archive.org/web/20210419051634/https://www.history.ac.cn/archives/' + id})
(ROOT / 'site/content/articles.json').write_text(json.dumps(articles, ensure_ascii=False, indent=2) + '\n')
print(f'Recovered {len(articles)} articles, {sum(len(a["text"]) for a in articles):,} characters.')
