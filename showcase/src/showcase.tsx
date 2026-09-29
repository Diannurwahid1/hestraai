import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const C = {
  black: "#040608",
  surface: "#0b1118",
  white: "#f5f8fc",
  muted: "#a3b5c8",
  blue: "#1677f6",
  paleBlue: "#70b6ff",
  border: "#27405a",
};
const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const tween = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

const Mark = ({ size = 38 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
  <path d="M5 4L20 10V44L5 37V4Z" fill="#E9F1F8" />
  <path d="M43 4L28 10V44L43 37V4Z" fill="#E9F1F8" />
  <path d="M4 27L44 17V23L4 33V27Z" fill="#1677F6" />
</svg>;

const Brand = ({ large = false }: { large?: boolean }) => <div style={{ display: "flex", alignItems: "center", gap: large ? 22 : 12 }}>
  <Mark size={large ? 80 : 34} />
  <div style={{ display: "flex", flexDirection: "column", gap: large ? 8 : 3 }}>
    <strong style={{ fontSize: large ? 59 : 23, letterSpacing: large ? 12 : 5, color: C.white, lineHeight: 1 }}>HESTRA <span style={{ color: C.blue }}>AI</span></strong>
    <span style={{ fontSize: large ? 18 : 10, letterSpacing: large ? 6 : 3.2, color: C.muted }}>ADAPTIVE NICKEL INTELLIGENCE</span>
  </div>
</div>;

const Base = ({ children, index, frame }: { children: React.ReactNode; index: number; frame: number }) => <AbsoluteFill style={{
  background: `radial-gradient(circle at 72% 32%, rgba(12,72,151,.22), transparent 36%), linear-gradient(145deg, #05080b, ${C.black} 68%)`,
  color: C.white,
  fontFamily: "Segoe UI, Arial, sans-serif",
  overflow: "hidden",
}}>
  <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "linear-gradient(#29445d 1px, transparent 1px), linear-gradient(90deg, #29445d 1px, transparent 1px)", backgroundSize: "120px 120px", maskImage: "linear-gradient(to right, transparent, black 70%)" }} />
  <div style={{ position: "absolute", top: 55, left: 76, zIndex: 9 }}><Brand /></div>
  <div style={{ position: "absolute", top: 70, right: 82, color: "#8ea6bb", letterSpacing: 4, fontSize: 14, zIndex: 9 }}>INDONESIA · NICKEL RESEARCH</div>
  {children}
  <div style={{ position: "absolute", left: 76, right: 76, bottom: 54, zIndex: 9, display: "flex", alignItems: "center", gap: 18 }}>
    <span style={{ color: "#7893aa", fontSize: 14, letterSpacing: 3 }}>HESTRA AI / PRODUCT FILM</span>
    <div style={{ flex: 1, height: 1, background: "#284159" }} />
    <span style={{ color: C.paleBlue, fontSize: 14, letterSpacing: 3 }}>0{index} / 08</span>
  </div>
  <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, width: `${((index - 1) + Math.min(frame / 225, 1)) / 8 * 100}%`, background: C.blue, boxShadow: "0 0 18px #278dff", zIndex: 10 }} />
</AbsoluteFill>;

const Beam = ({ frame }: { frame: number }) => <div style={{
  position: "absolute", top: 0, bottom: 0, width: 2,
  left: tween(frame, [0, 55], [-90, 2020]),
  background: "linear-gradient(to bottom, transparent, #4aa5ff 42%, transparent)",
  boxShadow: "0 0 28px 8px rgba(22,119,246,.16)", opacity: tween(frame, [0, 10, 42, 56], [0, 0.8, 0.8, 0]),
  zIndex: 6, pointerEvents: "none",
}} />;

const Eyebrow = ({ children }: { children: React.ReactNode }) => <div style={{ color: C.paleBlue, fontSize: 17, fontWeight: 700, letterSpacing: 6, marginBottom: 25 }}>{children}</div>;

const Line = ({ children, frame, start = 0, size = 78, maxWidth = 570, weight = 650 }: { children: React.ReactNode; frame: number; start?: number; size?: number; maxWidth?: number; weight?: number }) => <div style={{
  maxWidth, fontSize: size, fontWeight: weight, letterSpacing: -3, lineHeight: 1.03,
  opacity: tween(frame, [start, start + 18], [0, 1]),
  transform: `translateY(${tween(frame, [start, start + 28], [55, 0])}px)`,
}}>{children}</div>;

