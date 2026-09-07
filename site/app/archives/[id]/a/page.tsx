import { notFound } from 'next/navigation';
import { comparableChronicles as chronicles2019, absoluteUrl } from '@/lib/content';
import { chronicleHref } from '@/lib/chronicle-editions.mjs';
import { openGraph, twitterCard } from '@/lib/seo';
import ArticleReader from '@/components/article-reader';

export const dynamicParams = false;
export function generateStaticParams() {
  return chronicles2019.map(article => ({ id: article.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = chronicles2019.find(item => item.id === id);
  if (!article) return { title: '文章未找到', robots: { index: false, follow: true } };
  const canonical = absoluteUrl(chronicleHref(id, '2019'));
  const title = `${article.title} · 2019 年版`;
  const description = `${title}：${article.excerpt}`;
  return { title, description, alternates: { canonical }, openGraph: openGraph(title, description, canonical, 'article'), twitter: twitterCard(title, description) };
}

export default async function EditionArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = chronicles2019.find(item => item.id === id);
  if (!article) notFound();
  return <ArticleReader article={article} view="2019"/>;
}
