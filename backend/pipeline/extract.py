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
                                },
                                "reason": {
                                    "type": "string",
                                    "description": (
                                        "Why this passage was flagged, briefly."
                                    ),
                                },
                            },
                            "required": [
                                "category",
                                "summary",
                                "verbatim_excerpt",
                                "importance",
                                "reason",
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

    message = response.choices[0].message
    tool_calls = message.tool_calls or []
    for call in tool_calls:
        if call.function.name == "extract_case_events":
            result = json.loads(call.function.arguments)
            result.setdefault("document_date", None)
            result.setdefault("date_confidence", "low")
            result.setdefault("events", [])
            return result

    raise RuntimeError("Model did not return the expected tool call.")
