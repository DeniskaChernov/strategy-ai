/**
 * Адаптация Horizon Hero (21st.dev / lovesickfromthe6ix) под Strategy AI:
 * Three.js (звёзды, туманность, силуэт гор), GSAP-вступление, скролл от .sa-ref-landing.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";

type TFn = (key: string, fallback?: string) => string;

type ThreeStore = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  stars: THREE.Points[];
  nebula: THREE.Mesh | null;
  mountains: THREE.Mesh[];
  atmosphere: THREE.Mesh | null;
  sky: THREE.Mesh | null;
  animationId: number | null;
  targetCameraX: number;
  targetCameraY: number;
  targetCameraZ: number;
  mountainBaseZ: number[];
};

function createThreeStore(): ThreeStore {
  return {
    scene: null,
    camera: null,
    renderer: null,
    stars: [],
    nebula: null,
    mountains: [],
    atmosphere: null,
    sky: null,
    animationId: null,
    targetCameraX: 0,
    targetCameraY: 28,
    targetCameraZ: 110,
    mountainBaseZ: [],
  };
}

function usePrefersReducedMotion(): boolean {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setV(!!mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return v;
}

export function HorizonHeroSection({
  scrollRef,
  t,
  theme,
  onGetStarted,
  onScrollToMockup,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
  t: TFn;
  theme: string;
  onGetStarted: () => void;
  onScrollToMockup: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  const totalScrollSections = 3;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);
  const trustRef = useRef<HTMLDivElement | null>(null);
  const btnsRef = useRef<HTMLDivElement | null>(null);

  const threeRefs = useRef<ThreeStore>(createThreeStore());
  const smoothCam = useRef({ x: 0, y: 28, z: 110 });
  const scrollProgressRef = useRef(0);
  const [scrollSection, setScrollSection] = useState(0);
  const [webglOk, setWebglOk] = useState(false);

  const updateScrollProgress = useCallback(() => {
    const root = scrollRef.current;
    const hero = heroRef.current;
    const store = threeRefs.current;
    if (!root || !hero) return;
    const scrollTop = root.scrollTop;
    const heroTop = hero.offsetTop;
    const heroH = hero.offsetHeight;
    const vh = root.clientHeight;
    const travel = Math.max(1, heroH - vh);
    const p = Math.min(1, Math.max(0, (scrollTop - heroTop) / travel));
    scrollProgressRef.current = p;
    const sec = Math.min(totalScrollSections - 1, Math.floor(p * totalScrollSections));
    setScrollSection(sec);

    const camPositions = [
      { x: 0, y: 30, z: 120 },
      { x: 0, y: 38, z: 20 },
      { x: 0, y: 46, z: -120 },
    ];
    const tt = p * (camPositions.length - 1);
    const i0 = Math.min(camPositions.length - 2, Math.max(0, Math.floor(tt)));
    const frac = tt - i0;
    const a = camPositions[i0];
    const b = camPositions[i0 + 1];
    store.targetCameraX = a.x + (b.x - a.x) * frac;
    store.targetCameraY = a.y + (b.y - a.y) * frac;
    store.targetCameraZ = a.z + (b.z - a.z) * frac;

    store.mountains.forEach((mountain, idx) => {
      const base = store.mountainBaseZ[idx] ?? mountain.position.z;
      mountain.position.z = base + p * 18 * (1 + idx * 0.2);
    });
    if (store.nebula) {
      store.nebula.position.z = -980 - p * 120;
    }
  }, [scrollRef, totalScrollSections]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    updateScrollProgress();
    root.addEventListener("scroll", updateScrollProgress, { passive: true });
    return () => root.removeEventListener("scroll", updateScrollProgress);
  }, [scrollRef, updateScrollProgress]);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const sticky = stickyRef.current;
    if (!canvas || !sticky) return;

    const store = threeRefs.current;
    const w = () => sticky.clientWidth || window.innerWidth;
    const h = () => sticky.clientHeight || window.innerHeight;

    let disposed = false;

    const init = (): void => {
      store.scene = new THREE.Scene();

      store.camera = new THREE.PerspectiveCamera(72, w() / h(), 0.1, 2500);
      store.camera.position.set(0, smoothCam.current.y, smoothCam.current.z);

      store.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
      });
      store.renderer.setClearColor(0x000000, 0);
      store.renderer.setSize(w(), h());
      store.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      store.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      store.renderer.toneMappingExposure = theme === "dark" ? 0.52 : 0.48;
      store.renderer.outputColorSpace = THREE.SRGBColorSpace;

      /* Небесная сфера: заполняет кадр градиентом (без «чёрной колонки» от fog/composer) */
      const skyGeo = new THREE.SphereGeometry(2000, 48, 48);
      const topC = new THREE.Color(theme === "dark" ? 0x18102c : 0xe4dcff);
      const botC = new THREE.Color(theme === "dark" ? 0x05030e : 0xf0ecff);
      const skyMat = new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: topC },
          bottomColor: { value: botC },
          horizonGlow: { value: new THREE.Color(theme === "dark" ? 0x3a1a6e : 0xc4b0ff) },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform vec3 horizonGlow;
          void main() {
            float t = vDir.y * 0.5 + 0.5;
            vec3 col = mix(bottomColor, topColor, t);
            float h = 1.0 - abs(vDir.y);
            col += horizonGlow * h * h * 0.12;
            gl_FragColor = vec4(col, 1.0);
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: true,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      sky.frustumCulled = false;
      sky.renderOrder = -500;
      store.scene.add(sky);
      store.sky = sky;

      const starCount = 3200;
      for (let layer = 0; layer < 2; layer++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        for (let j = 0; j < starCount; j++) {
          const radius = 180 + Math.random() * 720;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[j * 3 + 2] = radius * Math.cos(phi);
          const color = new THREE.Color();
          const r = Math.random();
          if (r < 0.72) color.setHSL(0.75, 0.35, 0.75 + Math.random() * 0.2);
          else if (r < 0.9) color.setHSL(0.55, 0.45, 0.72);
          else color.setHSL(0.08, 0.4, 0.82);
          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;
          sizes[j] = Math.random() * 1.8 + 0.4;
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
        const material = new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 }, depth: { value: layer } },
          vertexShader: `
            attribute float size; attribute vec3 color; varying vec3 vColor;
            uniform float time; uniform float depth;
            void main() {
              vColor = color;
              vec3 pos = position;
              float angle = time * 0.04 * (1.0 - depth * 0.35);
              mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
              pos.xy = rot * pos.xy;
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (280.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }`,
          fragmentShader: `
            varying vec3 vColor;
            void main() {
              float d = length(gl_PointCoord - vec2(0.5));
              if (d > 0.5) discard;
              float op = 1.0 - smoothstep(0.0, 0.5, d);
              gl_FragColor = vec4(vColor, op);
            }`,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const stars = new THREE.Points(geometry, material);
        store.scene.add(stars);
        store.stars.push(stars);
      }

      const nebulaGeo = new THREE.PlaneGeometry(7200, 3600, 64, 64);
      const c1 = new THREE.Color(theme === "dark" ? 0x2a0a6e : 0x8860ff);
      const c2 = new THREE.Color(theme === "dark" ? 0x6a0a4e : 0xff6a9a);
      const nebulaMat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: c1 },
          color2: { value: c2 },
          opacity: { value: theme === "dark" ? 0.28 : 0.18 },
        },
        vertexShader: `
          varying vec2 vUv; varying float vEl; uniform float time;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float el = sin(pos.x * 0.008 + time) * cos(pos.y * 0.008 + time * 0.9) * 16.0;
            pos.z += el; vEl = el;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 color1; uniform vec3 color2; uniform float opacity; uniform float time;
          varying vec2 vUv; varying float vEl;
          void main() {
            float m = sin(vUv.x * 9.0 + time) * cos(vUv.y * 9.0 + time * 0.8);
            vec3 col = mix(color1, color2, m * 0.5 + 0.5);
            float a = opacity * (1.0 - length(vUv - 0.5) * 1.8);
            a *= 1.0 + vEl * 0.008;
            gl_FragColor = vec4(col, a);
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
      nebula.position.z = -980;
      store.scene.add(nebula);
      store.nebula = nebula;

      const layers = [
        { z: -55, h: 55, color: theme === "dark" ? 0x12101e : 0x2a2540, op: 0.95 },
        { z: -110, h: 85, color: theme === "dark" ? 0x0c1228 : 0x1e1a38, op: 0.72 },
        { z: -165, h: 105, color: theme === "dark" ? 0x081830 : 0x162040, op: 0.5 },
      ];
      store.mountainBaseZ = [];
      layers.forEach((layer) => {
        const pts: THREE.Vector2[] = [];
        const segments = 48;
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments - 0.5) * 900;
          const y =
            Math.sin(i * 0.12) * layer.h +
            Math.sin(i * 0.05) * layer.h * 0.45 +
            Math.random() * layer.h * 0.15 -
            90;
          pts.push(new THREE.Vector2(x, y));
        }
        pts.push(new THREE.Vector2(4500, -280), new THREE.Vector2(-4500, -280));
        const shape = new THREE.Shape(pts);
        const geo = new THREE.ShapeGeometry(shape);
        const mat = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.op,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.z = layer.z;
        mesh.position.y = -8;
        mesh.userData.baseZ = layer.z;
        store.mountainBaseZ.push(layer.z);
        store.scene.add(mesh);
        store.mountains.push(mesh);
      });

      const atmGeo = new THREE.SphereGeometry(520, 28, 28);
      const atmMat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          varying vec3 vN;
          void main() {
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vN; uniform float time;
          void main() {
            float i = pow(0.65 - dot(vN, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 c = vec3(0.35, 0.25, 0.95) * i;
            float pulse = sin(time * 1.8) * 0.08 + 0.92;
            c *= pulse;
            gl_FragColor = vec4(c, i * 0.22);
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      });
      const atmosphere = new THREE.Mesh(atmGeo, atmMat);
      store.scene.add(atmosphere);
      store.atmosphere = atmosphere;

    };

    try {
      init();
    } catch (e) {
      console.warn("HorizonHero WebGL init:", e);
    } finally {
      setWebglOk(true);
    }

    if (!store.renderer) {
      return () => {
        threeRefs.current = createThreeStore();
      };
    }

    const onResize = () => {
      if (!store.camera || !store.renderer) return;
      const ww = w();
      const hh = h();
      store.camera.aspect = ww / hh;
      store.camera.updateProjectionMatrix();
      store.renderer.setSize(ww, hh);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      if (disposed) return;
      store.animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      store.stars.forEach((sf) => {
        const m = sf.material as THREE.ShaderMaterial;
        if (m.uniforms?.time) m.uniforms.time.value = time;
      });
      if (store.nebula) {
        const m = store.nebula.material as THREE.ShaderMaterial;
        if (m.uniforms?.time) m.uniforms.time.value = time * 0.45;
      }
      if (store.atmosphere) {
        const m = store.atmosphere.material as THREE.ShaderMaterial;
        if (m.uniforms?.time) m.uniforms.time.value = time;
      }
      if (store.camera) {
        const s = 0.06;
        smoothCam.current.x += (store.targetCameraX - smoothCam.current.x) * s;
        smoothCam.current.y += (store.targetCameraY - smoothCam.current.y) * s;
        smoothCam.current.z += (store.targetCameraZ - smoothCam.current.z) * s;
        const fx = Math.sin(time * 0.1) * 1.5;
        const fy = Math.cos(time * 0.14) * 0.8;
        store.camera.position.set(
          smoothCam.current.x + fx,
          smoothCam.current.y + fy,
          smoothCam.current.z
        );
        store.camera.lookAt(0, 12, -620);
      }
      if (store.renderer && store.scene && store.camera) {
        store.renderer.render(store.scene, store.camera);
      }
    };
    animate();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      if (store.animationId != null) cancelAnimationFrame(store.animationId);
      store.stars.forEach((sf) => {
        sf.geometry.dispose();
        (sf.material as THREE.Material).dispose();
      });
      store.mountains.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      if (store.nebula) {
        store.nebula.geometry.dispose();
        (store.nebula.material as THREE.Material).dispose();
      }
      if (store.atmosphere) {
        store.atmosphere.geometry.dispose();
        (store.atmosphere.material as THREE.Material).dispose();
      }
      if (store.sky) {
        store.sky.geometry.dispose();
        (store.sky.material as THREE.Material).dispose();
      }
      store.renderer?.dispose();
      threeRefs.current = createThreeStore();
    };
  }, [reduced, theme]);

  useEffect(() => {
    if (!reduced && !webglOk) return;
    const menu = menuRef.current;
    const title = titleRef.current;
    const sub = subRef.current;
    const hint = scrollHintRef.current;
    const trust = trustRef.current;
    const btns = btnsRef.current;
    gsap.set([menu, title, sub, hint, trust, btns].filter(Boolean), { visibility: "visible" });
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    if (menu) tl.from(menu, { x: -80, opacity: 0, duration: 0.85 }, 0);
    if (title) tl.from(title, { y: 48, opacity: 0, duration: 1.1 }, 0.15);
    if (sub) tl.from(sub, { y: 28, opacity: 0, duration: 0.85 }, 0.35);
    if (btns) tl.from(btns, { y: 20, opacity: 0, duration: 0.75 }, 0.45);
    if (trust) tl.from(trust, { y: 16, opacity: 0, duration: 0.65 }, 0.55);
    if (hint) tl.from(hint, { opacity: 0, y: 24, duration: 0.7 }, 0.5);
    return () => {
      tl.kill();
    };
  }, [reduced, webglOk]);

  const dk = theme === "dark" ? "dk" : "lt";
  const sideLetters = t("ref_horizon_side", "STRATEGY").split("");

  return (
    <section
      ref={heroRef}
      className={`sa-horizon-hero sa-horizon-hero--${dk}${reduced || webglOk ? " sa-horizon-hero--ready" : ""}`}
      id="hero-section"
      aria-labelledby="hero-heading"
    >
      <div ref={stickyRef} className="sa-horizon-sticky">
        {!reduced && (
          <canvas ref={canvasRef} className="sa-horizon-canvas" aria-hidden />
        )}
        {reduced && (
          <div className="sa-horizon-fallback" aria-hidden>
            <div className="sa-horizon-fallback-mesh">
              <div className="sa-horizon-fallback-orb sa-horizon-fallback-orb--1" />
              <div className="sa-horizon-fallback-orb sa-horizon-fallback-orb--2" />
              <div className="sa-horizon-fallback-orb sa-horizon-fallback-orb--3" />
            </div>
          </div>
        )}

        {/* без sa-strategy-ui: у него solid --bg и появляется «столб» по центру поверх WebGL */}
        <div className="sa-horizon-ui">
          <div ref={menuRef} className="sa-horizon-side" style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}>
            <div className="sa-horizon-side-track" aria-hidden>
              {sideLetters.map((ch, i) => (
                <span key={`${ch}-${i}`} className="sa-horizon-side-ch">
                  {ch === " " ? "\u00a0" : ch}
                </span>
              ))}
            </div>
            <span className="sa-horizon-side-label">{t("ref_horizon_side_tag", "SPACE")}</span>
          </div>

          <div className="sa-horizon-center">
            <h1
              id="hero-heading"
              ref={titleRef}
              className="sa-horizon-title"
              style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}
              dangerouslySetInnerHTML={{
                __html: t(
                  "ref_hero_h1_html",
                  "Стратегия,<br/><span class=\"sa-horizon-grad\">которая думает с вами</span>"
                ),
              }}
            />
            <p
              ref={subRef}
              className="sa-horizon-sub"
              style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}
            >
              {t(
                "ref_hero_sub",
                "Визуальные карты целей и инициатив, сценарии «что если», таймлайн и AI-советник — в одном рабочем пространстве."
              )}
            </p>
            <div
              ref={btnsRef}
              className="sa-horizon-btns"
              style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}
            >
              <button type="button" className="btn-p lg" onClick={onGetStarted}>
                {t("hero_cta", "Начать бесплатно — без карты")}
              </button>
              <button type="button" className="btn-g lg" onClick={onScrollToMockup}>
                {t("ref_demo", "Смотреть интерфейс ↗")}
              </button>
            </div>
            <div
              ref={trustRef}
              className="sa-horizon-trust"
              style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}
            >
              <span>{t("trust_1", "✓ Бесплатный тариф")}</span>
              <span>{t("trust_2", "✓ Без карты")}</span>
              <span>{t("trust_3", "✓ Старт за пару минут")}</span>
              <span>{t("trust_4", "✓ Отмена в любой момент")}</span>
            </div>
          </div>

          <div
            ref={scrollHintRef}
            className="sa-horizon-scroll-hint"
            style={{ visibility: reduced || webglOk ? "visible" : "hidden" }}
          >
            <span className="sa-horizon-scroll-lbl">{t("ref_horizon_scroll", "SCROLL")}</span>
            <div className="sa-horizon-scroll-bar" aria-hidden />
            <span className="sa-horizon-scroll-num">
              {String(scrollSection + 1).padStart(2, "0")} / {String(totalScrollSections).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