const Subline = ({ children, frame, start = 24, width = 520 }: { children: React.ReactNode; frame: number; start?: number; width?: number }) => <p style={{
  color: C.muted, fontSize: 25, lineHeight: 1.42, maxWidth: width, marginTop: 30,
  opacity: tween(frame, [start, start + 20], [0, 1]),
  transform: `translateY(${tween(frame, [start, start + 22], [22, 0])}px)`,
}}>{children}</p>;

type Camera = "push" | "slide" | "scan" | "orbit" | "pull";
type Layout = "text-left" | "text-right" | "wide";

const cameraMove = (camera: Camera, frame: number) => {
  const progress = [0, 190];
  switch (camera) {
    case "push":
      return {
        transformOrigin: "right center",
        transform: `perspective(1900px) translateX(${tween(frame, progress, [55, 0])}px) scale(${tween(frame, progress, [.90, 1.025])}) rotateY(${tween(frame, progress, [-7, 0])}deg)`,
      };
    case "slide":
      return {
        transformOrigin: "left center",
        transform: `perspective(1900px) translateX(${tween(frame, progress, [-75, 0])}px) scale(${tween(frame, progress, [.95, 1.02])}) rotateY(${tween(frame, progress, [7, 0])}deg)`,
      };
    case "scan":
      return {
        transformOrigin: "center bottom",
        transform: `perspective(1900px) translateY(${tween(frame, progress, [80, 0])}px) scale(${tween(frame, progress, [.94, 1.035])}) rotateX(${tween(frame, progress, [5, 0])}deg)`,
      };
    case "orbit":
      return {
        transformOrigin: "left center",
        transform: `perspective(1900px) translateX(${tween(frame, progress, [70, 0])}px) scale(${tween(frame, progress, [1.075, .985])}) rotateY(${tween(frame, progress, [-5, 0])}deg)`,
      };
    case "pull":
      return {
        transformOrigin: "left center",
        transform: `perspective(1900px) translateY(${tween(frame, progress, [40, 0])}px) scale(${tween(frame, progress, [1.09, .97])}) rotateY(${tween(frame, progress, [3, 0])}deg)`,
      };
  }
};

const Screenshot = ({ name, frame, x, y, width, height, camera }: { name: string; frame: number; x: number; y: number; width: number; height: number; camera: Camera }) => <div style={{
  position: "absolute", left: x, top: y, width, height, zIndex: 2,
  border: `1px solid ${C.border}`, borderRadius: 18,
  boxShadow: "0 42px 95px rgba(0,0,0,.65), 0 0 0 1px rgba(16,108,210,.16)",
  background: C.surface, overflow: "hidden",
  opacity: tween(frame, [4, 26], [0, 1]),
  ...cameraMove(camera, frame),
}}>
  <div style={{ height: 42, background: "#0d1721", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 9, padding: "0 20px" }}>
    {["#386889", "#386889", C.blue].map((color, index) => <i key={index} style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />)}
    <span style={{ marginLeft: 22, color: "#7196b3", fontSize: 15, letterSpacing: 1.4 }}>hestra-ai.diannurwahid.com</span>
    <span style={{ marginLeft: "auto", color: C.paleBlue, fontSize: 12, letterSpacing: 2 }}>LIVE PRODUCT CAPTURE</span>
  </div>
  <div style={{ height: height - 42, overflow: "hidden", position: "relative" }}>
    <Img src={staticFile(`screens/${name}.png`)} style={{ position: "absolute", left: (name === "chat" ? -400 : 0) - tween(frame, [0, 210], [0, 30]), top: (name === "memory-record" ? -180 : 0) - (camera === "scan" ? tween(frame, [40, 190], [0, 300]) : tween(frame, [0, 210], [0, 24])), width: 1600, height: 900 }} />
  </div>
</div>;

