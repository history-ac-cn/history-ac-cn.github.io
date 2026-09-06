import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const excludedArticleIds = new Set(['196']);
const articles = ['articles', 'additions'].flatMap(name => JSON.parse(fs.readFileSync(path.join(root, `site/content/${name}.json`), 'utf8'))).filter(article => !excludedArticleIds.has(article.id));
const index = articles.map(({ id, title, text, excerpt, category }) => ({ id, title, text, excerpt, category: ['现代史','大事记'].includes(category) ? '现代史·大事记' : category }));
fs.writeFileSync(path.join(root, 'site/public/assets/search-index.js'), 'window.HISTORY_SEARCH = ' + JSON.stringify(index).replaceAll('<', '\\u003c') + ';\n');
