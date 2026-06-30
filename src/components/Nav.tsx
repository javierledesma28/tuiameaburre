import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";

type NavId = "home" | "wall" | "creator" | "account" | "ranking" | "duel" | "halluc" | "daily";

export default function Nav() {
  const { credits, creditCap, screen, go, profile, coronas } = useGame();
  const { t, lang, toggle } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const accountLabel = profile?.nick ? `★ ${profile.nick}` : t("navLogin");

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

  // Cierra el menú móvil al navegar a otra pantalla.
  useEffect(() => {
    setMenuOpen(false);
  }, [screen]);

  const navTo = (id: NavId) => {
    go(id);
    setMenuOpen(false);
  };

  // Links de escritorio (texto claro sobre el cuarto oscuro).
  const link = (id: NavId, label: string) => (
    <button
      onClick={() => navTo(id)}
      className={`font-hand text-2xl leading-none transition-transform hover:-rotate-2 ${
        screen === id ? "text-lamp" : "text-muted hover:text-ink"
      }`}
    >
      {label}
      {screen === id && <span className="block h-[3px] w-full rounded-full bg-lamp/70" />}
    </button>
  );

  // Links del panel móvil (tinta oscura sobre papel crema).
  const mobileLink = (id: NavId, label: string) => (
    <button
      onClick={() => navTo(id)}
      className={`text-left font-hand text-3xl leading-none transition-transform hover:translate-x-1 ${
        screen === id ? "text-marker-red" : "text-paper-ink/80 hover:text-paper-ink"
      }`}
    >
      {screen === id && <span className="mr-1 text-marker-red">›</span>}
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 mx-auto flex max-w-6xl items-center gap-2 px-4 py-4 backdrop-blur-[2px] sm:gap-5 sm:px-5">
      {/* marca en cinta / brand on tape */}
      <button onClick={() => navTo("home")} className="group relative -rotate-2 shrink-0">
        <span className="tape" style={{ left: -8, top: -10, transform: "rotate(-8deg)" }} />
        <span className="paper inline-block rounded-[3px] px-2.5 py-1 font-marker text-base tracking-tight shadow-note transition-transform group-hover:rotate-1 sm:px-3 sm:text-lg">
          {t("brand")}
        </span>
      </button>

      {/* nav de escritorio / desktop nav */}
      <nav className="ml-2 hidden gap-5 sm:flex">
        {link("home", t("navHome"))}
        {link("daily", t("navDaily"))}
        {link("wall", t("navWall"))}
        {link("duel", t("navDuel"))}
        {link("halluc", t("navHalluc"))}
        {link("ranking", t("navRanking"))}
        {link("creator", t("navCreator"))}
        {link("account", accountLabel)}
      </nav>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* coronas / reputation crowns (oculto en mobile por espacio) */}
        {(coronas.human > 0 || coronas.ai > 0) && (
          <button
            onClick={() => navTo("ranking")}
            title={t("coronasHint")}
            className="hidden items-center gap-2 rounded-[3px] border border-ink/20 bg-night-800/70 px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:border-lamp sm:flex"
          >
            <span>🧠 {coronas.human}</span>
            <span className="text-muted">·</span>
            <span>🤖 {coronas.ai}</span>
          </button>
        )}

        {/* etiqueta de créditos / credit tag */}
        <motion.div
          animate={gained ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className={`relative flex items-center gap-1 rounded-[3px] bg-sticky-yellow px-2 py-1 text-paper-ink shadow-note rotate-1 sm:gap-1.5 sm:px-3 ${
            gained ? "ring-2 ring-[#7bd389]" : ""
          }`}
          title={t("creditsHint")}
        >
          <span className="font-mono text-xs">★</span>
          <span className="font-marker text-lg leading-none">{credits}</span>
          <span className="font-mono text-[11px] leading-none text-paper-ink/40">/{creditCap}</span>
          <span className="hidden font-hand text-base leading-none sm:inline">{t("credits")}</span>
        </motion.div>

        {/* idioma / language */}
        <button
          onClick={toggle}
          className="shrink-0 rounded-[3px] border border-ink/20 bg-night-700 px-2.5 py-1 font-mono text-xs font-bold text-ink transition-colors hover:border-lamp"
          aria-label="language"
        >
          <span className={lang === "es" ? "text-lamp" : "text-muted"}>ES</span>
          <span className="mx-1 text-muted">/</span>
          <span className={lang === "en" ? "text-lamp" : "text-muted"}>EN</span>
        </button>

        {/* botón menú (sólo móvil) / hamburger (mobile only) */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border border-ink/20 bg-night-700 text-ink transition-colors hover:border-lamp sm:hidden"
          aria-label="menú"
          aria-expanded={menuOpen}
        >
          <span className="relative block h-3.5 w-5">
            <span
              className={`absolute left-0 block h-[2px] w-5 rounded bg-current transition-all duration-300 ${
                menuOpen ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-[2px] w-5 rounded bg-current transition-all duration-200 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-[2px] w-5 rounded bg-current transition-all duration-300 ${
                menuOpen ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </div>

      {/* panel desplegable móvil / mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* capa para cerrar al tocar fuera / tap-outside to close */}
            <div
              className="fixed inset-0 z-30 sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute right-3 top-[calc(100%-4px)] z-40 origin-top-right sm:hidden"
            >
              <div className="paper relative flex min-w-[180px] flex-col gap-5 rounded-[6px] p-6 shadow-lift">
                <span className="tape" style={{ right: 22, top: -11, transform: "rotate(5deg)" }} />
                {mobileLink("home", t("navHome"))}
                {mobileLink("daily", t("navDaily"))}
                {mobileLink("wall", t("navWall"))}
                {mobileLink("duel", t("navDuel"))}
                {mobileLink("halluc", t("navHalluc"))}
                {mobileLink("ranking", t("navRanking"))}
                {mobileLink("creator", t("navCreator"))}
                {mobileLink("account", accountLabel)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
