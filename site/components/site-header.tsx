'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
const nav = [['首页', '/'], ['古代史', '/archives/category/古代史/'], ['近代史', '/archives/category/近代史/'], ['现代史·大事记', '/archives/category/现代史·大事记/'], ['关于', '/about/']];
export function SiteHeader() {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" className="brand" aria-label="中国历史学习网首页"><img src={`${base}/assets/logo-header.webp`} width="43" height="43" alt="" /><span>中国历史学习网<small>CHINESE HISTORY LEARNING NETWORK</small></span></Link>
    <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="主导航">{nav.map(([name, href]) => <Link key={name} href={href} onClick={() => setOpen(false)} aria-current={decodeURIComponent(path || '/').replace(/\/$/, '') === href.replace(/\/$/, '') ? 'page' : undefined}>{name}</Link>)}</nav>
    <div className="header-actions"><Link href="/search/" className="search-link" aria-label="搜索历史内容"><Search size={19}/><span>搜索</span><kbd>/</kbd></Link><button className="menu-toggle" aria-expanded={open} aria-label={open ? '关闭菜单' : '打开菜单'} onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>
  </div></header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="shell footer-main"><div><Link href="/" className="footer-brand">中国历史学习网<span>HISTORY.AC.CN</span></Link><p>半小时搞定千年中国史</p></div><div className="footer-links"><Link href="/about/">关于本站</Link></div></div><div className="shell footer-bottom"><a className="icp-link" href="http://www.miitbeian.gov.cn/" target="_blank" rel="noreferrer">京ICP备19010237号</a><span>无广告 · 自由阅读</span></div></footer>;
}
