"""Local speech-to-text for recorded conversations.

Deliberately local (not the LiteLLM proxy): recorded conversations are the most
sensitive input type in this prototype, and transcribing on-device avoids sending
raw audio of a conversation to any external API. Requires ffmpeg on the machine
and downloads the Whisper "base" model on first use.
"""

import functools
import tempfile
from pathlib import Path

import whisper


@functools.lru_cache(maxsize=1)
def _model():
    return whisper.load_model("base")


def transcribe_audio(audio_bytes: bytes, suffix: str = ".wav") -> str:
    """Transcribe recorded audio bytes to plain text using local Whisper."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = Path(tmp.name)

    try:
        result = _model().transcribe(str(tmp_path))
        return result["text"].strip()
    finally:
        tmp_path.unlink(missing_ok=True)
