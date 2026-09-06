import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, ChevronRight, BookOpen } from 'lucide-react';
import { articles, categories, articleHref, categoryHref, periods, shortTitle } from '@/lib/content';
export function generateStaticParams() { return [...categories.map(c => ({ category: c.name })), { category: '大事记' }]; }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) { return { title: decodeURIComponent((await params).category) }; }
export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const name = decodeURIComponent((await params).category);
  const info = categories.find(c => c.name === name);
  const isChronicle = name === '大事记';
  if (!info && !isChronicle) notFound();
  const items = articles.filter(a => a.category === name);
  const years = items.filter(a => /（\d{4}年）/.test(a.title));
  const decades = [...new Set(years.map(a => Math.floor(Number(a.title.match(/（(\d{4})年）/)?.[1]) / 10) * 10))];
  return <main id="main" className="shell inner-page"><div className="breadcrumbs"><Link href="/">首页</Link><ChevronRight size={13}/><span>{name}</span></div>
    <header className="page-heading"><span className="eyebrow">{info?.en || 'THE CHRONICLES'} <span className="eyebrow-rule"/> {info?.range || '1949 — 2009'}</span><h1>{name}<span className="heading-count">{items.length} 篇</span></h1><p>{info?.description || '以年为序，保存时代的片段。翻阅中华人民共和国大事记，寻找历史中的那些日子。'}</p></header>
    <nav className="era-navigation" aria-label="历史分类">{[...categories.map(c => c.name), '大事记'].map(c => <Link key={c} aria-current={c === name ? 'page' : undefined} href={categoryHref(c)}>{c}</Link>)}</nav>
    {isChronicle ? <div className="chronicles"><div className="chronicle-intro"><BookOpen size={20}/><p>现存年度资料为 1949—2009 年，其中 2007 年未出现在这次恢复的存档中。<br/><span>以下按原站内容整理，不代表资料已持续更新至今。</span></p></div><nav className="decade-nav" aria-label="跳转到年代">{decades.map(d => <a key={d} href={`#decade-${d}`}>{d} 年代</a>)}</nav>{decades.map(d => <section className="decade-section" id={`decade-${d}`} key={d}><h2>{d}<span>年代</span></h2><div className="year-grid">{Array.from({ length: 10 }, (_, i) => d + i).filter(y => y >= 1949 && y <= 2009).map(y => { const a = years.find(a => a.title.includes(`（${y}年）`)); return a ? <Link href={articleHref(a.id)} key={y}><span>{y}</span><ArrowUpRight size={16}/><small>{a.minutes} 分钟阅读</small></Link> : <div className="missing-year" key={y}><span>{y}</span><small>存档暂缺</small></div>; })}</div></section>)}</div> : <div className="category-layout"><aside className="category-aside"><span className="eyebrow">READING GUIDE</span><h2>{info?.title}</h2><p>沿着时间的顺序阅读，<br/>也可以从感兴趣的篇章开始。</p><Link className="text-link" href={articleHref(info!.overview)}>阅读本卷概览 <ArrowRight size={15}/></Link><div className="small-source">正文恢复自 2021 年网页存档。<br/>保留原站表述与资料出处。</div></aside><div className="article-catalog">{items.map((a, i) => <Link href={articleHref(a.id)} key={a.id} className="catalog-item"><span className="catalog-number">{String(i).padStart(2, '0')}</span><div><div className="catalog-meta"><span>{a.id === info?.overview ? '本卷概览' : periods[a.id] || name}</span><span>{a.minutes} 分钟阅读</span></div><h2>{shortTitle(a.title)}</h2><p>{a.excerpt}{a.excerpt.length >= 100 ? '…' : ''}</p></div><ArrowUpRight size={20}/></Link>)}</div></div>}
  </main>;
}
