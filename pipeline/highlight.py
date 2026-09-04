"""Locate extracted verbatim excerpts back in the source text for highlighting."""

import html

IMPORTANCE_COLORS = {
    "high": "#ffb3b3",
    "medium": "#ffe08a",
    "low": "#c9e8c9",
}


def _find_spans(raw_text: str, events: list[dict]) -> list[dict]:
    """Return non-overlapping (start, end, event) spans sorted by position.

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
        spans.append({"start": start, "end": start + len(excerpt), "event": event})

    spans.sort(key=lambda s: s["start"])

    non_overlapping = []
    last_end = -1
    for span in spans:
        if span["start"] >= last_end:
            non_overlapping.append(span)
            last_end = span["end"]
    return non_overlapping


def build_highlighted_html(raw_text: str, events: list[dict]) -> str:
    """Render raw_text as HTML with <mark> spans over matched excerpts."""
    spans = _find_spans(raw_text, events)

    pieces = []
    cursor = 0
    for span in spans:
        pieces.append(html.escape(raw_text[cursor : span["start"]]))
        event = span["event"]
        color = IMPORTANCE_COLORS.get(event.get("importance"), "#dddddd")
        reason = html.escape(event.get("reason") or "")
        category = html.escape(event.get("category") or "")
        excerpt_html = html.escape(raw_text[span["start"] : span["end"]])
        pieces.append(
            f'<mark style="background-color:{color};border-radius:3px;padding:1px 2px;" '
            f'title="[{category}] {reason}">{excerpt_html}</mark>'
        )
        cursor = span["end"]
    pieces.append(html.escape(raw_text[cursor:]))

    body = "".join(pieces).replace("\n", "<br>")
    return f'<div style="white-space:pre-wrap;line-height:1.6;">{body}</div>'
