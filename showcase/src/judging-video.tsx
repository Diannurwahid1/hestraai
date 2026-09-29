import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const C = {
  black: "#020508",
  ink: "#06101a",
  panel: "rgba(8, 20, 31, .88)",
  white: "#f4f8fc",
  muted: "#91a7bb",
  blue: "#1478ff",
  pale: "#70b9ff",
  cyan: "#4ad7ff",
  line: "rgba(88, 151, 207, .28)",
  green: "#61e8b6",
};

const ease = Easing.bezier(0.18, 0.82, 0.24, 1);
const tween = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const entrance = (frame: number, delay = 0) => tween(frame, [delay, delay + 22], [0, 1]);
const exit = (frame: number, duration: number) => tween(frame, [duration - 18, duration], [1, 0]);

const Mark = ({size = 44}: {size?: number}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M5 4L20 10V44L5 37V4Z" fill="#E9F1F8" />
    <path d="M43 4L28 10V44L43 37V4Z" fill="#E9F1F8" />
    <path d="M4 27L44 17V23L4 33V27Z" fill={C.blue} />
  </svg>
);

const Brand = ({compact = false}: {compact?: boolean}) => (
  <div style={{display: "flex", gap: compact ? 12 : 17, alignItems: "center"}}>
    <Mark size={compact ? 34 : 48} />
    <div>
      <strong style={{letterSpacing: compact ? 5 : 7, fontSize: compact ? 20 : 29}}>
        HESTRA <span style={{color: C.blue}}>AI</span>
      </strong>
      <small style={{display: "block", letterSpacing: compact ? 2.4 : 3.5, color: C.muted, marginTop: 5, fontSize: compact ? 9 : 11}}>
        ADAPTIVE NICKEL INTELLIGENCE
      </small>
    </div>
  </div>
);

const particles = Array.from({length: 30}, (_, index) => ({
  left: (index * 73 + 9) % 100,
  top: (index * 47 + 16) % 100,
  size: 1 + (index % 3),
  speed: 0.25 + (index % 5) * 0.07,
  phase: index * 19,
}));

const Ambient = ({frame}: {frame: number}) => (
  <>
    <div
      style={{
        position: "absolute",
        inset: -180,
        opacity: 0.14,
        backgroundImage: "linear-gradient(rgba(72,132,181,.48) 1px,transparent 1px),linear-gradient(90deg,rgba(72,132,181,.48) 1px,transparent 1px)",
        backgroundSize: "112px 112px",
        transform: `perspective(1000px) rotateX(58deg) translateY(${tween(frame % 240, [0, 240], [-38, 74])}px)`,
        transformOrigin: "center bottom",
        maskImage: "linear-gradient(to top, black, transparent 72%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 860,
        height: 860,
        right: -270 + Math.sin(frame / 90) * 35,
        top: -330 + Math.cos(frame / 110) * 25,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(20,120,255,.24), rgba(20,120,255,.05) 42%, transparent 70%)",
        filter: "blur(10px)",
      }}
    />
    {particles.map((particle, index) => {
      const drift = (frame * particle.speed + particle.phase) % 170;
      return (
        <i
          key={index}
          style={{
            position: "absolute",
            left: `${particle.left}%`,
            top: `calc(${particle.top}% + ${70 - drift}px)`,
            width: particle.size,
            height: particle.size,
            borderRadius: "50%",
            background: index % 4 === 0 ? C.cyan : C.pale,
            boxShadow: `0 0 ${6 + particle.size * 3}px ${C.blue}`,
            opacity: 0.18 + ((index + frame) % 20) / 36,
          }}
        />
      );
    })}
  </>
);

