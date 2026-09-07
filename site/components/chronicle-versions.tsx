import Link from 'next/link';
import { Columns2 } from 'lucide-react';
import { chronicleViewHref, chronicleVersionsFor } from '@/lib/content';

export function ChronicleVersions({ id, view = '2009' }: { id: string; view?: '2009' | '2019' | 'compare' }) {
  const available = chronicleVersionsFor(id);
  return <nav className="chronicle-versions" aria-label="大事记版本">
    <span className="version-label">版本</span>
    {available.map(edition => <Link key={edition} href={chronicleViewHref(id, edition)} aria-current={view === edition ? 'page' : undefined} title={`中华人民共和国大事记（1949年10月—${edition}年9月）`}>{edition} 年版</Link>)}
    {available.length > 1 && <Link href={chronicleViewHref(id, 'compare')} aria-current={view === 'compare' ? 'page' : undefined}><Columns2 size={15} aria-hidden="true"/>并排对比</Link>}
  </nav>;
}
