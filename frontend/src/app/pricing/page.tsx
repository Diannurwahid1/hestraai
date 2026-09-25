"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/shared/brand";
import { hasSession, registrationStatus } from "@/services/auth";
import { createSandboxCheckout, getBillingStatus, startSandboxTrial, type SandboxSubscription } from "@/services/billing";

const plans = [
  { id: "trial", name: "Free Trial", price: "Rp0", cadence: "7 days", desc: "Explore the research workflow before choosing a plan.", features: ["Company intelligence", "Limited derived signals and memory", "3 trial AI investigations · BYOK"] },
  { id: "researcher", name: "Researcher", price: "Rp199k", cadence: "/ 30 days · sandbox", desc: "For focused independent nickel research.", features: ["Sectors-backed research workspace", "Derived signals and research memory", "Basic AI investigation · BYOK"] },
  { id: "analyst", name: "Analyst", price: "Rp399k", cadence: "/ 30 days · sandbox", desc: "For deeper comparison and contradiction checks.", features: ["Everything in Researcher", "Peer and contradiction analysis", "Advanced AI investigation · BYOK"], featured: true },
  { id: "team", name: "Team", price: "From Rp1.49m", cadence: "/ month · proposed", desc: "A future shared workspace for research teams.", features: ["Pooled data capacity · under calibration", "Shared research memory", "Team administration · planned"] },
] as const;

export default function PricingPage() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [subscription, setSubscription] = useState<SandboxSubscription | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setSignedIn(hasSession()); });
    void registrationStatus().then(result => { if (active) setRegistrationEnabled(result.data.enabled); }).catch(() => {});
    if (hasSession()) void getBillingStatus().then(result => { if (active) setSubscription(result.data.subscription); }).catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, []);

  const choose = async (plan: "trial" | "researcher" | "analyst") => {
    setError(""); setBusy(plan);
    try {
      if (plan === "trial") {
        const result = await startSandboxTrial();
        setSubscription(result.data);
      } else {
        const result = await createSandboxCheckout(plan);
        window.location.assign(result.data.payment_url);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sandbox checkout is unavailable"); }
    finally { setBusy(null); }
  };
  return <main className="pricing-page">
    <nav className="pricing-nav"><Brand href="/"/><Link href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Workspace" : "Sign in"} <ArrowRight size={15}/></Link></nav>
    <div className="pricing-intro"><p className="eyebrow">RESEARCH THAT FOLLOWS THE EVIDENCE</p><h1>Choose your research workspace.</h1>
      <p>Bring your own AI. Hestra provides the intelligence layer: Sectors-backed data, derived signals, investigation tools, and research memory. AI inference is billed by your chosen provider.</p>
      <span className="pricing-sandbox-label">SUMOPOD SANDBOX · NO REAL CHARGE · NO AUTOMATIC RENEWAL</span>
    </div>
    {subscription?.status && subscription.status !== "none" && <p className="pricing-current">Current sandbox access: <strong>{subscription.plan}</strong> · {subscription.status}{subscription.expires_at ? ` until ${new Date(subscription.expires_at).toLocaleDateString()}` : ""}</p>}
    {error && <p className="pricing-error" role="alert">{error}</p>}
    <div className="pricing-grid">{plans.map(plan => <article key={plan.id} className={"pricing-card" + ("featured" in plan && plan.featured ? " featured" : "")}>
      <div className="pricing-card-top"><span>{plan.name}</span>{"featured" in plan && plan.featured && <b>MOST COMPLETE</b>}</div><p>{plan.desc}</p>
      <div className="pricing-price"><strong>{plan.price}</strong><small>{plan.cadence}</small></div>
      {plan.id === "team" ? <button className="secondary-cta pricing-disabled" disabled>Not available in sandbox</button>
        : !signedIn ? <Link className="primary-cta" href="/login?next=%2Fpricing">Sign in to choose <ArrowRight size={16}/></Link>
        : <button className="primary-cta" type="button" disabled={Boolean(busy) || (plan.id === "trial" && Boolean(subscription?.trial_used))} onClick={() => void choose(plan.id)}>
          {busy === plan.id ? "Working…" : plan.id === "trial" ? subscription?.trial_used ? "Trial already used" : "Start 7-day trial" : `Open ${plan.name} sandbox checkout`} <ArrowRight size={16}/>
        </button>}
      <ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
    </article>)}</div>
    <div className="pricing-notes"><p><ShieldCheck size={16}/> Data Unit allowances are intentionally not final until real Sectors credit consumption and licensing are verified. The prices above are business hypotheses, not cost-based commitments. The sandbox payment page may add a QRIS gateway fee to the displayed plan price.</p>
      <p>Sandbox checkout issues a one-time 30-day test entitlement only after a verified SumoPod webhook. A return from the payment page does not confirm payment. Tier feature limits are not enforced yet. {registrationEnabled ? "New accounts can register." : "New registration is currently closed; existing members can sign in."}</p></div>
  </main>;
}
