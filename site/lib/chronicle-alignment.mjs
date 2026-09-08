import { createHash } from 'node:crypto';
import { chronicleHref } from './chronicle-editions.mjs';

/** @typedef {import('./chronicle-editions.mjs').ChronicleEvent} ChronicleEvent */
/** @typedef {{label: string, left: ChronicleEvent[], right: ChronicleEvent[]}} Period */
/** @typedef {{left: ChronicleEvent[], right: ChronicleEvent[]}} EventRow */
/** @typedef {{left: number[], right: number[], reason: string, notes?: {left?: string, right?: string}}} UnalignedRelation */
/** @typedef {{side: string, event: number, otherArticleId: string, otherYear: number, otherPeriod: string, otherEvent: number, otherTextHash: string, otherHighlight?: string, kind: string, reason: string}} CrossYearRelation */
/** @typedef {{year?: number, sourceHash: string, matches: number[][][], unalignedRelations?: UnalignedRelation[], crossYearRelations?: CrossYearRelation[]}} Alignment */

/** Freeze editorial decisions to the exact paragraphs AND existing month groups. */
/** @param {Period[]} periods */
export function alignmentSourceHash(periods) {
  return createHash('sha256').update(JSON.stringify(periods)).digest('hex');
}

/**
 * Position unrelated paragraphs using only their opening dates. Later dates belong
 * to the paragraph's narrative; they must never split or reorder that paragraph.
 * A month-only entry follows dated entries, and 同日 inherits the preceding date.
 * @param {ChronicleEvent[]} events
 */
function openingDays(events) {
  let previous = 32;
  return new Map(events.map(event => {
    const text = event.text.normalize('NFKC');
    const date = text.match(/^\d+月(\d+)日/);
    const part = text.match(/^\d+月(上旬|中旬|下旬|初|中|末)/)?.[1];
    const day = date ? Number(date[1]) : /^同日/.test(text) ? previous : ({ 上旬: 1, 中旬: 11, 下旬: 21, 初: 1, 中: 15, 末: 31 }[part] ?? 32);
    previous = day;
    return [event.id, day];
  }));
}

/**
 * Apply reviewed semantic anchors inside the unchanged period framework.
 * Every existing paragraph occurs once, intact, in its original column order.
 * Unmatched entries always occupy separate rows, even when their dates coincide.
 * @param {Period[]} periods
 * @param {Alignment} alignment
 * @returns {Array<Period & {rows: EventRow[]}>}
 */
