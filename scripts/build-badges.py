#!/usr/bin/env python3
"""Build badge medallion artwork.

The plate — rim, radial fill, inner shadow, top sheen — is drawn here and is
original work. Only the glyph sitting on it comes from Twemoji (CC-BY 4.0, see
NOTICE), so attribution covers the glyph rather than the medallion.

Two states per badge: `unlocked` in its own colour, and `locked` desaturated
and dimmed so a trophy case reads at a glance.

    pip install Pillow && python3 scripts/build-badges.py
"""
import math
import pathlib

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
EMOJI = ROOT / "public" / "emoji"
OUT = ROOT / "public" / "badges"

SIZE = 160  # 2x for an 80px display
SS = 4  # supersample factor, for smooth edges

# badge id -> (glyph file, rim colour, fill colour)
BADGES = {
    "first_step": ("footprints", (214, 87, 132), (255, 226, 236)),
    "three_in_a_row": ("flame", (232, 122, 76), (255, 232, 216)),
    "full_week": ("calendar", (106, 140, 186), (224, 236, 252)),
    "omega_squad": ("fish", (92, 158, 176), (219, 241, 246)),
    "protein_power": ("muscle", (196, 106, 152), (250, 226, 242)),
    "disiplin": ("target", (206, 142, 62), (253, 238, 210)),
    "down_1kg": ("scales", (106, 156, 120), (223, 243, 229)),
    "down_3kg": ("medal", (198, 150, 70), (252, 240, 216)),
    "goal_reached": ("trophy", (212, 168, 70), (253, 243, 214)),
}


def radial(size, inner, outer):
    """Vertical-ish radial gradient: lighter top-left, deeper bottom-right."""
    img = Image.new("RGB", (size, size), outer)
    px = img.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c * 0.82, y - c * 0.78) / (size * 0.72)
            t = min(1.0, max(0.0, d))
            px[x, y] = tuple(
                round(inner[i] + (outer[i] - inner[i]) * t) for i in range(3)
            )
    return img


def lighten(c, amount):
    return tuple(round(v + (255 - v) * amount) for v in c)


def darken(c, amount):
    return tuple(round(v * (1 - amount)) for v in c)


def plate(rim, fill, size=SIZE):
    """One medallion, drawn at SS scale and downsampled."""
    big = size * SS
    disc = Image.new("RGBA", (big, big), (0, 0, 0, 0))

    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)

    body = radial(big, lighten(fill, 0.45), fill).convert("RGBA")
    disc.paste(body, (0, 0), mask)

    d = ImageDraw.Draw(disc)
    # Outer rim.
    d.ellipse((0, 0, big - 1, big - 1), outline=rim + (255,), width=int(big * 0.055))
    # Inner hairline, which is what makes it read as struck metal.
    inset = int(big * 0.115)
    d.ellipse(
        (inset, inset, big - 1 - inset, big - 1 - inset),
        outline=lighten(rim, 0.55) + (190,),
        width=max(1, int(big * 0.012)),
    )

    # Sheen across the upper third.
    sheen = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).ellipse(
        (int(big * 0.1), int(big * -0.28), int(big * 0.9), int(big * 0.46)),
        fill=(255, 255, 255, 68),
    )
    sheen = sheen.filter(ImageFilter.GaussianBlur(big * 0.035))
    disc = Image.alpha_composite(disc, Image.composite(sheen, Image.new("RGBA", (big, big), (0, 0, 0, 0)), mask))

    # Contact shadow inside the lower rim, for depth.
    shade = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(shade).ellipse(
        (int(big * 0.06), int(big * 0.30), int(big * 0.94), int(big * 1.16)),
        fill=darken(rim, 0.25) + (58,),
    )
    shade = shade.filter(ImageFilter.GaussianBlur(big * 0.05))
    disc = Image.alpha_composite(disc, Image.composite(shade, Image.new("RGBA", (big, big), (0, 0, 0, 0)), mask))

    return disc.resize((size, size), Image.LANCZOS)


def compose(glyph_name, rim, fill):
    base = plate(rim, fill)
    glyph = Image.open(EMOJI / f"{glyph_name}.png").convert("RGBA")
    g = round(SIZE * 0.52)
    glyph = glyph.resize((g, g), Image.LANCZOS)

    # Soft drop shadow so the glyph sits on the plate rather than floating.
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    alpha = glyph.split()[3].point(lambda a: int(a * 0.34))
    tint = Image.new("RGBA", glyph.size, darken(rim, 0.45) + (255,))
    shadow.paste(tint, ((SIZE - g) // 2, (SIZE - g) // 2 + round(SIZE * 0.022)), alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(SIZE * 0.018))

    out = Image.alpha_composite(base, shadow)
    out.paste(glyph, ((SIZE - g) // 2, (SIZE - g) // 2), glyph)
    return out


def locked(img):
    """Desaturated and dimmed, so the trophy case reads at a glance."""
    grey = img.convert("LA").convert("RGBA")
    faded = Image.new("RGBA", img.size, (0, 0, 0, 0))
    faded = Image.blend(faded, grey, 0.42)
    faded.putalpha(img.split()[3].point(lambda a: int(a * 0.55)))
    return faded


def save(img, path):
    """Quantise before writing.

    These are flat gradients across a narrow hue range, so a 128-colour palette
    is indistinguishable at display size and cuts the files by about 80%.
    """
    img.quantize(colors=128, method=Image.FASTOCTREE, dither=Image.Dither.NONE).save(
        path, optimize=True
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for badge, (glyph, rim, fill) in BADGES.items():
        art = compose(glyph, rim, fill)
        save(art, OUT / f"{badge}.png")
        save(locked(art), OUT / f"{badge}-locked.png")
        print(f"  {badge:16} {(OUT / f'{badge}.png').stat().st_size:>6} b")
    print(f"\n{len(BADGES) * 2} badge images written to public/badges/")


if __name__ == "__main__":
    main()
