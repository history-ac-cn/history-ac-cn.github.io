/** Convert pre-rendered HTML to a portable static site: no server, modules, or fetch. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const exported = path.join(root, 'site/dist/client');
const output = path.join(root, 'preview');
const recoveredArticles = JSON.parse(await fs.readFile(path.join(root, 'site/content/articles.json'), 'utf8'));
const additions = JSON.parse(await fs.readFile(path.join(root, 'site/content/additions.json'), 'utf8'));
const excludedArticleIds = new Set(['196']);
const articles = [...recoveredArticles, ...additions].filter(article => !excludedArticleIds.has(article.id));
const categoryAliases = new Map(['现代史', '大事记'].map(name => [`/archives/category/${name}`, '/archives/category/现代史·大事记']));
const walk = async dir => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat();
const htmlFiles = (await walk(exported)).filter(f => f.endsWith('.html'));
if (htmlFiles.length < 90) throw new Error(`Expected at least 90 exported pages; got ${htmlFiles.length}.`);
const routeMap = new Map();
for (const file of htmlFiles) {
  let relative = decodeURIComponent(path.relative(exported, file));
  if (relative !== 'index.html' && relative !== '404.html' && !relative.endsWith('/index.html')) relative = relative.replace(/\.html$/, '/index.html');
  const original = '/' + decodeURIComponent(path.relative(exported, file)).replace(/(?:\/index)?\.html$/, '').replace(/^index$/, '');
  routeMap.set(original.replace(/\/$/, '') || '/', relative);
}
const toRelative = (url, page) => {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const parsed = new URL(url.replaceAll('&amp;', '&'), 'https://portable.invalid');
  const pathname = decodeURIComponent(parsed.pathname);
  const key = pathname.replace(/\/$/, '') || '/';
  const target = routeMap.get(categoryAliases.get(key) || key) || pathname.replace(/^\//, '');
  return (path.relative(path.dirname(page), target) || 'index.html').split(path.sep).join('/') + parsed.search.replaceAll('&', '&amp;') + parsed.hash;
};
// These directories contain generated files only. Recreate them so stale pages
// and operating-system conflict copies cannot survive a new build.
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
const written = [];
async function write(relative, data) {
  const file = path.join(output, relative); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, data); written.push(relative);
}
for (const file of await walk(path.join(root, 'site/public/assets'))) {
  if (file.endsWith('search-index.js')) continue;
  await write(path.join('assets', path.relative(path.join(root, 'site/public/assets'), file)), await fs.readFile(file));
}
for (const name of ['sitemap.xml', 'robots.txt']) {
  await write(name, await fs.readFile(path.join(root, 'site/public', name)));
}
await write('CNAME', await fs.readFile(path.join(root, 'CNAME')));
for (const file of (await walk(exported)).filter(file => file.endsWith('.css') && file.includes('/_next/'))) {
  await write(path.relative(exported, file), await fs.readFile(file));
}
const index = articles.map(({ id, title, text, excerpt, category }) => ({ id, title, text, excerpt, category: ['现代史', '大事记'].includes(category) ? '现代史·大事记' : category }));
const searchScript = 'window.HISTORY_SEARCH = ' + JSON.stringify(index).replaceAll('<', '\\u003c') + ';\n';
await write('assets/search-index.js', searchScript);
for (const file of htmlFiles) {
  const rawRoute = '/' + decodeURIComponent(path.relative(exported, file)).replace(/(?:\/index)?\.html$/, '').replace(/^index$/, '');
  const relative = routeMap.get(rawRoute.replace(/\/$/, '') || '/');
  let html = await fs.readFile(file, 'utf8');
  // React RSC payloads and runtime modules are build intermediates, not site dependencies.
  html = html.replace(/<script\b(?![^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b(?=[^>]*\brel="(?:modulepreload|preload|prefetch)")[^>]*>/gi, '');
  html = html.replace(/\sdata-(?:rsc-css-href|precedence)="[^"]*"/g, '');
  html = html.replace(/<html\b/, '<html data-portable="true"');
  html = html.replace(/\b(href|src)="([^"]+)"/g, (_, attr, url) => {
    const local = toRelative(url, relative);
    if (attr === 'href' && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(local) && /(?:^|\/)index\.html(?=[?#]|$)/.test(local)) {
      const clean = local.replace(/(^|\/)index\.html(?=[?#]|$)/, (_, slash) => slash || './');
      return `href="${clean}" data-file-href="${local}"`;
    }
    return `${attr}="${local}"`;
  });
  const redirect = categoryAliases.get(rawRoute.replace(/\/$/, ''));
  if (redirect) html = html.replace('<html ', `<html data-redirect-href="${toRelative(redirect, relative)}" `);
  if (relative === '404.html') {
    html = html.replace('<html ', `<html data-not-found="true" data-retired-article-href="${toRelative('/archives/category/现代史·大事记', relative)}" `);
    html = html.replace(/<title>.*?<\/title>/, '<title>页面未找到 · 中国历史学习网</title>');
    if (process.env.PAGES_BUILD === 'true') {
      const pagesBase = (process.env.PAGES_BASE_PATH || '').replace(/\/$/, '') + '/';
      if (!/^\/[a-zA-Z0-9_./-]*$/.test(pagesBase) || pagesBase.startsWith('//')) throw new Error('Invalid Pages base path');
      html = html.replace('<head>', `<head><base href="${pagesBase}">`);
    }
  }
  // Set active navigation from the exported page, independent of browser hydration.
  html = html.replace(/(<nav class="main-nav[^]*?<\/nav>)/, nav => nav.replace(/ aria-current="page"/g, '').replace(/<a\b([^>]*href="([^"]+)"[^>]*)>/g, (a, attrs, href) => {
    const current = path.resolve(output, path.dirname(relative), href.endsWith('/') ? href + 'index.html' : href);
    const destination = path.resolve(output, relative);
    if (current === destination) return `<a${attrs} aria-current="page">`;
    return a;
  }));
  html = html.replace('</head>', `<script src="${toRelative('/assets/theme.js', relative)}"></script></head>`);
  const scripts = `<script src="${toRelative('/assets/navigation.js', relative)}" defer></script>` + (relative.startsWith('search/') ? `<script src="${toRelative('/assets/search-index.js', relative)}" defer></script>` : '') + `<script src="${toRelative('/assets/site.js', relative)}" defer></script>`;
  html = html.replace('</body>', scripts + '</body>');
  await write(relative, html);
}
// A portable 404 also helps GitHub Pages visitors recover from obsolete links.
let home = await fs.readFile(path.join(output, 'index.html'), 'utf8');
if (!written.includes('404.html')) {
  const missing = home.replace(/<title>.*?<\/title>/, '<title>页面未找到 · 中国历史学习网</title>').replace(/<main\b[^]*?<\/main>/, '<main id="main" class="shell missing-page"><span class="eyebrow">404 · A PAGE OUT OF TIME</span><h1>这一页，还未寻回。</h1><p>这个地址不存在，或尚未从旧站存档中恢复。</p><a class="primary-link" href="index.html">回到首页 →</a></main>');
  await write('404.html', missing);
}
await write('.nojekyll', '');
// A complete root-level home page uses the exact same assets and pages.
const rootHome = home.replace(/\b(href|src)="([^"]+)"/g, (_, attr, url) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return `${attr}="${url}"`;
  return `${attr}="preview/${url}"`;
});
await fs.writeFile(path.join(root, 'index.html'), rootHome);
const root404 = (await fs.readFile(path.join(output, '404.html'), 'utf8')).replace(/<base[^>]*>/g, '').replace(/\b(href|src)="([^"]+)"/g, (_, attr, url) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url) ? `${attr}="${url}"` : `${attr}="preview/${url}"`);
await fs.writeFile(path.join(root, '404.html'), root404);
await fs.writeFile(path.join(output, 'generated-files.json'), JSON.stringify(written, null, 2) + '\n');
const publish = path.join(root, 'site/dist/pages');
await fs.rm(publish, { recursive: true, force: true });
await fs.mkdir(publish, { recursive: true });
for (const relative of written) {
  const destination = path.join(publish, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(output, relative), destination);
}
await fs.writeFile(path.join(publish, 'generated-files.json'), JSON.stringify(written, null, 2) + '\n');
console.log(`Portable site: ${htmlFiles.length} pages (including 404), ${written.length} files. Open index.html at the repository root.`);
