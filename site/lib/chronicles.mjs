/** Group events into one natural paragraph per month without changing any archived event text or inferred dates. */
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
  const blocks = [], sources = [], headings = [];
  let current = null;
  for (const line of lines) {
    if (/^[（(]?来源[：:]/.test(line)) {
      // Some archived pages put their attribution after all events. Collect it
      // separately so every annual chronicle begins with its original source.
      sources.push(unwrapSource(line)); continue;
    }
    const normalized = line.normalize('NFKC');
    const month = normalized.match(/^(1[0-2]|[1-9])月/);
    const other = normalized.match(/^(年初|年中|年底|年末|春夏之交|春天|全年|这年|这一年|同年|本年)/);
    // “同日”/“同月” remain with the preceding event. Seasonal entries retain
    // their own labels rather than being assigned an unsupported month.
    const label = month ? `${Number(month[1])} 月` : other ? other[1] : current?.label || '年内记事';
    if (!current || current.label !== label) {
      const id = `chronicle-${month ? 'month-' + month[1].padStart(2, '0') : 'period'}-${headings.length + 1}`;
      current = { label, id, entries: [] };
      blocks.push(current); headings.push({ id, title: label });
    }
    current.entries.push(line);
  }
  return {
    headings: [],
    html: [
      ...sources.map(source => `<p class="chronicle-source">${escape(source)}</p>`),
      ...blocks.map(block => `<p class="chronicle-month" id="${block.id}" data-month="${block.label}">${block.entries.map(escape).join(' ')}</p>`),
    ].join('\n'),
  };
}
