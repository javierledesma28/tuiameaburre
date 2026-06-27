import { motion, AnimatePresence } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";

// Cartel que anuncia el boost de balance entre equipos.
// `only` filtra para mostrar el banner solo si aplica a ese equipo
// (p. ej. en la pantalla Responder solo mostramos el boost "ai").
export default function BoostBanner({
  only,
  className = "",
}: {
  only?: "ai" | "human";
  className?: string;
}) {
  const { boost, go } = useGame();
  const { t } = useI18n();

  const show = boost && (!only || boost.team === only);
  const isAi = boost?.team === "ai";

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          onClick={() => go(isAi ? "answer" : "ask")}
          className={`flex w-full items-center gap-3 rounded-[6px] border px-4 py-2.5 text-left transition-transform hover:-translate-y-0.5 ${
            isAi
              ? "border-marker-green/50 bg-marker-green/10"
              : "border-lamp/50 bg-lamp/10"
          } ${className}`}
        >
          <span className="text-2xl">{isAi ? "🤖" : "💬"}</span>
          <span className="min-w-0 flex-1">
            <span className={`block font-marker text-base leading-tight ${isAi ? "text-marker-green" : "text-lamp"}`}>
              {isAi ? t("boostAiTitle") : t("boostHumanTitle")}
            </span>
            <span className="block font-hand text-lg leading-tight text-muted">
              {isAi ? t("boostAiSub") : t("boostHumanSub")}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-night-900/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/70">
            {t("boostCta")} →
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
