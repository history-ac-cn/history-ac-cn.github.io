/** Compare every rendered paragraph with local source text or committed content. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { chronicleEvents } from '../site/lib/chronicles.mjs';
import { compareChronicleEvents, parseChronicleEdition, editionTextPath, editionContinuationPath, chronicleYear, source2019 } from '../site/lib/chronicle-editions.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const originals = ['articles', 'additions'].flatMap(name => JSON.parse(read(`site/content/${name}.json`))).filter(chronicleYear);
const editions = JSON.parse(read('site/content/chronicles-2019.json'));
const sourceYears = (file, startYear, endYear) => fs.existsSync(path.join(root, file))
  ? parseChronicleEdition(read(file), { startYear, endYear })
  : editions.filter(article => article.year >= startYear && article.year <= endYear).map(article => ({ year: article.year, paragraphs: article.text.split(/\n\s*\n/).slice(1) }));
const parsed = sourceYears(editionTextPath, 1949, 2009);
const continuation = sourceYears(editionContinuationPath, 2010, 2019);
assert.deepEqual([...parsed, ...continuation].map(article => article.year), Array.from({ length: 71 }, (_, index) => 1949 + index));
assert.equal(editions.length, 71);
assert.equal(continuation.length, 10);
assert.equal(continuation.reduce((sum, item) => sum + item.paragraphs.length, 0), 244);
assert.equal(parsed.length, 61);
assert.equal(parsed.reduce((sum, item) => sum + item.paragraphs.length, 0), 513);
assert.throws(() => parseChronicleEdition('一九四九年\n\n记事\n\n一九四九年\n\n记事'), /Duplicate/);
assert.throws(() => parseChronicleEdition('一九四九年\n\n记事'), /every year/);
const decode = text => text.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const eventTexts = html => [...html.matchAll(/<p\b[^>]*class="chronicle-event"[^>]*>([\s\S]*?)<\/p>/g)].map(match => decode(match[1].replace(/<span\b[^>]*>|<\/span>|<!--[\s\S]*?-->/g, '')));
let paragraphs = 0;
for (const source of parsed) {
  const original = originals.find(article => chronicleYear(article) === source.year);
  const edition = editions.find(article => article.year === source.year);
  assert(original && edition, `Missing year ${source.year}`);
  assert.equal(edition.id, original.id, `${source.year}: original ID must be reused`);
  assert.deepEqual(edition.text.split(/\n\s*\n/).slice(1), source.paragraphs, `${source.year}: imported text differs`);
  const oldEvents = chronicleEvents(original), newEvents = chronicleEvents(edition);
  const rows = compareChronicleEvents(oldEvents, newEvents);
  assert.deepEqual(rows.flatMap(row => row.left), oldEvents, `${source.year}: left-side order changed`);
  assert.deepEqual(rows.flatMap(row => row.right), newEvents, `${source.year}: right-side order changed`);
  const rendered = read(`preview/archives/${edition.id}/a/index.html`);
  assert.deepEqual(eventTexts(rendered), source.paragraphs, `${source.year}: rendered 2019 text differs`);
  assert(rendered.includes(`<p class="chronicle-source">${source2019}</p>`));
  const compare = read(`preview/archives/${edition.id}/compare/index.html`);
  const cells = [...compare.matchAll(/<div\b[^>]*class="comparison-cell prose"[^>]*data-edition="(2009|2019)"[^>]*>([\s\S]*?)<\/div>/g)];
  assert.deepEqual(cells.filter(cell => cell[1] === '2009').flatMap(cell => eventTexts(cell[2])), oldEvents.map(event => event.text), `${source.year}: left comparison text differs`);
  assert.deepEqual(cells.filter(cell => cell[1] === '2019').flatMap(cell => eventTexts(cell[2])), source.paragraphs, `${source.year}: right comparison text differs`);
  for (const [view, html] of [['2009', read(`preview/archives/${edition.id}/index.html`)], ['2019', rendered], ['compare', compare]]) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${source.year}/${view}: duplicate anchor IDs`);
    const nav = html.match(/<nav class="chronicle-versions"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert(nav, `${source.year}/${view}: missing version navigation`);
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
    assert.equal((nav.match(/<a\b/g) || []).length, 3);
    const base = path.join(root, 'preview/archives', edition.id, view === '2009' ? '' : view === '2019' ? 'a' : 'compare');
    const targets = [...nav.matchAll(/data-file-href="([^"]+)"/g)].map(match => path.resolve(base, match[1]));
    for (const suffix of ['index.html', 'a/index.html', 'compare/index.html']) assert(targets.includes(path.join(root, 'preview/archives', edition.id, suffix)), `${source.year}/${view}: wrong version target`);
  }
  paragraphs += source.paragraphs.length;
}
const modern = read('preview/archives/category/现代史·大事记/index.html');
for (const source of continuation) {
  const expectedId = String(67 - (source.year - 2010));
  const article = editions.find(article => article.year === source.year);
  assert.equal(article?.id, expectedId, `${source.year}: incorrect decrementing route`);
  assert.equal(article.primaryEdition, '2019');
  assert.deepEqual(article.text.split(/\n\s*\n/).slice(1), source.paragraphs, `${source.year}: imported continuation differs`);
  const html = read(`preview/archives/${expectedId}/index.html`);
  assert.deepEqual(eventTexts(html), source.paragraphs, `${source.year}: rendered continuation differs`);
  assert(html.includes(`<p class="chronicle-source">${source2019}</p>`));
  assert(modern.includes(`data-file-href="../../${expectedId}/index.html"`));
  const nav = html.match(/<nav class="chronicle-versions"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  const visibleNav = nav?.replace(/<!--[\s\S]*?-->/g, '');
  assert(visibleNav?.includes('2019 年版') && !visibleNav.includes('2009 年版') && !visibleNav.includes('并排对比'), `${source.year}: unavailable edition must not be offered`);
  assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
  for (const suffix of ['a', 'compare']) assert(!fs.existsSync(path.join(root, 'preview/archives', expectedId, suffix, 'index.html')), `${source.year}: reserved route should not publish empty content`);
  paragraphs += source.paragraphs.length;
}
assert(modern.includes('id="decade-2010"'));
for (const article of originals) assert(modern.includes(`data-file-href="../../${article.id}/index.html"`));
assert(!/data-file-href="[^\"]*\/(?:a|compare)\/index.html"/.test(modern), 'Default category must link the 2009 edition');
for (const id of ['2007', '196', '214', '258', 'missing']) {
  for (const view of ['a', 'compare']) assert(!fs.existsSync(path.join(root, 'preview/archives', id, view, 'index.html')), `Unexpected edition route ${id}/${view}`);
}
const search = { window: {} };
vm.runInNewContext(read('preview/assets/search-index.js'), search);
assert.equal(search.window.HISTORY_SEARCH.length, 154);
for (const edition of editions) {
  const result = search.window.HISTORY_SEARCH.find(article => article.id === `${edition.id}${edition.primaryEdition === '2019' ? '' : '/a'}`);
  assert(result?.title.endsWith('2019 年版'));
  assert.equal(result.text, edition.text);
}
const firstEdition = read('preview/archives/194/a/index.html');
assert(firstEdition.includes('data-file-href="../../192/a/index.html"'), 'Next-year navigation must retain the edition');
const firstComparison = read('preview/archives/194/compare/index.html');
assert(firstComparison.includes('data-file-href="../../192/compare/index.html"'), 'Next-year navigation must retain comparison mode');
assert(read('preview/archives/68/a/index.html').includes('data-file-href="../../67/index.html"'), '2019 edition must continue from 2009 to 2010 at the primary URL');
assert(read('preview/archives/67/index.html').includes('data-file-href="../68/a/index.html"'), '2010 must return to the 2019 edition of 2009');
assert(read('preview/archives/68/index.html').includes('data-file-href="../67/index.html"'), 'Default 2009 page must continue to 2010');
assert(!read('preview/archives/68/compare/index.html').includes('data-file-href="../../67/compare/index.html"'), 'Comparison navigation must end at the last comparable year');
console.log(`PASS: 71 years, 61 edition switches, 61 comparison pages, all ${paragraphs} supplied paragraphs, decrementing IDs, cross-decade navigation, search, and default directory links.`);
