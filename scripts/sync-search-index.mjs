import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chronicleTextForDisplay } from '../site/lib/chronicles.mjs';
import { searchableArticles } from '../site/lib/chronicle-editions.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const excludedArticleIds = new Set(['196']);
const articles = ['articles', 'additions'].flatMap(name => JSON.parse(fs.readFileSync(path.join(root, `site/content/${name}.json`), 'utf8'))).filter(article => !excludedArticleIds.has(article.id));
const editions = JSON.parse(fs.readFileSync(path.join(root, 'site/content/chronicles-2019.json'), 'utf8'));
const index = searchableArticles(articles, editions).map(article => {
  const { id, title, excerpt, category } = article;
  return { id, title, text: chronicleTextForDisplay(article), excerpt, category: ['现代史','大事记'].includes(category) ? '现代史·大事记' : category };
});
fs.writeFileSync(path.join(root, 'site/public/assets/search-index.js'), 'window.HISTORY_SEARCH = ' + JSON.stringify(index).replaceAll('<', '\\u003c') + ';\n');
