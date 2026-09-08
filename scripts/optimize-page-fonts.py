"""Prepare complete fonts shared by page type / chronicle decade.

Run after a build with fonttools[woff]. Normal builds use the committed outputs
and need only the standard library. No unicode-range partitions: each family
shapes a whole run using one file, preserving punctuation and prose line breaks.
"""
from fontTools import subset
from fontTools.ttLib import TTFont
from pathlib import Path
from font_profiles import ROOT, FONT_DIR, article_profiles, profile_for, page_characters, dynamic_characters
import hashlib
import json
import shutil
import tempfile


def main():
    site = ROOT / 'preview'
    articles = article_profiles()
    groups = {}
    for relative in json.loads((site / 'generated-files.json').read_text()):
        if relative.endswith('.html'):
            group = profile_for(relative, articles)
            groups.setdefault(group, set()).update(page_characters((site / relative).read_text()))
    dynamic = dynamic_characters()
    originals = json.loads((FONT_DIR / 'manifest.json').read_text())
    coverage = set(TTFont(FONT_DIR / originals[0]['file']).getBestCmap())
    assert all(set(TTFont(FONT_DIR / item['file']).getBestCmap()) == coverage for item in originals)
    manifest = {'version': 1, 'originals': {item['file']: item['sha256'] for item in originals},
                'coverage': ''.join(map(chr, sorted(coverage))), 'profiles': {}}
    staging = Path(tempfile.mkdtemp(prefix='history-page-fonts-'))
    try:
        for group, chars in sorted(groups.items()):
            needed = (chars | dynamic) & coverage
            css = []
            fonts = []
            for original in originals:
                source = FONT_DIR / original['file']
                full = TTFont(source, recalcTimestamp=False)
                cmap = full.getBestCmap()
                # Search replaces sans excerpts with arbitrary body text. Keep
                # its complete sans font; serif is only used by static headings.
                if group == 'search' and original['family'] == 'History Sans':
                    filename = '../' + source.name
                    data = source.read_bytes()
                else:
                    font = TTFont(source, recalcTimestamp=False)
                    options = subset.Options()
                    options.layout_features = ['*']
                    options.name_IDs = ['*']
                    options.name_legacy = True
                    options.name_languages = ['*']
                    worker = subset.Subsetter(options=options)
                    worker.populate(unicodes=needed)
                    worker.subset(font)
                    assert set(font.getBestCmap()) == needed
                    for point, glyph in font.getBestCmap().items():
                        assert font['hmtx'][glyph] == full['hmtx'][cmap[point]]
                    assert font['fvar'].compile(font) == full['fvar'].compile(full)
                    font.flavor = 'woff2'
                    temp = staging / 'font.woff2'
                    font.save(temp)
                    data = temp.read_bytes()
                    filename = source.stem + '-' + hashlib.sha256(data).hexdigest()[:12] + '.woff2'
                    temp.rename(staging / filename)
                css.append(f'@font-face{{font-family:"{original["family"]}";font-style:normal;font-weight:100 900;font-display:swap;src:url("{filename}") format("woff2");}}')
                fonts.append({'family': original['family'], 'file': filename, 'bytes': len(data),
                              'sha256': hashlib.sha256(data).hexdigest()})
            css_text = '\n'.join(css) + '\n'
            css_name = f'{group}-{hashlib.sha256(css_text.encode()).hexdigest()[:12]}.css'
            (staging / css_name).write_text(css_text)
            manifest['profiles'][group] = {'characters': ''.join(map(chr, sorted(needed))), 'css': css_name, 'fonts': fonts}
            print(f'{group}: {len(needed)} characters, {sum(font["bytes"] for font in fonts):,} font bytes', flush=True)
        (staging / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        destination = FONT_DIR / 'optimized'
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(staging, destination)
    finally:
        shutil.rmtree(staging)


if __name__ == '__main__':
    main()