export function alignChroniclePeriods(periods, alignment) {
  if (!alignment || alignment.sourceHash !== alignmentSourceHash(periods)) {
    throw new Error('Chronicle alignment source changed; review site/content/chronicle-alignments.json before rebuilding.');
  }
  const eventId = number => `chronicle-event-${String(number).padStart(2, '0')}`;
  for (const relation of alignment.unalignedRelations || []) {
    if (!relation.reason || ['left', 'right'].some(side => !relation[side].length || relation[side].some(number => !periods.some(period => period[side].some(event => event.id === eventId(number)))))) {
      throw new Error('Unaligned relation must explain and reference existing paragraphs in both editions.');
    }
    for (const [side, note] of Object.entries(relation.notes || {})) {
      if (!['left', 'right'].includes(side) || !/^此事在本版之本年.+处(?:有记载|有提及)$/.test(note)) {
        throw new Error('Cross-period notes must name the location and distinguish recorded from mentioned.');
      }
    }
  }
  for (const relation of alignment.crossYearRelations || []) {
    if (!['left', 'right'].includes(relation.side) || !['recorded', 'mentioned', 'related'].includes(relation.kind) || !relation.otherPeriod || !relation.reason || !periods.some(period => period[relation.side].some(event => event.id === eventId(relation.event)))) {
      throw new Error('Cross-year relation must explain and reference an existing paragraph.');
    }
    if (relation.kind !== 'related' && !relation.otherHighlight?.trim()) throw new Error('Cross-year link requires a reviewed text highlight.');
  }
  const matches = alignment.matches.map(([left, right]) => ({ left: left.map(eventId), right: right.map(eventId) }));
  const usedMatches = new Set();
  const result = periods.map(period => {
    const indices = Object.fromEntries(['left', 'right'].map(side => [side, new Map(period[side].map((event, index) => [event.id, index]))]));
    const anchors = matches.filter(match => match.left.some(id => indices.left.has(id)) || match.right.some(id => indices.right.has(id)));
    /** @type {EventRow[]} */
    const rows = [];
    let leftIndex = 0, rightIndex = 0;
    const leftDays = openingDays(period.left), rightDays = openingDays(period.right);
    // Drain each gap without implying a relationship between unrelated paragraphs.
    const gap = (leftEnd, rightEnd) => {
      while (leftIndex < leftEnd || rightIndex < rightEnd) {
        if (leftIndex < leftEnd && (rightIndex === rightEnd || leftDays.get(period.left[leftIndex].id) <= rightDays.get(period.right[rightIndex].id))) {
          rows.push({ left: [period.left[leftIndex++]], right: [] });
        } else rows.push({ left: [], right: [period.right[rightIndex++]] });
      }
    };
    for (const anchor of anchors) {
      if (usedMatches.has(anchor)) throw new Error('Semantic alignment must not cross period boundaries.');
      const ranges = ['left', 'right'].map(side => anchor[side].map(id => indices[side].get(id)));
      if (ranges.some(range => !range.length || range.some((value, i) => value === undefined || (i > 0 && value !== range[i - 1] + 1)))) {
        throw new Error('Semantic alignment must contain contiguous, existing paragraphs in the same period.');
      }
      const [leftStart, rightStart] = ranges.map(range => range[0]);
      if (leftStart < leftIndex || rightStart < rightIndex) throw new Error('Semantic alignment must preserve both column orders without duplicates.');
      gap(leftStart, rightStart);
      rows.push({ left: period.left.slice(leftIndex, leftIndex + anchor.left.length), right: period.right.slice(rightIndex, rightIndex + anchor.right.length) });
      leftIndex += anchor.left.length;
      rightIndex += anchor.right.length;
      usedMatches.add(anchor);
    }
    gap(period.left.length, period.right.length);
    return { ...period, rows };
  });
  if (usedMatches.size !== matches.length) throw new Error('Semantic alignment references missing paragraphs.');
  return result;
}

/**
 * A relation's side identifies the source event; its note goes in the opposite cell.
 * undefined means no known relation, null means a reviewed unresolved relation.
 * @param {EventRow} row
 * @param {'left' | 'right'} side
 * @param {Alignment} alignment
 * @returns {string | null | undefined}
 */
function referenceNoteFor(row, side, alignment) {
  const opposite = side === 'left' ? 'right' : 'left';
  const relations = (alignment.unalignedRelations || []).filter(relation => row[opposite].some(event => relation[opposite].includes(Number(event.id.split('-').at(-1)))));
  const notes = [...new Set(relations.map(relation => relation.notes?.[opposite]).filter(Boolean))];
  if (notes.length > 1) throw new Error('Combine all cross-period locations into one reviewed note for each paragraph.');
  if (notes.length) return notes[0];
  const crossYear = (alignment.crossYearRelations || []).find(relation => relation.side === opposite && row[opposite].some(event => Number(event.id.split('-').at(-1)) === relation.event));
  if (crossYear) return crossYear.kind === 'related' ? null : `此事在本版 ${crossYear.otherYear} 年${/^\d/.test(crossYear.otherPeriod) ? ' ' : ''}${crossYear.otherPeriod}处${crossYear.kind === 'recorded' ? '有记载' : '有提及'}`;
  return relations.length ? null : undefined;
}

/**
 * Annotate each unmatched paragraph, including when the entire opposite period
 * is empty. Known counterpart locations and unresolved relations take precedence.
 * @param {Period & {rows: EventRow[]}} period
 * @param {number} rowIndex
 * @param {'left' | 'right'} side
 * @param {Alignment} alignment
 * @returns {string | null}
 */
