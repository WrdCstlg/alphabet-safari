"""
Build the app's own picture glyphs for things Unicode has no emoji for, as a colour font.

    py tools/build_picture_font.py

Each picture gets a Private Use code point (content.js uses it like any emoji, e.g. "\\uE000"),
so every place that shows or compares a card's picture works unchanged. The font joins the
'Safari Emoji' family in assets/fonts/fonts.css with unicode-range limited to these points.

Pictures are drawn here in a 128x128 grid (y down, like SVG) from ellipses and polygons in
flat colour layers (COLRv0), which every current browser draws, the Android WebView included.
Without colour support the outline still shows as a silhouette rather than an empty box.

Writes assets/fonts/safari-pictures-<hash>.woff2 and points fonts.css and sw.js at it.
Run `py build.py --sync` afterwards to copy it into the Android app.
Needs fontTools and brotli: `pip install fonttools brotli`.
"""
import glob
import hashlib
import io
import math
import os
import re

from fontTools.colorLib.builder import buildCOLR, buildCPAL
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.ttGlyphPen import TTGlyphPen

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS_DIR = os.path.join(BASE_DIR, "assets", "fonts")

# Same metrics as the bundled Noto Color Emoji subset, so pictures match its emoji in size.
UPM, ASCENT, DESCENT, ADVANCE = 1024, 950, -250, 1275
# The 128-unit drawing grid maps onto Noto's art box (about x 37..1237, y 968..-232).
SCALE, X0, Y0 = 9.375, 37, 968
STEPS = 120  # points per ellipse; facets stay far below a pixel even at spotlight size


def ellipse(cx, cy, rx, ry, angle=0.0):
    """Points of an ellipse, `angle` in degrees (clockwise on screen)."""
    a = math.radians(angle)
    pts = []
    for i in range(STEPS):
        t = 2 * math.pi * i / STEPS
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    return pts


def inside_ellipse(p, cx, cy, rx, ry):
    return ((p[0] - cx) / rx) ** 2 + ((p[1] - cy) / ry) ** 2 < 1


def crescent(cx, cy, rx, ry, dx, dy):
    """The part of an ellipse not covered by the same ellipse moved by (dx, dy): a shading
    band on the side away from the move. Stays inside the ellipse, as layers can't be clipped."""
    def run(points, keep):
        flags = [keep(p) for p in points]
        start = next(i for i in range(len(points)) if flags[i] and not flags[i - 1])
        ordered = points[start:] + points[:start]
        return [p for p, f in zip(ordered, flags[start:] + flags[:start]) if f]

    outer = run(ellipse(cx, cy, rx, ry), lambda p: not inside_ellipse(p, cx + dx, cy + dy, rx, ry))
    inner = run(ellipse(cx + dx, cy + dy, rx, ry), lambda p: inside_ellipse(p, cx, cy, rx, ry))
    return outer + inner[::-1]


def packed_circles(cx, cy, rx, ry, angle, r, gap=0.4, inset=0.4):
    """Centres of circles of radius `r` in a honeycomb inside a rotated ellipse. Each circle
    may cross the edge by up to (1 - inset) of its radius, so the edge looks full."""
    a = math.radians(-angle)
    step, centres = 2 * r + gap, []
    for row in range(-12, 13):
        y = cy + row * step * 0.87
        for col in range(-12, 13):
            x = cx + col * step + (step / 2 if row % 2 else 0)
            dx, dy = x - cx, y - cy
            u, v = dx * math.cos(a) - dy * math.sin(a), dx * math.sin(a) + dy * math.cos(a)
            if (u / (rx - r * inset)) ** 2 + (v / (ry - r * inset)) ** 2 <= 1:
                centres.append((x, y))
    return centres


