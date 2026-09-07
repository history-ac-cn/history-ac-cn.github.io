import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Clock3, Minus, Plus } from 'lucide-react';
import { articles, annualChronicles, articleHref, categoryHref, basePath, shortTitle, periods, displayCategory, articlesForCategory, absoluteUrl, chronicleViewHref } from '@/lib/content';
import { formatChronicle } from '@/lib/chronicles.mjs';
import { serializeJsonLd } from '@/lib/seo';
import { chronicleYear } from '@/lib/chronicle-editions.mjs';
import { ChronicleVersions } from '@/components/chronicle-versions';

export default function ArticleReader({ article, view = '2009' }: { article: typeof articles[number] & { edition?: string }; view?: '2009' | '2019' }) {
  const id = article.id;
  const annual = chronicleYear(article);
  const href = (articleId: string) => view === '2019' && articleId !== '214' ? chronicleViewHref(articleId, view) : articleHref(articleId);
  const group = view === '2019' ? annualChronicles : articlesForCategory(article.category);
  const index = group.findIndex(item => item.id === id);
  const previous = group[index - 1];
  const next = group[index + 1];
  const homeCategory = article.category === '中国历史';
  const formatted = formatChronicle(article);
  // The retired chronicle overview is now represented by the combined category page.
  const contentHtml = formatted.html.replace(/href="\/archives\/196\/?"/g, `href="${categoryHref('大事记')}"`);
  const body = basePath ? contentHtml.replaceAll('href="/archives/', `href="${basePath}/archives/`) : contentHtml;
  const canonical = absoluteUrl(href(article.id));
  const title = `${article.title}${annual ? ` · ${view} 年版` : ''}`;
  const description = view === '2019' ? `${title}：${article.excerpt}` : `${article.title}：${article.excerpt}`;
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: 'zh-CN',
        isPartOf: { '@id': absoluteUrl('/#website') },
        author: { '@id': absoluteUrl('/#organization') },
        publisher: { '@id': absoluteUrl('/#organization') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首页', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: displayCategory(article.category), item: absoluteUrl(categoryHref(article.category)) },
          { '@type': 'ListItem', position: 3, name: title, item: canonical },
        ],
      },
    ],
  };

  return <main id="main" className="shell inner-page reader-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleStructuredData) }}/>
    <div className="reading-progress" aria-hidden="true"><div id="reading-progress-bar"/></div>
    <div className="breadcrumbs"><Link href="/">首页</Link><ChevronRight size={13}/>{homeCategory ? <span>中国历史</span> : <><Link href={categoryHref(article.category)}>{displayCategory(article.category)}</Link><ChevronRight size={13}/><span>正文</span></>}</div>
    <div className="reader-layout">
      <aside className="reader-sidebar">
        <Link className="back-link" href={homeCategory ? '/' : categoryHref(article.category)}><ArrowLeft size={15}/> {homeCategory ? '返回首页' : `${displayCategory(article.category)}目录`}</Link>
        <span className="eyebrow">IN THIS VOLUME</span>
        <nav aria-label="本卷文章">{group.length <= 13 ? group.map(item => <Link aria-current={item.id === id ? 'page' : undefined} href={href(item.id)} key={item.id}>{shortTitle(item.title)}</Link>) : <>
          <Link href={articleHref('214')} aria-current={id === '214' ? 'page' : undefined}>开篇 · 中国现代史</Link>
          {[previous, article, next].filter(item => item && item.id !== '214').map(item => <Link aria-current={item.id === id ? 'page' : undefined} href={href(item.id)} key={item.id}>{item.title.replace('中华人民共和国大事记', '')}</Link>)}
          <Link href={categoryHref('大事记')}>查看全部年份 <ArrowRight size={13}/></Link>
        </>}</nav>
        <div className="reader-side-note">放慢一点，<br/>与历史好好相处。</div>
      </aside>
      <article className="reading-article">
        <header className="article-heading"><span className="eyebrow">{displayCategory(article.category)} {periods[article.id] ? ` / ${periods[article.id]}` : ''}</span><h1>{article.title}</h1><div className="article-meta"><span><Clock3 size={14}/> 约 {article.minutes} 分钟阅读</span><div className="font-controls" aria-label="阅读字号"><button type="button" data-font="smaller" aria-label="缩小正文字号"><Minus size={13}/></button><span>字</span><button type="button" data-font="larger" aria-label="放大正文字号"><Plus size={13}/></button></div></div></header>
        {annual && <ChronicleVersions id={id} view={view}/>}
        {/* Frozen archive context: retained for future use, hidden from the reading UI. */}
        <div className="archive-notice" hidden>存档原文<span>本篇保留原站措辞与历史数据；资料中的时间表述及部分结论反映原文写作时点。</span></div>
        {formatted.headings.length > 0 && <details className="article-toc"><summary>本篇目录 <span>{formatted.headings.length} 个章节</span></summary><nav aria-label="本篇目录">{formatted.headings.map(heading => <a key={heading.id} href={`#${heading.id}`}>{heading.title}</a>)}</nav></details>}
        <div className="prose" id="article-body" dangerouslySetInnerHTML={{ __html: body }}/>
        {/* Frozen source panel; provenance remains in the corpus and this hidden block. */}
        <div className="article-source" id="source" hidden><span className="eyebrow">资料出处</span><p>资料来源：{article.source}。{article.archiveUrl ? '正文从 2021 年 4 月 19 日首页快照恢复，' : ''}版权归原作者所有。</p>{article.archiveUrl && <a href={article.archiveUrl} target="_blank" rel="noreferrer">查看 Internet Archive 存档 <ArrowUpRight size={14}/></a>}</div>
        <nav className="article-pagination" aria-label="相邻文章">{previous ? <Link href={href(previous.id)}><span><ArrowLeft size={14}/> 上一篇</span><strong>{shortTitle(previous.title)}</strong></Link> : <Link href={annual ? categoryHref('大事记') : '/'}><span><ArrowLeft size={14}/> 返回</span><strong>{annual ? '现代史·大事记目录' : '中国历史学习网首页'}</strong></Link>}{next && <Link href={href(next.id)}><span>下一篇 <ArrowRight size={14}/></span><strong>{shortTitle(next.title)}</strong></Link>}</nav>
      </article>
    </div>
    <a className="back-top" href="#main">回到顶部 ↑</a>
  </main>;
}
