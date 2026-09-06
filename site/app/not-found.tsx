import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
export default function NotFound() {
  return <main id="main" className="shell missing-page"><span className="error-code" aria-hidden="true">404</span><div className="error-content"><span className="eyebrow">A PAGE OUT OF TIME</span><h1>这一页，还未寻回。</h1><p>历史偶尔会留下空白。<br/>你访问的地址不存在，或尚未从旧站存档中恢复。</p><div className="error-actions"><Link className="primary-link" href="/"><ArrowLeft size={17}/> 回到首页</Link><Link className="text-link" href="/search/"><Search size={16}/> 搜索历史</Link></div><div className="error-footnote">换一条路，故事还在继续。</div></div></main>;
}
