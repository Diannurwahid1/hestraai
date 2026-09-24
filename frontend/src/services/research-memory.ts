import { apiDelete, apiGet, apiPatch, apiPost } from "./api-client";

export type MemoryKind = "thesis" | "assumption" | "note" | "investigation" | "bookmark";
export type MemoryRecord = { id: string; kind: MemoryKind; title: string; content: string;
  metadata: Record<string, unknown>; updated_at: string | null };
export type MemoryData = { records: MemoryRecord[]; counts: Record<MemoryKind, number> };

export const getResearchMemory = () => apiGet<MemoryData>("/api/research-memory");
export const saveResearchMemory = (record: { kind: MemoryKind; title: string; content: string; metadata?: Record<string, unknown> }) =>
  apiPost<MemoryRecord>("/api/research-memory", record);
export const updateResearchMemory = (id: string, update: { title?: string; content?: string; metadata?: Record<string, unknown> }) =>
  apiPatch<MemoryRecord>(`/api/research-memory/${encodeURIComponent(id)}`, update);
export const deleteResearchMemory = (id: string) => apiDelete<{ deleted: boolean }>(`/api/research-memory/${encodeURIComponent(id)}`);
export const captureSignal = (signal_id: string, kind: "bookmark" | "investigation") =>
  apiPost<MemoryRecord>("/api/research-memory/capture", { signal_id, kind });
