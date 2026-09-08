import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, Columns2, Minus, Plus } from 'lucide-react';
import { articles, comparableChronicles as chronicles2019, absoluteUrl, categoryHref } from '@/lib/content';
import { chronicleEvents, standardChronicleSource } from '@/lib/chronicles.mjs';
import { chronicleHref, chronicleYear, compareChronicleEvents, source2019 } from '@/lib/chronicle-editions.mjs';
import { alignChroniclePeriods, comparisonNoteFor, comparisonNoteLinkFor, comparisonHighlightsFor, comparisonTextParts } from '@/lib/chronicle-alignment.mjs';
import alignments from '@/content/chronicle-alignments.json';
import { openGraph, serializeJsonLd, twitterCard } from '@/lib/seo';
import { ChronicleVersions } from '@/components/chronicle-versions';

export const dynamicParams = false;
export function generateStaticParams() {
  return chronicles2019.map(article => ({ id: article.id }));
}

const descriptionFor = (year: number) => `并排阅读 ${year} 年中华人民共和国大事记的 2009 年版与 2019 年版，按月份对照两版记述，保留各版原有的事件段落。`;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = chronicles2019.find(item => item.id === id);
  if (!article) return { title: '文章未找到', robots: { index: false, follow: true } };
  const canonical = absoluteUrl(chronicleHref(id, 'compare'));
  const title = `${article.title} · 版本对比`;
  const description = descriptionFor(article.year);
  return { title, description, alternates: { canonical }, openGraph: openGraph(title, description, canonical), twitter: twitterCard(title, description) };
}

export default async function Compare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const annualChronicles = articles.filter(article => chronicles2019.some(edition => edition.id === article.id)).sort((a, b) => chronicleYear(a)! - chronicleYear(b)!);
  const original = annualChronicles.find(article => article.id === id);
  const newer = chronicles2019.find(article => article.id === id);
  if (!original || !newer) notFound();
  const year = newer.year;
  const alignment = alignments.years[id as keyof typeof alignments.years];
  const rows = alignChroniclePeriods(compareChronicleEvents(chronicleEvents(original), chronicleEvents(newer)), alignment);
  const highlights = comparisonHighlightsFor(id, alignments.years);
  const index = annualChronicles.findIndex(article => article.id === id);
  const previous = annualChronicles[index - 1], next = annualChronicles[index + 1];
  const canonical = absoluteUrl(chronicleHref(id, 'compare'));
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: `${original.title} · 版本对比`, description: descriptionFor(year), url: canonical, inLanguage: 'zh-CN', isPartOf: { '@id': absoluteUrl('/#website') }, hasPart: ['2009', '2019'].map(view => ({ '@type': 'Article', url: absoluteUrl(chronicleHref(id, view as '2009' | '2019')), name: `${original.title} · ${view} 年版` })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: '现代史·大事记', item: absoluteUrl(categoryHref('大事记')) },
        { '@type': 'ListItem', position: 3, name: `${year} 年 · 版本对比`, item: canonical },
      ] },
    ],
  };
  return <main id="main" className="shell inner-page compare-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}/>
    <div className="breadcrumbs"><Link href="/">首页</Link><ChevronRight size={13}/><Link href={categoryHref('大事记')}>现代史·大事记</Link><ChevronRight size={13}/><span>{year} 年 · 版本对比</span></div>
    <header className="page-heading compare-heading"><span className="eyebrow">TWO EDITIONS, ONE YEAR</span><h1>{year}<span>年大事记 · 版本对比</span></h1><p>同一段历史，两版记述。按月份并排阅读，保留各版原有分段。<br/>同月内的对应事件尽量按语义对齐，便于对照阅读。</p></header>
    <div className="compare-toolbar"><ChronicleVersions id={id} view="compare"/><div className="font-controls" aria-label="两栏阅读字号"><button type="button" data-font="smaller" aria-label="缩小两栏正文字号"><Minus size={13}/></button><span>字</span><button type="button" data-font="larger" aria-label="放大两栏正文字号"><Plus size={13}/></button></div></div>
    <nav className="compare-months" aria-label="跳转到对比月份">{rows.map((row, index) => <a href={`#compare-period-${index + 1}`} key={index}>{row.label}</a>)}</nav>
    <p className="compare-mobile-hint" id="compare-scroll-hint"><Columns2 size={15} aria-hidden="true"/>左右滑动查看两版内容</p>
    <div className="comparison-scroll" role="region" aria-label={`${year} 年两个版本的并排正文`} tabIndex={0}>
      <div className="comparison-grid" id="article-body">
        <div className="comparison-columns">
          {(['2009', '2019'] as const).map((view, index) => <header className="comparison-column-heading" key={view}>
            <Link href={chronicleHref(id, view)}>{view} 年版 <ArrowUpRight size={17} aria-hidden="true"/></Link>
            <p>{index === 0 ? standardChronicleSource : source2019}</p>
          </header>)}
        </div>
        {rows.map((row, index) => <section className="comparison-period" id={`compare-period-${index + 1}`} key={index} aria-labelledby={`compare-period-title-${index + 1}`}>
          <h2 id={`compare-period-title-${index + 1}`}>{row.label}</h2>
          <div className="comparison-events">
            {row.rows.map((events, eventIndex) => <div className="comparison-columns comparison-event-row" key={eventIndex} data-alignment={events.left.length && events.right.length ? 'matched' : 'unmatched'}>
              {(['left', 'right'] as const).map((side, column) => {
                const note = comparisonNoteFor(row, eventIndex, side, alignment);
                const noteLink = comparisonNoteLinkFor(row, eventIndex, side, alignment);
                const hasContent = events[side].length > 0 || note !== null;
                return <div className="comparison-cell prose" data-edition={column === 0 ? '2009' : '2019'} aria-label={hasContent ? `${column === 0 ? '2009' : '2019'} 年版 · ${row.label}` : undefined} aria-hidden={hasContent ? undefined : true} key={side}>
                  {events[side].map(event => {
                    const anchor = `${column === 0 ? '2009' : '2019'}-${event.id}`;
                    return <p className="chronicle-event" id={anchor} key={event.id}>{comparisonTextParts(event.text, highlights.get(anchor)).map(part => part.anchor ? <span className="comparison-reference" id={part.anchor} key={part.anchor}>{part.text}</span> : part.text)}</p>;
                  })}
                  {note && <p className="comparison-empty"><span>{noteLink ? <>此事在本版 <Link className="comparison-note-link" href={noteLink.href}>{noteLink.text}</Link>{note.slice(-3)}</> : note}</span></p>}
                </div>;
              })}
            </div>)}
          </div>
        </section>)}
      </div>
    </div>
    <nav className="article-pagination" aria-label="相邻年份的版本对比">
      {previous ? <Link href={chronicleHref(previous.id, 'compare')}><span><ArrowLeft size={14}/> 上一年</span><strong>{chronicleYear(previous)} 年 · 版本对比</strong></Link> : <Link href={categoryHref('大事记')}><span><ArrowLeft size={14}/> 返回</span><strong>现代史·大事记目录</strong></Link>}
      {next && <Link href={chronicleHref(next.id, 'compare')}><span>下一年 <ArrowRight size={14}/></span><strong>{chronicleYear(next)} 年 · 版本对比</strong></Link>}
    </nav>
    <a className="back-top" href="#main">回到顶部 ↑</a>
  </main>;
}
