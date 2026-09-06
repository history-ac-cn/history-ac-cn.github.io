import articles from '@/content/articles.json';
export { articles };
export const archiveUrl = 'https://web.archive.org/web/20210419051634/https://www.history.ac.cn/';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const asset = (path: string) => `${basePath}${path}`;
export const categories = [
  { name: '古代史', en: 'ANCIENT CHINA', number: '01', range: '远古 — 1840', title: '文明的起源与传承', description: '从先民的足迹到王朝的更迭，追寻中华文明绵延不绝的脉络。', overview: '256' },
  { name: '近代史', en: 'MODERN CHINA', number: '02', range: '1840 — 1949', title: '变局中的探索与觉醒', description: '从鸦片战争到新中国成立，读懂百余年间的变革、抗争与求索。', overview: '240' },
  { name: '现代史', en: 'CONTEMPORARY CHINA', number: '03', range: '1949 —', title: '建设与发展的历程', description: '回望新中国的建设历程，在时代的转折中理解今日中国。', overview: '214' },
];
export const categoryHref = (name: string) => `/archives/category/${name}/`;
export const articleHref = (id: string) => `/archives/${id}/`;
export const shortTitle = (title: string) => title.includes('——') ? title.split('——')[1].replace('（鸦片战争以前）', '') : title;
export const periods: Record<string, string> = {
  '254': '远古时期', '252': '约前 2070 — 前 476', '250': '前 475 — 220', '248': '220 — 589', '246': '581 — 907', '244': '907 — 1368', '242': '1368 — 1840',
  '238': '1840 — 1860', '236': '1851 — 1864', '234': '19 世纪中后期', '232': '1898 — 1901', '230': '1911 — 1912', '228': '1912 — 1919', '226': '1919 — 1921', '224': '1924 — 1927', '222': '1927 — 1937', '218': '1931 — 1945', '216': '1945 — 1949',
};
