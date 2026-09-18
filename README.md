# Case Timeline Prototype

A prototype that turns unstructured social care inputs (typed notes,
scanned/handwritten notes, recorded conversations) into a structured, dated,
categorised timeline for a case - with the source passages that drove each entry
highlighted for human review.

**This is a demo tool, not a deployable one.** It uses synthetic, clearly fictional
test data (see `data/samples/`), is not connected to any real case management
system (Liquidlogic or otherwise), and does not do any risk scoring or prediction -
it only extracts and surfaces what's stated in the text, for a person to review and
judge. The priority flags it shows are cues for where a reviewer should look first,
not risk ratings. See the project notes for the fuller reasoning behind that
"surface, don't score" design choice.

## How it works

For each input, one of three modes:

- **Scan an image** - a photo of a handwritten or printed note
- **Attach a file** - a `.txt`/`.md` note, or an image
- **Record a conversation** - a short audio recording

...goes through: transcription (if needed) → LLM extraction into dated, categorised
events, each with the source quote behind it → a review step (the extracted text,
plus a **mandatory** document date - inferred from the content where possible,
otherwise you're prompted for one) → saved into the case.

Cases are listed on an overview page, each with a reviewer-priority summary: a
coloured dot for the highest-priority flagged item, plus counts like "3 high · 2 med
· 4 low" (what to look at first, not a risk score). Opening a case shows its
chronology two ways, in tabs - a **Timeline** that groups events by date, and a
**Table** - alongside the source documents. Clicking an event reveals its detail and
highlights its passage in the source document beside it.

Excerpts are matched back to the source tolerantly (whitespace differences are
ignored); when the model paraphrased rather than quoted, a best-effort LLM lookup
relocates the exact passage at save time, so highlighting stays consistent.

## Architecture

```
backend/    FastAPI + SQLite - HTTP layer over db.py/pipeline/, extraction pipeline
frontend/   Next.js (TypeScript, App Router, Tailwind) - the UI
data/       Synthetic seed documents for demoing each input mode
```

The backend is a thin HTTP layer: `db.py` holds the schema (cases/documents/events)
and `pipeline/` holds the framework-agnostic logic (transcription, LLM extraction,
highlight-span finding, plus an LLM fallback that relocates paraphrased excerpts).
`main.py` just wires those up to endpoints.

## Setup

### Prerequisites

- Python, managed via [`uv`](https://docs.astral.sh/uv/)
- Node.js + npm
- `ffmpeg` (for local Whisper audio transcription)
- Access to an LLM via a LiteLLM proxy

The quickest path is the `Makefile`: `make install` sets up both halves and `make
dev` runs the backend and frontend together. The steps below are the same thing by
hand (and you still need to create `backend/.env` as shown).

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

`data/samples/` has one directory per fictional case, each with a handful of short,
separate documents - deliberately split by source/fact rather than one bundled note,
since the point of the tool is combining scattered signals across sources into one
timeline. To demo a case, create it in the app and attach its documents one at a
time. The three cases are chosen to show a range:

- **`whitfield/`** - a mid-level, ambiguous case (a school note, an attendance log, a
  teacher observation, a GP referral for the mother), where signals build up but no
  single one is conclusive.
- **`bennett/`** - only very minor concerns (ordinary settling at school, a rebooked
  dental appointment, a minor illness), so the timeline stays low-priority throughout.
- **`harding/`** - a case where it is clearly escalating (repeated missed health
  appointments, a police domestic-incident notification, a welfare note, a school
  injury with a disclosure, and an ED attendance with an inconsistent explanation).

The `whitfield/` case also has two generator scripts that produce a matching
handwritten-note image and a synthetic phone-call recording (macOS only, via `say`),
to exercise the scan and record modes:

```
uv run python data/samples/whitfield/generate_handwritten_sample.py
sh data/samples/whitfield/generate_audio_sample.sh
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
