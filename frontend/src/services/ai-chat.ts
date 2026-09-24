import { apiDelete, apiGet, apiPost } from "./api-client";

export type ChatPresentation = {
  cards: { metric: string; value: number; period: string; source: string; source_reference: string; entity: string }[];
  chart: { title: string; unit: string; points: { period: string; value: number }[]; source: string; source_reference: string } | null;
  unresolved: string[];
};
export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; context_id?: string; model?: string; presentation?: ChatPresentation | null };

export const sendChat = (message: string, contextId?: string) => apiPost<{ message: string; model: string; presentation: ChatPresentation }>("/api/chat", { message, context_id: contextId });
export const getChatHistory = () => apiGet<{ messages: ChatMessage[] }>("/api/chat/history");
export const clearChatHistory = () => apiDelete<{ cleared: boolean }>("/api/chat/history");
