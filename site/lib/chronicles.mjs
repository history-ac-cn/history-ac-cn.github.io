import { source2019 } from './chronicle-editions.mjs';
export const standardChronicleSource = '来源：中华人民共和国大事记（1949年10月—2009年9月）';

/** Use the current attribution for every published annual chronicle. */
/**
 * @param {{id?: string, title: string, text: string, edition?: string}} article
 * @returns {string}
 */
export function chronicleTextForDisplay(article) {
  if (!/（\d{4}年）/.test(article.title) || !article.id) return article.text;
  const events = article.text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^[（(]?来源[：:]/.test(line));
  return [article.edition === '2019' ? source2019 : standardChronicleSource, ...events].join('\n\n');
}

/** @param {{text: string}} article */
export function chronicleEvents(article) {
  let currentLabel = '年内记事';
  return article.text.split(/\n+/).map(line => line.trim()).filter(line => line && !/^[（(]?来源[：:]/.test(line)).map((text, index) => {
    const normalized = text.normalize('NFKC');
    const month = normalized.match(/^(1[0-2]|[1-9])月/);
    const other = normalized.match(/^(年初|年中|年底|年末|春夏之交|春天|春|全年|这年|这一年|同年|本年底|本年)/);
    if (month) currentLabel = `${Number(month[1])} 月`;
    else if (other) currentLabel = other[1];
    return { text, label: currentLabel, id: `chronicle-event-${String(index + 1).padStart(2, '0')}` };
  });
}

/** Restore one paragraph per event without changing archived event text or inferring dates. */
/**
 * @param {{id?: string, title: string, text: string, html: string, headings: Array<{id: string, title: string}>, edition?: string}} article
 * @returns {{html: string, headings: Array<{id: string, title: string}>}}
 */
export function formatChronicle(article) {
  if (!/（\d{4}年）/.test(article.title)) return { html: article.html, headings: article.headings };
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const unwrapSource = value => {
    const closing = value.startsWith('（') ? '）' : value.startsWith('(') ? ')' : '';
    return closing && value.endsWith(closing) ? value.slice(1, -1).trim() : value;
  };
  const lines = chronicleTextForDisplay(article).split(/\n+/).map(line => line.trim()).filter(Boolean);
  const sources = [];
  for (const line of lines) {
    if (/^[（(]?来源[：:]/.test(line)) {
      // Keep the edition's attribution above all events.
      sources.push(unwrapSource(line)); continue;
    }
  }
  const renderedEvents = chronicleEvents(article).map(event => `<p class="chronicle-event" id="${event.id}" data-month="${event.label}">${escape(event.text)}</p>`);
  return {
    headings: [],
    html: [
      ...sources.map(source => `<p class="chronicle-source">${escape(source)}</p>`),
      ...renderedEvents,
    ].join('\n'),
  };
}
