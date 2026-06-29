#!/usr/bin/env python3
"""Deterministic halftone-dither detector for generated parallax/scene art.

Gemini fakes translucency and gradients with an ordered dot-screen (checkerboard)
pattern that reads in-game as ugly speckle. Visual inspection false-negatives on
faint top-edge bands, so this checks the actual pixels: it counts the classic
1px-checkerboard signature — a pixel that differs from BOTH its horizontal and
vertical neighbours but MATCHES its diagonal — and flags any image above a small
fraction. Run after `gen-level-parallax` / `prep-level`:

    python3 scripts/check-dither.py [glob ...]

Exits non-zero if any image exceeds the threshold (so it can gate CI).
"""
import glob
import sys

from PIL import Image

THRESHOLD = 1.5  # percent of sampled pixels matching the checkerboard signature

DEFAULT_GLOBS = [
    "public/assets/levels/*/*parallax*.webp",
    "public/assets/levels/*/*-tile.webp",
    "public/assets/levels/*/ground-*.webp",
    "public/assets/levels/*/water-surface.webp",
]


def _diff(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2])


def dither_score(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    checker = samp = 0
    step = max(1, min(w, h) // 400)
    for y in range(2, h - 2, step):
        for x in range(2, w - 2, step):
            c = px[x, y]
            if (
                _diff(c, px[x - 1, y]) > 24
                and _diff(c, px[x + 1, y]) > 24
                and _diff(c, px[x, y - 1]) > 24
                and _diff(c, px[x, y + 1]) > 24
                and _diff(c, px[x - 1, y - 1]) < 16
            ):
                checker += 1
            samp += 1
    return 100.0 * checker / max(1, samp)


def main(argv):
    patterns = argv[1:] or DEFAULT_GLOBS
    files = sorted({f for pat in patterns for f in glob.glob(pat)})
    if not files:
        print("no images matched", file=sys.stderr)
        return 1
    bad = []
    for f in files:
        s = dither_score(f)
        flag = "  <-- DITHER" if s > THRESHOLD else ""
        if flag:
            bad.append(f)
        rel = f.split("levels/")[-1] if "levels/" in f else f
        print(f"{s:5.2f}%  {rel}{flag}")
    if bad:
        print(f"\n{len(bad)} image(s) over the {THRESHOLD}% dither threshold.", file=sys.stderr)
        return 1
    print(f"\nAll {len(files)} images clean (< {THRESHOLD}% dither).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
