import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";
import ScrambleText from "./ScrambleText";
import MonitorHead from "./MonitorHead";

function TypedPrompt() {
  const { t } = useI18n();
  const phrases: string[] = t("typer");
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % phrases.length), 3400);
    return () => window.clearInterval(id);
  }, [phrases.length]);
  return (
    <div className="crt mx-auto mt-7 max-w-md px-4 py-3 text-left shadow-note md:mx-0">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#ff6f61]" />
        <span className="h-2 w-2 rounded-full bg-[#ffc24b]" />
        <span className="h-2 w-2 rounded-full bg-[#5fbf7d]" />
        <span className="ml-2 font-mono text-[10px] text-[#8ff0b5]/60">{t("promptFile")}</span>
      </div>
      <div className="font-mono text-sm sm:text-base">
        <span className="text-[#8ff0b5]/70">&gt; </span>
        <ScrambleText key={i} text={phrases[i]} speed={1.1} />
        <span className="ml-0.5 inline-block h-4 w-2 animate-blink bg-[#8ff0b5] align-middle" />
      </div>
    </div>
  );
}

function PaperButton({
  onClick,
  children,
  variant,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant: "ask" | "answer";
}) {
  const bg = variant === "ask" ? "#ffe27a" : "#bdec8a";
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -3, rotate: variant === "ask" ? -1.5 : 1.5 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-[4px] px-7 py-3 font-marker text-lg text-paper-ink shadow-note"
      style={{ background: bg }}
    >
      {children}
    </motion.button>
  );
}

export default function Hero() {
  const { go } = useGame();
  const { t } = useI18n();
  return (
    <section className="px-5 pt-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 md:flex-row md:items-center md:gap-16">

        {/* ── Text content ── */}
        <div className="flex-1 text-center md:text-left">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block -rotate-1 rounded-[3px] border border-lamp/40 bg-night-800/70 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-lamp"
          >
            {t("badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto mt-5 max-w-3xl font-marker text-4xl leading-[0.95] text-ink text-shadow-ink sm:text-6xl md:mx-0 md:text-7xl"
          >
            {t("heroTitle")}
          </motion.h1>

          <TypedPrompt />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mx-auto mt-7 max-w-xl font-hand text-2xl leading-snug text-muted md:mx-0"
          >
            {t("heroSub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start"
          >
            <PaperButton onClick={() => go("ask")} variant="ask">
              💬 {t("ask")}
            </PaperButton>
            <PaperButton onClick={() => go("answer")} variant="answer">
              🤖 {t("answer")}
            </PaperButton>
          </motion.div>
        </div>

        {/* ── Monitor character ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="shrink-0"
        >
          <MonitorHead className="w-36 animate-float sm:w-44 md:w-52 lg:w-60" />
        </motion.div>

      </div>
    </section>
  );
}
