#!/bin/sh
# Preserve the original logo; generate lossless WebP copies at >=4x display size.
# Requires cwebp and sips (macOS). Run only when replacing the source logo.
set -eu
cd "$(dirname "$0")/.."
cwebp -quiet -lossless -exact -m 6 -resize 192 192 site/public/assets/logo.png -o site/public/assets/logo-header.webp
cwebp -quiet -lossless -exact -m 6 -resize 640 640 site/public/assets/logo.png -o site/public/assets/logo-about.webp
sips -z 96 96 site/public/assets/logo.png --out site/public/assets/favicon.png >/dev/null
