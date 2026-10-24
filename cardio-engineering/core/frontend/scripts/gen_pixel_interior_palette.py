"""Generate pixel-palette overrides for interior pages (every route except "/").

Reads Tailwind palette classes (text/bg/border/fill/stroke/ring, with hover,
focus, active, group-hover, and dark variants) from the frontend source and
writes one scoped CSS rule per class. Each rule keeps the class's alpha and
tint intent, but maps the hue onto the landing page's five pixel colours.
"""

import re
from collections import OrderedDict
from pathlib import Path

FRONTEND = Path("C:/Users/Administrator/Downloads/cardiotwin/cardio-engineering/core/frontend")
SRC = FRONTEND / "src"
OUT = SRC / "styles" / "pixel-interior-palette.css"
SKIP_DIRS = {"landing", "pixel", "styles", "tests", "__tests__"}

FAMILY = {
    # Accents: the glass theme's cyan and sky become the landing's orange interaction colour.
    "sky": "orange", "cyan": "orange",
    # Data hues keep the landing's pixel blue.
    "blue": "blue", "indigo": "blue", "violet": "blue", "purple": "blue",
    "fuchsia": "red", "rose": "red", "pink": "red", "red": "red",
    "amber": "yellow", "yellow": "yellow", "orange": "orange",
    "emerald": "green", "green": "green", "teal": "green", "lime": "green",
}
# Cool greys (slate is blue-tinted) become the landing's neutral ramp, void to bone.
NEUTRAL_FAMILIES = {"slate", "gray", "zinc", "neutral", "stone"}
DARK_NEUTRAL = {"50": "#F7F7F4", "100": "#EEEEF0", "200": "#DCDCDF", "300": "#C9CACE", "400": "#96979E",
                "500": "#707178", "600": "#404147", "700": "#292A2E", "800": "#1B1C20", "900": "#141518",
                "950": "#0D0E10"}
LIGHT_NEUTRAL = {"50": "#FAFAF8", "100": "#F1F1EE", "200": "#E4E4E0", "300": "#C6C6C0", "400": "#9A9BA2",
                 "500": "#6E6F76", "600": "#3F4046", "700": "#2A2B30", "800": "#1B1C20", "900": "#141518",
                 "950": "#0D0E10"}
# Landing palette: pixelColorsDark / pixelColorsLight in src/landing/tokens.ts
DARK = {"blue": "#39A9E8", "red": "#F0442B", "yellow": "#FFB400", "orange": "#FF7900", "green": "#59DFA6"}
LIGHT = {"blue": "#1D7FB8", "red": "#D63A22", "yellow": "#C77F00", "orange": "#E85D00", "green": "#178A5F"}
DARK_BONE = (247, 247, 244)

TOKEN = re.compile(
    r"(?<![\w\-])((?:(?:hover|focus-visible|focus|active|group-hover|dark):)?)"
    r"(text|bg|border|fill|stroke|ring)-"
    r"(sky|cyan|blue|indigo|violet|purple|fuchsia|rose|red|pink|amber|yellow|orange|emerald|green|teal|lime"
    r"|slate|gray|zinc|neutral|stone)-"
    r"(\d{2,3})(?:/(\d{1,3}))?(?![\w\-/\[])"
)
DYNAMIC = re.compile(r"(text|bg|border)-\$\{")


def hex_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rgb(color, alpha=1.0):
    return f"rgb({color[0]} {color[1]} {color[2]} / {alpha:g})"


def value_for(prop, family, shade, alpha, theme):
    alpha_v = int(alpha) / 100 if alpha else None
    if family in NEUTRAL_FAMILIES:
        table = DARK_NEUTRAL if theme == "dark" else LIGHT_NEUTRAL
        return rgb(hex_rgb(table[shade]), alpha_v if alpha_v is not None else 1.0)

    pixel = FAMILY[family]
    base = hex_rgb((DARK if theme == "dark" else LIGHT)[pixel])
    shade_n = int(shade)

    if prop in ("text", "fill", "stroke"):
        if theme == "dark":
            # Light shades lift toward bone so small text stays readable on the void.
            t = 0.42 if shade_n <= 200 else (0.2 if shade_n == 300 else 0.0)
            color = mix(base, DARK_BONE, t)
        else:
            color = base
        return rgb(color, alpha_v if alpha_v is not None else 1.0)

    if prop in ("border", "ring"):
        return rgb(base, alpha_v if alpha_v is not None else 1.0)

    # prop == "bg": tints for the dark shades and light washes, solids for mid shades.
    if alpha_v is not None:
        return rgb(base, alpha_v)
    if shade_n >= 800:
        return rgb(base, 0.14 if theme == "dark" else 0.08)
    if shade_n == 700:
        return rgb(base, 0.26 if theme == "dark" else 0.12)
    if shade_n <= 300:
        return rgb(base, 0.12 if theme == "dark" else 0.08)
    return rgb(base, 1.0)


def css_property(prop):
    return {"text": "color", "bg": "background-color", "border": "border-color",
            "fill": "fill", "stroke": "stroke", "ring": "--tw-ring-color"}[prop]


def escape_class(name):
    return re.sub(r"([:/.\[\]%#])", r"\\\1", name)


def selector_for(variant, class_name, theme):
    scope = 'html[data-surface="interior"]' + (".dark" if theme == "dark" else ":not(.dark)")
    escaped = escape_class(class_name)
    if variant == "group-hover:":
        return f"{scope} .group:hover .{escaped}"
    pseudo = {"hover:": ":hover", "focus:": ":focus", "focus-visible:": ":focus-visible", "active:": ":active"}.get(variant, "")
    return f"{scope} .{escaped}{pseudo}"


def main():
    tokens = set()
    dynamic_hits = []
    for path in SRC.rglob("*"):
        if path.suffix not in {".tsx", ".ts", ".jsx", ".js"}:
            continue
        if SKIP_DIRS & set(path.relative_to(SRC).parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for m in TOKEN.finditer(text):
            tokens.add(m.groups())
        for m in DYNAMIC.finditer(text):
            dynamic_hits.append(f"{path.relative_to(FRONTEND).as_posix()}: {m.group(0)}")

    rules = OrderedDict()
    for variant, prop, family, shade, alpha in sorted(tokens, key=lambda t: tuple(x or "" for x in t)):
        themes = ["dark"] if variant == "dark:" else ["dark", "light"]
        class_name = f"{variant}{prop}-{family}-{shade}" + (f"/{alpha}" if alpha else "")
        for theme in themes:
            selector = selector_for(variant, class_name, theme)
            value = value_for(prop, family, shade, alpha, theme)
            rules[selector] = f"  {css_property(prop)}: {value};"

    header = [
        "/* =============================================================================",
        "   GENERATED by the interior pixel theme generator. Do not edit by hand.",
        "",
        "   Maps every Tailwind palette class used on interior pages (every route except",
        "   \"/\") onto the landing page's five pixel colours. Alpha suffixes and tint",
        "   shades are preserved. Scoped to html[data-surface=\"interior\"], so the",
        "   landing page is not affected.",
        "   ============================================================================= */",
        "",
    ]
    body = [f"{selector} {{\n{decl}\n}}" for selector, decl in rules.items()]

    OUT.write_text("\n".join(header + body) + "\n", encoding="utf-8")
    print(f"tokens: {len(tokens)}  rules: {len(rules)}  written: {OUT.relative_to(FRONTEND).as_posix()}")
    print(f"dynamic class names (cannot be mapped statically): {len(dynamic_hits)}")
    for hit in dynamic_hits[:20]:
        print("  ", hit)


if __name__ == "__main__":
    main()
