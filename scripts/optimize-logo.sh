#!/bin/sh
# Preserve the original logo; generate lossless WebP copies at >=4x display size.
# Requires cwebp and sips (macOS). Run only when replacing the source logo.
set -eu
cd "$(dirname "$0")/.."
cwebp -quiet -lossless -exact -m 6 -resize 192 192 site/public/assets/logo.png -o site/public/assets/logo-header.webp
# Keep the original RGB data during resizing so edge colors remain identical.
# Only after resizing, discard invisible RGB under alpha=0 and compress losslessly.
logo_about_work=$(mktemp "${TMPDIR:-/tmp}/history-logo-about.XXXXXX")
trap 'rm -f "$logo_about_work"' EXIT
cwebp -quiet -lossless -exact -m 6 -resize 640 640 site/public/assets/logo.png -o "$logo_about_work"
cwebp -quiet -z 9 -alpha_filter best "$logo_about_work" -o site/public/assets/logo-about.webp
sips -z 96 96 site/public/assets/logo.png --out site/public/assets/favicon.png >/dev/null
