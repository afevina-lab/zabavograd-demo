#!/usr/bin/env python3
"""Prepare transparent *rendered* card skins without overwriting editorial originals.

White paper behind a rounded forest frame must be removed; the white face INSIDE
the closed green border stays intact. Flood-fill only connected, pale border
pixels. No color/saturation changes, no cropping and no nine-slice reconstruction.
"""
from collections import deque
from pathlib import Path
import sys

from PIL import Image, ImageFilter

base = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
skin_paths = [
    "assets/themes/forest/back.webp",
    "assets/themes/forest/front.webp",
    "assets/neutral/approved-back.webp",
    "assets/neutral/approved-front.webp",
    "assets/space/card-back-v2.webp",
    "assets/space/card-front-v2.webp",
]


def cut_paper_backdrop(path: Path) -> int:
    image = Image.open(path).convert("RGBA")
    w, h = image.size
    pixels = image.load()
    # Already-transparent illustrations do not need any destructive conversion.
    corners = [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]]
    if sum(p[3] < 90 for p in corners) >= 3:
        return 0
    if sum(min(p[:3]) > 170 and max(p[:3]) - min(p[:3]) < 85 for p in corners) < 3:
        return 0

    def paper(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a > 150 and r > 177 and g > 169 and b > 151 and r - g < 58 and g - b < 61

    seen = bytearray(w * h)
    queue = deque()

    def offer(x: int, y: int):
        i = y * w + x
        if not seen[i] and paper(x, y):
            seen[i] = 1
            queue.append((x, y))

    for x in range(w):
        offer(x, 0)
        offer(x, h - 1)
    for y in range(h):
        offer(0, y)
        offer(w - 1, y)
    n = 0
    while queue:
        x, y = queue.popleft()
        n += 1
        if x > 0:
            offer(x - 1, y)
        if x + 1 < w:
            offer(x + 1, y)
        if y > 0:
            offer(x, y - 1)
        if y + 1 < h:
            offer(x, y + 1)
    if not n:
        return 0
    # Feather only the boundary, not the whole card.
    removal = Image.frombytes("L", (w, h), bytes(255 if hit else 0 for hit in seen))
    feather = removal.filter(ImageFilter.GaussianBlur(radius=0.7))
    old_alpha = image.getchannel("A")
    alpha = Image.new("L", (w, h), 255)
    alpha_pixels = alpha.load()
    remove_pixels = feather.load()
    source_alpha = old_alpha.load()
    for y in range(h):
        for x in range(w):
            alpha_pixels[x, y] = source_alpha[x, y] * (255 - remove_pixels[x, y]) // 255
    image.putalpha(alpha)
    assert image.getpixel((0, 0))[3] <= 15, f"Paper matte remained at {path}"
    assert image.getpixel((w // 2, h // 2))[3] >= 220, f"Card interior removed: {path}"
    image.save(path, "WEBP", quality=94, method=6, exact=True)
    return n


for relative in skin_paths:
    path = base / relative
    if not path.is_file():
        raise SystemExit(f"Missing artwork: {path}")
    removed = cut_paper_backdrop(path)
    print(f"{relative}: transparent paper pixels={removed}")

# Do not silently regress to the opaque forest card exports.
for relative in skin_paths[:2]:
    im = Image.open(base / relative).convert("RGBA")
    assert im.getpixel((0, 0))[3] < 20, f"Forest frame still has a white corner: {relative}"
print("Card skin alpha verified")
