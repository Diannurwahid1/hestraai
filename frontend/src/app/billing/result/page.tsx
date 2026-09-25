"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand } from "@/components/shared/brand";
import { hasSession } from "@/services/auth";
import { getSandboxOrder, type SandboxPayment } from "@/services/billing";

export default function BillingResultPage() {
  const [payment, setPayment] = useState<SandboxPayment | null>(null);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    const requested = new URLSearchParams(window.location.search).get("order_id") || "";
    queueMicrotask(() => { if (active) { setOrderId(requested); setSignedIn(hasSession()); } });
    if (!hasSession() || !requested) return () => { active = false; };
    const refresh = () => void getSandboxOrder(requested).then(result => { if (active) setPayment(result.data); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not check payment status"); });
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <main className="billing-result-page"><div className="billing-result-card"><Brand href="/"/>
    <p className="eyebrow">SUMOPOD SANDBOX</p><h1>Checkout status</h1>
    {!signedIn ? <p>Sign in to view your sandbox payment status.</p>
      : !orderId ? <p>No sandbox order ID was supplied.</p>
      : error ? <p role="alert" className="form-error">{error}</p>
      : !orderId || !payment ? <p>Checking verified payment status…</p>
      : <><p>Order <strong>{payment.order_id}</strong></p><p>Payment: <strong>{payment.status}</strong></p>
          {payment.status === "completed" ? <p>Your 30-day sandbox entitlement is active.</p>
            : <p>Only a verified SumoPod webhook can activate access. Returning here does not confirm payment; this page checks again automatically.</p>}</>}
    <div className="billing-result-actions"><Link href="/pricing">View pricing</Link><Link href="/dashboard">Open workspace</Link></div>
  </div></main>;
}
