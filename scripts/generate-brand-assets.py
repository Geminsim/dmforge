from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "branding" / "dmforge-logo-source.png"
PUBLIC = ROOT / "public"
LAUNCHER = ROOT / "launcher" / "assets"


def prepare_icon() -> Image.Image:
    image = Image.open(SOURCE).convert("RGBA")
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        raise RuntimeError("No logo artwork was detected in the source image.")

    left, top, right, bottom = bounds
    padding = round(max(right - left, bottom - top) * 0.07)
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    cropped = image.crop((left, top, right, bottom))

    side = max(cropped.size)
    background = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    background.alpha_composite(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return background


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    LAUNCHER.mkdir(parents=True, exist_ok=True)
    icon = prepare_icon()

    for size, name in (
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "icon-192.png"),
        (512, "icon-512.png"),
    ):
        icon.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / name, optimize=True)

    icon.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64)],
    )
    icon.save(
        LAUNCHER / "DMForge.ico",
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


if __name__ == "__main__":
    main()
