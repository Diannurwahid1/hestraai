"use client";

import Link from "next/link";
import { Building2, ChevronRight, CircleHelp, Radar, Search, Sparkles } from "lucide-react";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { AskHestraButton, SectionHeader, StatusBadge } from "@/components/shared/ui";
import { aiSearch, discoverCompanies, discoverSignals, type AISearchResult, type DirectoryCompany } from "@/services/discover";
import { Signal } from "@/types";

type Mode = "ai" | "companies" | "signals";

function DiscoverContent() {
  const params = useSearchParams();
  const requested = params.get("view");
  const [mode, setMode] = useState<Mode>(requested === "companies" ? "companies" : requested === "signals" ? "signals" : "ai");
  const [query, setQuery] = useState(params.get("q") || "");
  const [companies, setCompanies] = useState<DirectoryCompany[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [aiResult, setAiResult] = useState<AISearchResult | null>(null);
  const [operation, setOperation] = useState("");
  const [operations, setOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "ai") return;
    setLoading(true); setError("");
    if (mode === "companies") {
      void discoverCompanies(query, operation).then(result => { setCompanies(result.data.companies); setOperations(result.data.operations); })
        .catch(cause => setError(cause instanceof Error ? cause.message : "Discover could not load verified data"))
        .finally(() => setLoading(false));
    } else {
      void discoverSignals(query).then(result => setSignals(result.data.signals))
        .catch(cause => setError(cause instanceof Error ? cause.message : "Discover could not load verified data"))
        .finally(() => setLoading(false));
    }
  }, [mode, query, operation]);

  const search = (value: string) => { setQuery(value); setLoading(true); setError(""); void aiSearch(value).then(result => setAiResult(result.data)).catch(cause => setError(cause instanceof Error ? cause.message : "AI Search failed")).finally(() => setLoading(false)); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (query.trim().length >= 2) search(query.trim()); };
  const changeMode = (next: Mode) => { setMode(next); setError(""); if (next === "ai") setAiResult(null); };

  return <AppShell><div className="page discover-page"><div className="eyebrow">DISCOVER · AI SEARCH · SECTORS-BACKED</div><h1>Ask the nickel universe.</h1><p className="lead">Search companies and derived signals with one research question. Hestra ranks only verified records from Sectors.</p>
    <section className="ai-search-hero panel"><div className="ai-search-copy"><span className="ai-search-icon"><Sparkles size={19}/></span><div><h2>AI Search</h2><p>Try a ticker, an operation, or the question behind your research.</p></div></div><form className="ai-search-form" onSubmit={submit}><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. Which nickel peers show margin divergence?" aria-label="AI Search query"/><button disabled={loading || query.trim().length < 2}>{loading ? "Searching…" : "Search"}</button></form><div className="search-suggestions"><span>Try:</span>{["ANTM financials", "nickel peer divergence", "mining companies in Indonesia"].map(item => <button type="button" key={item} onClick={() => search(item)}>{item}</button>)}</div></section>
    <div className="discover-modes"><button className={mode === "ai" ? "active" : ""} onClick={() => changeMode("ai")}><Sparkles size={15}/> AI Search</button><button className={mode === "companies" ? "active" : ""} onClick={() => changeMode("companies")}><Building2 size={15}/> Companies</button><button className={mode === "signals" ? "active" : ""} onClick={() => changeMode("signals")}><Radar size={15}/> Signals</button></div>
    {error && <p role="alert" className="lead">{error}</p>}
    {mode === "ai" && <section className="discover-results"><SectionHeader title={aiResult ? `Results for “${aiResult.query}”` : "Search across Hestra"} subtitle={aiResult ? `${aiResult.result_count} verified matches · ${aiResult.intent.replaceAll("_", " ")}` : "One query, two evidence surfaces."}/>{!aiResult && <div className="ai-search-empty"><CircleHelp size={25}/><h3>What can I search?</h3><p>Use natural language to find companies and existing research signals. Open a result to inspect the source or ask Hestra for an explanation.</p></div>}{aiResult && <><div className="ai-result-columns"><div><h3><Building2 size={16}/> Companies <small>{aiResult.companies.length}</small></h3>{aiResult.companies.map(company => <CompanyResult key={company.slug} company={company}/>)}</div><div><h3><Radar size={16}/> Research signals <small>{aiResult.signals.length}</small></h3>{aiResult.signals.map(signal => <SignalResult key={signal.signal_id || signal.id} signal={signal}/>)}</div></div>{aiResult.unresolved && <div className="unresolved-search"><strong>No direct match</strong><span>{aiResult.unresolved}</span></div>}</>}</section>}
    {mode !== "ai" && <section className="panel discover-results"><SectionHeader title={mode === "companies" ? "Company directory" : "Derived research signals"} subtitle={loading ? "Loading verified data…" : mode === "companies" ? `${companies.length} visible companies` : `${signals.length} signals`}/>{mode === "companies" && <><div className="directory-toolbar"><span>Verified nickel directory</span><select value={operation} onChange={event => setOperation(event.target.value)}><option value="">All operations</option>{operations.map(item => <option key={item} value={item}>{item}</option>)}</select></div><div className="company-list">{companies.map(company => <CompanyResult key={company.slug} company={company}/>)}</div></>}{mode === "signals" && <div className="signal-grid">{signals.map(signal => <SignalResult key={signal.signal_id || signal.id} signal={signal}/>)}</div>}</section>}
  </div></AppShell>;
}

function CompanyResult({ company }: { company: DirectoryCompany }) { return <article className="discover-result-card company-result"><span className="company-symbol"><Building2 size={17}/></span><div><strong>{company.name}<small>{company.ticker || "Directory company"}</small></strong><p>{company.operation || company.company_type || "Nickel operation"}</p><div className="result-tags">{company.commodities.slice(0, 3).map(item => <em key={item}>{item}</em>)}</div></div>{company.ticker ? <Link href={`/companies/${company.ticker}`} aria-label={`Open ${company.ticker} profile`}><ChevronRight size={17}/></Link> : <span/>}</article>; }
function SignalResult({ signal }: { signal: Signal }) { return <article className="discover-result-card signal-result"><div className="signal-meta"><StatusBadge tone={signal.severity === "high" ? "red" : "blue"}>{signal.type.replaceAll("_", " ")}</StatusBadge><span>{signal.period}</span></div><h3>{signal.title}</h3><p>{signal.summary}</p><div className="result-footer"><span>{signal.entity || signal.ticker} · {signal.confidence_label} confidence</span><AskHestraButton context={{ id: `signal.${signal.signal_id}`, type: "signal", title: signal.title, entity: signal.entity || signal.ticker, subtitle: signal.period, payload: { signal_id: signal.signal_id, evidence: signal.evidence } }} prompt={`Investigate ${signal.title} using the verified evidence.`}/><Link href={`/investigate/${signal.investigation_id || signal.signal_id || signal.id}`}>Evidence <ChevronRight size={14}/></Link></div></article>; }
export default function DiscoverPage() { return <Suspense fallback={<div>Loading Discover…</div>}><DiscoverContent/></Suspense>; }
