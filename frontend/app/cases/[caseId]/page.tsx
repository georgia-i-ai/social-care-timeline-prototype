"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  API_BASE,
  CaseDetail,
  EventRow,
  PendingDocument,
  attachDocument,
  getCase,
  recordDocument,
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
    dateConfidence: "high" | "low" | "user_provided"
  ) {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      await saveDocument(caseId, { ...pending, document_date: documentDate, date_confidence: dateConfidence });
      setPending(null);
      refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleSelectEvent(event: EventRow) {
    setFocusedEventId(event.id);
    setExpandedDocId(event.document_id);
  }

  if (loading && !caseDetail) return <p>Loading...</p>;
  if (!caseDetail) return <p className="text-red-600">{error ?? "Case not found."}</p>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          ← All cases
        </Link>
        <h1 className="text-xl font-semibold">Case: {caseDetail.name}</h1>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}

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
            <section className="space-y-3 border-b border-gray-200 pb-6">
              <h2 className="text-lg font-medium">Add new information to this case</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setInputMode("scan")}
                  className="rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                >
                  📷 Scan an image
                </button>
                <button
                  onClick={() => setInputMode("file")}
                  className="rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                >
                  📎 Attach a file
                </button>
                <button
                  onClick={() => setInputMode("record")}
                  className="rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                >
                  🎙️ Record a conversation
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3 border-b border-gray-200 pb-6">
              <button onClick={() => setInputMode(null)} className="text-sm text-blue-600">
                ← Cancel
              </button>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-medium">Chronology</h2>
                <div className="inline-flex overflow-hidden rounded border border-gray-300 text-sm">
                  <button
                    onClick={() => setChronologyView("timeline")}
                    className={`px-3 py-1 ${
                      chronologyView === "timeline"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => setChronologyView("table")}
                    className={`border-l border-gray-300 px-3 py-1 ${
                      chronologyView === "table"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
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

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Source documents</h2>
              {caseDetail.documents.length === 0 && (
                <p className="text-sm text-gray-500">No documents yet.</p>
              )}
              <div className="space-y-2">
                {[...caseDetail.documents].reverse().map((doc) => (
                  <DocumentPanel
                    key={doc.id}
                    document={doc}
                    focusedEventId={focusedEventId}
                    expanded={expandedDocId === doc.id}
                    onToggle={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                    apiBase={API_BASE}
                  />
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
