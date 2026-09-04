"""Streamlit prototype: turn unstructured social care inputs into a reviewable,
structured, highlighted case timeline.

Synthetic/demo tool only - no real case data, no connection to any live case
management system, no risk scoring. See the plan doc for the full design rationale.
"""

import datetime as dt
from pathlib import Path

import pandas as pd
import streamlit as st

import db
from pipeline.extract import extract_document
from pipeline.highlight import build_highlighted_html
from pipeline.ingest_file import ingest_file
from pipeline.transcribe_audio import transcribe_audio
from pipeline.transcribe_image import transcribe_image

MEDIA_ROOT = Path(__file__).parent / "media"

st.set_page_config(page_title="Case Timeline Prototype", layout="wide")
db.init_db()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def save_media(case_id: int, label: str, data: bytes, ext: str) -> str:
    case_dir = MEDIA_ROOT / str(case_id)
    case_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now().strftime("%Y%m%dT%H%M%S")
    safe_label = "".join(c if c.isalnum() else "_" for c in label)[:40]
    path = case_dir / f"{timestamp}_{safe_label}{ext}"
    path.write_bytes(data)
    return str(path)


def resolve_event_dates(events: list[dict], document_date: str) -> list[dict]:
    for event in events:
        if not event.get("event_date"):
            event["event_date"] = document_date
    return events


def set_pending(source_type: str, source_label: str, raw_text: str,
                 media_bytes: bytes | None, media_ext: str | None) -> None:
    with st.spinner("Extracting structured events..."):
        extraction = extract_document(raw_text, source_type)
    st.session_state.pending = {
        "source_type": source_type,
        "source_label": source_label,
        "raw_text": raw_text,
        "media_bytes": media_bytes,
        "media_ext": media_ext,
        "extraction": extraction,
    }


def save_pending(document_date: str, date_confidence: str) -> None:
    pending = st.session_state.pending
    case_id = st.session_state.active_case_id

    media_path = None
    if pending["media_bytes"] is not None:
        media_path = save_media(
            case_id, pending["source_label"], pending["media_bytes"], pending["media_ext"]
        )

    doc_id = db.add_document(
        case_id=case_id,
        source_type=pending["source_type"],
        source_label=pending["source_label"],
        raw_text=pending["raw_text"],
        document_date=document_date,
        date_confidence=date_confidence,
        media_path=media_path,
    )

    events = resolve_event_dates(pending["extraction"]["events"], document_date)
    if events:
        db.add_events(doc_id, case_id, events)

    st.session_state.pending = None


# ---------------------------------------------------------------------------
# Sidebar: case selection
# ---------------------------------------------------------------------------

st.sidebar.title("Cases")

cases = db.list_cases()
case_names = {c["id"]: c["name"] for c in cases}

if "active_case_id" not in st.session_state:
    st.session_state.active_case_id = cases[0]["id"] if cases else None
if "pending" not in st.session_state:
    st.session_state.pending = None
if "input_mode" not in st.session_state:
    st.session_state.input_mode = None

if cases:
    selected = st.sidebar.selectbox(
        "Select a case",
        options=list(case_names.keys()),
        format_func=lambda cid: case_names[cid],
        index=list(case_names.keys()).index(st.session_state.active_case_id)
        if st.session_state.active_case_id in case_names
        else 0,
    )
    if selected != st.session_state.active_case_id:
        st.session_state.active_case_id = selected
        st.session_state.pending = None
        st.session_state.input_mode = None
else:
    st.sidebar.info("No cases yet - create one below.")

st.sidebar.divider()
new_case_name = st.sidebar.text_input("New case name")
if st.sidebar.button("Create case", disabled=not new_case_name.strip()):
    new_id = db.create_case(new_case_name.strip())
    st.session_state.active_case_id = new_id
    st.session_state.pending = None
    st.session_state.input_mode = None
    st.rerun()

case_id = st.session_state.active_case_id

st.title("Case Timeline Prototype")
st.caption(
    "Tinkering demo - converts unstructured notes into a structured, highlighted "
    "timeline for human review. Not connected to any real case system; use "
    "synthetic data only."
)

if case_id is None:
    st.info("Create a case in the sidebar to get started.")
    st.stop()

st.subheader(f"Case: {case_names[case_id]}")


# ---------------------------------------------------------------------------
# Pending document review (blocks new input until resolved)
# ---------------------------------------------------------------------------

if st.session_state.pending is not None:
    pending = st.session_state.pending
    extraction = pending["extraction"]

    st.warning("Review before saving to the case")
    st.text_area("Extracted text", pending["raw_text"], height=200, disabled=True)

    inferred_date = extraction.get("document_date")
    confidence = extraction.get("date_confidence", "low")

    if inferred_date and confidence == "high":
        st.success(f"Document date inferred: {inferred_date} (high confidence)")
        chosen_date = inferred_date
    else:
        st.error(
            "Couldn't confidently determine a date for this document from its "
            "content - please confirm one before it can be saved."
        )
        default = dt.date.fromisoformat(inferred_date) if inferred_date else dt.date.today()
        chosen_date = st.date_input("Document date", value=default).isoformat()

    col1, col2 = st.columns(2)
    with col1:
        if st.button("Save to case", type="primary"):
            confidence_final = "high" if (inferred_date == chosen_date and confidence == "high") else "user_provided"
            save_pending(chosen_date, confidence_final)
            st.rerun()
    with col2:
        if st.button("Discard"):
            st.session_state.pending = None
            st.rerun()

    st.stop()