# Pomegranate (رُمَّان, for the letter ر): a round red fruit with the flared calyx that sets it
# apart from an apple or a tomato, split open at the front to show its ruby seeds. Shading is
# stacked bands, since COLRv0 layers are flat colours.
BODY = (64, 81, 51, 46)
OPENING = (80, 89, 21, 25, -18)
SEED_R = 3.4
SEEDS = packed_circles(*OPENING[:2], OPENING[2] - 3, OPENING[3] - 3, OPENING[4], SEED_R, inset=0.85)
CALYX_BACK = [(43, 21), (53, 31), (57, 14), (64, 25), (71, 14), (75, 31), (85, 21), (79, 43), (49, 43)]
CALYX_FRONT = [(48, 27), (57, 34), (64, 19), (71, 34), (80, 27), (75, 45), (53, 45)]
POMEGRANATE = [
    # (colour RGBA, shapes) from back to front
    ((0x7F, 0x15, 0x1B, 255), [CALYX_BACK]),
    ((0xC6, 0x28, 0x28, 255), [ellipse(*BODY)]),
    ((0xAE, 0x22, 0x29, 255), [crescent(*BODY, -14, -13)]),       # shade, wide band
    ((0x8F, 0x1A, 0x20, 255), [crescent(*BODY, -6, -5)]),         # shade, edge
    ((0xD8, 0x3A, 0x36, 255), [crescent(*BODY, 10, 11)]),         # light, wide band
    ((0xEC, 0x5B, 0x52, 255), [crescent(*BODY, 4, 5)]),           # light, edge
    ((0x9A, 0x1C, 0x22, 255), [ellipse(64, 44, 17, 5)]),          # calyx shadow on the fruit
    ((0xA8, 0x24, 0x2A, 255), [CALYX_FRONT]),
    ((0x86, 0x14, 0x19, 255), [ellipse(*OPENING)]),               # opening rim
    ((0xF7, 0xD9, 0xC4, 255), [ellipse(*OPENING[:2], OPENING[2] - 3, OPENING[3] - 3, OPENING[4])]),  # pith
    ((0xD8, 0x1B, 0x4A, 255), [ellipse(x, y, SEED_R, SEED_R * 1.08) for x, y in SEEDS]),
    ((0xFF, 0xA3, 0xB8, 255), [ellipse(x - 1.1, y - 1.3, 1.1, 1.2) for x, y in SEEDS]),  # seed shine
    ((0xFF, 0xFF, 0xFF, 150), [ellipse(36, 64, 7, 13, 30), ellipse(47, 50, 3, 3)]),       # fruit shine
]
# The silhouette shown where colour fonts aren't supported: fruit and calyx.
POMEGRANATE_OUTLINE = [ellipse(*BODY), CALYX_BACK]

PICTURES = [
    # (glyph name, code point, layers, outline)
    ("pomegranate", 0xE000, POMEGRANATE, POMEGRANATE_OUTLINE),
]


def glyph_from(shapes):
    """TrueType glyph from polygons in the 128 grid, every contour wound clockwise in font units
    so overlapping contours in one glyph add up rather than cancel."""
    pen = TTGlyphPen(None)
    for pts in shapes:
        font_pts = [(round(X0 + x * SCALE), round(Y0 - y * SCALE)) for x, y in pts]
        area = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(font_pts, font_pts[1:] + font_pts[:1]))
        if area > 0:  # counter-clockwise
            font_pts.reverse()
        pen.moveTo(font_pts[0])
        for p in font_pts[1:]:
            pen.lineTo(p)
        pen.closePath()
    return pen.glyph()


def build():
    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    cmap, layers, palette = {}, {}, []
    for name, code, picture, outline in PICTURES:
        cmap[code] = name
        glyphs[name] = glyph_from(outline)
        layers[name] = []
        for i, (colour, shapes) in enumerate(picture):
            layer = f"{name}.layer{i}"
            glyphs[layer] = glyph_from(shapes)
            if colour not in palette:
                palette.append(colour)
            layers[name].append((layer, palette.index(colour)))

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(list(glyphs))
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    glyf = fb.font["glyf"]
    fb.setupHorizontalMetrics({n: (ADVANCE if n != ".notdef" else 0, getattr(glyf[n], "xMin", 0)) for n in glyphs})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
    fb.setupNameTable({"familyName": "Safari Pictures", "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=DESCENT, sTypoLineGap=0,
                usWinAscent=ASCENT, usWinDescent=-DESCENT)
    fb.setupPost()
    fb.font["COLR"] = buildCOLR(layers, version=0)
    fb.font["CPAL"] = buildCPAL([[tuple(c / 255 for c in colour) for colour in palette]])
    # Fixed timestamps, so the same drawing always gives the same file (and file name).
    fb.font["head"].created = fb.font["head"].modified = timestampFromString("Sat Oct 17 00:00:00 2026")
    fb.font.recalcTimestamp = False
    fb.font.flavor = "woff2"
    out = io.BytesIO()
    fb.font.save(out)
    return out.getvalue()


def main():
    data = build()
    name = f"safari-pictures-{hashlib.sha256(data).hexdigest()[:6]}.woff2"
    for old in glob.glob(os.path.join(FONTS_DIR, "safari-pictures-*.woff2")):
        if os.path.basename(old) != name:
            os.remove(old)
    with open(os.path.join(FONTS_DIR, name), "wb") as f:
        f.write(data)

    # Point the stylesheet and the service worker's precache list at the new file.
    for path in (os.path.join(FONTS_DIR, "fonts.css"), os.path.join(BASE_DIR, "sw.js")):
        with open(path, encoding="utf-8") as f:
            text = f.read()
        updated = re.sub(r"safari-pictures-[0-9a-f]{6}\.woff2", name, text)
        if updated == text and name not in text:
            print(f"  [Note] {os.path.relpath(path, BASE_DIR)} doesn't reference safari-pictures-*.woff2 yet")
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(updated)
    print(f"  [Font] {name} ({len(data):,} bytes, {len(PICTURES)} picture(s))")


if __name__ == "__main__":
    main()
