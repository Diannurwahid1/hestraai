export type ChatContextType = "signal" | "company" | "metric" | "chart" | "investigation" | "thesis";

export type ChatContext = {
  id: string;
  type: ChatContextType;
  title: string;
  subtitle?: string;
  entity?: string;
  payload: Record<string, unknown>;
};

export type Company = {
  ticker: string;
  name: string;
  sector: string;
  country: string;
  tags: string[];
  marketCap?: number;
  description?: string;
};

export type SignalType = "operational" | "commodity" | "peer_divergence" | "financial" | "policy" | "operational_financial_divergence" | "commodity_financial_divergence";

export type Signal = {
  id: string;
  type: SignalType;
  ticker?: string;
  title: string;
  summary: string;
  severity?: "low" | "medium" | "high";
  createdAt: string;
  contextId: string;
  signal_id?: string;
  entity?: string;
  period?: string;
  confidence_score?: number;
  confidence_label?: "low" | "medium" | "high";
  investigation_id?: string;
  evidence?: Array<{ metric: string; value: number; period: string; source: string; source_reference: string }>;
  caveat?: string | null;
};

export type HestraAction =
  | { type: "ATTACH_CONTEXT"; contextId: string }
  | { type: "OPEN_COMPANY"; ticker: string }
  | { type: "OPEN_INVESTIGATION"; investigationId: string }
  | { type: "FOCUS_SECTION"; sectionId: string }
  | { type: "SAVE_TO_MEMORY"; contextId: string };
