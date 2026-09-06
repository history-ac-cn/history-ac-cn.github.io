/* Apply the saved theme before paint; system mode remains the default. */
(() => {
  const storageKey = 'history-site-theme';
  const choices = new Set(['system', 'light', 'dark']);
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem(storageKey);
    if (choices.has(saved)) preference = saved;
  } catch (_) { /* Storage can be unavailable in privacy or local-file contexts. */ }

  const effectiveTheme = () => preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
  const updateControls = () => {
    document.querySelectorAll('[data-theme-choice]').forEach(control => {
      control.setAttribute('aria-pressed', String(control.dataset.themeChoice === preference));
    });
    const status = document.getElementById('theme-status');
    if (status) status.textContent = preference === 'system'
      ? `当前：跟随系统（${effectiveTheme() === 'dark' ? '深色' : '浅色'}）`
      : `当前：${preference === 'dark' ? '深色' : '浅色'}`;
  };
  const apply = (next, persist = true) => {
    preference = choices.has(next) ? next : 'system';
    if (preference === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = preference;
    if (persist) {
      try {
        if (preference === 'system') localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, preference);
      } catch (_) { /* The visual choice still applies for the current page. */ }
    }
    updateControls();
  };

  apply(preference, false);
  window.HistoryTheme = { get preference() { return preference; }, get effective() { return effectiveTheme(); }, set: apply };
  document.addEventListener('click', event => {
    const control = event.target.closest?.('[data-theme-choice]');
    if (control) apply(control.dataset.themeChoice);
  });
  media?.addEventListener?.('change', () => { if (preference === 'system') updateControls(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateControls, { once: true });
  else updateControls();
})();
