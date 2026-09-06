import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/content';

export const siteName = '中国历史学习网';
export const siteDescription = '中国历史学习网是一个无广告的非盈利历史学习网站，收录中国古代史、近代史、现代史及 1949—2009 年中华人民共和国大事记。';
export const socialImage = { url: absoluteUrl('/assets/logo.png'), width: 1254, height: 1254, alt: '中国历史学习网标志' };

export function openGraph(title: string, description: string, url: string, type: 'website' | 'article' = 'website'): NonNullable<Metadata['openGraph']> {
  return { type, locale: 'zh_CN', siteName, title, description, url, images: [socialImage] };
}

export function twitterCard(title: string, description: string): NonNullable<Metadata['twitter']> {
  return { card: 'summary', title, description, images: [socialImage.url] };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}