export function comparisonNoteFor(period, rowIndex, side, alignment) {
  const row = period.rows[rowIndex];
  if (row[side].length) return null;
  // The 2009 edition ends in September: retain its final-quarter period marker.
  if (alignment.year === 2009 && side === 'left' && !period.left.length && ['10 月', '11 月', '12 月'].includes(period.label)) {
    return rowIndex === 0 ? '本版此处无记事' : null;
  }
  const reference = referenceNoteFor(row, side, alignment);
  if (typeof reference === 'string') return reference;
  return reference === null ? null : '本版此事无记载';
}

/** @param {CrossYearRelation} relation */
function comparisonReference(relation) {
  if (!relation.otherHighlight?.trim()) throw new Error('Cross-year link requires a reviewed text highlight.');
  /** @type {'2009' | '2019'} */
  const view = relation.side === 'left' ? '2019' : '2009';
  const paragraphAnchor = `${view}-chronicle-event-${String(relation.otherEvent).padStart(2, '0')}`;
  const highlight = relation.otherHighlight;
  const anchor = `${paragraphAnchor}-reference-${createHash('sha256').update(highlight).digest('hex').slice(0, 12)}`;
  return { articleId: relation.otherArticleId, view, paragraphAnchor, anchor, highlight, href: `${chronicleHref(relation.otherArticleId, 'compare')}#${anchor}` };
}

/**
 * Link to a reviewed inline passage on the comparison page. CSS :target provides
 * the highlight with no browser-specific fragment syntax or client script.
 * @param {Period & {rows: EventRow[]}} period
 * @param {number} rowIndex
 * @param {'left' | 'right'} side
 * @param {Alignment} alignment
 * @returns {{text: string, articleId: string, view: '2009' | '2019', paragraphAnchor: string, anchor: string, highlight: string, href: string} | null}
 */
export function comparisonNoteLinkFor(period, rowIndex, side, alignment) {
  const note = comparisonNoteFor(period, rowIndex, side, alignment);
  const label = note?.match(/^此事在本版 (.+处)有(?:记载|提及)$/)?.[1];
  if (!label) return null;
  const opposite = side === 'left' ? 'right' : 'left';
  const relation = (alignment.crossYearRelations || []).find(relation => relation.side === opposite && period.rows[rowIndex][opposite].some(event => Number(event.id.split('-').at(-1)) === relation.event));
  if (!relation || relation.kind === 'related') return null;
  return { text: label, ...comparisonReference(relation) };
}

/**
 * Collect incoming references once at build time. Identical passages share an
 * anchor even if several years refer to them.
 * @param {string} articleId
 * @param {Record<string, Alignment>} years
 */
export function comparisonHighlightsFor(articleId, years) {
  const targets = new Map();
  for (const alignment of Object.values(years)) for (const relation of alignment.crossYearRelations || []) {
    if (relation.otherArticleId !== articleId || relation.kind === 'related') continue;
    const reference = comparisonReference(relation);
    if (!targets.has(reference.paragraphAnchor)) targets.set(reference.paragraphAnchor, new Map());
    targets.get(reference.paragraphAnchor).set(reference.anchor, { anchor: reference.anchor, text: reference.highlight });
  }
  return new Map([...targets].map(([paragraph, references]) => [paragraph, [...references.values()]]));
}

/**
 * Inline wrappers change neither characters nor paragraph boundaries. Conflicting
 * future excerpts require review rather than silently moving or duplicating text.
 * @param {string} text
 * @param {Array<{text: string, anchor: string}>} [highlights]
 * @returns {Array<{text: string, anchor?: string}>}
 */
export function comparisonTextParts(text, highlights = []) {
  const ranges = highlights.map(item => ({ ...item, start: text.indexOf(item.text) })).sort((a, b) => a.start - b.start);
  /** @type {Array<{text: string, anchor?: string}>} */
  const parts = [];
  let cursor = 0;
  for (const range of ranges) {
    if (!range.text || range.start < cursor || text.indexOf(range.text, range.start + 1) !== -1) throw new Error('Review missing, ambiguous or overlapping comparison highlights.');
    if (range.start > cursor) parts.push({ text: text.slice(cursor, range.start) });
    parts.push({ text: range.text, anchor: range.anchor });
    cursor = range.start + range.text.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