# ---------------------------------------------------------------------------
# Timeline view: chronology + highlighted documents
# ---------------------------------------------------------------------------

def render_timeline(case_id: int) -> None:
    st.subheader("Chronology")

    events = db.list_events(case_id)
    if not events:
        st.caption("No events yet - add an input below.")
    else:
        df = pd.DataFrame([dict(e) for e in events])
        df = df[["event_date", "category", "summary", "importance", "reason"]]

        def _row_style(row):
            color = {"high": "#ffd6d6", "medium": "#fff2cc", "low": "#dff0d8"}.get(row["importance"], "")
            return [f"background-color: {color}"] * len(row)

        st.dataframe(df.style.apply(_row_style, axis=1), use_container_width=True, hide_index=True)

    st.subheader("Source documents")

    documents = db.list_documents(case_id)
    if not documents:
        st.caption("No documents yet.")
        return

    doc_events = {}
    for e in events:
        doc_events.setdefault(e["document_id"], []).append(dict(e))

    for document in reversed(documents):
        label = document["source_label"] or document["source_type"]
        with st.expander(f"{document['document_date']} — {label} ({document['source_type']})"):
            if document["date_confidence"] == "user_provided":
                st.caption("Date was manually confirmed (not confidently extracted).")

            this_doc_events = doc_events.get(document["id"], [])
            highlighted = build_highlighted_html(document["raw_text"], this_doc_events)

            if document["source_type"] == "image" and document["media_path"]:
                col_img, col_text = st.columns(2)
                with col_img:
                    st.image(document["media_path"], caption="Original")
                with col_text:
                    st.markdown(highlighted, unsafe_allow_html=True)
            else:
                if document["source_type"] == "audio" and document["media_path"]:
                    st.audio(document["media_path"])
                st.markdown(highlighted, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Main view: timeline first; input modes are only opened on request, so
# nothing (camera, mic) requests browser permissions until the user asks for it
# ---------------------------------------------------------------------------

if st.session_state.input_mode is None:
    render_timeline(case_id)
    st.divider()
    st.write("Add new information to this case:")
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("📷 Scan an image", use_container_width=True):
            st.session_state.input_mode = "scan"
            st.rerun()
    with col2:
        if st.button("📎 Attach a file", use_container_width=True):
            st.session_state.input_mode = "file"
            st.rerun()
    with col3:
        if st.button("🎙️ Record a conversation", use_container_width=True):
            st.session_state.input_mode = "record"
            st.rerun()

else:
    if st.button("← Back to timeline"):
        st.session_state.input_mode = None
        st.rerun()
    st.divider()

    if st.session_state.input_mode == "scan":
        st.subheader("Scan an image")
        st.write("Capture or upload a photo of a note (handwritten or printed).")
        camera_image = st.camera_input("Take a photo")
        uploaded_image = st.file_uploader(
            "...or upload an image", type=["jpg", "jpeg", "png"], key="scan_upload"
        )
        image_file = camera_image or uploaded_image
        if image_file is not None and st.button("Process image", key="process_scan"):
            image_bytes = image_file.getvalue()
            media_type = "image/jpeg" if camera_image else f"image/{image_file.type.split('/')[-1]}"
            with st.spinner("Transcribing image..."):
                raw_text = transcribe_image(image_bytes, media_type)
            set_pending("image", getattr(image_file, "name", "scan"), raw_text, image_bytes, ".jpg")
            st.session_state.input_mode = None
            st.rerun()

    elif st.session_state.input_mode == "file":
        st.subheader("Attach a file")
        st.write("Attach a text note (.txt/.md) or an image file (.jpg/.png).")
        uploaded_file = st.file_uploader(
            "Choose a file", type=["txt", "md", "jpg", "jpeg", "png"], key="file_upload"
        )
        if uploaded_file is not None and st.button("Process file", key="process_file"):
            file_bytes = uploaded_file.getvalue()
            result = ingest_file(uploaded_file.name, file_bytes)
            if result.kind == "unsupported":
                st.error(result.message)
            elif result.kind == "text":
                set_pending("file", uploaded_file.name, result.raw_text, file_bytes, ".txt")
                st.session_state.input_mode = None
                st.rerun()
            elif result.kind == "image":
                with st.spinner("Transcribing image..."):
                    raw_text = transcribe_image(result.image_bytes, result.media_type)
                set_pending("file", uploaded_file.name, raw_text, file_bytes, ".jpg")
                st.session_state.input_mode = None
                st.rerun()

    elif st.session_state.input_mode == "record":
        st.subheader("Record a conversation")
        st.write("Record a short conversation, or upload an audio file.")
        audio = st.audio_input("Record")
        uploaded_audio = st.file_uploader(
            "...or upload audio", type=["wav", "mp3", "m4a"], key="audio_upload"
        )
        audio_file = audio or uploaded_audio
        if audio_file is not None and st.button("Process recording", key="process_audio"):
            audio_bytes = audio_file.getvalue()
            with st.spinner("Transcribing audio locally (first run downloads the model)..."):
                raw_text = transcribe_audio(audio_bytes)
            set_pending("audio", getattr(audio_file, "name", "recording"), raw_text, audio_bytes, ".wav")
            st.session_state.input_mode = None
            st.rerun()
