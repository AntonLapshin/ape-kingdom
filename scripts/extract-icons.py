#!/usr/bin/env python3
"""
Ape Kingdom — pixel-art icon extraction script.

Extracts the 8 pixel-art game icons from the source image attached to issue
#103 (a 4x2 grid of icons on a white background), crops each to its content
bounding box and removes the white background, writing clean RGBA PNGs.

Usage:
    python3 scripts/extract-icons.py SOURCE.png --out OUT_DIR

The source image is a 593x1064 PNG with 8 pixel-art icons on a white
background arranged 4 rows x 2 columns:
    Row 0: Home Tree, Monkey Nest
    Row 1: Monkey, Gibbon
    Row 2: Chimpanzee, Gorilla
    Row 3: Mountain, Grave
"""

from __future__ import annotations

import argparse
import os
from collections import deque

from PIL import Image

# Each icon's content bounding box in the source image (left, top, right, bottom),
# located via connected-component analysis of the non-white pixels.
ICONS = {
    "home-tree": (64, 52, 255, 244),
    "monkey-nest": (338, 52, 530, 244),
    "monkey": (63, 301, 255, 505),
    "gibbon": (338, 301, 530, 505),
    "chimpanzee": (64, 563, 255, 758),
    "gorilla": (347, 558, 525, 763),
    "mountain": (64, 824, 255, 1006),
    "grave": (347, 842, 525, 1002),
}

# Transparent padding added around each icon's content bounding box.
MARGIN = 4
# Flood-fill traversal threshold: pixels with a luminance >= this value that are
# reachable from the crop border are treated as background and removed.
TRAVERSE = 180


def remove_white_background(img: Image.Image) -> Image.Image:
    """Return a copy of `img` (RGBA) with its white background made transparent.

    Only background white is removed: a flood fill from the crop border marks
    near-white pixels reachable from the border as background, which are then
    feathered to transparency. Enclosed white detail (e.g. a character's face)
    that is surrounded by darker icon content is preserved opaque.
    """
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    luminance = [
        [(px[x, y][0] + px[x, y][1] + px[x, y][2]) / 3 for x in range(w)]
        for y in range(h)
    ]

    # Mark background pixels via a flood fill from the border.
    bg = [[False] * w for _ in range(h)]
    queue = deque()
    for y in range(h):
        for x in range(w):
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                if luminance[y][x] >= TRAVERSE and not bg[y][x]:
                    bg[y][x] = True
                    queue.append((x, y))
    while queue:
        x, y = queue.popleft()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and luminance[ny][nx] >= TRAVERSE and not bg[ny][nx]:
                    bg[ny][nx] = True
                    queue.append((nx, ny))

    # Feather background pixels to transparency (alpha scales with how far the
    # pixel is from pure white, giving a soft anti-aliased edge).
    for y in range(h):
        for x in range(w):
            if bg[y][x]:
                r, g, b = px[x, y][:3]
                alpha = 255 - min(r, g, b)
                px[x, y] = (r, g, b, alpha)

    return img


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Path to the source image (the #103 sheet).")
    parser.add_argument(
        "--out", default="src/assets/icons", help="Output directory for the extracted icons."
    )
    args = parser.parse_args()

    source = Image.open(args.source).convert("RGB")
    os.makedirs(args.out, exist_ok=True)

    for name, (x0, y0, x1, y1) in ICONS.items():
        crop = source.crop((x0 - MARGIN, y0 - MARGIN, x1 + MARGIN, y1 + MARGIN))
        icon = remove_white_background(crop)
        path = os.path.join(args.out, f"{name}.png")
        icon.save(path)
        print(f"wrote {path} ({icon.size[0]}x{icon.size[1]})")


if __name__ == "__main__":
    main()
