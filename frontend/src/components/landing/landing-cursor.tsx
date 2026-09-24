"use client";

import { useEffect, useRef } from "react";

type TrailPoint = { x: number; y: number; time: number };

export function LandingCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = canvas?.closest<HTMLElement>(".landing-page");
    if (!canvas || !page || !window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let active = false;
    let target = { x: 0, y: 0 };
    let head = { x: 0, y: 0 };
    let angle = -Math.PI / 4;
    let points: TrailPoint[] = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      frame = 0;
      if (!active) return;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const dx = target.x - head.x;
      const dy = target.y - head.y;
      head.x += dx * 0.34;
      head.y += dy * 0.34;
      if (Math.hypot(dx, dy) > 0.7) {
        angle = Math.atan2(dy, dx);
        points.push({ x: head.x, y: head.y, time: now });
      }
      points = points.filter(point => now - point.time < 350).slice(-26);
      let trailLength = 0;
      for (let index = points.length - 1; index > 0; index -= 1) {
        trailLength += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
        if (trailLength > 175) {
          points = points.slice(index);
          break;
        }
      }

      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowColor = "#1688ff";
      context.shadowBlur = 13;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const age = Math.min(1, (now - current.time) / 350);
        const strength = 1 - age;
        const length = Math.hypot(current.x - previous.x, current.y - previous.y) || 1;
        const normalX = -(current.y - previous.y) / length;
        const normalY = (current.x - previous.x) / length;
        const previousAge = Math.min(1, (now - previous.time) / 350);
        const previousWave = Math.sin(now / 110 - previousAge * 8) * 8 * previousAge;
        const currentWave = Math.sin(now / 110 - age * 8) * 8 * age;
        context.beginPath();
        context.moveTo(previous.x + normalX * previousWave, previous.y + normalY * previousWave);
        context.lineTo(current.x + normalX * currentWave, current.y + normalY * currentWave);
        context.strokeStyle = `rgba(49, 157, 255, ${strength * 0.85})`;
        context.lineWidth = 0.6 + strength * 2.2;
        context.stroke();
      }

      const pulse = 0.75 + Math.sin(now / 230) * 0.15;
      context.beginPath();
      context.moveTo(head.x - Math.cos(angle) * 15, head.y - Math.sin(angle) * 15);
      context.lineTo(head.x, head.y);
      context.strokeStyle = `rgba(91, 187, 255, ${pulse})`;
      context.lineWidth = 2.2;
      context.shadowBlur = 16;
      context.stroke();
      frame = window.requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target = { x: event.clientX, y: event.clientY };
      if (!active || Math.hypot(target.x - head.x, target.y - head.y) > 180) {
        head = { ...target };
        points = [];
      }
      active = true;
      canvas.style.opacity = "1";
      page.classList.add("landing-cursor-active");
      if (!frame) frame = window.requestAnimationFrame(draw);
    };
    const hide = () => {
      active = false;
      points = [];
      canvas.style.opacity = "0";
      page.classList.remove("landing-cursor-active");
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    resize();
    page.addEventListener("pointermove", move, { passive: true });
    page.addEventListener("pointerleave", hide);
    window.addEventListener("resize", resize);
    window.addEventListener("blur", hide);
    return () => {
      hide();
      page.removeEventListener("pointermove", move);
      page.removeEventListener("pointerleave", hide);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-cursor-trail" aria-hidden="true" />;
}
