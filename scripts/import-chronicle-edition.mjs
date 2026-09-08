import fs from 'node:fs/promises';
import { editionTextPath, editionContinuationPath, parseChronicleEdition, chronicleYear, source2019 } from '../site/lib/chronicle-editions.mjs';

const root = new URL('../', import.meta.url);
const readLocalSource = async file => {
  try { return await fs.readFile(new URL(file, root), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const [text, continuation] = await Promise.all([editionTextPath, editionContinuationPath].map(readLocalSource));
// Local recovery material is optional and never needed by a fresh checkout or CI.
if (text === null && continuation === null) {
  await fs.access(new URL('site/content/chronicles-2019.json', root));
  console.log('Using committed 2019 edition; no local recovery text to import.');
  process.exit(0);
}
if (text === null || continuation === null) throw new Error('Local edition import requires both recovery text files; restore the missing file or use the committed JSON without local source files.');
const parsed = [...parseChronicleEdition(text), ...parseChronicleEdition(continuation, { startYear: 2010, endYear: 2019 })];
const originals = (await Promise.all(['articles', 'additions'].map(name => fs.readFile(new URL(`site/content/${name}.json`, root), 'utf8').then(JSON.parse)))).flat();
const byYear = new Map(originals.filter(chronicleYear).map(article => [chronicleYear(article), article]));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const editions = parsed.map(({ year, paragraphs }) => {
  const original = byYear.get(year);
  if (!original && year < 2010) throw new Error(`Missing original route for year ${year}`);
  const id = original?.id || String(67 - (year - 2010));
  if (!original && originals.some(article => article.id === id)) throw new Error(`New year ${year} conflicts with article ${id}`);
  const lines = [source2019, ...paragraphs];
  return {
    id,
    title: original?.title || `中华人民共和国大事记（${year}年）`,
    category: '大事记',
    edition: '2019',
    primaryEdition: original ? '2009' : '2019',
    year,
    html: lines.map(line => `<p>${escape(line)}</p>`).join('\n'),
    text: lines.join('\n\n'),
    excerpt: paragraphs[0].slice(0, 100),
    headings: [],
    minutes: Math.max(1, Math.round(paragraphs.join('').length / 500)),
    source: source2019.replace(/^来源：/, ''),
    archiveUrl: '',
  };
});
if (new Set(editions.map(article => article.id)).size !== editions.length) throw new Error('Edition IDs must be unique.');
await fs.writeFile(new URL('site/content/chronicles-2019.json', root), JSON.stringify(editions, null, 2) + '\n');
console.log(`Imported 2019 edition: ${editions.length} years, ${parsed.reduce((sum, entry) => sum + entry.paragraphs.length, 0)} paragraphs.`);
