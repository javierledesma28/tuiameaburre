import { motion } from "framer-motion";
import { useGame } from "../game";
import { useI18n } from "../i18n";

export default function ModeCards() {
  const { go } = useGame();
  const { t } = useI18n();

  const card = (
    opts: {
      onClick: () => void;
      bg: string;
      rotate: string;
      emoji: string;
      title: string;
      desc: string;
      foot: string;
      footClass: string;
    }
  ) => (
    <motion.button
      onClick={opts.onClick}
      whileHover={{ rotate: 0, y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative flex w-full flex-col gap-2 rounded-[4px] p-6 text-left text-paper-ink shadow-note ${opts.rotate}`}
      style={{ background: opts.bg }}
    >
      <span className="tape" style={{ left: "50%", top: -12, transform: "translateX(-50%) rotate(-3deg)" }} />
      <span className="text-3xl">{opts.emoji}</span>
      <span className="font-marker text-2xl leading-tight">{opts.title}</span>
      <span className="font-hand text-xl leading-snug text-paper-ink/80">{opts.desc}</span>
      <span className={`mt-1 font-mono text-xs font-bold ${opts.footClass}`}>{opts.foot}</span>
    </motion.button>
  );

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
      {card({
        onClick: () => go("ask"),
        bg: "#ffe27a",
        rotate: "-rotate-2",
        emoji: "💬",
        title: t("ask"),
        desc: t("askDesc"),
        foot: t("askCost"),
        footClass: "text-marker-red",
      })}
      {card({
        onClick: () => go("answer"),
        bg: "#bdec8a",
        rotate: "rotate-2",
        emoji: "🤖",
        title: t("answer"),
        desc: t("answerDesc"),
        foot: t("answerReward"),
        footClass: "text-marker-blue",
      })}
    </div>
  );
}
