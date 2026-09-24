import { apiGet, apiPost, apiPut } from "./api-client";

export type AIModelSettings = {
  user_id: string;
  provider: string;
  base_url: string;
  api_key: string;
  has_api_key?: boolean;
  model: string;
  extra_headers: Record<string, string>;
  models: string[];
  updated_at?: string | null;
};

export type AIUsage = {
  period_days: number;
  requests: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  last_used_at?: string | null;
};

export type AILog = {
  id: string;
  provider: string;
  model: string;
  source: string;
  status: string;
  total_tokens: number;
  request_preview: string;
  response_preview: string;
  error_message: string;
  created_at: string;
};

export const emptySettings: AIModelSettings = {
  user_id: "",
  provider: "bynara",
  base_url: "https://router.bynara.id/v1",
  api_key: "",
  model: "agnes-3-flash",
  extra_headers: {},
  models: [],
};

export const getAIModelSettings = () => apiGet<AIModelSettings>("/api/ai-model/settings");
export const saveAIModelSettings = (settings: AIModelSettings) => apiPut<AIModelSettings>("/api/ai-model/settings", settings);
export const loadAIModels = (settings: AIModelSettings) => apiPost<{ models: string[] }>("/api/ai-model/models", settings);
export const getAIUsage = () => apiGet<AIUsage>("/api/ai-model/usage");
export const getAILogs = () => apiGet<{ logs: AILog[] }>("/api/ai-model/logs?limit=30");
