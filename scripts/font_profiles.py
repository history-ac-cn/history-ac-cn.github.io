"""Shared, standard-library helpers for the portable site's font profiles."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / 'site/public/assets/fonts'


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.text = ''

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip = True
        for key, value in attrs:
            if key in ('placeholder', 'aria-label', 'alt', 'title', 'value') and value:
                self.text += value

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.text += data


def dynamic_characters():
    # Include all UI strings, punctuation and ASCII input, even if not initially
    # visible. Search excerpts/input can use any character: its sans stays whole.
    text = ''.join((ROOT / 'site/public/assets' / name).read_text()
                   for name in ('site.js', 'theme.js', 'navigation.js'))
    return set(map(ord, text)) | set(range(32, 127))


def page_characters(html):
    page = PageText()
    page.feed(html)
    return set(map(ord, page.text))


def article_profiles():
    profiles = {}
    for filename in ('articles.json', 'additions.json', 'chronicles-2019.json'):
        for article in json.loads((ROOT / 'site/content' / filename).read_text()):
            match = re.search(r'大事记（(\d{4})年）', article['title'])
            if match:
                profiles[article['id']] = f'chronicles-{int(match[1]) // 10 * 10}'
            else:
                profiles[article['id']] = 'history'
    return profiles


def profile_for(relative, articles):
    match = re.match(r'archives/(\d+)/', relative)
    if match:
        return articles.get(match[1], 'history')
    if relative.startswith('archives/category/'):
        return 'catalog'
    return {'index.html': 'home', '404.html': '404'}.get(relative, relative.split('/')[0])
