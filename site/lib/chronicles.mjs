/** Restore one paragraph per event without changing archived event text or inferring dates. */
/**
 * @param {{title: string, text: string, html: string, headings: Array<{id: string, title: string}>}} article
 * @returns {{html: string, headings: Array<{id: string, title: string}>}}
 */
export function formatChronicle(article) {
  if (!/（\d{4}年）/.test(article.title)) return { html: article.html, headings: article.headings };
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const unwrapSource = value => {
    const closing = value.startsWith('（') ? '）' : value.startsWith('(') ? ')' : '';
    return closing && value.endsWith(closing) ? value.slice(1, -1).trim() : value;
  };
  const lines = article.text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  const sources = [], events = [];
  for (const line of lines) {
    if (/^[（(]?来源[：:]/.test(line)) {
      // Some archived pages put their attribution after all events. Collect it
      // separately so every annual chronicle begins with its original source.
      sources.push(unwrapSource(line)); continue;
    }
    events.push(line);
  }
  let currentLabel = '年内记事';
  const renderedEvents = events.map((line, index) => {
    const normalized = line.normalize('NFKC');
    const month = normalized.match(/^(1[0-2]|[1-9])月/);
    const other = normalized.match(/^(年初|年中|年底|年末|春夏之交|春天|全年|这年|这一年|同年|本年)/);
    // “同日” and “同月” are independent events but inherit the preceding
    // period label. Seasonal entries retain their own labels.
    if (month) currentLabel = `${Number(month[1])} 月`;
    else if (other) currentLabel = other[1];
    const id = `chronicle-event-${String(index + 1).padStart(2, '0')}`;
    return `<p class="chronicle-event" id="${id}" data-month="${currentLabel}">${escape(line)}</p>`;
  });
  return {
    headings: [],
    html: [
      ...sources.map(source => `<p class="chronicle-source">${escape(source)}</p>`),
      ...renderedEvents,
    ].join('\n'),
  };
}
