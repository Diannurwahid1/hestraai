import { apiGet, apiPost } from "./api-client";

export type SandboxSubscription = {
  plan: string | null;
  status: "none" | "trial" | "active" | "expired";
  expires_at: string | null;
  trial_used: boolean;
};
export type SandboxPayment = { order_id: string; plan: string; amount_idr: number; status: string; created_at: string };
export type BillingStatus = { environment: "sandbox"; subscription: SandboxSubscription; payments: SandboxPayment[] };
export type Checkout = { order_id: string; status: "pending"; payment_url: string; amount_idr: number; plan: string; expires_at: string; environment: "sandbox" };
export type SectorsUsage = { period_days: number; upstream_requests: number; cache_hits: number; stale_hits: number;
  sectors_credits: null; credit_disclosure: string;
  endpoints: { endpoint: string; upstream_requests: number; cache_hits: number; stale_hits: number; http_errors: number }[] };
export type EconomicsInput = { researchers: number; analysts: number; sectors_monthly_cost_idr: number;
  sectors_monthly_credits: number; average_credits_per_user: number | null; payment_method: "QRIS" | "QRIS_INSTANT" };
export type EconomicsResult = { scenario_only: true; revenue_idr: number; payment_gateway_fees_idr: number;
  sectors_monthly_cost_idr: number; remaining_before_hosting_tax_support_idr: number;
  maximum_active_users_at_assumed_burn: number | null; planned_users: number; credit_budget_sufficient: boolean | null; disclosure: string };

export const getBillingStatus = () => apiGet<BillingStatus>("/api/billing/status");
export const getSandboxOrder = (orderId: string) => apiGet<SandboxPayment>(`/api/billing/orders/${encodeURIComponent(orderId)}`);
export const startSandboxTrial = () => apiPost<SandboxSubscription>("/api/billing/trial", {});
export const createSandboxCheckout = (plan: "researcher" | "analyst") => apiPost<Checkout>("/api/billing/checkout", { plan });
export const getSectorsUsage = () => apiGet<SectorsUsage>("/api/billing/sectors-usage");
export const estimateEconomics = (input: EconomicsInput) => apiPost<EconomicsResult>("/api/billing/economics", input);
