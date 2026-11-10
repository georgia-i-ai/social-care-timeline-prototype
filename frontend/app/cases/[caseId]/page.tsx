"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, ButtonGroup } from "@i-dot-ai-npm/component-library-react";
import {
  API_BASE,
  CaseDetail,
  EventRow,
  PendingDocument,
  attachDocument,
  clearCase,
  deleteCase,
  deleteDocument,
  getCase,
  recordDocument,
  reextractDocument,
  saveDocument,
  scanDocument,
} from "@/lib/api";
import { ChronologyTable } from "@/components/ChronologyTable";
import { CaseTimeline } from "@/components/CaseTimeline";
import { DocumentPanel } from "@/components/DocumentPanel";
import { ScanPanel } from "@/components/ScanPanel";
import { AttachPanel } from "@/components/AttachPanel";
import { RecordPanel } from "@/components/RecordPanel";
import { PendingReview } from "@/components/PendingReview";

type InputMode = "scan" | "file" | "record" | null;
type ChronologyView = "timeline" | "table";

export default function CasePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = Number(params.caseId);
  const router = useRouter();

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [chronologyView, setChronologyView] = useState<ChronologyView>("timeline");
  const [pending, setPending] = useState<PendingDocument | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusedEventId, setFocusedEventId] = useState<number | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    getCase(caseId)
      .then(setCaseDetail)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    setPending(null);
    setInputMode(null);
    setFocusedEventId(null);
    setExpandedDocId(null);
    refresh();
  }, [refresh]);

  async function handleProcess(fn: () => Promise<PendingDocument>) {
    setError(null);
    setProcessing(true);
    try {
      const result = await fn();
      setPending(result);
      setInputMode(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirm(
    documentDate: string,
    dateConfidence: "high" | "low" | "user_provided",
    rawText: string
  ) {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      // Edited text needs fresh events, or excerpts and details won't match it.
      const doc =
        rawText === pending.raw_text
          ? pending
          : await reextractDocument(caseId, { ...pending, raw_text: rawText });
      await saveDocument(caseId, { ...doc, document_date: documentDate, date_confidence: dateConfidence });
      setPending(null);
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  /** Irreversible, so always confirm first; `after` resets view state once it's done. */
  async function confirmAndRun(message: string, action: () => Promise<unknown>, after: () => void) {
    if (!window.confirm(message)) return;
    setError(null);
    try {
      await action();
      after();
    } catch (e) {
      setError(String(e));
    }
  }

  function resetAndRefresh() {
    setFocusedEventId(null);
    setExpandedDocId(null);
    refresh();
  }

  function handleSelectEvent(event: EventRow) {
    setFocusedEventId(event.id);
    setExpandedDocId(event.document_id);
  }

  if (loading && !caseDetail) return <p className="govuk-body">Loading...</p>;
  if (!caseDetail) return <p className="govuk-error-message">{error ?? "Case not found."}</p>;

  return (
    <>
      <Link href="/" className="govuk-back-link">
        All cases
      </Link>
      <h1 className="govuk-heading-l">Case: {caseDetail.name}</h1>
      <ButtonGroup>
        <Button
          type="button"
          secondary
          small
          disabled={caseDetail.documents.length === 0}
          onClick={() =>
            confirmAndRun(
              `Remove all documents and events from "${caseDetail.name}"? The case itself is kept. This can't be undone.`,
              () => clearCase(caseId),
              resetAndRefresh
            )
          }
        >
          Clear case
        </Button>
        <Button
          type="button"
          warning
          small
          onClick={() =>
            confirmAndRun(
              `Delete the case "${caseDetail.name}" and everything in it? This can't be undone.`,
              () => deleteCase(caseId),
              () => router.push("/")
            )
          }
        >
          Delete case
        </Button>
      </ButtonGroup>
      {error && <p className="govuk-error-message">{error}</p>}

      {pending ? (
        <PendingReview
          pending={pending}
          onConfirm={handleConfirm}
          onDiscard={() => setPending(null)}
          saving={saving}
        />
      ) : (
        <>
          {inputMode === null ? (
            <section className="govuk-!-margin-bottom-6">
              <h2 className="govuk-heading-m">Add new information to this case</h2>
              <ButtonGroup>
                <Button type="button" onClick={() => setInputMode("scan")}>
                  📷 Scan an image
                </Button>
                <Button type="button" onClick={() => setInputMode("file")}>
                  📎 Attach a file
                </Button>
                <Button type="button" onClick={() => setInputMode("record")}>
                  🎙️ Record a conversation
                </Button>
              </ButtonGroup>
            </section>
          ) : (
            <section className="govuk-!-margin-bottom-6">
              <Button type="button" tertiary small onClick={() => setInputMode(null)}>
                Cancel
              </Button>
              {inputMode === "scan" && (
                <ScanPanel
                  submitting={processing}
                  onSubmit={(file) => handleProcess(() => scanDocument(caseId, file))}
                />
              )}
              {inputMode === "file" && (
                <AttachPanel
                  submitting={processing}
                  onSubmit={(file) => handleProcess(() => attachDocument(caseId, file))}
                />
              )}
              {inputMode === "record" && (
                <RecordPanel
                  submitting={processing}
                  onSubmit={(blob) => handleProcess(() => recordDocument(caseId, blob))}
                />
              )}
            </section>
          )}

          <div className="govuk-grid-row">
            <section className="govuk-grid-column-one-half">
              <h2 className="govuk-heading-m">Chronology</h2>
              <ButtonGroup>
                <Button
                  type="button"
                  small
                  secondary={chronologyView !== "timeline"}
                  aria-pressed={chronologyView === "timeline"}
                  onClick={() => setChronologyView("timeline")}
                >
                  Timeline
                </Button>
                <Button
                  type="button"
                  small
                  secondary={chronologyView !== "table"}
                  aria-pressed={chronologyView === "table"}
                  onClick={() => setChronologyView("table")}
                >
                  Table
                </Button>
              </ButtonGroup>
              <p className="govuk-hint">
                Click an event to reveal its detail and highlight its passage in the source
                documents.
              </p>
              {chronologyView === "timeline" ? (
                <CaseTimeline
                  events={caseDetail.events}
                  onSelect={handleSelectEvent}
                  focusedEventId={focusedEventId}
                />
              ) : (
                <ChronologyTable
                  events={caseDetail.events}
                  onSelect={handleSelectEvent}
                  focusedEventId={focusedEventId}
                />
              )}
            </section>

            <section className="govuk-grid-column-one-half">
              <h2 className="govuk-heading-m">Source documents</h2>
              {caseDetail.documents.length === 0 && (
                <p className="govuk-hint">No documents yet.</p>
              )}
              <div className="space-y-2">
                {/* Oldest first, matching the chronology; ISO dates sort as strings. */}
                {[...caseDetail.documents]
                  .sort((a, b) => a.document_date.localeCompare(b.document_date) || a.id - b.id)
                  .map((doc) => (
                  <DocumentPanel
                    key={doc.id}
                    document={doc}
                    focusedEventId={focusedEventId}
                    expanded={expandedDocId === doc.id}
                    onToggle={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                    onDelete={() =>
                      confirmAndRun(
                        `Delete "${doc.source_label ?? doc.source_type}" and the events extracted from it? This can't be undone.`,
                        () => deleteDocument(caseId, doc.id),
                        resetAndRefresh
                      )
                    }
                    apiBase={API_BASE}
                  />
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
