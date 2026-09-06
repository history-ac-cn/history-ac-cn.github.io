import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site-header';
import './globals.css';
export const metadata: Metadata = {
  title: { default: '中国历史学习网 · 读懂千年中国史', template: '%s · 中国历史学习网' },
  description: '始于2019年的中国历史学习网。阅读古代史、近代史、现代史与历年大事记，在简洁、无广告的空间里理解中国历史。',
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/logo.png` },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><head><link rel="stylesheet" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/fonts/embedded.css`}/></head><body><a className="skip-link" href="#main">跳至正文</a><SiteHeader/>{children}<SiteFooter/><script src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/search-index.js`} defer/><script src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/site.js`} defer/></body></html>;
}
