import { notFound } from 'next/navigation';
import { articles, articleHref, absoluteUrl } from '@/lib/content';
import { chronicleYear } from '@/lib/chronicle-editions.mjs';
import { openGraph, twitterCard } from '@/lib/seo';
import ArticleReader from '@/components/article-reader';

export function generateStaticParams() {
  return articles.map(article => ({ id: article.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = articles.find(item => item.id === id);
  if (!article) return { title: '文章未找到', robots: { index: false, follow: true } };
  const canonical = absoluteUrl(articleHref(article.id));
  const title = article.title + (chronicleYear(article) ? ` · ${article.edition || '2009'} 年版` : '');
  const description = `${article.edition === '2019' ? title : article.title}：${article.excerpt}`;
  return { title, description, alternates: { canonical }, openGraph: openGraph(title, description, canonical, 'article'), twitter: twitterCard(title, description) };
}

export default async function Article({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = articles.find(item => item.id === id);
  if (!article) notFound();
  return <ArticleReader article={article} view={article.edition === '2019' ? '2019' : '2009'}/>;
}
