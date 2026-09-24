"use client";

import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/shared/brand";
import { registrationStatus } from "@/services/auth";

const plans = [
  { id: "explorer", name: "Explorer", price: "Rp0", cadence: "demo access", desc: "A starting point for a focused nickel research workflow.", features: ["Company and market workspace", "Traceable signals", "Research memory"] },
  { id: "analyst", name: "Analyst", price: "Rp149k", cadence: "/ month · illustrative", desc: "For analysts who investigate and compare evidence every day.", features: ["Everything in Explorer", "AI investigation workspace", "Evidence and usage history"], featured: true },
  { id: "team", name: "Team", price: "Custom", cadence: "illustrative", desc: "A future shared research workflow for investment teams.", features: ["Everything in Analyst", "Team research workflow preview", "Priority product feedback"] },
] as const;

export default function PricingPage() {
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    void registrationStatus().then(result => { if (active) setRegistrationEnabled(result.data.enabled); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <main className="pricing-page">
    <nav className="pricing-nav"><Brand href="/"/><Link href="/login">Sign in <ArrowRight size={15}/></Link></nav>
    <div className="pricing-intro"><p className="eyebrow">CHOOSE YOUR RESEARCH WORKSPACE</p><h1>Start with the way you research.</h1>
      <p>{registrationEnabled ? "Choose a plan to personalize onboarding. " : "New registrations are currently closed. Existing members can sign in. "}These prices and tiers are a product preview; no payment is collected and choosing a plan does not enable billing.</p></div>
    <div className="pricing-grid">{plans.map(plan => <article key={plan.id} className={plan.id === "analyst" ? "pricing-card featured" : "pricing-card"}>
      <div className="pricing-card-top"><span>{plan.name}</span>{plan.id === "analyst" && <b>POPULAR PREVIEW</b>}</div><p>{plan.desc}</p>
      <div className="pricing-price"><strong>{plan.price}</strong><small>{plan.cadence}</small></div>
      <Link className="primary-cta" href={registrationEnabled ? `/login?mode=register&plan=${plan.id}` : "/login"}>{registrationEnabled ? `Choose ${plan.name}` : "Sign in"} <ArrowRight size={16}/></Link>
      <ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
    </article>)}</div>
    <p className="pricing-disclosure"><ShieldCheck size={16}/> Demo selection only. No card, charge, subscription, or automatic renewal.</p>
  </main>;
}
