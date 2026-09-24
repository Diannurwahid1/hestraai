"use client";

import Link from "next/link";
import { Building2, CircleDollarSign, Pickaxe, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { MarketChart } from "@/components/charts/charts";
import { AskHestraButton, MetricCard, SectionHeader, StatusBadge } from "@/components/shared/ui";
import { getDashboard } from "@/services/dashboard";
import { captureSignal } from "@/services/research-memory";
import { Company, Signal } from "@/types";

type DashboardView = Awaited<ReturnType<typeof getDashboard>>["data"];
const empty: DashboardView = { kpis: { nickel_price: null, nickel_price_date: null, tracked_companies: null, featured_price: null, featured_market_cap: null }, signals: [], companies: [], commodity_series: [] };
const fmt = (value: number | null | undefined, currency = "IDR") => value == null ? "Unavailable" : `${currency} ${new Intl.NumberFormat("en-US", { notation: value >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(value)}`;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardView>(empty);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => { void getDashboard().then(result => setData(result.data)).catch(e => setError(e.message)); }, []);
  const bookmark = async (signal: Signal) => { try { await captureSignal(signal.signal_id || signal.id, "bookmark"); setSaved(items => [...items, signal.id]); } catch (e) { setError(e instanceof Error ? e.message : "Could not save signal"); } };
  return <AppShell><div className="page dashboard-page">
    <div className="eyebrow">NICKEL MARKET INTELLIGENCE · SECTORS-BACKED</div>
    <h1>What the nickel evidence shows</h1><p className="lead">Evidence-backed intelligence across Indonesia&apos;s nickel market.</p>
    {error && <p role="alert" className="lead">{error}</p>}
    <div className="metric-grid">
      <MetricCard icon={<CircleDollarSign/>} label="Nickel benchmark" value={data.kpis.nickel_price == null ? "Unavailable" : `US$${data.kpis.nickel_price.toLocaleString("en-US", { maximumFractionDigits: 0 })}/t`} change={data.kpis.nickel_price_date || "Sectors commodity series"}/>
      <MetricCard icon={<Building2/>} label="Listed company price" value={fmt(data.kpis.featured_price)} change={data.featured_company?.ticker || "Sectors company report"}/>
      <MetricCard icon={<TrendingUp/>} label="Listed company market cap" value={fmt(data.kpis.featured_market_cap)} change={data.featured_company?.ticker || "Sectors company report"}/>
      <MetricCard icon={<Pickaxe/>} label="Nickel directory" value={data.kpis.tracked_companies?.toLocaleString() || "Unavailable"} change="Sectors mining directory"/>
    </div>
    <section className="panel feed" id="signals"><SectionHeader title="Nickel Intelligence Feed" subtitle="Hestra signals derived deterministically from Sectors facts." action="Discover all" actionHref="/discover?view=signals"/>
      {!data.signals.length && <p className="lead">{data.signal_reason || "No verified signals currently meet the research thresholds."}</p>}
      <div className="signal-grid">{data.signals.map(s => <article className="signal-card" key={s.id}>
        <div className="signal-meta"><StatusBadge tone={s.severity === "high" ? "red" : "blue"}>{s.type.replaceAll("_", " ")}</StatusBadge><span>{s.period}</span></div>
        <h3>{s.title}</h3><p>{s.summary}</p><div className="signal-footer"><span className="company-symbol">{s.entity || s.ticker}</span><div><strong>{s.entity || s.ticker} · {s.severity} severity</strong><small>{s.confidence_label} confidence · {s.period}</small></div></div>
        <AskHestraButton prompt={`Explain the verified evidence behind ${s.type.replaceAll("_", " ")} for ${s.entity || s.ticker}.`} context={{ id: s.contextId, type: "signal", title: s.title, entity: s.entity || s.ticker, subtitle: s.period, payload: { signal_id: s.signal_id, evidence: s.evidence, caveat: s.caveat } }}/>
        <button className="card-link" onClick={() => void bookmark(s)} disabled={saved.includes(s.id)}>{saved.includes(s.id) ? "Saved" : "Save to Memory"}</button>
        <Link className="card-link" href={`/investigate/${s.investigation_id || s.id}`}>View Evidence →</Link>
      </article>)}</div>
    </section>
    <div className="dashboard-lower"><section className="panel"><SectionHeader title="Coverage Universe" subtitle="Verified nickel companies." action="Discover" actionHref="/discover"/>
      <div className="coverage-stats"><b>{data.kpis.tracked_companies ?? "—"}<span>Nickel companies</span></b></div>
      <div className="company-list">{data.companies.map((c: Company) => <Link href={`/companies/${c.ticker}`} key={c.ticker}><span className="company-symbol"><Pickaxe/></span><strong>{c.name}<small>{c.ticker}</small></strong><em>{c.sector}</em><span>{c.country || "Indonesia"} ›</span></Link>)}</div>
    </section><section className="panel market-panel"><SectionHeader title="Market Snapshot" subtitle="Actual Sectors nickel benchmark observations."/>
      <div className="chart-controls"><span>Nickel benchmark</span></div><MarketChart series={data.commodity_series}/>
      <div className="market-summary"><b>{data.kpis.nickel_price == null ? "Unavailable" : `US$${data.kpis.nickel_price.toLocaleString("en-US", { maximumFractionDigits: 0 })}/t`}<span>{data.kpis.nickel_price_date || "Latest available"}</span></b><Link href="/discover">Explore companies →</Link></div>
    </section></div>
  </div></AppShell>;
}
