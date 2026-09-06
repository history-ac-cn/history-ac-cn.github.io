/** Exercise the shipped classic script with the DOM APIs it uses, without a browser or dependencies. */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const articles = JSON.parse(fs.readFileSync(path.join(root, 'site/content/articles.json'), 'utf8'));
const listeners = {};
const input = { value: '', focus() { this.focused = true; } };
const status = { textContent: '' }, empty = { hidden: true };
const rows = articles.map(a => ({ dataset: { articleId: a.id }, textContent: a.title + a.excerpt, paragraph: { textContent: a.excerpt }, querySelector() { return this.paragraph; } }));
const body = { dataset: {}, style: {} };
const smaller = { dataset: { font: 'smaller' }, disabled: false }, larger = { dataset: { font: 'larger' }, disabled: false };
const toggle = { attrs: { 'aria-expanded': 'false' }, getAttribute(k) { return this.attrs[k]; }, setAttribute(k,v) { this.attrs[k] = v; }, click() { listeners.click({ target: { closest: s => s === '.menu-toggle' ? toggle : null } }); } };
const nav = { classList: { toggle(_, state) { nav.open = state; } } };
const searchLink = { click() { this.clicked = true; } };
const document = {
  documentElement: { dataset: { portable: 'true' } }, body: {},
  addEventListener(type, callback) { listeners[type] = callback; },
  getElementById(id) { return { 'search-input': input, 'search-status': status, 'search-empty': empty, 'article-body': body }[id] || null; },
  querySelectorAll(selector) { return selector === '[data-article-id]' ? rows : []; },
  querySelector(selector) { return { '[data-font="smaller"]': smaller, '[data-font="larger"]': larger, '.main-nav': nav, '.menu-toggle': toggle, '.search-link': searchLink }[selector] || null; },
};
const window = { addEventListener() {}, scrollY: 0, innerHeight: 800 };
const context = vm.createContext({ window, document, URL, URLSearchParams, location: { href: 'file:///site/search/index.html', search: '' }, history: { replaceState() {} }, getComputedStyle: () => ({ fontSize: '18px' }), MutationObserver: class { observe() {} }, requestAnimationFrame: cb => cb() });
vm.runInContext(fs.readFileSync(path.join(root, 'preview/assets/search-index.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'preview/assets/site.js'), 'utf8'), context);
const visible = () => rows.filter(r => !r.hidden).map(r => r.dataset.articleId);
assert.equal(visible().length, 83);
window.HistorySite.search('丝绸之路'); assert(visible().includes('250')); assert(visible().length < 83); assert.equal(empty.hidden, true);
window.HistorySite.search('１９７８'); const fullWidthMatches = visible(); window.HistorySite.search('1978'); assert.deepEqual(visible(), fullWidthMatches); assert(fullWidthMatches.length > 0);
window.HistorySite.search('秦 汉'); assert(visible().includes('250'));
window.HistorySite.search('zzzz-no-such-history-2468'); assert.equal(visible().length, 0); assert.equal(empty.hidden, false);
window.HistorySite.search('<img src=x onerror=alert(1)>'); assert.equal(visible().length, 0);
window.HistorySite.search('  '); assert.equal(visible().length, 83);
const clickFont = control => listeners.click({ target: { closest: s => s === '[data-font]' ? control : null } });
for (let i=0;i<20;i++) clickFont(larger); assert.equal(body.style.fontSize, '26px'); assert(larger.disabled);
for (let i=0;i<20;i++) clickFont(smaller); assert.equal(body.style.fontSize, '16px'); assert(smaller.disabled);
toggle.click(); assert.equal(toggle.attrs['aria-expanded'], 'true'); assert.equal(nav.open, true);
listeners.keydown({ key: 'Escape', target: { tagName: 'BODY' } }); assert.equal(toggle.attrs['aria-expanded'], 'false'); assert.equal(nav.open, false);
let prevented = false; listeners.keydown({ key: '/', target: { tagName: 'BODY' }, preventDefault() { prevented = true; } }); assert(prevented && input.focused);
console.log('PASS: full-text search, full-width normalization, multiple terms, safe empty results, font-size limits, mobile menu and keyboard shortcuts.');
