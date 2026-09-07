"""Split the bundled fonts into homepage/common and remaining characters.

Run after subset-fonts.py (fonttools[woff] required). Generated files are committed,
so ordinary site builds need only Python's standard library.
"""
from pathlib import Path
from html.parser import HTMLParser
from fontTools import subset
from fontTools.ttLib import TTFont
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site/public/assets/fonts'


class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.text = ''

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.text += data


def unicode_range(points):
    runs = []
    for point in sorted(points):
        if runs and point == runs[-1][1] + 1:
            runs[-1][1] = point
        else:
            runs.append([point, point])
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in runs)


def main():
    page = PageText()
    page.feed((ROOT / 'preview/index.html').read_text())
    common = set(map(ord, page.text)) | set(range(32, 127))
    css = []
    full_css = []
    manifest = []
    for family, stem in [('History Serif', 'history-serif'), ('History Sans', 'history-sans')]:
        source = OUT / f'{stem}.woff2'
        original = TTFont(source)
        cmap = original.getBestCmap()
        coverage = set(cmap)
        full_css.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:100 900;font-display:swap;src:url("{source.name}") format("woff2");}}')
        parts = [('common', coverage & common), ('text', coverage - common)]
        for label, points in parts:
            font = TTFont(source)
            options = subset.Options()
            options.layout_features = ['*']
            options.name_IDs = ['*']
            options.name_legacy = True
            options.name_languages = ['*']
            worker = subset.Subsetter(options=options)
            worker.populate(unicodes=points)
            worker.subset(font)
            # Verify that segmentation changes neither coverage nor advance widths.
            part_cmap = font.getBestCmap()
            assert set(part_cmap) == points
            for point, glyph in part_cmap.items():
                assert font['hmtx'][glyph] == original['hmtx'][cmap[point]]
            font.flavor = 'woff2'
            # Prose uses the original whole subset to preserve shaping across
            # character boundaries. The homepage needs only the common partition.
            filename = f'{stem}-common.woff2' if label == 'common' else source.name
            if label == 'common':
                font.save(OUT / filename)
            data = (OUT / filename).read_bytes()
            ranges = unicode_range(points)
            css.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:100 900;font-display:swap;src:url("{filename}") format("woff2");unicode-range:{ranges};}}')
            manifest.append({'family': family, 'file': filename, 'part': label, 'glyphs': len(points), 'unicodeRange': ranges, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            print(f'{filename}: {len(data):,} bytes, {len(points)} characters')
    (OUT / 'fonts-home.css').write_text('\n'.join(css) + '\n')
    (OUT / 'fonts.css').write_text('\n'.join(full_css) + '\n')
    (OUT / 'subsets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
