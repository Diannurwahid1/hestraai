"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import type { ResearchProfile } from "@/services/onboarding";
import { completeTour } from "@/services/onboarding";

export function ProductTour({ profile }: { profile: ResearchProfile }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/dashboard") return;
    let active = true;
    let running = false;
    let activeDriver: ReturnType<typeof driver> | null = null;
    const start = () => {
      if (!active || running || !document.querySelector(".metric-grid")) return;
      running = true;
      const mobile = window.innerWidth <= 1200;
      const steps = [
        { element: ".dashboard-page > h1", popover: { title: "Your research workspace", description: "Start with a snapshot of Indonesia's nickel market. Figures here come from connected data and may show unavailable when evidence is missing." } },
        { element: ".metric-grid", popover: { title: "Market facts", description: "These cards summarize the latest sourced benchmarks and company data." } },
        { element: ".feed", popover: { title: "Research signals", description: "Hestra calculates divergences from verified metrics. Open a signal to inspect the calculation and its sources." } },
        { element: ".dashboard-lower", popover: { title: "Companies and market history", description: "Explore listed companies and the nickel benchmark chart. Open a company for financial history and peers." } },
        { element: ".searchbox", popover: { title: "Discover", description: "Search the company directory and signals from here." } },
        mobile
          ? { element: ".ai-mobile-button", popover: { title: "Ask Hestra", description: "Open the research assistant to ask questions. Attach a company or signal first for evidence-backed answers." } }
          : { element: ".chat-panel", popover: { title: "Ask Hestra", description: "Ask about attached evidence here. Research cards and charts in the answer use verified source data." } },
        { element: ".topbar-actions", popover: { title: "Continue exploring", description: "Use the sidebar for investigations, research memory, and model settings. Replay this tour anytime from the guide button." } },
      ];
      const instance = driver({
        showProgress: true, allowClose: true, animate: true, popoverClass: "hestra-tour",
        nextBtnText: "Next", prevBtnText: "Back", doneBtnText: "Finish",
        steps,
        onDoneClick: () => { void completeTour().catch(() => {}); instance.destroy(); },
        onCloseClick: () => { void completeTour().catch(() => {}); instance.destroy(); },
        onDestroyed: () => { running = false; },
      });
      activeDriver = instance;
      instance.drive();
    };
    const replayRequested = sessionStorage.getItem("hestra.tour.replay") === "1";
    const timer = window.setTimeout(() => {
      if (replayRequested) sessionStorage.removeItem("hestra.tour.replay");
      if (!profile.tour_completed || replayRequested) start();
    }, 700);
    window.addEventListener("hestra:tour", start);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener("hestra:tour", start); activeDriver?.destroy(); };
  }, [pathname, profile.tour_completed]);
  return null;
}
