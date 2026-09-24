"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FinancialYear } from "@/services/companies";

export function MarketChart({ series, compact = false, unit = "US$/t" }: { series: { date: string; price: number }[]; compact?: boolean; unit?: string }) {
  if (!series.length) return <div className="chart-empty">Price history unavailable from Sectors.</div>;
  const data = series.map(item => ({ d: item.date.slice(0, 10), v: item.price }));
  return <div className={compact ? "chart compact" : "chart"}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b5cff" stopOpacity={.48}/><stop offset="1" stopColor="#0b5cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#15202a" vertical={false}/><XAxis dataKey="d" tick={{ fill: "#738293", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20}/><YAxis hide={compact} tick={{ fill: "#738293", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]}/><Tooltip contentStyle={{ background: "#0b1117", border: "1px solid #263442", borderRadius: 8 }} formatter={v => [`${Number(v).toLocaleString()} ${unit}`, "Price"]}/><Area isAnimationActive={false} type="monotone" dataKey="v" stroke="#2684ff" strokeWidth={2.5} fill="url(#marketFill)" /></AreaChart></ResponsiveContainer></div>;
}

export function FinancialBars({ history, metric }: { history: FinancialYear[]; metric: "revenue" | "ebitda" | "earnings" }) {
  const data = history.filter(item => item[metric] != null).map(item => ({ y: String(item.year), v: item[metric] }));
  if (!data.length) return <div className="chart-empty">Financial history unavailable from Sectors.</div>;
  return <div className="chart compact"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><XAxis dataKey="y" tick={{ fill: "#748394", fontSize: 9 }} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: "rgba(11,92,255,.08)" }} contentStyle={{ background: "#0b1117", border: "1px solid #263442", borderRadius: 8 }}/><Bar isAnimationActive={false} dataKey="v" fill="#2078ef" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer></div>;
}
