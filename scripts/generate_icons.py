#!/usr/bin/env python3
"""Generate platform icon assets from Feather Markdown's geometric mark."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
TEAL = "#2f6f5e"
CREAM = "#f7f3e8"
GOLD = "#e1a85f"


def _point(value: float, scale: float) -> int:
    return round(value * scale)


def _rounded_line(draw: ImageDraw.ImageDraw, points, fill, width, scale):
    scaled = [(_point(x, scale), _point(y, scale)) for x, y in points]
    line_width = _point(width, scale)
    draw.line(scaled, fill=fill, width=line_width, joint="curve")
    radius = line_width // 2
    for x, y in (scaled[0], scaled[-1]):
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def render_icon(size: int, *, square_background: bool = False) -> Image.Image:
    supersampling = 4
    canvas_size = size * supersampling
    scale = canvas_size / 512
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    radius = 0 if square_background else _point(112, scale)
    draw.rounded_rectangle((0, 0, canvas_size - 1, canvas_size - 1), radius=radius, fill=TEAL)
    _rounded_line(draw, [(118, 364), (118, 148), (256, 278), (378, 148)], CREAM, 56, scale)
    _rounded_line(draw, [(378, 148), (378, 336)], GOLD, 56, scale)
    _rounded_line(draw, [(322, 298), (378, 360), (434, 298)], GOLD, 56, scale)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def save_png(path: Path, size: int, *, square_background: bool = False):
    path.parent.mkdir(parents=True, exist_ok=True)
    icon = render_icon(size, square_background=square_background)
    if square_background:
        icon = icon.convert("RGB")
    icon.save(path, optimize=True)


def main():
    save_png(ROOT / "web/icon-192.png", 192, square_background=True)
    save_png(ROOT / "web/icon-512.png", 512, square_background=True)

    windows_icon = ROOT / "packaging/windows/FeatherMarkdown.ico"
    windows_icon.parent.mkdir(parents=True, exist_ok=True)
    render_icon(256).save(
        windows_icon,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    mac_icon = ROOT / "packaging/macos/FeatherMarkdown.icns"
    render_icon(1024).save(mac_icon, format="ICNS")

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
        save_png(app_icon / filename, pixels, square_background=True)


if __name__ == "__main__":
    main()
