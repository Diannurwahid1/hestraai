"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, GraduationCap, Radar, Target } from "lucide-react";
import { Brand } from "@/components/shared/brand";
import { currentUser, hasSession } from "@/services/auth";
import { getOnboarding, saveOnboarding, type OnboardingInput, type Plan, type ResearchLevel } from "@/services/onboarding";

const planNames: Record<Plan, string> = { explorer: "Explorer", analyst: "Analyst", team: "Team" };
const levels: { id: ResearchLevel; title: string; desc: string }[] = [
  { id: "beginner", title: "Getting started", desc: "Explain terms and show how to read evidence." },
  { id: "intermediate", title: "Practicing analyst", desc: "Balance interpretation with concise context." },
  { id: "advanced", title: "Experienced analyst", desc: "Focus on assumptions, tradeoffs, and contradictions." },
];
const tickers = ["ANTM", "INCO", "NCKL", "MBMA", "NICL"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<OnboardingInput>({ name: "", plan: "explorer", level: "intermediate", role: "Research Analyst", focus_tickers: [], research_goal: "", language: "English" });
  useEffect(() => {
    if (!hasSession()) { router.replace("/login?mode=register"); return; }
    const requested = new URLSearchParams(window.location.search).get("plan");
    void getOnboarding().then(({ data }) => setForm(previous => ({ ...previous,
      name: data.user.name || currentUser()?.name || "",
      ...(data.profile ? { ...data.profile, name: data.user.name } : {}),
      plan: requested && requested in planNames ? requested as Plan : data.profile?.plan || "explorer",
    }))).catch(cause => setError(cause instanceof Error ? cause.message : "Could not load profile"));
  }, [router]);
  const update = <K extends keyof OnboardingInput>(key: K, value: OnboardingInput[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const toggleTicker = (ticker: string) => update("focus_tickers", form.focus_tickers.includes(ticker)
    ? form.focus_tickers.filter(item => item !== ticker) : [...form.focus_tickers, ticker]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (step < 2) { setStep(value => value + 1); return; }
    setBusy(true);
    try {
      const result = await saveOnboarding(form);
      localStorage.setItem("hestra.auth.user", JSON.stringify(result.data.user));
      router.replace("/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save profile"); }
    finally { setBusy(false); }
  };
  return <main className="onboarding-page"><header className="onboarding-head"><Brand href="/"/><span>RESEARCH SETUP · {step + 1} OF 3</span></header>
    <div className="onboarding-progress" aria-label={`Step ${step + 1} of 3`}>{[0, 1, 2].map(index => <i key={index} className={index <= step ? "active" : ""}/>)}</div>
    <form className="onboarding-card" onSubmit={submit}>
      {step === 0 && <><span className="onboarding-icon"><Target/></span><p className="eyebrow">YOUR WORKSPACE</p><h1>Make Hestra yours.</h1><p className="onboarding-intro">Your choice helps tailor the workspace. Plans are demo previews and do not create a subscription.</p>
        <label>Your name<input value={form.name} onChange={event => update("name", event.target.value)} minLength={2} maxLength={160} required placeholder="Your full name"/></label>
        <label>Your role<input value={form.role} onChange={event => update("role", event.target.value)} minLength={2} maxLength={80} required placeholder="Research Analyst"/></label>
        <div className="onboarding-plan"><span>Selected demo plan</span><strong>{planNames[form.plan]}</strong><Link href="/pricing">Change plan</Link></div>
      </>}
      {step === 1 && <><span className="onboarding-icon"><GraduationCap/></span><p className="eyebrow">HOW YOU RESEARCH</p><h1>What is your research level?</h1><p className="onboarding-intro">Hestra uses this to adjust explanation depth. You can change it later.</p>
        <div className="onboarding-options">{levels.map(level => <button type="button" key={level.id} className={form.level === level.id ? "selected" : ""} onClick={() => update("level", level.id)}><span><strong>{level.title}</strong><small>{level.desc}</small></span>{form.level === level.id && <Check size={18}/>}</button>)}</div>
        <label>Response language<select value={form.language} onChange={event => update("language", event.target.value as OnboardingInput["language"])}><option>English</option><option>Bahasa Indonesia</option></select></label>
      </>}
      {step === 2 && <><span className="onboarding-icon"><Radar/></span><p className="eyebrow">RESEARCH FOCUS</p><h1>What are you following?</h1><p className="onboarding-intro">Choose companies you care about and tell Hestra what you want to understand.</p>
        <div className="onboarding-label">Focus companies <small>optional · verified nickel universe</small></div>
        <div className="onboarding-tickers">{tickers.map(ticker => <button type="button" key={ticker} className={form.focus_tickers.includes(ticker) ? "selected" : ""} onClick={() => toggleTicker(ticker)}>{ticker}</button>)}</div>
        <label>What is your main research goal?<textarea value={form.research_goal} onChange={event => update("research_goal", event.target.value)} minLength={3} maxLength={500} required placeholder="For example: understand margin changes and compare nickel peers."/></label>
        <p className="onboarding-footnote">Next, a short guided tour will introduce the dashboard, signals, research memory, and AI chat.</p>
      </>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="onboarding-actions">{step > 0 ? <button type="button" className="secondary-cta" onClick={() => setStep(value => value - 1)}><ChevronLeft size={16}/> Back</button> : <span/>}
        <button className="primary-cta" disabled={busy}>{busy ? "Saving…" : step === 2 ? "Enter workspace" : "Continue"}<ArrowRight size={17}/></button></div>
    </form>
  </main>;
}
