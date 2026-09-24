"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowUp, BarChart3, ChevronDown, Minus, Search, Settings, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ContextAttachment } from "@/components/shared/ui";
import { clearChatHistory, getChatHistory, sendChat, type ChatMessage, type ChatPresentation } from "@/services/ai-chat";
import { getAIModelSettings, loadAIModels } from "@/services/ai-model";
import { useHestraChat } from "./chat-provider";

const quick = ["Compare ANTM vs INCO", "Explain attached evidence", "What remains unresolved?"];
const stages = ["Reading your question…", "Checking available evidence…", "Preparing the response…"];

function ResearchVisuals({ data, onAsk }: { data?: ChatPresentation | null; onAsk: (prompt: string) => void }) {
  if (!data || (!data.cards.length && !data.chart && !data.unresolved.length)) return null;
  return <div className="chat-visuals">
    {data.cards.length > 0 && <div className="chat-evidence-grid">{data.cards.map((card, index) => <details className="chat-evidence-card" key={`${card.metric}-${card.entity}-${index}`}>
      <summary><span className="chat-evidence-label">{card.entity ? `${card.entity} · ` : ""}{card.metric.replaceAll("_", " ")}</span><strong>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, notation: Math.abs(card.value) >= 1_000_000 ? "compact" : "standard" }).format(card.value)}</strong><small>{card.period} · {card.source}</small><ChevronDown size={14}/></summary>
      <div className="chat-evidence-detail"><p>Source: {card.source_reference}</p><button type="button" onClick={() => onAsk(`Explain the verified ${card.metric.replaceAll("_", " ")} value${card.entity ? ` for ${card.entity}` : ""} in ${card.period}, including its limitations.`)}>Ask about this metric</button></div>
    </details>)}</div>}
    {data.chart && <section className="chat-chart-card"><div><BarChart3 size={15}/><strong>{data.chart.title}</strong></div><div className="chat-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.chart.points}><defs><linearGradient id="chatChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#277cff" stopOpacity={.34}/><stop offset="1" stopColor="#277cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#1e2d3a"/><XAxis dataKey="period" tick={{ fill: "#8498ab", fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip contentStyle={{ background: "#0c141d", border: "1px solid #2b4053", borderRadius: 8 }} formatter={value => [Number(value).toLocaleString(), data.chart?.unit || "Value"]}/><Area type="monotone" dataKey="value" stroke="#4195ff" fill="url(#chatChartFill)" isAnimationActive={false}/></AreaChart></ResponsiveContainer></div><small>{data.chart.source} · {data.chart.source_reference}</small></section>}
    {data.unresolved.length > 0 && <div className="chat-unresolved"><strong>Still unresolved</strong>{data.unresolved.map((item, index) => <p key={index}>{item}</p>)}</div>}
  </div>;
}

