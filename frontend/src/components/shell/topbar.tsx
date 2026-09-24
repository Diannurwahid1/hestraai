"use client";

import Link from "next/link";
import { Bot, CircleHelp, Menu, Radar, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { currentUser } from "@/services/auth";
import { useHestraChat } from "@/components/ai/chat-provider";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { setOpen } = useHestraChat();
  const [query, setQuery] = useState("");
  const user = currentUser();
  const search = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
  };
  const replayTour = () => {
    if (window.location.pathname === "/dashboard") window.dispatchEvent(new Event("hestra:tour"));
    else { sessionStorage.setItem("hestra.tour.replay", "1"); router.push("/dashboard"); }
  };
  return <header className="topbar">
    <button className="icon-button mobile-only" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>
    <form className="searchbox" onSubmit={search}><Search size={17} />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search nickel companies and signals" aria-label="Search companies and signals" />
      <button type="submit">Search</button>
    </form>
    <div className="topbar-actions">
      <button className="icon-button" onClick={replayTour} aria-label="Replay product tour" title="Product tour"><CircleHelp size={18}/></button>
      <Link className="icon-button" href="/discover?view=signals" aria-label="Browse latest research signals"><Radar size={18} /></Link>
      <button className="ai-mobile-button" onClick={() => setOpen(true)}><Bot size={17} /> Hestra</button>
      <span className="avatar">{user?.name?.slice(0, 2).toUpperCase() || "HA"}</span>
      <div className="desktop-only"><strong>{user?.name || "Research Analyst"}</strong><small>{user?.role || "Workspace"}</small></div>
    </div>
  </header>;
}
