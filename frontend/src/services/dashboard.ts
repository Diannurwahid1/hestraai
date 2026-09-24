import { apiGet } from "./api-client";
import { Company, Signal } from "@/types";

type RawSignal = Signal & { created_at?: string; context_id?: string; generated_at?: string };
type DashboardData = {
  kpis: { nickel_price: number | null; nickel_price_date: string | null; tracked_companies: number | null; featured_price: number | null; featured_market_cap: number | null };
  signals: RawSignal[];
  companies: Company[];
  featured_company?: Company;
  commodity_series: { date: string; price: number }[];
  signal_status?: string;
  signal_reason?: string;
};

const normalizeSignal = (signal: RawSignal): Signal => ({
  ...signal,
  createdAt: signal.createdAt || signal.created_at || signal.generated_at || "",
  contextId: signal.contextId || signal.context_id || `signal.${signal.signal_id || signal.id}`,
});

export const getDashboard = async () => {
  const result = await apiGet<DashboardData>("/api/dashboard");
  return { ...result, data: { ...result.data, signals: result.data.signals.map(normalizeSignal) } };
};
