/** Verify semantic anchors against intact source paragraphs and exported HTML. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chronicleEvents } from '../site/lib/chronicles.mjs';
import { chronicleYear, compareChronicleEvents } from '../site/lib/chronicle-editions.mjs';
import { alignChroniclePeriods, alignmentSourceHash, comparisonNoteFor, comparisonNoteLinkFor, comparisonTextParts } from '../site/lib/chronicle-alignment.mjs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const originals = ['articles', 'additions'].flatMap(name => JSON.parse(read(`site/content/${name}.json`))).filter(chronicleYear);
const allEditions = JSON.parse(read('site/content/chronicles-2019.json'));
const editions = allEditions.filter(article => article.primaryEdition !== '2019');
const alignments = JSON.parse(read('site/content/chronicle-alignments.json'));
assert.equal(alignments.schemaVersion, 1);
assert.deepEqual(Object.keys(alignments.years).sort(), editions.map(article => article.id).sort());
const decode = text => text.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
const paragraphs = html => [...html.matchAll(/<p\b[^>]*class="chronicle-event"[^>]*>([\s\S]*?)<\/p>/g)].map(match => decode(match[1].replace(/<span\b[^>]*>|<\/span>|<!--[\s\S]*?-->/g, '')));
const years = new Map();
const periodName = label => ['本年', '这年', '这一年', '全年', '年内记事'].includes(label) ? '全年' : ['本年底', '年末'].includes(label) ? '年底' : label;
let totalPeriods = 0, totalRows = 0, matched = 0, grouped = 0, totalParagraphs = 0, eventNotes = 0, crossYearNotes = 0, crossPeriodNotes = 0;
for (const edition of editions) {
  const original = originals.find(article => article.id === edition.id);
  const periods = compareChronicleEvents(chronicleEvents(original), chronicleEvents(edition));
  const result = alignChroniclePeriods(periods, alignments.years[edition.id]);
  for (const relation of alignments.years[edition.id].crossYearRelations || []) {
    const other = (relation.side === 'left' ? allEditions : originals).find(article => article.id === relation.otherArticleId);
    assert(other && chronicleYear(other) === relation.otherYear, 'Cross-year note must name the correct year in the opposite edition');
    const otherEvent = chronicleEvents(other)[relation.otherEvent - 1];
    assert(otherEvent, 'Cross-year note must reference an existing paragraph');
    assert.equal(relation.otherPeriod, periodName(otherEvent.label), 'Cross-year note must name the actual period containing the counterpart');
    assert.equal(createHash('sha256').update(otherEvent.text).digest('hex'), relation.otherTextHash, 'Review cross-year references when their source text changes');
    if (relation.kind !== 'related') {
      assert(alignments.years[relation.otherArticleId], 'Every active cross-year link must have a comparison page');
      assert(relation.otherHighlight && otherEvent.text.includes(relation.otherHighlight), 'Highlight must quote the referenced paragraph exactly');
      const targetEvents = [originals.find(article => article.id === relation.otherArticleId), allEditions.find(article => article.id === relation.otherArticleId)].flatMap(chronicleEvents);
      const normalize = value => value.replace(/\s+/g, ' ').toLowerCase();
      assert.equal(targetEvents.filter(event => normalize(event.text).includes(normalize(relation.otherHighlight))).length, 1, 'Highlight must identify only the intended column');
    }
  }
  const relations = alignments.years[edition.id].unalignedRelations || [];
  for (const relation of relations) for (const side of ['left', 'right']) {
    if (!relation.notes?.[side]) continue;
    const opposite = side === 'left' ? 'right' : 'left';
    for (const number of relation[side]) {
      const related = relations.filter(candidate => candidate[side].includes(number) && candidate.notes?.[side]);
      const targetNumbers = related.flatMap(candidate => candidate[opposite]);
      const targetPeriods = [...new Set(periods.filter(period => period[opposite].some(event => targetNumbers.includes(Number(event.id.split('-').at(-1))))).map(period => periodName(period.label)))];
      const expectedLocation = targetPeriods.sort((a, b) => parseInt(a) - parseInt(b)).join('、');
      assert.equal(relation.notes[side].match(/^此事在本版之本年\s*(.+)处有(?:记载|提及)$/)?.[1], expectedLocation, 'Cross-period note must name every actual counterpart location');
    }
  }
  assert.deepEqual(result.map(({ rows, ...period }) => period), periods, `${edition.year}: month framework changed`);
  for (const [index, period] of result.entries()) for (const side of ['left', 'right']) {
    assert.deepEqual(period.rows.flatMap(row => row[side]), periods[index][side], `${edition.year}: paragraph text, count or order changed`);
  }
  const rows = result.flatMap(period => period.rows);
  const contexts = result.flatMap(period => period.rows.map((row, index) => ({ period, index })));
  const html = read(`preview/archives/${edition.id}/compare/index.html`);
  const rendered = [...html.matchAll(/<div class="comparison-columns comparison-event-row" data-alignment="(matched|unmatched)">(<div\b[\s\S]*?<\/div><div\b[\s\S]*?<\/div>)<\/div>/g)];
  assert.equal(rendered.length, rows.length, `${edition.year}: missing rendered alignment rows`);
  for (const [index, row] of rows.entries()) {
    const cells = [...rendered[index][2].matchAll(/<div class="comparison-cell prose"[^>]*data-edition="(2009|2019)"([^>]*)>([\s\S]*?)<\/div>/g)];
    assert.equal(cells.length, 2);
    for (const [column, side] of ['left', 'right'].entries()) {
      assert.deepEqual(paragraphs(cells[column][3]), row[side].map(event => event.text), `${edition.year}: wrong rendered correspondence`);
      const note = comparisonNoteFor(contexts[index].period, contexts[index].index, side, alignments.years[edition.id]);
      if (note) {
        assert.equal(cells[column][3].replace(/<a\b[^>]*>|<\/a>|<!--[\s\S]*?-->/g, ''), `<p class="comparison-empty"><span>${note}</span></p>`, 'Use the same styling and centered text box for every comparison note');
        const link = comparisonNoteLinkFor(contexts[index].period, contexts[index].index, side, alignments.years[edition.id]);
        const anchors = [...cells[column][3].matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)];
        assert.equal(anchors.length, link ? 1 : 0);
        if (link) {
          assert.equal(anchors[0][2], link.text, 'Only the year and period text should be linked');
          const target = path.resolve(`preview/archives/${link.articleId}/compare/index.html`);
          const fileHref = anchors[0][1].match(/data-file-href="([^"]+)"/)?.[1];
          assert(fileHref, 'Cross-year references must support local file navigation');
          const [file, hash] = fileHref.split('#');
          assert.equal(path.resolve(`preview/archives/${edition.id}/compare`, file), target, 'Link must open the target comparison page');
          assert.equal(hash, link.anchor);
          assert(hash.startsWith(`${link.view}-`), 'Anchor must identify the correct edition column');
          const targetHtml = fs.readFileSync(target, 'utf8');
          const targetParagraph = targetHtml.match(new RegExp(`<p class="chronicle-event" id="${link.paragraphAnchor}">([\\s\\S]*?)<\\/p>`))?.[1];
          assert(targetParagraph, 'Original paragraph anchor must remain intact');
          const highlighted = targetParagraph.match(new RegExp(`<span class="comparison-reference" id="${link.anchor}">([\\s\\S]*?)<\\/span>`))?.[1];
          assert.equal(decode(highlighted || ''), link.highlight, 'Link must highlight exactly the reviewed passage within the correct paragraph');
        }
        assert(!cells[column][2].includes('aria-hidden="true"'));
        if (note === '本版此事无记载') eventNotes++;
        if (/^此事在本版 \d{4} 年.+处有(?:记载|提及)$/.test(note)) crossYearNotes++;
        if (/^此事在本版之本年.+处有(?:记载|提及)$/.test(note)) crossPeriodNotes++;
      } else if (!row[side].length) {
        assert.equal(cells[column][3], '', 'Only reviewed unresolved counterparts and the retained 2009 final-quarter gaps remain blank');
        assert(cells[column][2].includes('aria-hidden="true"'));
      }
    }
    const isMatch = row.left.length > 0 && row.right.length > 0;
    assert.equal(rendered[index][1], isMatch ? 'matched' : 'unmatched');
    if (isMatch) matched++;
    else assert.equal(row.left.length + row.right.length, 1, 'Unrelated paragraphs must occupy separate rows');
    if (row.left.length > 1 || row.right.length > 1) grouped++;
    totalParagraphs += row.left.length + row.right.length;
  }
  const retainedPeriodNotes = edition.year === 2009 ? periods.filter(period => ['10 月', '11 月', '12 月'].includes(period.label) && !period.left.length).length : 0;
  assert.equal((html.match(/>本版此处无记事<\/span>/g) || []).length, retainedPeriodNotes, `${edition.year}: only the 2009 edition’s final-quarter period markers may remain`);
  assert(!html.includes('此事在本版本年'), `${edition.year}: ambiguous same-year wording remains`);
  years.set(edition.year, result);
  totalPeriods += result.length;
  totalRows += rows.length;
}

const number = event => Number(event.id.split('-').at(-1));
const rowNumbers = period => period.rows.map(row => [row.left.map(number), row.right.map(number)]);
// The earlier July events now have notes on the right; their positions stay fixed.
const july1998 = years.get(1998).find(period => period.label === '7 月');
assert.deepEqual(rowNumbers(july1998), [[[9], []], [[10], []], [[11], [7]]]);
assert.deepEqual(july1998.rows.map((row, index) => comparisonNoteFor(july1998, index, 'right', alignments.years['89'])), ['此事在本版 1988 年 2 月处有记载', '本版此事无记载', null]);
// Same date is not sufficient: rectification and the Marriage Law stay separate.
const may1950 = years.get(1950).find(period => period.label === '5 月');
assert(may1950.rows.some(row => row.left.length === 0 && row.right.some(event => number(event) === 6)));
assert(may1950.rows.some(row => row.left.some(event => number(event) === 5) && row.right.some(event => number(event) === 7)));
// An internal 1951 date remains inside the single original November 1950 paragraph.
const college = years.get(1950).flatMap(period => period.rows).find(row => row.left.some(event => number(event) === 19));
assert.equal(college.left.length, 1);
assert(college.left[0].text.includes('１９５１年６月１１日'));
// One original congress paragraph corresponds to two intact newer paragraphs.
assert.deepEqual(rowNumbers(years.get(1956).find(period => period.label === '9 月')), [[[9], [10, 11]]]);
// Reversed source order cannot silently reorder or falsely pair events.
assert.deepEqual(rowNumbers(years.get(1969).find(period => period.label === '10 月')), [[[], [5]], [[2], [6]], [[3], []]]);
const october1969 = years.get(1969).find(period => period.label === '10 月');
assert.equal(comparisonNoteFor(october1969, 0, 'left', alignments.years['149']), null, 'Right-side subway entry exists elsewhere in the left edition');
assert.equal(comparisonNoteFor(october1969, 2, 'right', alignments.years['149']), null, 'Left-side subway entry exists elsewhere in the right edition');
const august1973 = years.get(1973).find(period => period.label === '8 月');
assert.equal(comparisonNoteFor(august1973, august1973.rows.findIndex(row => row.right.some(event => number(event) === 5)), 'left', alignments.years['141']), null, 'A plenum recorded inside a congress paragraph is not absent');
const march1997 = years.get(1997).find(period => period.label === '3 月');
assert.equal(comparisonNoteFor(march1997, march1997.rows.findIndex(row => row.right.some(event => number(event) === 3)), 'left', alignments.years['91']), '此事在本版之本年 6 月处有提及', 'Approval and establishment are different stages of the same event');
const december1949 = years.get(1949).find(period => period.label === '12 月');
assert.equal(comparisonNoteFor(december1949, december1949.rows.findIndex(row => row.left.some(event => number(event) === 14)), 'right', alignments.years['194']), '此事在本版 1950 年 2 月处有记载');
const sovietLink = comparisonNoteLinkFor(december1949, december1949.rows.findIndex(row => row.left.some(event => number(event) === 14)), 'right', alignments.years['194']);
assert.equal(sovietLink.paragraphAnchor, '2019-chronicle-event-03');
assert(sovietLink.href.startsWith('/archives/192/compare/#2019-chronicle-event-03-reference-'));
const housingLink = comparisonNoteLinkFor(july1998, 0, 'right', alignments.years['89']);
assert(housingLink.highlight.startsWith('1998年7月3日，'), 'Highlight the later housing reform sentence within the 1988 paragraph');
assert(!housingLink.highlight.includes('1994年'), 'Do not highlight unrelated earlier reforms');
const inline = comparisonTextParts('甲。乙-丙,丁&戊。己。', [{ text: '乙-丙,丁&戊。', anchor: 'reference' }]);
assert.equal(inline.map(part => part.text).join(''), '甲。乙-丙,丁&戊。己。', 'Inline highlights preserve every character');
assert.equal(inline.filter(part => part.anchor).length, 1);
assert.throws(() => comparisonTextParts('甲乙丙', [{ text: '甲乙', anchor: 'a' }, { text: '乙丙', anchor: 'b' }]), /overlapping/);
assert.throws(() => comparisonTextParts('甲乙甲乙', [{ text: '甲乙', anchor: 'a' }]), /ambiguous/);
const september1979 = years.get(1979).find(period => period.label === '9 月');
assert.equal(comparisonNoteFor(september1979, september1979.rows.findIndex(row => row.right.some(event => number(event) === 9)), 'left', alignments.years['128']), '此事在本版 1989 年 12 月处有提及', 'Partial overlap should be described as a mention');
const january1979 = years.get(1979).find(period => period.label === '1 月');
assert.equal(comparisonNoteFor(january1979, january1979.rows.findIndex(row => row.left.some(event => number(event) === 2)), 'right', alignments.years['128']), null, 'A related policy process alone does not prove the event was mentioned');
// Existing month boundaries take priority over cross-month semantic associations.
assert(years.get(1953).find(period => period.label === '1 月').rows.every(row => !row.right.length));
assert.equal(comparisonNoteFor(years.get(1953).find(period => period.label === '1 月'), 0, 'right', alignments.years['186']), '此事在本版之本年全年处有记载', 'A known counterpart location must not be marked absent');
const june1952 = years.get(1952).find(period => period.label === '6 月');
assert.equal(comparisonNoteFor(june1952, june1952.rows.findIndex(row => row.left.some(event => number(event) === 2)), 'right', alignments.years['188']), '此事在本版之本年全年处有记载');
const annual1952 = years.get(1952).find(period => period.label === '年内记事');
assert.equal(comparisonNoteFor(annual1952, 0, 'left', alignments.years['188']), '此事在本版之本年 6 月处有提及', 'The brief June entry does not include the later completion information');
assert.equal(comparisonNoteLinkFor(annual1952, 0, 'left', alignments.years['188']), null);
const june1979 = years.get(1979).find(period => period.label === '6 月');
assert.equal(comparisonNoteFor(june1979, june1979.rows.findIndex(row => row.left.some(event => number(event) === 6)), 'right', alignments.years['128']), '此事在本版之本年 4 月、7 月处有提及', 'An intact multi-event paragraph may point to multiple periods');

const event = (id, text) => ({ id: `chronicle-event-${String(id).padStart(2, '0')}`, text, label: '1 月' });
const fixture = [{ label: '1 月', left: [event(1, '1月1日 甲。'), event(2, '1月2日 乙。')], right: [event(1, '1月1日 甲。2日，乙。')] }];
const config = { sourceHash: alignmentSourceHash(fixture), matches: [[[1, 2], [1]]] };
assert.deepEqual(alignChroniclePeriods(fixture, config)[0].rows, [{ left: fixture[0].left, right: fixture[0].right }], 'Many-to-one alignment must also preserve paragraphs');
assert.throws(() => alignChroniclePeriods(fixture, { ...config, sourceHash: 'outdated' }), /source changed/);
assert.throws(() => alignChroniclePeriods(fixture, { ...config, matches: [[[2, 1], [1]]] }), /contiguous/);
assert.throws(() => alignChroniclePeriods(fixture, { ...config, matches: [[[1], [1]], [[2], [1]]] }), /without duplicates/);
assert.throws(() => alignChroniclePeriods(fixture, { ...config, matches: [[[3], [2]]] }), /missing paragraphs/);
const split = [{ label: '1 月', left: fixture[0].left, right: [] }, { label: '2 月', left: [], right: fixture[0].right }];
assert.throws(() => alignChroniclePeriods(split, { ...config, sourceHash: alignmentSourceHash(split) }), /same period/);
assert.throws(() => alignChroniclePeriods(fixture, { ...config, unalignedRelations: [{ left: [3], right: [1], reason: 'Invalid paragraph' }] }), /existing paragraphs/);
const emptyPeriod = { label: '1 月', left: [], right: fixture[0].left, rows: fixture[0].left.map(event => ({ left: [], right: [event] })) };
assert.deepEqual(emptyPeriod.rows.map((row, index) => comparisonNoteFor(emptyPeriod, index, 'left', config)), ['本版此事无记载', '本版此事无记载'], 'Every paragraph needs its own marker when the opposite month is empty');
const emptyRightPeriod = { label: emptyPeriod.label, left: emptyPeriod.right, right: [], rows: emptyPeriod.rows.map(row => ({ left: row.right, right: [] })) };
assert.deepEqual(emptyRightPeriod.rows.map((row, index) => comparisonNoteFor(emptyRightPeriod, index, 'right', config)), ['本版此事无记载', '本版此事无记载'], 'Per-paragraph markers apply equally to the right column');
for (const month of ['10 月', '11 月', '12 月']) {
  const period = { ...emptyPeriod, label: month };
  assert.deepEqual(period.rows.map((row, index) => comparisonNoteFor(period, index, 'left', { ...config, year: 2009 })), ['本版此处无记事', null], 'Retain one month-level marker for the 2009 edition’s final quarter');
  assert.deepEqual(period.rows.map((row, index) => comparisonNoteFor(period, index, 'left', { ...config, year: 2008 })), ['本版此事无记载', '本版此事无记载'], 'The final-quarter exception must not affect other years');
  const rightPeriod = { ...emptyRightPeriod, label: month };
  assert.deepEqual(rightPeriod.rows.map((row, index) => comparisonNoteFor(rightPeriod, index, 'right', { ...config, year: 2009 })), ['本版此事无记载', '本版此事无记载'], 'The final-quarter exception must not affect the 2019 edition');
}
for (const month of ['10 月', '12 月']) {
  const period = years.get(2009).find(period => period.label === month);
  assert.equal(comparisonNoteFor(period, 0, 'left', alignments.years['68']), '本版此处无记事');
}
assert.equal(comparisonNoteFor(years.get(2009).find(period => period.label === '2 月'), 0, 'left', alignments.years['68']), '本版此事无记载', 'Earlier 2009 months still use per-paragraph markers');
const withLocation = { ...config, unalignedRelations: [{ left: [1], right: [1], reason: 'A reviewed other-period counterpart', notes: { right: '此事在本版之本年 2 月处有记载' } }] };
assert.deepEqual(emptyPeriod.rows.map((row, index) => comparisonNoteFor(emptyPeriod, index, 'left', withLocation)), ['此事在本版之本年 2 月处有记载', '本版此事无记载'], 'A counterpart reference does not suppress the next paragraph’s absence marker');
const unresolvedLocation = { ...withLocation, unalignedRelations: withLocation.unalignedRelations.map(({ notes, ...relation }) => relation) };
assert.deepEqual(emptyPeriod.rows.map((row, index) => comparisonNoteFor(emptyPeriod, index, 'left', unresolvedLocation)), [null, '本版此事无记载'], 'Retain reviewed exceptions even when the entire opposite month is empty');
assert.equal(totalParagraphs, 1103);
console.log(`PASS: ${editions.length} comparisons, ${totalPeriods} unchanged periods, ${matched} semantic groups (${grouped} one-to-many), ${totalRows - matched} staggered paragraphs, ${eventNotes} missing-event notes, ${crossYearNotes} cross-year notes, ${crossPeriodNotes} cross-period notes with reviewed exceptions; all ${totalParagraphs} paragraphs intact and ordered.`);
