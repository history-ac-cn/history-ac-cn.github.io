import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { primaryArticles, chronicleHref } from '../site/lib/chronicle-editions.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, 'site/public');
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.history.ac.cn').replace(/\/$/, '');
const parsedSiteUrl = new URL(`${siteUrl}/`);
if (!['http:', 'https:'].includes(parsedSiteUrl.protocol)) throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) URL.');

const excludedArticleIds = new Set(['196']);
const articleGroups = await Promise.all(
  ['articles', 'additions'].map(async name =>
    JSON.parse(await fs.readFile(path.join(root, `site/content/${name}.json`), 'utf8')),
  ),
);
const originals = articleGroups
  .flat()
  .filter(article => !excludedArticleIds.has(article.id));
const editions = JSON.parse(await fs.readFile(path.join(root, 'site/content/chronicles-2019.json'), 'utf8'));
const articles = primaryArticles(originals, editions);
const categories = ['古代史', '近代史', '现代史·大事记'];
const routes = [
  '/',
  '/about/',
  ...categories.map(category => `/archives/category/${category}/`),
  ...articles.map(article => `/archives/${article.id}/`),
  ...editions.filter(article => article.primaryEdition !== '2019').flatMap(article => [chronicleHref(article.id, '2019'), chronicleHref(article.id, 'compare')]),
];
const absolute = route => new URL(route.replace(/^\//, ''), `${siteUrl}/`).href;
const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${escapeXml(absolute(route))}</loc></url>`).join('\n')}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${absolute('/sitemap.xml')}\n`;

await fs.mkdir(publicDir, { recursive: true });
await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemap);
await fs.writeFile(path.join(publicDir, 'robots.txt'), robots);
console.log(`SEO files: ${routes.length} canonical URLs for ${siteUrl}.`);
