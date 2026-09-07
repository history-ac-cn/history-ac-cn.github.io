import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Clock3, MoveDown } from 'lucide-react';
import { categories, categoryHref, articleHref, articles, articlesForCategory, shortTitle, periods, absoluteUrl } from '@/lib/content';
export const metadata: Metadata = { alternates: { canonical: absoluteUrl('/') } };
const eraDescriptions: Record<string, [string, string]> = {
  '古代史': ['从先民的足迹到王朝的更迭，', '追寻中华文明绵延不绝的脉络。'],
  '近代史': ['从鸦片战争到新中国成立，', '读懂百余年间的变革、抗争与求索。'],
  '现代史·大事记': ['从中国现代史出发，以年为序，', '在一个个具体的日子里理解时代的变迁。'],
};
function PreferredWrap({ first, second }: { first: string; second: string }) {
  return <><span className="preferred-wrap-segment">{first}</span><wbr/><span className="preferred-wrap-segment">{second}</span></>;
}
export default function Home() {
  const ancient = articles.filter(a => a.category === '古代史' && a.id !== '256');
  return <main id="main">
    <section className="hero shell"><div className="hero-copy"><div className="eyebrow"><span className="blue-dot"/> 始于 2019，写给热爱历史的你</div><h1><span className="hero-title-line">半小时</span><span className="hero-title-line">搞定<span className="blue-text">千年中国史</span></span></h1><p>从文明初曙到时代新篇。<br/>循着时间的脉络，快速认识千年中国。</p><Link className="primary-link" href={articleHref('258')}>开始阅读 <ArrowRight size={18}/></Link><a className="quiet-link" href="#explore">探索历史 <MoveDown size={15}/></a></div>
    <div className="hero-index"><div className="index-top"><span>中国历史 · 一卷长读</span><span>CHINA, THROUGH TIME</span></div><div className="timeline-preview">{categories.map(c => <Link href={categoryHref(c.name)} className="timeline-stop" key={c.name}><span className="timeline-marker"/><span className="timeline-period">{c.range}</span><span className="timeline-name">{c.name}<ArrowUpRight size={20}/></span><span className="timeline-description">{c.title}</span></Link>)}</div><div className="index-bottom"><BookOpen size={16}/><span>半小时，建立中国历史的整体脉络。</span></div></div></section>
    <section className="explore-section" id="explore"><div className="shell"><div className="section-heading"><div><span className="eyebrow">EXPLORE THE ERAS</span><h2>循时而读</h2></div><p><PreferredWrap first="选择一个时代，" second="走进它的故事。"/></p></div><div className="era-grid">{categories.map(c => <Link className="era-card" key={c.name} href={categoryHref(c.name)}><div className="era-top"><span>{c.number}</span><span>{c.range}</span></div><h3>{c.name}<ArrowUpRight size={24}/></h3><div className="era-en">{c.en}</div><p><PreferredWrap first={eraDescriptions[c.name][0]} second={eraDescriptions[c.name][1]}/></p><div className="era-bottom">{articlesForCategory(c.name).length} 篇文章<span>进入目录 <ArrowRight size={16}/></span></div></Link>)}</div></div></section>
    <section className="shell chapter-section"><div className="section-heading"><div><span className="eyebrow">A WALK THROUGH ANCIENT CHINA</span><h2><PreferredWrap first="从这里，" second="走进中国古代史"/></h2></div><Link className="text-link" href={categoryHref('古代史')}>全部古代史 <ArrowRight size={16}/></Link></div><div className="chapters-layout"><div className="chapter-intro"><span className="chapter-character" aria-hidden="true">古</span><div><span className="eyebrow">CIVILIZATION & CONTINUITY</span><h3>千年更迭，<br/>一脉相承。</h3><p>从先民聚落到统一王朝，<br/>七个篇章，串起古代中国。</p></div></div><div className="chapter-list">{ancient.map((a, i) => <Link key={a.id} href={articleHref(a.id)} className="chapter-row"><span className="chapter-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{shortTitle(a.title)}</h3><span>{periods[a.id]}</span></div><ArrowUpRight size={18}/></Link>)}</div></div></section>
    <section className="shell chronicle-banner"><div className="chronicle-years" aria-hidden="true">1949<span>—</span>2019</div><div><span className="eyebrow">THE CHRONICLES</span><h2>以年为序，与历史相遇。</h2><p><PreferredWrap first="翻阅中华人民共和国大事记，" second="在具体的日子里，看见时代的变迁。"/></p><Link className="text-link" href={categoryHref('大事记')}>翻阅大事记 <ArrowRight size={17}/></Link></div><Clock3 size={25} strokeWidth={1}/></section>
  </main>;
}
