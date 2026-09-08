/** Produce local matching candidates for editorial review; never rewrites source text. */
import fs from 'node:fs';
import { chronicleEvents } from '../site/lib/chronicles.mjs';
import { chronicleYear, compareChronicleEvents } from '../site/lib/chronicle-editions.mjs';
import { alignmentSourceHash } from '../site/lib/chronicle-alignment.mjs';

const originals = ['articles', 'additions'].flatMap(name => JSON.parse(fs.readFileSync(`site/content/${name}.json`, 'utf8'))).filter(chronicleYear);
const editions = JSON.parse(fs.readFileSync('site/content/chronicles-2019.json', 'utf8')).filter(article => article.primaryEdition !== '2019');
const normalize = text => text.normalize('NFKC').replace(/^(?:\d+月(?:\d+日)?(?:[—－-]\d+日)?|本年|同年|这年|年初|年底)\s*/, '').replace(/[\s\p{P}\p{S}\d]/gu, '');
const grams = text => { const value = normalize(text); return new Set([...value].slice(0, -2).map((_, i) => value.slice(i, i + 3))); };
const allEvents = [...originals, ...editions].flatMap(chronicleEvents);
const frequencies = new Map();
for (const event of allEvents) for (const token of grams(event.text)) frequencies.set(token, (frequencies.get(token) || 0) + 1);
const weight = token => Math.log(1 + allEvents.length / (frequencies.get(token) || 1));
const features = new Map(allEvents.map(event => [event.text, grams(event.text)]));

function candidate(left, right) {
  const a = features.get(left.text), b = features.get(right.text);
  const shared = [...a].filter(token => b.has(token));
  const total = tokens => [...tokens].reduce((sum, token) => sum + weight(token), 0);
  const overlap = total(shared) / Math.max(1, Math.min(total(a), total(b)));
  const dice = 2 * total(shared) / Math.max(1, total(a) + total(b));
  const day = text => text.normalize('NFKC').match(/^\d+月(\d+)日/)?.[1];
  const sameDay = day(left.text) && day(left.text) === day(right.text);
  const score = .7 * overlap + .3 * dice;
  return { left: left.id, right: right.id, score: +score.toFixed(3), sameDay: !!sameDay, shared: shared.length, leftText: left.text, rightText: right.text };
}

const years = editions.map(edition => {
  const original = originals.find(article => article.id === edition.id);
  return { id: edition.id, year: edition.year, periods: compareChronicleEvents(chronicleEvents(original), chronicleEvents(edition)).map((period, index) => ({
    ...period, index,
    candidates: period.right.map(right => period.left.map(left => candidate(left, right)).sort((a,b) => b.score - a.score)),
  })) };
});

const mode = process.argv[2];
if (mode === '--json') console.log(JSON.stringify(years, null, 2));
else if (mode === '--hashes') console.log(JSON.stringify(Object.fromEntries(years.map(year => [year.id, { year: year.year, sourceHash: alignmentSourceHash(year.periods.map(({ label, left, right }) => ({ label, left, right }))) }])), null, 2));
else if (mode === '--cross') {
  for (const year of years) for (const period of year.periods) for (const right of period.right) {
    const matches = year.periods.flatMap(other => other.left.map(left => ({ ...candidate(left, right), period: other.label, samePeriod: other === period }))).sort((a,b) => b.score - a.score);
    const best = matches[0];
    if (best && !best.samePeriod && best.score >= .12) console.log(`${year.year} ${best.period}→${period.label} L${best.left.slice(-2)} R${best.right.slice(-2)} ${best.score} | ${best.leftText} | ${best.rightText}`);
  }
}
else {
  const start = Number(process.argv[2]) || 1949, end = Number(process.argv[3]) || 2009;
  for (const year of years.filter(year => year.year >= start && year.year <= end)) {
    console.log(`\n${year.year} /${year.id}/`);
    for (const period of year.periods) for (const candidates of period.candidates) {
      if (!candidates.length) continue;
      const best = candidates[0], next = candidates[1];
      console.log(`${period.label} L${best.left.split('-').pop()} R${best.right.split('-').pop()} ${best.score} /${next?.score || 0}${best.sameDay ? ' 同日' : ''} | ${best.leftText.slice(0, 56)} | ${best.rightText.slice(0, 56)}`);
    }
  }
}
