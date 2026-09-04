export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface CaseSummary {
  id: number;
  name: string;
}

export interface EventIO {
  id: number | null;
  event_date: string | null;
  category: string;
  summary: string;
  people_involved: string[];
  verbatim_excerpt: string;
  importance: "high" | "medium" | "low";
  reason: string;
}

export interface PendingDocument {
  pending_media_id: string | null;
  media_ext: string | null;
  source_type: "image" | "file" | "audio";
  source_label: string;
  raw_text: string;
  document_date: string | null;
  date_confidence: "high" | "low";
  events: EventIO[];
}

export interface HighlightSpan {
  start: number;
  end: number;
  event_id: number | null;
  category: string | null;
  importance: string | null;
  reason: string | null;
}

export interface DocumentOut {
  id: number;
  source_type: string;
  source_label: string | null;
  raw_text: string;
  document_date: string;
  date_confidence: string;
  media_url: string | null;
  highlights: HighlightSpan[];
}

export interface EventRow {
  id: number;
  document_id: number;
  event_date: string;
  category: string;
  summary: string;
  people_involved: string;
  verbatim_excerpt: string | null;
  importance: string;
  reason: string | null;
}

export interface CaseDetail {
  id: number;
  name: string;
  events: EventRow[];
  documents: DocumentOut[];
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function listCases(): Promise<CaseSummary[]> {
  return fetch(`${API_BASE}/api/cases`).then((r) => handle(r));
}

export function createCase(name: string): Promise<CaseSummary> {
  return fetch(`${API_BASE}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => handle(r));
}

export function getCase(caseId: number): Promise<CaseDetail> {
  return fetch(`${API_BASE}/api/cases/${caseId}`).then((r) => handle(r));
}

export function scanDocument(caseId: number, file: File): Promise<PendingDocument> {
  const form = new FormData();
  form.append("image", file);
  return fetch(`${API_BASE}/api/cases/${caseId}/scan`, { method: "POST", body: form }).then((r) =>
    handle(r)
  );
}

export function attachDocument(caseId: number, file: File): Promise<PendingDocument> {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${API_BASE}/api/cases/${caseId}/attach`, { method: "POST", body: form }).then((r) =>
    handle(r)
  );
}

export function recordDocument(caseId: number, blob: Blob): Promise<PendingDocument> {
  const form = new FormData();
  form.append("audio", blob, "recording.webm");
  return fetch(`${API_BASE}/api/cases/${caseId}/record`, { method: "POST", body: form }).then((r) =>
    handle(r)
  );
}

export interface ConfirmPayload {
  pending_media_id: string | null;
  media_ext: string | null;
  source_type: PendingDocument["source_type"];
  source_label: string;
  raw_text: string;
  events: EventIO[];
  document_date: string;
  date_confidence: "high" | "low" | "user_provided";
}

export function saveDocument(caseId: number, payload: ConfirmPayload): Promise<{ document_id: number }> {
  return fetch(`${API_BASE}/api/cases/${caseId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => handle(r));
}
