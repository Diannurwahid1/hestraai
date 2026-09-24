"use client";

import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SectionHeader } from "@/components/shared/ui";
import { discoverCompanies, type DirectoryCompany } from "@/services/discover";

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [operation, setOperation] = useState("");
  const [companies, setCompanies] = useState<DirectoryCompany[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true); setError("");
    void discoverCompanies(submitted, operation).then(result => { setCompanies(result.data.companies); setOperations(result.data.operations); })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Company directory unavailable"))
      .finally(() => setLoading(false));
  }, [submitted, operation]);
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted(query.trim()); };
  return <AppShell><div className="page companies-page"><div className="eyebrow">COMPANIES · VERIFIED NICKEL UNIVERSE</div><h1>Company directory</h1><p className="lead">Browse Sectors-backed mining companies and open a full research profile.</p>
    <section className="panel companies-directory"><SectionHeader title="Indonesia nickel companies" subtitle={loading ? "Loading verified records…" : `${companies.length} companies shown`} />
      <form className="company-directory-search" onSubmit={submit}><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search company, ticker, or operation…" aria-label="Search companies"/><button>Search</button><select value={operation} onChange={event => setOperation(event.target.value)} aria-label="Filter by operation"><option value="">All operations</option>{operations.map(item => <option key={item} value={item}>{item}</option>)}</select></form>
      {error && <p role="alert" className="lead">{error}</p>}
      {!loading && !error && !companies.length && <p className="company-empty">No verified company matches this search.</p>}
      <div className="company-directory-list">{companies.map(company => <article key={company.slug} className="company-directory-row"><span className="company-symbol"><Building2 size={17}/></span><div><strong>{company.name}<small>{company.ticker || "Directory company"}</small></strong><p>{company.operation || company.company_type || "Nickel operation"}</p></div><div className="result-tags">{company.commodities.slice(0, 3).map(item => <em key={item}>{item}</em>)}</div>{company.ticker ? <Link href={`/companies/${company.ticker}`}>Open profile →</Link> : <span className="unlisted">No listed ticker</span>}</article>)}</div>
    </section></div></AppShell>;
}
