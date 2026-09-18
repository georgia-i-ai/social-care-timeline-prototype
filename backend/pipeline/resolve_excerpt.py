"""Best-effort LLM fallback: locate a paraphrased excerpt back in the source.

The extraction model is asked to quote verbatim, but it sometimes paraphrases,
so `highlight.locate` can't find the passage to highlight. When that happens we
ask the model to point at the exact substring of the source the paraphrase came
from, then verify it really is a substring (via `highlight.locate`) before using
it - so the excerpt we store is always something the read path can highlight.

Run this once, at document-save time - never on the read path, which recomputes
highlights on every request.
"""

import json
import os

from pipeline import _ssl_setup  # noqa: F401  (must run before any HTTPS calls)
from pipeline.highlight import locate

import litellm
from dotenv import load_dotenv

load_dotenv()

MODEL = os.environ["LITELLM_MODEL"]
API_BASE = os.environ["LITELLM_PROXY_URL"]
API_KEY = os.environ["LITELLM_API_KEY"]

_SYSTEM_PROMPT = """You locate quotations in a source document. Given a source \
text and a paraphrased description of a passage in it, identify the exact \
substring of the source that the description is based on.

Copy the substring character-for-character from the source - do not correct, \
rephrase, translate, or add anything. Choose the shortest span that captures the \
point. If the source contains nothing that corresponds, report that instead of \
guessing."""

_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "locate_excerpt",
            "description": "Report the exact source substring a paraphrase refers to.",
            "parameters": {
                "type": "object",
                "properties": {
                    "found": {
                        "type": "boolean",
                        "description": (
                            "True only if a corresponding passage genuinely exists "
                            "in the source text."
                        ),
                    },
                    "exact_quote": {
                        "type": "string",
                        "description": (
                            "The passage copied verbatim from the source, or an "
                            "empty string if not found."
                        ),
                    },
                },
                "required": ["found", "exact_quote"],
            },
        },
    }
]


def resolve_excerpt(raw_text: str, summary: str, paraphrase: str) -> str | None:
    """Return an exact substring of `raw_text` for a paraphrased excerpt, or None.

    Best-effort: on any failure - the model erroring, reporting "not found", or
    returning a quote that still can't be located in the source - this returns
    None, and the caller leaves the passage un-highlighted, exactly as before.
    The returned string is always sliced from `raw_text` itself, so downstream
    offset lookups are guaranteed to succeed.
    """
    try:
        response = litellm.completion(
            model=MODEL,
            custom_llm_provider="openai",
            api_base=API_BASE,
            api_key=API_KEY,
            max_tokens=1024,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Source text:\n---\n{raw_text}\n---\n\n"
                        f"Summary of the passage: {summary}\n"
                        f"Paraphrased excerpt: {paraphrase}"
                    ),
                },
            ],
            tools=_TOOLS,
            tool_choice={
                "type": "function",
                "function": {"name": "locate_excerpt"},
            },
        )
    except Exception:
        return None

    for call in response.choices[0].message.tool_calls or []:
        if call.function.name != "locate_excerpt":
            continue
        try:
            args = json.loads(call.function.arguments)
        except (json.JSONDecodeError, TypeError):
            return None
        if not args.get("found") or not (args.get("exact_quote") or "").strip():
            return None
        span = locate(raw_text, args["exact_quote"].strip())
        if span is None:
            return None
        start, end = span
        return raw_text[start:end]
    return None
