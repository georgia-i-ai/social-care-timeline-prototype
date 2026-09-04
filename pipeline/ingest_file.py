"""Route an attached file to the right handling: plain text, image, or unsupported."""

from dataclasses import dataclass

_TEXT_EXTENSIONS = {".txt", ".md"}
_IMAGE_EXTENSIONS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


@dataclass
class IngestResult:
    kind: str  # "text" | "image" | "unsupported"
    raw_text: str | None = None
    image_bytes: bytes | None = None
    media_type: str | None = None
    message: str | None = None


def ingest_file(filename: str, file_bytes: bytes) -> IngestResult:
    suffix = _suffix(filename)

    if suffix in _TEXT_EXTENSIONS:
        return IngestResult(kind="text", raw_text=file_bytes.decode("utf-8", errors="replace"))

    if suffix in _IMAGE_EXTENSIONS:
        return IngestResult(
            kind="image",
            image_bytes=file_bytes,
            media_type=_IMAGE_EXTENSIONS[suffix],
        )

    if suffix == ".pdf":
        return IngestResult(
            kind="unsupported",
            message=(
                "PDF isn't supported yet in this prototype - export the page(s) "
                "as an image and use the scan-image mode instead."
            ),
        )

    return IngestResult(
        kind="unsupported",
        message=f"Unsupported file type '{suffix}'. Use .txt, .md, .jpg or .png.",
    )


def _suffix(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""
