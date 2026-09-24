import { apiGet } from "./api-client";

export type FinancialYear = {
  year: number; revenue: number | null; ebitda: number | null; earnings: number | null;
  ebitda_margin: number | null; operating_cash_flow: number | null; outstanding_shares: number | null;
};
export type CompanyPeer = { ticker: string; name: string; year: number; market_cap: number | null;
  pe_ttm: number | null; pb_mrq: number | null; revenue: number | null };
export type ApiCompany = {
  ticker: string; name: string; sector: string | null; country: string; tags: string[];
  price: number | null; price_date: string | null; daily_close_change: number | null;
  market_cap: number | null; employee_count: number | null; listing_date: string | null;
  website: string | null; esg_score: number | null;
  price_range_52w: { low: number | null; high: number | null };
  metrics: { eps: number | null; revenue_growth_yoy: number | null; earnings_growth_yoy: number | null;
    roe: number | null; revenue: number | null; ebitda: number | null; earnings: number | null;
    ebitda_margin: number | null; outstanding_shares: number | null; financial_year: number | null };
  financial_history: FinancialYear[];
  valuation: { forward_pe: number | null; intrinsic_value: number | null; pe: number | null;
    pb: number | null; enterprise_to_ebitda: number | null; year: number | null };
  mining: { name: string; operation: string | null; company_type: string | null; commodities: string[];
    activities?: string[]; site_count?: number | null; license_count?: number;
    licenses?: { activity: string | null; commodity: string | null; location: string | null; expiry_date: string | null }[] } | null;
  peers: CompanyPeer[];
  price_history: { date: string; close: number; volume: number | null }[];
  provenance: { company_report: string; mining_directory: string };
};

export const getCompany = (ticker: string) => apiGet<ApiCompany>(`/api/companies/${encodeURIComponent(ticker)}`);
export const getPeers = (ticker: string) => apiGet<CompanyPeer[]>(`/api/companies/${encodeURIComponent(ticker)}/peers`);
export const getContextGraph = (ticker: string) => apiGet<{ nodes: { id: string; type: string; label: string; detail?: string; source_reference?: string }[];
  edges: { source: string; target: string }[] }>(`/api/companies/${encodeURIComponent(ticker)}/context-graph`);
