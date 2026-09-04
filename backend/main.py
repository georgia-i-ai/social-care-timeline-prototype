"""FastAPI backend for the case timeline prototype.

Thin HTTP layer over db.py and pipeline/ - see the plan doc for rationale.
Synthetic/demo tool only - no real case data, no connection to any live case
management system, no risk scoring.
"""

import datetime as dt
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db
from dates import resolve_event_dates
from pipeline.extract import extract_document
from pipeline.highlight import find_highlight_spans
from pipeline.ingest_file import ingest_file
from pipeline.transcribe_audio import transcribe_audio
from pipeline.transcribe_image import transcribe_image

MEDIA_ROOT = Path(__file__).parent / "media"
MEDIA_TMP = MEDIA_ROOT / "tmp"
MEDIA_TMP.mkdir(parents=True, exist_ok=True)

db.init_db()

app = FastAPI(title="Case Timeline Prototype API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EventIO(BaseModel):
    id: int | None = None
    event_date: str | None = None
    category: str
    summary: str
    people_involved: list[str] = Field(default_factory=list)
    verbatim_excerpt: str = ""
    importance: str
    reason: str = ""


class CaseOut(BaseModel):
    id: int
    name: str


class CreateCaseIn(BaseModel):
    name: str


class PendingDocumentOut(BaseModel):
    pending_media_id: str | None
    media_ext: str | None
    source_type: str
    source_label: str
    raw_text: str
    document_date: str | None
    date_confidence: str
    events: list[EventIO]


class ConfirmDocumentIn(BaseModel):
    pending_media_id: str | None = None
    media_ext: str | None = None
    source_type: str
    source_label: str
    raw_text: str
    document_date: str
    date_confidence: str
    events: list[EventIO]


class DocumentOut(BaseModel):
    id: int
    source_type: str
    source_label: str | None
    raw_text: str
    document_date: str
    date_confidence: str
    media_url: str | None
    highlights: list[dict]


class EventRowOut(BaseModel):
    id: int
    document_id: int
    event_date: str
    category: str
    summary: str
    people_involved: str
    verbatim_excerpt: str | None
    importance: str
    reason: str | None


class CaseDetailOut(BaseModel):
    id: int
    name: str
    events: list[EventRowOut]
    documents: list[DocumentOut]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stage_media(data: bytes, ext: str) -> str:
    """Write uploaded bytes to a tmp file, return its pending_media_id."""
    pending_media_id = uuid.uuid4().hex
    (MEDIA_TMP / f"{pending_media_id}{ext}").write_bytes(data)
    return pending_media_id


def _finalize_media(case_id: int, pending_media_id: str, media_ext: str, label: str) -> str:
    """Move a staged tmp file into permanent per-case storage.

    Returns a path relative to MEDIA_ROOT (suitable for building a /media URL).
    """
    tmp_path = MEDIA_TMP / f"{pending_media_id}{media_ext}"
    case_dir = MEDIA_ROOT / str(case_id)
    case_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now().strftime("%Y%m%dT%H%M%S")
    safe_label = "".join(c if c.isalnum() else "_" for c in label)[:40]
    final_name = f"{timestamp}_{safe_label}{media_ext}"
    tmp_path.rename(case_dir / final_name)
    return f"{case_id}/{final_name}"


def _normalize_events(events: list[dict]) -> list[dict]:
    for event in events:
        event.setdefault("people_involved", [])
        event.setdefault("verbatim_excerpt", "")
        event.setdefault("reason", "")
    return events


def _build_pending(source_type: str, source_label: str, raw_text: str,
                    pending_media_id: str | None, media_ext: str | None) -> PendingDocumentOut:
    extraction = extract_document(raw_text, source_type)
    events = _normalize_events(extraction.get("events", []))
    return PendingDocumentOut(
        pending_media_id=pending_media_id,
        media_ext=media_ext,
        source_type=source_type,
        source_label=source_label,
        raw_text=raw_text,
        document_date=extraction.get("document_date"),
        date_confidence=extraction.get("date_confidence", "low"),
        events=[EventIO(**e) for e in events],
    )


# ---------------------------------------------------------------------------
# Case endpoints
# ---------------------------------------------------------------------------

@app.get("/api/cases", response_model=list[CaseOut])
def list_cases():
    return [CaseOut(id=c["id"], name=c["name"]) for c in db.list_cases()]


@app.post("/api/cases", response_model=CaseOut)
def create_case(payload: CreateCaseIn):
    if not payload.name.strip():
        raise HTTPException(400, "Case name cannot be empty.")
    case_id = db.create_case(payload.name.strip())
    return CaseOut(id=case_id, name=payload.name.strip())


@app.get("/api/cases/{case_id}", response_model=CaseDetailOut)
def get_case(case_id: int):
    cases = {c["id"]: c["name"] for c in db.list_cases()}
    if case_id not in cases:
        raise HTTPException(404, "Case not found.")

    events = [dict(e) for e in db.list_events(case_id)]
    documents = [dict(d) for d in db.list_documents(case_id)]

    doc_events: dict[int, list[dict]] = {}
    for e in events:
        doc_events.setdefault(e["document_id"], []).append(e)

    document_outs = []
    for d in documents:
        this_events = doc_events.get(d["id"], [])
        highlights = find_highlight_spans(d["raw_text"], this_events)
        media_url = f"/media/{d['media_path']}" if d.get("media_path") else None
        document_outs.append(
            DocumentOut(
                id=d["id"],
                source_type=d["source_type"],
                source_label=d["source_label"],
                raw_text=d["raw_text"],
                document_date=d["document_date"],
                date_confidence=d["date_confidence"],
                media_url=media_url,
                highlights=highlights,
            )
        )

    return CaseDetailOut(
        id=case_id,
        name=cases[case_id],
        events=[EventRowOut(**e) for e in events],
        documents=document_outs,
    )


# ---------------------------------------------------------------------------
# Input-mode endpoints: each returns a "pending" document for review/confirm
# ---------------------------------------------------------------------------

@app.post("/api/cases/{case_id}/scan", response_model=PendingDocumentOut)
async def scan_document(case_id: int, image: UploadFile = File(...)):
    image_bytes = await image.read()
    media_type = image.content_type or "image/jpeg"
    pending_media_id = _stage_media(image_bytes, ".jpg")
    raw_text = transcribe_image(image_bytes, media_type)
    return _build_pending("image", image.filename or "scan", raw_text, pending_media_id, ".jpg")


@app.post("/api/cases/{case_id}/attach", response_model=PendingDocumentOut)
async def attach_document(case_id: int, file: UploadFile = File(...)):
    file_bytes = await file.read()
    result = ingest_file(file.filename or "attachment", file_bytes)
    if result.kind == "unsupported":
        raise HTTPException(400, result.message)

    if result.kind == "text":
        pending_media_id = _stage_media(file_bytes, ".txt")
        raw_text = result.raw_text
        media_ext = ".txt"
    else:  # image
        pending_media_id = _stage_media(file_bytes, ".jpg")
        raw_text = transcribe_image(result.image_bytes, result.media_type)
        media_ext = ".jpg"

    return _build_pending("file", file.filename or "attachment", raw_text, pending_media_id, media_ext)


@app.post("/api/cases/{case_id}/record", response_model=PendingDocumentOut)
async def record_document(case_id: int, audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    pending_media_id = _stage_media(audio_bytes, ".wav")
    raw_text = transcribe_audio(audio_bytes)
    return _build_pending("audio", audio.filename or "recording", raw_text, pending_media_id, ".wav")


@app.post("/api/cases/{case_id}/documents")
def save_document(case_id: int, payload: ConfirmDocumentIn):
    media_path = None
    if payload.pending_media_id and payload.media_ext:
        media_path = _finalize_media(
            case_id, payload.pending_media_id, payload.media_ext, payload.source_label
        )

    doc_id = db.add_document(
        case_id=case_id,
        source_type=payload.source_type,
        source_label=payload.source_label,
        raw_text=payload.raw_text,
        document_date=payload.document_date,
        date_confidence=payload.date_confidence,
        media_path=media_path,
    )

    events = resolve_event_dates([e.model_dump() for e in payload.events], payload.document_date)
    if events:
        db.add_events(doc_id, case_id, events)

    return {"document_id": doc_id}
