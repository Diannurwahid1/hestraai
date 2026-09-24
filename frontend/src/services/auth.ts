import { apiGet, apiPost } from "./api-client";

export type AuthUser = { id: string; name: string; email: string; role: string };
type AuthResponse = { token: string; user: AuthUser };

export const login = (email: string, password: string) => apiPost<AuthResponse>("/api/auth/login", { email, password });
export const register = (name: string, email: string, password: string) =>
  apiPost<AuthResponse>("/api/auth/register", { name, email, password });
export const registrationStatus = () => apiGet<{ enabled: boolean }>("/api/auth/registration");
export const verifySession = () => apiGet<{ user: AuthUser }>("/api/auth/me");
export const changePassword = (current_password: string, new_password: string) =>
  apiPost<{ updated: boolean }>("/api/auth/change-password", { current_password, new_password });
export const logout = async () => {
  try { await apiPost("/api/auth/logout", {}); } finally { clearSession(); }
};

export const saveSession = (token: string, user: AuthUser) => {
  localStorage.setItem("hestra.auth.token", token);
  localStorage.setItem("hestra.auth.user", JSON.stringify(user));
};
export const clearSession = () => {
  localStorage.removeItem("hestra.auth.token");
  localStorage.removeItem("hestra.auth.user");
};
export const currentUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("hestra.auth.user");
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
};
export const hasSession = () => typeof window !== "undefined" && Boolean(localStorage.getItem("hestra.auth.token"));
