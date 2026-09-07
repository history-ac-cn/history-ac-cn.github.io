import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ArrowUpRight } from 'lucide-react';
import { searchArticles as articles, articleHref, displayCategory, absoluteUrl, asset } from '@/lib/content';
import { openGraph, twitterCard } from '@/lib/seo';
const description = '搜索中国历史学习网的文章标题与正文。';
export const metadata: Metadata = {
  title: '搜索历史',
  description,
  alternates: { canonical: absoluteUrl('/search/') },
  openGraph: openGraph('搜索中国历史', description, absoluteUrl('/search/')),
  twitter: twitterCard('搜索中国历史', description),
  robots: { index: false, follow: true },
};
export default function SearchPage() {
  return <><script src={asset('/assets/search-index.js')} defer/><main id="main" className="shell inner-page search-page"><div className="breadcrumbs"><Link href="/">首页</Link><span>/</span><span>搜索</span></div><header className="page-heading"><span className="eyebrow">FIND A THREAD IN HISTORY</span><h1>你想了解哪一段历史？</h1><p>搜索朝代、人物、事件，或一个你感兴趣的关键词。</p></header><form className="history-search" role="search" id="history-search"><Search size={22}/><label className="sr-only" htmlFor="search-input">搜索文章标题与正文</label><input type="search" id="search-input" name="q" placeholder="试试“丝绸之路”“辛亥革命”“1978”" autoComplete="off"/><button type="submit">搜索 <ArrowUpRight size={16}/></button></form><div className="search-suggestions">从这里开始{['秦汉', '丝绸之路', '科举', '辛亥革命', '改革开放'].map(term => <button type="button" data-search-term={term} key={term}>{term}</button>)}</div><div className="search-summary" role="status" aria-live="polite" id="search-status">全部 {articles.length} 篇文章</div><div className="search-results" id="search-results">{articles.map(a => <Link className="search-result" href={articleHref(a.id)} key={a.id} data-article-id={a.id}><div className="catalog-meta"><span>{displayCategory(a.category)}</span><span>{a.minutes} 分钟阅读</span></div><h2>{a.title}<ArrowUpRight size={19}/></h2><p>{a.excerpt}{a.excerpt.length >= 100 ? '…' : ''}</p></Link>)}</div><div className="search-empty" id="search-empty" hidden><Search size={32} strokeWidth={1}/><h2>暂时没有找到相关内容</h2><p>可以试试更短的关键词，或直接浏览历史目录。</p><Link href="/archives/category/古代史/">浏览古代史 →</Link></div><noscript><p>搜索需要启用 JavaScript；你仍可直接浏览下方的全部文章。</p></noscript></main></>;
}
