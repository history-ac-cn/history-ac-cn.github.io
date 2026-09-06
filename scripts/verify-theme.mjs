/** Verify automatic theming, manual preference controls, and dark-mode contrast. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceCss = fs.readFileSync(path.join(root, 'site/app/globals.css'), 'utf8');
const themeScript = fs.readFileSync(path.join(root, 'site/public/assets/theme.js'), 'utf8');
assert(sourceCss.includes('@media screen and (prefers-color-scheme:dark)'), 'System dark-mode media query is missing.');
assert(sourceCss.includes(':root[data-theme="dark"]'), 'Manual dark-mode override is missing.');
assert(sourceCss.includes(':root[data-theme="light"]'), 'Manual light-mode override is missing.');

const darkDeclarations = sourceCss.match(/:root\[data-theme="dark"\]\{([^}]+)\}/)?.[1] || '';
const variable = name => darkDeclarations.match(new RegExp(`--${name}:(#[0-9a-fA-F]{6})`))?.[1];
const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
const luminance = hex => rgb(hex).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};
const darkBackground = variable('background');
const darkForeground = variable('foreground');
const darkAccent = variable('blue');
const darkButtonText = variable('theme-button-text');
assert(darkBackground && darkForeground && darkAccent && darkButtonText, 'Dark palette variables are incomplete.');
assert(contrast(darkForeground, darkBackground) >= 7, 'Dark-mode body text must meet enhanced contrast.');
assert(contrast(darkAccent, darkBackground) >= 4.5, 'Dark-mode links must meet text contrast.');
assert(contrast(darkButtonText, darkAccent) >= 4.5, 'Dark-mode button labels must meet text contrast.');

function executeTheme({ saved = null, systemDark = false } = {}) {
  const storage = new Map(saved ? [['history-site-theme', saved]] : []);
  const listeners = {};
  const mediaListeners = {};
  const controls = ['system', 'light', 'dark'].map(choice => ({
    dataset: { themeChoice: choice },
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  }));
  const status = { textContent: '' };
  const media = { matches: systemDark, addEventListener(type, callback) { mediaListeners[type] = callback; } };
  const document = {
    readyState: 'complete',
    documentElement: { dataset: {} },
    querySelectorAll(selector) { return selector === '[data-theme-choice]' ? controls : []; },
    getElementById(id) { return id === 'theme-status' ? status : null; },
    addEventListener(type, callback) { listeners[type] = callback; },
  };
  const localStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); },
  };
  const window = { matchMedia() { return media; } };
  vm.runInNewContext(themeScript, { window, document, localStorage, Set });
  return { window, document, storage, listeners, media, mediaListeners, controls, status };
}

const automatic = executeTheme({ systemDark: true });
assert.equal(automatic.window.HistoryTheme.preference, 'system');
assert.equal(automatic.window.HistoryTheme.effective, 'dark');
assert.equal(automatic.document.documentElement.dataset.theme, undefined);
assert.equal(automatic.status.textContent, '当前：跟随系统（深色）');
automatic.window.HistoryTheme.set('light');
assert.equal(automatic.document.documentElement.dataset.theme, 'light');
assert.equal(automatic.storage.get('history-site-theme'), 'light');
assert.equal(automatic.controls.find(control => control.dataset.themeChoice === 'light').attributes['aria-pressed'], 'true');
automatic.window.HistoryTheme.set('dark');
assert.equal(automatic.document.documentElement.dataset.theme, 'dark');
automatic.window.HistoryTheme.set('system');
assert.equal(automatic.document.documentElement.dataset.theme, undefined);
assert.equal(automatic.storage.has('history-site-theme'), false);

const restored = executeTheme({ saved: 'dark', systemDark: false });
assert.equal(restored.document.documentElement.dataset.theme, 'dark');
assert.equal(restored.window.HistoryTheme.effective, 'dark');

const output = path.join(root, 'preview');
const generated = JSON.parse(fs.readFileSync(path.join(output, 'generated-files.json'), 'utf8'));
assert(generated.includes('assets/theme.js'), 'Theme bootstrap is missing from the publish manifest.');
for (const relative of generated.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(output, relative), 'utf8');
  assert.equal((html.match(/<script\b[^>]*src="[^"]*assets\/theme\.js"[^>]*><\/script>/g) || []).length, 1, `${relative}: expected one theme bootstrap.`);
}
const about = fs.readFileSync(path.join(output, 'about/index.html'), 'utf8');
for (const choice of ['system', 'light', 'dark']) assert(about.includes(`data-theme-choice="${choice}"`), `About page is missing the ${choice} choice.`);

console.log(`PASS: system, light, and dark themes work across ${generated.filter(file => file.endsWith('.html')).length} pages; saved preference and dark-mode contrast verified.`);
