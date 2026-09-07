# Case Timeline Prototype

A prototype that turns unstructured social care inputs (typed notes,
scanned/handwritten notes, recorded conversations) into a structured, dated,
categorised timeline for a case - with the source passages that drove each entry
highlighted for human review.

**This is a demo tool, not a deployable one.** It uses synthetic, clearly fictional
test data (see `data/samples/`), is not connected to any real case management
system (Liquidlogic or otherwise), and does not do any risk scoring or prediction -
it only extracts and surfaces what's stated in the text, for a person to review and
judge. See the project notes for the fuller reasoning behind that "surface, don't
score" design choice.

## How it works

For each input, one of three modes:

- **Scan an image** - a photo of a handwritten or printed note
- **Attach a file** - a `.txt`/`.md` note, or an image
- **Record a conversation** - a short audio recording

...goes through: transcription (if needed) → LLM extraction into dated, categorised
events with the exact source quote behind each one → a review step (the extracted
text, plus a **mandatory** document date - inferred from the content where possible,
otherwise you're prompted for one) → saved into the case, where it appears in the
chronology table and as highlighted spans back in the source document. Clicking a
chronology row scrolls to and highlights its passage in the document below.

## Architecture

```
backend/    FastAPI + SQLite - HTTP layer over db.py/pipeline/, extraction pipeline
frontend/   Next.js (TypeScript, App Router, Tailwind) - the UI
data/       Synthetic seed documents for demoing each input mode
```

The backend is a thin HTTP layer: `db.py` holds the schema (cases/documents/events)
and `pipeline/` holds the framework-agnostic logic (transcription, LLM extraction,
highlight-span finding). `main.py` just wires those up to endpoints.

## Setup

### Prerequisites

- Python, managed via [`uv`](https://docs.astral.sh/uv/)
- Node.js + npm
- `ffmpeg` (for local Whisper audio transcription)
- Access to an LLM via a LiteLLM proxy

### Backend

```
cd backend
cp .env.example .env   # fill in LITELLM_PROXY_URL, LITELLM_API_KEY, LITELLM_MODEL
uv sync
uv run uvicorn main:app --reload --port 8000
```

`LITELLM_MODEL` must be a model name the proxy actually serves (check
`GET {LITELLM_PROXY_URL}/v1/models`) - a vision-capable model is needed for the
scan/attach-image modes. Audio transcription runs locally via Whisper, not through
the proxy, so it needs no extra config beyond `ffmpeg` being installed.

### Frontend

```
cd frontend
npm install
npm run dev
```

Reads `NEXT_PUBLIC_API_BASE_URL` from `.env.local` (defaults to
`http://localhost:8000`).

Then open `http://localhost:3000`.

## Seed data

`data/samples/` has a handful of short, separate, clearly fictional documents (a
school note, an attendance log, a teacher observation, a GP referral) - deliberately
split by source/fact rather than one bundled note, since the point of the tool is
combining scattered signals across sources into one timeline. Two generator scripts
produce a matching handwritten-note image and a synthetic phone-call recording
(macOS only, via `say`):

```
uv run python data/samples/generate_handwritten_sample.py
sh data/samples/generate_audio_sample.sh
```

## Environment notes

A couple of things that weren't obvious while building this, worth knowing if
something similar comes up again:

- **Corporate SSL interception**: if outbound HTTPS calls to the LiteLLM proxy fail
  with `CERTIFICATE_VERIFY_FAILED`, it's likely because `httpx` (used by the
  `openai`/`litellm` client stack) hardcodes the `certifi` CA bundle rather than
  consulting the OS trust store, so a machine-wide corporate root CA (e.g. from
  Aikido `safe-chain`'s traffic inspection) isn't picked up. Fixed via `truststore`
  (see `backend/pipeline/_ssl_setup.py`) rather than disabling verification.
- **LiteLLM + custom proxy model names**: `litellm.completion()` tries to infer the
  provider from the model string itself, which fails for a proxy-side alias it
  doesn't recognise (e.g. a Bedrock alias with no `bedrock/` prefix). Fixed by
  passing `custom_llm_provider="openai"` explicitly rather than guessing.

## Status

A working prototype, not a finished product. Known gaps: no PDF support (export to
image and use scan mode instead), no automated UI test suite, and audio input is
labelled `.wav` regardless of the browser's actual recording format (Whisper's
ffmpeg step sniffs the real format, so this works but is a bit sloppy).
