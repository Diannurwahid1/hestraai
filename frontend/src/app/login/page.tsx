"use client";

import Image from "next/image";
import { ArrowRight, BarChart3, Eye, EyeOff, Layers3, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { hasSession, login, register, saveSession, verifySession } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState<boolean | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => { if (new URLSearchParams(window.location.search).get("mode") === "register") setMode("register"); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!hasSession()) { setCheckingSession(false); return; }
      setCheckingSession(true);
      void verifySession()
        .then(() => { if (active) router.replace("/dashboard"); })
        .catch(() => { if (active) setCheckingSession(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [router]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = mode === "login" ? await login(email, password) : await register(name, email, password);
      saveSession(result.data.token, result.data.user);
      const selectedPlan = new URLSearchParams(window.location.search).get("plan");
      router.replace(mode === "register" || selectedPlan ? `/onboarding${selectedPlan ? `?plan=${encodeURIComponent(selectedPlan)}` : ""}` : "/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally { setBusy(false); }
  };
  if (checkingSession !== false) return <main className="login-session-check"><Brand /><p>Restoring your Hestra workspace…</p><span className="session-loader" aria-hidden="true" /></main>;
  return <main className="login-page"><section className="login-visual"><div className="grid-bg"/>
    <div className="login-kicker">CRITICAL MINERALS<br/>BRIGHTER TOMORROWS</div>
    <div className="nickel-tile"><b>28</b><strong>Ni</strong><span>NICKEL</span></div>
    <div className="energy-ring"/><Image src="/hestra-robot.png" alt="Hestra humanoid research assistant" fill priority sizes="60vw" className="login-robot"/>
    <div className="login-copy"><h1>Intelligence for<br/>Indonesia&apos;s Nickel Market</h1>
      <p>Evidence you can trace. Research you can keep.</p>
      <div className="login-features"><span><BarChart3/> Market<br/>Intelligence</span><span><Layers3/> Company<br/>Research</span><span><ShieldCheck/> Source<br/>Provenance</span></div>
    </div></section>
    <section className="login-form-side"><div className="login-top-note">BUILT FOR A CLEANER, STRONGER INDONESIA <i/></div>
      <form className="login-card" onSubmit={submit}><Brand/><div className="login-fields">
        {mode === "register" && <label>Your name<div><input value={name} onChange={e => setName(e.target.value)} required minLength={2} placeholder="Research analyst"/></div></label>}
        <label>Email address<div><Mail/><input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@company.com"/></div></label>
        <label>Password<div><LockKeyhole/><input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required minLength={mode === "register" ? 10 : 1}/>
          <button type="button" className="icon-button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>
        {mode === "register" && <small>Use at least 10 characters.</small>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="sign-in" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign In" : "Create Account"} <ArrowRight/></button>
        <button type="button" className="text-action" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Create a research account" : "Already have an account? Sign in"}
        </button>
      </div></form><div className="login-bottom-note">NICKEL POWERS<br/>POSSIBILITIES <i/></div>
    </section>
  </main>;
}
