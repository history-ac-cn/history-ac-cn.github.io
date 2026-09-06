import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Monitor, Sun, Moon } from 'lucide-react';
import { archiveUrl, asset, absoluteUrl } from '@/lib/content';
import { openGraph, twitterCard } from '@/lib/seo';
const description = '了解中国历史学习网从高中时期创办、因服务器关闭而丢失，到依据 Internet Archive 存档重建的故事。';
export const metadata: Metadata = {
  title: '关于本站',
  description,
  alternates: { canonical: absoluteUrl('/about/') },
  openGraph: openGraph('关于中国历史学习网', description, absoluteUrl('/about/')),
  twitter: twitterCard('关于中国历史学习网', description),
};
export default function About() {
  return <main id="main" className="shell inner-page about-page">
    <div className="breadcrumbs"><Link href="/">首页</Link><span>/</span><span>关于</span></div>
    <header className="page-heading"><span className="eyebrow">A LITTLE WEBSITE, A LASTING LOVE</span><h1>因为热爱，所以还在。</h1><p>一个始于 2019 年 3 月 16 日的历史网站，一段重新续写的故事。</p></header>
    <div className="about-layout">
      <aside className="about-mark"><img src={asset('/assets/logo.png')} width="160" height="160" alt="延续原版蓝色环带地球的新版标志"/><span>中国历史学习网</span><small>HISTORY.AC.CN · EST. 2019</small></aside>
      <div className="about-body">
        <section><h2>从一间高中教室开始</h2><p>中国历史学习网诞生于站长读高中的那段时间。出于对历史的热爱，这里将分散的资料整理起来，希望让更多人轻松走近中国历史。</p><blockquote className="original-about"><p>中国历史学习网（Chinese History Learning Network）是一个没有任何广告的非盈利性质网站，旨在为读者提供权威的关于中国历史的学术信息。</p><p>我们网站的使命是让读者在半小时内搞定千年中华史。网站覆盖了从原始社会的元谋人到现代中国的现状的历史资料，详细地阐述了中国的历史发展进程。即使对中国历史一无所知的朋友也可以通过我们的网站精通中国历史。网站不设置任何广告和无关图片，只为给予读者一个干净纯净的学习环境，还学术研究一片净土。</p><p>其文档均为学术目的转载自《中华人民共和国年鉴》和《中华人民共和国大事记》等备受尊敬的、具有高度学术性和权威性的文献，版权归原作者所有。本网站依据原作者注明出处的版权要求使用。</p><cite>—— 高中时期写的的那段「关于」</cite></blockquote><p>如今，本站仍然相信这段话背后的愿望：让入门更容易，让读者先建立起历史的整体脉络，再去发现值得细读的篇章。理解历史当然需要时间，而一个简洁的起点，可以让旅程开始。</p></section>
        <section><h2>失而复得的 83 篇文章</h2><p>在原站点运行了两三年之后，服务器价格突然大幅上涨，原先的网站未能继续保留，服务器上的内容也随之丢失。幸好，Internet Archive 保存下了它曾经的样子。</p><p>这一次重建完成于 2026 年 9 月 6 日，从 2021 年 4 月 19 日的首页快照中找回了 83 篇正文，覆盖中国历史概览、古代史、近代史、现代史，以及中华人民共和国大事记。原来绘制的蓝色环带地球，也在新的标志里得到延续。</p><a className="text-link" href={archiveUrl} target="_blank" rel="noreferrer">看看网站在 Internet Archive 存档里的模样 <ArrowUpRight size={15}/></a></section>
        <section id="sources"><h2>关于这里的资料</h2><p>历史资料主要整理、转载自《中华人民共和国年鉴》《中华人民共和国大事记》等文献，版权归原作者所有。本次重建保留原文及原站的来源标注，网页样式与阅读目录重新设计。</p><p>恢复的资料具有其写作年代的表述与信息边界，不等同于经过重新编审的当代历史研究。涉及具体史实、历史分期或学术观点时，建议结合最新教材、原始史料与研究成果阅读。</p><div className="source-facts"><div><strong>83 篇</strong><span>恢复的存档文章</span></div><div><strong>2021.04.19</strong><span>首页存档日期</span></div><div><strong>1949—2009</strong><span>大事记范围</span></div></div></section>
        <section><h2>简单一点，长久一点</h2><p>没有广告，也没有与阅读无关的干扰。你可以在线翻阅，也可以将整个网站保存在自己的电脑上，随时打开。希望这个小小的历史学习空间，能陪伴每一位好奇的读者。</p><Link className="text-link" href="/">回到首页，继续阅读 <ArrowRight size={15}/></Link></section>
        <section className="theme-preferences" aria-labelledby="theme-heading"><h2 id="theme-heading">外观</h2><p>网站默认跟随系统外观。你也可以为这台设备单独选择浅色或深色模式。</p><div className="theme-options" role="group" aria-label="网站外观"><button className="theme-choice" type="button" data-theme-choice="system" aria-pressed="true"><Monitor size={18}/> 跟随系统</button><button className="theme-choice" type="button" data-theme-choice="light" aria-pressed="false"><Sun size={18}/> 浅色</button><button className="theme-choice" type="button" data-theme-choice="dark" aria-pressed="false"><Moon size={18}/> 深色</button></div><p className="theme-status" id="theme-status" aria-live="polite">当前：跟随系统</p></section>
      </div>
    </div>
  </main>;
}
