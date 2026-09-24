"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, BarChart3, Check, CircleDollarSign, Factory, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AskHestraButton, SectionHeader, StatusBadge } from "@/components/shared/ui";
import { getInvestigation, explainInvestigation, Investigation } from "@/services/investigations";
import { captureSignal } from "@/services/research-memory";

const steps = ["Understand signal", "Gather evidence", "Analyze & correlate", "Test hypotheses", "Synthesize findings"];
const icons = [<Factory key="factory"/>, <BarChart3 key="bar"/>, <CircleDollarSign key="price"/>, <Scale key="peer"/>];
const labels: Record<string, string> = {
  revenue_growth_yoy: "Company revenue growth YoY",
  ebitda_margin_change_pp: "EBITDA margin change",
  company_ebitda_margin: "Company EBITDA margin",
  peer_ebitda_margin: "Peer EBITDA margin",
  nickel_price_change_yoy: "Nickel benchmark change YoY",
  nickel_annual_benchmark: "Annual nickel benchmark (US$/t)",
  peer_median_ebitda_margin: "Nickel peer median EBITDA margin",
  subsequent_ebitda_margin: "Subsequent EBITDA margin",
};

export default function InvestigatePage() {
  const { id } = useParams<{ id: string }>();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [explanation, setExplanation] = useState("AI explanation is loading…");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let active = true;
    void getInvestigation(id).then(result => {
      if (!active) return;
      setInvestigation(result.data);
      if (result.data.status === "resolved") {
        void explainInvestigation(id).then(answer => {
          if (active) setExplanation(answer.data.explanation || answer.data.reason || "Explanation unavailable.");
        }).catch(() => { if (active) setExplanation("AI explanation is unavailable. The sourced evidence and open questions remain below."); });
      }
    }).catch(() => { if (active) setExplanation("Investigation could not be loaded."); });
    return () => { active = false; };
  }, [id]);
  const signal = investigation?.signal;
  const evidence = investigation?.evidence || [];
  return <AppShell chatPreset="investigate"><div className="page investigate-page">
    <div className="breadcrumbs"><Link href="/dashboard#signals">← Back to Signals</Link></div>
    <h1>Investigate</h1><p className="lead">Follow Sectors facts through Hestra&apos;s derived signal and evidence.</p>
    <section className="investigate-hero"><div>
      <div className="signal-priority"><span>HESTRA SIGNAL</span><StatusBadge tone={signal?.severity === "high" ? "red" : "blue"}>{signal?.severity || "Unavailable"} severity</StatusBadge></div>
      <h2>{signal?.title || "Insufficient evidence"}</h2>
      <p>{signal?.summary || investigation?.reason || "Loading verified evidence…"}</p>
      <div className="tag-row"><span>{signal?.entity || "—"}</span><span>{signal?.period || "—"}</span><span>{signal?.confidence_label || "—"} confidence</span></div>
    </div>{signal && <div><AskHestraButton prompt={`Investigate ${signal.type.replaceAll("_", " ")} for ${signal.entity} using attached evidence.`}
      context={{ id: `signal.${signal.signal_id}`, type: "investigation", title: signal.title, entity: signal.entity,
        subtitle: signal.period, payload: { signal_id: signal.signal_id, evidence, unresolved: investigation?.unresolved } }}/><button className="ask-button" disabled={saved} onClick={() => void captureSignal(signal.signal_id, "investigation").then(() => setSaved(true)).catch(e => setSaveError(e.message))}>{saved ? "Saved to Memory" : "Save Investigation"}</button>{saveError && <small role="alert">{saveError}</small>}</div>}</section>
    <div className="stepper">{steps.map((step, i) => <div className={`${i < 2 ? "done" : ""} ${i === 2 ? "active" : ""}`} key={step}><span>{i < 2 ? <Check/> : i + 1}</span><p>{step}</p></div>)}</div>
    <section><SectionHeader title="Evidence Analysis" subtitle="Each datapoint links to its Sectors field and reporting period."/>
      {evidence.length === 0 && <div className="panel" style={{ padding: 18 }}>Insufficient evidence: {investigation?.reason || "Loading…"}</div>}
      <div className="evidence-grid">{evidence.map((item, i) => <article className="evidence-card" key={`${item.metric}-${i}`}>
        <div className="evidence-title"><span>{icons[i % icons.length]}</span><div><strong>{labels[item.metric] || item.metric.replaceAll("_", " ")}</strong><small>{item.period}</small></div></div>
        <div className="evidence-value"><b>{item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}{item.metric.includes("margin") || item.metric.includes("growth") || item.metric.includes("change") ? item.metric.endsWith("_pp") ? "pp" : "%" : ""}</b></div>
        <small>Source: {item.source} · {item.source_type}</small>
        <small style={{ overflowWrap: "anywhere", marginTop: 8 }}>{item.source_reference}</small>
        {item.inputs && <details><summary>View calculation</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 10 }}>{JSON.stringify(item.inputs, null, 2)}</pre></details>}
      </article>)}</div>
    </section>
    <div className="findings-grid">
      <section className="finding hypothesis"><div><span className="finding-icon">◉</span><h2>Hypothesis &amp; explanation</h2><StatusBadge tone="blue">{signal?.confidence_label || "unresolved"} confidence</StatusBadge></div>
        <p>{investigation?.hypothesis || investigation?.reason || "Waiting for evidence…"}</p>
        {investigation?.status === "resolved" && <p>{explanation}</p>}
        <ul>{(investigation?.supporting || []).map((item, i) => <li key={i}><Check/>{item.statement}</li>)}</ul>
        {signal?.caveat && <p>{signal.caveat}</p>}
      </section>
      <section className="finding contradictions"><div><AlertTriangle/><h2>Contradictions &amp; Open Questions</h2><StatusBadge tone="red">{(investigation?.contradictions.length || 0) + (investigation?.unresolved.length || 0)} items</StatusBadge></div>
        <ol>{[...(investigation?.contradictions.map(x => x.statement) || []), ...(investigation?.unresolved || [])].map((item, i) => <li key={i}><span>{i + 1}</span>{item}</li>)}</ol>
      </section>
    </div>
  </div></AppShell>;
}