const SceneBase = ({children, frame, duration, chapter}: {children: React.ReactNode; frame: number; duration: number; chapter: string}) => {
  const alpha = Math.min(entrance(frame), exit(frame, duration));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 76% 24%, rgba(14,77,153,.18), transparent 34%), linear-gradient(145deg, ${C.ink}, ${C.black} 72%)`,
        color: C.white,
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        overflow: "hidden",
        opacity: alpha,
      }}
    >
      <Ambient frame={frame} />
      <div style={{position: "absolute", left: 66, top: 44, zIndex: 30}}><Brand compact /></div>
      <div style={{position: "absolute", right: 70, top: 55, zIndex: 30, display: "flex", alignItems: "center", gap: 13, color: C.muted, fontSize: 12, letterSpacing: 3}}>
        <span style={{width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 12px ${C.green}`}} />
        {chapter}
      </div>
      {children}
      <div style={{position: "absolute", left: 66, right: 66, bottom: 40, height: 1, background: "linear-gradient(90deg, transparent, rgba(84,145,195,.36), transparent)", zIndex: 30}} />
      <div style={{position: "absolute", left: 66, bottom: 20, fontSize: 10, letterSpacing: 3, color: "#567086", zIndex: 30}}>HESTRA AI · JUDGING FILM</div>
      <div style={{position: "absolute", right: 66, bottom: 20, fontSize: 10, letterSpacing: 3, color: C.pale, zIndex: 30}}>INDONESIA · NICKEL RESEARCH</div>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 160,
          left: tween(frame, [0, 38], [-220, 2040]),
          background: "linear-gradient(90deg, transparent, rgba(84,175,255,.11), transparent)",
          transform: "skewX(-18deg)",
          opacity: tween(frame, [0, 8, 30, 40], [0, 1, 1, 0]),
          zIndex: 40,
        }}
      />
    </AbsoluteFill>
  );
};

const Kicker = ({children}: {children: React.ReactNode}) => (
  <div style={{color: C.pale, letterSpacing: 7, fontSize: 16, fontWeight: 700, marginBottom: 22}}>{children}</div>
);

