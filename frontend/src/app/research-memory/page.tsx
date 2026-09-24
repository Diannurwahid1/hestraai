"use client";

import Link from "next/link";
import { Bookmark, FileText, FlaskConical, NotebookPen } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AskHestraButton, MetricCard, SectionHeader, StatusBadge } from "@/components/shared/ui";
import { deleteResearchMemory, getResearchMemory, MemoryKind, MemoryRecord, saveResearchMemory, updateResearchMemory } from "@/services/research-memory";

const kinds: MemoryKind[] = ["thesis", "assumption", "note", "investigation", "bookmark"];
const emptyCounts = { thesis: 0, assumption: 0, note: 0, investigation: 0, bookmark: 0 };
export default function ResearchMemoryPage() {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [filter, setFilter] = useState<MemoryKind | "all">("all");
  const [kind, setKind] = useState<MemoryKind>("thesis");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => { const result = await getResearchMemory(); setRecords(result.data.records); setCounts(result.data.counts); };
  useEffect(() => { void getResearchMemory().then(result => { setRecords(result.data.records); setCounts(result.data.counts); }).catch(e => setError(e.message)); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!title.trim()) return; setBusy(true); setError("");
    try { if (editing) await updateResearchMemory(editing, { title: title.trim(), content }); else await saveResearchMemory({ kind, title: title.trim(), content }); setTitle(""); setContent(""); setEditing(null); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save record"); } finally { setBusy(false); }
  };
  const edit = (record: MemoryRecord) => { setEditing(record.id); setKind(record.kind); setTitle(record.title); setContent(record.content); document.getElementById("memory-editor")?.scrollIntoView({ behavior: "smooth" }); };
  const remove = async (record: MemoryRecord) => { if (!window.confirm(`Delete “${record.title}”?`)) return; try { await deleteResearchMemory(record.id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete record"); } };
  const visible = filter === "all" ? records : records.filter(item => item.kind === filter);
  return <AppShell chatPreset="memory"><div className="page memory-page"><div className="eyebrow">RESEARCH MEMORY · PRIVATE WORKSPACE</div><h1>Your Research, Remembered</h1><p className="lead">Your own theses, assumptions, notes, and verified saved investigations. Nothing here is prefilled with claims.</p>
    {error && <p role="alert">{error}</p>}
    <div className="metric-grid memory-stats"><MetricCard icon={<FileText/>} label="Saved Theses" value={String(counts.thesis)} change="Your records"/><MetricCard icon={<FlaskConical/>} label="Investigations" value={String(counts.investigation)} change="Verified captures"/><MetricCard icon={<Bookmark/>} label="Bookmarked Signals" value={String(counts.bookmark)} change="Verified captures"/><MetricCard icon={<NotebookPen/>} label="Notes & Assumptions" value={String(counts.note + counts.assumption)} change="Your records"/></div>
    <section id="memory-editor" className="panel" style={{ padding: 20, marginBottom: 20 }}><SectionHeader title={editing ? "Edit research record" : "Add research record"} subtitle="Theses and assumptions are user-authored; signal captures preserve source evidence."/>
      <form onSubmit={submit} className="memory-form"><select value={kind} disabled={!!editing} onChange={e => setKind(e.target.value as MemoryKind)}>{kinds.filter(item => item !== "investigation" && item !== "bookmark").map(item => <option key={item} value={item}>{item}</option>)}</select><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" minLength={2} maxLength={240} required/><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your research and its supporting evidence…" rows={5}/><div><button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add to memory"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setTitle(""); setContent(""); }}>Cancel</button>}</div></form>
    </section>
    <section className="panel" style={{ padding: 20 }}><SectionHeader title="All research" subtitle={`${visible.length} records`} action="Explore signals" actionHref="/discover?view=signals"/><div className="tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>{kinds.map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item} ({counts[item]})</button>)}</div>
      {!visible.length && <p>No records yet. Add a research note or save a verified signal.</p>}
      <div className="memory-records">{visible.map(record => <article className="panel" key={record.id} style={{ padding: 18, marginTop: 14 }}><div className="signal-meta"><StatusBadge>{record.kind}</StatusBadge><span>{record.updated_at?.slice(0, 10) || "Date unavailable"}</span></div><h3>{record.title}</h3><p>{record.content}</p>{typeof record.metadata?.signal_id === "string" && <p><Link href={`/investigate/${record.metadata.signal_id}`}>View source evidence →</Link></p>}{typeof record.metadata?.entity === "string" && <p><Link href={`/companies/${record.metadata.entity}`}>Open {String(record.metadata.entity)} →</Link></p>}
        {record.kind === "thesis" || record.kind === "assumption" ? <AskHestraButton context={{ id: `memory.${record.id}`, type: "thesis", title: record.title, payload: { user_authored: true, content: record.content } }} prompt={`Stress-test my ${record.kind}: ${record.title}. Use verified data and identify missing evidence.`}/> : null}
        <div className="memory-actions"><button onClick={() => edit(record)}>Edit</button><button onClick={() => void remove(record)}>Delete</button></div></article>)}</div>
    </section></div></AppShell>;
}
