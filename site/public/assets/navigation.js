/* HTTP uses clean directory URLs; local files keep explicit HTML filenames. */
(() => {
  const web = /^https?:$/.test(location.protocol);
  const clean = url => {
    const result = new URL(url);
    result.pathname = result.pathname.replace(/\/index(?:\.html)?\/?$/i, '/');
    return result;
  };
  if (location.protocol === 'file:') {
    document.querySelectorAll('a[data-file-href]').forEach(link => {
      link.setAttribute('href', link.getAttribute('data-file-href'));
    });
  }
  const redirect = document.documentElement.dataset.redirectHref;
  if (redirect) {
    const destination = new URL(redirect, location.href);
    destination.search = location.search;
    destination.hash = location.hash;
    const target = web ? clean(destination) : destination;
    if (target.href !== location.href) location.replace(target.href);
    return;
  }
  if (!web) return;
  const canonical = clean(location.href);
  if (canonical.href === location.href) return;
  if (document.documentElement.dataset.notFound === 'true') {
    // GitHub Pages serves 404.html for /index, so load the real page after cleanup.
    location.replace(canonical.href);
  } else {
    history.replaceState(history.state, '', canonical.href);
  }
})();
