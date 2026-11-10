"""Stage 1: turn raw text from a single document into structured events."""

import json
import os

from pipeline import _ssl_setup  # noqa: F401  (must run before any HTTPS calls)

import litellm
from dotenv import load_dotenv

load_dotenv()

MODEL = os.environ["LITELLM_MODEL"]
API_BASE = os.environ["LITELLM_PROXY_URL"]
API_KEY = os.environ["LITELLM_API_KEY"]

CATEGORIES = [
    "education",
    "health",
    "missed_appointment",
    "disclosure",
    "injury",
    "domestic_abuse_indicator",
    "mental_health",
    "substance_use",
    "housing",
    "professional_concern",
    "family_relationship",
    "other",
]

IMPORTANCE_LEVELS = ["high", "medium", "low"]
ATTRIBUTIONS = ["first_hand", "relayed", "practitioner"]

_SYSTEM_PROMPT = """You are an assistant that turns unstructured \
social care case notes into a structured, reviewable timeline. This is synthetic test \
data, not a real case.

Your job is purely extractive: pull out what the text actually says, as discrete dated \
events, and flag which passages a human reviewer should look at closely and why. Do not \
infer risk levels, do not make safeguarding recommendations, and do not speculate beyond \
what is stated or clearly implied by the text. "Importance" reflects how much a human \
reviewer should prioritise looking at this passage (e.g. it's an escalation, a \
disclosure, a contradiction with an earlier note, a missed appointment) - it is not a \
risk score for the family.

Judge each passage on its own, as written - you only see this one document, and a \
reviewer combines signals across documents themselves. Be conservative with "high": \
most passages in most documents are medium or low.

- high: on its own, a reviewer would want to look at it promptly. For example: a \
child's disclosure of harm; an injury whose explanation is inconsistent, vague or \
changes, or that was not presented for treatment promptly; a domestic incident with \
children present; a professional explicitly raising a safeguarding concern or making \
a referral; a pattern that the text itself describes as repeated or escalating; an \
account in this document that contradicts itself. Do not highlight hearsay, only direct evidence \
- medium: worth noting, but ordinary on its own and only meaningful if it recurs or \
combines with other signals. For example: a single missed appointment that has not \
been followed up; one-off signs such as a child arriving hungry or in unwashed \
clothes; a change in a child's mood or behaviour; parental stress, money worries or \
low mood; a parent being defensive or reluctant to engage.
- low: routine, context, or reassuring. For example: an appointment attended, or \
missed and promptly rebooked with an explanation; a minor illness handled \
appropriately; ordinary settling-in at school; positive progress; family support in \
place; professionals' routine actions and plans (calls, visits arranged, letters sent).

Mark where each event's information comes from (the "attribution" field):
- first_hand: stated or observed directly by the document's author, or by the person \
speaking in a conversation (e.g. a parent's own account).
- relayed: something the author or speaker reports having heard from someone else \
(e.g. "the hospital said...", "the school mentioned...", "police came out in February"). \
Relayed information is always rated medium - the original source is what a reviewer \
should weigh.
- practitioner: in a conversation, the practitioner's own questions, plans, advice, \
reassurance or arrangements (e.g. "I'll come again next week", "call me if you're \
worried"). These are not shown to the reviewer. If a practitioner relays information \
from elsewhere, that is relayed, not practitioner.

Do not raise the level just because a passage mentions a professional, uses words \
like "safeguarding" or "concern" in passing, or repeats something already flagged \
elsewhere in the same document - flag the clearest passage, rate the rest by what \
they add.

Every verbatim_excerpt must be an exact substring copied from the source text, not a \
paraphrase, so it can be located and highlighted in the original document."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "extract_case_events",
            "description": (
                "Record a document-level date and a list of discrete, dated, "
                "categorised events extracted from a piece of social care case text."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "document_date": {
                        "type": ["string", "null"],
                        "description": (
                            "ISO 8601 date (YYYY-MM-DD) this document is dated, "
                            "inferred only from its content (a stated date, "
                            "'yesterday' relative to another dated reference, a "
                            "spoken date). Null if not confidently determinable "
                            "from the text itself."
                        ),
                    },
                    "date_confidence": {
                        "type": "string",
                        "enum": ["high", "low"],
                        "description": (
                            "'high' if document_date is clearly stated or "
                            "unambiguous, 'low' if it's a guess or document_date "
                            "is null."
                        ),
                    },
                    "events": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "event_date": {
                                    "type": ["string", "null"],
                                    "description": (
                                        "ISO date if this specific event has a "
                                        "clearer date than the document date, else "
                                        "null to fall back to document_date."
                                    ),
                                },
                                "category": {
                                    "type": "string",
                                    "enum": CATEGORIES,
                                },
                                "summary": {
                                    "type": "string",
                                    "description": (
                                        "Short, factual, structured description."
                                    ),
                                },
                                "people_involved": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "verbatim_excerpt": {
                                    "type": "string",
                                    "description": (
                                        "Exact quote copied from the source text."
                                    ),
                                },
                                "importance": {
                                    "type": "string",
                                    "enum": IMPORTANCE_LEVELS,
                                    "description": (
                                        "Reviewer priority for this passage on its "
                                        "own, per the rubric in the instructions. "
                                        "'high' is the exception, not the default."
                                    ),
                                },
                                "reason": {
                                    "type": "string",
                                    "description": (
                                        "Why this passage was flagged, briefly."
                                    ),
                                },
                                "attribution": {
                                    "type": "string",
                                    "enum": ATTRIBUTIONS,
                                    "description": (
                                        "Where the information comes from, per the "
                                        "instructions."
                                    ),
                                },
                            },
                            "required": [
                                "category",
                                "summary",
                                "verbatim_excerpt",
                                "importance",
                                "reason",
                                "attribution",
                            ],
                        },
                    },
                },
                "required": ["date_confidence", "events"],
            },
        },
    }
]


def extract_document(raw_text: str, source_type: str) -> dict:
    """Call the LLM to extract a document_date and structured events from raw_text.

    Returns a dict: {document_date, date_confidence, events: [...]}.
    """
    # One retry: the model intermittently returns malformed tool output (events as
    # a string, sometimes not even JSON), and a second call is usually fine.
    for _ in range(2):
        response = litellm.completion(
            model=MODEL,
            custom_llm_provider="openai",
            api_base=API_BASE,
            api_key=API_KEY,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Source type: {source_type}\n\n"
                        f"Document text:\n---\n{raw_text}\n---"
                    ),
                },
            ],
            tools=_TOOLS,
            tool_choice={
                "type": "function",
                "function": {"name": "extract_case_events"},
            },
        )
        result = _parse_response(response)
        if result is not None:
            result["events"] = apply_attribution_rules(result["events"])
            return result

    raise RuntimeError("Model did not return usable extraction output after a retry.")


def _parse_response(response) -> dict | None:
    """Return the extraction result, or None if the tool output is unusable."""
    for call in response.choices[0].message.tool_calls or []:
        if call.function.name != "extract_case_events":
            continue
        try:
            result = json.loads(call.function.arguments)
            events = result.get("events", [])
            # Sometimes sent JSON-encoded as a string, with stray trailing characters.
            if isinstance(events, str):
                events, _ = json.JSONDecoder().raw_decode(events.strip())
        except (json.JSONDecodeError, TypeError, AttributeError):
            return None
        if not isinstance(events, list):
            return None
        result["events"] = events
        result.setdefault("document_date", None)
        result.setdefault("date_confidence", "low")
        return result
    return None


def apply_attribution_rules(events: list[dict]) -> list[dict]:
    """Enforce the attribution rules in code rather than trusting the model to.

    A practitioner's own words in a call (plans, questions, advice) aren't evidence
    about the family, so they're dropped; information relayed second-hand is always
    medium, since the original source is what a reviewer should weigh. The field is
    removed afterwards - it only drives these rules.
    """
    kept = []
    for event in events:
        attribution = event.pop("attribution", None)
        if attribution == "practitioner":
            continue
        if attribution == "relayed":
            event["importance"] = "medium"
        kept.append(event)
    return kept
