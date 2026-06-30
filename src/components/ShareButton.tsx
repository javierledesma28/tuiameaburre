import { useState } from "react";
import { shareCard } from "../lib/shareCard";
import { useGame } from "../game";
import { useI18n } from "../i18n";

// Botón "compartir" que genera la tarjeta y la comparte/descarga.
export default function ShareButton({
  prompt,
  answer,
  modelId,
  className = "",
  compact = false,
}: {
  prompt: string;
  answer: string;
  modelId?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const { toast } = useGame();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const res = await shareCard({ prompt, answer, modelId });
    if (res === "download") toast(t("shareDownloaded"));
    else if (res === "error") toast(t("shareError"));
    setBusy(false);
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        disabled={busy}
        title={t("share")}
        className={`rounded-full border border-paper-ink/15 px-2 py-0.5 font-mono text-[11px] leading-none text-paper-ink/55 transition-colors hover:border-paper-ink/40 disabled:opacity-50 ${className}`}
      >
        {busy ? "…" : "📸"}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-[4px] border border-ink/20 px-5 py-2 font-marker text-base text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60 ${className}`}
    >
      📸 {busy ? t("sharing") : t("share")}
    </button>
  );
}
