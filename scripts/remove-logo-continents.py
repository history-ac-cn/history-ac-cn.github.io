"""Erase the old logo's white continents without redrawing its blue ribbons.

Usage: python3 scripts/remove-logo-continents.py ARCHIVED_SOURCE.png OUTPUT.png
Requires Pillow, NumPy and SciPy. This is a one-time asset edit, not a build step.
Only alpha values are cleared; all retained RGBA pixels remain byte-identical.
"""
from pathlib import Path
import argparse
import hashlib
import json

import numpy as np
from PIL import Image
from scipy import ndimage

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
assert args.source.resolve() != args.output.resolve(), 'Keep the archived source intact.'

original = np.array(Image.open(args.source).convert('RGBA'))
rgb = original[:, :, :3].astype(np.int16)
colored = (rgb.max(axis=2) - rgb.min(axis=2)) > 24

# The two large, nearly opaque blue components form the original ribbon artwork.
# Small colored fragments are antialiased continent outlines and background noise.
labels, _ = ndimage.label(colored & (original[:, :, 3] >= 200), structure=np.ones((3, 3)))
sizes = np.bincount(labels.ravel())
sizes[0] = 0
ribbon_ids = np.flatnonzero(sizes >= 1000)
assert len(ribbon_ids) == 2, 'Unexpected source artwork; inspect before changing the mask.'
core = np.isin(labels, ribbon_ids)

# Preserve the existing antialiased ribbon edges within three source pixels.
# This support mask removes faint coastline traces far from the actual ribbons.
near_ribbon = ndimage.distance_transform_edt(~core) <= 3
keep = colored & near_ribbon
edited = original.copy()
edited[~keep, 3] = 0

assert np.array_equal(original[:, :, :3], edited[:, :, :3]), 'RGB colors changed.'
assert np.array_equal(original[keep], edited[keep]), 'Retained ribbon pixels changed.'
assert np.array_equal(original[core], edited[core]), 'Opaque ribbon artwork changed.'
assert int((edited[:, :, 3] > 0).sum()) > 490_000, 'Unexpected loss of ribbon artwork.'
args.output.parent.mkdir(parents=True, exist_ok=True)
Image.fromarray(edited).save(args.output)
report = {
    'source': str(args.source),
    'output': str(args.output),
    'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
    'output_sha256': hashlib.sha256(args.output.read_bytes()).hexdigest(),
    'size': [edited.shape[1], edited.shape[0]],
    'cleared_pixels': int(((original[:, :, 3] > 0) & (edited[:, :, 3] == 0)).sum()),
    'retained_pixels': int((edited[:, :, 3] > 0).sum()),
    'rgb_unchanged': True,
    'retained_rgba_unchanged': True,
}
print(json.dumps(report, ensure_ascii=False, indent=2))