const ProductScene = ({ index, name, kicker, title, sub, detail, layout, camera, duration = 240, alternateName }: { index: number; name: string; kicker: string; title: React.ReactNode; sub: string; detail: string; layout: Layout; camera: Camera; duration?: number; alternateName?: string }) => {
  const frame = useCurrentFrame();
  const wide = layout === "wide";
  const right = layout === "text-right";
  const shot = wide
    ? { x: 210, y: 418, width: 1500, height: 490 }
    : right
      ? { x: 98, y: 198, width: 1200, height: 700 }
      : { x: 645, y: 198, width: 1175, height: 700 };
  return <Base index={index} frame={frame}>
    <Beam frame={frame} />
    <div style={{ position: "absolute", left: right ? 1380 : 78, top: wide ? 154 : right ? 280 : 284, zIndex: 3, width: wide ? 700 : right ? 455 : 485 }}>
      <Eyebrow>{kicker}</Eyebrow>
      <Line frame={frame} start={10} size={wide ? 67 : right ? 70 : 78} maxWidth={wide ? 700 : right ? 455 : 485}>{title}</Line>
      {!wide && <Subline frame={frame} start={35} width={right ? 435 : 475}>{sub}</Subline>}
      {!wide && <div style={{ marginTop: 44, opacity: tween(frame, [60, 82], [0, 1]), display: "flex", gap: 11, alignItems: "center", color: C.paleBlue, letterSpacing: 2.2, fontSize: 16 }}>
        <span style={{ width: 38, height: 2, background: C.blue, boxShadow: "0 0 12px #288cff" }} />{detail}
      </div>}
    </div>
    {wide && <div style={{ position: "absolute", left: 890, top: 158, width: 850, zIndex: 3 }}>
      <Subline frame={frame} start={35} width={780}>{sub}</Subline>
      <div style={{ marginTop: 26, opacity: tween(frame, [60, 82], [0, 1]), display: "flex", gap: 11, alignItems: "center", color: C.paleBlue, letterSpacing: 2.2, fontSize: 16 }}><span style={{ width: 38, height: 2, background: C.blue, boxShadow: "0 0 12px #288cff" }} />{detail}</div>
    </div>}
    <Screenshot name={name} frame={frame} {...shot} camera={camera} />
    {alternateName && <div style={{ opacity: tween(frame, [105, 132], [0, 1]) }}><Screenshot name={alternateName} frame={frame} {...shot} camera={camera} /></div>}
    <div style={{ position: "absolute", bottom: 94, right: 87, color: "#6f889f", fontSize: 13, zIndex: 3 }}>Recorded from live Hestra AI · 24 Sep 2026</div>
    <div style={{ position: "absolute", inset: 0, background: C.black, opacity: tween(frame, [duration - 15, duration], [0, 1]), pointerEvents: "none", zIndex: 8 }} />
  </Base>;
};

const Intro = () => {
  const frame = useCurrentFrame();
  return <Base index={1} frame={frame}>
    <Img src={staticFile("brand/nickel-mine.png")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: .46, transform: `scale(${tween(frame, [0, 180], [1.08, 1.18])})` }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #040608 5%, rgba(4,6,8,.96) 40%, rgba(4,6,8,.35) 100%)" }} />
    <Beam frame={frame} />
    <div style={{ position: "absolute", left: 82, top: 305 }}>
      <Eyebrow>INDONESIA&apos;S NICKEL MARKET</Eyebrow>
      <Line frame={frame} start={8} size={108} maxWidth={1000}>Every data point<br />has a story.</Line>
      <Subline frame={frame} start={37} width={760}>The challenge is knowing which story the evidence can actually support.</Subline>
    </div>
    <div style={{ position: "absolute", right: 82, bottom: 135, color: C.paleBlue, fontSize: 17, letterSpacing: 4, opacity: tween(frame, [88, 114], [0, 1]) }}>TRACE THE SIGNAL →</div>
  </Base>;
};

const Identity = () => {
  const frame = useCurrentFrame();
  return <Base index={2} frame={frame}>
    <div style={{ position: "absolute", right: -30, top: -68, width: 1050, height: 1250, overflow: "hidden", opacity: tween(frame, [0, 38], [0, .95]), transform: `translateX(${tween(frame, [0, 210], [80, -20])}px) scale(${tween(frame, [0, 210], [.94, 1.04])})` }}>
      <Img src={staticFile("brand/hestra-robot.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 8%", filter: "brightness(.68) contrast(1.2)" }} />
    </div>
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#040608 10%,rgba(4,6,8,.96) 39%,rgba(4,6,8,0) 78%)" }} />
    <Beam frame={frame} />
    <div style={{ position: "absolute", left: 82, top: 290 }}>
      <Eyebrow>INTRODUCING</Eyebrow>
      <Line frame={frame} start={8} size={111} maxWidth={880}>Hestra AI.</Line>
      <Line frame={frame} start={27} size={72} maxWidth={820} weight={450}><span style={{ color: C.paleBlue }}>Adaptive Nickel</span><br />Intelligence.</Line>
      <Subline frame={frame} start={63} width={650}>A research workspace that follows facts from signal to investigation.</Subline>
    </div>
  </Base>;
};

