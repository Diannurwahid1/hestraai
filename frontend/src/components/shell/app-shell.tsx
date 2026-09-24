"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { HestraChat } from "@/components/ai/hestra-chat";
import { ChatProvider } from "@/components/ai/chat-provider";
import { hasSession, verifySession } from "@/services/auth";
import { getOnboarding, type ResearchProfile } from "@/services/onboarding";
import { ProductTour } from "./product-tour";

export function AppShell({ children, chatPreset = "dashboard" }: { children: React.ReactNode; chatPreset?: "dashboard" | "company" | "investigate" | "memory" }) {
  const [menu, setMenu] = useState(false);
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState<ResearchProfile | null>(null);
  const router = useRouter();
  useEffect(() => {
    const unauthorized = () => router.replace("/login");
    window.addEventListener("hestra:unauthorized", unauthorized);
    if (!hasSession()) router.replace("/login");
    else void verifySession().then(() => getOnboarding()).then(result => {
      if (!result.data.profile) router.replace("/onboarding");
      else { setProfile(result.data.profile); setVerified(true); }
    }).catch(() => router.replace("/login"));
    return () => window.removeEventListener("hestra:unauthorized", unauthorized);
  }, [router]);
  if (!verified) return <div className="page">Checking your session…</div>;
  return <ChatProvider><div className="app-shell"><Sidebar open={menu} close={() => setMenu(false)} /><div className="workspace"><Topbar onMenu={() => setMenu(true)} /><main>{children}</main></div><HestraChat preset={chatPreset} />{profile && <ProductTour profile={profile} />}{menu && <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close menu" />}</div></ChatProvider>;
}
