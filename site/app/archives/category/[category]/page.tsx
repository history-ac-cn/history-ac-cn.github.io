import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ArrowUpRight, ChevronRight, BookOpen } from 'lucide-react';
import { categories, articleHref, categoryHref, periods, shortTitle, displayCategory, modernCategory, articlesForCategory, absoluteUrl } from '@/lib/content';
import { openGraph, twitterCard } from '@/lib/seo';
export function generateStaticParams() { return [...categories.map(c => ({ category: c.name })), { category: '现代史' }, { category: '大事记' }]; }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const requestedName = decodeURIComponent((await params).category);
  const name = displayCategory(requestedName);
  const info = categories.find(category => category.name === name);
  const description = name === modernCategory ? '从中国现代史出发，按年份阅读 1949—2019 年中华人民共和国大事记。' : info?.description || '浏览中国历史学习网的历史文章。';
  const canonical = absoluteUrl(categoryHref(name));
  return {
    title: name,
    description,
    alternates: { canonical },
    openGraph: openGraph(`${name}｜中国历史学习网`, description, canonical),
    twitter: twitterCard(`${name}｜中国历史学习网`, description),
    robots: requestedName === name ? undefined : { index: false, follow: true },
  };
}
export default async function Category({ params }: { params: Promise<{ category: string }> }) {
  const requestedName = decodeURIComponent((await params).category);
  const name = displayCategory(requestedName);
  const info = categories.find(c => c.name === name);
  const isChronicle = name === modernCategory;
  if (!info) notFound();
  const items = articlesForCategory(name);
  const years = items.filter(a => /（\d{4}年）/.test(a.title));
  const decades = [...new Set(years.map(a => Math.floor(Number(a.title.match(/（(\d{4})年）/)?.[1]) / 10) * 10))];
  return <main id="main" className="shell inner-page"><div className="breadcrumbs"><Link href="/">首页</Link><ChevronRight size={13}/><span>{name}</span></div>
    <header className="page-heading"><span className="eyebrow">{isChronicle ? 'CONTEMPORARY CHINA & CHRONICLES' : info.en} <span className="eyebrow-rule"/> {isChronicle ? '1949 —' : info.range}</span><h1>{name}<span className="heading-count">{items.length} 篇</span></h1><p>{isChronicle ? '从中国现代史出发，以年为序，翻阅中华人民共和国大事记，在具体的日子里看见时代的变迁。' : info.description}</p></header>
    <nav className="era-navigation" aria-label="历史分类">{categories.map(c => <Link key={c.name} aria-current={c.name === name ? 'page' : undefined} href={categoryHref(c.name)}>{c.name}</Link>)}</nav>
    {isChronicle ? <div className="chronicles"><Link href={articleHref('214')} className="chronicle-intro chronicle-opening"><BookOpen size={20}/><div><span className="eyebrow">开篇 · 中国现代史</span></div><span className="opening-action">开始阅读 <ArrowRight size={16}/></span></Link><nav className="decade-nav" aria-label="跳转到年代">{decades.map(d => <a key={d} href={`#decade-${d}`}>{d} 年代</a>)}</nav>{decades.map(d => <section className="decade-section" id={`decade-${d}`} key={d}><h2>{d}<span>年代</span></h2><div className="year-grid">{years.filter(a => Math.floor(Number(a.title.match(/（(\d{4})年）/)?.[1]) / 10) * 10 === d).map(a => <Link href={articleHref(a.id)} key={a.id}><span>{a.title.match(/（(\d{4})年）/)?.[1]}</span><ArrowUpRight size={16}/><small>{a.minutes} 分钟阅读</small></Link>)}</div></section>)}</div> : <div className="category-layout"><aside className="category-aside"><span className="eyebrow">READING GUIDE</span><h2>{info.title}</h2><p>沿着时间的顺序阅读，<br/>也可以从感兴趣的篇章开始。</p><Link className="text-link" href={articleHref(info.overview)}>阅读本卷概览 <ArrowRight size={15}/></Link><div className="small-source">正文恢复自 2021 年网页存档。<br/>保留原站表述与资料出处。</div></aside><div className="article-catalog">{items.map((a, i) => <Link href={articleHref(a.id)} key={a.id} className="catalog-item"><span className="catalog-number">{String(i).padStart(2, '0')}</span><div><div className="catalog-meta"><span>{a.id === info.overview ? '本卷概览' : periods[a.id] || name}</span><span>{a.minutes} 分钟阅读</span></div><h2>{shortTitle(a.title)}</h2><p>{a.excerpt}{a.excerpt.length >= 100 ? '…' : ''}</p></div><ArrowUpRight size={20}/></Link>)}</div></div>}
  </main>;
}
