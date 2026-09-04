"""Vision-based transcription for scanned/photographed notes (typed or handwritten)."""

import base64
import os

import litellm
from dotenv import load_dotenv

load_dotenv()

MODEL = os.environ["LITELLM_MODEL"]
API_BASE = os.environ["LITELLM_PROXY_URL"]
API_KEY = os.environ["LITELLM_API_KEY"]

_PROMPT = """Transcribe this note image to plain text as accurately as possible, \
preserving line breaks. If a word or phrase is genuinely illegible or you are not \
confident in it, write it as [illegible: your best guess] rather than silently \
guessing - a misread word (especially a missed "not") can flip the meaning of a \
safeguarding-relevant note. Return only the transcription, nothing else."""


def transcribe_image(image_bytes: bytes, media_type: str) -> str:
    """Transcribe an image of a note (handwritten or printed) to plain text."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{media_type};base64,{b64}"

    response = litellm.completion(
        model=MODEL,
        api_base=API_BASE,
        api_key=API_KEY,
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
    )

    return response.choices[0].message.content.strip()
