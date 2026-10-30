# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["kokoro>=0.9.4", "soundfile", "numpy"]
# ///
"""Turn a fictional conversation transcript into a .wav using local Kokoro TTS.

Exercises the app's "record a conversation" mode without a real recording. Local
rather than a cloud TTS so even synthetic care dialogue never leaves the machine,
matching how the app transcribes audio. Standalone (inline deps) so the TTS stack
stays out of the backend's dependencies.

Transcript: one utterance per line, as `Speaker: what they say`. The label only
picks the voice and is never spoken. A line with no label continues the previous
speaker; blank lines and lines starting `[` or `#` (the SYNTHETIC TEST DATA header)
are skipped. Voices are otherwise assigned in order of appearance, so pin any that
matter with a `# voice Name=voice_id` line (e.g. `# voice Sarah=bf_isabella`).

[SYNTHETIC TEST DATA - fictional, for prototype demo purposes only.]

Usage: uv run data/samples/generate_audio_sample.py <transcript.txt> [-o out.wav]
"""

import argparse
import itertools
import re
from pathlib import Path

# British voices, ordered so the first two speakers contrast (female / male).
VOICES = ["bf_emma", "bm_george", "bf_isabella", "bm_lewis", "bf_alice", "bm_daniel"]
SAMPLE_RATE = 24_000
PAUSE_SECONDS = 0.4  # a beat between turns, so it sounds like a conversation
MAX_LABEL_WORDS = 3  # longer than this before a colon is dialogue, not a name


def parse(text: str) -> list[tuple[str, str]]:
    """Split a transcript into (speaker, line) pairs; labels are dropped from the text."""
    utterances: list[tuple[str, str]] = []
    speaker = "Speaker"
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line[0] in "[#":
            continue
        label, sep, rest = line.partition(":")
        if sep and 1 <= len(label.split()) <= MAX_LABEL_WORDS:
            speaker, line = label.strip(), rest.strip()
        if line:
            utterances.append((speaker, line))
    return utterances


def parse_voice_hints(text: str) -> dict[str, str]:
    """Read `# voice Name=voice_id` lines, so a transcript can cast e.g. a mother as female."""
    pairs = re.findall(r"^#\s*voice\s+(.+?)\s*=\s*(\w+)\s*$", text, re.MULTILINE)
    return dict(pairs)


def _selftest() -> None:
    assert parse_voice_hints("# voice Sarah Jones = bf_emma\nA: hi\n# voice B=bm_lewis") == {
        "Sarah Jones": "bf_emma",
        "B": "bm_lewis",
    }
    sample = "[HEADER]\n\nA: Hi there.\nB: Hello: how are you?\ncontinues here\n# note\nA: Bye."
    assert parse(sample) == [
        ("A", "Hi there."),
        ("B", "Hello: how are you?"),
        ("B", "continues here"),
        ("A", "Bye."),
    ], parse(sample)
    # A long phrase before a colon is dialogue, not a speaker label.
    assert parse("So what I mean to say is: yes") == [("Speaker", "So what I mean to say is: yes")]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("transcript", type=Path, nargs="?")
    ap.add_argument("-o", "--output", type=Path, help="default: transcript path with .wav")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        _selftest()
        print("ok")
        return
    if not args.transcript:
        ap.error("transcript is required")

    utterances = parse(args.transcript.read_text())
    if not utterances:
        ap.error(f"no spoken lines found in {args.transcript}")

    # Deferred: importing torch is slow, so don't pay for it on --help / --selftest.
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    hints = parse_voice_hints(args.transcript.read_text())
    spare = itertools.cycle([v for v in VOICES if v not in hints.values()] or VOICES)
    voice_for: dict[str, str] = {}
    for speaker, _ in utterances:
        if speaker not in voice_for:
            voice_for[speaker] = hints.get(speaker) or next(spare)
    for speaker, voice in voice_for.items():
        print(f"{speaker} -> {voice}")

    pipeline = KPipeline(lang_code="b")  # "b" = British English
    pause = np.zeros(int(SAMPLE_RATE * PAUSE_SECONDS), dtype=np.float32)
    chunks = []
    for speaker, line in utterances:
        for _, _, audio in pipeline(line, voice=voice_for[speaker]):
            chunks.append(np.asarray(audio, dtype=np.float32))
        chunks.append(pause)

    out = args.output or args.transcript.with_suffix(".wav")
    sf.write(out, np.concatenate(chunks), SAMPLE_RATE, subtype="PCM_16")
    print(f"Wrote {out} ({len(utterances)} utterances, {len(voice_for)} voices)")


if __name__ == "__main__":
    main()
