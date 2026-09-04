"""Locate extracted verbatim excerpts back in the source text for highlighting.

Returns plain span data (start/end offsets + event metadata); rendering the
actual <mark> elements happens in the frontend.
"""


def find_highlight_spans(raw_text: str, events: list[dict]) -> list[dict]:
    """Return non-overlapping highlight spans, sorted by position.

    Each span is {start, end, event_id, category, importance, reason}.
    Excerpts that can't be found verbatim (the model paraphrased instead of
    quoting) are skipped for highlighting purposes, but the event itself is
    still shown in the chronology table elsewhere.
    """
    spans = []
    for event in events:
        excerpt = (event.get("verbatim_excerpt") or "").strip()
        if not excerpt:
            continue
        start = raw_text.find(excerpt)
        if start == -1:
            continue
        spans.append(
            {
                "start": start,
                "end": start + len(excerpt),
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
