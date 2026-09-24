"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, ChartNoAxesCombined, FlaskConical, LayoutDashboard, Radar, Search, Settings, X } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { currentUser } from "@/services/auth";

const nav = [
  ["Dashboard", "/dashboard", LayoutDashboard], ["Discover", "/discover", Search],
  ["Companies", "/companies", Building2],
  ["Investigate", "/investigate", FlaskConical], ["Signals", "/discover?view=signals", Radar],
  ["Research Memory", "/research-memory", ChartNoAxesCombined], ["Settings", "/settings", Settings],
] as const;

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const user = currentUser();
  return <aside className={`sidebar ${open ? "mobile-open" : ""}`}>
    <div className="sidebar-head"><div className="sidebar-brand-stack"><Brand /><div className="sectors-credit" aria-label="Supported by Sectors.app"><Image className="sectors-logo" src="/sectors_logo.svg" alt="Sectors" width={23} height={23} /><span>SUPPORTED BY <strong>sectors.app</strong></span></div></div><button className="mobile-only icon-button" onClick={close} aria-label="Close menu"><X size={18} /></button></div>
    <nav>{nav.map(([label, href, Icon]) => {
      const active = href.startsWith("/discover") ? pathname === "/discover" && (href === "/discover" ? !params.get("view") : params.get("view") === href.split("view=")[1])
        : href === "/investigate" ? pathname.startsWith("/investigate") : href === "/dashboard" ? pathname === href : pathname.startsWith(href);
      return <Link key={label} href={href} onClick={close} className={active ? "active" : ""}><Icon size={19} /><span>{label}</span></Link>;
    })}</nav>
    <div className="sidebar-art"><Image src="/hestra-robot.png" alt="" fill sizes="230px" priority /><span>CRITICAL MINERALS<br />BRIGHTER TOMORROWS</span></div>
    <div className="profile"><span>{user?.name?.slice(0, 2).toUpperCase() || "HA"}</span><div><strong>{user?.name || "Research Analyst"}</strong><small>{user?.email || "Workspace"}</small></div></div>
  </aside>;
}
