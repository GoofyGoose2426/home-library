"""Draw the app icon (three books on the shelf) as PNGs, using only the
standard library. Run: python3 -I scripts/icons/make_icons.py
Writes public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png.
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "public"
SS = 4  # supersampling for smooth edges

BG = (192, 87, 62)  # --accent (terracotta)
SHELF = (122, 52, 37)
BOOKS = [
    # x, y_top, width, colour  (in a 100x100 design grid)
    (20, 26, 14, (251, 246, 239)),  # cream
    (36, 34, 12, (246, 225, 214)),  # peach
    (50, 22, 15, (243, 227, 211)),  # sand
]
LEAN = (75, 30, 13, (251, 246, 239))  # book leaning on the sand one
BAND = (192, 87, 62)


def inside_round_rect(px, py, x0, y0, x1, y1, r):
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    cx = min(max(px, x0 + r), x1 - r)
    cy = min(max(py, y0 + r), y1 - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def colour_at(u, v):
    """Colour at design coordinates u, v in 0..100."""
    shelf_y = 74
    # leaning book: rotate point around its bottom-left corner
    lx, ly, lw, lc = LEAN
    import math
    a = math.radians(14)
    ox, oy = lx, shelf_y
    du, dv = u - ox, v - oy
    ru = ox + du * math.cos(a) - dv * math.sin(a)
    rv = oy + du * math.sin(a) + dv * math.cos(a)
    if inside_round_rect(ru, rv, lx, ly, lx + lw, shelf_y, 1.5):
        if ly + 8 < rv < ly + 11:
            return BAND
        return lc
    for x, y, w, c in BOOKS:
        if inside_round_rect(u, v, x, y, x + w, shelf_y, 1.5):
            if y + 8 < v < y + 11 or shelf_y - 11 < v < shelf_y - 8:
                return BAND
            return c
    if 14 <= u <= 92 and shelf_y <= v <= shelf_y + 5:
        return SHELF
    return BG


def render(size, path):
    big = size * SS
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            acc = [0, 0, 0]
            for sy in range(SS):
                for sx in range(SS):
                    u = (x * SS + sx + 0.5) / big * 100
                    v = (y * SS + sy + 0.5) / big * 100
                    c = colour_at(u, v)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
            n = SS * SS
            row += bytes((acc[0] // n, acc[1] // n, acc[2] // n))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)
    print(path, len(png), "bytes")


if __name__ == "__main__":
    render(180, OUT / "apple-touch-icon.png")
    render(192, OUT / "icon-192.png")
    render(512, OUT / "icon-512.png")
