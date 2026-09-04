"""Render a short fictional health-visitor note as a handwriting-style image,
so the 'scan an image' mode has something to demo without needing a real
photographed note. Run this once: python data/samples/generate_handwritten_sample.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

NOTE_TEXT = """Home visit - 8 March 2026

House cold, little food seen in
cupboards. Sarah tired, said "it's
just been hard since he left".
Millie quiet, stayed in bedroom
most of the visit.

Next visit booked 22 March.
"""

# [SYNTHETIC TEST DATA - fictional, for prototype demo purposes only.]

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Bradley Hand Bold.ttf",
    "/System/Library/Fonts/Supplemental/Noteworthy.ttc",
    "/System/Library/Fonts/Supplemental/Marker Felt.ttc",
]


def _load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def main() -> None:
    width, height = 900, 700
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    font = _load_font(34)

    draw.multiline_text((50, 50), NOTE_TEXT, fill="black", font=font, spacing=14)

    out_path = Path(__file__).parent / "health_visitor_note.png"
    image.save(out_path)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
