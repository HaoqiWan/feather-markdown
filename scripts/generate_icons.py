#!/usr/bin/env python3
"""Generate platform icon assets from the user-provided Feather logo."""

from functools import lru_cache
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "feather-logo.png"


@lru_cache(maxsize=1)
def source_icon() -> Image.Image:
    with Image.open(SOURCE) as source:
        image = source.convert("RGBA")
    side = max(image.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))
    return square


def render_icon(size: int, *, opaque: bool = False) -> Image.Image:
    icon = source_icon().resize((size, size), Image.Resampling.LANCZOS)
    if not opaque:
        return icon

    source = source_icon()
    background_color = source.getpixel((source.width // 2, source.height // 10))[:3]
    background = Image.new("RGBA", icon.size, (*background_color, 255))
    return Image.alpha_composite(background, icon).convert("RGB")


def save_png(path: Path, size: int, *, opaque: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    render_icon(size, opaque=opaque).save(path, optimize=True)


def main():
    save_png(ROOT / "web/icon-192.png", 192)
    save_png(ROOT / "web/icon-512.png", 512)

    windows_icon = ROOT / "packaging/windows/FeatherMarkdown.ico"
    windows_icon.parent.mkdir(parents=True, exist_ok=True)
    render_icon(256).save(
        windows_icon,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    mac_icon = ROOT / "packaging/macos/FeatherMarkdown.icns"
    render_icon(1024).save(mac_icon, format="ICNS")

    android_icons = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    android_res = ROOT / "mobile/android/app/src/main/res"
    for density, pixels in android_icons.items():
        save_png(android_res / density / "ic_launcher.png", pixels, opaque=True)

    app_icon = ROOT / "mobile/ios/Assets.xcassets/AppIcon.appiconset"
    ios_files = {
        "icon-20.png": 20,
        "icon-20@2x.png": 40,
        "icon-20@3x.png": 60,
        "icon-29.png": 29,
        "icon-29@2x.png": 58,
        "icon-29@3x.png": 87,
        "icon-40.png": 40,
        "icon-40@2x.png": 80,
        "icon-40@3x.png": 120,
        "icon-60@2x.png": 120,
        "icon-60@3x.png": 180,
        "icon-76.png": 76,
        "icon-76@2x.png": 152,
        "icon-83.5@2x.png": 167,
        "icon-1024.png": 1024,
    }
    for filename, pixels in ios_files.items():
        save_png(app_icon / filename, pixels, opaque=True)


if __name__ == "__main__":
    main()
