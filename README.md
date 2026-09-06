# 中国历史学习网

始于 2019 年左右的个人历史学习网站。2026 年重建，保留淡蓝色、简约、无广告的初衷。

## 直接在电脑上打开

**双击本目录的 `index.html`。** 无需安装 Node.js、启动服务器或联网。

请保留旁边的 `preview/` 文件夹。首页、分类、全部 83 篇文章、全文搜索、移动导航、字号调节和中文字体都可离线使用。外部的 Internet Archive 来源链接需要联网。

`preview/` 是完整的可发布版本。根目录 `index.html` 是使用同一份资源的本地入口；不要单独移动该文件。

## 发布到 GitHub Pages

1. 将整个项目放入你的 GitHub 仓库并推送到 `main`。不要上传 `site/node_modules/` 或 `site/dist/`；已写入 `.gitignore`。
2. 在仓库 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
3. 运行 **Actions → Build and publish to GitHub Pages → Run workflow**，或再推送一次修改。
4. 工作流安装锁定的依赖，构建、验证后，只发布 `preview/`；部署链接会显示在工作流和 Pages 设置中。

使用相对链接，支持 `https://用户名.github.io/仓库名/`、用户主页仓库及独立域名，无需改写站内路径。工作流会自动读取 Pages 的子目录路径，保证失效深层链接上的 404 页面也能加载样式并返回首页。不需要任何服务器、数据库或发布密钥。目前仅配置了工作流，尚未关联或推送到具体的 GitHub 仓库。

若继续使用 `www.history.ac.cn`，请在 GitHub Pages 的 **Custom domain** 中设置该域名，并按 GitHub 的提示修改 DNS。项目没有预设 CNAME，也未操作域名或 DNS，以免影响现有解析。GitHub Pages 的配置和绑定状态由仓库设置管理。

[GitHub 官方工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 开发和重新生成本地版

需要 Node.js 24 LTS（最低 22.13）、npm，以及 Python 3（仅使用标准库进行验证）。

```sh
npm --prefix site ci
npm run dev
```

预览通常在 `http://127.0.0.1:3000`。源码修改会自动更新开发预览；双击使用的本地版需重新生成：

```sh
npm run build
```

该命令预渲染所有页面、输出 `preview/` 和根目录 `index.html`，然后验证全部站内链接、文章完整性、字体与交互。`npm run verify` 可单独检查现有本地版。

构建阶段使用 React、TypeScript、Vinext 和 Vite；最终发布内容是完整 HTML、CSS 与少量普通 JavaScript。发布包移除框架运行时、RSC 数据、模块脚本和网络数据请求，因此支持 `file://`、禁用 JavaScript 时阅读正文，以及任意静态托管。全文搜索采用本地索引，不向外部提交搜索内容。

## 文件说明

- `index.html`：可双击的本地首页。
- `404.html`：可双击的自定义错误页，提供返回首页与搜索入口。
- `preview/`：可独立复制、备份和发布的完整网站，约 5 MB；建议和源码一起提交，以便克隆后立即阅读。
- `site/app/`：首页、目录、文章、搜索、关于页面及样式。
- `site/content/articles.json`：恢复的 83 篇文章，包含原文、分类与存档来源。
- `site/public/assets/`：新版与原版 logo、搜索脚本、嵌入字体及许可证。
- `recovery/`：原始首页 HTML、关于页 HTML、原版 logo 与新版 logo 生成提示。
- `scripts/recover.py`：从保存的首页快照重新提取正文，不执行存档脚本。
- `scripts/make-portable.mjs`：静态导出转成可离线打开的 HTML。
- `scripts/verify-portable.py`：检查全部页面、站内链接、锚点和嵌入资源。
- `scripts/verify-interactions.mjs`：检查搜索、空结果、导航菜单和字号调节逻辑。
- `.github/workflows/pages.yml`：自动构建和发布流程。

更新文章可编辑 `site/content/articles.json` 后重新构建；文章沿用 `/archives/原文章ID/` 地址，分类沿用 `/archives/category/分类名/`。恢复脚本会覆盖此 JSON，编辑后请勿无意重新执行恢复脚本。

## 恢复范围与原文说明

来源：[2021-04-19 首页存档](https://web.archive.org/web/20210419051634/https://www.history.ac.cn/)。恢复了中国历史总览 1 篇、古代史 8 篇、近代史 12 篇、现代史 1 篇、大事记 61 篇（总览 1 篇、年度记录 60 篇）。

大事记范围为 1949—2009 年，**2007 年未出现在本次恢复的首页快照中**。没有补写虚构文章。原站评论未迁移；旧备案号、联系方式和服务器相关服务未作为当前有效信息使用。

历史正文保留原站表述，清除跟踪脚本、WordPress 样式与危险 HTML 属性，修整段落和目录语义。原站注明的《中华人民共和国年鉴》《中华人民共和国大事记》等资料版权归原作者所有；资料中的时间、数据、历史分期与结论反映原文写作时点，不代表已经重新编审或更新至今。约 60,841 字符的正文以 JSON 与原始 HTML 双份保留。

## 嵌入字体与图标

正文和标题使用 Noto Serif SC 的站点子集，界面使用 Noto Sans SC 的站点子集；字重为可变字体。两款字体合计约 1.2 MB，重命名为 `History Serif` / `History Sans`，采用 SIL Open Font License 1.1。许可证、字体文件与哈希清单位于 `site/public/assets/fonts/`。CSS 将字体作为 data URL 嵌入，避免本地文件模式对字体请求的限制；没有 Google Fonts 或其他远程字体依赖。

字体来源：[Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc)、[Noto Sans SC](https://github.com/google/fonts/tree/main/ofl/notosanssc)。

子集覆盖当前站点文字；今后加入未包含的新字时会回退到系统字体。要更新子集，下载上述项目的原始可变 TTF，安装 `fonttools[woff]`，然后运行：

```sh
python3 scripts/subset-fonts.py /path/to/NotoSerifSC.ttf /path/to/NotoSansSC.ttf
npm run build
```

Logo 使用站长提供的原版为参考，由内置 ImageGen 生成适应性版本；原版和新版均保留。图标使用 Lucide（ISC），相关许可随网站一并提供。站内不引入无关图片、广告、分析跟踪或第三方评论系统。
