import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  DatabaseZap,
  LineChart,
  Pickaxe,
  Radar,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { HeroRobot3D } from "@/components/landing/hero-robot-3d";
import { LandingCursor } from "@/components/landing/landing-cursor";

const signals = [
  ["Operational / Financial Divergence", "Detects when company activity improves while profitability weakens."],
  ["Peer Divergence", "Compares each issuer against verified nickel peers and median benchmarks."],
  ["Commodity / Financial Divergence", "Connects market conditions with company-level financial behavior."],
];

const workflow = [
  ["01", "Sectors Data", "Company, peer, commodity, price, and mining-linked datasets."],
  ["02", "Signal Engine", "Deterministic calculations turn raw facts into traceable research signals."],
  ["03", "Investigation", "Hestra assembles evidence, contradictions, and unresolved questions."],
  ["04", "AI Synthesis", "The model explains findings from compact evidence, not fabricated data."],
];

export default function Home() {
  return (
    <main className="landing-page">
      <LandingCursor />
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link href="/" className="brand landing-brand" aria-label="Hestra AI home">
          <span className="brand-mark" aria-hidden="true"><i /><b /></span>
          <span><strong>HESTRA <em>AI</em></strong><small>Adaptive Nickel Intelligence</small></span>
        </Link>
        <div>
          <Link href="#platform">Platform</Link>
          <Link href="#signals">Signals</Link>
          <Link href="#workflow">Workflow</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <Link className="landing-login" href="/login">Sign In <ArrowRight /></Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">INDONESIA NICKEL RESEARCH WORKSPACE</p>
          <h1>Evidence-backed market intelligence for critical minerals.</h1>
          <p>
            Hestra AI turns Sectors-backed company data into deterministic research
            signals, then helps analysts investigate what changed, what contradicts
            the thesis, and what remains unresolved.
          </p>
          <div className="landing-actions">
            <Link className="primary-cta" href="/pricing">Start Researching <ArrowRight /></Link>
            <Link className="secondary-cta" href="#workflow">See Workflow</Link>
          </div>
          <div className="landing-proof">
            <span><b>52</b> Nickel directory entries</span>
            <span><b>3</b> Core divergence signals</span>
            <span><b>100%</b> Provenance-first analysis</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="Hestra research interface preview">
          <div className="landing-orbit" />
          <HeroRobot3D />
          <div className="landing-terminal">
            <span>LIVE SIGNAL</span>
            <h2>Operational / Financial Divergence</h2>
            <p>Revenue trend and margin behavior moved in opposite directions.</p>
            <div><i /> Evidence coverage: medium</div>
          </div>
          <div className="landing-data-card">
            <DatabaseZap />
            <span>Sectors-backed facts</span>
          </div>
        </div>
      </section>

      <section className="landing-strip" id="platform">
        <article>
          <Radar />
          <h2>Research Signals</h2>
          <p>Deterministic rules identify unusual company, peer, and commodity relationships.</p>
        </article>
        <article>
          <ShieldCheck />
          <h2>Traceable Evidence</h2>
          <p>Every finding keeps source type, metric, period, and calculation context attached.</p>
        </article>
        <article>
          <Bot />
          <h2>AI Analyst Layer</h2>
          <p>The model explains evidence and contradictions after the engine does the math.</p>
        </article>
      </section>

      <section className="landing-section landing-signals" id="signals">
        <div>
          <p className="eyebrow">MVP SIGNAL ENGINE</p>
          <h2>Built to find the moments analysts usually have to hunt manually.</h2>
          <p>
            Hestra does not claim that Sectors provides native research signals.
            It derives them from available Sectors-backed metrics and marks missing
            evidence as unresolved.
          </p>
        </div>
        <div className="landing-signal-grid">
          {signals.map(([title, text], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow" id="workflow">
        <div className="landing-workflow-image">
          <Image src="/nickel-mine.png" alt="Nickel mining operation" fill sizes="38vw" />
        </div>
        <div>
          <p className="eyebrow">FROM RAW DATA TO RESEARCH MEMORY</p>
          <h2>A full investigation path, not a loose chatbot.</h2>
          <div className="workflow-list">
            {workflow.map(([step, title, text]) => (
              <article key={step}>
                <span>{step}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-operator">
        <div>
          <p className="eyebrow">FOR ANALYSTS, TEAMS, AND RESEARCH OPERATORS</p>
          <h2>Keep the workflow fast without hiding the evidence.</h2>
        </div>
        <div className="operator-grid">
          <article><Pickaxe /><span>Discover verified nickel companies</span></article>
          <article><LineChart /><span>Investigate real divergence signals</span></article>
          <article><BarChart3 /><span>Compare companies against peer medians</span></article>
          <article><Workflow /><span>Save findings into research memory</span></article>
        </div>
      </section>

      <footer className="landing-footer">
        <span>HESTRA AI</span>
        <p>
          Adaptive research intelligence for Indonesia&apos;s nickel market.
          <small>Developed by CitraZhang Team from Ahmad Dahlan University.</small>
        </p>
        <Link href="/pricing">Explore Plans <ArrowRight /></Link>
      </footer>
    </main>
  );
}
