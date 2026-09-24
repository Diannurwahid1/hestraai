"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ChatContext } from "@/types";
import { apiPost } from "@/services/api-client";

type ChatState = {
  context: ChatContext | null;
  draft: string;
  open: boolean;
  attaching: boolean;
  attachmentError: string;
  attach: (context: ChatContext, prompt?: string) => void;
  clear: () => void;
  setDraft: (value: string) => void;
  setOpen: (value: boolean) => void;
};

const ChatStateContext = createContext<ChatState | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<ChatContext | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const value = useMemo(() => ({
    context, draft, open, attaching, attachmentError, setDraft, setOpen,
    attach: (next: ChatContext, prompt = `Walk me through the evidence behind ${next.title}.`) => {
      setDraft(prompt); setOpen(true); setAttaching(true); setAttachmentError("");
      void apiPost("/api/context/attach", { context_id: next.id, type: next.type, title: next.title, entity: next.entity, payload: next.payload })
        .then(() => setContext(next)).catch(e => { setContext(null); setAttachmentError(e instanceof Error ? e.message : "Context attachment failed"); })
        .finally(() => setAttaching(false));
    },
    clear: () => setContext(null),
  }), [context, draft, open, attaching, attachmentError]);

  return <ChatStateContext.Provider value={value}>{children}</ChatStateContext.Provider>;
}

export function useHestraChat() {
  const value = useContext(ChatStateContext);
  if (!value) throw new Error("useHestraChat must be used inside ChatProvider");
  return value;
}
