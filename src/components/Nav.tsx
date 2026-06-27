import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";

export default function Nav() {
  const { credits, creditCap, screen, go } = useGame();
  const { t, lang, toggle } = useI18n();

  // Resalte verde "ganaste créditos" SOLO cuando suben (no al gastarlos).
  const prevCredits = useRef(credits);
  const [gained, setGained] = useState(false);
  useEffect(() => {
    if (credits > prevCredits.current) {
      setGained(true);
      const id = window.setTimeout(() => setGained(false), 650);
      prevCredits.current = credits;
      return () => window.clearTimeout(id);
    }
    prevCredits.current = credits;
  }, [credits]);

  const link = (id: "home" | "wall", label: string) => (
    <button
      onClick={() => go(id)}
      className={`font-hand text-2xl leading-none transition-transform hover:-rotate-2 ${
        screen === id ? "text-lamp" : "text-muted hover:text-ink"
      }`}
    >
      {label}
      {screen === id && <span className="block h-[3px] w-full rounded-full bg-lamp/70" />}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 mx-auto flex max-w-6xl items-center gap-5 px-5 py-4 backdrop-blur-[2px]">
      {/* marca en cinta / brand on tape */}
      <button onClick={() => go("home")} className="group relative -rotate-2">
        <span className="tape" style={{ left: -8, top: -10, transform: "rotate(-8deg)" }} />
        <span className="paper inline-block rounded-[3px] px-3 py-1 font-marker text-lg tracking-tight shadow-note transition-transform group-hover:rotate-1">
          {t("brand")}
        </span>
      </button>

      <nav className="ml-2 hidden gap-5 sm:flex">
        {link("home", t("navHome"))}
        {link("wall", t("navWall"))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* etiqueta de créditos / credit tag */}
        <motion.div
          animate={gained ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`relative flex items-center gap-1.5 rounded-[3px] bg-sticky-yellow px-3 py-1 text-paper-ink shadow-note rotate-1 ${
            gained ? "ring-2 ring-[#7bd389]" : ""
          }`}
          title={t("creditsHint")}
        >
          <span className="font-mono text-xs">★</span>
          <span className="font-marker text-lg leading-none">{credits}</span>
          <span className="font-mono text-[11px] leading-none text-paper-ink/40">/{creditCap}</span>
          <span className="font-hand text-base leading-none">{t("credits")}</span>
        </motion.div>

        <button
          onClick={toggle}
          className="rounded-[3px] border border-ink/20 bg-night-700 px-2.5 py-1 font-mono text-xs font-bold text-ink transition-colors hover:border-lamp"
          aria-label="language"
        >
          <span className={lang === "es" ? "text-lamp" : "text-muted"}>ES</span>
          <span className="mx-1 text-muted">/</span>
          <span className={lang === "en" ? "text-lamp" : "text-muted"}>EN</span>
        </button>
      </div>
    </header>
  );
}
