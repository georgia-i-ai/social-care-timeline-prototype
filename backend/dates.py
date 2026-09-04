"""Shared date-resolution helper: every saved event needs a date."""


def resolve_event_dates(events: list[dict], document_date: str) -> list[dict]:
    """Fill in any event missing its own date with the document's date."""
    for event in events:
        if not event.get("event_date"):
            event["event_date"] = document_date
    return events
