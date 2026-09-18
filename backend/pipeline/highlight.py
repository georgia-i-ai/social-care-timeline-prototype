"""Locate extracted verbatim excerpts back in the source text for highlighting.

Returns plain span data (start/end offsets + event metadata); rendering the
actual <mark> elements happens in the frontend.
"""

import re


def _locate(raw_text: str, excerpt: str) -> tuple[int, int] | None:
    """Find an excerpt in the source, returning (start, end) offsets or None.

    Offsets are always into the original ``raw_text`` (never a normalised copy),
    so the frontend can slice ``raw_text[start:end]`` directly.

    We try an exact substring match first, then fall back to a
    whitespace-tolerant match: the model often quotes a passage accurately but
    collapses the source's line wrapping into single spaces (or vice versa), so
    treating every run of whitespace as interchangeable recovers those cases.
    """
    start = raw_text.find(excerpt)
    if start != -1:
        return start, start + len(excerpt)

    tokens = excerpt.split()
    if not tokens:
        return None
    pattern = re.compile(r"\s+".join(re.escape(t) for t in tokens))
    match = pattern.search(raw_text)
    if match:
        return match.start(), match.end()
    return None


def find_highlight_spans(raw_text: str, events: list[dict]) -> list[dict]:
    """Return non-overlapping highlight spans, sorted by position.

    Each span is {start, end, event_id, category, importance, reason}.
    Excerpts that can't be located (the model paraphrased instead of quoting)
    are skipped for highlighting purposes, but the event itself is still shown
    in the chronology table elsewhere.
    """
    spans = []
    for event in events:
        excerpt = (event.get("verbatim_excerpt") or "").strip()
        if not excerpt:
            continue
        located = _locate(raw_text, excerpt)
        if located is None:
            continue
        start, end = located
        spans.append(
            {
                "start": start,
                "end": end,
                "event_id": event.get("id"),
                "category": event.get("category"),
                "importance": event.get("importance"),
                "reason": event.get("reason"),
            }
        )

    spans.sort(key=lambda s: s["start"])

    non_overlapping = []
    last_end = -1
    for span in spans:
        if span["start"] >= last_end:
            non_overlapping.append(span)
            last_end = span["end"]
    return non_overlapping
