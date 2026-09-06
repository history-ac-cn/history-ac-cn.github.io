# 中国历史学习网

> 半小时搞定千年中国史

中国历史学习网（Chinese History Learning Network）是一个无广告、非盈利的中国历史学习网站。网站以简洁、安静的阅读体验呈现中国历史资料，帮助读者建立从原始社会到现代中国的整体脉络。

这个项目最早创建于 2019 年左右。原网站关闭后，2026 年的重建工作从 [Internet Archive 保存的 2021 年 4 月 19 日首页快照](https://web.archive.org/web/20210419051634/https://www.history.ac.cn/)及其关联页面中恢复了 83 篇正文，并重新设计了界面、导航、搜索和离线阅读体验。

## 项目特点

- 收录中国历史概览、古代史、近代史及「现代史·大事记」等内容。
- 采用响应式设计，支持桌面端和移动端阅读。
- 提供本地全文搜索、字号调节、键盘快捷键和移动导航。
- 字体嵌入网站，无需请求 Google Fonts 等外部字体服务。
- 不包含广告、分析跟踪、第三方评论系统或运行时网络数据请求。
- 支持 GitHub Pages、任意静态托管和 `file://` 本地离线阅读。
- 在线地址使用不带 `index` 或 `index.html` 的简洁路径，并兼容旧分类地址。
- 包含独立的 404 页面，可从失效链接返回首页或进入搜索。

## 直接阅读

克隆或下载整个仓库后，双击根目录的 `index.html` 即可打开网站。离线阅读不需要安装 Node.js、启动本地服务器或连接网络。

根目录的 `index.html` 会进入 `preview/` 中的完整离线版本，因此两者需要保存在原有的相对位置。首页、分类目录、全部文章、全文搜索、导航、字号调节和嵌入字体均可离线使用；指向 Internet Archive 的外部链接仍需联网访问。

## 本地开发

开发环境需要：

- Node.js 24 LTS，最低支持 22.13
- npm
- Python 3，仅使用标准库运行静态站点验证

安装依赖并启动开发服务器：

```sh
npm --prefix site ci
npm run dev
```

开发预览通常位于 `http://127.0.0.1:3000`。源码修改会自动更新开发预览。

生成发布版和可双击打开的离线版：

```sh
npm run build
```

构建命令会预渲染全部页面，生成 `site/dist/pages/`、`preview/`、根目录入口和 404 页面，随后检查文章完整性、站内链接、锚点、嵌入资源、搜索、交互和导航行为。

已有构建产物可以单独验证：

```sh
npm run verify
```

TypeScript 检查可以单独运行：

```sh
npm run typecheck
```

## GitHub Pages 部署

仓库内的 [Pages 工作流](.github/workflows/pages.yml)会在推送到 `main` 或 `master` 分支时自动完成以下步骤：

1. 安装锁定版本的依赖。
2. 检查 TypeScript。
3. 构建并验证静态网站。
4. 将 `site/dist/pages/` 发布到 GitHub Pages。

使用此项目建立新的 GitHub Pages 站点时，需要在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。工作流会读取 GitHub Pages 的基础路径，因此同时支持用户主页仓库、项目仓库和独立域名。

绑定独立域名时，应在 GitHub Pages 设置中填写域名，并按照 GitHub 提示配置 DNS。仓库不预设 `CNAME`，以免 fork 后意外继承原站域名。

## 内容范围

本项目从旧站存档中恢复了 83 篇正文：

| 内容 | 恢复数量 |
| --- | ---: |
| 中国历史概览 | 1 篇 |
| 古代史 | 8 篇 |
| 近代史 | 12 篇 |
| 现代史 | 1 篇 |
| 中华人民共和国大事记 | 61 篇 |
| **合计** | **83 篇** |

大事记的存档恢复内容包括 1 篇总览和 60 篇年度记录。2007 年资料后来作为新增内容补入，因此当前网站共有 84 篇可阅读正文，年度目录连续覆盖 1949—2009 年。

「现代史·大事记」以《中国现代史》为开篇，并保留年代导航和年份网格。原「现代史」与「大事记」分类地址会自动跳转到合并后的目录。年度正文只在显示层按月份合并为自然段，恢复的原始语料仍单独保存在内容文件中。

历史正文保留旧站的表述和原有来源信息，同时清除了跟踪脚本、WordPress 样式和不安全的 HTML 属性。部分资料中的时间、数据、历史分期与结论反映原文写作时点，阅读和引用时宜结合最新教材、原始史料与研究成果核对。

## 内容维护

- 恢复的 83 篇正文位于 `site/content/articles.json`。
- 后续新增内容位于 `site/content/additions.json`。
- 新增或修改内容后运行 `npm run build`，目录和搜索索引会自动更新。
- 文章沿用 `/archives/文章ID/` 地址，分类使用 `/archives/category/分类名/` 地址。
- `scripts/recover.py` 用于从保存的首页快照重新提取旧站正文。该脚本会覆盖恢复内容文件，已有人工修改时请谨慎运行。

## 技术实现

源码使用 React、TypeScript、Vinext 和 Vite。构建过程会将应用预渲染为完整 HTML、CSS 和少量普通 JavaScript，并移除框架运行时、RSC 数据、模块脚本和网络数据请求。即使禁用 JavaScript，文章正文仍然可以阅读。

站内搜索使用随页面发布的本地索引，搜索内容不会发送到外部服务。导航脚本会在线上环境中规范化 `index` 和 `index.html` 地址，在本地文件环境中则自动切换为明确的 HTML 文件路径。

## 字体与图形资源

网站使用经过子集化的 Noto Serif SC 和 Noto Sans SC 可变字体，分别命名为 `History Serif` 和 `History Sans`。字体通过 CSS data URL 嵌入，采用 SIL Open Font License 1.1；字体文件、许可证与哈希清单位于 `site/public/assets/fonts/`。

字体子集仅覆盖当前站点文字。加入新字后，如需避免系统字体回退，可以下载 [Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc) 和 [Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc) 的原始可变 TTF，安装 `fonttools[woff]`，然后运行：

```sh
python3 scripts/subset-fonts.py /path/to/NotoSerifSC.ttf /path/to/NotoSansSC.ttf
npm run build
```

新版 logo 延续了原站由站长绘制的蓝色环带地球构图。原版、新版和重建参考资料均保存在 `recovery/`。界面图标来自 [Lucide](https://lucide.dev/)，其 ISC 许可证随网站资源一并保留。

## 目录结构

```text
.
├── .github/workflows/pages.yml   # GitHub Pages 构建与部署
├── index.html                    # 本地离线入口
├── 404.html                      # 本地 404 页面
├── preview/                      # 完整离线网站
├── recovery/                     # 旧站快照与原始 logo
├── scripts/                      # 恢复、构建转换与验证脚本
└── site/
    ├── app/                      # 页面、组件与全局样式
    ├── content/                  # 恢复内容与新增内容
    ├── lib/                      # 内容整理逻辑
    ├── public/assets/            # logo、字体和浏览器脚本
    └── dist/pages/               # GitHub Pages 发布产物
```

## 资料与版权

旧站说明其历史资料主要整理、转载自《中华人民共和国年鉴》《中华人民共和国大事记》等文献，相关文字版权归原作者所有，并依据原作者注明出处的要求使用。仓库中的字体和 Lucide 图标遵循各自随附的许可证。