const Intro = () => {
  const frame = useCurrentFrame();
  const duration = 360;
  const chart = [72, 45, 62, 29, 52, 18, 40];
  const chartProgress = tween(frame, [75, 170], [0, 1]);
  return (
    <SceneBase frame={frame} duration={duration} chapter="01 / THE RESEARCH GAP">
      <Img
        src={staticFile("brand/nickel-mine.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${55 + tween(frame, [0, duration], [0, 5])}% center`,
          opacity: 0.42,
          transform: `scale(${tween(frame, [0, duration], [1.08, 1.2])})`,
          filter: "saturate(.72) contrast(1.14)",
        }}
      />
      <div style={{position: "absolute", inset: 0, background: "linear-gradient(90deg,#020508 2%,rgba(2,5,8,.97) 43%,rgba(2,5,8,.34) 77%,rgba(2,5,8,.72))"}} />
      <div style={{position: "absolute", left: 72, top: 240, zIndex: 4, width: 1050}}>
        <div style={{opacity: entrance(frame, 8), transform: `translateY(${tween(frame, [8, 30], [28, 0])}px)`}}><Kicker>THE RESEARCH PROBLEM</Kicker></div>
        <div style={{fontSize: 92, fontWeight: 710, lineHeight: 0.98, letterSpacing: -5}}>
          {["Data is abundant.", "Defensible conclusions", "are not."].map((line, index) => (
            <div key={line} style={{overflow: "hidden"}}>
              <div style={{color: index === 2 ? C.pale : C.white, transform: `translateY(${tween(frame, [18 + index * 10, 48 + index * 10], [105, 0])}%)`, opacity: entrance(frame, 14 + index * 10)}}>{line}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize: 25, lineHeight: 1.5, color: C.muted, maxWidth: 840, marginTop: 32, opacity: entrance(frame, 62)}}>
          Indonesia&apos;s nickel analysts must connect company, commodity, mining, and peer evidence before they can trust an answer.
        </p>
      </div>
      <div style={{position: "absolute", right: 72, bottom: 110, width: 500, height: 230, border: `1px solid ${C.line}`, background: "rgba(3,10,17,.76)", backdropFilter: "blur(16px)", borderRadius: 18, padding: 24, opacity: entrance(frame, 82), transform: `translateX(${tween(frame, [82, 112], [70, 0])}px) rotateY(${tween(frame, [82, 150], [-8, 0])}deg)`}}>
        <div style={{display: "flex", justifyContent: "space-between", color: C.muted, fontSize: 11, letterSpacing: 2.5}}><span>NICKEL EVIDENCE STREAM</span><span style={{color: C.green}}>LIVE</span></div>
        <svg width="452" height="120" viewBox="0 0 452 120" style={{marginTop: 18, overflow: "visible"}}>
          <defs><linearGradient id="intro-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor={C.blue} stopOpacity=".28"/><stop offset="1" stopColor={C.blue} stopOpacity="0"/></linearGradient></defs>
          <path d={`M0 120 ${chart.map((value, index) => `L${index * 75.3} ${value}`).join(" ")} L452 120Z`} fill="url(#intro-fill)" opacity={chartProgress}/>
          <path d={`M0 ${chart[0]} ${chart.slice(1).map((value, index) => `L${(index + 1) * 75.3} ${value}`).join(" ")}`} fill="none" stroke={C.cyan} strokeWidth="3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - chartProgress} style={{filter: `drop-shadow(0 0 7px ${C.blue})`}}/>
          <circle cx={452 * chartProgress} cy={chart[Math.min(chart.length - 1, Math.round(chartProgress * (chart.length - 1)))]} r="5" fill={C.white}/>
        </svg>
        <div style={{display: "flex", gap: 9}}>{["COMPANY", "MINING", "PEERS"].map((x, i) => <span key={x} style={{border: `1px solid ${i === 1 ? C.blue : C.line}`, borderRadius: 20, padding: "7px 12px", color: i === 1 ? C.pale : C.muted, fontSize: 10, letterSpacing: 1.5}}>{x}</span>)}</div>
      </div>
    </SceneBase>
  );
};

const Solution = () => {
  const frame = useCurrentFrame();
  const duration = 480;
  const nodes = [
    ["01", "SECTORS", "Verified facts"],
    ["02", "NORMALIZE", "Comparable inputs"],
    ["03", "CALCULATE", "Deterministic signal"],
    ["04", "INVESTIGATE", "Evidence tools"],
    ["05", "EXPLAIN", "Adaptive insight"],
  ];
  const progress = tween(frame, [75, 310], [0, 1]);
  return (
    <SceneBase frame={frame} duration={duration} chapter="02 / THE HESTRA METHOD">
      <div style={{position: "absolute", left: 75, top: 180, width: 1120}}>
        <div style={{opacity: entrance(frame, 5)}}><Kicker>EVIDENCE BEFORE EXPLANATION</Kicker></div>
        <h2 style={{fontSize: 76, letterSpacing: -4, lineHeight: 1.04, margin: 0, opacity: entrance(frame, 15), transform: `translateY(${tween(frame, [15, 42], [45, 0])}px)`}}>Facts flow through a<br/><span style={{color: C.pale}}>defensible research system.</span></h2>
      </div>
      <div style={{position: "absolute", left: 74, right: 74, top: 560, height: 250}}>
        <div style={{position: "absolute", left: 105, right: 105, top: 72, height: 2, background: "rgba(75,125,168,.25)"}} />
        <div style={{position: "absolute", left: 105, top: 72, height: 2, width: `${progress * 88}%`, maxWidth: 1580, background: `linear-gradient(90deg,${C.blue},${C.cyan})`, boxShadow: `0 0 18px ${C.blue}`}} />
        <div style={{position: "absolute", left: 105 + progress * 1574, top: 64, width: 18, height: 18, borderRadius: "50%", background: C.white, boxShadow: `0 0 24px 7px ${C.blue}`}} />
        <div style={{display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, position: "relative"}}>
          {nodes.map(([number, title, sub], index) => {
            const shown = entrance(frame, 55 + index * 23);
            const active = progress >= index / 4;
            const float = Math.sin((frame + index * 23) / 25) * 5;
            return (
              <div key={title} style={{opacity: shown, transform: `translateY(${tween(frame, [55 + index * 23, 83 + index * 23], [48, 0]) + float}px)`, textAlign: "center"}}>
                <div style={{width: 76, height: 76, margin: "34px auto 24px", borderRadius: 20, display: "grid", placeItems: "center", border: `1px solid ${active ? C.blue : C.line}`, background: active ? "linear-gradient(145deg,#0b376a,#071625)" : "rgba(7,17,27,.9)", color: active ? C.white : C.muted, fontSize: 17, letterSpacing: 2, boxShadow: active ? "0 18px 45px rgba(20,120,255,.2)" : "none"}}>{number}</div>
                <strong style={{fontSize: 17, letterSpacing: 2.5}}>{title}</strong>
                <span style={{display: "block", color: C.muted, fontSize: 14, marginTop: 10}}>{sub}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{position: "absolute", right: 74, top: 240, width: 470, borderLeft: `1px solid ${C.line}`, paddingLeft: 32, color: C.muted, fontSize: 21, lineHeight: 1.55, opacity: entrance(frame, 42)}}>
        The language model does not calculate financial metrics. It receives compact, sourced evidence after Hestra&apos;s engine has done the analytical work.
      </div>
    </SceneBase>
  );
};

const demoSteps = [
  {from: 0, title: "DETECT", detail: "Real Sectors-backed signals", color: C.cyan},
  {from: 330, title: "TRACE", detail: "Period, source, inputs, formula", color: C.pale},
  {from: 900, title: "INVESTIGATE", detail: "Supporting and contradicting evidence", color: C.green},
  {from: 1740, title: "REMEMBER", detail: "Persist the evidence trail", color: "#a78bfa"},
];

const LiveDemo = () => {
  const frame = useCurrentFrame();
  const duration = 2280;
  const currentIndex = [...demoSteps].reverse().findIndex((step) => frame >= step.from);
  const stepIndex = demoSteps.length - 1 - currentIndex;
  const active = demoSteps[Math.max(0, stepIndex)];
  const segmentStart = active.from;
  const nextStart = demoSteps[stepIndex + 1]?.from ?? duration;
  const segmentProgress = tween(frame, [segmentStart, nextStart], [0, 1]);
  const scale = stepIndex === 0 ? tween(segmentProgress, [0, 1], [1.02, 1.12]) : stepIndex === 1 ? tween(segmentProgress, [0, 1], [1.16, 1.05]) : stepIndex === 2 ? tween(segmentProgress, [0, 1], [1.04, 1.15]) : tween(segmentProgress, [0, 1], [1.12, 1.03]);
  const moveX = [0, -65, 45, -25][stepIndex] ?? 0;
  const moveY = [0, -24, 32, -18][stepIndex] ?? 0;
  const reveal = spring({frame, fps: 30, config: {damping: 18, stiffness: 90}});
  return (
    <AbsoluteFill style={{background: C.black, color: C.white, fontFamily: "Inter, Segoe UI, Arial, sans-serif", overflow: "hidden"}}>
      <Ambient frame={frame} />
      <div style={{position: "absolute", inset: 0, background: "radial-gradient(circle at center, rgba(20,120,255,.09), transparent 62%)"}} />
      <div style={{position: "absolute", left: 55, right: 55, top: 92, bottom: 75, perspective: 1800, transform: `scale(${0.96 + reveal * 0.04})`, opacity: reveal}}>
        <div style={{position: "absolute", inset: 0, borderRadius: 22, border: `1px solid rgba(83,159,221,.42)`, background: "#050b11", boxShadow: "0 55px 120px rgba(0,0,0,.7), 0 0 70px rgba(20,120,255,.09)", overflow: "hidden", transform: `rotateX(${tween(frame, [0, 70], [3, 0])}deg)`}}>
          <div style={{height: 48, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "linear-gradient(180deg,#0c1722,#07101a)", borderBottom: `1px solid ${C.line}`}}>
            {["#27475f", "#27475f", C.blue].map((color, i) => <i key={i} style={{width: 8, height: 8, borderRadius: "50%", background: color}} />)}
            <div style={{marginLeft: 22, width: 560, height: 26, borderRadius: 7, border: `1px solid ${C.line}`, background: "rgba(2,8,13,.7)", display: "flex", alignItems: "center", padding: "0 14px", color: "#7391a8", fontSize: 11, letterSpacing: 1.1}}>https://hestra-ai.diannurwahid.com</div>
            <span style={{marginLeft: "auto", color: C.green, fontSize: 10, letterSpacing: 2.5}}>● LIVE PRODUCT</span>
          </div>
          <div style={{position: "absolute", left: 0, right: 0, top: 48, bottom: 0, overflow: "hidden"}}>
            <OffthreadVideo
              src={staticFile("judging/hestra-live-render.mp4")}
              playbackRate={0.75}
              muted
              style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `translate(${moveX}px, ${moveY}px) scale(${scale})`, transition: "none", filter: "saturate(.94) contrast(1.04)"}}
            />
            <div style={{position: "absolute", top: -20, bottom: -20, width: 4, left: `${(frame * 0.21) % 104 - 2}%`, background: "linear-gradient(to bottom,transparent,rgba(74,215,255,.6),transparent)", boxShadow: "0 0 28px 7px rgba(20,120,255,.2)", opacity: .55}} />
          </div>
        </div>
      </div>
      <div style={{position: "absolute", left: 76, top: 28, zIndex: 5}}><Brand compact /></div>
      <div style={{position: "absolute", left: 78, top: 118, zIndex: 8, width: 410, border: `1px solid ${active.color}66`, borderRadius: 15, background: "rgba(2,8,13,.9)", backdropFilter: "blur(18px)", padding: "19px 22px", boxShadow: `0 18px 50px rgba(0,0,0,.45), inset 3px 0 0 ${active.color}`, transform: `translateX(${tween(frame - segmentStart, [0, 20], [-45, 0])}px)`, opacity: entrance(frame - segmentStart)}}>
        <div style={{display: "flex", alignItems: "center", gap: 12}}><span style={{color: active.color, letterSpacing: 3, fontSize: 12}}>0{stepIndex + 1} / {active.title}</span><span style={{height: 1, flex: 1, background: `${active.color}55`}} /></div>
        <strong style={{display: "block", marginTop: 11, fontSize: 18, fontWeight: 560}}>{active.detail}</strong>
      </div>
      <div style={{position: "absolute", right: 75, top: 138, zIndex: 9, display: "grid", gap: 14}}>
        {demoSteps.map((step, index) => <div key={step.title} style={{display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, opacity: index === stepIndex ? 1 : .38}}><span style={{fontSize: 10, letterSpacing: 2.3}}>{step.title}</span><i style={{width: index === stepIndex ? 34 : 9, height: 3, borderRadius: 4, background: index === stepIndex ? step.color : "#486177", boxShadow: index === stepIndex ? `0 0 12px ${step.color}` : "none"}} /></div>)}
      </div>
      <div style={{position: "absolute", right: 78, bottom: 95, zIndex: 9, display: "flex", gap: 10}}>
        {["SOURCE LINKED", "PROVENANCE", "UNRESOLVED VISIBLE"].map((text, index) => <span key={text} style={{padding: "9px 13px", borderRadius: 7, background: "rgba(2,8,13,.88)", border: `1px solid ${C.line}`, color: index === 0 ? C.green : C.muted, fontSize: 9, letterSpacing: 1.7}}>{text}</span>)}
      </div>
      <div style={{position: "absolute", left: 55, right: 55, bottom: 53, height: 2, background: "rgba(71,117,155,.24)"}}><div style={{height: "100%", width: `${frame / duration * 100}%`, background: `linear-gradient(90deg,${C.blue},${active.color})`, boxShadow: `0 0 14px ${active.color}`}} /></div>
    </AbsoluteFill>
  );
};

const Architecture = () => {
  const frame = useCurrentFrame();
  const duration = 960;
  const orbitNodes = [
    ["FINANCIAL", "Margins · growth", -168, -112],
    ["MINING", "Production · trend", 172, -105],
    ["COMMODITY", "Nickel environment", -170, 120],
    ["PEERS", "Median · divergence", 174, 126],
  ] as const;
  const pulse = (Math.sin(frame / 18) + 1) / 2;
  return (
    <SceneBase frame={frame} duration={duration} chapter="04 / RESEARCH ARCHITECTURE">
      <div style={{position: "absolute", left: 75, top: 170, width: 780}}>
        <div style={{opacity: entrance(frame, 5)}}><Kicker>WHY IT IS DIFFERENT</Kicker></div>
        <h2 style={{fontSize: 67, lineHeight: 1.04, letterSpacing: -3.4, margin: 0, opacity: entrance(frame, 15)}}>The signal is<br/><span style={{color: C.pale}}>deterministic.</span><br/>The investigation<br/><span style={{color: C.green}}>is adaptive.</span></h2>
        <p style={{fontSize: 21, lineHeight: 1.55, color: C.muted, width: 650, marginTop: 34, opacity: entrance(frame, 48)}}>Sectors supplies facts. Hestra calculates and preserves provenance. AI decides how to connect and explain the available evidence.</p>
      </div>
      <div style={{position: "absolute", right: 76, top: 155, width: 940, height: 770, opacity: entrance(frame, 30)}}>
        <svg width="940" height="770" style={{position: "absolute", inset: 0}}>
          <defs><linearGradient id="flow" x1="0" y1="0" x2="1" y2="0"><stop stopColor={C.blue}/><stop offset="1" stopColor={C.green}/></linearGradient></defs>
          {orbitNodes.map((node, index) => {
            const x = 350 + node[2]; const y = 375 + node[3];
            return <line key={node[0]} x1={x} y1={y} x2="350" y2="375" stroke="url(#flow)" strokeWidth="2" strokeDasharray="7 9" strokeDashoffset={-frame * .8 - index * 9} opacity=".65"/>;
          })}
          <path d="M455 375 C570 375 580 375 690 375" fill="none" stroke="url(#flow)" strokeWidth="3" strokeDasharray="10 12" strokeDashoffset={-frame * 1.2}/>
        </svg>
        <div style={{position: "absolute", left: 245, top: 270, width: 210, height: 210, borderRadius: "50%", display: "grid", placeItems: "center", textAlign: "center", background: "radial-gradient(circle,#0b3561,#071522 67%)", border: `1px solid ${C.blue}`, boxShadow: `0 0 ${45 + pulse * 25}px rgba(20,120,255,.35), inset 0 0 35px rgba(74,215,255,.1)`, transform: `scale(${.98 + pulse * .025})`}}>
          <div><Mark size={54}/><strong style={{display: "block", marginTop: 13, letterSpacing: 2.5, fontSize: 16}}>SIGNAL ENGINE</strong><small style={{display: "block", color: C.pale, marginTop: 7, letterSpacing: 1.7}}>DETERMINISTIC</small></div>
        </div>
        {orbitNodes.map((node, index) => <div key={node[0]} style={{position: "absolute", left: 270 + node[2], top: 335 + node[3], width: 160, minHeight: 80, borderRadius: 12, border: `1px solid ${C.line}`, background: C.panel, padding: "16px 15px", textAlign: "center", opacity: entrance(frame, 55 + index * 15), transform: `translateY(${Math.sin((frame + index * 28) / 28) * 7}px)`, boxShadow: "0 15px 35px rgba(0,0,0,.34)"}}><strong style={{fontSize: 12, letterSpacing: 2, color: C.pale}}>{node[0]}</strong><span style={{display: "block", color: C.muted, fontSize: 11, marginTop: 8}}>{node[1]}</span></div>)}
        <div style={{position: "absolute", left: 690, top: 263, width: 235, height: 224, borderRadius: 20, border: `1px solid ${C.green}`, background: "linear-gradient(145deg,rgba(12,48,46,.95),rgba(5,18,25,.95))", padding: 26, boxShadow: "0 30px 70px rgba(0,0,0,.45)", opacity: entrance(frame, 120), transform: `translateX(${tween(frame, [120, 155], [55, 0])}px)`}}>
          <div style={{width: 42, height: 42, borderRadius: 12, border: `1px solid ${C.green}`, display: "grid", placeItems: "center", color: C.green, fontSize: 20}}>✦</div>
          <strong style={{display: "block", fontSize: 18, letterSpacing: 2, marginTop: 22}}>AI RESEARCH</strong>
          <span style={{display: "block", color: C.muted, fontSize: 13, lineHeight: 1.45, marginTop: 10}}>Hypothesis · contradiction · unresolved questions</span>
          <div style={{height: 3, background: "rgba(97,232,182,.18)", marginTop: 22, borderRadius: 4}}><div style={{height: "100%", width: `${50 + pulse * 50}%`, background: C.green, boxShadow: `0 0 12px ${C.green}`}} /></div>
        </div>
      </div>
    </SceneBase>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  const duration = 420;
  const robotX = tween(frame, [0, duration], [60, -22]);
  return (
    <SceneBase frame={frame} duration={duration} chapter="05 / HESTRA AI">
      <Img src={staticFile("brand/hestra-robot.png")} style={{position: "absolute", right: -70, top: -205, width: 1030, height: 1400, objectFit: "cover", objectPosition: "center top", opacity: .82, filter: "brightness(.64) contrast(1.16)", transform: `translateX(${robotX}px) scale(${tween(frame, [0, duration], [1.09, .98])})`}} />
      <div style={{position: "absolute", inset: 0, background: "linear-gradient(90deg,#020508 7%,rgba(2,5,8,.96) 47%,rgba(2,5,8,.16) 78%,rgba(2,5,8,.56))"}} />
      <div style={{position: "absolute", right: 260, top: 100, width: 510, height: 790, border: "1px solid rgba(74,215,255,.16)", borderRadius: "50%", transform: `rotate(${frame * .08}deg)`, boxShadow: "inset 0 0 60px rgba(20,120,255,.06)"}} />
      <div style={{position: "absolute", right: 305, top: 145, width: 420, height: 700, border: "1px dashed rgba(112,185,255,.22)", borderRadius: "50%", transform: `rotate(${-frame * .12}deg)`}} />
      <div style={{position: "absolute", left: 76, top: 242, width: 1080}}>
        <div style={{opacity: entrance(frame, 5)}}><Kicker>ADAPTIVE NICKEL INTELLIGENCE</Kicker></div>
        {["Same facts.", "Better questions.", "Defensible research."].map((line, index) => <div key={line} style={{fontSize: index === 2 ? 82 : 90, fontWeight: 710, lineHeight: 1.04, letterSpacing: -4, color: index === 2 ? C.pale : C.white, opacity: entrance(frame, 16 + index * 14), transform: `translateX(${tween(frame, [16 + index * 14, 48 + index * 14], [-65, 0])}px)`}}>{line}</div>)}
        <div style={{display: "flex", alignItems: "center", gap: 22, marginTop: 45, opacity: entrance(frame, 82)}}>
          <div style={{padding: "17px 25px", borderRadius: 9, border: `1px solid ${C.blue}`, background: "linear-gradient(135deg,#0b376b,#071827)", fontSize: 22, boxShadow: "0 18px 45px rgba(20,120,255,.16)"}}>hestra-ai.diannurwahid.com ↗</div>
          <span style={{color: C.muted, fontSize: 13, letterSpacing: 2}}>TRACEABLE · ADAPTIVE · EVIDENCE-BACKED</span>
        </div>
      </div>
      <div style={{position: "absolute", bottom: 67, left: 76, color: "#71869a", fontSize: 12, letterSpacing: 1.8}}>DEVELOPED BY CITRAZHANG TEAM · AHMAD DAHLAN UNIVERSITY</div>
    </SceneBase>
  );
};

export const HestraJudgingVideo = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.black}}>
      <Audio src={staticFile("audio/hestra-original-score.wav")} loop volume={frame < 25 ? frame / 25 * .07 : frame > durationInFrames - 75 ? Math.max(0, (durationInFrames - frame) / 75) * .07 : .07} />
      <Audio src={staticFile("audio/hestra-hale-voiceover.mp3")} playbackRate={1.08} volume={frame < 12 ? frame / 12 : frame > durationInFrames - 15 ? Math.max(0, (durationInFrames - frame) / 15) : 1} />
      <Sequence from={0} durationInFrames={360}><Intro /></Sequence>
      <Sequence from={360} durationInFrames={480}><Solution /></Sequence>
      <Sequence from={840} durationInFrames={2280}><LiveDemo /></Sequence>
      <Sequence from={3120} durationInFrames={960}><Architecture /></Sequence>
      <Sequence from={4080} durationInFrames={420}><Outro /></Sequence>
    </AbsoluteFill>
  );
};
