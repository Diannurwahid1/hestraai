"use client";

import { ArrowUpRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { ChatContext } from "@/types";
import { useHestraChat } from "@/components/ai/chat-provider";

export function SectionHeader({ title, subtitle, action, actionHref, onAction }: { title: string; subtitle?: string; action?: string; actionHref?: string; onAction?: () => void }) {
  return <div className="section-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && actionHref && <Link className="text-action" href={actionHref}>{action} <ArrowUpRight size={14} /></Link>}{action && onAction && <button className="text-action" onClick={onAction}>{action} <ArrowUpRight size={14} /></button>}</div>;
}

export function StatusBadge({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "red" | "purple" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function AskHestraButton({ prompt, context }: { prompt?: string; context: ChatContext }) {
  const { attach } = useHestraChat();
  return <button className="ask-button" onClick={() => attach(context, prompt)}><Sparkles size={14} /> Ask Hestra</button>;
}

export function MetricCard({ icon, label, value, change, negative = false }: { icon: React.ReactNode; label: string; value: string; change: string; negative?: boolean }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><div><p>{label}</p><strong>{value}</strong><small className={negative ? "negative" : "positive"}>{change}</small></div></article>;
}

export function ContextAttachment() {
  const { context, clear } = useHestraChat();
  if (!context) return null;
  return <div className="context-attachment"><div className="attachment-icon"><Sparkles size={16} /></div><div><small>ATTACHED CONTEXT · {context.type.toUpperCase()}</small><strong>{context.title}</strong><span>{context.entity}{context.subtitle && ` · ${context.subtitle}`}</span></div><button onClick={clear} aria-label="Remove context"><X size={15} /></button></div>;
}
