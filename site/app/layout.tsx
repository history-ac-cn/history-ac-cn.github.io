import type { Metadata } from 'next';
import { SiteHeader, SiteFooter } from '@/components/site-header';
import { absoluteUrl, siteUrl } from '@/lib/content';
import { openGraph, serializeJsonLd, siteDescription, siteName, twitterCard } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: { default: '中国历史学习网｜半小时搞定千年中国史', template: `%s｜${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  keywords: ['中国历史', '中国史', '古代史', '近代史', '现代史', '中华人民共和国大事记', '历史学习'],
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/logo.png` },
  openGraph: openGraph('中国历史学习网｜半小时搞定千年中国史', siteDescription, absoluteUrl('/')),
  twitter: twitterCard('中国历史学习网｜半小时搞定千年中国史', siteDescription),
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: siteName,
      alternateName: 'Chinese History Learning Network',
      url: absoluteUrl('/'),
      logo: { '@type': 'ImageObject', url: absoluteUrl('/assets/logo.png'), width: 1254, height: 1254 },
    },
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      name: siteName,
      alternateName: 'Chinese History Learning Network',
      url: absoluteUrl('/'),
      description: siteDescription,
      inLanguage: 'zh-CN',
      publisher: { '@id': absoluteUrl('/#organization') },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/search/')}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><head><link rel="stylesheet" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/fonts/embedded.css`}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}/></head><body><a className="skip-link" href="#main">跳至正文</a><SiteHeader/>{children}<SiteFooter/><script src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/search-index.js`} defer/><script src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/assets/site.js`} defer/></body></html>;
}
