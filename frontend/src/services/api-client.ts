const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type ApiResult<T> = { data: T; meta: { source: "sectors" | "database" | "llm" | "unavailable"; cached: boolean; disclosure?: string } };

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const token = typeof window === "undefined" ? null : localStorage.getItem("hestra.auth.token");
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/register")) {
      localStorage.removeItem("hestra.auth.token");
      localStorage.removeItem("hestra.auth.user");
      if (typeof window !== "undefined") window.dispatchEvent(new Event("hestra:unauthorized"));
    }
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      detail = typeof payload.detail === "string" ? payload.detail : payload.error?.message || detail;
    } catch { /* Keep HTTP status. */ }
    throw new Error(detail);
  }
  return response.json() as Promise<ApiResult<T>>;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body: unknown) => request<T>("POST", path, body);
export const apiPut = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
export { API_BASE };
