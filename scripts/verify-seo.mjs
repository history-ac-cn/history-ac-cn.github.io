/** Verify the SEO contract in the final portable and GitHub Pages artifact. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, 'preview');
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.history.ac.cn').replace(/\/$/, '');
const articles = (
  await Promise.all(
    ['articles', 'additions'].map(async name =>
      JSON.parse(await fs.readFile(path.join(root, `site/content/${name}.json`), 'utf8')),
    ),
  )
).flat().filter(article => article.id !== '196');
const categories = ['古代史', '近代史', '现代史·大事记'];
const canonicalRoutes = [
  '/',
  '/about/',
  ...categories.map(category => `/archives/category/${category}/`),
  ...articles.map(article => `/archives/${article.id}/`),
];
const pageFile = route => route === '/'
  ? path.join(output, 'index.html')
  : path.join(output, route.replace(/^\//, ''), 'index.html');
const absolute = route => new URL(route.replace(/^\//, ''), `${siteUrl}/`).href;
const decodeEntities = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'");
const tagAttributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1].toLowerCase(), decodeEntities(match[2])]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => tagAttributes(match[0]));
const meta = (html, key, value) => tags(html, 'meta').find(attributes => attributes[key] === value)?.content;
const canonicalLinks = html => tags(html, 'link').filter(attributes => attributes.rel?.split(/\s+/).includes('canonical')).map(attributes => attributes.href);
const robotsValues = html => tags(html, 'meta').filter(attributes => attributes.name === 'robots').map(attributes => attributes.content || '');
const jsonLd = html => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(match => JSON.parse(match[1]));
const schemaTypes = value => {
  const found = [];
  const visit = item => {
    if (!item || typeof item !== 'object') return;
    if (typeof item['@type'] === 'string') found.push(item['@type']);
    for (const child of Object.values(item)) Array.isArray(child) ? child.forEach(visit) : visit(child);
  };
  visit(value);
  return found;
};
const errors = [];
const check = (condition, message) => { if (!condition) errors.push(message); };

check(articles.length === 83, `Expected 83 published articles; found ${articles.length}.`);
check(canonicalRoutes.length === 88, `Expected 88 canonical routes; found ${canonicalRoutes.length}.`);

for (const route of canonicalRoutes) {
  const file = pageFile(route);
  let html;
  try { html = await fs.readFile(file, 'utf8'); }
  catch { errors.push(`Missing canonical page: ${route}`); continue; }
  const label = route === '/' ? 'home page' : route;
  const canonical = canonicalLinks(html);
  const expected = absolute(route);
  const rootForms = route === '/' ? new Set([siteUrl, `${siteUrl}/`]) : new Set([expected]);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
  const description = meta(html, 'name', 'description') || '';
  check(canonical.length === 1, `${label}: expected one canonical link; found ${canonical.length}.`);
  check(canonical.length === 1 && rootForms.has(canonical[0]), `${label}: incorrect canonical URL ${canonical[0] || '(missing)'}.`);
  check(title.includes('中国历史学习网'), `${label}: title does not name the site.`);
  check(description.length >= 20 && description.length <= 180, `${label}: description length is ${description.length}.`);
  check(meta(html, 'property', 'og:title')?.length > 0, `${label}: missing og:title.`);
  check(meta(html, 'property', 'og:description') === description, `${label}: Open Graph description differs from meta description.`);
  check(rootForms.has(meta(html, 'property', 'og:url')), `${label}: incorrect og:url.`);
  check(meta(html, 'property', 'og:image') === absolute('/assets/logo.png'), `${label}: incorrect og:image.`);
  check(meta(html, 'name', 'twitter:card') === 'summary', `${label}: missing Twitter card.`);
  check(meta(html, 'name', 'twitter:description') === description, `${label}: Twitter description differs from meta description.`);
  check(!robotsValues(html).some(value => /\bnoindex\b/i.test(value)), `${label}: canonical page is marked noindex.`);
  try { check(jsonLd(html).length > 0, `${label}: missing JSON-LD.`); }
  catch (error) { errors.push(`${label}: invalid JSON-LD (${error.message}).`); }
}

for (const article of articles) {
  const route = `/archives/${article.id}/`;
  const html = await fs.readFile(pageFile(route), 'utf8');
  const description = meta(html, 'name', 'description') || '';
  let types = [];
  try { types = jsonLd(html).flatMap(schemaTypes); }
  catch (error) { errors.push(`${route}: invalid article JSON-LD (${error.message}).`); }
  check(description.startsWith(`${article.title}：`), `${route}: description lacks article context.`);
  check(meta(html, 'property', 'og:type') === 'article', `${route}: og:type must be article.`);
  check(types.includes('Article'), `${route}: missing Article schema.`);
  check(types.includes('BreadcrumbList'), `${route}: missing BreadcrumbList schema.`);
}

const combinedCanonical = absolute('/archives/category/现代史·大事记/');
for (const alias of ['现代史', '大事记']) {
  const route = `/archives/category/${alias}/`;
  const html = await fs.readFile(pageFile(route), 'utf8');
  check(robotsValues(html).some(value => /\bnoindex\b/i.test(value)), `${route}: legacy alias must be noindex.`);
  check(canonicalLinks(html).length === 1 && canonicalLinks(html)[0] === combinedCanonical, `${route}: legacy alias must canonicalize to the combined category.`);
}

const searchHtml = await fs.readFile(pageFile('/search/'), 'utf8');
check(robotsValues(searchHtml).some(value => /\bnoindex\b/i.test(value)), '/search/: search results must be noindex.');
const notFoundHtml = await fs.readFile(path.join(output, '404.html'), 'utf8');
const notFoundRobots = robotsValues(notFoundHtml);
check(notFoundRobots.length === 1 && /\bnoindex\b/i.test(notFoundRobots[0]), `404: expected one noindex directive; found ${notFoundRobots.length}.`);

const sitemap = await fs.readFile(path.join(output, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decodeEntities(match[1]));
const expectedUrls = canonicalRoutes.map(absolute);
check(sitemapUrls.length === expectedUrls.length, `Sitemap contains ${sitemapUrls.length} URLs; expected ${expectedUrls.length}.`);
check(new Set(sitemapUrls).size === sitemapUrls.length, 'Sitemap contains duplicate URLs.');
for (const url of expectedUrls) check(sitemapUrls.includes(url), `Sitemap is missing ${url}.`);
check(!sitemapUrls.some(url => /\/search\/|\/archives\/196\/|\/category\/(?:%E7%8E%B0%E4%BB%A3%E5%8F%B2|%E5%A4%A7%E4%BA%8B%E8%AE%B0)\/$/.test(url)), 'Sitemap includes a noindex or retired route.');

const robots = await fs.readFile(path.join(output, 'robots.txt'), 'utf8');
check(/^User-agent: \*$/m.test(robots) && /^Allow: \/$/m.test(robots), 'robots.txt must allow public crawling.');
check(robots.includes(`Sitemap: ${absolute('/sitemap.xml')}`), 'robots.txt points to the wrong sitemap URL.');
const generatedFiles = JSON.parse(await fs.readFile(path.join(output, 'generated-files.json'), 'utf8'));
for (const file of ['sitemap.xml', 'robots.txt', 'CNAME']) check(generatedFiles.includes(file), `${file} is missing from the publish manifest.`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: SEO metadata and structured data verified across ${canonicalRoutes.length} canonical URLs; sitemap and robots cover ${articles.length} articles.`);
}
