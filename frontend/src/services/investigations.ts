import { apiGet, apiPost } from "./api-client";

export type Evidence = {
  metric: string;
  value: number;
  period: string;
  source: "sectors";
  source_type: string;
  source_reference: string;
  inputs?: Record<string, unknown>;
};

export type Investigation = {
  id: string;
  status: "resolved" | "unresolved";
  reason?: string;
  signal: {
    signal_id: string;
    type: string;
    entity: string;
    period: string;
    severity: "low" | "medium" | "high";
    title: string;
    summary: string;
    confidence_label: "low" | "medium" | "high";
    caveat?: string | null;
  } | null;
  evidence: Evidence[];
  supporting: { statement: string; evidence_metrics: string[] }[];
  contradictions: { statement: string; evidence_metrics: string[] }[];
  unresolved: string[];
  selected_tools: string[];
  hypothesis?: string;
};

export const getInvestigation = (id: string) => apiGet<Investigation>(`/api/investigations/${encodeURIComponent(id)}`);

export const explainInvestigation = (id: string) => apiPost<{
  status: "resolved" | "unresolved"; explanation: string | null; reason?: string;
}>(`/api/investigations/${encodeURIComponent(id)}/explain`, {});
