"use client";

import { useCallback, useEffect, useState } from "react";
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
import { DocumentPanel } from "@/components/DocumentPanel";
import { ScanPanel } from "@/components/ScanPanel";
import { AttachPanel } from "@/components/AttachPanel";
import { RecordPanel } from "@/components/RecordPanel";
import { PendingReview } from "@/components/PendingReview";

type InputMode = "scan" | "file" | "record" | null;

export default function CasePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = Number(params.caseId);

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>(null);
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
      <h1 className="text-xl font-semibold">Case: {caseDetail.name}</h1>
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
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Chronology</h2>
            <p className="text-xs text-gray-500">
              Click a row to jump to its highlighted passage in the source document below.
            </p>
            <ChronologyTable
              events={caseDetail.events}
              onSelect={handleSelectEvent}
              focusedEventId={focusedEventId}
            />
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

          {inputMode === null ? (
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Add new information to this case</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setInputMode("scan")}
                  className="rounded bg-gray-100 hover:bg-gray-200 px-4 py-3 border border-gray-300"
                >
                  📷 Scan an image
                </button>
                <button
                  onClick={() => setInputMode("file")}
                  className="rounded bg-gray-100 hover:bg-gray-200 px-4 py-3 border border-gray-300"
                >
                  📎 Attach a file
                </button>
                <button
                  onClick={() => setInputMode("record")}
                  className="rounded bg-gray-100 hover:bg-gray-200 px-4 py-3 border border-gray-300"
                >
                  🎙️ Record a conversation
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-3 border-t border-gray-200 pt-4">
              <button onClick={() => setInputMode(null)} className="text-sm text-blue-600">
                ← Back to timeline
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
        </>
      )}
    </div>
  );
}
