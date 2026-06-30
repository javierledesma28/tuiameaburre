import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import MonitorHead from "./MonitorHead";

// Máquina de escribir: revela el texto carácter a carácter.
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    let iv = 0;
    const to = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          window.clearInterval(iv);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(to);
      window.clearInterval(iv);
    };
  }, [text, speed, startDelay]);
  return { displayed, done };
}

export default function Hero() {
  const { go, profile } = useGame();
  const { t } = useI18n();
  const robot = profile?.prefs?.robot;
  const { displayed, done } = useTypewriter(t("heroTyped"));

  // Parallax/scrub por mouse (sin video): mueve el glow, la grilla y el robot.
  const [mx, setMx] = useState(50);
  const [my, setMy] = useState(50);
  const [gx, setGx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      setMx((e.clientX / w) * 100);
      setMy((e.clientY / h) * 100);
      setGx((e.clientX / w - 0.5) * -40);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Inclinación 3D del robot hacia el cursor (además del seguimiento de ojos).
  const robotTilt = `perspective(700px) rotateY(${(mx / 100 - 0.5) * 22}deg) rotateX(${-(my / 100 - 0.5) * 16}deg) translateX(${(mx / 100 - 0.5) * 18}px)`;

  // Los botones aparecen 400ms después de cargar, sin esperar al typewriter.
  const [pillsIn, setPillsIn] = useState(false);
  useEffect(() => {
    const to = window.setTimeout(() => setPillsIn(true), 400);
    return () => window.clearTimeout(to);
  }, []);

  const pills: { label: string; go: any }[] = [
    { label: `💬 ${t("ask")}`, go: "ask" },
    { label: `🤖 ${t("answer")}`, go: "answer" },
    { label: `📌 ${t("navWall")}`, go: "wall" },
    { label: `🎭 ${t("navCreator")}`, go: "creator" },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[86vh] items-center overflow-hidden"
    >
      {/* ── Fondo retro CRT (CSS, reacciona al mouse) ── */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "#0c0a07" }}>
        {/* glow cálido que sigue el mouse */}
        <div
          className="absolute inset-0 transition-[background] duration-300"
          style={{
            background: `radial-gradient(60% 45% at ${mx}% 16%, rgba(255,180,84,0.20), transparent 62%), radial-gradient(70% 50% at 50% 92%, rgba(143,240,181,0.14), transparent 60%)`,
          }}
        />
        {/* grilla en perspectiva (piso neón) */}
        <div
          className="absolute bottom-[-12%] left-[-30%] right-[-30%] h-[70%] animate-grid-scroll"
          style={{
            transform: `perspective(420px) rotateX(62deg) translateX(${gx}px)`,
            transformOrigin: "center top",
            backgroundImage:
              "linear-gradient(rgba(143,240,181,0.30) 1px, transparent 1px), linear-gradient(90deg, rgba(143,240,181,0.30) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
            WebkitMaskImage: "linear-gradient(to top, #000 10%, transparent 75%)",
            maskImage: "linear-gradient(to top, #000 10%, transparent 75%)",
          }}
        />
        {/* scanlines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* viñeta */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 80% at 50% 38%, transparent, rgba(0,0,0,0.6))" }}
        />
      </div>

      {/* ── Contenido ── */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-16 sm:px-8 md:grid-cols-2 md:gap-10">
        {/* Texto */}
        <div className="font-sans">
          {/* intro borrosa (estilo A.R.I.A.) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-5 select-none leading-snug text-ink/90"
            style={{ filter: "blur(4px)", fontSize: "clamp(17px, 3.6vw, 24px)" }}
          >
            {t("heroAria1")}
            <br />
            {t("heroAria2")}
          </motion.p>

          {/* typewriter */}
          <p
            className="mb-7 text-ink"
            style={{ fontSize: "clamp(18px, 4vw, 27px)", lineHeight: 1.35, minHeight: 80 }}
          >
            <span className="text-lamp">&gt; </span>
            {displayed}
            {!done && (
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-blink bg-ink align-middle" />
            )}
          </p>

          {/* pills */}
          <div
            className="flex flex-wrap gap-x-1 gap-y-2"
            style={{
              opacity: pillsIn ? 1 : 0,
              transform: pillsIn ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            {pills.map((p) => (
              <button
                key={p.go}
                onClick={() => go(p.go)}
                className="mx-[0.15em] inline-flex items-center justify-center whitespace-nowrap rounded-full border border-white/15 bg-white px-4 py-[0.4em] text-[13px] text-black transition-colors duration-200 hover:bg-black hover:text-white sm:px-5 sm:text-[15px]"
              >
                {p.label}
              </button>
            ))}
            {/* pill outline → prompt del día */}
            <button
              onClick={() => go("daily")}
              className="mx-[0.15em] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-lamp/70 bg-transparent px-4 py-[0.4em] text-[13px] text-lamp transition-colors duration-200 hover:bg-lamp hover:text-night-900 sm:px-5 sm:text-[15px]"
            >
              ☀️ {t("navDaily")}
            </button>
          </div>
        </div>

        {/* Robot A.R.I.A. (nuestro MonitorHead) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative flex justify-center md:justify-end"
        >
          {/* glow fosforado detrás del robot */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(45% 40% at 55% 45%, rgba(143,240,181,0.22), transparent 70%)" }}
          />
          {/* bob vertical (animate-float) y, adentro, inclinación 3D hacia el cursor */}
          <div className="relative animate-float">
            <div
              style={{ transform: robotTilt, transformStyle: "preserve-3d", transition: "transform 0.18s ease-out", willChange: "transform" }}
            >
              <MonitorHead
                className="w-44 sm:w-52 md:w-60 lg:w-72"
                eye={robot?.eye}
                led={robot?.led}
                hat={robot?.hat || undefined}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