export function HestraChat({ preset = "dashboard" }: { preset?: "dashboard" | "company" | "investigate" | "memory" }) {
  const { open, setOpen, draft, setDraft, context, attaching, attachmentError } = useHestraChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState(0);
  const [followUpContext, setFollowUpContext] = useState<string | undefined>();
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const modelStorageKey = useRef("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { void getChatHistory().then(result => setMessages(result.data.messages)).catch(e => setError(e.message)); }, []);
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      try {
        const result = await getAIModelSettings();
        const settings = result.data;
        let models = settings.models;
        let listingFailed = false;
        if (!models.length && settings.base_url && (settings.has_api_key || settings.api_key)) {
          try { models = (await loadAIModels(settings)).data.models; }
          catch { listingFailed = true; if (!cancelled) setModelError("Could not load the gateway model list."); }
        }
        if (cancelled) return;
        if (!models.length && !listingFailed && !settings.model) setModelError("No model is configured yet.");
        else if (!models.length && !listingFailed) setModelError("The gateway returned no model list.");
        const available = [...new Set([...models, ...(settings.model ? [settings.model] : [])])];
        const storageKey = `hestra.chat.model.${settings.user_id}`;
        modelStorageKey.current = storageKey;
        const preferred = window.localStorage.getItem(storageKey);
        setModelOptions(available);
        setSelectedModel(preferred && available.includes(preferred) ? preferred : settings.model || available[0] || "");
      } catch (cause) {
        if (!cancelled) setModelError(cause instanceof Error ? cause.message : "Could not load AI model settings.");
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    };
    void loadModels();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, stage, error]);
  useEffect(() => {
    if (!sending) return;
    const first = window.setTimeout(() => setStage(1), 2500);
    const second = window.setTimeout(() => setStage(2), 7000);
    return () => { window.clearTimeout(first); window.clearTimeout(second); };
  }, [sending]);
  const initial = preset === "memory"
    ? "Your research memory is ready. I can surface changes across theses, signals and assumptions."
    : preset === "investigate"
      ? "The active investigation is loaded. Ask me to explain any evidence or unresolved contradiction."
      : preset === "company"
        ? "I can help you analyze this company's verified operations, valuation and peer context."
        : "I'm Hestra, your nickel intelligence research partner. What would you like to investigate?";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    const text = draft.trim();
    const selectedContext = context?.id || followUpContext;
    setSending(true); setStage(0); setError(""); setDraft("");
    setMessages(previous => [...previous, { id: `local-${Date.now()}`, role: "user", text }]);
    try {
      const result = await sendChat(text, selectedContext, selectedModel);
      setMessages(previous => [...previous, { id: `reply-${Date.now()}`, role: "assistant", text: result.data.message,
        model: result.data.model, context_id: selectedContext, presentation: result.data.presentation }]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "AI explanation is unavailable. Check your model settings."); }
    finally { setSending(false); }
  };
  const clear = async () => {
    if (!window.confirm("Clear your saved chat history?")) return;
    try { await clearChatHistory(); setMessages([]); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not clear history"); }
  };
  return <><button className="mobile-ai-fab" onClick={() => setOpen(true)} aria-label="Open Hestra AI"><span className="mobile-ai-fab-orb"><Image src="/hestra-robot.png" alt="" fill sizes="48px"/></span><span>Ask Hestra</span></button><aside className={`chat-panel ${open ? "open" : ""}`} aria-label="Hestra AI chat">
    <div className="chat-header"><span className="hestra-avatar"><Image src="/hestra-robot.png" alt="" fill sizes="36px"/></span><div className="chat-identity"><strong>HESTRA AI</strong><small>Research assistant</small></div>
      <button className="icon-button" onClick={() => void clear()} title="Clear chat history" aria-label="Clear chat history"><Trash2 size={16}/></button>
      <Link className="icon-button" href="/settings" aria-label="AI model settings"><Settings size={17}/></Link>
      <button className="icon-button desktop-chat-close" onClick={() => setOpen(false)} aria-label="Collapse chat"><Minus size={18}/></button>
      <button className="icon-button mobile-chat-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={18}/></button>
    </div>
    <div className="chat-scroll"><div className="assistant-row"><span className="hestra-avatar"><Image src="/hestra-robot.png" alt="" fill sizes="34px"/></span><div className="bubble assistant"><p>{initial}</p></div></div>
      {messages.map(message => <div key={message.id} className={`chat-message ${message.role}`}>
        {message.role === "assistant" && <span className="hestra-avatar"><Image src="/hestra-robot.png" alt="" fill sizes="32px"/></span>}
        <div className="chat-message-content">
          {message.role === "assistant" && <ResearchVisuals data={message.presentation} onAsk={prompt => { setDraft(prompt); setFollowUpContext(message.context_id); }} />}
          {message.role === "assistant" && message.presentation && (message.presentation.cards.length > 0 || message.presentation.chart)
            ? <details className="chat-analysis"><summary>Read Hestra&apos;s analysis <ChevronDown size={14}/></summary><div className="bubble assistant"><ReactMarkdown>{message.text}</ReactMarkdown></div></details>
            : <div className={`bubble ${message.role}`}>{message.role === "assistant" ? <ReactMarkdown>{message.text}</ReactMarkdown> : message.text}</div>}
          {message.role === "assistant" && message.model && <small className="chat-model">Answered with {message.model}</small>}
        </div>
      </div>)}
      {sending && <div className="assistant-row chat-thinking" role="status" aria-live="polite"><span className="hestra-avatar working"><Image src="/hestra-robot.png" alt="" fill sizes="34px"/></span><div><span className="thinking-dots"><i/><i/><i/></span><small><Search size={12}/>{stages[stage]}</small></div></div>}
      {error && <div className="bubble assistant" role="alert">{error}</div>}
      {attachmentError && <div className="bubble assistant" role="alert">Could not attach context: {attachmentError}</div>}
      <div ref={endRef}/>
    </div>
    <div className="chat-bottom"><ContextAttachment/>
      <div className="chat-model-picker"><label htmlFor="chat-model-select">Model</label><select id="chat-model-select" value={selectedModel} disabled={modelsLoading || sending || modelOptions.length === 0} onChange={event => {
        setSelectedModel(event.target.value);
        if (modelStorageKey.current) window.localStorage.setItem(modelStorageKey.current, event.target.value);
      }}>{modelsLoading ? <option value="">Loading models...</option> : modelOptions.length ? modelOptions.map(model => <option value={model} key={model}>{model}</option>) : <option value="">No model configured</option>}</select></div>
      {modelError && <small className="chat-model-hint">{modelError} <Link href="/settings">Open Settings</Link></small>}
      <div className="quick-chips">{quick.map(question => <button type="button" key={question} onClick={() => setDraft(question)}>{question}</button>)}</div>
      <form onSubmit={submit}><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask a research question…" aria-label="Ask a research question"/><button className="send" aria-label="Send" disabled={sending || attaching || !draft.trim()}><ArrowUp size={17}/></button></form>
      <small>Research answers should be checked against the attached sources.</small>
    </div>
  </aside></>;
}
