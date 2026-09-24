"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader, StatusBadge } from "@/components/shared/ui";
import { discoverSignals } from "@/services/discover";
import { getResearchMemory, MemoryRecord } from "@/services/research-memory";
import { Signal } from "@/types";

export default function InvestigationIndex() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [saved, setSaved] = useState<MemoryRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void Promise.all([discoverSignals("", 0, 100), getResearchMemory()]).then(([s, m]) => { setSignals(s.data.signals); setSaved(m.data.records.filter(record => record.kind === "investigation")); }).catch(e => setError(e.message)); }, []);
  return <AppShell><div className="page"><div className="eyebrow">INVESTIGATE</div><h1>Evidence-led investigations</h1><p className="lead">Open a verified signal to trace its calculation, source fields, hypotheses, and unresolved questions.</p>
    {error && <p role="alert">{error}</p>}
    <section className="panel" style={{ padding: 20 }}><SectionHeader title="Available investigations" subtitle="Derived from currently available Sectors facts" action="Discover signals" actionHref="/discover?view=signals"/>
      {!signals.length && !error && <p>No signals currently meet the verified thresholds.</p>}
      <div className="saved-list">{signals.map(signal => <Link key={signal.signal_id || signal.id} href={`/investigate/${signal.investigation_id || signal.signal_id || signal.id}`}><strong>{signal.title}</strong><StatusBadge>{signal.entity || signal.ticker}</StatusBadge><span>{signal.period}</span><span>View evidence →</span></Link>)}</div></section>
    <section className="panel" style={{ padding: 20, marginTop: 20 }}><SectionHeader title="Saved investigations" action="Research Memory" actionHref="/research-memory"/>
      {!saved.length && <p>No saved investigations yet.</p>}<div className="saved-list">{saved.map(item => <Link key={item.id} href={`/investigate/${item.metadata.signal_id}`}><strong>{item.title}</strong><span>{item.updated_at?.slice(0, 10)}</span></Link>)}</div></section>
  </div></AppShell>;
}
