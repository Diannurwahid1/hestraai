"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from "three";

export function HeroRobot3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) return;

    let disposed = false;
    let started = false;
    let visible = true;
    let frame = 0;
    let renderer: WebGLRenderer | undefined;
    let scene: Scene | undefined;
    let camera: PerspectiveCamera | undefined;
    let robot: Group | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let targetYaw = 0;
    let targetPitch = 0;

    const render = () => {
      frame = 0;
      if (disposed || !visible || !renderer || !scene || !camera || !robot) return;
      robot.rotation.y += (targetYaw - robot.rotation.y) * 0.065;
      robot.rotation.x += (targetPitch - robot.rotation.x) * 0.045;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = Math.max(3.75, 2.75 / camera.aspect);
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event: PointerEvent) => {
      targetYaw = Math.max(-0.36, Math.min(0.36, (event.clientX / window.innerWidth - 0.5) * 0.72));
      targetPitch = Math.max(-0.06, Math.min(0.06, (event.clientY / window.innerHeight - 0.5) * -0.12));
    };
    const onPointerLeave = () => { targetYaw = 0; targetPitch = 0; };

    const start = async () => {
      if (started || disposed) return;
      started = true;
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (disposed) return;

        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.45;
        mount.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0.12, 3.75);
        camera.lookAt(0, 0.06, 0);
        scene.add(new THREE.AmbientLight(0xc5d9f2, 2.25));
        const key = new THREE.DirectionalLight(0xffffff, 3.2);
        key.position.set(2, 4, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x247dff, 4.2);
        rim.position.set(-2, 2, -2);
        scene.add(rim);
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();

        new GLTFLoader().load("/hestra-robot-hero.glb", gltf => {
          if (disposed || !scene) return;
          const bounds = new THREE.Box3().setFromObject(gltf.scene);
          const center = bounds.getCenter(new THREE.Vector3());
          const size = bounds.getSize(new THREE.Vector3());
          gltf.scene.position.sub(center);
          robot = new THREE.Group();
          robot.scale.setScalar(2.05 / size.y);
          robot.add(gltf.scene);
          scene.add(robot);
          setReady(true);
          if (visible) render();
        }, undefined, () => {
          // Keep the static artwork if the model cannot be downloaded or rendered.
        });
      } catch {
        // WebGL is optional; the static artwork remains visible.
      }
    };

    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) {
        void start();
        if (robot && !frame) render();
      } else if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { rootMargin: "200px" });
    observer.observe(mount);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    return () => {
      disposed = true;
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      if (frame) window.cancelAnimationFrame(frame);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={`landing-robot-stage${ready ? " is-ready" : ""}`} data-testid="hero-robot-stage">
    <Image src="/hestra-robot.png" alt="Hestra AI humanoid research assistant" fill priority sizes="48vw" />
  </div>;
}
