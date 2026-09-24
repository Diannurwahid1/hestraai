import { apiGet, apiPost, apiPut } from "./api-client";
import type { AuthUser } from "./auth";

export type Plan = "explorer" | "analyst" | "team";
export type ResearchLevel = "beginner" | "intermediate" | "advanced";
export type ResearchProfile = {
  plan: Plan;
  level: ResearchLevel;
  role: string;
  focus_tickers: string[];
  research_goal: string;
  language: "English" | "Bahasa Indonesia";
  tour_completed: boolean;
};
export type OnboardingInput = Omit<ResearchProfile, "tour_completed"> & { name: string };
export const getOnboarding = () => apiGet<{ user: AuthUser; profile: ResearchProfile | null }>("/api/onboarding");
export const saveOnboarding = (data: OnboardingInput) => apiPut<{ user: AuthUser; profile: ResearchProfile }>("/api/onboarding", data);
export const completeTour = () => apiPost<{ profile: ResearchProfile }>("/api/onboarding/tour-complete", {});