const Dashboard = () => <ProductScene index={3} name="dashboard" layout="text-left" camera="push" kicker="01 / DISCOVER" title={<>See what<br />matters.</>} sub="A focused view of nickel benchmarks, companies, and derived research signals." detail="SECTORS-BACKED DATA" />;
const Company = () => <ProductScene index={4} name="company" layout="text-right" camera="slide" kicker="02 / CONTEXT" title={<>Know the<br />company.</>} sub="Financial history, market context, and peers in one connected workspace." detail="COMPANY · ANTM" />;
const Investigation = () => <ProductScene index={5} name="investigation" layout="wide" camera="scan" kicker="03 / INVESTIGATE" title={<>Follow the<br />evidence.</>} sub="Every Hestra signal leads back to a calculation, period, and source reference." detail="DERIVED SIGNAL · VERIFIED FACTS" />;
const Chat = () => <ProductScene index={6} name="chat" layout="text-right" camera="orbit" kicker="04 / ASK HESTRA" title={<>Question<br />the thesis.</>} sub="The AI connects attached evidence, surfaces contradictions, and says what remains unresolved." detail="EVIDENCE BEFORE EXPLANATION" duration={270} />;
const Memory = () => <ProductScene index={7} name="memory" alternateName="memory-record" layout="text-left" camera="pull" kicker="05 / REMEMBER" title={<>Keep the<br />research.</>} sub="Save a verified investigation, then return to the reasoning behind it." detail="RESEARCH MEMORY" duration={210} />;

const Outro = () => {
  const frame = useCurrentFrame();
  return <Base index={8} frame={frame}>
    <Img src={staticFile("brand/hestra-robot.png")} style={{ position: "absolute", right: -80, top: -130, width: 980, height: 1320, objectFit: "cover", objectPosition: "center top", filter: "brightness(.48)", opacity: .9, transformOrigin: "right center", transform: `translateX(${tween(frame, [0, 180], [40, -12])}px) scale(${tween(frame, [0, 180], [1.12, .98])})` }} />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#040608 12%,rgba(4,6,8,.92) 49%,rgba(4,6,8,.24) 100%)" }} />
    <Beam frame={frame} />
    <div style={{ position: "absolute", left: 82, top: 260 }}>
      <Eyebrow>ADAPTIVE NICKEL INTELLIGENCE</Eyebrow>
      <Line frame={frame} start={7} size={104} maxWidth={1050}>Research deeper.<br /><span style={{ color: C.paleBlue }}>Follow the evidence.</span></Line>
      <div style={{ marginTop: 65, opacity: tween(frame, [44, 67], [0, 1]) }}><Brand large /></div>
      <div style={{ display: "inline-block", marginTop: 48, padding: "18px 26px", border: `1px solid ${C.blue}`, borderRadius: 8, color: C.white, background: "#0a274c", fontSize: 28, fontWeight: 600, opacity: tween(frame, [64, 90], [0, 1]) }}>hestra-ai.diannurwahid.com ↗</div>
      <div style={{ color: "#7c91a5", fontSize: 15, letterSpacing: 1.3, marginTop: 35 }}>Research intelligence, not investment advice.</div>
    </div>
    <div style={{ position: "absolute", inset: 0, background: C.black, opacity: tween(frame, [184, 210], [0, 1]) }} />
  </Base>;
};

export const HestraShowcase = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <AbsoluteFill style={{ background: C.black }}>
    <Audio src={staticFile("audio/hestra-original-score.wav")} volume={frame < 30 ? frame / 30 : frame > durationInFrames - 75 ? (durationInFrames - frame) / 75 : 1} />
    <Sequence from={0} durationInFrames={180}><Intro /></Sequence>
    <Sequence from={180} durationInFrames={210}><Identity /></Sequence>
    <Sequence from={390} durationInFrames={240}><Dashboard /></Sequence>
    <Sequence from={630} durationInFrames={240}><Company /></Sequence>
    <Sequence from={870} durationInFrames={240}><Investigation /></Sequence>
    <Sequence from={1110} durationInFrames={270}><Chat /></Sequence>
    <Sequence from={1380} durationInFrames={210}><Memory /></Sequence>
    <Sequence from={1590} durationInFrames={210}><Outro /></Sequence>
  </AbsoluteFill>;
};
