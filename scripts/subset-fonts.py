"""Usage: python3 scripts/subset-fonts.py /path/NotoSerifSC.ttf /path/NotoSansSC.ttf
Requires fonttools and brotli; only needed when refreshing the bundled font subset.
"""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import base64, hashlib, json, sys
ROOT = Path(__file__).resolve().parents[1]
out = ROOT / 'site/public/assets/fonts'
texts = [chr(i) for i in range(32, 127)]
for folder in ['app', 'components', 'lib', 'content']:
    for p in (ROOT / 'site' / folder).rglob('*'):
        if p.suffix in {'.tsx', '.ts', '.json', '.css'}: texts.append(p.read_text())
texts.append('暂时没有找到相关内容全部篇文章搜索回到顶部关闭菜单打开菜单字分钟阅读年代来源存档资料正文放大缩小首页')
text = ''.join(texts)
css = []; info = []
for source, family, filename in zip(sys.argv[1:], ['History Serif', 'History Sans'], ['history-serif.woff2', 'history-sans.woff2']):
    font = TTFont(source)
    options = subset.Options(); options.flavor = 'woff2'; options.layout_features = ['*']; options.name_IDs = ['*']; options.name_legacy = True; options.name_languages = ['*']
    sub = subset.Subsetter(options=options); sub.populate(text=text); sub.subset(font)
    # Use distinct family names for these redistributed, subsetted derivatives.
    for record in font['name'].names:
        if record.nameID in (1, 4, 6, 16):
            value = family.replace(' ', '') if record.nameID == 6 else family
            record.string = value.encode(record.getEncoding(), errors='replace')
    font.flavor = 'woff2'; dest = out / filename; font.save(dest)
    data = dest.read_bytes()
    css.append('@font-face{font-family:"' + family + '";font-style:normal;font-weight:100 900;font-display:swap;src:url(data:font/woff2;base64,' + base64.b64encode(data).decode() + ') format("woff2");}')
    info.append({'family': family, 'file': filename, 'glyphs': len(font.getBestCmap()), 'bytes': len(data), 'source_sha256': hashlib.sha256(Path(source).read_bytes()).hexdigest(), 'sha256': hashlib.sha256(data).hexdigest()})
    print(f'{family}: {len(data):,} bytes, {len(font.getBestCmap())} characters')
(out / 'embedded.css').write_text('\n'.join(css))
(out / 'manifest.json').write_text(json.dumps(info, ensure_ascii=False, indent=2) + '\n')
