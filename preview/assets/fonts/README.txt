Bundled subsets of Noto Serif SC and Noto Sans SC, distributed under SIL OFL 1.1.
Renamed derivative families: History Serif and History Sans.
Font copyright and complete license: OFL-NotoSerifSC.txt and OFL-NotoSansSC.txt.
Source: https://github.com/google/fonts/tree/main/ofl/notoserifsc
Source: https://github.com/google/fonts/tree/main/ofl/notosanssc
Both retain variable weight axes. Subsets cover text present at build preparation time.
embedded.css embeds the WOFF2 files as data URLs for reliable offline file:// viewing.
Regenerate with scripts/subset-fonts.py when new characters are added.
Then run scripts/optimize-page-fonts.py against the existing preview/ pages.
optimized/ contains complete, variable font pairs shared by page type or decade.
Each family uses one file per page, without unicode-range segmentation.
The search profile keeps the original sans font for dynamic excerpts and input.
Portable builds choose a prepared profile only if it covers all required glyphs;
otherwise they use the original whole fonts until profiles are refreshed.
Normal builds require no font-processing libraries.
