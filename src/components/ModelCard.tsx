import { motion } from "framer-motion";
import { Model } from "../models";
import { useI18n } from "../i18n";

// Card reusable de un modelo LLM parodia.
// - selectable: se puede clickear y resaltar (pantalla de cuenta)
// - compact: versión chica para grids densos
export default function ModelCard({
  model,
  selected,
  onClick,
  compact,
}: {
  model: Model;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const clickable = !!onClick;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={clickable ? { y: -3 } : undefined}
      whileTap={clickable ? { scale: 0.98 } : undefined}
      disabled={!clickable}
      className={`relative flex w-full items-start gap-3 rounded-[6px] border-2 bg-night-800/70 p-3 text-left transition-colors ${
        selected ? "border-lamp" : "border-ink/15"
      } ${clickable ? "cursor-pointer hover:border-lamp/60" : "cursor-default"}`}
      style={{ boxShadow: selected ? `0 0 0 1px ${model.accent}55` : undefined }}
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl"
        style={{ background: `${model.accent}22` }}
      >
        {model.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-marker text-base leading-tight" style={{ color: model.accent }}>
            {model.name}
          </span>
          {selected && <span className="text-xs text-lamp">✓</span>}
        </span>
        <span className="block font-mono text-[10px] uppercase tracking-wide text-muted/60">
          {t("modelParody")(model.parodyOf)}
        </span>
        {!compact && (
          <span className="mt-1 block font-hand text-base leading-tight text-muted">
            {model.tagline}
          </span>
        )}
      </span>
    </motion.button>
  );
}
