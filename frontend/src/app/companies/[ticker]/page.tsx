"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ContextGraph } from "@/components/charts/context-graph";
import { FinancialBars, MarketChart } from "@/components/charts/charts";
import { AskHestraButton, SectionHeader, StatusBadge } from "@/components/shared/ui";
import { ApiCompany, getCompany, getContextGraph } from "@/services/companies";
import { saveResearchMemory } from "@/services/research-memory";

type Graph = Awaited<ReturnType<typeof getContextGraph>>["data"];
const tabs = ["Overview", "Financials", "Operations", "Valuation", "Peers", "ESG & Risk"];
const value = (n: number | null | undefined, suffix = "") => n == null ? "Unavailable" : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
const money = (n: number | null | undefined) => n == null ? "Unavailable" : `IDR ${new Intl.NumberFormat("en-US", { notation: Math.abs(n) >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 2 }).format(n)}`;

export default function CompanyPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = (params.ticker || "").toUpperCase();
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { let active = true;
    void getCompany(ticker).then(r => { if (active) setCompany(r.data); }).catch(e => { if (active) setError(e.message); });
    void getContextGraph(ticker).then(r => { if (active) setGraph(r.data); }).catch(() => {});
    return () => { active = false; };
  }, [ticker]);
  const context = { id: `company.${ticker}`, type: "company" as const, title: company?.name || ticker, entity: ticker, payload: { ticker, source_reference: company?.provenance.company_report } };
  const saveNote = async () => { if (!note.trim()) return; try { await saveResearchMemory({ kind: "note", title: `${ticker} research note`, content: note.trim(), metadata: { ticker, source_reference: company?.provenance.company_report } }); setSaved(true); setNote(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not save note"); } };
  return <AppShell chatPreset="company"><div className="page company-page"><div className="breadcrumbs"><Link href="/companies">Companies</Link> <span>›</span> {ticker}</div>
    {error && <p role="alert" className="lead">{error}</p>}
    {!company ? <p className="lead">{error ? "Company profile unavailable." : "Loading verified company profile…"}</p> : <>
      <section className="company-hero"><div className="company-hero-content"><div className="antm-logo">{ticker.slice(0, 4).toLowerCase()}</div><div><h1>{ticker}</h1><h2>{company.name}</h2><p>IDX: {ticker} <i/> {company.sector || "Sector unavailable"} <i/> {company.country}</p><div className="tag-row">{company.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div><div className="hero-price"><strong>{money(company.price)}</strong><span>As of {company.price_date || "date unavailable"}</span><small>Sectors company report</small></div></div></section>
      <div className="tabs">{tabs.map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
      {tab === "Overview" && <><div className="company-summary"><p>{company.name} is a Sectors-tracked listed company. This profile displays only verified fields returned by its company report and mining directory.</p><div><b>MARKET CAP<span>{money(company.market_cap)}</span></b><b>SHARES OUTSTANDING<span>{value(company.metrics.outstanding_shares)}</span></b><b>52W RANGE<span>{value(company.price_range_52w.low)} – {value(company.price_range_52w.high)}</span></b></div></div>
        <div className="company-metrics"><article className="analysis-card"><SectionHeader title="Share price history" subtitle="Actual Sectors daily close"/><strong>{money(company.price)}</strong><p>{company.price_date || "Date unavailable"}</p><MarketChart compact unit="IDR" series={company.price_history.map(x => ({ date: x.date, price: x.close }))}/></article>
          <article className="analysis-card"><SectionHeader title="Revenue" subtitle={`Annual financials · ${company.metrics.financial_year || "period unavailable"}`}/><strong>{money(company.metrics.revenue)}</strong><p>YoY growth: {value(company.metrics.revenue_growth_yoy, "%")}</p><FinancialBars history={company.financial_history} metric="revenue"/></article>
          <article className="analysis-card"><SectionHeader title="EBITDA" subtitle="Sectors annual financials"/><strong>{money(company.metrics.ebitda)}</strong><p>Margin: {value(company.metrics.ebitda_margin, "%")}</p><FinancialBars history={company.financial_history} metric="ebitda"/></article>
          <article className="analysis-card key-metrics"><SectionHeader title="Key metrics"/><ul><li>Net earnings <b>{money(company.metrics.earnings)}</b></li><li>ROE <b>{value(company.metrics.roe, "%")}</b></li><li>EPS <b>{value(company.metrics.eps)}</b></li><li>Employees <b>{value(company.employee_count)}</b></li></ul><AskHestraButton context={context} prompt={`Analyze the verified financial metrics for ${ticker}.`}/></article></div>
        <div className="company-lower"><section className="panel graph-panel"><SectionHeader title="Nickel Context Graph" subtitle="Relationships assembled from actual Sectors-backed fields."/>{graph && <ContextGraph graph={graph} ticker={ticker}/>}</section><section className="panel peer-panel"><SectionHeader title="Peer Comparison" action="Open Peers" onAction={() => setTab("Peers")}/><PeerTable company={company}/></section></div></>}
      {tab === "Financials" && <section className="panel" style={{ padding: 20 }}><SectionHeader title="Annual financial history" subtitle="Sectors historical financials; no projected values"/><table><thead><tr><th>Year</th><th>Revenue</th><th>EBITDA</th><th>Earnings</th><th>EBITDA margin</th></tr></thead><tbody>{company.financial_history.map(row => <tr key={row.year}><td>{row.year}</td><td>{money(row.revenue)}</td><td>{money(row.ebitda)}</td><td>{money(row.earnings)}</td><td>{value(row.ebitda_margin, "%")}</td></tr>)}</tbody></table>{!company.financial_history.length && <p>Financial history unavailable.</p>}<AskHestraButton context={context} prompt={`Explain ${ticker}'s actual financial history.`}/></section>}
      {tab === "Operations" && <section className="panel" style={{ padding: 20 }}><SectionHeader title="Mining operations" subtitle="Sectors mining directory and company details"/>{company.mining ? <><h3>{company.mining.name}</h3><p>Operation: {company.mining.operation || "Unavailable"} · Type: {company.mining.company_type || "Unavailable"}</p><p>Commodities: {company.mining.commodities.join(", ") || "Unavailable"}</p><p>Sites: {value(company.mining.site_count)} · Licenses: {value(company.mining.license_count)}</p><div className="saved-list">{company.mining.licenses?.map((license, i) => <article key={i}><strong>{license.activity || "Activity unavailable"}</strong><span>{license.commodity || "Commodity unavailable"}</span><span>{license.location || "Location unavailable"}</span><span>{license.expiry_date || "Expiry unavailable"}</span></article>)}</div></> : <p>Mining detail unavailable for this listed ticker. Production history is not supplied by the verified Sectors response.</p>}<AskHestraButton context={context} prompt={`What verified operational information is available for ${ticker}?`}/></section>}
      {tab === "Valuation" && <section className="panel" style={{ padding: 20 }}><SectionHeader title="Valuation" subtitle={`Sectors valuation data · ${company.valuation.year || "period unavailable"}`}/><div className="company-summary"><div><b>FORWARD P/E<span>{value(company.valuation.forward_pe)}</span></b><b>P/E<span>{value(company.valuation.pe)}</span></b><b>P/B<span>{value(company.valuation.pb)}</span></b><b>EV/EBITDA<span>{value(company.valuation.enterprise_to_ebitda)}</span></b><b>INTRINSIC VALUE<span>{money(company.valuation.intrinsic_value)}</span></b></div></div><AskHestraButton context={context} prompt={`Assess ${ticker}'s verified valuation metrics and caveats.`}/></section>}
      {tab === "Peers" && <section className="panel peer-panel" style={{ padding: 20 }}><SectionHeader title="Peer Comparison" subtitle="Sectors company peer report"/><PeerTable company={company}/><AskHestraButton context={context} prompt={`Compare ${ticker} with the available Sectors peer group.`}/></section>}
      {tab === "ESG & Risk" && <section className="panel" style={{ padding: 20 }}><SectionHeader title="ESG & Risk" subtitle="Only verified Sectors fields"/><p>ESG score: {value(company.esg_score)}</p><p>Detailed project risk and policy scenarios are unavailable from the current source.</p><AskHestraButton context={context} prompt={`Assess the available ESG evidence and unresolved risks for ${ticker}.`}/></section>}
      <section className="panel" style={{ padding: 20, marginTop: 20 }}><SectionHeader title="Research note" subtitle="Save your own observation to Research Memory"/><textarea value={note} onChange={event => { setNote(event.target.value); setSaved(false); }} placeholder={`Write a research note about ${ticker}…`} rows={3}/><button onClick={() => void saveNote()} disabled={!note.trim()}>Save note</button>{saved && <span> Saved to Research Memory.</span>}</section>
    </>}
  </div></AppShell>;
}
function PeerTable({ company }: { company: ApiCompany }) { return company.peers.length ? <table><thead><tr><th>Company</th><th>Market cap</th><th>P/E TTM</th><th>P/B MRQ</th><th>Revenue</th></tr></thead><tbody>{company.peers.map(peer => <tr key={peer.ticker}><td><Link href={`/companies/${peer.ticker}`}><StatusBadge>{peer.ticker}</StatusBadge> {peer.name}</Link></td><td>{money(peer.market_cap)}</td><td>{value(peer.pe_ttm)}</td><td>{value(peer.pb_mrq)}</td><td>{money(peer.revenue)}</td></tr>)}</tbody></table> : <p>Verified peer comparison unavailable.</p>; }
