/* Small, dependency-free enhancements. Classic scripts also work over file://. */
(() => {
  const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const search = value => {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.value = value;
    const query = normalize(value), terms = query.split(' ').filter(Boolean);
    const records = window.HISTORY_SEARCH || [];
    const recordsById = new Map(records.map(record => [record.id, record]));
    let count = 0;
    document.querySelectorAll('[data-article-id]').forEach(row => {
      const record = recordsById.get(row.dataset.articleId);
      const haystack = normalize(record ? record.title + ' ' + record.text : row.textContent);
      const match = terms.every(term => haystack.includes(term));
      row.hidden = !match;
      if (match) count++;
      const paragraph = row.querySelector('p');
      if (paragraph && record) {
        let excerpt = record.excerpt;
        if (query) {
          const position = normalize(record.text).indexOf(terms[0]);
          if (position >= 0) excerpt = (position > 25 ? '…' : '') + record.text.slice(Math.max(0, position - 25), Math.max(0, position - 25) + 125).replace(/\s+/g, ' ') + '…';
        }
        paragraph.textContent = excerpt;
      }
    });
    document.getElementById('search-status').textContent = query ? `“${value.trim()}” · 找到 ${count} 篇文章` : `全部 ${count} 篇文章`;
    document.getElementById('search-empty').hidden = count > 0;
  };
  // Kept public for deterministic search verification and optional integrations.
  window.HistorySite = { normalize, search };
  let lastSearchInput = null;
  let readerSize = 18;
  // Fragment scrolling can leave the target column outside a narrow scroll area.
  // Reveal that column without changing the native vertical anchor position.
  const revealComparisonReference = () => {
    const target = document.querySelector('.comparison-reference:target');
    const container = target?.closest('.comparison-scroll');
    const cell = target?.closest('.comparison-cell');
    if (!container || !cell || container.scrollWidth <= container.clientWidth) return;
    const bounds = cell.getBoundingClientRect();
    const left = container.scrollLeft + bounds.left - container.getBoundingClientRect().left - (container.clientWidth - bounds.width) / 2;
    container.scrollLeft = Math.max(0, Math.min(container.scrollWidth - container.clientWidth, left));
  };
  const queueReferenceReveal = () => requestAnimationFrame(revealComparisonReference);
  window.addEventListener('hashchange', queueReferenceReveal);
  window.addEventListener('pageshow', queueReferenceReveal);
  window.addEventListener('resize', queueReferenceReveal);
  const initialize = () => {
    const input = document.getElementById('search-input');
    if (input && input !== lastSearchInput) {
      lastSearchInput = input;
      search(new URLSearchParams(location.search).get('q') || '');
    }
    const body = document.getElementById('article-body');
    if (body && !body.dataset.initialized) {
      body.dataset.initialized = 'true';
      readerSize = parseFloat(getComputedStyle(body).fontSize) || 18;
    }
  };
  document.addEventListener('submit', event => {
    if (event.target.id !== 'history-search') return;
    event.preventDefault();
    const query = document.getElementById('search-input').value;
    search(query);
    try {
      const url = new URL(location.href);
      if (query.trim()) url.searchParams.set('q', query.trim()); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    } catch (_) { /* Some local-file browsers restrict history changes. */ }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'search-input') search(event.target.value);
  });
  document.addEventListener('click', event => {
    const suggestion = event.target.closest('[data-search-term]');
    if (suggestion) { search(suggestion.dataset.searchTerm); document.getElementById('search-input').focus(); }
    const control = event.target.closest('[data-font]');
    if (control) {
      const body = document.getElementById('article-body');
      readerSize = Math.min(26, Math.max(16, readerSize + (control.dataset.font === 'larger' ? 1 : -1)));
      body.style.fontSize = readerSize + 'px';
      document.querySelector('[data-font="smaller"]').disabled = readerSize <= 16;
      document.querySelector('[data-font="larger"]').disabled = readerSize >= 26;
    }
    const toggle = event.target.closest('.menu-toggle');
    if (toggle && document.documentElement.dataset.portable === 'true') {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? '关闭菜单' : '打开菜单');
      document.querySelector('.main-nav').classList.toggle('is-open', expanded);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !event.target.isContentEditable) {
      event.preventDefault();
      const input = document.getElementById('search-input');
      if (input) input.focus(); else document.querySelector('.search-link').click();
    }
    if (event.key === 'Escape' && document.documentElement.dataset.portable === 'true') {
      const toggle = document.querySelector('.menu-toggle');
      if (toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
    }
  });
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const bar = document.getElementById('reading-progress-bar');
      const article = document.getElementById('article-body');
      if (bar && article) {
        const start = article.getBoundingClientRect().top + window.scrollY;
        const total = Math.max(1, article.offsetHeight - window.innerHeight);
        bar.style.width = Math.max(0, Math.min(100, (window.scrollY - start) / total * 100)) + '%';
      }
      scheduled = false;
    });
  }, { passive: true });
  initialize();
  queueReferenceReveal();
  new MutationObserver(initialize).observe(document.body, { childList: true, subtree: true });
})();
