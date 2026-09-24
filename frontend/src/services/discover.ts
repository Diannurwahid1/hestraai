import { apiGet, apiPost } from "./api-client";
import { Signal } from "@/types";

export type DirectoryCompany = { ticker: string | null; name: string; slug: string; company_type: string | null;
  operation: string | null; commodities: string[] };
export type DirectoryResult = { companies: DirectoryCompany[]; total: number; offset: number; limit: number; operations: string[] };
export type SignalResult = { signals: Signal[]; total: number; offset: number; limit: number };
export type AISearchResult = { query: string; intent: string; companies: DirectoryCompany[]; signals: Signal[]; result_count: number; unresolved: string | null };

export const discoverCompanies = (q = "", operation = "", offset = 0, limit = 20) =>
  apiGet<DirectoryResult>(`/api/discover?view=companies&q=${encodeURIComponent(q)}&operation=${encodeURIComponent(operation)}&offset=${offset}&limit=${limit}`);
export const discoverSignals = (q = "", offset = 0, limit = 20) =>
  apiGet<SignalResult>(`/api/discover?view=signals&q=${encodeURIComponent(q)}&offset=${offset}&limit=${limit}`);
export const aiSearch = (query: string, limit = 8) =>
  apiPost<AISearchResult>("/api/discover/ai-search", { query, limit });
