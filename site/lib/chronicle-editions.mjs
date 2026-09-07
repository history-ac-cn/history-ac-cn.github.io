export const source2019 = '来源：中华人民共和国大事记（1949年10月—2019年9月）';
export const editionTextPath = 'recovery/中华人民共和国大事记（1949年10月—2019年9月）.txt';
export const editionContinuationPath = 'recovery/2.txt';

/** @param {{title: string}} article */
export const chronicleYear = article => Number(article.title.match(/（(\d{4})年）/)?.[1]) || null;

/** @param {string} id @param {'2009' | '2019' | 'compare'} [view] */
export const chronicleHref = (id, view = '2009') => `/archives/${id}/${view === '2019' ? 'a/' : view === 'compare' ? 'compare/' : ''}`;

/** Parse only standalone year headings; keep the supplied paragraph boundaries intact. */
export function parseChronicleEdition(text, { startYear = 1949, endYear = 2009 } = {}) {
  const digits = Object.fromEntries([...'〇一二三四五六七八九'].map((digit, index) => [digit, index]));
  digits['零'] = 0;
  const years = [];
  for (const block of text.replace(/^\uFEFF/, '').replaceAll('\r\n', '\n').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)) {
    if (/^[〇零一二三四五六七八九]{4}年$/.test(block)) {
      const year = Number([...block.slice(0, -1)].map(digit => digits[digit]).join(''));
      if (years.some(entry => entry.year === year)) throw new Error(`Duplicate edition year: ${year}`);
      years.push({ year, paragraphs: [] });
    } else {
      if (!years.length) throw new Error('Edition text must begin with a year heading.');
      years[years.length - 1].paragraphs.push(block);
    }
  }
  const expected = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  if (years.map(entry => entry.year).join(',') !== expected.join(',')) throw new Error(`Edition text must cover every year from ${startYear} to ${endYear} in order.`);
  if (years.some(entry => !entry.paragraphs.length)) throw new Error('Edition contains an empty year.');
  return years;
}

/** Add newer-only years to the default catalog without duplicating existing years. */
export function primaryArticles(articles, editions) {
  const existingIds = new Set(articles.map(article => article.id));
  return [...articles, ...editions.filter(article => !existingIds.has(article.id))];
}

/** @param {{id: string, primaryEdition?: string}} article */
export const editionHref = article => article.primaryEdition === '2019' ? chronicleHref(article.id) : chronicleHref(article.id, '2019');

/** Include both editions in search, giving each record its actual route suffix. */
export function searchableArticles(articles, editions) {
  const primary = primaryArticles(articles, editions);
  const alternate = editions.filter(article => article.primaryEdition !== '2019');
  return [
    ...primary.map(article => ({ ...article, title: article.title + (chronicleYear(article) ? ` · ${article.edition || '2009'} 年版` : '') })),
    ...alternate.map(article => ({ ...article, id: `${article.id}/a`, title: `${article.title} · 2019 年版` })),
  ];
}

/** @typedef {{id: string, text: string, label: string}} ChronicleEvent */
/**
 * Align consecutive period groups, preserving paragraph order within both editions.
 * @param {ChronicleEvent[]} leftEvents
 * @param {ChronicleEvent[]} rightEvents
 * @returns {Array<{label: string, left: ChronicleEvent[], right: ChronicleEvent[]}>}
 */
export function compareChronicleEvents(leftEvents, rightEvents) {
  /** @param {ChronicleEvent[]} events */
  const group = events => {
    /** @type {Array<{label: string, events: ChronicleEvent[]}>} */
    const result = [];
    for (const event of events) {
      const label = ['本年底', '年末'].includes(event.label) ? '年底' : ['本年', '这年', '这一年', '全年'].includes(event.label) ? '年内记事' : ['春', '春天'].includes(event.label) ? '春季' : event.label;
      if (result[result.length - 1]?.label !== label) result.push({ label, events: [] });
      result[result.length - 1].events.push(event);
    }
    return result;
  };
  const left = group(leftEvents), right = group(rightEvents);
  // Longest common subsequence aligns months without moving seasonal or year-end entries.
  const lengths = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      lengths[i][j] = left[i].label === right[j].label ? 1 + lengths[i + 1][j + 1] : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  /** @type {Array<{label: string, left: ChronicleEvent[], right: ChronicleEvent[]}>} */
  const rows = [];
  const order = label => /^\d+ 月$/.test(label) ? parseInt(label, 10) * 10 : ({ '年初': 0, '春季': 25, '春夏之交': 45, '年中': 65, '年底': 130, '年内记事': 140 }[label] ?? 140);
  let i = 0, j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i].label === right[j].label) {
      rows.push({ label: left[i].label, left: left[i++].events, right: right[j++].events });
    } else if (i < left.length && (j === right.length || lengths[i + 1][j] > lengths[i][j + 1] || (lengths[i + 1][j] === lengths[i][j + 1] && order(left[i].label) <= order(right[j].label)))) {
      rows.push({ label: left[i].label, left: left[i++].events, right: [] });
    } else {
      rows.push({ label: right[j].label, left: [], right: right[j++].events });
    }
  }
  return rows;
}
